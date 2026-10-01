package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"portalon/internal/service"
)

type StatusHandler struct {
	service service.AppService
}

func NewStatusHandler(svc service.AppService) *StatusHandler {
	return &StatusHandler{service: svc}
}

func (h *StatusHandler) CheckStatusHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parsePathID(r)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	isOnline, err := h.service.CheckStatus(r.Context(), id)
	if err != nil {
		writeError(w, err)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	statusClass := "status-dot-offline"
	if isOnline {
		statusClass = "status-dot-online"
	}
	fmt.Fprintf(w, `<div class="absolute -top-1 -right-1 status-dot %s"></div>`, statusClass)
}

// HealthCheck handles the health probe endpoint and returns a 200 OK status.
func (h *StatusHandler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *StatusHandler) StreamStatusHandler(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	flusher.Flush()

	eventChan := h.service.SubscribeStatusChanges()
	if eventChan == nil {
		http.Error(w, "SSE not available", http.StatusServiceUnavailable)
		return
	}
	defer h.service.UnsubscribeStatusChanges(eventChan)

	apps, err := h.service.ListAll(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}

	initEvent := make([]map[string]any, 0, len(apps))
	for _, app := range apps {
		initEvent = append(initEvent, map[string]any{
			"app_id":    app.ID,
			"is_online": app.IsOnline,
		})
	}
	initData, _ := json.Marshal(initEvent)
	fmt.Fprintf(w, "event: init\ndata: %s\n\n", initData)
	flusher.Flush()

	heartbeat := time.NewTicker(30 * time.Second)
	defer heartbeat.Stop()

	clientGone := r.Context().Done()

	for {
		select {
		case event, ok := <-eventChan:
			if !ok {
				return
			}
			eventData, _ := json.Marshal(map[string]any{
				"app_id":     event.AppID,
				"is_online":  event.IsOnline,
				"timestamp":  event.Timestamp.Format(time.RFC3339),
			})
			fmt.Fprintf(w, "event: status-change\ndata: %s\n\n", eventData)
			flusher.Flush()
		case <-heartbeat.C:
			fmt.Fprintf(w, ": heartbeat\n\n")
			flusher.Flush()
		case <-clientGone:
			return
		}
	}
}
