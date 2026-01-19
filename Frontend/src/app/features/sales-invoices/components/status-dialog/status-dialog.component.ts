import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject } from 'rxjs';

import { SalesInvoice, InvoiceStatus, InvoiceHistory, StatusChangeRequest } from '../../models/sales-invoice.model';

export interface StatusDialogData {
    invoice: SalesInvoice;
    newStatus: InvoiceStatus;
    userPermissions: {
        canConfirm: boolean;
        canCancel: boolean;
        canEdit: boolean;
    };
}

export interface StatusDialogResult {
    statusChange: StatusChangeRequest;
    success: boolean;
}

@Component({
    selector: 'app-status-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatDividerModule,
        MatProgressSpinnerModule,
        MatTableModule,
        MatChipsModule,
        MatTooltipModule
    ],
    templateUrl: './status-dialog.component.html',
    styleUrls: ['./status-dialog.component.scss']
})
export class StatusDialogComponent implements OnInit, OnDestroy {
    statusForm!: FormGroup;
    isLoading = false;

    displayedColumns: string[] = ['date', 'action', 'previousStatus', 'newStatus', 'performedBy', 'reason'];

    private destroy$ = new Subject<void>();

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<StatusDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: StatusDialogData
    ) {
        this.initializeForm();
    }

    ngOnInit(): void {
        // Form is already initialized in constructor
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private initializeForm(): void {
        const isReasonRequired = this.data.newStatus === InvoiceStatus.CANCELLED;

        this.statusForm = this.fb.group({
            reason: [
                '',
                isReasonRequired ? [Validators.required, Validators.minLength(10)] : []
            ],
            notes: ['']
        });
    }

    get currentStatus(): InvoiceStatus {
        return this.data.invoice.status;
    }

    get newStatus(): InvoiceStatus {
        return this.data.newStatus;
    }

    get statusHistory(): InvoiceHistory[] {
        return this.data.invoice.history || [];
    }

    get canProceed(): boolean {
        const { userPermissions, newStatus } = this.data;

        switch (newStatus) {
            case InvoiceStatus.CONFIRMED:
                return userPermissions.canConfirm;
            case InvoiceStatus.CANCELLED:
                return userPermissions.canCancel;
            default:
                return false;
        }
    }

    get actionTitle(): string {
        switch (this.data.newStatus) {
            case InvoiceStatus.CONFIRMED:
                return 'Confirm Invoice';
            case InvoiceStatus.CANCELLED:
                return 'Cancel Invoice';
            default:
                return 'Change Status';
        }
    }

    get actionIcon(): string {
        switch (this.data.newStatus) {
            case InvoiceStatus.CONFIRMED:
                return 'check_circle';
            case InvoiceStatus.CANCELLED:
                return 'cancel';
            default:
                return 'edit';
        }
    }

    get actionColor(): string {
        switch (this.data.newStatus) {
            case InvoiceStatus.CONFIRMED:
                return 'success';
            case InvoiceStatus.CANCELLED:
                return 'danger';
            default:
                return 'primary';
        }
    }

    get impactWarnings(): string[] {
        const warnings: string[] = [];

        if (this.data.newStatus === InvoiceStatus.CONFIRMED) {
            warnings.push('Stock quantities will be reduced for all items in this invoice');
            warnings.push('Stock movements will be created and cannot be easily reversed');
            warnings.push('Invoice cannot be edited after confirmation');

            if (this.data.invoice.payment.remainingAmount > 0) {
                warnings.push('Customer balance will be updated with the invoice amount');
            }

            if (this.data.invoice.creditLimitExceeded) {
                warnings.push('This invoice exceeds the customer\'s credit limit');
            }
        }

        if (this.data.newStatus === InvoiceStatus.CANCELLED) {
            warnings.push('Invoice will be marked as cancelled and cannot be confirmed');
            warnings.push('Any stock movements will need to be manually reversed');
            warnings.push('Customer notifications may be sent automatically');

            if (this.data.invoice.payment.paidAmount > 0) {
                warnings.push('Existing payments will remain recorded but invoice will be cancelled');
            }
        }

        return warnings;
    }

    get validationErrors(): string[] {
        const errors: string[] = [];

        if (this.data.newStatus === InvoiceStatus.CONFIRMED) {
            // Check if invoice has items
            if (!this.data.invoice.items || this.data.invoice.items.length === 0) {
                errors.push('Invoice must have at least one item to be confirmed');
            }

            // Check if customer is selected
            if (!this.data.invoice.customerId) {
                errors.push('Customer must be selected to confirm invoice');
            }

            // Check if warehouse is selected
            if (!this.data.invoice.warehouseId) {
                errors.push('Warehouse must be selected to confirm invoice');
            }

            // Check if total is greater than zero
            if (this.data.invoice.totals.grandTotal <= 0) {
                errors.push('Invoice total must be greater than zero');
            }
        }

        return errors;
    }

    get hasValidationErrors(): boolean {
        return this.validationErrors.length > 0;
    }

    getStatusLabel(status: InvoiceStatus): string {
        switch (status) {
            case InvoiceStatus.DRAFT:
                return 'Draft';
            case InvoiceStatus.CONFIRMED:
                return 'Confirmed';
            case InvoiceStatus.CANCELLED:
                return 'Cancelled';
            default:
                return status;
        }
    }

    getStatusClass(status: InvoiceStatus): string {
        switch (status) {
            case InvoiceStatus.DRAFT:
                return 'status-draft';
            case InvoiceStatus.CONFIRMED:
                return 'status-confirmed';
            case InvoiceStatus.CANCELLED:
                return 'status-cancelled';
            default:
                return 'status-default';
        }
    }

    formatDate(date: string | Date): string {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(dateObj);
    }

    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    onSubmit(): void {
        if (this.statusForm.valid && !this.isLoading && this.canProceed && !this.hasValidationErrors) {
            this.isLoading = true;

            const formValue = this.statusForm.value;
            const statusChangeRequest: StatusChangeRequest = {
                reason: formValue.reason || undefined,
                notes: formValue.notes || undefined
            };

            // Simulate API call delay
            setTimeout(() => {
                this.isLoading = false;
                const result: StatusDialogResult = {
                    statusChange: statusChangeRequest,
                    success: true
                };
                this.dialogRef.close(result);
            }, 1000);
        }
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    // Validation error messages
    getReasonErrorMessage(): string {
        const reasonControl = this.statusForm.get('reason');
        if (reasonControl?.hasError('required')) {
            return 'Reason is required for cancelling an invoice';
        }
        if (reasonControl?.hasError('minlength')) {
            const error = reasonControl.getError('minlength');
            return `Reason must be at least ${error.requiredLength} characters long`;
        }
        return '';
    }
}