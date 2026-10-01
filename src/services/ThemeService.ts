export class ThemeService {
    private iconElement: HTMLElement | null;
    private buttonElement: HTMLElement | null;

    constructor() {
        this.iconElement = document.getElementById('theme-icon');
        this.buttonElement = document.getElementById('theme-btn');
    }

    init(): void {
        const saved = localStorage.getItem('darkMode');
        if (saved === 'true' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            this.applyDark(true);
        }

        if (this.buttonElement) {
            this.buttonElement.addEventListener('click', () => this.toggle());
        }
    }

    private applyDark(isDark: boolean): void {
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        if (this.iconElement) {
            this.iconElement.textContent = isDark ? 'light_mode' : 'dark_mode';
        }
    }

    private toggle(): void {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('darkMode', String(isDark));
        this.applyDark(isDark);
    }
}
