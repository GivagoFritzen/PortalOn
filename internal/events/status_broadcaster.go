package events

import (
	"log"
	"sync"
	"time"
)

type StatusChangeEvent struct {
	AppID     int64
	IsOnline  bool
	Timestamp time.Time
}

type StatusBroadcaster interface {
	Subscribe() chan StatusChangeEvent
	Unsubscribe(ch chan StatusChangeEvent)
	Publish(event StatusChangeEvent)
	SubscriberCount() int
}

type statusBroadcaster struct {
	mu           sync.RWMutex
	subscribers  map[chan StatusChangeEvent]struct{}
	bufferSize   int
	maxBufferSize int
}

func NewStatusBroadcaster(bufferSize int) *statusBroadcaster {
	if bufferSize <= 0 {
		bufferSize = 100
	}
	return &statusBroadcaster{
		subscribers:   make(map[chan StatusChangeEvent]struct{}),
		bufferSize:    bufferSize,
		maxBufferSize: bufferSize,
	}
}

func (b *statusBroadcaster) Subscribe() chan StatusChangeEvent {
	b.mu.Lock()
	defer b.mu.Unlock()

	ch := make(chan StatusChangeEvent, b.bufferSize)
	b.subscribers[ch] = struct{}{}
	return ch
}

func (b *statusBroadcaster) Unsubscribe(ch chan StatusChangeEvent) {
	b.mu.Lock()
	defer b.mu.Unlock()

	if _, ok := b.subscribers[ch]; ok {
		delete(b.subscribers, ch)
		close(ch)
	}
}

func (b *statusBroadcaster) Publish(event StatusChangeEvent) {
	b.mu.RLock()
	subscribers := make([]chan StatusChangeEvent, 0, len(b.subscribers))
	for ch := range b.subscribers {
		subscribers = append(subscribers, ch)
	}
	b.mu.RUnlock()

	for _, ch := range subscribers {
		select {
		case ch <- event:
		default:
			log.Printf("warning: subscriber channel full, removing subscriber")
			b.Unsubscribe(ch)
		}
	}
}

func (b *statusBroadcaster) SubscriberCount() int {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return len(b.subscribers)
}