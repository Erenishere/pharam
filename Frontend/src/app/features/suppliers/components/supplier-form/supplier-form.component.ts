import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { SupplierService } from '../../services/supplier.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { Supplier, SupplierFormData } from '../../models/supplier.model';

/**
 * Supplier Form Component
 * 
 * Dialog component for creating and editing suppliers.
 * Provides a reactive form with validation for all supplier fields.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */
@Component({
    selector: 'app-supplier-form',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatCheckboxModule,
        MatDividerModule
    ],
    templateUrl: './supplier-form.component.html',
    styleUrl: './supplier-form.component.scss'
})
export class SupplierFormComponent implements OnInit {
    supplierForm: FormGroup;
    isEditMode = false;
    loading = false;
    error: string | null = null;

    // Dropdown options
    types = [
        { value: 'customer', label: 'Customer' },
        { value: 'supplier', label: 'Supplier' },
        { value: 'both', label: 'Both' }
    ];

    currencies = ['PKR', 'USD', 'EUR', 'GBP'];
    advanceTaxRates = [0, 0.5, 2.5];

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<SupplierFormComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { supplier?: Supplier },
        private supplierService: SupplierService,
        private toastService: ToastService
    ) {
        this.supplierForm = this.createForm();
    }

    ngOnInit(): void {
        if (this.data?.supplier) {
            this.isEditMode = true;
            this.populateForm(this.data.supplier);
        }
    }

    /**
     * Create the reactive form with validation
     * Requirements: 3.2, 3.3, 3.4, 3.5
     */
    private createForm(): FormGroup {
        return this.fb.group({
            code: [''],
            name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
            type: ['supplier', Validators.required],
            contactInfo: this.fb.group({
                phone: ['', Validators.maxLength(20)],
                email: ['', [Validators.email]],
                address: ['', Validators.maxLength(500)],
                city: ['', Validators.maxLength(100)],
                country: ['Pakistan', Validators.maxLength(100)]
            }),
            financialInfo: this.fb.group({
                creditLimit: [0, [Validators.min(0)]],
                paymentTerms: [30, [Validators.min(0), Validators.max(365)]],
                taxNumber: ['', Validators.maxLength(50)],
                licenseNo: ['', Validators.maxLength(50)],
                srbNo: ['', Validators.maxLength(50)],
                ntn: ['', Validators.maxLength(50)],
                strn: ['', Validators.maxLength(50)],
                nicNumber: ['', Validators.maxLength(20)],
                whtPercent: [0, [Validators.min(0), Validators.max(100)]],
                creditDays: [0, [Validators.min(0), Validators.max(365)]],
                currency: ['PKR'],
                advanceTaxRate: [0],
                isNonFiler: [false]
            }),
            route: ['', Validators.maxLength(100)]
        });
    }

    /**
     * Populate form with existing supplier data for edit mode
     */
    private populateForm(supplier: Supplier): void {
        this.supplierForm.patchValue({
            code: supplier.code,
            name: supplier.name,
            type: supplier.type,
            contactInfo: {
                phone: supplier.contactInfo?.phone || '',
                email: supplier.contactInfo?.email || '',
                address: supplier.contactInfo?.address || '',
                city: supplier.contactInfo?.city || '',
                country: supplier.contactInfo?.country || 'Pakistan'
            },
            financialInfo: {
                creditLimit: supplier.financialInfo?.creditLimit || 0,
                paymentTerms: supplier.financialInfo?.paymentTerms || 30,
                taxNumber: supplier.financialInfo?.taxNumber || '',
                licenseNo: supplier.financialInfo?.licenseNo || '',
                srbNo: supplier.financialInfo?.srbNo || '',
                ntn: supplier.financialInfo?.ntn || '',
                strn: supplier.financialInfo?.strn || '',
                nicNumber: supplier.financialInfo?.nicNumber || '',
                whtPercent: supplier.financialInfo?.whtPercent || 0,
                creditDays: supplier.financialInfo?.creditDays || 0,
                currency: supplier.financialInfo?.currency || 'PKR',
                advanceTaxRate: supplier.financialInfo?.advanceTaxRate || 0,
                isNonFiler: supplier.financialInfo?.isNonFiler || false
            },
            route: supplier.route || ''
        });
    }

    /**
     * Handle form submission
     * Requirements: 3.6, 3.7, 3.8
     */
    onSubmit(): void {
        // Mark all fields as touched to show validation errors
        if (this.supplierForm.invalid) {
            this.supplierForm.markAllAsTouched();
            this.toastService.error('Please fix the validation errors before submitting');
            return;
        }

        this.loading = true;
        this.error = null;
        const formData: SupplierFormData = this.supplierForm.value;

        const operation = this.isEditMode
            ? this.supplierService.updateSupplier(this.data.supplier!._id, formData)
            : this.supplierService.createSupplier(formData);

        operation.subscribe({
            next: (response) => {
                if (response.success) {
                    this.toastService.success(
                        `Supplier ${this.isEditMode ? 'updated' : 'created'} successfully`
                    );
                    this.dialogRef.close({ success: true, supplier: response.data });
                } else {
                    this.error = 'Operation failed';
                    this.toastService.error(this.error);
                    this.loading = false;
                }
            },
            error: (error) => {
                this.loading = false;
                this.error = this.getUserFriendlyErrorMessage(error);
                this.toastService.error(this.error);
            }
        });
    }

    /**
     * Get user-friendly error message based on error type
     * Requirements: 3.8, 4.7, 12.5
     */
    private getUserFriendlyErrorMessage(error: any): string {
        // Network errors
        if (!navigator.onLine) {
            return 'No internet connection. Please check your network and try again.';
        }

        // Check for specific HTTP status codes
        if (error.originalError?.status) {
            const status = error.originalError.status;

            switch (status) {
                case 0:
                    return 'Unable to connect to the server. Please check your internet connection.';
                case 400:
                    return error.message || 'Invalid data. Please check your input and try again.';
                case 401:
                    return 'Your session has expired. Please log in again.';
                case 403:
                    return 'You do not have permission to perform this action.';
                case 409:
                    return error.message || 'A supplier with this code already exists.';
                case 422:
                    return error.message || 'Validation failed. Please check your input.';
                case 500:
                    return 'A server error occurred. Please try again later.';
                case 503:
                    return 'The service is temporarily unavailable. Please try again later.';
                default:
                    if (status >= 500) {
                        return 'A server error occurred. Please try again later.';
                    }
            }
        }

        // Use error message if available
        if (error.message) {
            return error.message;
        }

        // Default fallback message
        const action = this.isEditMode ? 'updating' : 'creating';
        return `An error occurred while ${action} the supplier. Please try again.`;
    }

    /**
     * Handle cancel button click
     */
    onCancel(): void {
        this.dialogRef.close({ success: false });
    }

    /**
     * Get form control for template access
     */
    getControl(path: string) {
        return this.supplierForm.get(path);
    }

    /**
     * Check if a field has an error
     */
    hasError(path: string, errorType: string): boolean {
        const control = this.supplierForm.get(path);
        return !!(control && control.hasError(errorType) && (control.dirty || control.touched));
    }

    /**
     * Get error message for a field
     */
    getErrorMessage(path: string): string {
        const control = this.supplierForm.get(path);
        if (!control || !control.errors) {
            return '';
        }

        if (control.hasError('required')) {
            return 'This field is required';
        }
        if (control.hasError('minlength')) {
            const minLength = control.errors['minlength'].requiredLength;
            return `Minimum length is ${minLength} characters`;
        }
        if (control.hasError('maxlength')) {
            const maxLength = control.errors['maxlength'].requiredLength;
            return `Maximum length is ${maxLength} characters`;
        }
        if (control.hasError('email')) {
            return 'Please enter a valid email address';
        }
        if (control.hasError('min')) {
            const min = control.errors['min'].min;
            return `Minimum value is ${min}`;
        }
        if (control.hasError('max')) {
            const max = control.errors['max'].max;
            return `Maximum value is ${max}`;
        }

        return 'Invalid value';
    }
}
