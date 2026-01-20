import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { ToastService, ToastType, NotificationOptions } from './toast.service';
import { LoadingService } from './loading.service';

export interface NotificationState {
    isLoading: boolean;
    loadingMessage?: string;
    activeNotifications: ActiveNotification[];
}

export interface ActiveNotification {
    id: string;
    type: ToastType;
    message: string;
    title?: string;
    timestamp: Date;
    persistent?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private notificationStateSubject = new BehaviorSubject<NotificationState>({
        isLoading: false,
        activeNotifications: []
    });

    public notificationState$ = this.notificationStateSubject.asObservable();
    private activeNotifications: ActiveNotification[] = [];

    constructor(
        private toastService: ToastService,
        private loadingService: LoadingService
    ) {
        // Subscribe to loading state changes
        this.loadingService.loading$.subscribe(isLoading => {
            this.updateNotificationState({ isLoading });
        });
    }

    /**
     * Show success notification
     */
    success(message: string, title?: string, options?: NotificationOptions): void {
        this.addNotification('success', message, title);
        this.toastService.success(message, title, options);
    }

    /**
     * Show error notification
     */
    error(message: string, title?: string, options?: NotificationOptions): void {
        this.addNotification('error', message, title);
        this.toastService.error(message, title, options);
    }

    /**
     * Show warning notification
     */
    warning(message: string, title?: string, options?: NotificationOptions): void {
        this.addNotification('warning', message, title);
        this.toastService.warning(message, title, options);
    }

    /**
     * Show info notification
     */
    info(message: string, title?: string, options?: NotificationOptions): void {
        this.addNotification('info', message, title);
        this.toastService.info(message, title, options);
    }

    /**
     * Show loading notification
     */
    showLoading(message: string = 'Loading...', title?: string): void {
        this.updateNotificationState({
            isLoading: true,
            loadingMessage: message
        });
        this.toastService.showLoading(message, title);
    }

    /**
     * Update loading message
     */
    updateLoading(message: string): void {
        this.updateNotificationState({ loadingMessage: message });
        this.toastService.updateLoading(message);
    }

    /**
     * Hide loading notification
     */
    hideLoading(): void {
        this.updateNotificationState({
            isLoading: false,
            loadingMessage: undefined
        });
        this.toastService.dismiss();
    }

    /**
     * Show confirmation dialog
     */
    async confirm(
        message: string,
        title?: string,
        confirmText?: string,
        cancelText?: string,
        type?: 'warning' | 'question'
    ): Promise<boolean> {
        return this.toastService.confirm(message, title, confirmText, cancelText, type);
    }

    /**
     * Show delete confirmation dialog
     */
    async confirmDelete(itemName: string, additionalMessage?: string): Promise<boolean> {
        return this.toastService.confirmDelete(itemName, additionalMessage);
    }

    /**
     * Show persistent notification that requires user action
     */
    async showPersistent(
        message: string,
        type: ToastType,
        title?: string,
        options?: NotificationOptions
    ): Promise<boolean> {
        const notification = this.addNotification(type, message, title, true);
        const result = await this.toastService.showPersistent(message, type, title, options);
        this.removeNotification(notification.id);
        return result;
    }

    /**
     * Handle API operation with loading and result notifications
     */
    async handleOperation<T>(
        operation: Promise<T>,
        loadingMessage: string = 'Processing...',
        successMessage?: string,
        errorMessage?: string
    ): Promise<T> {
        try {
            this.showLoading(loadingMessage);
            const result = await operation;
            this.hideLoading();

            if (successMessage) {
                this.success(successMessage);
            }

            return result;
        } catch (error: any) {
            this.hideLoading();
            const message = errorMessage || error?.userMessage || error?.message || 'Operation failed';
            this.error(message);
            throw error;
        }
    }

    /**
     * Clear all notifications
     */
    clearAll(): void {
        this.activeNotifications = [];
        this.updateNotificationState({ activeNotifications: [] });
        this.toastService.dismiss();
    }

    /**
     * Get current notification state
     */
    getCurrentState(): NotificationState {
        return this.notificationStateSubject.value;
    }

    private addNotification(
        type: ToastType,
        message: string,
        title?: string,
        persistent: boolean = false
    ): ActiveNotification {
        const notification: ActiveNotification = {
            id: this.generateId(),
            type,
            message,
            title,
            timestamp: new Date(),
            persistent
        };

        this.activeNotifications.push(notification);
        this.updateNotificationState({ activeNotifications: [...this.activeNotifications] });

        return notification;
    }

    private removeNotification(id: string): void {
        this.activeNotifications = this.activeNotifications.filter(n => n.id !== id);
        this.updateNotificationState({ activeNotifications: [...this.activeNotifications] });
    }

    private updateNotificationState(updates: Partial<NotificationState>): void {
        const currentState = this.notificationStateSubject.value;
        const newState = { ...currentState, ...updates };
        this.notificationStateSubject.next(newState);
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }
}