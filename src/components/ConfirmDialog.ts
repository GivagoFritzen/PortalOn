import { translate } from '../locale';

export class ConfirmDialog {
    private overlay: HTMLElement | null = null;
    private backdrop: HTMLElement | null = null;
    private okBtn: HTMLButtonElement | null = null;
    private cancelBtn: HTMLButtonElement | null = null;
    private messageEl: HTMLElement | null = null;
    private titleEl: HTMLElement | null = null;

    constructor() {
        this.setElementsById();
    }

    show(message: string): Promise<boolean> {
        this.setElementsById();

        if (!this.overlay || !this.backdrop || !this.okBtn || !this.cancelBtn || !this.messageEl || !this.titleEl) {
            return Promise.resolve(false);
        }

        this.titleEl.textContent = translate('confirm.title');
        this.messageEl.textContent = message;
        this.cancelBtn.textContent = translate('confirm.button.cancel');
        this.okBtn.textContent = translate('confirm.button.delete');
        this.overlay.classList.remove('hidden');

        return new Promise((resolve) => {
            const cleanup = (): void => {
                this.okBtn?.removeEventListener('click', handleOk);
                this.cancelBtn?.removeEventListener('click', handleCancel);
                this.backdrop?.removeEventListener('click', handleBackdrop);
                document.removeEventListener('keydown', handleEsc);
                this.overlay?.classList.add('hidden');
            };

            const handleOk = (): void => {
                cleanup();
                resolve(true);
            };

            const handleCancel = (): void => {
                cleanup();
                resolve(false);
            };

            const handleBackdrop = (): void => {
                handleCancel();
            };

            const handleEsc = (e: KeyboardEvent): void => {
                if (e.key === 'Escape') {
                    handleCancel();
                }
            };

            this.okBtn!.addEventListener('click', handleOk);
            this.cancelBtn!.addEventListener('click', handleCancel);
            this.backdrop!.addEventListener('click', handleBackdrop);
            document.addEventListener('keydown', handleEsc);
        });
    }

    private setElementsById(): void {
        this.overlay = document.getElementById('confirm-overlay');
        this.backdrop = document.getElementById('confirm-backdrop');
        this.okBtn = document.getElementById('confirm-ok') as HTMLButtonElement;
        this.cancelBtn = document.getElementById('confirm-cancel') as HTMLButtonElement;
        this.messageEl = document.getElementById('confirm-message');
        this.titleEl = document.getElementById('confirm-title');
    }
}
