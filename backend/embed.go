package main

import (
	"embed"
	"io"
	"io/fs"
	"net/http"
	"strings"
	"time"
)

//go:embed all:dist
var distFS embed.FS

func RegisterStatic(mux *http.ServeMux) {
	sub, err := fs.Sub(distFS, "dist")
	if err != nil {
		return
	}

	fileServer := http.FileServer(http.FS(sub))

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Do not intercept API or health routes
		if strings.HasPrefix(r.URL.Path, "/api") || strings.HasPrefix(r.URL.Path, "/healthz") {
			http.NotFound(w, r)
			return
		}

		filePath := strings.TrimPrefix(r.URL.Path, "/")
		if filePath == "" {
			filePath = "index.html"
		}

		// Try opening the requested file
		f, err := sub.Open(filePath)
		if err == nil {
			_ = f.Close()
			fileServer.ServeHTTP(w, r)
			return
		}

		// SPA fallback: return index.html for client-side routing
		indexFile, err := sub.Open("index.html")
		if err == nil {
			defer indexFile.Close()
			if seeker, ok := indexFile.(io.ReadSeeker); ok {
				http.ServeContent(w, r, "index.html", time.Now(), seeker)
				return
			}
		}

		fileServer.ServeHTTP(w, r)
	})
}
