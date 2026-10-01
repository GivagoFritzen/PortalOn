package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	apperrors "portalon/internal/errors"
	"portalon/internal/events"
	"portalon/internal/models"
)

type mockService struct {
	apps   map[int64]models.App
	nextID int64
}

func newMockService() *mockService {
	return &mockService{
		apps:   make(map[int64]models.App),
		nextID: 1,
	}
}

func (m *mockService) ListAll(ctx context.Context) ([]models.App, error) {
	var list []models.App
	for _, a := range m.apps {
		list = append(list, a)
	}
	return list, nil
}

func (m *mockService) Search(ctx context.Context, query string) ([]models.App, error) {
	var list []models.App
	for _, a := range m.apps {
		if strings.Contains(strings.ToLower(a.Name), strings.ToLower(query)) {
			list = append(list, a)
		}
	}
	return list, nil
}

func (m *mockService) GetByID(ctx context.Context, id int64) (*models.App, error) {
	app, ok := m.apps[id]
	if !ok {
		return nil, apperrors.NotFound("app", id)
	}
	return &app, nil
}

func (m *mockService) Create(ctx context.Context, app *models.App) error {
	if strings.TrimSpace(app.Name) == "" {
		return apperrors.ValidationError("name", "is required")
	}
	if strings.TrimSpace(app.URL) == "" {
		return apperrors.ValidationError("url", "is required")
	}
	app.ID = m.nextID
	m.nextID++
	m.apps[app.ID] = *app
	return nil
}

func (m *mockService) Update(ctx context.Context, id int64, app *models.App) error {
	if _, ok := m.apps[id]; !ok {
		return apperrors.NotFound("app", id)
	}
	app.ID = id
	m.apps[id] = *app
	return nil
}

func (m *mockService) Delete(ctx context.Context, id int64) error {
	if _, ok := m.apps[id]; !ok {
		return apperrors.NotFound("app", id)
	}
	delete(m.apps, id)
	return nil
}

func (m *mockService) Reorder(ctx context.Context, ids []int64) error {
	return nil
}

func (m *mockService) CheckStatus(ctx context.Context, id int64) (bool, error) {
	if _, ok := m.apps[id]; !ok {
		return false, apperrors.NotFound("app", id)
	}
	return true, nil
}

func (m *mockService) SubscribeStatusChanges() chan events.StatusChangeEvent {
	return nil
}

func (m *mockService) UnsubscribeStatusChanges(ch chan events.StatusChangeEvent) {}

func (m *mockService) StartHealthWorker(ctx context.Context) {}

func (m *mockService) StopHealthWorker() {}

func setupTestMux(svc *mockService) *http.ServeMux {
	handler := NewAppHandler(svc)
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/apps", handler.ListApps)
	mux.HandleFunc("GET /api/apps/{id}", handler.GetApp)
	mux.HandleFunc("POST /api/apps", handler.CreateApp)
	mux.HandleFunc("PUT /api/apps/{id}", handler.UpdateApp)
	mux.HandleFunc("DELETE /api/apps/{id}", handler.DeleteApp)
	mux.HandleFunc("POST /api/apps/reorder", handler.ReorderApps)
	return mux
}

