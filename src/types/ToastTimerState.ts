export interface ToastTimerState {
    timeoutId: ReturnType<typeof setTimeout> | null;
    isPaused: boolean;
    remainingMs: number;
    startTime: number;
}