import { SortableEvent } from '../types/Sortable';
import { ApiClient } from '../api/ApiClient';
import { translate } from '../locale';

declare class Sortable {
    constructor(element: HTMLElement, options: Record<string, unknown>);
    destroy(): void;
}

export class EditModeService {
    private editMode: boolean = false;
    private sortableInstance: Sortable | null = null;
    private apiClient: ApiClient;

    constructor(apiClient: ApiClient) {
        this.apiClient = apiClient;
    }

    toggle(): void {
        this.editMode = !this.editMode;

        const grid = this.getGridElement();
        const btn = this.getButtonElement();

        if (!grid || !btn) return;

        if (this.editMode) {
            grid.classList.add('edit-mode');
            btn.classList.add('bg-primary', 'text-white');
            btn.title = translate('topAppBar.toggleEditMode');
            this.initSortable();
            return;
        }

        grid.classList.remove('edit-mode');
        btn.classList.remove('bg-primary', 'text-white');
        btn.title = translate('topAppBar.toggleEditMode');
        if (this.sortableInstance) {
            this.sortableInstance.destroy();
            this.sortableInstance = null;
        }
    }

    isActive(): boolean {
        return this.editMode;
    }

    private getGridElement(): HTMLElement | null {
        return document.getElementById('app-grid');
    }

    private getButtonElement(): HTMLElement | null {
        return document.getElementById('edit-btn');
    }

    private initSortable(): void {
        const grid = this.getGridElement();
        if (!grid) return;

        const SortableConstructor = (window as unknown as { Sortable?: typeof Sortable }).Sortable || (typeof Sortable !== 'undefined' ? Sortable : null);
        if (!SortableConstructor) {
            console.warn('SortableJS library is not available.');
            return;
        }

        if (this.sortableInstance) {
            this.sortableInstance.destroy();
            this.sortableInstance = null;
        }

        this.sortableInstance = new SortableConstructor(grid, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            onEnd: async (_evt: SortableEvent): Promise<void> => {
                const currentGrid = this.getGridElement();
                if (!currentGrid) return;

                const cards = currentGrid.querySelectorAll('.app-card');
                const ids = Array.from(cards)
                    .map(card => parseInt((card as HTMLElement).dataset.id || '0', 10))
                    .filter(id => !isNaN(id) && id > 0);

                if (ids.length === 0) return;

                try {
                    await this.apiClient.reorderApps(ids);
                } catch (e) {
                    console.error('Reorder failed:', e);
                }
            }
        });
    }
}