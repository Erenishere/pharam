/**
 * Warranty Management Component Unit Tests
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { WarrantyManagementComponent } from './warranty-management.component';
import { SalesInvoice, WarrantyInfo } from '../../models/sales-invoice.model';

describe('WarrantyManagementComponent', () => {
    let component: WarrantyManagementComponent;
    let fixture: ComponentFixture<WarrantyManagementComponent>;

    const mockInvoice: SalesInvoice = {
        _id: '1',
        invoiceNumber: 'INV-001',
        customerId: 'customer1',
        customer: {
            _id: 'customer1',
            name: 'Test Customer',
            code: 'CUST001',
            email: 'test@example.com',
            phone: '1234567890',
            address: 'Test Address',
            city: 'Test City',
            creditLimit: 100000,
            isActive: true
        },
        invoiceDate: new Date('2024-01-01'),
        dueDate: new Date('2024-02-01'),
        items: [
            {
                itemId: 'item1',
                item: {
                    _id: 'item1',
                    code: 'ITEM001',
                    name: 'Test Electronics Item',
                    category: 'Electronics',
                    unit: 'pcs',
                    sellingPrice: 1000,
                    gstRate: 17,
                    whtRate: 0,
                    isActive: true
                },
                quantity: 1,
                unitPrice: 1000,
                discount: 0,
                discountType: 'percentage',
                taxAmount: 170,
                totalAmount: 1170
            }
        ],
        totals: {
            subtotal: 1000,
            discountAmount: 0,
            taxableAmount: 1000,
            gstAmount: 170,
            whtAmount: 0,
            grandTotal: 1170
        },
        payment: {
            paymentStatus: 'pending',
            paidAmount: 0,
            remainingAmount: 1170,
            paymentHistory: []
        },
        status: 'confirmed',
        warehouseId: 'warehouse1',
        previousBalance: 0,
        totalBalance: 1170,
        creditLimitExceeded: false,
        discountType: 'percentage',
        discountValue: 0,
        createdBy: 'user1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                WarrantyManagementComponent,
                ReactiveFormsModule,
                MatSnackBarModule,
                MatDialogModule,
                NoopAnimationsModule
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(WarrantyManagementComponent);
        component = fixture.componentInstance;
        component.invoice = mockInvoice;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize claim form with default values', () => {
        expect(component.claimForm.get('warrantyId')?.value).toBe('');
        expect(component.claimForm.get('claimReason')?.value).toBe('');
        expect(component.claimForm.get('requestedAction')?.value).toBe('repair');
        expect(component.claimForm.get('claimDate')?.value).toBeInstanceOf(Date);
    });

    it('should load warranty information on init', () => {
        component.ngOnInit();

        expect(component.warranties.length).toBeGreaterThan(0);
        expect(component.dataSource.data.length).toBeGreaterThan(0);
    });

    it('should identify items with warranty correctly', () => {
        const electronicsItem = {
            itemId: 'item1',
            item: { category: 'Electronics' },
            quantity: 1,
            unitPrice: 1000,
            discount: 0,
            discountType: 'percentage' as const,
            taxAmount: 170,
            totalAmount: 1170
        };

        const nonWarrantyItem = {
            itemId: 'item2',
            item: { category: 'Consumables' },
            quantity: 1,
            unitPrice: 100,
            discount: 0,
            discountType: 'percentage' as const,
            taxAmount: 17,
            totalAmount: 117
        };

        expect(component['hasWarranty'](electronicsItem)).toBe(true);
        expect(component['hasWarranty'](nonWarrantyItem)).toBe(false);
    });

    it('should get correct warranty period for different categories', () => {
        const electronicsItem = { item: { category: 'Electronics' } } as any;
        const appliancesItem = { item: { category: 'Appliances' } } as any;
        const machineryItem = { item: { category: 'Machinery' } } as any;
        const toolsItem = { item: { category: 'Tools' } } as any;

        expect(component['getWarrantyPeriod'](electronicsItem)).toBe(12);
        expect(component['getWarrantyPeriod'](appliancesItem)).toBe(24);
        expect(component['getWarrantyPeriod'](machineryItem)).toBe(36);
        expect(component['getWarrantyPeriod'](toolsItem)).toBe(6);
    });

    it('should calculate warranty status correctly', () => {
        const activeWarranty: WarrantyInfo = {
            itemId: 'item1',
            warrantyPeriod: 12,
            warrantyStartDate: new Date('2024-01-01'),
            warrantyEndDate: new Date('2025-01-01'),
            warrantyTerms: 'Test terms',
            isActive: true
        };

        const expiredWarranty: WarrantyInfo = {
            itemId: 'item2',
            warrantyPeriod: 12,
            warrantyStartDate: new Date('2022-01-01'),
            warrantyEndDate: new Date('2023-01-01'),
            warrantyTerms: 'Test terms',
            isActive: false
        };

        const activeStatus = component.getWarrantyStatus(activeWarranty);
        const expiredStatus = component.getWarrantyStatus(expiredWarranty);

        expect(activeStatus.isActive).toBe(true);
        expect(activeStatus.status).toBe('active');
        expect(expiredStatus.isActive).toBe(false);
        expect(expiredStatus.status).toBe('expired');
    });

    it('should get correct status colors', () => {
        expect(component.getStatusColor('active')).toBe('primary');
        expect(component.getStatusColor('expiring_soon')).toBe('accent');
        expect(component.getStatusColor('expired')).toBe('warn');
        expect(component.getStatusColor('claimed')).toBe('');
    });

    it('should get correct status text', () => {
        const activeWarranty: WarrantyInfo = {
            itemId: 'item1',
            warrantyPeriod: 12,
            warrantyStartDate: new Date('2024-01-01'),
            warrantyEndDate: new Date('2025-01-01'),
            warrantyTerms: 'Test terms',
            isActive: true
        };

        expect(component.getStatusText(activeWarranty)).toBe('Active');
    });

    it('should determine if warranty claim is allowed', () => {
        const activeWarranty: WarrantyInfo = {
            itemId: 'item1',
            warrantyPeriod: 12,
            warrantyStartDate: new Date('2024-01-01'),
            warrantyEndDate: new Date('2025-01-01'),
            warrantyTerms: 'Test terms',
            isActive: true
        };

        const expiredWarranty: WarrantyInfo = {
            itemId: 'item2',
            warrantyPeriod: 12,
            warrantyStartDate: new Date('2022-01-01'),
            warrantyEndDate: new Date('2023-01-01'),
            warrantyTerms: 'Test terms',
            isActive: false
        };

        expect(component.canClaimWarranty(activeWarranty)).toBe(true);
        expect(component.canClaimWarranty(expiredWarranty)).toBe(false);
    });

    it('should open claim dialog correctly', () => {
        const warranty: WarrantyInfo = {
            itemId: 'item1',
            warrantyPeriod: 12,
            warrantyStartDate: new Date('2024-01-01'),
            warrantyEndDate: new Date('2025-01-01'),
            warrantyTerms: 'Test terms',
            isActive: true
        };

        component.openClaimDialog(warranty);

        expect(component.showClaimForm).toBe(true);
        expect(component.claimForm.get('warrantyId')?.value).toBe('item1');
    });

    it('should not submit claim with invalid form', () => {
        component.claimForm.patchValue({
            warrantyId: '',
            claimReason: '',
            claimDescription: '',
            customerReportedIssue: ''
        });

        component.submitClaim();

        expect(component.isLoading).toBe(false);
    });

    it('should submit claim with valid form', () => {
        component.claimForm.patchValue({
            warrantyId: 'item1',
            claimReason: 'defective',
            claimDescription: 'Product is not working properly after 2 months of use',
            customerReportedIssue: 'Customer reported that the device stops working randomly',
            requestedAction: 'replace',
            claimDate: new Date()
        });

        spyOn(component, 'showSuccess' as any);
        component.submitClaim();

        expect(component.isLoading).toBe(true);
    });

    it('should cancel claim correctly', () => {
        component.showClaimForm = true;
        component.claimForm.patchValue({
            warrantyId: 'item1',
            claimReason: 'defective'
        });

        component.cancelClaim();

        expect(component.showClaimForm).toBe(false);
        expect(component.claimForm.get('warrantyId')?.value).toBe('');
    });

    it('should check for expiring warranties', () => {
        // Mock warranties with one expiring soon
        const expiringWarranty: WarrantyInfo = {
            itemId: 'item1',
            warrantyPeriod: 12,
            warrantyStartDate: new Date('2024-01-01'),
            warrantyEndDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
            warrantyTerms: 'Test terms',
            isActive: true
        };

        component.warranties = [expiringWarranty];
        component.checkExpiringWarranties();

        expect(component.expiringWarranties.length).toBe(1);
    });

    it('should get correct warranty alert message', () => {
        component.expiringWarranties = [];
        expect(component.getWarrantyAlertMessage()).toBe('');

        component.expiringWarranties = [{ itemId: 'item1' } as WarrantyInfo];
        expect(component.getWarrantyAlertMessage()).toBe('1 warranty is expiring soon');

        component.expiringWarranties = [
            { itemId: 'item1' } as WarrantyInfo,
            { itemId: 'item2' } as WarrantyInfo
        ];
        expect(component.getWarrantyAlertMessage()).toBe('2 warranties are expiring soon');
    });

    it('should download warranty certificate', () => {
        const warranty: WarrantyInfo = {
            itemId: 'item1',
            warrantyPeriod: 12,
            warrantyStartDate: new Date('2024-01-01'),
            warrantyEndDate: new Date('2025-01-01'),
            warrantyTerms: 'Test terms',
            isActive: true
        };

        spyOn(component, 'showSuccess' as any);
        component.downloadWarrantyCertificate(warranty);
    });

    it('should view warranty terms', () => {
        const warranty: WarrantyInfo = {
            itemId: 'item1',
            warrantyPeriod: 12,
            warrantyStartDate: new Date('2024-01-01'),
            warrantyEndDate: new Date('2025-01-01'),
            warrantyTerms: 'Test warranty terms',
            isActive: true
        };

        spyOn(component, 'showInfo' as any);
        component.viewWarrantyTerms(warranty);
    });
});