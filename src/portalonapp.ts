import { ApiClient } from './api/ApiClient';
import { ThemeService } from './services/ThemeService';
import { ConfirmDialog } from './components/ConfirmDialog';
import { AppFormService } from './services/AppFormService';
import { EditModeService } from './services/EditModeService';
import { SearchService } from './services/SearchService';
import { toast } from './services/ToastService';
import { translate } from './locale';

export class PortalOnApp {
    private apiClient: ApiClient;
    private themeService: ThemeService;
    private editModeService: EditModeService;
    private appFormService: AppFormService;
    private confirmDialog: ConfirmDialog;
    private searchService: SearchService;

    constructor() {
        this.apiClient = new ApiClient();
        this.themeService = new ThemeService();
        this.editModeService = new EditModeService(this.apiClient);
        this.confirmDialog = new ConfirmDialog();
        this.appFormService = new AppFormService(this.apiClient);
        this.searchService = new SearchService();
    }

    init(): void {
        this.themeService.init();
        this.searchService.init();
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        document.addEventListener('click', this.handleClick.bind(this));
        document.addEventListener('submit', this.handleSubmit.bind(this));
        document.addEventListener('keydown', this.handleKeydown.bind(this));
    }

    private async handleClick(e: Event): Promise<void> {
        const target = e.target as HTMLElement;

        const actionEl = target.closest('[data-action]') as HTMLElement;
        if (actionEl) {
            const action = actionEl.dataset.action;
            if (action) {
                e.preventDefault();
                this.handleAction(action, actionEl);
                return;
            }
        }

        const card = target.closest('.app-card') as HTMLElement;
        if (!card) return;

        // Prevent opening links when in Edit Mode
        if (this.editModeService.isActive()) {
            e.preventDefault();
            return;
        }

        if (target.closest('.edit-controls')) return;

        const url = card.dataset.url;
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            e.preventDefault();
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    }

    private async handleSubmit(e: Event): Promise<void> {
        const form = e.target as HTMLElement;
        if (form.id !== 'app-form') return;

        e.preventDefault();

        if (!this.appFormService.validate()) {
            toast.error(translate('toast.error.form'), translate('toast.error.saveDesc'));
            return;
        }

        const { id, data } = this.appFormService.getFormData();
        this.appFormService.setSubmitting(true);

        try {
            if (id) {
                await this.apiClient.updateApp(parseInt(id, 10), data);
                toast.success(translate('toast.success.updated'), translate('toast.success.updatedDesc'));
            } else {
                await this.apiClient.createApp(data);
                toast.success(translate('toast.success.created'), translate('toast.success.createdDesc'));
            }
            this.appFormService.close();
            this.refreshAppGrid();
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            toast.error('Erro ao salvar', message);
        } finally {
            this.appFormService.setSubmitting(false);
        }
    }

    private async refreshAppGrid(): Promise<void> {
        try {
            const resp = await fetch('/api/apps/search?q=');
            const html = await resp.text();
            const grid = document.getElementById('app-grid');
            if (grid) grid.innerHTML = html;
        } catch {
            window.location.reload();
        }
    }

    private handleKeydown(e: KeyboardEvent): void {
        if (e.key === 'Escape') {
            const confirmOverlay = document.getElementById('confirm-overlay');
            if (confirmOverlay && !confirmOverlay.classList.contains('hidden')) {
                return;
            }
            this.appFormService.close();
            return;
        }

        // Global search shortcut: '/' or 'Ctrl+K' / 'Cmd+K'
        const isSearchShortcut = e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k');
        if (isSearchShortcut && !this.isInputElement(document.activeElement)) {
            e.preventDefault();
            const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
    }

    private isInputElement(element: Element | null): boolean {
        if (!element) return false;
        const tagName = element.tagName.toLowerCase();
        return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || (element as HTMLElement).isContentEditable;
    }

    private async handleAction(action: string, target: HTMLElement): Promise<void> {
        switch (action) {
            case 'open-modal':
                this.appFormService.open();
                break;
            case 'close-modal':
                this.appFormService.close();
                break;
            case 'toggle-edit-mode':
                this.editModeService.toggle();
                break;
            case 'edit-app': {
                const id = target.dataset.appId;
                if (id) this.appFormService.open(parseInt(id, 10));
                break;
            }
            case 'delete-app': {
                const id = target.dataset.appId;
                if (id) await this.handleDeleteApp(parseInt(id, 10));
                break;
            }
        }
    }

    private async handleDeleteApp(id: number): Promise<void> {
        if (!await this.confirmDialog.show(translate('confirm.deleteApp'))) return;

        try {
            await this.apiClient.deleteApp(id);
            const card = document.querySelector(`.app-card[data-id="${id}"]`) || document.querySelector(`[data-app-id="${id}"]`)?.closest('.app-card');
            if (card) {
                card.remove();
            }
            toast.success(translate('toast.success.deleted'), translate('toast.success.deletedDesc'));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            toast.error(translate('toast.error.connection'), message);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new PortalOnApp();
    app.init();
});

