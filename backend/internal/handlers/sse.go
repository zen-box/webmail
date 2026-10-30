package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
)

type EventMessage struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
}

type SSEBroker struct {
	mu      sync.Mutex
	clients map[chan EventMessage]bool
}

func NewSSEBroker() *SSEBroker {
	return &SSEBroker{
		clients: make(map[chan EventMessage]bool),
	}
}

func (b *SSEBroker) Subscribe() chan EventMessage {
	b.mu.Lock()
	defer b.mu.Unlock()

	ch := make(chan EventMessage, 10)
	b.clients[ch] = true
	return ch
}

func (b *SSEBroker) Unsubscribe(ch chan EventMessage) {
	b.mu.Lock()
	defer b.mu.Unlock()

	delete(b.clients, ch)
	close(ch)
}

func (b *SSEBroker) Broadcast(event string, data interface{}) {
	b.mu.Lock()
	defer b.mu.Unlock()

	msg := EventMessage{Event: event, Data: data}
	for ch := range b.clients {
		select {
		case ch <- msg:
		default:
			// client channel is full, skip to avoid blocking
		}
	}
}

func (h *Handler) handleSSE(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	ch := h.broker.Subscribe()
	defer h.broker.Unsubscribe(ch)

	// Send initial connected event
	fmt.Fprintf(w, "event: connected\ndata: {\"status\":\"ok\"}\n\n")
	flusher.Flush()

	ctx := r.Context()
	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}
			data, _ := json.Marshal(msg.Data)
			fmt.Fprintf(w, "event: %s\ndata: %s\n\n", msg.Event, string(data))
			flusher.Flush()
		}
	}
}
