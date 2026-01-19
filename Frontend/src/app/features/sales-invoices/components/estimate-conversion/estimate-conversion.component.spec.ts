/**
 * Estimate Conversion Component Unit Tests
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { EstimateConversionComponent } from './estimate-conversion.component';
import { SalesInvoiceService } from '../../services/sales-invoice.service';
import { Estimate } from '../../models/sales-invoice.model';

describe('EstimateConversionComponent', () => {
    let component: EstimateConversionComponent;
    let fixture: ComponentFixture<EstimateConversionComponent>;
    let mockSalesInvoiceService: jasmine.SpyObj<SalesInvoiceService>;

    const mockEstimate: Estimate = {
        _id: '1',
        estimateNumber: 'EST-001',
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
        estimateDate: new Date('2024-01-01'),
        validUntil: new Date('2024-02-01'),
        items: [],
        totals: {
            subtotal: 1000,
            discountAmount: 0,
            taxableAmount: 1000,
            gstAmount: 170,
            whtAmount: 0,
            grandTotal: 1170
        },
        status: 'pending',
        warehouseId: 'warehouse1',
        salesmanId: 'salesman1',
        notes: 'Test estimate',
        createdBy: 'user1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
    };

    beforeEach(async () => {
        const salesInvoiceServiceSpy = jasmine.createSpyObj('SalesInvoiceService', [
            'getPendingEstimates',
            'convertEstimateToInvoice'
        ]);

        await TestBed.configureTestingModule({
            imports: [
                EstimateConversionComponent,
                ReactiveFormsModule,
                MatSnackBarModule,
                MatDialogModule,
                NoopAnimationsModule
            ],
            providers: [
                { provide: SalesInvoiceService, useValue: salesInvoiceServiceSpy }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(EstimateConversionComponent);
        component = fixture.componentInstance;
        mockSalesInvoiceService = TestBed.inject(SalesInvoiceService) as jasmine.SpyObj<SalesInvoiceService>;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize filter form with default values', () => {
        expect(component.filterForm.get('search')?.value).toBe('');
        expect(component.filterForm.get('status')?.value).toBe('pending');
        expect(component.filterForm.get('dateFrom')?.value).toBeNull();
        expect(component.filterForm.get('dateTo')?.value).toBeNull();
    });

    it('should load estimates on init', () => {
        const mockResponse = {
            success: true,
            data: [mockEstimate],
            pagination: {
                page: 1,
                limit: 10,
                total: 1,
                pages: 1
            }
        };

        mockSalesInvoiceService.getPendingEstimates.and.returnValue(of(mockResponse));

        component.ngOnInit();

        expect(mockSalesInvoiceService.getPendingEstimates).toHaveBeenCalled();
        expect(component.dataSource.data).toEqual([mockEstimate]);
        expect(component.totalCount).toBe(1);
    });

    it('should handle error when loading estimates', () => {
        const error = { message: 'Network error' };
        mockSalesInvoiceService.getPendingEstimates.and.returnValue(throwError(() => error));
        spyOn(component, 'showError' as any);

        component.loadEstimates();

        expect(component.isLoading).toBeFalse();
    });

    it('should convert estimate to invoice successfully', () => {
        const mockInvoiceResponse = {
            success: true,
            data: {
                _id: 'invoice1',
                invoiceNumber: 'INV-001',
                customerId: 'customer1',
                invoiceDate: new Date(),
                dueDate: new Date(),
                items: [],
                totals: mockEstimate.totals,
                payment: {
                    paymentStatus: 'pending' as const,
                    paidAmount: 0,
                    remainingAmount: 1170,
                    paymentHistory: []
                },
                status: 'draft' as const,
                warehouseId: 'warehouse1',
                previousBalance: 0,
                totalBalance: 1170,
                creditLimitExceeded: false,
                discountType: 'percentage' as const,
                discountValue: 0,
                createdBy: 'user1',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        };

        mockSalesInvoiceService.convertEstimateToInvoice.and.returnValue(of(mockInvoiceResponse));
        mockSalesInvoiceService.getPendingEstimates.and.returnValue(of({
            success: true,
            data: [],
            pagination: { page: 1, limit: 10, total: 0, pages: 0 }
        }));
        spyOn(component, 'showSuccess' as any);

        component.convertToInvoice(mockEstimate);

        expect(mockSalesInvoiceService.convertEstimateToInvoice).toHaveBeenCalledWith(mockEstimate._id);
    });

    it('should prevent conversion of expired estimate', () => {
        const expiredEstimate = {
            ...mockEstimate,
            validUntil: new Date('2023-01-01') // Past date
        };
        spyOn(component, 'showError' as any);

        component.convertToInvoice(expiredEstimate);

        expect(mockSalesInvoiceService.convertEstimateToInvoice).not.toHaveBeenCalled();
    });

    it('should prevent conversion of already converted estimate', () => {
        const convertedEstimate = {
            ...mockEstimate,
            status: 'converted' as const
        };
        spyOn(component, 'showError' as any);

        component.convertToInvoice(convertedEstimate);

        expect(mockSalesInvoiceService.convertEstimateToInvoice).not.toHaveBeenCalled();
    });

    it('should check if estimate is expired correctly', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 10);

        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 10);

        const futureEstimate = { ...mockEstimate, validUntil: futureDate };
        const pastEstimate = { ...mockEstimate, validUntil: pastDate };

        expect(component.isEstimateExpired(futureEstimate)).toBeFalse();
        expect(component.isEstimateExpired(pastEstimate)).toBeTrue();
    });

    it('should calculate days until expiry correctly', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 5);

        const days = component.getDaysUntilExpiry(futureDate);
        expect(days).toBe(5);
    });

    it('should determine conversion eligibility correctly', () => {
        const pendingEstimate = { ...mockEstimate, status: 'pending' as const };
        const expiredEstimate = { ...mockEstimate, status: 'expired' as const };
        const convertedEstimate = { ...mockEstimate, status: 'converted' as const };

        expect(component.canConvert(pendingEstimate)).toBeTrue();
        expect(component.canConvert(expiredEstimate)).toBeFalse();
        expect(component.canConvert(convertedEstimate)).toBeFalse();
    });

    it('should get correct status colors', () => {
        expect(component.getStatusColor('pending')).toBe('primary');
        expect(component.getStatusColor('accepted')).toBe('accent');
        expect(component.getStatusColor('expired')).toBe('warn');
        expect(component.getStatusColor('converted')).toBe('');
    });

    it('should clear filters correctly', () => {
        component.filterForm.patchValue({
            search: 'test',
            status: 'accepted',
            dateFrom: new Date(),
            dateTo: new Date()
        });

        component.clearFilters();

        expect(component.filterForm.get('search')?.value).toBe('');
        expect(component.filterForm.get('status')?.value).toBe('pending');
        expect(component.filterForm.get('dateFrom')?.value).toBeNull();
        expect(component.filterForm.get('dateTo')?.value).toBeNull();
    });

    it('should refresh estimates list', () => {
        spyOn(component, 'loadEstimates');

        component.refresh();

        expect(component.loadEstimates).toHaveBeenCalled();
    });
});