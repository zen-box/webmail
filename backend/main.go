package main

import (
	"fmt"
	"log"
	"net"
	"net/http"
	"time"

	"mail-server/internal/auth"
	"mail-server/internal/config"
	"mail-server/internal/handlers"
	"mail-server/internal/sanitize"
)

func main() {
	cfg := config.Load()
	sm := auth.NewSessionManager(cfg.DataDir)
	sanitizer := sanitize.New()

	mux := http.NewServeMux()

	// 1. API Handlers
	h := handlers.New(cfg, sm, sanitizer)
	h.RegisterRoutes(mux)

	// 2. Embedded Static Web Assets (React 19 + HeroUI)
	RegisterStatic(mux)

	// 3. CORS & Logging Middleware
	handler := loggingMiddleware(corsMiddleware(mux))

	listenAddr := net.JoinHostPort(cfg.Host, cfg.Port)
	if cfg.Host == "" {
		listenAddr = ":" + cfg.Port
	}

	server := &http.Server{
		Addr:         listenAddr,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	displayHost := cfg.Host
	if displayHost == "" || displayHost == "0.0.0.0" {
		displayHost = "localhost"
	}
	fmt.Printf("\n🚀 HeroUI Pro Mail Server (Single Binary) running at http://%s:%s\n", displayHost, cfg.Port)
	fmt.Printf("📬 Stalwart JMAP Endpoint: %s\n", cfg.StalwartURL)
	fmt.Printf("🛡️  HTML Sanitization & Tracking Protection: Active (Roundcube washtml model)\n\n")

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server failed: %v", err)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		if r.URL.Path != "/healthz" && !stringsHasAnyPrefix(r.URL.Path, "/assets/") {
			log.Printf("[%s] %s %s (%s)", r.Method, r.URL.Path, r.RemoteAddr, time.Since(start))
		}
	})
}

func stringsHasAnyPrefix(s string, prefixes ...string) bool {
	for _, p := range prefixes {
		if len(s) >= len(p) && s[:len(p)] == p {
			return true
		}
	}
	return false
}
