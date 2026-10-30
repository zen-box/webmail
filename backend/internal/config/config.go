package config

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

type YamlConfig struct {
	Server struct {
		Port         string `yaml:"port"`
		Host         string `yaml:"host"`
		CookieSecret string `yaml:"cookie_secret"`
		DevMode      *bool  `yaml:"dev_mode"`
	} `yaml:"server"`
	Mail struct {
		ServerURL string `yaml:"server_url"`
	} `yaml:"mail"`
	Storage struct {
		DataDir string `yaml:"data_dir"`
	} `yaml:"storage"`
}

type Config struct {
	Host         string
	Port         string
	StalwartURL  string
	CookieSecret string
	DataDir      string
	DevMode      bool
}

func Load() *Config {
	cfg := &Config{
		Host:         "0.0.0.0",
		Port:         "8080",
		StalwartURL:  "https://mail.example.com",
		CookieSecret: "default-auto-generated",
		DataDir:      "./data",
		DevMode:      false, // default to secure production mode
	}

	// Candidates for config.yml
	candidates := []string{
		"config.yml",
		"config.yaml",
		filepath.Join("..", "config.yml"),
	}

	if exe, err := os.Executable(); err == nil {
		candidates = append(candidates, filepath.Join(filepath.Dir(exe), "config.yml"))
	}

	var foundPath string
	for _, p := range candidates {
		if fi, err := os.Stat(p); err == nil && !fi.IsDir() {
			foundPath = p
			break
		}
	}

	if foundPath != "" {
		data, err := os.ReadFile(foundPath)
		if err == nil {
			var ycfg YamlConfig
			if err := yaml.Unmarshal(data, &ycfg); err == nil {
				if ycfg.Server.Host != "" {
					cfg.Host = ycfg.Server.Host
				}
				if ycfg.Server.Port != "" {
					cfg.Port = ycfg.Server.Port
				}
				if ycfg.Server.CookieSecret != "" {
					cfg.CookieSecret = ycfg.Server.CookieSecret
				}
				if ycfg.Server.DevMode != nil {
					cfg.DevMode = *ycfg.Server.DevMode
				}
				if ycfg.Mail.ServerURL != "" {
					cfg.StalwartURL = ycfg.Mail.ServerURL
				}
				if ycfg.Storage.DataDir != "" {
					cfg.DataDir = ycfg.Storage.DataDir
				}
				log.Printf("Loaded config from: %s (Port: %s, Stalwart: %s)", foundPath, cfg.Port, cfg.StalwartURL)
			}
		}
	} else {
		// Create default config.yml
		defaultYAML := `server:
  port: "8080"
  host: "0.0.0.0"
  dev_mode: false

mail:
  server_url: "https://mail.example.com"

storage:
  data_dir: "./data"
`
		_ = os.WriteFile("config.yml", []byte(defaultYAML), 0644)
		log.Printf("Generated default config.yml with Stalwart: %s", cfg.StalwartURL)
	}

	// Environment overrides
	if p := os.Getenv("PORT"); p != "" {
		cfg.Port = p
	}
	if u := os.Getenv("STALWART_URL"); u != "" {
		cfg.StalwartURL = u
	}
	if s := os.Getenv("COOKIE_SECRET"); s != "" {
		cfg.CookieSecret = s
	}

	// Ensure data directory exists
	_ = os.MkdirAll(cfg.DataDir, 0755)

	// Ensure strong cookie secret (auto-generate persistent token if not configured)
	if cfg.CookieSecret == "default-auto-generated" || cfg.CookieSecret == "" {
		secretFile := filepath.Join(cfg.DataDir, ".session_secret")
		if sec, err := os.ReadFile(secretFile); err == nil && len(sec) >= 16 {
			cfg.CookieSecret = strings.TrimSpace(string(sec))
		} else {
			tokenBytes := make([]byte, 32)
			_, _ = rand.Read(tokenBytes)
			cfg.CookieSecret = hex.EncodeToString(tokenBytes)
			_ = os.WriteFile(secretFile, []byte(cfg.CookieSecret), 0600)
		}
	}

	return cfg
}
