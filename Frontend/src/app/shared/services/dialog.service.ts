import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import {
    EnhancedConfirmDialogComponent,
    EnhancedConfirmDialogData,
    EnhancedConfirmDialogResult
} from '../components/enhanced-confirm-dialog/enhanced-confirm-dialog.component';
import {
    ConfirmDialogComponent,
    ConfirmDialogData
} from '../components/confirm-dialog/confirm-dialog.component';

@Injectable({
    providedIn: 'root'
})
export class DialogService {
    constructor(private dialog: MatDialog) { }

    /**
     * Show a simple confirmation dialog
     */
    confirm(
        title: string,
        message: string,
        confirmText: string = 'Confirm',
        cancelText: string = 'Cancel',
        confirmColor: 'primary' | 'accent' | 'warn' = 'primary'
    ): Observable<boolean> {
        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
            width: '400px',
            data: {
                title,
                message,
                confirmText,
                cancelText,
                confirmColor
            } as ConfirmDialogData,
            disableClose: true
        });

        return dialogRef.afterClosed();
    }

    /**
     * Show an enhanced confirmation dialog with additional features
     */
    confirmEnhanced(data: EnhancedConfirmDialogData): Observable<EnhancedConfirmDialogResult> {
        const dialogRef = this.dialog.open(EnhancedConfirmDialogComponent, {
            width: '500px',
            maxWidth: '90vw',
            data,
            disableClose: true
        });

        return dialogRef.afterClosed();
    }

    /**
     * Show a delete confirmation dialog
     */
    confirmDelete(
        itemName: string,
        itemType: string = 'item',
        additionalWarnings?: string[]
    ): Observable<EnhancedConfirmDialogResult> {
        const data: EnhancedConfirmDialogData = {
            title: `Delete ${itemType}`,
            message: `Are you sure you want to delete "${itemName}"?`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            confirmColor: 'warn',
            type: 'warning',
            showCheckbox: true,
            checkboxText: 'I understand this action cannot be undone',
            checkboxRequired: true,
            details: [
                'This action is permanent and cannot be undone',
                `The ${itemType} "${itemName}" will be completely removed`,
                ...(additionalWarnings || [])
            ]
        };

        return this.confirmEnhanced(data);
    }

    /**
     * Show a batch operation confirmation dialog
     */
    confirmBatchOperation(
        operation: string,
        itemCount: number,
        itemType: string = 'items'
    ): Observable<EnhancedConfirmDialogResult> {
        const data: EnhancedConfirmDialogData = {
            title: `${operation} Multiple ${itemType}`,
            message: `Are you sure you want to ${operation.toLowerCase()} ${itemCount} ${itemType}?`,
            confirmText: operation,
            cancelText: 'Cancel',
            confirmColor: operation.toLowerCase().includes('delete') ? 'warn' : 'primary',
            type: operation.toLowerCase().includes('delete') ? 'warning' : 'info',
            showCheckbox: operation.toLowerCase().includes('delete'),
            checkboxText: 'I understand this will affect multiple items',
            checkboxRequired: operation.toLowerCase().includes('delete'),
            details: [
                `This will ${operation.toLowerCase()} ${itemCount} ${itemType}`,
                'Please review your selection before proceeding'
            ]
        };

        return this.confirmEnhanced(data);
    }

    /**
     * Show a data loss warning dialog
     */
    confirmDataLoss(
        action: string,
        unsavedChanges?: string[]
    ): Observable<EnhancedConfirmDialogResult> {
        const data: EnhancedConfirmDialogData = {
            title: 'Unsaved Changes',
            message: `You have unsaved changes. Are you sure you want to ${action}?`,
            confirmText: action,
            cancelText: 'Cancel',
            confirmColor: 'warn',
            type: 'warning',
            details: [
                'Your changes will be lost if you continue',
                ...(unsavedChanges || ['All form data will be discarded'])
            ]
        };

        return this.confirmEnhanced(data);
    }

    /**
     * Show an information dialog
     */
    showInfo(
        title: string,
        message: string,
        details?: string[],
        buttonText: string = 'OK'
    ): Observable<EnhancedConfirmDialogResult> {
        const data: EnhancedConfirmDialogData = {
            title,
            message,
            confirmText: buttonText,
            type: 'info',
            details
        };

        return this.confirmEnhanced(data);
    }

    /**
     * Show a success dialog
     */
    showSuccess(
        title: string,
        message: string,
        details?: string[],
        buttonText: string = 'OK'
    ): Observable<EnhancedConfirmDialogResult> {
        const data: EnhancedConfirmDialogData = {
            title,
            message,
            confirmText: buttonText,
            type: 'success',
            details
        };

        return this.confirmEnhanced(data);
    }

    /**
     * Show an error dialog
     */
    showError(
        title: string,
        message: string,
        details?: string[],
        buttonText: string = 'OK'
    ): Observable<EnhancedConfirmDialogResult> {
        const data: EnhancedConfirmDialogData = {
            title,
            message,
            confirmText: buttonText,
            type: 'error',
            details
        };

        return this.confirmEnhanced(data);
    }

    /**
     * Close all open dialogs
     */
    closeAll(): void {
        this.dialog.closeAll();
    }

    /**
     * Check if any dialog is currently open
     */
    hasOpenDialogs(): boolean {
        return this.dialog.openDialogs.length > 0;
    }
}