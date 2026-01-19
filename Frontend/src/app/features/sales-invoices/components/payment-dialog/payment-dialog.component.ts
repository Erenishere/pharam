import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';

import { SalesInvoice, PaymentMethod, PaymentRecord, PaymentRequest } from '../../models/sales-invoice.model';

export interface PaymentDialogData {
    invoice: SalesInvoice;
    mode: 'full' | 'partial';
}

export interface PaymentDialogResult {
    payment: PaymentRequest;
    success: boolean;
}

@Component({
    selector: 'app-payment-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatButtonModule,
        MatIconModule,
        MatTableModule,
        MatCardModule,
        MatDividerModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './payment-dialog.component.html',
    styleUrls: ['./payment-dialog.component.scss']
})
export class PaymentDialogComponent implements OnInit, OnDestroy {
    paymentForm!: FormGroup;
    isLoading = false;

    paymentMethodOptions = [
        { value: PaymentMethod.CASH, label: 'Cash', icon: 'payments' },
        { value: PaymentMethod.BANK_TRANSFER, label: 'Bank Transfer', icon: 'account_balance' },
        { value: PaymentMethod.CHEQUE, label: 'Cheque', icon: 'receipt_long' },
        { value: PaymentMethod.CREDIT_CARD, label: 'Credit Card', icon: 'credit_card' },
        { value: PaymentMethod.MOBILE_PAYMENT, label: 'Mobile Payment', icon: 'smartphone' }
    ];

    displayedColumns: string[] = ['date', 'method', 'amount', 'reference', 'createdBy'];

    private destroy$ = new Subject<void>();

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<PaymentDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: PaymentDialogData
    ) {
        this.initializeForm();
    }

    ngOnInit(): void {
        this.setupFormValidation();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private initializeForm(): void {
        const maxPaymentAmount = this.data.invoice.payment.remainingAmount;
        const defaultAmount = this.data.mode === 'full' ? maxPaymentAmount : 0;

        this.paymentForm = this.fb.group({
            amount: [
                defaultAmount,
                [
                    Validators.required,
                    Validators.min(0.01),
                    Validators.max(maxPaymentAmount)
                ]
            ],
            paymentMethod: [PaymentMethod.CASH, Validators.required],
            paymentDate: [new Date(), Validators.required],
            reference: [''],
            notes: ['']
        });
    }

    private setupFormValidation(): void {
        // Custom validator for payment amount
        this.paymentForm.get('amount')?.valueChanges.pipe(
            takeUntil(this.destroy$)
        ).subscribe(amount => {
            const remainingAmount = this.data.invoice.payment.remainingAmount;
            const amountControl = this.paymentForm.get('amount');

            if (amount > remainingAmount) {
                amountControl?.setErrors({
                    ...amountControl.errors,
                    exceedsRemaining: {
                        max: remainingAmount,
                        actual: amount
                    }
                });
            } else if (amountControl?.hasError('exceedsRemaining')) {
                const errors = { ...amountControl.errors };
                delete errors['exceedsRemaining'];
                amountControl.setErrors(Object.keys(errors).length ? errors : null);
            }
        });

        // Auto-fill reference field based on payment method
        this.paymentForm.get('paymentMethod')?.valueChanges.pipe(
            takeUntil(this.destroy$)
        ).subscribe(method => {
            const referenceControl = this.paymentForm.get('reference');
            if (method === PaymentMethod.CHEQUE && !referenceControl?.value) {
                referenceControl?.setValue('CHQ-');
            } else if (method === PaymentMethod.BANK_TRANSFER && !referenceControl?.value) {
                referenceControl?.setValue('TXN-');
            }
        });
    }

    get remainingAmount(): number {
        return this.data.invoice.payment.remainingAmount;
    }

    get totalAmount(): number {
        return this.data.invoice.totals.grandTotal;
    }

    get paidAmount(): number {
        return this.data.invoice.payment.paidAmount;
    }

    get paymentHistory(): PaymentRecord[] {
        return this.data.invoice.payment.paymentHistory || [];
    }

    get newRemainingAmount(): number {
        const paymentAmount = this.paymentForm.get('amount')?.value || 0;
        return Math.max(0, this.remainingAmount - paymentAmount);
    }

    get isFullPayment(): boolean {
        const paymentAmount = this.paymentForm.get('amount')?.value || 0;
        return paymentAmount >= this.remainingAmount;
    }

    setFullPayment(): void {
        this.paymentForm.patchValue({
            amount: this.remainingAmount
        });
    }

    getPaymentMethodIcon(method: PaymentMethod): string {
        const option = this.paymentMethodOptions.find(opt => opt.value === method);
        return option?.icon || 'payment';
    }

    getPaymentMethodLabel(method: PaymentMethod): string {
        const option = this.paymentMethodOptions.find(opt => opt.value === method);
        return option?.label || method;
    }

    onSubmit(): void {
        if (this.paymentForm.valid && !this.isLoading) {
            this.isLoading = true;

            const formValue = this.paymentForm.value;
            const paymentRequest: PaymentRequest = {
                amount: formValue.amount,
                paymentMethod: formValue.paymentMethod,
                paymentDate: formValue.paymentDate,
                reference: formValue.reference || undefined,
                notes: formValue.notes || undefined
            };

            // Simulate API call delay
            setTimeout(() => {
                this.isLoading = false;
                const result: PaymentDialogResult = {
                    payment: paymentRequest,
                    success: true
                };
                this.dialogRef.close(result);
            }, 1000);
        }
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    // Helper method to format currency
    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    // Helper method to format date
    formatDate(date: string | Date): string {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(dateObj);
    }

    // Validation error messages
    getAmountErrorMessage(): string {
        const amountControl = this.paymentForm.get('amount');
        if (amountControl?.hasError('required')) {
            return 'Payment amount is required';
        }
        if (amountControl?.hasError('min')) {
            return 'Payment amount must be greater than 0';
        }
        if (amountControl?.hasError('max')) {
            return `Payment amount cannot exceed ${this.formatCurrency(this.remainingAmount)}`;
        }
        if (amountControl?.hasError('exceedsRemaining')) {
            const error = amountControl.getError('exceedsRemaining');
            return `Payment amount cannot exceed remaining balance of ${this.formatCurrency(error.max)}`;
        }
        return '';
    }
}