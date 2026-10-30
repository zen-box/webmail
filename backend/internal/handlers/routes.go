package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"

	"mail-server/internal/auth"
	"mail-server/internal/config"
	"mail-server/internal/jmap"
	"mail-server/internal/sanitize"
)

type AttachmentMeta struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Size string `json:"size"`
	Type string `json:"type,omitempty"`
	URL  string `json:"url,omitempty"`
}

type ParticipantItem struct {
	Name   string `json:"name"`
	Email  string `json:"email"`
	Avatar string `json:"avatar"`
}

type MessageItem struct {
	ID          string            `json:"id"`
	From        ParticipantItem   `json:"from"`
	To          []ParticipantItem `json:"to"`
	ReceivedAt  string            `json:"receivedAt"`
	Body        []string          `json:"body"`
	Attachments []AttachmentMeta  `json:"attachments,omitempty"`
}

type ThreadItem struct {
	ID          string            `json:"id"`
	FolderID    string            `json:"folderId"`
	Subject     string            `json:"subject"`
	Preview     string            `json:"preview"`
	UpdatedAt   string            `json:"updatedAt"`
	RawDate     string            `json:"rawDate,omitempty"`
	IsRead      bool              `json:"isRead"`
	IsStarred   bool              `json:"isStarred"`
	LabelIDs    []string          `json:"labelIds"`
	AuthorName  string            `json:"authorName"`
	AuthorMail  string            `json:"authorMail"`
	Avatar      string            `json:"avatar"`
	Body        []string          `json:"body"`
	Messages    []MessageItem     `json:"messages,omitempty"`
	Attachments []AttachmentMeta  `json:"attachments,omitempty"`
}

type Handler struct {
	cfg       *config.Config
	sm        *auth.SessionManager
	sanitizer *sanitize.Sanitizer
	broker    *SSEBroker
	attStore  *AttachmentStore
	lm        *LabelManager
	mu        sync.RWMutex
	threads   []ThreadItem
}

func New(cfg *config.Config, sm *auth.SessionManager, sanitizer *sanitize.Sanitizer) *Handler {
	dataDir := cfg.DataDir
	if dataDir == "" {
		dataDir = "./data"
	}
	h := &Handler{
		cfg:       cfg,
		sm:        sm,
		sanitizer: sanitizer,
		broker:    NewSSEBroker(),
		attStore:  NewAttachmentStore(),
		lm:        NewLabelManager(dataDir),
	}
	h.initDefaultThreads()
	return h
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /healthz", h.handleHealthz)
	mux.HandleFunc("GET /api/config", h.handleConfig)

	// Auth & Multi-Account
	mux.HandleFunc("POST /api/auth/login", h.handleLogin)
	mux.HandleFunc("POST /api/auth/logout", h.handleLogout)
	mux.HandleFunc("GET /api/auth/me", h.handleMe)
	mux.HandleFunc("POST /api/auth/switch", h.handleSwitchAccount)
	mux.HandleFunc("POST /api/auth/remove-account", h.handleRemoveAccount)

	// Mailboxes & Emails
	mux.HandleFunc("GET /api/v1/mailboxes", h.handleMailboxes)
	mux.HandleFunc("GET /api/v1/emails", h.handleEmails)
	mux.HandleFunc("GET /api/v1/emails/", h.handleEmailDetail)
	mux.HandleFunc("POST /api/v1/emails/{id}/star", h.handleToggleStar)
	mux.HandleFunc("POST /api/v1/emails/{id}/read", h.handleToggleRead)
	mux.HandleFunc("POST /api/v1/emails/{id}/archive", h.handleArchive)
	mux.HandleFunc("POST /api/v1/emails/{id}/snooze", h.handleSnooze)
	mux.HandleFunc("POST /api/v1/emails/{id}/move", h.handleMove)
	mux.HandleFunc("POST /api/v1/emails/{id}/labels", h.handleLabels)
	mux.HandleFunc("DELETE /api/v1/emails/{id}", h.handleDelete)
	mux.HandleFunc("POST /api/v1/emails/send", h.handleSend)

	// SSE Real-time Events
	mux.HandleFunc("GET /api/v1/events", h.handleSSE)

	// Attachments (Upload & Download)
	mux.HandleFunc("POST /api/v1/attachments/upload", h.handleUploadAttachment)
	mux.HandleFunc("GET /api/v1/attachments/", h.handleDownloadAttachment)
}

func (h *Handler) handleConfig(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"defaultServerUrl": h.cfg.StalwartURL,
		"port":             h.cfg.Port,
	})
}

func (h *Handler) getSession(r *http.Request) *auth.UserSession {
	token := auth.GetSessionToken(r)
	if token == "" {
		return nil
	}
	return h.sm.GetSession(token)
}

func (h *Handler) getJMAPClient(sess *auth.UserSession) *jmap.Client {
	serverURL := sess.ServerURL
	if serverURL == "" {
		serverURL = h.cfg.StalwartURL
	}
	return jmap.NewClient(serverURL, sess.Email, sess.Password)
}

func formatRFCDate(rfcStr string) string {
	t, err := time.Parse(time.RFC3339, rfcStr)
	if err != nil {
		return "Recently"
	}
	now := time.Now()
	if t.Year() == now.Year() && t.YearDay() == now.YearDay() {
		return t.Format("3:04 PM")
	}
	if t.Year() == now.Year() && t.YearDay() == now.YearDay()-1 {
		return "Yesterday"
	}
	return t.Format("Jan 02")
}

