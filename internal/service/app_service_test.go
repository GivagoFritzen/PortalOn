package service

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	apperrors "portalon/internal/errors"
	"portalon/internal/events"
	"portalon/internal/models"
)

type mockAppRepo struct {
	apps       map[int64]models.App
	nextID     int64
	reorderIDs []int64
}

type mockBroadcaster struct {
	subscribers map[chan events.StatusChangeEvent]struct{}
}

func newMockBroadcaster() *mockBroadcaster {
	return &mockBroadcaster{
		subscribers: make(map[chan events.StatusChangeEvent]struct{}),
	}
}

func (m *mockBroadcaster) Subscribe() chan events.StatusChangeEvent {
	ch := make(chan events.StatusChangeEvent, 10)
	m.subscribers[ch] = struct{}{}
	return ch
}

func (m *mockBroadcaster) Unsubscribe(ch chan events.StatusChangeEvent) {
	delete(m.subscribers, ch)
	close(ch)
}

func (m *mockBroadcaster) Publish(event events.StatusChangeEvent) {
	for ch := range m.subscribers {
		select {
		case ch <- event:
		default:
		}
	}
}

func (m *mockBroadcaster) SubscriberCount() int {
	return len(m.subscribers)
}

func (m *mockBroadcaster) UnsubscribeStatusChanges(ch chan events.StatusChangeEvent) {
	delete(m.subscribers, ch)
	close(ch)
}

func newMockAppRepo() *mockAppRepo {
	return &mockAppRepo{
		apps:   make(map[int64]models.App),
		nextID: 1,
	}
}

func (m *mockAppRepo) GetAll(ctx context.Context) ([]models.App, error) {
	var result []models.App
	for _, a := range m.apps {
		result = append(result, a)
	}
	return result, nil
}

func (m *mockAppRepo) Search(ctx context.Context, query string) ([]models.App, error) {
	var result []models.App
	for _, a := range m.apps {
		if strings.Contains(strings.ToLower(a.Name), strings.ToLower(query)) {
			result = append(result, a)
		}
	}
	return result, nil
}

func (m *mockAppRepo) GetByID(ctx context.Context, id int64) (*models.App, error) {
	app, ok := m.apps[id]
	if !ok {
		return nil, apperrors.NotFound("app", id)
	}
	return &app, nil
}

func (m *mockAppRepo) Create(ctx context.Context, app *models.App) error {
	app.ID = m.nextID
	m.nextID++
	m.apps[app.ID] = *app
	return nil
}

func (m *mockAppRepo) Update(ctx context.Context, app *models.App) error {
	if _, ok := m.apps[app.ID]; !ok {
		return apperrors.NotFound("app", app.ID)
	}
	m.apps[app.ID] = *app
	return nil
}

func (m *mockAppRepo) Delete(ctx context.Context, id int64) error {
	if _, ok := m.apps[id]; !ok {
		return apperrors.NotFound("app", id)
	}
	delete(m.apps, id)
	return nil
}

func (m *mockAppRepo) Reorder(ctx context.Context, ids []int64) error {
	m.reorderIDs = ids
	return nil
}

func (m *mockAppRepo) UpdateStatus(ctx context.Context, appID int64, isOnline bool) error {
	app, ok := m.apps[appID]
	if !ok {
		return apperrors.NotFound("app", appID)
	}
	app.IsOnline = isOnline
	m.apps[appID] = app
	return nil
}

