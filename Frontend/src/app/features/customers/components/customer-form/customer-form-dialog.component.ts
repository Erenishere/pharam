import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CustomerService } from '../../services/customer.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { Customer, CustomerType, CustomerCreateRequest, CustomerUpdateRequest } from '../../../../core/models/customer.model';

@Component({
    selector: 'app-customer-form-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatInputModule,
        MatSelectModule,
        MatSlideToggleModule,
        MatIconModule,
        MatProgressSpinnerModule
    ],
    template: `
        <div class="customer-form-dialog">
            <div class="dialog-header">
                <h2 mat-dialog-title>
                    <mat-icon>{{ isEditMode ? 'edit' : 'business_center' }}</mat-icon>
                    {{ isEditMode ? 'Edit Customer' : 'Create New Customer' }}
                </h2>
                <button mat-icon-button mat-dialog-close>
                    <mat-icon>close</mat-icon>
                </button>
            </div>

            <mat-dialog-content>
                <form [formGroup]="customerForm" class="customer-form">
                    <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Customer Code</mat-label>
                        <input matInput formControlName="code" placeholder="Enter customer code" required>
                        <mat-icon matPrefix>tag</mat-icon>
                        <mat-error *ngIf="customerForm.get('code')?.hasError('required')">
                            Customer code is required
                        </mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Customer Name</mat-label>
                        <input matInput formControlName="name" placeholder="Enter customer name" required>
                        <mat-icon matPrefix>person</mat-icon>
                        <mat-error *ngIf="customerForm.get('name')?.hasError('required')">
                            Customer name is required
                        </mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Email</mat-label>
                        <input matInput type="email" formControlName="email" placeholder="Enter email">
                        <mat-icon matPrefix>email</mat-icon>
                        <mat-error *ngIf="customerForm.get('email')?.hasError('email')">
                            Please enter a valid email
                        </mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Phone</mat-label>
                        <input matInput formControlName="phone" placeholder="Enter phone number">
                        <mat-icon matPrefix>phone</mat-icon>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Address</mat-label>
                        <textarea matInput formControlName="address" placeholder="Enter address" rows="3"></textarea>
                        <mat-icon matPrefix>location_on</mat-icon>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Customer Type</mat-label>
                        <mat-select formControlName="type" required>
                            <mat-option *ngFor="let type of types" [value]="type.value">
                                <mat-icon>{{ type.icon }}</mat-icon>
                                {{ type.label }}
                            </mat-option>
                        </mat-select>
                        <mat-icon matPrefix>category</mat-icon>
                        <mat-error *ngIf="customerForm.get('type')?.hasError('required')">
                            Customer type is required
                        </mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Credit Limit</mat-label>
                        <input matInput type="number" formControlName="creditLimit" placeholder="Enter credit limit">
                        <mat-icon matPrefix>account_balance_wallet</mat-icon>
                    </mat-form-field>

                    <div class="status-toggle">
                        <mat-slide-toggle formControlName="isActive" color="primary">
                            <span class="toggle-label">
                                <mat-icon>{{ customerForm.get('isActive')?.value ? 'check_circle' : 'cancel' }}</mat-icon>
                                {{ customerForm.get('isActive')?.value ? 'Active' : 'Inactive' }}
                            </span>
                        </mat-slide-toggle>
                    </div>
                </form>
            </mat-dialog-content>

            <mat-dialog-actions align="end">
                <button mat-button mat-dialog-close [disabled]="saving">
                    Cancel
                </button>
                <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="customerForm.invalid || saving">
                    <mat-spinner *ngIf="saving" diameter="20"></mat-spinner>
                    <mat-icon *ngIf="!saving">{{ isEditMode ? 'save' : 'add' }}</mat-icon>
                    {{ saving ? 'Saving...' : (isEditMode ? 'Update' : 'Create') }}
                </button>
            </mat-dialog-actions>
        </div>
    `,
    styleUrl: './customer-form-dialog.component.scss'
})
export class CustomerFormDialogComponent implements OnInit {
    customerForm!: FormGroup;
    isEditMode = false;
    saving = false;

    types = [
        { value: CustomerType.REGULAR, label: 'Regular', icon: 'person' },
        { value: CustomerType.WHOLESALE, label: 'Wholesale', icon: 'business' },
        { value: CustomerType.RETAIL, label: 'Retail', icon: 'store' },
        { value: CustomerType.DISTRIBUTOR, label: 'Distributor', icon: 'local_shipping' }
    ];

    constructor(
        private fb: FormBuilder,
        private customerService: CustomerService,
        private toastService: ToastService,
        private dialogRef: MatDialogRef<CustomerFormDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { customer: Customer | null }
    ) {
        this.isEditMode = !!data.customer;
    }

    ngOnInit(): void {
        this.initializeForm();
    }

    private initializeForm(): void {
        this.customerForm = this.fb.group({
            code: [this.data.customer?.code || '', [Validators.required]],
            name: [this.data.customer?.name || '', [Validators.required]],
            email: [this.data.customer?.email || '', [Validators.email]],
            phone: [this.data.customer?.phone || ''],
            address: [this.data.customer?.address || ''],
            type: [this.data.customer?.type || CustomerType.REGULAR, [Validators.required]],
            creditLimit: [this.data.customer?.creditLimit || 0],
            isActive: [this.data.customer?.isActive ?? true]
        });
    }

    onSubmit(): void {
        if (this.customerForm.valid) {
            this.saving = true;

            const formData = this.customerForm.value;

            if (this.isEditMode) {
                const updateData: CustomerUpdateRequest = formData;
                this.customerService.updateCustomer(this.data.customer!._id, updateData)
                    .subscribe({
                        next: (response) => {
                            if (response.success) {
                                this.dialogRef.close(response.data);
                            }
                            this.saving = false;
                        },
                        error: (error) => {
                            this.toastService.error(error.userMessage || 'Failed to update customer');
                            this.saving = false;
                        }
                    });
            } else {
                const createData: CustomerCreateRequest = formData;
                this.customerService.createCustomer(createData)
                    .subscribe({
                        next: (response) => {
                            if (response.success) {
                                this.dialogRef.close(response.data);
                            }
                            this.saving = false;
                        },
                        error: (error) => {
                            this.toastService.error(error.userMessage || 'Failed to create customer');
                            this.saving = false;
                        }
                    });
            }
        }
    }
}