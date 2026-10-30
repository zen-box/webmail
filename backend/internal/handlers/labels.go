package handlers

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

// LabelManager handles persistence and intelligent default tagging for emails
type LabelManager struct {
	filePath string
	mu       sync.RWMutex
	// emailAccount -> emailID -> []string
	labels map[string]map[string][]string
}

// NewLabelManager loads or creates label storage
func NewLabelManager(dataDir string) *LabelManager {
	_ = os.MkdirAll(dataDir, 0755)
	lm := &LabelManager{
		filePath: filepath.Join(dataDir, "labels.json"),
		labels:   make(map[string]map[string][]string),
	}
	lm.load()
	return lm
}

func (lm *LabelManager) load() {
	lm.mu.Lock()
	defer lm.mu.Unlock()

	data, err := os.ReadFile(lm.filePath)
	if err != nil {
		return
	}
	_ = json.Unmarshal(data, &lm.labels)
	if lm.labels == nil {
		lm.labels = make(map[string]map[string][]string)
	}
}

func (lm *LabelManager) save() {
	data, err := json.MarshalIndent(lm.labels, "", "  ")
	if err != nil {
		return
	}
	_ = os.WriteFile(lm.filePath, data, 0644)
}

// GetLabels returns the labels for an email, assigning smart defaults if not yet tagged
func (lm *LabelManager) GetLabels(accountEmail, emailID, subject, preview string) []string {
	lm.mu.Lock()
	defer lm.mu.Unlock()

	accMap, ok := lm.labels[accountEmail]
	if !ok {
		accMap = make(map[string][]string)
		lm.labels[accountEmail] = accMap
	}

	if custom, exists := accMap[emailID]; exists {
		return custom
	}

	// Smart default tagging based on subject and preview text
	lower := strings.ToLower(subject + " " + preview)
	var defaults []string

	if strings.Contains(lower, "invoice") || strings.Contains(lower, "billing") || strings.Contains(lower, "账单") || strings.Contains(lower, "receipt") || strings.Contains(lower, "pay") || strings.Contains(lower, "付款") || strings.Contains(lower, "费用") || strings.Contains(lower, "deposit") {
		defaults = append(defaults, "billing")
	} else if strings.Contains(lower, "flight") || strings.Contains(lower, "travel") || strings.Contains(lower, "hotel") || strings.Contains(lower, "行程") || strings.Contains(lower, "机票") || strings.Contains(lower, "预订") || strings.Contains(lower, "itinerary") {
		defaults = append(defaults, "travel")
	} else if strings.Contains(lower, "urgent") || strings.Contains(lower, "紧急") || strings.Contains(lower, "asap") || strings.Contains(lower, "重要") || strings.Contains(lower, "申诉") || strings.Contains(lower, "丢失") || strings.Contains(lower, "注销") {
		defaults = append(defaults, "urgent")
	} else if strings.Contains(lower, "github") || strings.Contains(lower, "gitlab") || strings.Contains(lower, "review") || strings.Contains(lower, "pr #") || strings.Contains(lower, "anthropic") || strings.Contains(lower, "claude") || strings.Contains(lower, "work") || strings.Contains(lower, "工作") || strings.Contains(lower, "项目") || strings.Contains(lower, "验证码") || strings.Contains(lower, "verification") || strings.Contains(lower, "code") {
		defaults = append(defaults, "work")
	} else {
		defaults = append(defaults, "personal")
	}

	accMap[emailID] = defaults
	lm.save()
	return defaults
}

// SetLabels sets the full label list for an email
func (lm *LabelManager) SetLabels(accountEmail, emailID string, labels []string) []string {
	lm.mu.Lock()
	defer lm.mu.Unlock()

	if _, ok := lm.labels[accountEmail]; !ok {
		lm.labels[accountEmail] = make(map[string][]string)
	}

	cleaned := make([]string, 0, len(labels))
	seen := make(map[string]bool)
	for _, l := range labels {
		l = strings.ToLower(strings.TrimSpace(l))
		if l != "" && !seen[l] {
			seen[l] = true
			cleaned = append(cleaned, l)
		}
	}

	lm.labels[accountEmail][emailID] = cleaned
	lm.save()
	return cleaned
}

// ToggleLabel adds or removes a label
func (lm *LabelManager) ToggleLabel(accountEmail, emailID, label string) []string {
	lm.mu.Lock()
	defer lm.mu.Unlock()

	if _, ok := lm.labels[accountEmail]; !ok {
		lm.labels[accountEmail] = make(map[string][]string)
	}

	target := strings.ToLower(strings.TrimSpace(label))
	current := lm.labels[accountEmail][emailID]
	var updated []string
	found := false
	for _, l := range current {
		if strings.EqualFold(l, target) {
			found = true
		} else {
			updated = append(updated, l)
		}
	}
	if !found {
		updated = append(updated, target)
	}

	lm.labels[accountEmail][emailID] = updated
	lm.save()
	return updated
}