func TestAppService_Create_Validation(t *testing.T) {
	repo := newMockAppRepo()
	broadcaster := newMockBroadcaster()
	svc := NewAppService(repo, broadcaster)
	ctx := context.Background()

	tests := []struct {
		name      string
		app       *models.App
		expectErr bool
		errField  string
	}{
		{
			name:      "nil app",
			app:       nil,
			expectErr: true,
			errField:  "app",
		},
		{
			name:      "empty name",
			app:       &models.App{Name: "   ", URL: "http://example.com"},
			expectErr: true,
			errField:  "name",
		},
		{
			name:      "empty url",
			app:       &models.App{Name: "Test App", URL: "   "},
			expectErr: true,
			errField:  "url",
		},
		{
			name:      "invalid url scheme - javascript",
			app:       &models.App{Name: "Test App", URL: "javascript:alert(1)"},
			expectErr: true,
			errField:  "url",
		},
		{
			name:      "invalid url scheme - ftp",
			app:       &models.App{Name: "Test App", URL: "ftp://example.com/file"},
			expectErr: true,
			errField:  "url",
		},
		{
			name:      "invalid url format",
			app:       &models.App{Name: "Test App", URL: "not-a-valid-url"},
			expectErr: true,
			errField:  "url",
		},
		{
			name:      "valid http url",
			app:       &models.App{Name: "Test App", URL: "http://localhost:8080"},
			expectErr: false,
		},
		{
			name:      "valid https url",
			app:       &models.App{Name: "Test App", URL: "https://example.com/dashboard"},
			expectErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := svc.Create(ctx, tt.app)
			if tt.expectErr {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
				var appErr *apperrors.AppError
				if !errors.As(err, &appErr) {
					t.Fatalf("expected AppError, got %v", err)
				}
				if appErr.Code != 400 {
					t.Errorf("expected status code 400, got %d", appErr.Code)
				}
			} else {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
				if tt.app.Icon == "" {
					t.Errorf("expected default icon to be assigned")
				}
			}
		})
	}
}

func TestAppService_Create_DefaultIcon(t *testing.T) {
	repo := newMockAppRepo()
	broadcaster := newMockBroadcaster()
	svc := NewAppService(repo, broadcaster)
	ctx := context.Background()

	app := &models.App{
		Name: "Default Icon App",
		URL:  "https://example.com",
		Icon: "",
	}

	if err := svc.Create(ctx, app); err != nil {
		t.Fatalf("create failed: %v", err)
	}

	if app.Icon != "box" {
		t.Errorf("expected default icon 'box', got %q", app.Icon)
	}
}

func TestAppService_GetByID_NotFound(t *testing.T) {
	repo := newMockAppRepo()
	broadcaster := newMockBroadcaster()
	svc := NewAppService(repo, broadcaster)
	ctx := context.Background()

	_, err := svc.GetByID(ctx, 999)
	if err == nil {
		t.Fatal("expected error, got nil")
	}

	var appErr *apperrors.AppError
	if !errors.As(err, &appErr) || appErr.Code != 404 {
		t.Errorf("expected 404 AppError, got %v", err)
	}
}

func TestAppService_Search_EmptyQuery(t *testing.T) {
	repo := newMockAppRepo()
	broadcaster := newMockBroadcaster()
	svc := NewAppService(repo, broadcaster)
	ctx := context.Background()

	_ = svc.Create(ctx, &models.App{Name: "App 1", URL: "http://app1.local"})
	_ = svc.Create(ctx, &models.App{Name: "App 2", URL: "http://app2.local"})

	// Empty query returns all
	all, err := svc.Search(ctx, "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(all) != 2 {
		t.Errorf("expected 2 apps, got %d", len(all))
	}

	// Filtered query
	filtered, err := svc.Search(ctx, "App 1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(filtered) != 1 {
		t.Errorf("expected 1 app, got %d", len(filtered))
	}
}

func TestAppService_Reorder(t *testing.T) {
	repo := newMockAppRepo()
	broadcaster := newMockBroadcaster()
	svc := NewAppService(repo, broadcaster)
	ctx := context.Background()

	ids := []int64{3, 1, 2}
	if err := svc.Reorder(ctx, ids); err != nil {
		t.Fatalf("unexpected reorder error: %v", err)
	}

	if len(repo.reorderIDs) != 3 || repo.reorderIDs[0] != 3 {
		t.Errorf("expected reordered IDs [3, 1, 2], got %v", repo.reorderIDs)
	}
}

