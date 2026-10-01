import { ApiClient } from '../api/ApiClient';
import { translate } from '../locale';

export class IconPickerService {
    private readonly ICONS_PER_PAGE = 10;
    private readonly DEBOUNCE_DELAY_MS = 300;
    private displayedCount: number = 0;
    private totalIcons: number = 0;
    private currentQuery: string = '';
    private isLoading: boolean = false;
    private iconsLoaded: boolean = false;
    private apiClient: ApiClient;
    private scrollObserver: IntersectionObserver | null = null;
    private fetchAbortController: AbortController | null = null;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;

    private searchInput: HTMLInputElement | null = null;
    private gridContainer: HTMLElement | null = null;
    private grid: HTMLElement | null = null;
    private selectedDisplay: HTMLElement | null = null;
    private selectedImg: HTMLImageElement | null = null;
    private selectedName: HTMLElement | null = null;
    private formIcon: HTMLInputElement | null = null;
    private eventController: AbortController | null = null;

    private boundMousedown: ((e: MouseEvent) => void) | null = null;

    constructor(apiClient: ApiClient) {
        this.apiClient = apiClient;
    }

    init(): void {
        this.queryElements();
        if (!this.searchInput || !this.gridContainer) return;

        this.resetEventController();
        const signal = this.eventController!.signal;

        this.iconsLoaded = false;
        this.gridContainer.style.display = 'none';

        if (this.selectedDisplay) {
            this.selectedDisplay.addEventListener('click', () => this.clearSelection(), { signal });
        }

        this.boundMousedown = (e: MouseEvent) => this.handleOutsideClick(e);
        document.addEventListener('mousedown', this.boundMousedown, { signal });

        this.searchInput.addEventListener('focus', async () => {
            if (this.gridContainer) this.gridContainer.style.display = '';
            if (!this.iconsLoaded) {
                await this.loadInitialIcons();
                this.iconsLoaded = true;
            }
        }, { signal });

        this.searchInput.addEventListener('input', () => this.handleSearchInput(signal), { signal });
    }

    destroy(): void {
        this.eventController?.abort();
        this.eventController = null;
        this.scrollObserver?.disconnect();
        this.scrollObserver = null;
        this.fetchAbortController?.abort();
        this.fetchAbortController = null;
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        this.boundMousedown = null;
    }

    reset(): void {
        this.displayedCount = 0;
        this.totalIcons = 0;
        this.currentQuery = '';
        this.iconsLoaded = false;

        if (this.grid) this.grid.innerHTML = '';
    }

    selectIcon(iconName: string): void {
        if (this.formIcon) this.formIcon.value = iconName;

        this.updateSelectedIconHighlight(iconName);

        if (this.gridContainer) {
            this.gridContainer.style.display = 'none';
        }

        if (this.searchInput && this.selectedDisplay && this.selectedImg && this.selectedName) {
            this.searchInput.classList.add('hidden');
            this.selectedDisplay.classList.remove('hidden');
            this.selectedImg.src = `/static/icons/${iconName}.svg`;
            this.selectedImg.alt = iconName;
            this.selectedName.textContent = iconName;
        }
    }

    clearSelection(): void {
        if (this.formIcon) this.formIcon.value = '';

        this.clearIconHighlights();

        if (this.searchInput && this.selectedDisplay) {
            this.selectedDisplay.classList.add('hidden');
            this.searchInput.classList.remove('hidden');
            this.searchInput.value = '';
            this.searchInput.focus();
        }
    }

    private queryElements(): void {
        this.searchInput = document.getElementById('icon-search') as HTMLInputElement | null;
        this.gridContainer = document.getElementById('icon-grid-container');
        this.grid = document.getElementById('material-icons-grid');
        this.selectedDisplay = document.getElementById('icon-selected-display');
        this.selectedImg = document.getElementById('icon-selected-img') as HTMLImageElement | null;
        this.selectedName = document.getElementById('icon-selected-name');
        this.formIcon = document.getElementById('form-icon') as HTMLInputElement | null;
    }

    private resetEventController(): void {
        this.eventController?.abort();
        this.eventController = new AbortController();
    }

    private handleOutsideClick(e: MouseEvent): void {
        const target = e.target as Node;
        const isInsideSearch = this.searchInput?.contains(target) ?? false;
        const isInsideGrid = this.gridContainer?.contains(target) ?? false;
        const isInsideSelected = this.selectedDisplay?.contains(target) ?? false;

        if (!isInsideSearch && !isInsideGrid && !isInsideSelected) {
            if (this.gridContainer) this.gridContainer.style.display = 'none';
        }
    }

