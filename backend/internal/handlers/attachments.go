package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
)

type StoredAttachment struct {
	BlobID      string `json:"blobId"`
	Name        string `json:"name"`
	ContentType string `json:"type"`
	Size        int64  `json:"size"`
	Data        []byte `json:"-"`
}

type AttachmentStore struct {
	mu    sync.RWMutex
	blobs map[string]*StoredAttachment
}

func NewAttachmentStore() *AttachmentStore {
	return &AttachmentStore{
		blobs: make(map[string]*StoredAttachment),
	}
}

func (s *AttachmentStore) Save(name, contentType string, data []byte) *StoredAttachment {
	s.mu.Lock()
	defer s.mu.Unlock()

	b := make([]byte, 16)
	_, _ = rand.Read(b)
	blobID := "blob-" + hex.EncodeToString(b)

	att := &StoredAttachment{
		BlobID:      blobID,
		Name:        name,
		ContentType: contentType,
		Size:        int64(len(data)),
		Data:        data,
	}

	s.blobs[blobID] = att
	return att
}

func (s *AttachmentStore) Get(blobID string) *StoredAttachment {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.blobs[blobID]
}

func (h *Handler) handleUploadAttachment(w http.ResponseWriter, r *http.Request) {
	// 32MB max memory
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		http.Error(w, "file too large", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "missing file parameter", http.StatusBadRequest)
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "read file failed", http.StatusInternalServerError)
		return
	}

	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	att := h.attStore.Save(header.Filename, contentType, data)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(att)
}

func (h *Handler) handleDownloadAttachment(w http.ResponseWriter, r *http.Request) {
	blobID := strings.TrimPrefix(r.URL.Path, "/api/v1/attachments/")
	if blobID == "" {
		http.NotFound(w, r)
		return
	}

	att := h.attStore.Get(blobID)
	if att == nil {
		http.NotFound(w, r)
		return
	}

	// Security headers (Roundcube 1.7.5 standard)
	w.Header().Set("Content-Type", att.ContentType)
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`inline; filename="%s"`, att.Name))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", att.Size))

	_, _ = w.Write(att.Data)
}