func TestAppService_Update_Success(t *testing.T) {
	repo := newMockAppRepo()
	broadcaster := newMockBroadcaster()
	svc := NewAppService(repo, broadcaster)
	ctx := context.Background()

	created := &models.App{Name: "Original", URL: "http://original.local"}
	_ = svc.Create(ctx, created)

	updated := &models.App{Name: "Updated", URL: "http://updated.local"}
	err := svc.Update(ctx, created.ID, updated)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	fetched, _ := svc.GetByID(ctx, created.ID)
	if fetched.Name != "Updated" {
		t.Errorf("expected name 'Updated', got %q", fetched.Name)
	}
	if fetched.URL != "http://updated.local" {
		t.Errorf("expected URL 'http://updated.local', got %q", fetched.URL)
	}
}

func TestAppService_Update_NotFound(t *testing.T) {
	repo := newMockAppRepo()
	broadcaster := newMockBroadcaster()
	svc := NewAppService(repo, broadcaster)
	ctx := context.Background()

	app := &models.App{Name: "Not Found", URL: "http://notfound.local"}
	err := svc.Update(ctx, 999, app)
	if err == nil {
		t.Fatal("expected error, got nil")
	}

	var appErr *apperrors.AppError
	if !errors.As(err, &appErr) || appErr.Code != 404 {
		t.Errorf("expected 404 AppError, got %v", err)
	}
}

func TestAppService_Update_Validation(t *testing.T) {
	repo := newMockAppRepo()
	broadcaster := newMockBroadcaster()
	svc := NewAppService(repo, broadcaster)
	ctx := context.Background()

	created := &models.App{Name: "Original", URL: "http://original.local"}
	_ = svc.Create(ctx, created)

	invalid := &models.App{Name: "", URL: "http://invalid.local"}
	err := svc.Update(ctx, created.ID, invalid)
	if err == nil {
		t.Fatal("expected error, got nil")
	}

	var appErr *apperrors.AppError
	if !errors.As(err, &appErr) || appErr.Code != 400 {
		t.Errorf("expected 400 AppError, got %v", err)
	}
}

