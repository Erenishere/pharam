import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';

interface Item {
    _id: string;
    code: string;
    name: string;
    description?: string;
    category: string;
    unit: string;
    pricing: {
        costPrice: number;
        salePrice: number;
        currency: string;
    };
    tax?: {
        gstRate: number;
        whtRate: number;
        taxCategory: string;
    };
    inventory: {
        currentStock: number;
        minimumStock: number;
        maximumStock: number;
    };
    barcode?: string;
    packSize?: number;
    defaultWarrantyMonths?: number;
    defaultWarrantyDetails?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

@Component({
    selector: 'app-item-detail-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatDividerModule
    ],
    templateUrl: './item-detail-dialog.component.html',
    styleUrls: ['./item-detail-dialog.component.scss']
})
export class ItemDetailDialogComponent {
    constructor(
        private dialogRef: MatDialogRef<ItemDetailDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public item: Item
    ) { }

    formatDate(date: string | undefined): string {
        if (!date) return 'N/A';
        return new Date(date).toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatCurrency(amount: number, currency: string = 'PKR'): string {
        return `${currency} ${amount.toFixed(2)}`;
    }

    getStockStatus(): string {
        if (this.item.inventory.currentStock <= 0) return 'out_of_stock';
        if (this.item.inventory.currentStock <= this.item.inventory.minimumStock) return 'low_stock';
        if (this.item.inventory.currentStock >= this.item.inventory.maximumStock) return 'overstock';
        return 'in_stock';
    }

    getStockStatusLabel(): string {
        const status = this.getStockStatus();
        switch (status) {
            case 'out_of_stock': return 'Out of Stock';
            case 'low_stock': return 'Low Stock';
            case 'overstock': return 'Overstock';
            default: return 'In Stock';
        }
    }

    getProfitMargin(): number {
        if (this.item.pricing.costPrice === 0) return 0;
        return ((this.item.pricing.salePrice - this.item.pricing.costPrice) / this.item.pricing.costPrice) * 100;
    }

    close(): void {
        this.dialogRef.close();
    }
}