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
     * Close the dialog without any action
     * 
     * @public
     * @returns {void}
     */
    onClose(): void {
        this.dialogRef.close();
    }

    /**
     * Navigate to edit dialog for the current supplier
     * 
     * Closes this dialog and signals the parent to open the edit dialog.
     * 
     * @public
     * @returns {void}
     * 
     * Requirements: 8.4
     */
    onEdit(): void {
        this.dialogRef.close({ action: 'edit', supplier: this.supplier });
    }

    /**
     * Trigger delete action for the current supplier
     * 
     * Closes this dialog and signals the parent to show delete confirmation.
     * 
     * @public
     * @returns {void}
     * 
     * Requirements: 8.4
     */
    onDelete(): void {
        this.dialogRef.close({ action: 'delete', supplier: this.supplier });
    }

    /**
     * Get chip color based on supplier type
     * 
     * Returns appropriate Material Design color for type chips.
     * 
     * @public
     * @param {string} type - The supplier type ('customer', 'supplier', 'both')
     * @returns {string} The Material Design color name
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
     * Get status chip color based on active state
     * 
     * @public
     * @param {boolean} isActive - Whether the supplier is active
     * @returns {string} The Material Design color name
     */
    getStatusChipColor(isActive: boolean): string {
        return isActive ? 'primary' : 'warn';
    }

    /**
     * Get status label text
     * 
     * @public
     * @param {boolean} isActive - Whether the supplier is active
     * @returns {string} The status label text
     */
    getStatusLabel(isActive: boolean): string {
        return isActive ? 'Active' : 'Inactive';
    }

    /**
     * Format date for display
     * 
     * Converts ISO date string to localized date format.
     * 
     * @public
     * @param {string} date - The ISO date string
     * @returns {string} Formatted date string or 'N/A' if invalid
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
     * Format currency value for display
     * 
     * @public
     * @param {number} value - The numeric value
     * @param {string} currency - The currency code (default: 'PKR')
     * @returns {string} Formatted currency string
     */
    formatCurrency(value: number, currency: string = 'PKR'): string {
        return `${currency} ${value.toLocaleString()}`;
    }

    /**
     * Check if a value exists and is not empty
     * 
     * @public
     * @param {any} value - The value to check
     * @returns {boolean} True if value exists and is not empty
     */
    hasValue(value: any): boolean {
        return value !== null && value !== undefined && value !== '';
    }
}
