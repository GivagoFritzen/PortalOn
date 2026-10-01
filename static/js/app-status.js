"use strict";

class AppStatusSSE {
    constructor() {
        this.eventSource = null;
        this.reconnectAttempts = 0;
        this.maxReconnectDelay = 30000;
        this.baseReconnectDelay = 1000;
        this.visibleAppIds = new Set();
    }

    init() {
        if (!window.EventSource) {
            console.log("EventSource not supported, falling back to HTMX polling");
            return;
        }

        this.collectVisibleAppIds();
        this.connect();
        this.setupReconnectListener();
        this.setupVisibilityListener();
    }

    collectVisibleAppIds() {
        document.querySelectorAll('[data-app-id]').forEach(el => {
            const appId = parseInt(el.getAttribute('data-app-id'), 10);
            if (!isNaN(appId)) {
                this.visibleAppIds.add(appId);
            }
        });
    }

    connect() {
        this.eventSource = new EventSource('/api/apps/stream');

        this.eventSource.addEventListener('init', (event) => {
            try {
                const apps = JSON.parse(event.data);
                this.applySnapshot(apps);
            } catch (e) {
                console.error('Failed to parse init event:', e);
            }
        });

        this.eventSource.addEventListener('status-change', (event) => {
            try {
                const data = JSON.parse(event.data);
                this.updateAppStatus(data.app_id, data.is_online);
            } catch (e) {
                console.error('Failed to parse status-change event:', e);
            }
        });

        this.eventSource.onopen = () => {
            this.reconnectAttempts = 0;
            console.log('SSE connection established');
        };

        this.eventSource.onerror = (err) => {
            console.warn('SSE connection error, will reconnect:', err);
            this.scheduleReconnect();
        };
    }

    applySnapshot(apps) {
        apps.forEach(app => {
            if (this.visibleAppIds.has(app.app_id)) {
                this.updateAppStatus(app.app_id, app.is_online);
            }
        });
    }

    updateAppStatus(appId, isOnline) {
        const container = document.querySelector(`[data-app-id="${appId}"]`);
        if (!container) return;

        const statusDot = container.querySelector('.status-dot');
        if (!statusDot) return;

        statusDot.classList.remove('status-dot-online', 'status-dot-offline');
        statusDot.classList.add(isOnline ? 'status-dot-online' : 'status-dot-offline');
    }

    scheduleReconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }

        const delay = Math.min(
            this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
            this.maxReconnectDelay
        );

        this.reconnectAttempts++;

        setTimeout(() => {
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                this.connect();
            }
        }, delay);
    }

    setupReconnectListener() {
        window.addEventListener('online', () => {
            if (!this.eventSource) {
                this.connect();
            }
        });
    }

    setupVisibilityListener() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.collectVisibleAppIds();
            }
        });
    }

    close() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const sse = new AppStatusSSE();
    sse.init();

    window.addEventListener('beforeunload', () => {
        sse.close();
    });
});