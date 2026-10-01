import { AppData } from '../types/AppData';
import { AppResponse } from '../types/AppResponse';
import { ApiClient } from '../api/ApiClient';
import { IconPickerService } from './IconPickerService';
import { translate } from '../locale';

export class AppFormService {
    private readonly apiClient: ApiClient;
    private readonly iconPicker: IconPickerService;

    private readonly overlay: HTMLElement | null;
    private readonly template: HTMLTemplateElement | null;
    private readonly content: HTMLElement | null;

    private title!: HTMLElement;
    private formId!: HTMLInputElement;
    private formName!: HTMLInputElement;
    private formUrl!: HTMLInputElement;
    private formGradient!: HTMLInputElement;
    private saveBtn!: HTMLButtonElement;
    private saveBtnText!: HTMLElement;
    private nameError!: HTMLElement | null;
    private urlError!: HTMLElement | null;
    private appForm!: HTMLFormElement;
    private saveBtnHandler: (() => void) | null = null;

    constructor(apiClient: ApiClient) {
        this.apiClient = apiClient;
        this.iconPicker = new IconPickerService(apiClient);

        this.overlay = document.getElementById('modal-overlay');
        this.template = document.getElementById('modal-template') as HTMLTemplateElement | null;
        this.content = document.getElementById('modal-content');
    }

    async open(appId?: number): Promise<void> {
        if (!this.overlay || !this.template || !this.content) {
            console.error('App form modal elements not found.');
            return;
        }

        this.renderForm();
        this.initializeForm();

        const isEdit = appId !== undefined;

        this.setMode(isEdit);

        if (isEdit) {
            this.formId.value = String(appId);

            try {
                const app = await this.apiClient.fetchApp(appId);
                this.setFormData(app);
            } catch (error) {
                console.error('Failed to load app:', error);
                return;
            }
        }

        this.overlay.classList.remove('hidden');
        requestAnimationFrame(() => {
            this.formName.focus();
        });
    }

    close(): void {
        if (this.saveBtn && this.saveBtnHandler) {
            this.saveBtn.removeEventListener('click', this.saveBtnHandler);
            this.saveBtnHandler = null;
        }
        this.iconPicker.destroy();
        this.overlay?.classList.add('hidden');
    }

    setSubmitting(isSubmitting: boolean): void {
        if (!this.saveBtn || !this.saveBtnText) return;
        this.saveBtn.disabled = isSubmitting;
        const isEdit = Boolean(this.formId.value);
        if (isSubmitting) {
            this.saveBtnText.textContent = isEdit ? translate('modal.button.updating') : translate('modal.button.saving');
        } else {
            this.saveBtnText.textContent = isEdit ? translate('modal.button.update') : translate('modal.button.save');
        }
    }

    validate(): boolean {
        let valid = true;
        this.clearValidationErrors();

        const name = this.formName.value.trim();
        if (!name) {
            this.showFieldError(this.formName, this.nameError, translate('validation.nameRequired'));
            valid = false;
        }

        const rawUrl = this.formUrl.value.trim();
        if (!rawUrl) {
            this.showFieldError(this.formUrl, this.urlError, translate('validation.urlRequired'));
            valid = false;
        } else if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
            this.showFieldError(this.formUrl, this.urlError, translate('validation.urlInvalid'));
            valid = false;
        }

        return valid;
    }

    getFormData(): { id: string; data: AppData } {
        return {
            id: this.formId.value.trim(),
            data: {
                name: this.formName.value.trim(),
                url: this.formUrl.value.trim(),
                icon: this.getIconValue().trim(),
                gradient: this.formGradient.value.trim()
            }
        };
    }

    private renderForm(): void {
        this.content!.replaceChildren(
            this.template!.content.cloneNode(true)
        );
    }

    private initializeForm(): void {
        this.title = this.getElement<HTMLElement>('modal-title');
        this.formId = this.getElement<HTMLInputElement>('form-id');
        this.formName = this.getElement<HTMLInputElement>('form-name');
        this.formUrl = this.getElement<HTMLInputElement>('form-url');
        this.formGradient = this.getElement<HTMLInputElement>('form-gradient');
        this.saveBtn = this.getElement<HTMLButtonElement>('save-btn');
        this.saveBtnText = document.getElementById('save-btn-text') || this.saveBtn;
        this.nameError = document.getElementById('form-name-error');
        this.urlError = document.getElementById('form-url-error');
        this.appForm = this.getElement<HTMLFormElement>('app-form');

        this.formName.addEventListener('input', () => this.clearFieldError(this.formName, this.nameError));
        this.formUrl.addEventListener('input', () => this.clearFieldError(this.formUrl, this.urlError));

        this.iconPicker.init();

        if (this.saveBtnHandler) {
            this.saveBtn.removeEventListener('click', this.saveBtnHandler);
        }
        
        this.saveBtnHandler = () => {
            this.appForm.requestSubmit();
        };
        this.saveBtn.addEventListener('click', this.saveBtnHandler);
    }

    private showFieldError(input: HTMLInputElement, errorEl: HTMLElement | null, message: string): void {
        input.classList.add('border-red-500', 'focus:ring-red-500');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.remove('hidden');
        }
    }

    private clearFieldError(input: HTMLInputElement, errorEl: HTMLElement | null, ): void {
        input.classList.remove('border-red-500', 'focus:ring-red-500');
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.classList.add('hidden');
        }
    }

    private clearValidationErrors(): void {
        this.clearFieldError(this.formName, this.nameError);
        this.clearFieldError(this.formUrl, this.urlError);
    }

    private setMode(isEdit: boolean): void {
        this.title.textContent = isEdit ? translate('modal.title.edit') : translate('modal.title.add');
        this.saveBtnText.textContent = isEdit ? translate('modal.button.update') : translate('modal.button.save');

        if (!isEdit) {
            this.formId.value = '';
        }
    }

    private setFormData(app: AppResponse): void {
        this.formName.value = app.name;
        this.formUrl.value = app.url;
        this.formGradient.value = app.gradient;

        if (app.icon) {
            this.iconPicker.selectIcon(app.icon);
        }
    }

    private getIconValue(): string {
        const icon = document.getElementById('form-icon') as HTMLInputElement | null;
        return icon?.value ?? '';
    }

    private getElement<T extends HTMLElement>(id: string): T {
        const element = document.getElementById(id);

        if (!element) {
            throw new Error(`Required form element not found: #${id}`);
        }

        return element as T;
    }
}
