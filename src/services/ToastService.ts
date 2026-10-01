import type { ToastType } from '../types/ToastType';
import type { ToastAction } from '../types/ToastAction';
import type { ToastOptions } from '../types/ToastOptions';
import type { ToastTypeConfig } from '../types/ToastTypeConfig';
import type { ToastTimerState } from '../types/ToastTimerState';
import { TOAST_CONFIG } from '../types/ToastConfig';
import { translate } from '../locale';

export class ToastService {
    private container: HTMLElement | null = null;

    success(title: string, description?: string, options?: ToastOptions): void {
        this.show(title, 'success', description, options);
    }

    error(title: string, description?: string, options?: ToastOptions): void {
        this.show(title, 'error', description, options);
    }

    warning(title: string, description?: string, options?: ToastOptions): void {
        this.show(title, 'warning', description, options);
    }

    info(title: string, description?: string, options?: ToastOptions): void {
        this.show(title, 'info', description, options);
    }

    private getContainer(): HTMLElement {
        if (!this.container) {
            this.container = this.createContainer();
        }
        return this.container;
    }

    private createContainer(): HTMLElement {
        const existing = document.getElementById('toast-container');
        if (existing) return existing;

        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-5 right-5 z-[300] flex flex-col gap-3 pointer-events-none max-w-sm w-full px-4 sm:px-0';
        document.body.appendChild(container);
        return container;
    }

    private show(
        title: string,
        type: ToastType,
        description?: string,
        options?: ToastOptions
    ): void {
        const container = this.getContainer();
        const config = TOAST_CONFIG[type];
        const durationMs = options?.durationMs ?? config.durationMs;
        const actions = options?.actions;

        const { toast, timerFill } = this.createToastElement(title, type, description, actions, config);
        container.appendChild(toast);

        this.animateIn(toast);
        this.setupDismissal(toast, timerFill, config, durationMs);
    }

    private animateIn(toast: HTMLElement): void {
        requestAnimationFrame(() => {
            toast.classList.remove('opacity-0', 'scale-95');
            toast.classList.add('opacity-100', 'scale-100');
        });
    }

    private setupDismissal(
        toast: HTMLElement,
        timerFill: HTMLElement,
        config: ToastTypeConfig,
        durationMs: number
    ): void {
        if (config.persistent || durationMs <= 0) return;

        const state: ToastTimerState = {
            timeoutId: null,
            isPaused: false,
            remainingMs: durationMs,
            startTime: Date.now(),
        };

        const dismiss = () => this.dismissToast(toast, state);
        const pauseTimer = () => this.pauseTimer(config, timerFill, state);
        const resumeTimer = () => this.resumeTimer(config, timerFill, state, dismiss);

        state.startTime = Date.now();
        state.timeoutId = setTimeout(dismiss, durationMs);

        toast.addEventListener('mouseenter', pauseTimer);
        toast.addEventListener('mouseleave', resumeTimer);

        const closeBtn = toast.querySelector('[data-toast-close]') as HTMLButtonElement;
        if (closeBtn) {
            closeBtn.addEventListener('click', dismiss);
        }
    }

    private dismissToast(toast: HTMLElement, state: ToastTimerState): void {
        if (state.timeoutId) clearTimeout(state.timeoutId);
        toast.classList.remove('opacity-100', 'scale-100');
        toast.classList.add('opacity-0', 'scale-95');
        setTimeout(() => toast.remove(), 200);
    }

    private pauseTimer(config: ToastTypeConfig, timerFill: HTMLElement, state: ToastTimerState): void {
        if (config.persistent || state.isPaused) return;
        state.isPaused = true;
        if (state.timeoutId) {
            clearTimeout(state.timeoutId);
            state.timeoutId = null;
        }
        state.remainingMs -= Date.now() - state.startTime;
        timerFill.style.animationPlayState = 'paused';
    }

    private resumeTimer(
        config: ToastTypeConfig,
        timerFill: HTMLElement,
        state: ToastTimerState,
        dismiss: () => void
    ): void {
        if (config.persistent || !state.isPaused) return;
        state.isPaused = false;
        state.startTime = Date.now();
        timerFill.style.animationPlayState = 'running';
        state.timeoutId = setTimeout(dismiss, state.remainingMs);
    }

    private createToastElement(
        title: string,
        type: ToastType,
        description?: string,
        actions?: ToastAction[],
        config?: ToastTypeConfig
    ): { toast: HTMLElement; timerFill: HTMLElement } {
        const cfg = config ?? TOAST_CONFIG[type];

        const toast = this.createToastBase();
        const flexRow = this.createFlexRow();
        const squircle = this.createSquircle(cfg, type);
        const content = this.createContent(title, description, actions, type);
        const closeBtn = this.createCloseButton();
        const { timerBar, timerFill } = this.createTimerBar(cfg);

        flexRow.appendChild(squircle);
        flexRow.appendChild(content);
        flexRow.appendChild(closeBtn);
        toast.appendChild(flexRow);
        toast.appendChild(timerBar);

        if (cfg.persistent) {
            timerBar.style.display = 'none';
        }

        return { toast, timerFill };
    }