func TestAppHandler_ListApps(t *testing.T) {
	svc := newMockService()
	_ = svc.Create(context.Background(), &models.App{Name: "App A", URL: "http://a.local"})
	mux := setupTestMux(svc)

	req := httptest.NewRequest(http.MethodGet, "/api/apps", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var apps []models.App
	if err := json.NewDecoder(w.Body).Decode(&apps); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if len(apps) != 1 {
		t.Errorf("expected 1 app, got %d", len(apps))
	}
}

func TestAppHandler_CreateApp_Validation(t *testing.T) {
	svc := newMockService()
	mux := setupTestMux(svc)

	// Missing name
	body := bytes.NewBufferString(`{"name":"","url":"http://test.local"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/apps", body)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400 for empty name, got %d", w.Code)
	}

	// Valid creation
	body = bytes.NewBufferString(`{"name":"Valid App","url":"http://test.local"}`)
	req = httptest.NewRequest(http.MethodPost, "/api/apps", body)
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("expected status 201 for valid creation, got %d", w.Code)
	}
}

func TestAppHandler_GetApp_NotFound(t *testing.T) {
	svc := newMockService()
	mux := setupTestMux(svc)

	req := httptest.NewRequest(http.MethodGet, "/api/apps/999", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", w.Code)
	}
}

func TestAppHandler_DeleteApp(t *testing.T) {
	svc := newMockService()
	_ = svc.Create(context.Background(), &models.App{Name: "To Delete", URL: "http://del.local"})
	mux := setupTestMux(svc)

	req := httptest.NewRequest(http.MethodDelete, "/api/apps/1", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected status 204, got %d", w.Code)
	}
}

func TestStatusHandler_HealthCheck(t *testing.T) {
	svc := newMockService()
	statusHandler := NewStatusHandler(svc)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	statusHandler.HealthCheck(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var resp map[string]string
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp["status"] != "ok" {
		t.Errorf("expected status ok, got %q", resp["status"])
	}
}

func TestAppHandler_UpdateApp_Success(t *testing.T) {
	svc := newMockService()
	_ = svc.Create(context.Background(), &models.App{Name: "Original", URL: "http://original.local"})
	mux := setupTestMux(svc)

	body := bytes.NewBufferString(`{"name":"Updated","url":"http://updated.local"}`)
	req := httptest.NewRequest(http.MethodPut, "/api/apps/1", body)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var app models.App
	if err := json.NewDecoder(w.Body).Decode(&app); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if app.Name != "Updated" {
		t.Errorf("expected name 'Updated', got %q", app.Name)
	}
}

func TestAppHandler_UpdateApp_NotFound(t *testing.T) {
	svc := newMockService()
	mux := setupTestMux(svc)

	body := bytes.NewBufferString(`{"name":"Not Found","url":"http://notfound.local"}`)
	req := httptest.NewRequest(http.MethodPut, "/api/apps/999", body)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", w.Code)
	}
}

func TestAppHandler_UpdateApp_InvalidID(t *testing.T) {
	svc := newMockService()
	mux := setupTestMux(svc)

	body := bytes.NewBufferString(`{"name":"Invalid","url":"http://invalid.local"}`)
	req := httptest.NewRequest(http.MethodPut, "/api/apps/abc", body)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}

func TestAppHandler_ReorderApps_Success(t *testing.T) {
	svc := newMockService()
	_ = svc.Create(context.Background(), &models.App{Name: "App 1", URL: "http://app1.local"})
	_ = svc.Create(context.Background(), &models.App{Name: "App 2", URL: "http://app2.local"})
	mux := setupTestMux(svc)

	body := bytes.NewBufferString(`{"ids":[2,1]}`)
	req := httptest.NewRequest(http.MethodPost, "/api/apps/reorder", body)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var resp map[string]string
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp["status"] != "ok" {
		t.Errorf("expected status ok, got %q", resp["status"])
	}
}

func TestAppHandler_ReorderApps_InvalidJSON(t *testing.T) {
	svc := newMockService()
	mux := setupTestMux(svc)

	body := bytes.NewBufferString(`invalid json`)
	req := httptest.NewRequest(http.MethodPost, "/api/apps/reorder", body)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}

func TestAppHandler_SearchAppsHandler(t *testing.T) {
	svc := newMockService()
	_ = svc.Create(context.Background(), &models.App{Name: "MyApp", URL: "http://myapp.local"})
	_ = svc.Create(context.Background(), &models.App{Name: "OtherApp", URL: "http://other.local"})
	handler := NewAppHandler(svc)

	req := httptest.NewRequest(http.MethodGet, "/api/apps/search?q=myapp", nil)
	w := httptest.NewRecorder()

	handler.SearchAppsHandler(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	body := w.Body.String()
	if !strings.Contains(body, "MyApp") {
		t.Errorf("expected response to contain 'MyApp', got: %s", body)
	}
}

func TestAppHandler_SearchAppsHandler_EmptyQuery(t *testing.T) {
	svc := newMockService()
	_ = svc.Create(context.Background(), &models.App{Name: "App 1", URL: "http://app1.local"})
	handler := NewAppHandler(svc)

	req := httptest.NewRequest(http.MethodGet, "/api/apps/search", nil)
	w := httptest.NewRecorder()

	handler.SearchAppsHandler(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
}

func TestAppHandler_GetApp_Success(t *testing.T) {
	svc := newMockService()
	_ = svc.Create(context.Background(), &models.App{Name: "Fetch App", URL: "http://fetch.local"})
	mux := setupTestMux(svc)

	req := httptest.NewRequest(http.MethodGet, "/api/apps/1", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var app models.App
	if err := json.NewDecoder(w.Body).Decode(&app); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if app.Name != "Fetch App" {
		t.Errorf("expected name 'Fetch App', got %q", app.Name)
	}
}

func TestAppHandler_GetApp_InvalidID(t *testing.T) {
	svc := newMockService()
	mux := setupTestMux(svc)

	req := httptest.NewRequest(http.MethodGet, "/api/apps/abc", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}

func TestAppHandler_DeleteApp_NotFound(t *testing.T) {
	svc := newMockService()
	mux := setupTestMux(svc)

	req := httptest.NewRequest(http.MethodDelete, "/api/apps/999", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", w.Code)
	}
}

func TestAppHandler_DeleteApp_InvalidID(t *testing.T) {
	svc := newMockService()
	mux := setupTestMux(svc)

	req := httptest.NewRequest(http.MethodDelete, "/api/apps/abc", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}
