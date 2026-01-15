import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { Customer } from '../../../../core/models/customer.model';

@Component({
    selector: 'app-customer-detail-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatDividerModule
    ],
    template: `
        <div class="customer-detail-dialog">
            <div class="dialog-header">
                <h2 mat-dialog-title>
                    <mat-icon>business_center</mat-icon>
                    Customer Details
                </h2>
                <button mat-icon-button (click)="close()">
                    <mat-icon>close</mat-icon>
                </button>
            </div>

            <mat-dialog-content>
                <div class="customer-detail-content">
                    <!-- Customer Avatar Section -->
                    <div class="customer-avatar-section">
                        <div class="avatar-circle">
                            <mat-icon>business</mat-icon>
                        </div>
                        <h3 class="customer-name">{{ customer.name }}</h3>
                        <p class="customer-code">{{ customer.code }}</p>
                    </div>

                    <mat-divider></mat-divider>

                    <!-- Customer Information Grid -->
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">
                                <mat-icon>tag</mat-icon>
                                <span>Code</span>
                            </div>
                            <div class="info-value">{{ customer.code }}</div>
                        </div>

                        <div class="info-item">
                            <div class="info-label">
                                <mat-icon>person</mat-icon>
                                <span>Name</span>
                            </div>
                            <div class="info-value">{{ customer.name }}</div>
                        </div>

                        <div class="info-item" *ngIf="customer.email">
                            <div class="info-label">
                                <mat-icon>email</mat-icon>
                                <span>Email</span>
                            </div>
                            <div class="info-value">{{ customer.email }}</div>
                        </div>

                        <div class="info-item" *ngIf="customer.phone">
                            <div class="info-label">
                                <mat-icon>phone</mat-icon>
                                <span>Phone</span>
                            </div>
                            <div class="info-value">{{ customer.phone }}</div>
                        </div>

                        <div class="info-item" *ngIf="customer.address">
                            <div class="info-label">
                                <mat-icon>location_on</mat-icon>
                                <span>Address</span>
                            </div>
                            <div class="info-value">{{ customer.address }}</div>
                        </div>

                        <div class="info-item">
                            <div class="info-label">
                                <mat-icon>category</mat-icon>
                                <span>Type</span>
                            </div>
                            <div class="info-value">
                                <mat-chip class="type-chip">{{ customer.type | titlecase }}</mat-chip>
                            </div>
                        </div>

                        <div class="info-item">
                            <div class="info-label">
                                <mat-icon>toggle_on</mat-icon>
                                <span>Status</span>
                            </div>
                            <div class="info-value">
                                <mat-chip [class.active-chip]="customer.isActive" [class.inactive-chip]="!customer.isActive">
                                    {{ customer.isActive ? 'Active' : 'Inactive' }}
                                </mat-chip>
                            </div>
                        </div>

                        <div class="info-item" *ngIf="customer.creditLimit">
                            <div class="info-label">
                                <mat-icon>account_balance_wallet</mat-icon>
                                <span>Credit Limit</span>
                            </div>
                            <div class="info-value">{{ customer.creditLimit | currency }}</div>
                        </div>

                        <div class="info-item" *ngIf="customer.currentBalance">
                            <div class="info-label">
                                <mat-icon>account_balance</mat-icon>
                                <span>Current Balance</span>
                            </div>
                            <div class="info-value">{{ customer.currentBalance | currency }}</div>
                        </div>

                        <div class="info-item">
                            <div class="info-label">
                                <mat-icon>event</mat-icon>
                                <span>Created At</span>
                            </div>
                            <div class="info-value">{{ formatDate(customer.createdAt) }}</div>
                        </div>

                        <div class="info-item">
                            <div class="info-label">
                                <mat-icon>update</mat-icon>
                                <span>Last Updated</span>
                            </div>
                            <div class="info-value">{{ formatDate(customer.updatedAt) }}</div>
                        </div>

                        <div class="info-item">
                            <div class="info-label">
                                <mat-icon>fingerprint</mat-icon>
                                <span>Customer ID</span>
                            </div>
                            <div class="info-value customer-id">{{ customer._id }}</div>
                        </div>
                    </div>
                </div>
            </mat-dialog-content>

            <mat-dialog-actions align="end">
                <button mat-raised-button color="primary" (click)="close()">
                    <mat-icon>close</mat-icon>
                    Close
                </button>
            </mat-dialog-actions>
        </div>
    `,
    styleUrl: './customer-detail-dialog.component.scss'
})
export class CustomerDetailDialogComponent {
    constructor(
        private dialogRef: MatDialogRef<CustomerDetailDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public customer: Customer
    ) { }

    close(): void {
        this.dialogRef.close();
    }

    formatDate(date: string | undefined): string {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString();
    }
}