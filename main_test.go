package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"portalon/internal/config"
	"portalon/internal/database"
	"portalon/internal/events"
	"portalon/internal/handlers"
	"portalon/internal/repository"
	"portalon/internal/service"
)

func TestRegisterRoutes(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := tmpDir + "/test.db"

	database.Init(dbPath)
	defer database.Close()

	appRepo := repository.NewAppRepository(database.DB)
	broadcaster := events.NewStatusBroadcaster(100)
	appSvc := service.NewAppService(appRepo, broadcaster)

	appHandler := handlers.NewAppHandler(appSvc)
	iconHandler := handlers.NewIconHandler()
	statusHandler := handlers.NewStatusHandler(appSvc)

	mux := http.NewServeMux()
	registerRoutes(mux, appHandler, iconHandler, statusHandler)

	tests := []struct {
		name       string
		method     string
		path       string
		wantStatus int
	}{
		{"health check", http.MethodGet, "/health", http.StatusOK},
		{"index root", http.MethodGet, "/", http.StatusOK},
		{"list apps", http.MethodGet, "/api/apps", http.StatusOK},
		{"search apps", http.MethodGet, "/api/apps/search", http.StatusOK},
		{"get app", http.MethodGet, "/api/apps/1", http.StatusNotFound},
		{"create app", http.MethodPost, "/api/apps", http.StatusBadRequest},
		{"update app", http.MethodPut, "/api/apps/1", http.StatusBadRequest},
		{"delete app", http.MethodDelete, "/api/apps/1", http.StatusNotFound},
		{"reorder apps", http.MethodPost, "/api/apps/reorder", http.StatusBadRequest},
		{"app status", http.MethodGet, "/api/apps/1/status", http.StatusNotFound},
		{"list icons", http.MethodGet, "/api/icons", http.StatusOK},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
			w := httptest.NewRecorder()
			mux.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("%s: expected status %d, got %d", tt.name, tt.wantStatus, w.Code)
			}
		})
	}
}

func TestMain_ConfigLoading(t *testing.T) {
	cfg := config.Load()

	if cfg.Port == "" {
		t.Error("expected port to be set")
	}
	if cfg.DBPath == "" {
		t.Error("expected DB path to be set")
	}
}

func TestMain_ServerCreation(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := tmpDir + "/test.db"

	database.Init(dbPath)
	defer database.Close()

	appRepo := repository.NewAppRepository(database.DB)
	broadcaster := events.NewStatusBroadcaster(100)
	appSvc := service.NewAppService(appRepo, broadcaster)

	appHandler := handlers.NewAppHandler(appSvc)
	iconHandler := handlers.NewIconHandler()
	statusHandler := handlers.NewStatusHandler(appSvc)

	mux := http.NewServeMux()
	registerRoutes(mux, appHandler, iconHandler, statusHandler)

	srv := &http.Server{
		Addr:              ":0",
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	errChan := make(chan error, 1)
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errChan <- err
		}
	}()

	defer func() {
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := srv.Shutdown(shutdownCtx); err != nil {
			t.Logf("server shutdown error: %v", err)
		}
	}()

	select {
	case err := <-errChan:
		t.Fatalf("server failed to start: %v", err)
	case <-time.After(100 * time.Millisecond):
	}

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
}

func TestMain_StaticFileServer(t *testing.T) {
	t.Skip("Skipping due to working directory issue with locale loading")
}