    private createToastBase(): HTMLElement {
        const toast = document.createElement('div');
        toast.className = [
            'pointer-events-auto',
            'relative group overflow-hidden',
            'bg-surface-container-lowest',
            'rounded-2xl',
            'border border-outline-variant/40',
            'shadow-xl',
            'p-4',
            'transition-all duration-200',
            'hover:shadow-2xl hover:translate-y-[-2px]',
            'opacity-0 scale-95',
            'transform-gpu',
        ].join(' ');
        return toast;
    }

    private createFlexRow(): HTMLElement {
        const flexRow = document.createElement('div');
        flexRow.className = 'flex items-start gap-3.5';
        return flexRow;
    }

    private createSquircle(cfg: ToastTypeConfig, type: ToastType): HTMLElement {
        const squircle = document.createElement('div');
        squircle.className = [
            'w-10 h-10 rounded-xl',
            'flex items-center justify-center',
            'shrink-0 shadow-xs',
            'border',
            cfg.squircleBg,
            cfg.squircleBorder,
            cfg.iconColor,
        ].join(' ');

        const icon = document.createElement('span');
        icon.className = 'material-symbols-outlined';
        icon.textContent = cfg.icon;
        this.applyIconStyles(icon, type);
        squircle.appendChild(icon);

        return squircle;
    }

    private applyIconStyles(icon: HTMLElement, type: ToastType): void {
        if (type === 'info') {
            icon.classList.add('animate-spin', 'text-base');
        }
        if (type === 'success' || type === 'error' || type === 'warning') {
            icon.style.fontVariationSettings = "'FILL' 1";
        }
    }

    private createContent(
        title: string,
        description: string | undefined,
        actions: ToastAction[] | undefined,
        type: ToastType
    ): HTMLElement {
        const content = document.createElement('div');
        content.className = 'flex-1 min-w-0 pr-2';

        const titleEl = document.createElement('h4');
        titleEl.className = 'font-label-md text-label-md font-bold text-on-surface';
        titleEl.textContent = title;
        content.appendChild(titleEl);

        if (description) {
            content.appendChild(this.createDescription(description));
        }

        if (actions && actions.length > 0) {
            content.appendChild(this.createActionsContainer(actions, type));
        }

        return content;
    }

    private createDescription(description: string): HTMLElement {
        const descEl = document.createElement('p');
        descEl.className = 'font-body-md text-on-surface-variant mt-0.5 text-xs';
        descEl.textContent = description;
        return descEl;
    }

    private createActionsContainer(actions: ToastAction[], type: ToastType): HTMLElement {
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'mt-3 flex items-center gap-2';

        actions.forEach((action) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = [
                'px-2.5 py-1 rounded-lg',
                'font-label-sm text-label-sm font-semibold',
                'transition-opacity',
                this.getActionStyles(type),
            ].join(' ');
            btn.textContent = action.label;
            btn.addEventListener('click', () => {
                action.onClick();
            });
            actionsContainer.appendChild(btn);
        });

        return actionsContainer;
    }

    private createCloseButton(): HTMLElement {
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.setAttribute('data-toast-close', '');
        closeBtn.className = 'text-outline hover:text-on-surface rounded-lg p-1 transition-colors shrink-0';
        closeBtn.setAttribute('aria-label', translate('toast.close'));
        closeBtn.innerHTML = '<span class="material-symbols-outlined text-sm">close</span>';
        return closeBtn;
    }

    private createTimerBar(cfg: ToastTypeConfig): { timerBar: HTMLElement; timerFill: HTMLElement } {
        const timerBar = document.createElement('div');
        timerBar.className = 'absolute bottom-0 left-0 right-0 h-1 bg-surface-container';

        const timerFill = document.createElement('div');
        timerFill.className = `h-full ${cfg.timerColor} timer-drain`;
        if (!cfg.persistent) {
            timerFill.style.animationDuration = `${cfg.durationMs}ms`;
        }

        timerBar.appendChild(timerFill);
        return { timerBar, timerFill };
    }

    private getActionStyles(type: ToastType): string {
        switch (type) {
            case 'error':
                return 'bg-red-50 text-error hover:bg-red-100';
            case 'warning':
                return 'bg-amber-50 text-amber-800 hover:bg-amber-100';
            case 'success':
                return 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100';
            case 'info':
            default:
                return 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high';
        }
    }
}

export const toast = new ToastService();