import type { ToastAction } from './ToastAction';

export interface ToastOptions {
    durationMs?: number;
    actions?: ToastAction[];
}