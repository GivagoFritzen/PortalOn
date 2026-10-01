package config

import (
	"os"
	"testing"
)

func TestLoad_Defaults(t *testing.T) {
	os.Unsetenv("PORTALON_PORT")
	os.Unsetenv("PORTALON_DB_PATH")

	cfg := Load()

	if cfg.Port != defaultPort {
		t.Errorf("expected default port %q, got %q", defaultPort, cfg.Port)
	}
	if cfg.DBPath != defaultDBPath {
		t.Errorf("default DB path %q, got %q", defaultDBPath, cfg.DBPath)
	}
}

func TestLoad_FromEnv(t *testing.T) {
	os.Setenv("PORTALON_PORT", "9999")
	os.Setenv("PORTALON_DB_PATH", "/custom/path.db")
	defer func() {
		os.Unsetenv("PORTALON_PORT")
		os.Unsetenv("PORTALON_DB_PATH")
	}()

	cfg := Load()

	if cfg.Port != "9999" {
		t.Errorf("expected port from env %q, got %q", "9999", cfg.Port)
	}
	if cfg.DBPath != "/custom/path.db" {
		t.Errorf("expected db path from env %q, got %q", "/custom/path.db", cfg.DBPath)
	}
}

func TestLoad_PartialEnv(t *testing.T) {
	os.Setenv("PORTALON_PORT", "7777")
	os.Unsetenv("PORTALON_DB_PATH")
	defer os.Unsetenv("PORTALON_PORT")

	cfg := Load()

	if cfg.Port != "7777" {
		t.Errorf("expected port from env %q, got %q", "7777", cfg.Port)
	}
	if cfg.DBPath != defaultDBPath {
		t.Errorf("expected default db path %q, got %q", defaultDBPath, cfg.DBPath)
	}
}

func TestLoad_EmptyStringEnv(t *testing.T) {
	os.Setenv("PORTALON_PORT", "")
	os.Setenv("PORTALON_DB_PATH", "")
	defer func() {
		os.Unsetenv("PORTALON_PORT")
		os.Unsetenv("PORTALON_DB_PATH")
	}()

	cfg := Load()

	if cfg.Port != defaultPort {
		t.Errorf("expected default port when env is empty, got %q", cfg.Port)
	}
	if cfg.DBPath != defaultDBPath {
		t.Errorf("expected default db path when env is empty, got %q", cfg.DBPath)
	}
}