func mailboxMatchesFolder(mb jmap.Mailbox, folder string) bool {
	folder = strings.ToLower(folder)
	role := strings.ToLower(strings.TrimSpace(mb.Role))
	name := strings.ToLower(strings.TrimSpace(mb.Name))

	switch folder {
	case "inbox":
		return role == "inbox" || name == "inbox" || name == "收件箱"
	case "sent":
		return role == "sent" || name == "sent" || name == "sent items" || name == "sent messages" || name == "sentmail" || name == "已发送"
	case "drafts":
		return role == "drafts" || role == "draft" || name == "drafts" || name == "draft" || name == "草稿箱" || name == "草稿"
	case "trash":
		return role == "trash" || role == "bin" || name == "trash" || name == "bin" || name == "deleted" || name == "deleted items" || name == "deleted messages" || name == "已删除" || name == "废纸篓"
	case "archive":
		return role == "archive" || name == "archive" || name == "archives" || name == "all mail" || name == "归档"
	case "spam":
		return role == "junk" || role == "spam" || name == "junk" || name == "spam" || name == "junk email" || name == "垃圾邮件"
	case "snoozed":
		return role == "snoozed" || name == "snoozed" || name == "待办" || name == "待办邮件" || name == "todo"
	default:
		return role == folder || name == folder
	}
}

func sliceContains(list []string, item string) bool {
	item = strings.ToLower(strings.TrimSpace(item))
	for _, s := range list {
		if strings.ToLower(strings.TrimSpace(s)) == item {
			return true
		}
	}
	return false
}

func getDiceBearAvatar(seed string) string {
	seed = strings.TrimSpace(seed)
	if seed == "" {
		seed = "webmaill"
	}
	return "https://api.dicebear.com/10.x/critters/svg?seed=" + url.QueryEscape(seed)
}

func (h *Handler) handleHealthz(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok","time":"` + time.Now().Format(time.RFC3339) + `"}`))
}

func (h *Handler) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ServerURL string `json:"serverUrl"`
		Email     string `json:"email"`
		Password  string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	req.Email = strings.TrimSpace(req.Email)
	if req.Email == "" || req.Password == "" {
		http.Error(w, "email and password are required", http.StatusBadRequest)
		return
	}

	if req.ServerURL == "" {
		req.ServerURL = h.cfg.StalwartURL
	}
	req.ServerURL = strings.TrimRight(strings.TrimSpace(req.ServerURL), "/")

	// 1. Authenticate with Stalwart JMAP
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	client := jmap.NewClient(req.ServerURL, req.Email, req.Password)
	session, err := client.FetchSession(ctx)
	if err != nil {
		// Optional offline demo account for preview only when DevMode is explicitly enabled
		if h.cfg.DevMode && req.Email == "demo@local" && (req.Password == "demo" || req.Password == "admin") {
			sess, token := h.sm.CreateOrUpdateSessionWithDemo("", "Demo User", req.Email, req.Password, req.ServerURL, true)
			auth.SetSessionCookie(w, token)

			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"success": true,
				"mode":    "demo_offline",
				"user": map[string]string{
					"name":   sess.Username,
					"email":  sess.Email,
					"avatar": getDiceBearAvatar(sess.Email),
				},
			})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to authenticate with Stalwart (%s): %v", req.ServerURL, err),
		})
		return
	}

	username := session.Username
	if username == "" {
		username = strings.Split(req.Email, "@")[0]
	}

	existingToken := auth.GetSessionToken(r)
	sess, token := h.sm.CreateOrUpdateSession(existingToken, username, req.Email, req.Password, req.ServerURL)
	auth.SetSessionCookie(w, token)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"user": map[string]string{
			"name":      sess.Username,
			"email":     sess.Email,
			"serverUrl": sess.ServerURL,
			"avatar":    getDiceBearAvatar(sess.Email),
		},
	})
}

