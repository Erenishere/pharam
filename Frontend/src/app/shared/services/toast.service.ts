import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon } from 'sweetalert2';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

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

    success(message: string, title: string = 'Success!'): void {
        this.show(message, 'success', title);
    }

    error(message: string, title: string = 'Error!'): void {
        this.show(message, 'error', title);
    }

    warning(message: string, title: string = 'Warning!'): void {
        this.show(message, 'warning', title);
    }

    info(message: string, title: string = 'Info'): void {
        this.show(message, 'info', title);
    }

    async confirm(
        message: string,
        title: string = 'Are you sure?',
        confirmButtonText: string = 'Yes',
        cancelButtonText: string = 'Cancel'
    ): Promise<boolean> {
        const result = await Swal.fire({
            title,
            text: message,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText,
            cancelButtonText,
            confirmButtonColor: this.customColors.primary,
            cancelButtonColor: '#6c757d',
            reverseButtons: true,
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

    private show(message: string, type: ToastType, title: string): void {
        const iconMap: Record<ToastType, SweetAlertIcon> = {
            success: 'success',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };

        Swal.fire({
            title,
            text: message,
            icon: iconMap[type],
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: type === 'error' ? 6000 : 4000,
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

    dismiss(): void {
        Swal.close();
    }
}
