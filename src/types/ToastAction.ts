export interface ToastAction {
    label: string;
    onClick: () => void;
    icon?: string;
}