    private async loadInitialIcons(): Promise<void> {
        if (!this.grid || !this.gridContainer) return;

        this.grid.innerHTML = `<div class="col-span-5 text-center text-on-surface-variant text-sm py-4">${translate('icon.loading')}</div>`;

        try {
            this.displayedCount = 0;
            this.totalIcons = 0;
            this.currentQuery = '';
            this.isLoading = false;

            const { icons, total } = await this.apiClient.fetchIcons('', 0, this.ICONS_PER_PAGE);
            this.totalIcons = total;
            this.grid.innerHTML = '';
            this.appendIconBatch(icons);
            this.displayedCount = icons.length;
            this.updateNoResults();

            this.setupScrollObserver();
        } catch (e) {
            console.error('Failed to load icons:', e);
            this.grid.innerHTML = `<div class="col-span-5 text-center text-on-surface-variant text-sm py-4">${translate('icon.error')}</div>`;
        }
    }

    private handleSearchInput(signal: AbortSignal): void {
        if (!this.grid || !this.searchInput) return;

        if (this.debounceTimer) clearTimeout(this.debounceTimer);

        this.debounceTimer = setTimeout(async () => {
            if (!this.grid || !this.searchInput) return;

            this.fetchAbortController?.abort();
            this.fetchAbortController = new AbortController();
            const fetchSignal = this.fetchAbortController.signal;

            this.currentQuery = this.searchInput.value;
            this.grid.innerHTML = '';
            this.displayedCount = 0;
            this.totalIcons = 0;
            this.isLoading = false;

            try {
                const { icons, total } = await this.apiClient.fetchIcons(this.currentQuery, 0, this.ICONS_PER_PAGE, fetchSignal);
                if (fetchSignal.aborted) return;

                this.totalIcons = total;
                this.appendIconBatch(icons);
                this.displayedCount = icons.length;
                this.updateNoResults();

                this.setupScrollObserver();

                const currentIcon = this.formIcon?.value;
                if (currentIcon) {
                    this.updateSelectedIconHighlight(currentIcon);
                }
            } catch (e) {
                if (fetchSignal.aborted) return;
                console.error('Failed to search icons:', e);
            }
        }, this.DEBOUNCE_DELAY_MS);
    }

    private updateSelectedIconHighlight(iconName: string): void {
        document.querySelectorAll('#material-icons-grid button.icon-item').forEach(btn => {
            const el = btn as HTMLElement;
            if (el.dataset.icon === iconName) {
                el.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-surface');
            } else {
                el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-surface');
            }
        });
    }

    private clearIconHighlights(): void {
        document.querySelectorAll('#material-icons-grid button.icon-item').forEach(btn => {
            btn.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-surface');
        });
    }

    private appendIconBatch(icons: string[]): void {
        if (!this.grid) return;

        for (const icon of icons) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'icon-item aspect-square rounded-xl bg-surface-container-highest flex items-center justify-center hover:scale-110 transition-transform border border-outline-variant/20 overflow-hidden p-1.5';
            btn.dataset.icon = icon;
            btn.title = icon;
            btn.innerHTML = `<img src="/static/icons/${icon}.svg" alt="${icon}" class="w-full h-full object-contain">`;
            btn.addEventListener('mousedown', (e) => { e.preventDefault(); this.selectIcon(icon); });
            this.grid.appendChild(btn);
        }
    }

    private updateNoResults(): void {
        if (!this.grid) return;

        let noResultsMsg = document.getElementById('no-results-msg');
        if (this.displayedCount === 0) {
            if (!noResultsMsg) {
                noResultsMsg = document.createElement('div');
                noResultsMsg.id = 'no-results-msg';
                noResultsMsg.className = 'col-span-5 text-center text-on-surface-variant text-sm py-4';
                noResultsMsg.textContent = translate('icon.noResults');
                this.grid.appendChild(noResultsMsg);
            }
            noResultsMsg.style.display = 'block';
        } else if (noResultsMsg) {
            noResultsMsg.style.display = 'none';
        }
    }

    private setupScrollObserver(): void {
        if (!this.gridContainer) return;

        if (this.scrollObserver) {
            this.scrollObserver.disconnect();
        }

        const existing = document.getElementById('icon-scroll-sentinel');
        if (existing) existing.remove();

        const sentinel = document.createElement('div');
        sentinel.id = 'icon-scroll-sentinel';
        sentinel.className = 'h-1 w-full';
        this.gridContainer.appendChild(sentinel);

        this.scrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadIconPage();
                }
            });
        }, { root: this.gridContainer, threshold: 0.1 });
        this.scrollObserver.observe(sentinel);
    }

    private async loadIconPage(): Promise<void> {
        if (this.isLoading || this.displayedCount >= this.totalIcons) return;
        this.isLoading = true;

        try {
            const { icons, total } = await this.apiClient.fetchIcons(this.currentQuery, this.displayedCount, this.ICONS_PER_PAGE);
            this.totalIcons = total;
            this.appendIconBatch(icons);
            this.displayedCount += icons.length;
            this.updateNoResults();
        } catch (e) {
            console.error('Failed to load icons:', e);
        } finally {
            this.isLoading = false;
        }
    }
}