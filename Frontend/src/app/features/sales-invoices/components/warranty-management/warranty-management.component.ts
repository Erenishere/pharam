/**
 * Warranty Management Component
 * 
 * This component handles warranty information display, tracking,
 * expiration alerts, and warranty claim functionality.
 */

import { Component, Input, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatBadgeModule } from '@angular/material/badge';
import { Subject, takeUntil } from 'rxjs';

import { SalesInvoice, WarrantyInfo, InvoiceItem } from '../../models/sales-invoice.model';

export interface WarrantyClaimRequest {
    warrantyId: string;
    claimReason: string;
    claimDescription: string;
    claimDate: Date;
    customerReportedIssue: string;
    requestedAction: 'repair' | 'replace' | 'refund';
    attachments?: File[];
}

export interface WarrantyStatus {
    isActive: boolean;
    daysRemaining: number;
    status: 'active' | 'expiring_soon' | 'expired' | 'claimed';
    expiryDate: Date;
}

@Component({
    selector: 'app-warranty-management',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatDialogModule,
        MatSnackBarModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatChipsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatExpansionModule,
        MatBadgeModule
    ],
    templateUrl: './warranty-management.component.html',
    styleUrls: ['./warranty-management.component.scss']
})
export class WarrantyManagementComponent implements OnInit, OnDestroy {
    @Input() invoice!: SalesInvoice;
    @Input() showClaimForm = false;

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    displayedColumns: string[] = [
        'item',
        'warrantyPeriod',
        'startDate',
        'expiryDate',
        'status',
        'daysRemaining',
        'actions'
    ];

    dataSource = new MatTableDataSource<WarrantyInfo>([]);
    claimForm: FormGroup;

    isLoading = false;
    warranties: WarrantyInfo[] = [];
    expiringWarranties: WarrantyInfo[] = [];

    private destroy$ = new Subject<void>();

    constructor(
        private fb: FormBuilder,
        private dialog: MatDialog,
        private snackBar: MatSnackBar
    ) {
        this.claimForm = this.createClaimForm();
    }

