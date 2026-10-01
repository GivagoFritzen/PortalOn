package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"portalon/internal/events"
	"portalon/internal/models"
)

type mockServiceWithStatus struct {
	*mockService
	checkStatusFunc func(ctx context.Context, id int64) (bool, error)
}

func (m *mockServiceWithStatus) CheckStatus(ctx context.Context, id int64) (bool, error) {
	if m.checkStatusFunc != nil {
		return m.checkStatusFunc(ctx, id)
	}
	return m.mockService.CheckStatus(ctx, id)
}

func (m *mockServiceWithStatus) SubscribeStatusChanges() chan events.StatusChangeEvent {
	return nil
}

func (m *mockServiceWithStatus) UnsubscribeStatusChanges(ch chan events.StatusChangeEvent) {}

func (m *mockServiceWithStatus) StartHealthWorker(ctx context.Context) {}

func (m *mockServiceWithStatus) StopHealthWorker() {}

func TestStatusHandler_CheckStatusHandler_Online(t *testing.T) {
	svc := newMockService()
	_ = svc.Create(context.Background(), &models.App{Name: "Online App", URL: "http://online.local"})
	h := NewStatusHandler(svc)

	req := httptest.NewRequest(http.MethodGet, "/api/apps/1/status", nil)
	req.SetPathValue("id", "1")
	w := httptest.NewRecorder()

	h.CheckStatusHandler(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	body := w.Body.String()
	if !strings.Contains(body, "status-dot-online") {
		t.Errorf("expected status-dot-online class, got: %s", body)
	}
}

func TestStatusHandler_CheckStatusHandler_Offline(t *testing.T) {
	baseSvc := newMockService()
	_ = baseSvc.Create(context.Background(), &models.App{Name: "Offline App", URL: "http://offline.local"})

	svc := &mockServiceWithStatus{
		mockService: baseSvc,
		checkStatusFunc: func(ctx context.Context, id int64) (bool, error) {
			return false, nil
		},
	}

	h := NewStatusHandler(svc)

	req := httptest.NewRequest(http.MethodGet, "/api/apps/1/status", nil)
	req.SetPathValue("id", "1")
	w := httptest.NewRecorder()

	h.CheckStatusHandler(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	body := w.Body.String()
	if !strings.Contains(body, "status-dot-offline") {
		t.Errorf("expected status-dot-offline class, got: %s", body)
	}
}

func TestStatusHandler_CheckStatusHandler_InvalidID(t *testing.T) {
	svc := newMockService()
	h := NewStatusHandler(svc)

	req := httptest.NewRequest(http.MethodGet, "/api/apps/abc/status", nil)
	req.SetPathValue("id", "abc")
	w := httptest.NewRecorder()

	h.CheckStatusHandler(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}

func TestStatusHandler_CheckStatusHandler_NotFound(t *testing.T) {
	svc := newMockService()
	h := NewStatusHandler(svc)

	req := httptest.NewRequest(http.MethodGet, "/api/apps/999/status", nil)
	req.SetPathValue("id", "999")
	w := httptest.NewRecorder()

	h.CheckStatusHandler(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", w.Code)
	}
}

func TestStatusHandler_CheckStatusHandlerContentType(t *testing.T) {
	svc := newMockService()
	_ = svc.Create(context.Background(), &models.App{Name: "Test", URL: "http://test.local"})
	h := NewStatusHandler(svc)

	req := httptest.NewRequest(http.MethodGet, "/api/apps/1/status", nil)
	req.SetPathValue("id", "1")
	w := httptest.NewRecorder()

	h.CheckStatusHandler(w, req)

	contentType := w.Header().Get("Content-Type")
	if !strings.Contains(contentType, "text/html") {
		t.Errorf("expected Content-Type text/html, got %s", contentType)
	}
}
