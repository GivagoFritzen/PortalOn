package service

import (
	"context"
	"io"
	"net/http"
	"time"

	"portalon/internal/events"
	"portalon/internal/models"
	"portalon/internal/repository"
)

const defaultAppIcon = "box"

type AppService interface {
	ListAll(ctx context.Context) ([]models.App, error)
	Search(ctx context.Context, query string) ([]models.App, error)
	GetByID(ctx context.Context, id int64) (*models.App, error)
	Create(ctx context.Context, app *models.App) error
	Update(ctx context.Context, id int64, app *models.App) error
	Delete(ctx context.Context, id int64) error
	Reorder(ctx context.Context, ids []int64) error
	CheckStatus(ctx context.Context, id int64) (bool, error)
	SubscribeStatusChanges() chan events.StatusChangeEvent
	UnsubscribeStatusChanges(ch chan events.StatusChangeEvent)
	StartHealthWorker(ctx context.Context)
	StopHealthWorker()
}

type appService struct {
	repo        repository.AppRepository
	httpClient  *http.Client
	broadcaster events.StatusBroadcaster
	worker      *HealthWorker
}

func NewAppService(repo repository.AppRepository, broadcaster events.StatusBroadcaster) AppService {
	return &appService{
		repo:        repo,
		httpClient:  &http.Client{Timeout: 5 * time.Second},
		broadcaster: broadcaster,
	}
}

func (s *appService) ListAll(ctx context.Context) ([]models.App, error) {
	apps, err := s.repo.GetAll(ctx)
	if err != nil {
		return nil, err
	}
	setDefaultIconsForAll(apps)
	return apps, nil
}

func (s *appService) Search(ctx context.Context, query string) ([]models.App, error) {
	if query == "" {
		return s.ListAll(ctx)
	}
	apps, err := s.repo.Search(ctx, query)
	if err != nil {
		return nil, err
	}
	setDefaultIconsForAll(apps)
	return apps, nil
}

func (s *appService) GetByID(ctx context.Context, id int64) (*models.App, error) {
	app, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	setDefaultIconIfEmpty(app)
	return app, nil
}

func (s *appService) Create(ctx context.Context, app *models.App) error {
	if err := validateApp(app); err != nil {
		return err
	}
	setDefaultIconIfEmpty(app)
	if err := s.repo.Create(ctx, app); err != nil {
		return err
	}
	_ = s.checkAndUpdateStatus(ctx, app.ID)
	return nil
}

func (s *appService) Update(ctx context.Context, id int64, app *models.App) error {
	if err := validateApp(app); err != nil {
		return err
	}

	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	urlChanged := existing.URL != app.URL
	app.ID = id
	setDefaultIconIfEmpty(app)
	if err := s.repo.Update(ctx, app); err != nil {
		return err
	}

	if urlChanged {
		_ = s.checkAndUpdateStatus(ctx, id)
	}
	return nil
}

func (s *appService) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}

func (s *appService) Reorder(ctx context.Context, ids []int64) error {
	return s.repo.Reorder(ctx, ids)
}

func (s *appService) CheckStatus(ctx context.Context, id int64) (bool, error) {
	app, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return false, err
	}

	isOnline := s.isAppReachable(ctx, app.URL)
	previousStatus := app.IsOnline

	err = s.repo.UpdateStatus(ctx, id, isOnline)
	if err != nil {
		return false, err
	}

	if s.broadcaster != nil && isOnline != previousStatus {
		event := events.StatusChangeEvent{
			AppID:     id,
			IsOnline:  isOnline,
			Timestamp: time.Now(),
		}
		go s.broadcaster.Publish(event)
	}

	return isOnline, nil
}

func (s *appService) SubscribeStatusChanges() chan events.StatusChangeEvent {
	if s.broadcaster == nil {
		return nil
	}
	return s.broadcaster.Subscribe()
}

func (s *appService) UnsubscribeStatusChanges(ch chan events.StatusChangeEvent) {
	if s.broadcaster != nil {
		s.broadcaster.Unsubscribe(ch)
	}
}

func (s *appService) checkAndUpdateStatus(ctx context.Context, appID int64) error {
	app, err := s.repo.GetByID(ctx, appID)
	if err != nil {
		return err
	}

	isOnline := s.isAppReachable(ctx, app.URL)
	previousStatus := app.IsOnline

	err = s.repo.UpdateStatus(ctx, appID, isOnline)
	if err != nil {
		return err
	}

	if s.broadcaster != nil && isOnline != previousStatus {
		event := events.StatusChangeEvent{
			AppID:     appID,
			IsOnline:  isOnline,
			Timestamp: time.Now(),
		}
		go s.broadcaster.Publish(event)
	}

	return nil
}

func (s *appService) StartHealthWorker(ctx context.Context) {
	if s.worker == nil {
		s.worker = NewHealthWorker(s, 30*time.Second, 5)
		s.worker.Start(ctx)
	}
}

func (s *appService) StopHealthWorker() {
	if s.worker != nil {
		s.worker.Stop()
		s.worker = nil
	}
}

func (s *appService) isAppReachable(ctx context.Context, targetURL string) bool {
	if !isValidWebURL(targetURL) {
		return false
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		return false
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 1024))
	return resp.StatusCode < http.StatusInternalServerError
}

