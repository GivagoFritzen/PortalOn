import { translate } from '../locale';

export class SearchService {
    private searchInput: HTMLInputElement | null = null;
    private gridContainer: HTMLElement | null = null;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly debounceMs = 300;

    init(): void {
        this.searchInput = document.getElementById('search-input') as HTMLInputElement | null;
        this.gridContainer = document.getElementById('app-grid');

        if (!this.searchInput || !this.gridContainer) return;

        this.searchInput.placeholder = translate('search.placeholder');
        this.searchInput.addEventListener('input', this.handleInput.bind(this));
    }

    destroy(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        if (this.searchInput) {
            this.searchInput.removeEventListener('input', this.handleInput.bind(this));
        }
    }

    private handleInput(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            this.performSearch();
        }, this.debounceMs);
    }

    private async performSearch(): Promise<void> {
        if (!this.searchInput || !this.gridContainer) return;

        const query = this.searchInput.value.trim();

        try {
            const resp = await fetch(`/api/apps/search?q=${encodeURIComponent(query)}`);
            const html = await resp.text();
            this.gridContainer.innerHTML = html;
        } catch (error) {
            console.error('Search failed:', error);
        }
    }
}