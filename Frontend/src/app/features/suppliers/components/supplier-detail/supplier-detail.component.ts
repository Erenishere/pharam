import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { Supplier } from '../../models/supplier.model';

/**
 * Supplier Detail Component
 * 
 * Displays detailed information about a supplier in a dialog.
 * Organized into sections: Basic Info, Contact Info, and Financial Info.
 * Provides actions to edit or delete the supplier.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */
@Component({
    selector: 'app-supplier-detail',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatTabsModule,
        MatChipsModule,
        MatDividerModule
    ],
    templateUrl: './supplier-detail.component.html',
    styleUrl: './supplier-detail.component.scss'
})
export class SupplierDetailComponent {
    supplier: Supplier;
    canEdit: boolean;
    canDelete: boolean;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: {
            supplier: Supplier,
            canEdit: boolean,
            canDelete: boolean
        },
        private dialogRef: MatDialogRef<SupplierDetailComponent>
    ) {
        this.supplier = data.supplier;
        this.canEdit = data.canEdit || false;
        this.canDelete = data.canDelete || false;
    }

    /**
     * Close the dialog
     */
    onClose(): void {
        this.dialogRef.close();
    }

    /**
     * Navigate to edit dialog
     * Requirements: 8.4
     */
    onEdit(): void {
        this.dialogRef.close({ action: 'edit', supplier: this.supplier });
    }

    /**
     * Trigger delete action
     * Requirements: 8.4
     */
    onDelete(): void {
        this.dialogRef.close({ action: 'delete', supplier: this.supplier });
    }

    /**
     * Get chip color based on supplier type
     */
    getTypeChipColor(type: string): string {
        switch (type) {
            case 'customer':
                return 'primary';
            case 'supplier':
                return 'accent';
            case 'both':
                return 'warn';
            default:
                return '';
        }
    }

    /**
     * Get status chip color
     */
    getStatusChipColor(isActive: boolean): string {
        return isActive ? 'primary' : 'warn';
    }

    /**
     * Get status label
     */
    getStatusLabel(isActive: boolean): string {
        return isActive ? 'Active' : 'Inactive';
    }

    /**
     * Format date for display
     */
    formatDate(date: string): string {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    /**
     * Format currency value
     */
    formatCurrency(value: number, currency: string = 'PKR'): string {
        return `${currency} ${value.toLocaleString()}`;
    }

    /**
     * Check if value exists and is not empty
     */
    hasValue(value: any): boolean {
        return value !== null && value !== undefined && value !== '';
    }
}
