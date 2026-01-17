import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon } from 'sweetalert2';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationOptions {
    title?: string;
    duration?: number;
    position?: 'top' | 'top-start' | 'top-end' | 'center' | 'center-start' | 'center-end' | 'bottom' | 'bottom-start' | 'bottom-end';
    showConfirmButton?: boolean;
    showCancelButton?: boolean;
    confirmButtonText?: string;
    cancelButtonText?: string;
    allowOutsideClick?: boolean;
    allowEscapeKey?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class ToastService {
    private readonly customColors = {
        primary: '#867cf0',
        text: '#444050',
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };

    constructor() { }

    success(message: string, title: string = 'Success!', options?: NotificationOptions): void {
        this.show(message, 'success', title, options);
    }

    error(message: string, title: string = 'Error!', options?: NotificationOptions): void {
        this.show(message, 'error', title, { duration: 6000, ...options });
    }

    warning(message: string, title: string = 'Warning!', options?: NotificationOptions): void {
        this.show(message, 'warning', title, options);
    }

    info(message: string, title: string = 'Info', options?: NotificationOptions): void {
        this.show(message, 'info', title, options);
    }

    /**
     * Show a loading notification that can be updated or dismissed
     */
    showLoading(message: string = 'Loading...', title: string = 'Please wait'): void {
        Swal.fire({
            title,
            text: message,
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            },
            customClass: {
                popup: 'custom-swal-loading',
                title: 'custom-swal-title',
                htmlContainer: 'custom-swal-text'
            }
        });
    }

    /**
     * Update the loading message
     */
    updateLoading(message: string): void {
        Swal.update({
            text: message
        });
    }

    /**
     * Show confirmation dialog for destructive actions
     */
    async confirm(
        message: string,
        title: string = 'Are you sure?',
        confirmButtonText: string = 'Yes',
        cancelButtonText: string = 'Cancel',
        type: 'warning' | 'question' = 'question'
    ): Promise<boolean> {
        const result = await Swal.fire({
            title,
            text: message,
            icon: type,
            showCancelButton: true,
            confirmButtonText,
            cancelButtonText,
            confirmButtonColor: type === 'warning' ? this.customColors.error : this.customColors.primary,
            cancelButtonColor: '#6c757d',
            reverseButtons: true,
            focusCancel: type === 'warning',
            customClass: {
                popup: 'custom-swal-popup',
                title: 'custom-swal-title',
                htmlContainer: 'custom-swal-text',
                confirmButton: 'custom-swal-confirm',
                cancelButton: 'custom-swal-cancel'
            }
        });

        return result.isConfirmed;
    }

    /**
     * Show confirmation dialog specifically for delete operations
     */
    async confirmDelete(
        itemName: string,
        additionalMessage?: string
    ): Promise<boolean> {
        const message = additionalMessage
            ? `This will permanently delete "${itemName}". ${additionalMessage}`
            : `This will permanently delete "${itemName}". This action cannot be undone.`;

        return this.confirm(
            message,
            'Delete Confirmation',
            'Delete',
            'Cancel',
            'warning'
        );
    }

    /**
     * Show a persistent notification that requires user action
     */
    async showPersistent(
        message: string,
        type: ToastType,
        title?: string,
        options?: NotificationOptions
    ): Promise<boolean> {
        const iconMap: Record<ToastType, SweetAlertIcon> = {
            success: 'success',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };

        const result = await Swal.fire({
            title: title || this.getDefaultTitle(type),
            text: message,
            icon: iconMap[type],
            showConfirmButton: options?.showConfirmButton ?? true,
            showCancelButton: options?.showCancelButton ?? false,
            confirmButtonText: options?.confirmButtonText ?? 'OK',
            cancelButtonText: options?.cancelButtonText ?? 'Cancel',
            allowOutsideClick: options?.allowOutsideClick ?? true,
            allowEscapeKey: options?.allowEscapeKey ?? true,
            customClass: {
                popup: 'custom-swal-popup',
                title: 'custom-swal-title',
                htmlContainer: 'custom-swal-text',
                confirmButton: 'custom-swal-confirm',
                cancelButton: 'custom-swal-cancel'
            }
        });

        return result.isConfirmed;
    }

    private show(message: string, type: ToastType, title: string, options?: NotificationOptions): void {
        const iconMap: Record<ToastType, SweetAlertIcon> = {
            success: 'success',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };

        const defaultDuration = type === 'error' ? 6000 : 4000;

        Swal.fire({
            title,
            text: message,
            icon: iconMap[type],
            toast: true,
            position: options?.position || 'top-end',
            showConfirmButton: options?.showConfirmButton ?? false,
            timer: options?.duration ?? defaultDuration,
            timerProgressBar: true,
            customClass: {
                popup: 'custom-swal-toast',
                title: 'custom-swal-toast-title',
                htmlContainer: 'custom-swal-toast-text',
                timerProgressBar: 'custom-swal-timer-bar'
            },
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
            }
        });
    }

    private getDefaultTitle(type: ToastType): string {
        const titles = {
            success: 'Success!',
            error: 'Error!',
            warning: 'Warning!',
            info: 'Information'
        };
        return titles[type];
    }

    /**
     * Dismiss all active notifications
     */
    dismiss(): void {
        Swal.close();
    }

    /**
     * Check if any notification is currently active
     */
    isActive(): boolean {
        return Swal.isVisible();
    }
}
