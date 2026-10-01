package service

import (
	"context"
	"sync"
	"testing"
	"time"

	apperrors "portalon/internal/errors"
	"portalon/internal/events"
	"portalon/internal/models"
)

type mockAppRepoForWorker struct {
	apps map[int64]models.App
}

func newMockAppRepoForWorker() *mockAppRepoForWorker {
	return &mockAppRepoForWorker{
		apps: make(map[int64]models.App),
	}
}

func (m *mockAppRepoForWorker) GetAll(ctx context.Context) ([]models.App, error) {
	var list []models.App
	for _, a := range m.apps {
		list = append(list, a)
	}
	return list, nil
}

func (m *mockAppRepoForWorker) Search(ctx context.Context, query string) ([]models.App, error) {
	var list []models.App
	for _, a := range m.apps {
		if query == "" || contains(a.Name, query) {
			list = append(list, a)
		}
	}
	return list, nil
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 || findSubstring(s, substr))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func (m *mockAppRepoForWorker) GetByID(ctx context.Context, id int64) (*models.App, error) {
	app, ok := m.apps[id]
	if !ok {
		return nil, apperrors.NotFound("app", id)
	}
	return &app, nil
}

func (m *mockAppRepoForWorker) Create(ctx context.Context, app *models.App) error {
	app.ID = int64(len(m.apps)) + 1
	m.apps[app.ID] = *app
	return nil
}

func (m *mockAppRepoForWorker) Update(ctx context.Context, app *models.App) error {
	if _, ok := m.apps[app.ID]; !ok {
		return apperrors.NotFound("app", app.ID)
	}
	m.apps[app.ID] = *app
	return nil
}

func (m *mockAppRepoForWorker) Delete(ctx context.Context, id int64) error {
	if _, ok := m.apps[id]; !ok {
		return apperrors.NotFound("app", id)
	}
	delete(m.apps, id)
	return nil
}

func (m *mockAppRepoForWorker) Reorder(ctx context.Context, ids []int64) error {
	return nil
}

func (m *mockAppRepoForWorker) UpdateStatus(ctx context.Context, appID int64, isOnline bool) error {
	app, ok := m.apps[appID]
	if !ok {
		return apperrors.NotFound("app", appID)
	}
	app.IsOnline = isOnline
	m.apps[appID] = app
	return nil
}

type mockBroadcasterForWorker struct {
	mu          sync.RWMutex
	subscribers map[chan events.StatusChangeEvent]struct{}
	published   []events.StatusChangeEvent
}

func newMockBroadcasterForWorker() *mockBroadcasterForWorker {
	return &mockBroadcasterForWorker{
		subscribers: make(map[chan events.StatusChangeEvent]struct{}),
		published:   make([]events.StatusChangeEvent, 0),
	}
}

func (m *mockBroadcasterForWorker) Subscribe() chan events.StatusChangeEvent {
	ch := make(chan events.StatusChangeEvent, 10)
	m.mu.Lock()
	m.subscribers[ch] = struct{}{}
	m.mu.Unlock()
	return ch
}

func (m *mockBroadcasterForWorker) Unsubscribe(ch chan events.StatusChangeEvent) {
	m.mu.Lock()
	delete(m.subscribers, ch)
	m.mu.Unlock()
	close(ch)
}

func (m *mockBroadcasterForWorker) Publish(event events.StatusChangeEvent) {
	m.mu.Lock()
	m.published = append(m.published, event)
	m.mu.Unlock()
	for ch := range m.subscribers {
		select {
		case ch <- event:
		default:
		}
	}
}

func (m *mockBroadcasterForWorker) SubscriberCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.subscribers)
}

func (m *mockBroadcasterForWorker) UnsubscribeStatusChanges(ch chan events.StatusChangeEvent) {
	m.Unsubscribe(ch)
}

func TestHealthWorker_StartStop(t *testing.T) {
	repo := newMockAppRepoForWorker()
	broadcaster := newMockBroadcasterForWorker()
	svc := NewAppService(repo, broadcaster).(*appService)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	svc.StartHealthWorker(ctx)
	time.Sleep(50 * time.Millisecond)
	svc.StopHealthWorker()

	if svc.worker != nil {
		t.Error("expected worker to be nil after StopHealthWorker")
	}
}

func TestHealthWorker_RunsCheck(t *testing.T) {
	repo := newMockAppRepoForWorker()
	broadcaster := newMockBroadcasterForWorker()
	svc := NewAppService(repo, broadcaster).(*appService)

	_ = svc.Create(context.Background(), &models.App{Name: "App 1", URL: "http://example.com"})
	_ = svc.Create(context.Background(), &models.App{Name: "App 2", URL: "http://example.org"})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	svc.StartHealthWorker(ctx)
	time.Sleep(200 * time.Millisecond)
	svc.StopHealthWorker()

	apps, _ := svc.ListAll(context.Background())
	if len(apps) != 2 {
		t.Errorf("expected 2 apps, got %d", len(apps))
	}
}