    ngOnInit(): void {
        this.loadWarrantyInformation();
        this.checkExpiringWarranties();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    ngAfterViewInit(): void {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    /**
     * Create warranty claim form
     */
    private createClaimForm(): FormGroup {
        return this.fb.group({
            warrantyId: ['', Validators.required],
            claimReason: ['', Validators.required],
            claimDescription: ['', [Validators.required, Validators.minLength(10)]],
            customerReportedIssue: ['', [Validators.required, Validators.minLength(10)]],
            requestedAction: ['repair', Validators.required],
            claimDate: [new Date(), Validators.required]
        });
    }

    /**
     * Load warranty information for invoice items
     */
    loadWarrantyInformation(): void {
        this.isLoading = true;

        // In a real application, this would call a warranty service
        // For now, we'll simulate warranty data based on invoice items
        this.warranties = this.generateWarrantyData();
        this.dataSource.data = this.warranties;

        this.isLoading = false;
    }

    /**
     * Generate warranty data for invoice items
     * In a real application, this would come from the backend
     */
    private generateWarrantyData(): WarrantyInfo[] {
        return this.invoice.items
            .filter(item => this.hasWarranty(item))
            .map(item => {
                const warrantyPeriod = this.getWarrantyPeriod(item);
                const startDate = new Date(this.invoice.invoiceDate);
                const endDate = new Date(startDate);
                endDate.setMonth(endDate.getMonth() + warrantyPeriod);

                return {
                    itemId: item.itemId,
                    item: item.item,
                    warrantyPeriod,
                    warrantyStartDate: startDate,
                    warrantyEndDate: endDate,
                    warrantyTerms: this.getWarrantyTerms(item),
                    isActive: this.isWarrantyActive(endDate)
                };
            });
    }

    /**
     * Check if item has warranty
     */
    private hasWarranty(item: InvoiceItem): boolean {
        // In a real application, this would check item properties
        // For demo purposes, assume electronics and appliances have warranty
        const warrantyCategories = ['electronics', 'appliances', 'machinery', 'tools'];
        return item.item?.category ? warrantyCategories.includes(item.item.category.toLowerCase()) : false;
    }

    /**
     * Get warranty period for item (in months)
     */
    private getWarrantyPeriod(item: InvoiceItem): number {
        // In a real application, this would come from item properties
        const category = item.item?.category?.toLowerCase();
        switch (category) {
            case 'electronics':
                return 12; // 1 year
            case 'appliances':
                return 24; // 2 years
            case 'machinery':
                return 36; // 3 years
            case 'tools':
                return 6; // 6 months
            default:
                return 12;
        }
    }

    /**
     * Get warranty terms for item
     */
    private getWarrantyTerms(item: InvoiceItem): string {
        return `Manufacturer warranty covers defects in materials and workmanship. Does not cover damage due to misuse, accidents, or normal wear and tear.`;
    }

    /**
     * Check if warranty is still active
     */
    private isWarrantyActive(expiryDate: Date): boolean {
        return new Date() < expiryDate;
    }

    /**
     * Get warranty status for an item
     */
    getWarrantyStatus(warranty: WarrantyInfo): WarrantyStatus {
        const today = new Date();
        const expiryDate = new Date(warranty.warrantyEndDate);
        const daysRemaining = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let status: 'active' | 'expiring_soon' | 'expired' | 'claimed' = 'expired';

        if (daysRemaining > 30) {
            status = 'active';
        } else if (daysRemaining > 0) {
            status = 'expiring_soon';
        } else {
            status = 'expired';
        }

        return {
            isActive: warranty.isActive && daysRemaining > 0,
            daysRemaining: Math.max(0, daysRemaining),
            status,
            expiryDate
        };
    }

    /**
     * Check for expiring warranties
     */
    checkExpiringWarranties(): void {
        this.expiringWarranties = this.warranties.filter(warranty => {
            const status = this.getWarrantyStatus(warranty);
            return status.status === 'expiring_soon';
        });
    }

    /**
     * Get status chip color
     */
    getStatusColor(status: string): string {
        switch (status) {
            case 'active':
                return 'primary';
            case 'expiring_soon':
                return 'accent';
            case 'expired':
                return 'warn';
            case 'claimed':
                return '';
            default:
                return '';
        }
    }

    /**
     * Get status display text
     */
    getStatusText(warranty: WarrantyInfo): string {
        const status = this.getWarrantyStatus(warranty);
        switch (status.status) {
            case 'active':
                return 'Active';
            case 'expiring_soon':
                return 'Expiring Soon';
            case 'expired':
                return 'Expired';
            case 'claimed':
                return 'Claimed';
            default:
                return 'Unknown';
        }
    }

    /**
     * Check if warranty claim is allowed
     */
    canClaimWarranty(warranty: WarrantyInfo): boolean {
        const status = this.getWarrantyStatus(warranty);
        return status.isActive && status.status !== 'claimed';
    }

    /**
     * Open warranty claim dialog
     */
    openClaimDialog(warranty: WarrantyInfo): void {
        this.claimForm.patchValue({
            warrantyId: warranty.itemId,
            claimDate: new Date()
        });
        this.showClaimForm = true;
    }

    /**
     * Submit warranty claim
     */
    submitClaim(): void {
        if (this.claimForm.invalid) {
            this.markFormGroupTouched();
            return;
        }

        this.isLoading = true;
        const formValue = this.claimForm.value;

        // In a real application, this would call a warranty service
        setTimeout(() => {
            this.showSuccess('Warranty claim submitted successfully! You will receive a confirmation email shortly.');
            this.showClaimForm = false;
            this.claimForm.reset();
            this.isLoading = false;
        }, 2000);
    }

    /**
     * Cancel warranty claim
     */
    cancelClaim(): void {
        this.showClaimForm = false;
        this.claimForm.reset();
    }

    /**
     * Download warranty certificate
     */
    downloadWarrantyCertificate(warranty: WarrantyInfo): void {
        // In a real application, this would generate and download a warranty certificate
        this.showSuccess('Warranty certificate download started.');
    }

    /**
     * View warranty terms and conditions
     */
    viewWarrantyTerms(warranty: WarrantyInfo): void {
        // In a real application, this would open a dialog with full terms
        this.showInfo('Warranty terms: ' + warranty.warrantyTerms);
    }

    /**
     * Get warranty alert message
     */
    getWarrantyAlertMessage(): string {
        if (this.expiringWarranties.length === 0) {
            return '';
        }

        if (this.expiringWarranties.length === 1) {
            return `1 warranty is expiring soon`;
        }

        return `${this.expiringWarranties.length} warranties are expiring soon`;
    }

    /**
     * Mark all form controls as touched
     */
    private markFormGroupTouched(): void {
        Object.keys(this.claimForm.controls).forEach(key => {
            const control = this.claimForm.get(key);
            control?.markAsTouched();
        });
    }

    /**
     * Show success message
     */
    private showSuccess(message: string): void {
        this.snackBar.open(message, 'Close', {
            duration: 5000,
            panelClass: ['success-snackbar']
        });
    }

    /**
     * Show info message
     */
    private showInfo(message: string): void {
        this.snackBar.open(message, 'Close', {
            duration: 8000,
            panelClass: ['info-snackbar']
        });
    }

    /**
     * Show error message
     */
    private showError(message: string): void {
        this.snackBar.open(message, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
        });
    }
}