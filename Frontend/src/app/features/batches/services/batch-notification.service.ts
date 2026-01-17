import { Injectable } from '@angular/core';
import { NotificationService } from '../../../shared/services/notification.service';
import { DialogService } from '../../../shared/services/dialog.service';
import { Batch } from '../models/batch.model';

@Injectable({
    providedIn: 'root'
})
export class BatchNotificationService {
    constructor(
        private notificationService: NotificationService,
        private dialogService: DialogService
    ) { }

    // Success notifications
    showBatchCreated(batch: Batch): void {
        this.notificationService.success(
            `Batch ${batch.batchNumber} has been created successfully`,
            'Batch Created'
        );
    }

    showBatchUpdated(batch: Batch): void {
        this.notificationService.success(
            `Batch ${batch.batchNumber} has been updated successfully`,
            'Batch Updated'
        );
    }

    showBatchDeleted(batchNumber: string): void {
        this.notificationService.success(
            `Batch ${batchNumber} has been deleted successfully`,
            'Batch Deleted'
        );
    }

    showQuantityAdjusted(batch: Batch, newQuantity: number): void {
        this.notificationService.success(
            `Quantity for batch ${batch.batchNumber} has been adjusted to ${newQuantity}`,
            'Quantity Adjusted'
        );
    }

    // Error notifications
    showBatchLoadError(): void {
        this.notificationService.error(
            'Failed to load batch information. Please try again.',
            'Load Error'
        );
    }

    showBatchSaveError(error?: any): void {
        const message = error?.userMessage || error?.message || 'Failed to save batch. Please check your data and try again.';
        this.notificationService.error(message, 'Save Error');
    }

    showBatchDeleteError(): void {
        this.notificationService.error(
            'Failed to delete batch. Please try again.',
            'Delete Error'
        );
    }

    showValidationError(message: string = 'Please fill in all required fields correctly'): void {
        this.notificationService.warning(message, 'Validation Error');
    }

    // Confirmation dialogs
    async confirmBatchDeletion(batch: Batch): Promise<boolean> {
        const warnings = [];

        if (batch.remainingQuantity > 0) {
            warnings.push(`This batch still has ${batch.remainingQuantity} units remaining`);
        }

        if (batch.status === 'active') {
            warnings.push('This is an active batch');
        }

        const result = await this.dialogService.confirmDelete(
            batch.batchNumber,
            'batch',
            warnings
        );

        return result.confirmed;
    }

    async confirmQuantityAdjustment(
        batch: Batch,
        adjustmentAmount: number,
        newQuantity: number
    ): Promise<boolean> {
        const isReduction = adjustmentAmount < 0;
        const message = isReduction
            ? `Remove ${Math.abs(adjustmentAmount)} units from batch ${batch.batchNumber}?`
            : `Add ${adjustmentAmount} units to batch ${batch.batchNumber}?`;

        const details = [
            `Current quantity: ${batch.remainingQuantity}`,
            `Adjustment: ${adjustmentAmount > 0 ? '+' : ''}${adjustmentAmount}`,
            `New quantity: ${newQuantity}`
        ];

        const result = await this.dialogService.confirmEnhanced({
            title: 'Confirm Quantity Adjustment',
            message,
            confirmText: 'Adjust Quantity',
            cancelText: 'Cancel',
            type: isReduction ? 'warning' : 'info',
            details
        });

        return result.confirmed;
    }

    async confirmUnsavedChanges(): Promise<boolean> {
        const result = await this.dialogService.confirmDataLoss(
            'leave this page',
            ['All unsaved batch information will be lost']
        );

        return result.confirmed;
    }

    async confirmBatchFormReset(): Promise<boolean> {
        const result = await this.dialogService.confirmEnhanced({
            title: 'Reset Form',
            message: 'Are you sure you want to reset the form? All entered data will be lost.',
            confirmText: 'Reset',
            cancelText: 'Cancel',
            type: 'warning'
        });

        return result.confirmed;
    }

    // Loading states
    showBatchLoading(message: string = 'Loading batch information...'): void {
        this.notificationService.showLoading(message);
    }

    showBatchSaving(message: string = 'Saving batch...'): void {
        this.notificationService.showLoading(message);
    }

    showBatchDeleting(message: string = 'Deleting batch...'): void {
        this.notificationService.showLoading(message);
    }

    hideLoading(): void {
        this.notificationService.hideLoading();
    }

    // Batch-specific operations with integrated loading and notifications
    async handleBatchOperation<T>(
        operation: Promise<T>,
        loadingMessage: string,
        successMessage?: string,
        errorMessage?: string
    ): Promise<T> {
        return this.notificationService.handleOperation(
            operation,
            loadingMessage,
            successMessage,
            errorMessage
        );
    }

    // Expiry warnings
    showExpiryWarning(batch: Batch, daysUntilExpiry: number): void {
        if (daysUntilExpiry <= 0) {
            this.notificationService.error(
                `Batch ${batch.batchNumber} has expired!`,
                'Expired Batch'
            );
        } else if (daysUntilExpiry <= 7) {
            this.notificationService.warning(
                `Batch ${batch.batchNumber} expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`,
                'Expiry Warning'
            );
        } else if (daysUntilExpiry <= 30) {
            this.notificationService.info(
                `Batch ${batch.batchNumber} expires in ${daysUntilExpiry} days`,
                'Expiry Notice'
            );
        }
    }

    // Batch status notifications
    showBatchStatusChange(batch: Batch, oldStatus: string, newStatus: string): void {
        this.notificationService.info(
            `Batch ${batch.batchNumber} status changed from ${oldStatus} to ${newStatus}`,
            'Status Updated'
        );
    }

    // Low stock warnings
    showLowStockWarning(batch: Batch, threshold: number): void {
        if (batch.remainingQuantity <= threshold) {
            this.notificationService.warning(
                `Batch ${batch.batchNumber} is running low (${batch.remainingQuantity} units remaining)`,
                'Low Stock Warning'
            );
        }
    }
}