func TestHealthWorker_RespectsConcurrency(t *testing.T) {
	repo := newMockAppRepoForWorker()
	broadcaster := newMockBroadcasterForWorker()
	svc := NewAppService(repo, broadcaster).(*appService)

	for i := 0; i < 10; i++ {
		_ = svc.Create(context.Background(), &models.App{Name: "App " + string(rune('A'+i)), URL: "http://example.com"})
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	svc.StartHealthWorker(ctx)
	time.Sleep(500 * time.Millisecond)
	svc.StopHealthWorker()

	apps, _ := svc.ListAll(context.Background())
	if len(apps) != 10 {
		t.Errorf("expected 10 apps, got %d", len(apps))
	}
}

func TestHealthWorker_NewHealthWorker_DefaultConcurrency(t *testing.T) {
	repo := newMockAppRepoForWorker()
	broadcaster := newMockBroadcasterForWorker()
	svc := NewAppService(repo, broadcaster).(*appService)

	worker := NewHealthWorker(svc, 30*time.Second, 0)
	if worker.maxConcurrent != 5 {
		t.Errorf("expected default maxConcurrent 5, got %d", worker.maxConcurrent)
	}
}

func TestHealthWorker_NewHealthWorker_CustomConcurrency(t *testing.T) {
	repo := newMockAppRepoForWorker()
	broadcaster := newMockBroadcasterForWorker()
	svc := NewAppService(repo, broadcaster).(*appService)

	worker := NewHealthWorker(svc, 30*time.Second, 10)
	if worker.maxConcurrent != 10 {
		t.Errorf("expected maxConcurrent 10, got %d", worker.maxConcurrent)
	}
}

func TestHealthWorker_RunCheck_EmptyApps(t *testing.T) {
	repo := newMockAppRepoForWorker()
	broadcaster := newMockBroadcasterForWorker()
	svc := NewAppService(repo, broadcaster).(*appService)

	ctx := context.Background()
	worker := NewHealthWorker(svc, 30*time.Second, 5)

	// runCheck should handle empty apps list without error
	worker.runCheck(ctx)

	apps, _ := svc.ListAll(ctx)
	if len(apps) != 0 {
		t.Errorf("expected 0 apps, got %d", len(apps))
	}
}

func TestHealthWorker_RunCheck_CallsCheckAndUpdate(t *testing.T) {
	repo := newMockAppRepoForWorker()
	broadcaster := newMockBroadcasterForWorker()
	svc := NewAppService(repo, broadcaster).(*appService)

	_ = svc.Create(context.Background(), &models.App{Name: "App 1", URL: "http://example.com"})
	_ = svc.Create(context.Background(), &models.App{Name: "App 2", URL: "http://example.org"})

	ctx := context.Background()
	worker := NewHealthWorker(svc, 30*time.Second, 5)

	// Run check - should call checkAndUpdateStatus for each app
	worker.runCheck(ctx)

	apps, _ := svc.ListAll(ctx)
	if len(apps) != 2 {
		t.Errorf("expected 2 apps, got %d", len(apps))
	}
}

func TestHealthWorker_RunCheck_RespectsContextCancellation(t *testing.T) {
	repo := newMockAppRepoForWorker()
	broadcaster := newMockBroadcasterForWorker()
	svc := NewAppService(repo, broadcaster).(*appService)

	for i := 0; i < 5; i++ {
		_ = svc.Create(context.Background(), &models.App{Name: "App", URL: "http://example.com"})
	}

	ctx, cancel := context.WithCancel(context.Background())
	worker := NewHealthWorker(svc, 30*time.Second, 5)

	// Cancel immediately
	cancel()

	// Should return quickly without blocking
	worker.runCheck(ctx)

	apps, _ := svc.ListAll(ctx)
	if len(apps) != 5 {
		t.Errorf("expected 5 apps, got %d", len(apps))
	}
}

func TestHealthWorker_RunCheck_RespectsStopSignal(t *testing.T) {
	repo := newMockAppRepoForWorker()
	broadcaster := newMockBroadcasterForWorker()
	svc := NewAppService(repo, broadcaster).(*appService)

	for i := 0; i < 5; i++ {
		_ = svc.Create(context.Background(), &models.App{Name: "App", URL: "http://example.com"})
	}

	ctx := context.Background()
	worker := NewHealthWorker(svc, 30*time.Second, 5)
	worker.Stop() // This sets stopCh

	// Should return quickly
	worker.runCheck(ctx)

	apps, _ := svc.ListAll(ctx)
	if len(apps) != 5 {
		t.Errorf("expected 5 apps, got %d", len(apps))
	}
}

func TestHealthWorker_StartStop_Idempotent(t *testing.T) {
	repo := newMockAppRepoForWorker()
	broadcaster := newMockBroadcasterForWorker()
	svc := NewAppService(repo, broadcaster).(*appService)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	svc.StartHealthWorker(ctx)
	firstWorker := svc.worker

	// Starting again should not create new worker
	svc.StartHealthWorker(ctx)
	if svc.worker != firstWorker {
		t.Error("expected same worker instance on second StartHealthWorker call")
	}

	svc.StopHealthWorker()
	if svc.worker != nil {
		t.Error("expected worker to be nil after StopHealthWorker")
	}

	// Stopping again should not panic
	svc.StopHealthWorker()
}

func TestAppService_StartHealthWorker_NilBroadcaster(t *testing.T) {
	repo := newMockAppRepoForWorker()
	svc := NewAppService(repo, nil).(*appService)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Should not panic with nil broadcaster
	svc.StartHealthWorker(ctx)
	time.Sleep(50 * time.Millisecond)
	svc.StopHealthWorker()
}