func (h *Handler) handleLogout(w http.ResponseWriter, r *http.Request) {
	token := auth.GetSessionToken(r)
	if token != "" {
		h.sm.DeleteSession(token)
	}
	auth.ClearSessionCookie(w)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"success":true}`))
}

func (h *Handler) handleMe(w http.ResponseWriter, r *http.Request) {
	sess := h.getSession(r)
	if sess == nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"authenticated": false,
		})
		return
	}

	type AccountItem struct {
		Email     string `json:"email"`
		Name      string `json:"name"`
		ServerURL string `json:"serverUrl"`
		Avatar    string `json:"avatar"`
		IsCurrent bool   `json:"isCurrent"`
	}

	allSaved := h.sm.GetAllAccounts()
	var accountList []AccountItem
	seenEmail := make(map[string]bool)

	for _, acc := range allSaved {
		if !seenEmail[acc.Email] {
			seenEmail[acc.Email] = true
			accountList = append(accountList, AccountItem{
				Email:     acc.Email,
				Name:      acc.Username,
				ServerURL: acc.ServerURL,
				Avatar:    getDiceBearAvatar(acc.Email),
				IsCurrent: acc.Email == sess.Email,
			})
		}
	}
	if !seenEmail[sess.Email] {
		accountList = append(accountList, AccountItem{
			Email:     sess.Email,
			Name:      sess.Username,
			ServerURL: sess.ServerURL,
			Avatar:    getDiceBearAvatar(sess.Email),
			IsCurrent: true,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"authenticated": true,
		"name":          sess.Username,
		"email":         sess.Email,
		"serverUrl":     sess.ServerURL,
		"avatar":        getDiceBearAvatar(sess.Email),
		"accounts":      accountList,
	})
}

func (h *Handler) handleSwitchAccount(w http.ResponseWriter, r *http.Request) {
	token := auth.GetSessionToken(r)
	if token == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Email == "" {
		http.Error(w, "email required", http.StatusBadRequest)
		return
	}

	sess, ok := h.sm.SwitchAccount(token, req.Email)
	if !ok || sess == nil {
		http.Error(w, "account not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"user": map[string]string{
			"name":      sess.Username,
			"email":     sess.Email,
			"serverUrl": sess.ServerURL,
			"avatar":    getDiceBearAvatar(sess.Email),
		},
	})
}

func (h *Handler) handleRemoveAccount(w http.ResponseWriter, r *http.Request) {
	token := auth.GetSessionToken(r)
	if token == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Email == "" {
		http.Error(w, "email required", http.StatusBadRequest)
		return
	}

	h.sm.RemoveAccount(token, req.Email)
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func (h *Handler) handleMailboxes(w http.ResponseWriter, r *http.Request) {
	sess := h.getSession(r)
	if sess == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Try real Stalwart JMAP
	client := h.getJMAPClient(sess)
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	mboxes, err := client.GetMailboxes(ctx, "")
	if err == nil && len(mboxes) > 0 {
		var result []map[string]interface{}
		for _, mb := range mboxes {
			role := mb.Role
			if role == "" {
				role = strings.ToLower(mb.Name)
			}
			result = append(result, map[string]interface{}{
				"id":     mb.ID,
				"name":   mb.Name,
				"role":   role,
				"unread": mb.UnreadEmails,
				"total":  mb.TotalEmails,
			})
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(result)
		return
	}

	// Fallback to local thread stats
	h.mu.RLock()
	defer h.mu.RUnlock()

	inboxUnread := 0
	starredTotal := 0
	for _, t := range h.threads {
		if t.FolderID == "inbox" && !t.IsRead {
			inboxUnread++
		}
		if t.IsStarred {
			starredTotal++
		}
	}

	mailboxes := []map[string]interface{}{
		{"id": "inbox", "name": "Inbox", "role": "inbox", "unread": inboxUnread},
		{"id": "starred", "name": "Starred", "role": "starred", "total": starredTotal},
		{"id": "sent", "name": "Sent", "role": "sent"},
		{"id": "drafts", "name": "Drafts", "role": "drafts"},
		{"id": "snoozed", "name": "Snoozed", "role": "snoozed"},
		{"id": "archive", "name": "Archive", "role": "archive"},
		{"id": "spam", "name": "Spam", "role": "junk"},
		{"id": "trash", "name": "Trash", "role": "trash"},
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(mailboxes)
}

func (h *Handler) handleEmails(w http.ResponseWriter, r *http.Request) {
	sess := h.getSession(r)
	if sess == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	folder := r.URL.Query().Get("folder")
	if folder == "" {
		folder = "inbox"
	}
	label := r.URL.Query().Get("label")
	query := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("search")))

	// For real Stalwart accounts: Always query and return Stalwart's real emails
	if !sess.IsDemo {
		client := h.getJMAPClient(sess)
		ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
		defer cancel()

		var filter *jmap.EmailFilter
		if folder == "starred" {
			filter = &jmap.EmailFilter{HasKeyword: "$flagged"}
		} else {
			// Find mailbox ID for folder
			mboxes, err := client.GetMailboxes(ctx, "")
			if err != nil {
				w.Header().Set("Content-Type", "application/json")
				_ = json.NewEncoder(w).Encode([]ThreadItem{})
				return
			}

			targetMailboxID := ""
			for _, mb := range mboxes {
				if mailboxMatchesFolder(mb, folder) {
					targetMailboxID = mb.ID
					break
				}
			}

			// If folder is archive or snoozed and doesn't exist yet, auto-create it!
			if targetMailboxID == "" && (folder == "archive" || folder == "snoozed") {
				name := "Archive"
				role := folder
				if folder == "snoozed" {
					name = "Snoozed"
				}
				createdID, err := client.CreateMailbox(ctx, "", name, role)
				if err == nil && createdID != "" {
					targetMailboxID = createdID
				}
			}

			// If the requested folder does NOT exist in the user's Stalwart account,
			// it has 0 emails. Return empty array immediately!
			// NEVER query with empty InMailbox, which returns all emails in the whole account!
			if targetMailboxID == "" {
				w.Header().Set("Content-Type", "application/json")
				_ = json.NewEncoder(w).Encode([]ThreadItem{})
				return
			}

			filter = &jmap.EmailFilter{InMailbox: targetMailboxID}
		}

		if query != "" {
			if filter == nil {
				filter = &jmap.EmailFilter{}
			}
			filter.Text = query
		}

		qRes, err := client.QueryEmails(ctx, "", filter, 0, 50)
		if err != nil || qRes == nil || len(qRes.IDs) == 0 {
			// Real empty mailbox (or query returned 0): return empty list
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode([]ThreadItem{})
			return
		}

		emails, err := client.GetEmails(ctx, "", qRes.IDs)
		if err != nil || len(emails) == 0 {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode([]ThreadItem{})
			return
		}

		var result []ThreadItem
		for _, em := range emails {
			authorName := "Sender"
			authorMail := ""
			if len(em.From) > 0 {
				authorName = em.From[0].Name
				if authorName == "" {
					authorName = em.From[0].Email
				}
				authorMail = em.From[0].Email
			}

			var bodyLines []string
			for _, part := range em.HtmlBody {
				if bv, ok := em.BodyValues[part.PartID]; ok && bv.Value != "" {
					clean, _ := h.sanitizer.SanitizeEmailBody(bv.Value, false)
					bodyLines = append(bodyLines, clean)
				}
			}
			if len(bodyLines) == 0 {
				for _, part := range em.TextBody {
					if bv, ok := em.BodyValues[part.PartID]; ok && bv.Value != "" {
						bodyLines = append(bodyLines, bv.Value)
					}
				}
			}
			if len(bodyLines) == 0 {
				for _, v := range em.BodyValues {
					if v.Value != "" {
						bodyLines = append(bodyLines, v.Value)
					}
				}
			}
			if len(bodyLines) == 0 && em.Preview != "" {
				bodyLines = []string{em.Preview}
			}

			var attMetas []AttachmentMeta
			for _, att := range em.Attachments {
				attMetas = append(attMetas, AttachmentMeta{
					ID:   att.BlobID,
					Name: att.Name,
					Size: fmt.Sprintf("%d KB", (att.Size/1024)+1),
					Type: att.Type,
					URL:  fmt.Sprintf("/api/v1/attachments/%s", att.BlobID),
				})
			}

			labels := h.lm.GetLabels(sess.Email, em.ID, em.Subject, em.Preview)
			if label != "" && !sliceContains(labels, label) {
				continue
			}

			seed := authorMail
			if seed == "" {
				seed = authorName
			}

			result = append(result, ThreadItem{
				ID:          em.ID,
				FolderID:    folder,
				Subject:     em.Subject,
				Preview:     em.Preview,
				UpdatedAt:   formatRFCDate(em.ReceivedAt),
				RawDate:     em.ReceivedAt,
				IsRead:      em.Keywords["$seen"],
				IsStarred:   em.Keywords["$flagged"],
				LabelIDs:    labels,
				AuthorName:  authorName,
				AuthorMail:  authorMail,
				Avatar:      getDiceBearAvatar(seed),
				Body:        bodyLines,
				Attachments: attMetas,
			})
		}

		// Sort by RawDate descending (newest email at the top!)
		sort.Slice(result, func(i, j int) bool {
			return result[i].RawDate > result[j].RawDate
		})

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(result)
		return
	}

	// Fallback to in-memory store ONLY for demo account (isDemo == true)
	h.mu.RLock()
	defer h.mu.RUnlock()

	var result []ThreadItem
	for _, t := range h.threads {
		if label != "" {
			hasLabel := false
			for _, l := range t.LabelIDs {
				if l == label {
					hasLabel = true
					break
				}
			}
			if !hasLabel {
				continue
			}
		} else {
			if folder == "starred" {
				if !t.IsStarred {
					continue
				}
			} else {
				if t.FolderID != folder {
					continue
				}
			}
		}

		if query != "" {
			match := strings.Contains(strings.ToLower(t.Subject), query) ||
				strings.Contains(strings.ToLower(t.AuthorName), query) ||
				strings.Contains(strings.ToLower(t.Preview), query)
			if !match {
				continue
			}
		}

		result = append(result, t)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(result)
}

func (h *Handler) handleEmailDetail(w http.ResponseWriter, r *http.Request) {
	sess := h.getSession(r)
	if sess == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	id := strings.TrimPrefix(r.URL.Path, "/api/v1/emails/")
	if id == "" {
		http.NotFound(w, r)
		return
	}

	// For real Stalwart accounts:
	if !sess.IsDemo {
		client := h.getJMAPClient(sess)
		ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
		defer cancel()

		emails, err := client.GetEmails(ctx, "", []string{id})
		if err == nil && len(emails) > 0 {
			em := emails[0]
			if err := client.SetEmailKeywords(ctx, "", id, map[string]bool{"$seen": true}); err != nil {
				log.Printf("[JMAP SetEmailKeywords read error]: %v", err)
			}
			go h.broker.Broadcast("email_read", map[string]interface{}{
				"id":     id,
				"isRead": true,
			})

			authorName := "Sender"
			authorMail := ""
			if len(em.From) > 0 {
				authorName = em.From[0].Name
				if authorName == "" {
					authorName = em.From[0].Email
				}
				authorMail = em.From[0].Email
			}

			allowRemote := r.URL.Query().Get("allow_remote") == "true"
			var sanitizedBody []string
			hasAnyBlockedImages := false

			for _, part := range em.HtmlBody {
				if bv, ok := em.BodyValues[part.PartID]; ok && bv.Value != "" {
					clean, blocked := h.sanitizer.SanitizeEmailBody(bv.Value, allowRemote)
					if blocked {
						hasAnyBlockedImages = true
					}
					sanitizedBody = append(sanitizedBody, clean)
				}
			}
			if len(sanitizedBody) == 0 {
				for _, part := range em.TextBody {
					if bv, ok := em.BodyValues[part.PartID]; ok && bv.Value != "" {
						clean, blocked := h.sanitizer.SanitizeEmailBody(bv.Value, allowRemote)
						if blocked {
							hasAnyBlockedImages = true
						}
						sanitizedBody = append(sanitizedBody, clean)
					}
				}
			}
			if len(sanitizedBody) == 0 && em.Preview != "" {
				sanitizedBody = []string{em.Preview}
			}

			var attMetas []AttachmentMeta
			for _, att := range em.Attachments {
				attMetas = append(attMetas, AttachmentMeta{
					ID:   att.BlobID,
					Name: att.Name,
					Size: fmt.Sprintf("%d KB", (att.Size/1024)+1),
					Type: att.Type,
					URL:  fmt.Sprintf("/api/v1/attachments/%s", att.BlobID),
				})
			}

			labels := h.lm.GetLabels(sess.Email, em.ID, em.Subject, em.Preview)

			seed := authorMail
			if seed == "" {
				seed = authorName
			}

			threadItem := ThreadItem{
				ID:          em.ID,
				FolderID:    "inbox",
				Subject:     em.Subject,
				Preview:     em.Preview,
				UpdatedAt:   formatRFCDate(em.ReceivedAt),
				IsRead:      true,
				IsStarred:   em.Keywords["$flagged"],
				LabelIDs:    labels,
				AuthorName:  authorName,
				AuthorMail:  authorMail,
				Avatar:      getDiceBearAvatar(seed),
				Body:        sanitizedBody,
				Attachments: attMetas,
			}

			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(struct {
				ThreadItem
				HasBlockedImages bool `json:"hasBlockedImages"`
			}{
				ThreadItem:       threadItem,
				HasBlockedImages: hasAnyBlockedImages,
			})
			return
		}
	}

	// Demo fallback
	h.mu.Lock()
	defer h.mu.Unlock()

	for i := range h.threads {
		if h.threads[i].ID == id {
			// Mark as read
			h.threads[i].IsRead = true

			// Sanitize body HTML & track blocked images
			allowRemote := r.URL.Query().Get("allow_remote") == "true"
			var sanitizedBody []string
			hasAnyBlockedImages := false
			for _, p := range h.threads[i].Body {
				clean, blocked := h.sanitizer.SanitizeEmailBody(p, allowRemote)
				if blocked {
					hasAnyBlockedImages = true
				}
				sanitizedBody = append(sanitizedBody, clean)
			}

			responseThread := struct {
				ThreadItem
				HasBlockedImages bool `json:"hasBlockedImages"`
			}{
				ThreadItem:       h.threads[i],
				HasBlockedImages: hasAnyBlockedImages,
			}
			responseThread.Body = sanitizedBody

			// Broadcast read status change
			go h.broker.Broadcast("email_read", map[string]interface{}{
				"id":     id,
				"isRead": true,
			})

			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(responseThread)
			return
		}
	}

	http.NotFound(w, r)
}

func (h *Handler) handleToggleStar(w http.ResponseWriter, r *http.Request) {
	sess := h.getSession(r)
	if sess == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id := r.PathValue("id")

	if !sess.IsDemo {
		client := h.getJMAPClient(sess)
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		em, err := client.GetEmails(ctx, "", []string{id})
		isStarred := true
		if err == nil && len(em) > 0 {
			isStarred = !em[0].Keywords["$flagged"]
		}
		_ = client.SetEmailKeywords(ctx, "", id, map[string]bool{"$flagged": isStarred})

		go h.broker.Broadcast("email_starred", map[string]interface{}{
			"id":        id,
			"isStarred": isStarred,
		})

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]bool{"isStarred": isStarred})
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	for i := range h.threads {
		if h.threads[i].ID == id {
			h.threads[i].IsStarred = !h.threads[i].IsStarred
			isStarred := h.threads[i].IsStarred

			go h.broker.Broadcast("email_starred", map[string]interface{}{
				"id":        id,
				"isStarred": isStarred,
			})

			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]bool{"isStarred": isStarred})
			return
		}
	}
	http.NotFound(w, r)
}

func (h *Handler) handleToggleRead(w http.ResponseWriter, r *http.Request) {
	sess := h.getSession(r)
	if sess == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id := r.PathValue("id")

	var reqBody struct {
		IsRead *bool `json:"isRead"`
	}
	_ = json.NewDecoder(r.Body).Decode(&reqBody)

	if !sess.IsDemo {
		client := h.getJMAPClient(sess)
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		isRead := true
		if reqBody.IsRead != nil {
			isRead = *reqBody.IsRead
		} else {
			em, err := client.GetEmails(ctx, "", []string{id})
			if err == nil && len(em) > 0 {
				isRead = !em[0].Keywords["$seen"]
			}
		}

		_ = client.SetEmailKeywords(ctx, "", id, map[string]bool{"$seen": isRead})

		go h.broker.Broadcast("email_read", map[string]interface{}{
			"id":     id,
			"isRead": isRead,
		})

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]bool{"isRead": isRead})
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	for i := range h.threads {
		if h.threads[i].ID == id {
			if reqBody.IsRead != nil {
				h.threads[i].IsRead = *reqBody.IsRead
			} else {
				h.threads[i].IsRead = !h.threads[i].IsRead
			}
			isRead := h.threads[i].IsRead

			go h.broker.Broadcast("email_read", map[string]interface{}{
				"id":     id,
				"isRead": isRead,
			})

			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]bool{"isRead": isRead})
			return
		}
	}
	http.NotFound(w, r)
}

func (h *Handler) handleArchive(w http.ResponseWriter, r *http.Request) {
	sess := h.getSession(r)
	if sess == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id := r.PathValue("id")

	if !sess.IsDemo {
		client := h.getJMAPClient(sess)
		ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
		defer cancel()

		archiveID := ""
		mboxes, err := client.GetMailboxes(ctx, "")
		if err == nil {
			for _, mb := range mboxes {
				if mailboxMatchesFolder(mb, "archive") {
					archiveID = mb.ID
					break
				}
			}
		}

		if archiveID == "" {
			createdID, err := client.CreateMailbox(ctx, "", "Archive", "archive")
			if err == nil && createdID != "" {
				archiveID = createdID
			}
		}

		if archiveID != "" {
			if err := client.MoveEmail(ctx, "", id, archiveID); err != nil {
				log.Printf("[JMAP MoveEmail Error]: %v", err)
			}
		}

		go h.broker.Broadcast("email_moved", map[string]interface{}{
			"id":       id,
			"folderId": "archive",
		})

		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"success":true}`))
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	for i := range h.threads {
		if h.threads[i].ID == id {
			h.threads[i].FolderID = "archive"

			go h.broker.Broadcast("email_moved", map[string]interface{}{
				"id":       id,
				"folderId": "archive",
			})

			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"success":true}`))
			return
		}
	}
	http.NotFound(w, r)
}

func (h *Handler) handleSnooze(w http.ResponseWriter, r *http.Request) {
	sess := h.getSession(r)
	if sess == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id := r.PathValue("id")

	if !sess.IsDemo {
		client := h.getJMAPClient(sess)
		ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
		defer cancel()

		snoozedID := ""
		mboxes, err := client.GetMailboxes(ctx, "")
		if err == nil {
			for _, mb := range mboxes {
				if mailboxMatchesFolder(mb, "snoozed") {
					snoozedID = mb.ID
					break
				}
			}
		}

		if snoozedID == "" {
			createdID, err := client.CreateMailbox(ctx, "", "Snoozed", "snoozed")
			if err == nil && createdID != "" {
				snoozedID = createdID
			}
		}

		if snoozedID != "" {
			if err := client.MoveEmail(ctx, "", id, snoozedID); err != nil {
				log.Printf("[JMAP MoveEmail Error]: %v", err)
			}
		}

		go h.broker.Broadcast("email_moved", map[string]interface{}{
			"id":       id,
			"folderId": "snoozed",
		})

		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"success":true}`))
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	for i := range h.threads {
		if h.threads[i].ID == id {
			h.threads[i].FolderID = "snoozed"

			go h.broker.Broadcast("email_moved", map[string]interface{}{
				"id":       id,
				"folderId": "snoozed",
			})

			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"success":true}`))
			return
		}
	}
	http.NotFound(w, r)
}

func (h *Handler) handleMove(w http.ResponseWriter, r *http.Request) {
	sess := h.getSession(r)
	if sess == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id := r.PathValue("id")
	var req struct {
		FolderID string `json:"folderId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.FolderID == "" {
		http.Error(w, "folderId required", http.StatusBadRequest)
		return
	}

	targetFolder := strings.ToLower(req.FolderID)

	if !sess.IsDemo {
		client := h.getJMAPClient(sess)
		ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
		defer cancel()

		targetMailboxID := ""
		mboxes, err := client.GetMailboxes(ctx, "")
		if err == nil {
			for _, mb := range mboxes {
				if mailboxMatchesFolder(mb, targetFolder) {
					targetMailboxID = mb.ID
					break
				}
			}
		}

		if targetMailboxID == "" && (targetFolder == "archive" || targetFolder == "snoozed") {
			name := "Archive"
			role := targetFolder
			if targetFolder == "snoozed" {
				name = "Snoozed"
			}
			createdID, err := client.CreateMailbox(ctx, "", name, role)
			if err == nil && createdID != "" {
				targetMailboxID = createdID
			}
		}

		if targetMailboxID != "" {
			if err := client.MoveEmail(ctx, "", id, targetMailboxID); err != nil {
				log.Printf("[JMAP MoveEmail Error]: %v", err)
			}
		}

		go h.broker.Broadcast("email_moved", map[string]interface{}{
			"id":       id,
			"folderId": targetFolder,
		})

		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"success":true}`))
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	for i := range h.threads {
		if h.threads[i].ID == id {
			h.threads[i].FolderID = targetFolder

			go h.broker.Broadcast("email_moved", map[string]interface{}{
				"id":       id,
				"folderId": targetFolder,
			})

			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"success":true}`))
			return
		}
	}
	http.NotFound(w, r)
}

