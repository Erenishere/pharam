import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ItemService } from '../../services/item.service';
import { ToastService } from '../../../../shared/services/toast.service';

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
    isActive: boolean;
}

@Component({
    selector: 'app-item-form-dialog',
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
        MatSlideToggleModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './item-form-dialog.component.html',
    styleUrls: ['./item-form-dialog.component.scss']
})
export class ItemFormDialogComponent implements OnInit {
    itemForm: FormGroup;
    isEditMode = false;
    saving = false;

    categories = [
        { value: 'Medicine', label: 'Medicine', icon: 'medication' },
        { value: 'Tablet', label: 'Tablet', icon: 'medication' },
        { value: 'Syrup', label: 'Syrup', icon: 'local_drink' },
        { value: 'Injection', label: 'Injection', icon: 'vaccines' },
        { value: 'Capsule', label: 'Capsule', icon: 'medication' },
        { value: 'Ointment', label: 'Ointment', icon: 'healing' }
    ];

    units = [
        { value: 'piece', label: 'Piece' },
        { value: 'kg', label: 'Kilogram' },
        { value: 'gram', label: 'Gram' },
        { value: 'liter', label: 'Liter' },
        { value: 'ml', label: 'Milliliter' },
        { value: 'meter', label: 'Meter' },
        { value: 'cm', label: 'Centimeter' },
        { value: 'box', label: 'Box' },
        { value: 'pack', label: 'Pack' },
        { value: 'dozen', label: 'Dozen' }
    ];

    constructor(
        private fb: FormBuilder,
        private itemService: ItemService,
        private toastService: ToastService,
        private dialogRef: MatDialogRef<ItemFormDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { item?: Item }
    ) {
        this.isEditMode = !!data?.item;
        this.itemForm = this.createForm();
    }

    ngOnInit(): void {
        if (this.isEditMode && this.data.item) {
            this.populateForm(this.data.item);
        }
    }

    createForm(): FormGroup {
        return this.fb.group({
            code: ['', [Validators.required, Validators.maxLength(20)]],
            name: ['', [Validators.required, Validators.maxLength(200)]],
            description: ['', Validators.maxLength(1000)],
            category: ['', Validators.required],
            unit: ['', Validators.required],
            costPrice: [0, [Validators.required, Validators.min(0)]],
            salePrice: [0, [Validators.required, Validators.min(0)]],
            currency: ['PKR', Validators.required],
            gstRate: [0, [Validators.min(0), Validators.max(100)]],
            whtRate: [0, [Validators.min(0), Validators.max(100)]],
            currentStock: [0, [Validators.min(0)]],
            minimumStock: [0, [Validators.min(0)]],
            maximumStock: [1000, [Validators.min(0)]],
            barcode: ['', Validators.maxLength(50)],
            packSize: [1, [Validators.min(1)]],
            isActive: [true]
        });
    }

    populateForm(item: Item): void {
        this.itemForm.patchValue({
            code: item.code,
            name: item.name,
            description: item.description || '',
            category: item.category,
            unit: item.unit,
            costPrice: item.pricing.costPrice,
            salePrice: item.pricing.salePrice,
            currency: item.pricing.currency,
            gstRate: item.tax?.gstRate || 0,
            whtRate: item.tax?.whtRate || 0,
            currentStock: item.inventory.currentStock,
            minimumStock: item.inventory.minimumStock,
            maximumStock: item.inventory.maximumStock,
            barcode: item.barcode || '',
            packSize: item.packSize || 1,
            isActive: item.isActive
        });
    }

    onSubmit(): void {
        if (this.itemForm.invalid) {
            this.toastService.warning('Please fill in all required fields correctly');
            return;
        }

        this.saving = true;

        if (this.isEditMode) {
            this.updateItem();
        } else {
            this.createItem();
        }
    }

    createItem(): void {
        const formValue = this.itemForm.value;
        const itemData = {
            code: formValue.code,
            name: formValue.name,
            description: formValue.description,
            category: formValue.category,
            unit: formValue.unit,
            pricing: {
                costPrice: formValue.costPrice,
                salePrice: formValue.salePrice,
                currency: formValue.currency
            },
            tax: {
                gstRate: formValue.gstRate,
                whtRate: formValue.whtRate,
                taxCategory: 'standard'
            },
            inventory: {
                currentStock: formValue.currentStock,
                minimumStock: formValue.minimumStock,
                maximumStock: formValue.maximumStock
            },
            barcode: formValue.barcode,
            packSize: formValue.packSize,
            isActive: formValue.isActive
        };

        this.itemService.createItem(itemData).subscribe({
            next: (response) => {
                if (response.success) {
                    this.toastService.success('Item created successfully!');
                    this.dialogRef.close(response.data);
                }
            },
            error: (error) => {
                this.toastService.error(error.error?.error?.message || 'Failed to create item');
                this.saving = false;
            }
        });
    }

    updateItem(): void {
        const formValue = this.itemForm.value;
        const updateData = {
            code: formValue.code,
            name: formValue.name,
            description: formValue.description,
            category: formValue.category,
            unit: formValue.unit,
            pricing: {
                costPrice: formValue.costPrice,
                salePrice: formValue.salePrice,
                currency: formValue.currency
            },
            tax: {
                gstRate: formValue.gstRate,
                whtRate: formValue.whtRate,
                taxCategory: 'standard'
            },
            inventory: {
                currentStock: formValue.currentStock,
                minimumStock: formValue.minimumStock,
                maximumStock: formValue.maximumStock
            },
            barcode: formValue.barcode,
            packSize: formValue.packSize,
            isActive: formValue.isActive
        };

        this.itemService.updateItem(this.data.item!._id, updateData).subscribe({
            next: (response) => {
                if (response.success) {
                    this.toastService.success('Item updated successfully!');
                    this.dialogRef.close(response.data);
                }
            },
            error: (error) => {
                this.toastService.error(error.error?.error?.message || 'Failed to update item');
                this.saving = false;
            }
        });
    }
}
