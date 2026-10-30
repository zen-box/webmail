package auth

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type SavedAccount struct {
	Email     string    `json:"email"`
	Username  string    `json:"username"`
	Password  string    `json:"password"`
	ServerURL string    `json:"serverUrl"`
	Avatar    string    `json:"avatar"`
	AddedAt   time.Time `json:"addedAt"`
}

type UserSession struct {
	ID        string                   `json:"id"`
	Username  string                   `json:"username"`
	Email     string                   `json:"email"`
	Password  string                   `json:"password"` // stored in session to authenticate upstream JMAP calls
	ServerURL string                   `json:"serverUrl"`
	IsDemo    bool                     `json:"isDemo,omitempty"`
	CreatedAt time.Time                `json:"createdAt"`
	Accounts  map[string]*SavedAccount `json:"accounts"` // Email -> SavedAccount
}

type SessionStoreData struct {
	Sessions map[string]*UserSession  `json:"sessions"`
	Accounts map[string]*SavedAccount `json:"accounts"`
}

type SessionManager struct {
	mu       sync.RWMutex
	filePath string
	sessions map[string]*UserSession
	accounts map[string]*SavedAccount
}

func NewSessionManager(dataDir string) *SessionManager {
	if dataDir == "" {
		dataDir = "./data"
	}
	_ = os.MkdirAll(dataDir, 0755)
	filePath := filepath.Join(dataDir, "sessions.json")

	sm := &SessionManager{
		filePath: filePath,
		sessions: make(map[string]*UserSession),
		accounts: make(map[string]*SavedAccount),
	}

	sm.loadFromDisk()
	return sm
}

func (sm *SessionManager) loadFromDisk() {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	data, err := os.ReadFile(sm.filePath)
	if err != nil {
		return
	}

	var store SessionStoreData
	if err := json.Unmarshal(data, &store); err != nil {
		log.Printf("Failed to unmarshal %s: %v", sm.filePath, err)
		return
	}

	if store.Sessions != nil {
		sm.sessions = store.Sessions
	}
	if store.Accounts != nil {
		sm.accounts = store.Accounts
	}

	// Upgrade any legacy or hardcoded avatars to DiceBear Critters
	for _, acc := range sm.accounts {
		if strings.Contains(acc.Avatar, "heroui-assets") || acc.Avatar == "" {
			acc.Avatar = "https://api.dicebear.com/10.x/critters/svg?seed=" + url.QueryEscape(acc.Email)
		}
	}
	for _, sess := range sm.sessions {
		if sess.Accounts != nil {
			for _, acc := range sess.Accounts {
				if strings.Contains(acc.Avatar, "heroui-assets") || acc.Avatar == "" {
					acc.Avatar = "https://api.dicebear.com/10.x/critters/svg?seed=" + url.QueryEscape(acc.Email)
				}
			}
		}
	}

	log.Printf("Restored %d active sessions and %d saved email accounts from disk", len(sm.sessions), len(sm.accounts))
}

func (sm *SessionManager) saveToDiskLocked() {
	store := SessionStoreData{
		Sessions: sm.sessions,
		Accounts: sm.accounts,
	}

	data, err := json.MarshalIndent(store, "", "  ")
	if err != nil {
		return
	}

	tmpFile := sm.filePath + ".tmp"
	if err := os.WriteFile(tmpFile, data, 0600); err == nil {
		_ = os.Rename(tmpFile, sm.filePath)
	}
}

func (sm *SessionManager) CreateOrUpdateSession(existingToken, username, email, password, serverURL string) (*UserSession, string) {
	return sm.CreateOrUpdateSessionWithDemo(existingToken, username, email, password, serverURL, false)
}

func (sm *SessionManager) CreateOrUpdateSessionWithDemo(existingToken, username, email, password, serverURL string, isDemo bool) (*UserSession, string) {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	token := existingToken
	var sess *UserSession

	if token != "" && sm.sessions[token] != nil {
		sess = sm.sessions[token]
	} else {
		tokenBytes := make([]byte, 32)
		_, _ = rand.Read(tokenBytes)
		token = hex.EncodeToString(tokenBytes)

		sess = &UserSession{
			ID:        token,
			CreatedAt: time.Now(),
			Accounts:  make(map[string]*SavedAccount),
		}
		sm.sessions[token] = sess
	}

	// Update active account
	sess.Username = username
	sess.Email = email
	sess.Password = password
	sess.ServerURL = serverURL
	sess.IsDemo = isDemo

	// Save to user's accounts map & global pool
	avatar := "https://api.dicebear.com/10.x/critters/svg?seed=" + url.QueryEscape(email)
	saved := &SavedAccount{
		Email:     email,
		Username:  username,
		Password:  password,
		ServerURL: serverURL,
		Avatar:    avatar,
		AddedAt:   time.Now(),
	}

	if sess.Accounts == nil {
		sess.Accounts = make(map[string]*SavedAccount)
	}
	sess.Accounts[email] = saved
	sm.accounts[email] = saved

	sm.saveToDiskLocked()
	return sess, token
}

func (sm *SessionManager) SwitchAccount(token, targetEmail string) (*UserSession, bool) {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	sess := sm.sessions[token]
	if sess == nil {
		return nil, false
	}

	// Check if target account exists
	acc := sm.accounts[targetEmail]
	if acc == nil && sess.Accounts != nil {
		acc = sess.Accounts[targetEmail]
	}

	if acc == nil {
		return nil, false
	}

	sess.Email = acc.Email
	sess.Username = acc.Username
	sess.Password = acc.Password
	sess.ServerURL = acc.ServerURL

	if sess.Accounts == nil {
		sess.Accounts = make(map[string]*SavedAccount)
	}
	sess.Accounts[targetEmail] = acc

	sm.saveToDiskLocked()
	return sess, true
}

func (sm *SessionManager) RemoveAccount(token, targetEmail string) bool {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	delete(sm.accounts, targetEmail)
	sess := sm.sessions[token]
	if sess != nil && sess.Accounts != nil {
		delete(sess.Accounts, targetEmail)
		// If current active account was removed, switch to another if available
		if sess.Email == targetEmail {
			for _, other := range sess.Accounts {
				sess.Email = other.Email
				sess.Username = other.Username
				sess.Password = other.Password
				sess.ServerURL = other.ServerURL
				break
			}
		}
	}

	sm.saveToDiskLocked()
	return true
}

func (sm *SessionManager) GetAllAccounts() []*SavedAccount {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	var list []*SavedAccount
	for _, acc := range sm.accounts {
		list = append(list, acc)
	}
	return list
}

func (sm *SessionManager) GetSession(token string) *UserSession {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	return sm.sessions[token]
}

func (sm *SessionManager) DeleteSession(token string) {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	delete(sm.sessions, token)
	sm.saveToDiskLocked()
}

func SetSessionCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "heroui_mail_sess",
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   86400 * 30, // 30 days persistent session
	})
}

func ClearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "heroui_mail_sess",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		MaxAge:   -1,
	})
}

func GetSessionToken(r *http.Request) string {
	cookie, err := r.Cookie("heroui_mail_sess")
	if err != nil {
		return ""
	}
	return cookie.Value
}