func (h *Handler) handleLabels(w http.ResponseWriter, r *http.Request) {
	sess := h.getSession(r)
	if sess == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id := r.PathValue("id")

	var req struct {
		Action string   `json:"action"` // "set" or "toggle"
		Label  string   `json:"label"`
		Labels []string `json:"labels"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	var updated []string
	if req.Action == "toggle" && req.Label != "" {
		updated = h.lm.ToggleLabel(sess.Email, id, req.Label)
	} else if len(req.Labels) > 0 || req.Action == "set" {
		updated = h.lm.SetLabels(sess.Email, id, req.Labels)
	} else if req.Label != "" {
		updated = h.lm.ToggleLabel(sess.Email, id, req.Label)
	}

	// Also sync to memory thread if demo account
	h.mu.Lock()
	for i := range h.threads {
		if h.threads[i].ID == id {
			h.threads[i].LabelIDs = updated
			break
		}
	}
	h.mu.Unlock()

	// Broadcast real-time SSE update
	go h.broker.Broadcast("email_labels_updated", map[string]interface{}{
		"id":       id,
		"labelIds": updated,
	})

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"id":       id,
		"labelIds": updated,
	})
}

func (h *Handler) handleDelete(w http.ResponseWriter, r *http.Request) {
	sess := h.getSession(r)
	if sess == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	id := r.PathValue("id")

	if !sess.IsDemo {
		client := h.getJMAPClient(sess)
		ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
		defer cancel()

		trashID := ""
		mboxes, err := client.GetMailboxes(ctx, "")
		if err == nil {
			for _, mb := range mboxes {
				if mailboxMatchesFolder(mb, "trash") {
					trashID = mb.ID
					break
				}
			}
		}

		if trashID == "" {
			createdID, err := client.CreateMailbox(ctx, "", "Trash", "trash")
			if err == nil && createdID != "" {
				trashID = createdID
			}
		}

		if trashID != "" {
			_ = client.MoveEmail(ctx, "", id, trashID)
		} else {
			_ = client.DeleteEmail(ctx, "", id)
		}

		go h.broker.Broadcast("email_deleted", map[string]interface{}{
			"id":     id,
			"status": "trash",
		})

		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"success":true}`))
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	for i := range h.threads {
		if h.threads[i].ID == id {
			folder := "trash"
			if h.threads[i].FolderID == "trash" {
				// Destroy
				h.threads = append(h.threads[:i], h.threads[i+1:]...)
				folder = "destroyed"
			} else {
				// Move to trash
				h.threads[i].FolderID = "trash"
			}

			go h.broker.Broadcast("email_deleted", map[string]interface{}{
				"id":     id,
				"status": folder,
			})

			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"success":true}`))
			return
		}
	}
	http.NotFound(w, r)
}

func parseAddressList(val interface{}) []string {
	var list []string
	if val == nil {
		return list
	}
	switch v := val.(type) {
	case string:
		tokens := strings.FieldsFunc(v, func(r rune) bool {
			return r == ',' || r == ';'
		})
		for _, token := range tokens {
			clean := strings.TrimSpace(token)
			if clean != "" {
				list = append(list, clean)
			}
		}
	case []interface{}:
		for _, item := range v {
			if s, ok := item.(string); ok {
				tokens := strings.FieldsFunc(s, func(r rune) bool {
					return r == ',' || r == ';'
				})
				for _, token := range tokens {
					clean := strings.TrimSpace(token)
					if clean != "" {
						list = append(list, clean)
					}
				}
			}
		}
	case []string:
		for _, s := range v {
			tokens := strings.FieldsFunc(s, func(r rune) bool {
				return r == ',' || r == ';'
			})
			for _, token := range tokens {
				clean := strings.TrimSpace(token)
				if clean != "" {
					list = append(list, clean)
				}
			}
		}
	}
	return list
}

func (h *Handler) handleSend(w http.ResponseWriter, r *http.Request) {
	sess := h.getSession(r)
	if sess == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		To          interface{}      `json:"to"`
		Cc          interface{}      `json:"cc"`
		Bcc         interface{}      `json:"bcc"`
		Subject     string           `json:"subject"`
		Body        string           `json:"body"`
		Attachments []AttachmentMeta `json:"attachments"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	toList := parseAddressList(req.To)
	ccList := parseAddressList(req.Cc)
	bccList := parseAddressList(req.Bcc)

	if len(toList) == 0 {
		http.Error(w, "at least one recipient is required", http.StatusBadRequest)
		return
	}

	fromName := sess.Username
	fromEmail := sess.Email

	// Try sending via Stalwart JMAP
	client := h.getJMAPClient(sess)
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	sentMail, err := client.SendEmail(ctx, "", fromEmail, fromName, toList, ccList, bccList, req.Subject, req.Body, "")
	newID := "sent-" + time.Now().Format("20060102150405")
	if err == nil && sentMail != nil && sentMail.ID != "" {
		newID = sentMail.ID
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	newThread := ThreadItem{
		ID:          newID,
		FolderID:    "sent",
		Subject:     req.Subject,
		Preview:     req.Body,
		UpdatedAt:   "Just now",
		IsRead:      true,
		IsStarred:   false,
		LabelIDs:    []string{"work"},
		AuthorName:  fromName,
		AuthorMail:  fromEmail,
		Avatar:      getDiceBearAvatar(fromEmail),
		Body:        []string{req.Body},
		Attachments: req.Attachments,
	}

	h.threads = append([]ThreadItem{newThread}, h.threads...)

	go h.broker.Broadcast("email_created", newThread)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(newThread)
}

func (h *Handler) initDefaultThreads() {
	h.threads = []ThreadItem{
		{
			ID:         "launch-recap-next-steps",
			FolderID:   "inbox",
			Subject:    "Launch recap + next steps",
			Preview:    "We agreed on the final launch date and the three must-ship items for Tuesday the 24th.",
			UpdatedAt:  "10:21 AM",
			IsRead:     false,
			IsStarred:  true,
			LabelIDs:   []string{"work", "urgent"},
			AuthorName: "Carlos Iglesias",
			AuthorMail: "carlos@heroui.dev",
			Avatar:     getDiceBearAvatar("carlos@heroui.dev"),
			Body: []string{
				"Quick recap from this morning's launch review so we have it in writing.",
				"We agreed on the final launch date (Tuesday the 24th) and the three must-ship items: onboarding tour, billing update flow, and the new analytics dashboard.",
				"Parker and I will co-own the go/no-go checklist. Can you sync with me and Maya tomorrow at 10:30?",
			},
			Messages: []MessageItem{
				{
					ID: "msg-1",
					From: ParticipantItem{
						Name:   "Carlos Iglesias",
						Email:  "carlos@heroui.dev",
						Avatar: getDiceBearAvatar("carlos@heroui.dev"),
					},
					To: []ParticipantItem{
						{
							Name:   "You",
							Email:  "demo@local",
							Avatar: getDiceBearAvatar("demo@local"),
						},
					},
					ReceivedAt: "10:21 AM",
					Body: []string{
						"Quick recap from this morning's launch review so we have it in writing.",
						"We agreed on the final launch date (Tuesday the 24th) and the three must-ship items: onboarding tour, billing update flow, and the new analytics dashboard.",
						"Parker and I will co-own the go/no-go checklist. Can you sync with me and Maya tomorrow at 10:30?",
					},
				},
				{
					ID: "msg-2",
					From: ParticipantItem{
						Name:   "You",
						Email:  "demo@local",
						Avatar: getDiceBearAvatar("demo@local"),
					},
					To: []ParticipantItem{
						{
							Name:   "Carlos Iglesias",
							Email:  "carlos@heroui.dev",
							Avatar: getDiceBearAvatar("carlos@heroui.dev"),
						},
					},
					ReceivedAt: "10:35 AM",
					Body: []string{
						"Sounds great Carlos! I will prepare the telemetry benchmarks ahead of the sync.",
					},
				},
			},
		},
		{
			ID:         "invoice-inv-0241-due-tomorrow",
			FolderID:   "inbox",
			Subject:    "Invoice INV-0241 is due tomorrow",
			Preview:    "Invoice INV-0241 for $2,450.00 is due tomorrow. You can download the PDF or pay from your dashboard.",
			UpdatedAt:  "Yesterday",
			IsRead:     false,
			IsStarred:  true,
			LabelIDs:   []string{"billing"},
			AuthorName: "Stripe",
			AuthorMail: "receipts@stripe.com",
			Avatar:     getDiceBearAvatar("receipts@stripe.com"),
			Body: []string{
				"This is a reminder that invoice INV-0241 for $2,450.00 is due tomorrow.",
				"You can download the PDF above or pay directly from your dashboard. Reply to this email if you'd like to update payment terms.",
			},
		},
		{
			ID:         "flight-itinerary-sfo-nrt",
			FolderID:   "inbox",
			Subject:    "Flight itinerary: SFO → NRT",
			Preview:    "You're booked on flight FL-482 from SFO → NRT on April 29. Seat 14A.",
			UpdatedAt:  "Apr 22",
			IsRead:     true,
			IsStarred:  false,
			LabelIDs:   []string{"travel"},
			AuthorName: "Flights",
			AuthorMail: "itinerary@flights.heroui.dev",
			Avatar:     getDiceBearAvatar("itinerary@flights.heroui.dev"),
			Body: []string{
				"You're booked on flight FL-482 from San Francisco (SFO) to Tokyo (NRT) on April 29.",
				"Departure: 11:20 AM · Arrival: 4:05 PM (next day) · Seat: 14A.",
				"Please check in online 24 hours before departure.",
			},
		},
		{
			ID:         "review-requested-heroui-pro-template-chat",
			FolderID:   "inbox",
			Subject:    "[heroui/heroui.pro] Review requested on PR #242",
			Preview:    "Review requested on #242 — fix(template-chat): inverted scroll and bounded chat height.",
			UpdatedAt:  "9:02 AM",
			IsRead:     false,
			IsStarred:  false,
			LabelIDs:   []string{"work"},
			AuthorName: "GitHub",
			AuthorMail: "notifications@github.com",
			Avatar:     getDiceBearAvatar("notifications@github.com"),
			Body: []string{
				"@you requested your review on heroui/heroui.pro#242 — fix(template-chat): inverted scroll and bounded chat height.",
				"Changes touch 2 files in templates/chat/src/views. Tests pass on CI.",
				"Open on GitHub to review.",
			},
		},
		{
			ID:         "design-review-dashboard-v3",
			FolderID:   "inbox",
			Subject:    "Design review: dashboard v3",
			Preview:    "Pinging ahead of Friday's design review: final dashboard layout, chart colors, and responsive table header.",
			UpdatedAt:  "Mon",
			IsRead:     true,
			IsStarred:  false,
			LabelIDs:   []string{"work"},
			AuthorName: "Maya Okafor",
			AuthorMail: "maya@heroui.dev",
			Avatar:     getDiceBearAvatar("maya@heroui.dev"),
			Body: []string{
				"Pinging ahead of Friday's design review — here's what we'll cover:",
				"1) Final dashboard home layout with the new KPI ordering.",
				"2) Updated chart colors to match the brand refresh.",
				"3) Responsive behavior for the employees table header.",
			},
		},
	}
}
