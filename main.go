package main

import (
	"context"
	"log"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"portalon/internal/config"
	"portalon/internal/database"
	"portalon/internal/events"
	"portalon/internal/handlers"
	"portalon/internal/repository"
	"portalon/internal/service"
)

func main() {
	cfg := config.Load()

	database.Init(cfg.DBPath)
	defer database.Close()

	broadcaster := events.NewStatusBroadcaster(100)
	appRepo := repository.NewAppRepository(database.DB)
	appSvc := service.NewAppService(appRepo, broadcaster)

	appHandler := handlers.NewAppHandler(appSvc)
	iconHandler := handlers.NewIconHandler()
	statusHandler := handlers.NewStatusHandler(appSvc)

	mux := http.NewServeMux()
	registerRoutes(mux, appHandler, iconHandler, statusHandler)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	appSvc.StartHealthWorker(ctx)
	defer appSvc.StopHealthWorker()

	go func() {
		<-ctx.Done()
		log.Println("Shutting down server gracefully...")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := srv.Shutdown(shutdownCtx); err != nil {
			log.Printf("Server shutdown error: %v", err)
		}
	}()

	log.Printf("PortalOn server starting on :%s", cfg.Port)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}
}

func registerRoutes(
	mux *http.ServeMux,
	appHandler *handlers.AppHandler,
	iconHandler *handlers.IconHandler,
	statusHandler *handlers.StatusHandler,
) {
	// Health check
	mux.HandleFunc("GET /health", statusHandler.HealthCheck)

	// UI Page Routes
	mux.HandleFunc("GET /{$}", appHandler.IndexHandler)

	// API Application Endpoints
	mux.HandleFunc("GET /api/apps", appHandler.ListApps)
	mux.HandleFunc("GET /api/apps/search", appHandler.SearchAppsHandler)
	mux.HandleFunc("GET /api/apps/{id}", appHandler.GetApp)
	mux.HandleFunc("POST /api/apps", appHandler.CreateApp)
	mux.HandleFunc("PUT /api/apps/{id}", appHandler.UpdateApp)
	mux.HandleFunc("DELETE /api/apps/{id}", appHandler.DeleteApp)
	mux.HandleFunc("POST /api/apps/reorder", appHandler.ReorderApps)

	// App Status & Icon Endpoints
	mux.HandleFunc("GET /api/apps/{id}/status", statusHandler.CheckStatusHandler)
	mux.HandleFunc("GET /api/apps/stream", statusHandler.StreamStatusHandler)
	mux.HandleFunc("GET /api/icons", iconHandler.ListIcons)

	// Static File Server
	fs := http.FileServer(http.Dir("static"))
	mux.Handle("GET /static/", http.StripPrefix("/static/", fs))
}

