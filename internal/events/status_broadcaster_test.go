package events

import (
	"sync"
	"testing"
	"time"
)

func TestStatusBroadcaster_Subscribe(t *testing.T) {
	b := NewStatusBroadcaster(10)

	ch := b.Subscribe()

	if ch == nil {
		t.Fatal("expected channel, got nil")
	}
	if b.SubscriberCount() != 1 {
		t.Errorf("expected 1 subscriber, got %d", b.SubscriberCount())
	}

	close(ch)
}

func TestStatusBroadcaster_Unsubscribe(t *testing.T) {
	b := NewStatusBroadcaster(10)

	ch := b.Subscribe()
	b.Unsubscribe(ch)

	if b.SubscriberCount() != 0 {
		t.Errorf("expected 0 subscribers, got %d", b.SubscriberCount())
	}
}

func TestStatusBroadcaster_Publish(t *testing.T) {
	b := NewStatusBroadcaster(10)

	ch := b.Subscribe()
	defer b.Unsubscribe(ch)

	event := StatusChangeEvent{
		AppID:     1,
		IsOnline:  true,
		Timestamp: time.Now(),
	}

	b.Publish(event)

	select {
	case received := <-ch:
		if received.AppID != event.AppID || received.IsOnline != event.IsOnline {
			t.Errorf("expected %v, got %v", event, received)
		}
	case <-time.After(100 * time.Millisecond):
		t.Fatal("timeout waiting for event")
	}
}

func TestStatusBroadcaster_MultipleSubscribers(t *testing.T) {
	b := NewStatusBroadcaster(10)

	ch1 := b.Subscribe()
	ch2 := b.Subscribe()
	defer b.Unsubscribe(ch1)
	defer b.Unsubscribe(ch2)

	event := StatusChangeEvent{AppID: 1, IsOnline: true, Timestamp: time.Now()}
	b.Publish(event)

	for _, ch := range []chan StatusChangeEvent{ch1, ch2} {
		select {
		case received := <-ch:
			if received.AppID != event.AppID {
				t.Errorf("expected AppID %d, got %d", event.AppID, received.AppID)
			}
		case <-time.After(100 * time.Millisecond):
			t.Fatal("timeout waiting for event")
		}
	}
}

func TestStatusBroadcaster_ConcurrentPublishSubscribe(t *testing.T) {
	b := NewStatusBroadcaster(100)
	var wg sync.WaitGroup
	numSubscribers := 10
	numEvents := 100

	for i := 0; i < numSubscribers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			ch := b.Subscribe()
			defer b.Unsubscribe(ch)
			for range numEvents {
				<-ch
			}
		}()
	}

	time.Sleep(10 * time.Millisecond)

	for i := 0; i < numEvents; i++ {
		b.Publish(StatusChangeEvent{AppID: int64(i), IsOnline: true, Timestamp: time.Now()})
	}

	wg.Wait()

	if b.SubscriberCount() != 0 {
		t.Errorf("expected 0 subscribers after cleanup, got %d", b.SubscriberCount())
	}
}

func TestStatusBroadcaster_FullChannelCleanup(t *testing.T) {
	b := NewStatusBroadcaster(2)

	ch := b.Subscribe()
	defer b.Unsubscribe(ch)

	for i := 0; i < 5; i++ {
		b.Publish(StatusChangeEvent{AppID: int64(i), IsOnline: true, Timestamp: time.Now()})
	}

	time.Sleep(50 * time.Millisecond)

	if b.SubscriberCount() != 0 {
		t.Errorf("expected subscriber to be removed due to full channel, got %d", b.SubscriberCount())
	}
}

func TestStatusBroadcaster_PublishNoSubscribers(t *testing.T) {
	b := NewStatusBroadcaster(10)

	event := StatusChangeEvent{AppID: 1, IsOnline: true, Timestamp: time.Now()}
	b.Publish(event)

	if b.SubscriberCount() != 0 {
		t.Errorf("expected 0 subscribers, got %d", b.SubscriberCount())
	}
}

func TestStatusBroadcaster_UnsubscribeTwice(t *testing.T) {
	b := NewStatusBroadcaster(10)

	ch := b.Subscribe()
	b.Unsubscribe(ch)
	b.Unsubscribe(ch)

	if b.SubscriberCount() != 0 {
		t.Errorf("expected 0 subscribers, got %d", b.SubscriberCount())
	}
}

func TestStatusBroadcaster_UnsubscribeNonExistent(t *testing.T) {
	b := NewStatusBroadcaster(10)

	ch := make(chan StatusChangeEvent, 10)
	b.Unsubscribe(ch)

	if b.SubscriberCount() != 0 {
		t.Errorf("expected 0 subscribers, got %d", b.SubscriberCount())
	}
}

func TestStatusBroadcaster_NewStatusBroadcaster_BufferSizeEdgeCase(t *testing.T) {
	b1 := NewStatusBroadcaster(0)
	if b1.SubscriberCount() != 0 {
		t.Errorf("expected 0 subscribers, got %d", b1.SubscriberCount())
	}

	b2 := NewStatusBroadcaster(-5)
	if b2.SubscriberCount() != 0 {
		t.Errorf("expected 0 subscribers, got %d", b2.SubscriberCount())
	}

	b3 := NewStatusBroadcaster(50)
	if b3.SubscriberCount() != 0 {
		t.Errorf("expected 0 subscribers, got %d", b3.SubscriberCount())
	}
}