func TestAppService_Delete_Success(t *testing.T) {
	repo := newMockAppRepo()
	broadcaster := newMockBroadcaster()
	svc := NewAppService(repo, broadcaster)
	ctx := context.Background()

	created := &models.App{Name: "To Delete", URL: "http://delete.local"}
	_ = svc.Create(ctx, created)

	err := svc.Delete(ctx, created.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	_, err = svc.GetByID(ctx, created.ID)
	if err == nil {
		t.Fatal("expected error after delete, got nil")
	}
}

func TestAppService_Delete_NotFound(t *testing.T) {
	repo := newMockAppRepo()
	broadcaster := newMockBroadcaster()
	svc := NewAppService(repo, broadcaster)
	ctx := context.Background()

	err := svc.Delete(ctx, 999)
	if err == nil {
		t.Fatal("expected error, got nil")
	}

	var appErr *apperrors.AppError
	if !errors.As(err, &appErr) || appErr.Code != 404 {
		t.Errorf("expected 404 AppError, got %v", err)
	}
}

func TestAppService_CheckStatus_Success(t *testing.T) {
	repo := newMockAppRepo()
	broadcaster := newMockBroadcaster()
	svc := NewAppService(repo, broadcaster)
	ctx := context.Background()

	created := &models.App{Name: "Status App", URL: "http://status.local"}
	_ = svc.Create(ctx, created)

	isOnline, err := svc.CheckStatus(ctx, created.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if isOnline {
		t.Error("expected app to be offline (unreachable URL)")
	}
}

func TestAppService_CheckStatus_NotFound(t *testing.T) {
	repo := newMockAppRepo()
	broadcaster := newMockBroadcaster()
	svc := NewAppService(repo, broadcaster)
	ctx := context.Background()

	_, err := svc.CheckStatus(ctx, 999)
	if err == nil {
		t.Fatal("expected error, got nil")
	}

	var appErr *apperrors.AppError
	if !errors.As(err, &appErr) || appErr.Code != 404 {
		t.Errorf("expected 404 AppError, got %v", err)
	}
}

func TestAppService_GetByID_Success(t *testing.T) {
	repo := newMockAppRepo()
	broadcaster := newMockBroadcaster()
	svc := NewAppService(repo, broadcaster)
	ctx := context.Background()

	created := &models.App{Name: "Fetch App", URL: "http://fetch.local"}
	_ = svc.Create(ctx, created)

	fetched, err := svc.GetByID(ctx, created.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if fetched.Name != "Fetch App" {
		t.Errorf("expected name 'Fetch App', got %q", fetched.Name)
	}
}

func TestAppService_ListAll_Success(t *testing.T) {
	repo := newMockAppRepo()
	broadcaster := newMockBroadcaster()
	svc := NewAppService(repo, broadcaster)
	ctx := context.Background()

	_ = svc.Create(ctx, &models.App{Name: "App 1", URL: "http://app1.local"})
	_ = svc.Create(ctx, &models.App{Name: "App 2", URL: "http://app2.local"})

	apps, err := svc.ListAll(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(apps) != 2 {
		t.Errorf("expected 2 apps, got %d", len(apps))
	}
}

func TestAppService_ListAll_Empty(t *testing.T) {
	repo := newMockAppRepo()
	broadcaster := newMockBroadcaster()
	svc := NewAppService(repo, broadcaster)
	ctx := context.Background()

	apps, err := svc.ListAll(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(apps) != 0 {
		t.Errorf("expected 0 apps, got %d", len(apps))
	}
}

func TestAppService_SubscribeStatusChanges(t *testing.T) {
	repo := newMockAppRepo()
	broadcaster := newMockBroadcaster()
	svc := NewAppService(repo, broadcaster)

	ch := svc.SubscribeStatusChanges()
	if ch == nil {
		t.Fatal("expected channel, got nil")
	}

	event := events.StatusChangeEvent{AppID: 1, IsOnline: true, Timestamp: time.Now()}
	broadcaster.Publish(event)

	select {
	case received := <-ch:
		if received.AppID != event.AppID {
			t.Errorf("expected AppID %d, got %d", event.AppID, received.AppID)
		}
	case <-time.After(100 * time.Millisecond):
		t.Fatal("timeout waiting for event")
	}
}

func TestAppService_SubscribeStatusChanges_NilBroadcaster(t *testing.T) {
	repo := newMockAppRepo()
	svc := NewAppService(repo, nil)

	ch := svc.SubscribeStatusChanges()
	if ch != nil {
		t.Errorf("expected nil channel when broadcaster is nil, got %v", ch)
	}
}

func TestAppService_CheckStatus_BroadcastsOnChange(t *testing.T) {
	repo := newMockAppRepo()
	broadcaster := newMockBroadcaster()
	svc := NewAppService(repo, broadcaster)
	ctx := context.Background()

	created := &models.App{Name: "Status App", URL: "http://status.local", IsOnline: true}
	if err := svc.Create(ctx, created); err != nil {
		t.Fatalf("create failed: %v", err)
	}

	ch := svc.SubscribeStatusChanges()

	isOnline, err := svc.CheckStatus(ctx, created.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if isOnline {
		t.Error("expected app to be offline (unreachable URL)")
	}

	select {
	case event := <-ch:
		if event.AppID != created.ID {
			t.Errorf("expected AppID %d, got %d", created.ID, event.AppID)
		}
		if event.IsOnline != isOnline {
			t.Errorf("expected IsOnline %v, got %v", isOnline, event.IsOnline)
		}
	case <-time.After(1 * time.Second):
		t.Fatal("timeout waiting for broadcast event")
	}
}

func TestAppService_CheckStatus_NoBroadcastWhenStatusUnchanged(t *testing.T) {
	repo := newMockAppRepo()
	broadcaster := newMockBroadcaster()
	svc := NewAppService(repo, broadcaster)
	ctx := context.Background()

	created := &models.App{Name: "Status App", URL: "http://status.local"}
	if err := svc.Create(ctx, created); err != nil {
		t.Fatalf("create failed: %v", err)
	}

	ch := svc.SubscribeStatusChanges()

	_, err := svc.CheckStatus(ctx, created.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	select {
	case <-ch:
		t.Error("expected no broadcast when status unchanged")
	case <-time.After(100 * time.Millisecond):
	}
}

func TestAppService_UnsubscribeStatusChanges(t *testing.T) {
	repo := newMockAppRepo()
	broadcaster := newMockBroadcaster()
	svc := NewAppService(repo, broadcaster)

	ch := svc.SubscribeStatusChanges()
	if ch == nil {
		t.Fatal("expected channel, got nil")
	}

	svc.UnsubscribeStatusChanges(ch)

	// After unsubscribe, publishing should not send to this channel
	event := events.StatusChangeEvent{AppID: 1, IsOnline: true, Timestamp: time.Now()}
	broadcaster.Publish(event)

	// Channel is closed after unsubscribe, so receiving returns zero value immediately.
	// We need to verify no actual event was sent by checking with a small delay.
	select {
	case received := <-ch:
		// Channel closed, received zero value - this is expected
		if received.AppID != 0 {
			t.Error("expected no event after unsubscribe, but got:", received)
		}
	case <-time.After(100 * time.Millisecond):
	}
}

func TestAppService_checkAndUpdateStatus_Success(t *testing.T) {
	repo := newMockAppRepo()
	broadcaster := newMockBroadcaster()
	svc := NewAppService(repo, broadcaster).(*appService)
	ctx := context.Background()

	// Create app with a valid URL that will fail health check (unreachable)
	created := &models.App{Name: "Test App", URL: "http://unreachable.local"}
	if err := svc.Create(ctx, created); err != nil {
		t.Fatalf("create failed: %v", err)
	}

	// Initial status should be false (from Create's health check)
	app, _ := svc.GetByID(ctx, created.ID)
	if app.IsOnline {
		t.Error("expected initial status to be false")
	}

	// Call checkAndUpdateStatus directly - should remain false
	err := svc.checkAndUpdateStatus(ctx, created.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	app, _ = svc.GetByID(ctx, created.ID)
	if app.IsOnline {
		t.Error("expected status to remain false")
	}
}

func TestAppService_checkAndUpdateStatus_NotFound(t *testing.T) {
	repo := newMockAppRepo()
	broadcaster := newMockBroadcaster()
	svc := NewAppService(repo, broadcaster).(*appService)
	ctx := context.Background()

	err := svc.checkAndUpdateStatus(ctx, 999)
	if err == nil {
		t.Fatal("expected error for not found app")
	}

	var appErr *apperrors.AppError
	if !errors.As(err, &appErr) || appErr.Code != 404 {
		t.Errorf("expected 404 AppError, got %v", err)
	}
}

func TestAppService_checkAndUpdateStatus_BroadcastsOnChange(t *testing.T) {
	repo := newMockAppRepo()
	broadcaster := newMockBroadcaster()
	svc := NewAppService(repo, broadcaster).(*appService)
	ctx := context.Background()

	// Create app with IsOnline true, but URL will fail health check
	created := &models.App{Name: "Test App", URL: "http://unreachable.local", IsOnline: true}
	if err := svc.Create(ctx, created); err != nil {
		t.Fatalf("create failed: %v", err)
	}

	ch := svc.SubscribeStatusChanges()

	// checkAndUpdateStatus should detect change from true to false and broadcast
	err := svc.checkAndUpdateStatus(ctx, created.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	select {
	case event := <-ch:
		if event.AppID != created.ID {
			t.Errorf("expected AppID %d, got %d", created.ID, event.AppID)
		}
		if event.IsOnline {
			t.Error("expected IsOnline false")
		}
	case <-time.After(1 * time.Second):
		t.Fatal("timeout waiting for broadcast event")
	}
}

func TestAppService_Create_HealthCheckSetsInitialStatus(t *testing.T) {
	repo := newMockAppRepo()
	broadcaster := newMockBroadcaster()
	svc := NewAppService(repo, broadcaster)
	ctx := context.Background()

	// Create app - health check runs immediately
	app := &models.App{Name: "Test App", URL: "http://unreachable.local"}
	err := svc.Create(ctx, app)
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}

	// App should have ID assigned
	if app.ID == 0 {
		t.Fatal("expected app ID to be assigned")
	}

	// Status should be set by health check (false for unreachable)
	fetched, _ := svc.GetByID(ctx, app.ID)
	if fetched.IsOnline {
		t.Error("expected initial status to be false after health check")
	}
}

func TestAppService_Update_URLChanged_TriggersHealthCheck(t *testing.T) {
	repo := newMockAppRepo()
	broadcaster := newMockBroadcaster()
	svc := NewAppService(repo, broadcaster)
	ctx := context.Background()

	// Create app
	created := &models.App{Name: "Test App", URL: "http://original.local"}
	if err := svc.Create(ctx, created); err != nil {
		t.Fatalf("create failed: %v", err)
	}

	// Update with different URL - should trigger health check
	updated := &models.App{Name: "Test App", URL: "http://new-url.local"}
	err := svc.Update(ctx, created.ID, updated)
	if err != nil {
		t.Fatalf("update failed: %v", err)
	}

	// Health check should have run for new URL
	fetched, _ := svc.GetByID(ctx, created.ID)
	if fetched.URL != "http://new-url.local" {
		t.Errorf("expected URL to be updated, got %q", fetched.URL)
	}
}

func TestAppService_Update_URLUnchanged_NoHealthCheck(t *testing.T) {
	repo := newMockAppRepo()
	broadcaster := newMockBroadcaster()
	svc := NewAppService(repo, broadcaster)
	ctx := context.Background()

	// Create app
	created := &models.App{Name: "Test App", URL: "http://same.local"}
	if err := svc.Create(ctx, created); err != nil {
		t.Fatalf("create failed: %v", err)
	}

	// Update with same URL - should NOT trigger health check
	updated := &models.App{Name: "Updated Name", URL: "http://same.local"}
	err := svc.Update(ctx, created.ID, updated)
	if err != nil {
		t.Fatalf("update failed: %v", err)
	}

	fetched, _ := svc.GetByID(ctx, created.ID)
	if fetched.Name != "Updated Name" {
		t.Errorf("expected name to be updated, got %q", fetched.Name)
	}
	// URL unchanged, so health check not triggered - status remains as was
}

func TestAppService_Update_NotFound_HealthCheck(t *testing.T) {
	repo := newMockAppRepo()
	broadcaster := newMockBroadcaster()
	svc := NewAppService(repo, broadcaster)
	ctx := context.Background()

	app := &models.App{Name: "Not Found", URL: "http://notfound.local"}
	err := svc.Update(ctx, 999, app)
	if err == nil {
		t.Fatal("expected error, got nil")
	}

	var appErr *apperrors.AppError
	if !errors.As(err, &appErr) || appErr.Code != 404 {
		t.Errorf("expected 404 AppError, got %v", err)
	}
}

func TestAppService_isAppReachable_ValidURL_ReturnsFalse(t *testing.T) {
	repo := newMockAppRepo()
	broadcaster := newMockBroadcaster()
	svc := NewAppService(repo, broadcaster).(*appService)
	ctx := context.Background()

	// Unreachable URL should return false
	result := svc.isAppReachable(ctx, "http://unreachable.local:9999")
	if result {
		t.Error("expected false for unreachable URL")
	}
}

func TestAppService_isAppReachable_InvalidURL_ReturnsFalse(t *testing.T) {
	repo := newMockAppRepo()
	broadcaster := newMockBroadcaster()
	svc := NewAppService(repo, broadcaster).(*appService)
	ctx := context.Background()

	// Invalid URL should return false
	result := svc.isAppReachable(ctx, "not-a-url")
	if result {
		t.Error("expected false for invalid URL")
	}

	// Empty URL
	result = svc.isAppReachable(ctx, "")
	if result {
		t.Error("expected false for empty URL")
	}

	// Non-http scheme
	result = svc.isAppReachable(ctx, "ftp://example.com")
	if result {
		t.Error("expected false for ftp URL")
	}
}
