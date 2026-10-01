import type { ToastType } from './ToastType';
import type { ToastTypeConfig } from './ToastTypeConfig';

export const TOAST_CONFIG: Record<ToastType, ToastTypeConfig> = {
    success: {
        squircleBg: 'bg-emerald-50',
        squircleBorder: 'border-emerald-100',
        iconColor: 'text-emerald-600',
        icon: 'check_circle',
        timerColor: 'bg-emerald-500',
        durationMs: 4000,
        persistent: false,
    },
    error: {
        squircleBg: 'bg-red-50',
        squircleBorder: 'border-red-200',
        iconColor: 'text-error',
        icon: 'error',
        timerColor: 'bg-error',
        durationMs: 0,
        persistent: true,
    },
    warning: {
        squircleBg: 'bg-amber-50',
        squircleBorder: 'border-amber-200',
        iconColor: 'text-amber-600',
        icon: 'warning',
        timerColor: 'bg-amber-500',
        durationMs: 6000,
        persistent: false,
    },
    info: {
        squircleBg: 'bg-blue-50',
        squircleBorder: 'border-blue-200',
        iconColor: 'text-primary',
        icon: 'sync',
        timerColor: 'bg-primary',
        durationMs: 3500,
        persistent: false,
    },
};