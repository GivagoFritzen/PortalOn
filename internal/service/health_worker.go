package service

import (
	"context"
	"log"
	"sync"
	"time"
)

type HealthWorker struct {
	svc         *appService
	interval    time.Duration
	maxConcurrent int
	ticker      *time.Ticker
	stopCh      chan struct{}
	wg          sync.WaitGroup
	semaphore   chan struct{}
}

func NewHealthWorker(svc *appService, interval time.Duration, maxConcurrent int) *HealthWorker {
	if maxConcurrent <= 0 {
		maxConcurrent = 5
	}
	return &HealthWorker{
		svc:           svc,
		interval:      interval,
		maxConcurrent: maxConcurrent,
		stopCh:        make(chan struct{}),
		semaphore:     make(chan struct{}, maxConcurrent),
	}
}

func (w *HealthWorker) Start(ctx context.Context) {
	w.ticker = time.NewTicker(w.interval)
	w.wg.Add(1)
	go w.run(ctx)
	log.Printf("Health worker started with interval %v, max concurrent %d", w.interval, w.maxConcurrent)
}

func (w *HealthWorker) Stop() {
	if w.ticker != nil {
		w.ticker.Stop()
	}
	close(w.stopCh)
	w.wg.Wait()
	log.Println("Health worker stopped")
}

func (w *HealthWorker) run(ctx context.Context) {
	defer w.wg.Done()

	for {
		select {
		case <-w.ticker.C:
			w.runCheck(ctx)
		case <-w.stopCh:
			return
		case <-ctx.Done():
			return
		}
	}
}

func (w *HealthWorker) runCheck(ctx context.Context) {
	apps, err := w.svc.ListAll(ctx)
	if err != nil {
		log.Printf("Health worker: failed to list apps: %v", err)
		return
	}

	if len(apps) == 0 {
		return
	}

	var checkWg sync.WaitGroup
	for _, app := range apps {
		select {
		case w.semaphore <- struct{}{}:
			checkWg.Add(1)
			go func(appID int64) {
				defer func() {
					<-w.semaphore
					checkWg.Done()
				}()
				_ = w.svc.checkAndUpdateStatus(ctx, appID)
			}(app.ID)
		case <-ctx.Done():
			return
		case <-w.stopCh:
			return
		}
	}

	checkWg.Wait()
}