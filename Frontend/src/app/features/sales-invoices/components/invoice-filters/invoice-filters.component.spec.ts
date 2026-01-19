/**
 * Invoice Filters Component Unit Tests
 * 
 * This file contains comprehensive unit tests for the InvoiceFiltersComponent
 * covering form validation, filter application, and user interactions.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatExpansionModule } from '@angular/material/expansion';
import { of } from 'rxjs';

import { InvoiceFiltersComponent } from './invoice-filters.component';
import { CustomerService } from '../../../customers/services/customer.service';
import { SalesmanService } from '../../../salesman/services/salesman.service';
import { InvoiceFilters, InvoiceStatus, PaymentStatus } from '../../models';

describe('InvoiceFiltersComponent', () => {
    let component: InvoiceFiltersComponent;
    let fixture: ComponentFixture<InvoiceFiltersComponent>;
    let mockCustomerService: jasmine.SpyObj<CustomerService>;
    let mockSalesmanService: jasmine.SpyObj<SalesmanService>;

    const mockCustomers = [
        {
            _id: '1',
            code: 'CUST001',
            name: 'Test Customer 1',
            email: 'test1@example.com',
            phone: '+1234567890',
            address: '123 Test St',
            isActive: true
        },
        {
            _id: '2',
            code: 'CUST002',
            name: 'Test Customer 2',
            email: 'test2@example.com',
            phone: '+1234567891',
            address: '456 Test Ave',
            isActive: true
        }
    ];

    const mockSalesmen = [
        {
            _id: '1',
            code: 'SM001',
            name: 'Test Salesman 1',
            email: 'salesman1@example.com',
            phone: '+1234567890',
            isActive: true
        },
        {
            _id: '2',
            code: 'SM002',
            name: 'Test Salesman 2',
            email: 'salesman2@example.com',
            phone: '+1234567891',
            isActive: true
        }
    ];

    beforeEach(async () => {
        const customerServiceSpy = jasmine.createSpyObj('CustomerService', ['getCustomers']);
        const salesmanServiceSpy = jasmine.createSpyObj('SalesmanService', ['getSalesmen']);

        await TestBed.configureTestingModule({
            imports: [
                InvoiceFiltersComponent,
                ReactiveFormsModule,
                NoopAnimationsModule,
                MatCardModule,
                MatButtonModule,
                MatInputModule,
                MatSelectModule,
                MatDatepickerModule,
                MatNativeDateModule,
                MatIconModule,
                MatAutocompleteModule,
                MatExpansionModule
            ],
            providers: [
                { provide: CustomerService, useValue: customerServiceSpy },
                { provide: SalesmanService, useValue: salesmanServiceSpy }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(InvoiceFiltersComponent);
        component = fixture.componentInstance;
        mockCustomerService = TestBed.inject(CustomerService) as jasmine.SpyObj<CustomerService>;
        mockSalesmanService = TestBed.inject(SalesmanService) as jasmine.SpyObj<SalesmanService>;

        // Setup default mock responses
        mockCustomerService.getCustomers.and.returnValue(of({
            success: true,
            data: mockCustomers,
            pagination: { total: 2, page: 1, limit: 100, pages: 1 }
        }));
        mockSalesmanService.getSalesmen.and.returnValue(of({
            success: true,
            data: mockSalesmen,
            pagination: { total: 2, page: 1, limit: 100, pages: 1 }
        }));
    });

    beforeEach(() => {
        fixture.detectChanges();
    });

    describe('Component Initialization', () => {
        it('should create', () => {
            expect(component).toBeTruthy();
        });

        it('should initialize form with default values', () => {
            expect(component.filtersForm.get('search')?.value).toBe('');
            expect(component.filtersForm.get('status')?.value).toEqual([]);
            expect(component.filtersForm.get('paymentStatus')?.value).toEqual([]);
            expect(component.filtersForm.get('dateFrom')?.value).toBeNull();
            expect(component.filtersForm.get('dateTo')?.value).toBeNull();
            expect(component.filtersForm.get('customerId')?.value).toBe('');
            expect(component.filtersForm.get('salesmanId')?.value).toBe('');
        });

        it('should load customers and salesmen on init', () => {
            expect(mockCustomerService.getCustomers).toHaveBeenCalled();
            expect(mockSalesmanService.getSalesmen).toHaveBeenCalled();
            expect(component.customers.length).toBe(2);
            expect(component.salesmen.length).toBe(2);
        });

        it('should setup form subscriptions for debounced search', () => {
            spyOn(component.filtersChanged, 'emit');

            component.filtersForm.get('search')?.setValue('test');

            // Wait for debounce
            setTimeout(() => {
                expect(component.filtersChanged.emit).toHaveBeenCalled();
            }, 350);
        });
    });

    describe('Filter Application', () => {
        it('should emit filters when form values change', () => {
            spyOn(component.filtersChanged, 'emit');

            const filters: InvoiceFilters = {
                search: 'test invoice',
                status: [InvoiceStatus.DRAFT],
                paymentStatus: [PaymentStatus.PENDING],
                customerId: '1',
                salesmanId: '1',
                dateFrom: new Date('2024-01-01'),
                dateTo: new Date('2024-01-31')
            };

            component.filtersForm.patchValue(filters);
            component.applyFilters();

            expect(component.filtersChanged.emit).toHaveBeenCalledWith(jasmine.objectContaining({
                search: 'test invoice',
                status: [InvoiceStatus.DRAFT],
                paymentStatus: [PaymentStatus.PENDING],
                customerId: '1',
                salesmanId: '1',
                dateFrom: jasmine.any(Date),
                dateTo: jasmine.any(Date)
            }));
        });

        it('should clear all filters', () => {
            // Set some filter values
            component.filtersForm.patchValue({
                search: 'test',
                status: [InvoiceStatus.DRAFT],
                paymentStatus: [PaymentStatus.PENDING],
                customerId: '1',
                salesmanId: '1',
                dateFrom: new Date('2024-01-01'),
                dateTo: new Date('2024-01-31')
            });

            spyOn(component.filtersChanged, 'emit');

            component.clearFilters();

            expect(component.filtersForm.get('search')?.value).toBe('');
            expect(component.filtersForm.get('status')?.value).toEqual([]);
            expect(component.filtersForm.get('paymentStatus')?.value).toEqual([]);
            expect(component.filtersForm.get('customerId')?.value).toBe('');
            expect(component.filtersForm.get('salesmanId')?.value).toBe('');
            expect(component.filtersForm.get('dateFrom')?.value).toBeNull();
            expect(component.filtersForm.get('dateTo')?.value).toBeNull();
            expect(component.filtersChanged.emit).toHaveBeenCalled();
        });

        it('should reset to default filters', () => {
            component.filtersForm.patchValue({
                search: 'test',
                status: [InvoiceStatus.DRAFT]
            });

            spyOn(component.filtersChanged, 'emit');

            component.resetFilters();

            expect(component.filtersForm.pristine).toBeTruthy();
            expect(component.filtersChanged.emit).toHaveBeenCalled();
        });
    });

    describe('Customer Autocomplete', () => {
        it('should filter customers based on search input', () => {
            component.customers = mockCustomers as any;

            const filtered = component.filterCustomers('Test Customer 1');

            expect(filtered.length).toBe(1);
            expect(filtered[0].name).toBe('Test Customer 1');
        });

        it('should filter customers by code', () => {
            component.customers = mockCustomers as any;

            const filtered = component.filterCustomers('CUST001');

            expect(filtered.length).toBe(1);
            expect(filtered[0].code).toBe('CUST001');
        });

        it('should return all customers for empty search', () => {
            component.customers = mockCustomers as any;

            const filtered = component.filterCustomers('');

            expect(filtered.length).toBe(2);
        });

        it('should display customer correctly', () => {
            const customer = mockCustomers[0] as any;
            const display = component.displayCustomer(customer);

            expect(display).toBe('Test Customer 1 (CUST001)');
        });

        it('should handle customer selection', () => {
            spyOn(component.filtersChanged, 'emit');

            component.onCustomerSelected('1');

            expect(component.filtersForm.get('customerId')?.value).toBe('1');
            expect(component.filtersChanged.emit).toHaveBeenCalled();
        });
    });

    describe('Salesman Autocomplete', () => {
        it('should filter salesmen based on search input', () => {
            component.salesmen = mockSalesmen as any;

            const filtered = component.filterSalesmen('Test Salesman 1');

            expect(filtered.length).toBe(1);
            expect(filtered[0].name).toBe('Test Salesman 1');
        });

        it('should filter salesmen by code', () => {
            component.salesmen = mockSalesmen as any;

            const filtered = component.filterSalesmen('SM001');

            expect(filtered.length).toBe(1);
            expect(filtered[0].code).toBe('SM001');
        });

        it('should display salesman correctly', () => {
            const salesman = mockSalesmen[0] as any;
            const display = component.displaySalesman(salesman);

            expect(display).toBe('Test Salesman 1 (SM001)');
        });

        it('should handle salesman selection', () => {
            spyOn(component.filtersChanged, 'emit');

            component.onSalesmanSelected('1');

            expect(component.filtersForm.get('salesmanId')?.value).toBe('1');
            expect(component.filtersChanged.emit).toHaveBeenCalled();
        });
    });

    describe('Date Range Validation', () => {
        it('should validate that dateTo is not before dateFrom', () => {
            const dateFrom = new Date('2024-01-31');
            const dateTo = new Date('2024-01-01');

            component.filtersForm.patchValue({ dateFrom, dateTo });

            expect(component.filtersForm.get('dateTo')?.hasError('dateRange')).toBeTruthy();
        });

        it('should allow valid date range', () => {
            const dateFrom = new Date('2024-01-01');
            const dateTo = new Date('2024-01-31');

            component.filtersForm.patchValue({ dateFrom, dateTo });

            expect(component.filtersForm.get('dateTo')?.hasError('dateRange')).toBeFalsy();
        });

        it('should set predefined date ranges', () => {
            component.setDateRange('thisMonth');

            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            expect(component.filtersForm.get('dateFrom')?.value).toEqual(firstDay);
            expect(component.filtersForm.get('dateTo')?.value).toEqual(lastDay);
        });

        it('should set last 30 days range', () => {
            component.setDateRange('last30Days');

            const today = new Date();
            const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));

            expect(component.filtersForm.get('dateFrom')?.value).toEqual(thirtyDaysAgo);
            expect(component.filtersForm.get('dateTo')?.value).toEqual(today);
        });
    });

    describe('Advanced Filters', () => {
        it('should toggle advanced filters panel', () => {
            expect(component.showAdvancedFilters).toBe(false);

            component.toggleAdvancedFilters();

            expect(component.showAdvancedFilters).toBe(true);

            component.toggleAdvancedFilters();

            expect(component.showAdvancedFilters).toBe(false);
        });

        it('should count active filters correctly', () => {
            component.filtersForm.patchValue({
                search: 'test',
                status: [InvoiceStatus.DRAFT],
                customerId: '1'
            });

            const count = component.getActiveFiltersCount();

            expect(count).toBe(3);
        });

        it('should return zero for no active filters', () => {
            const count = component.getActiveFiltersCount();

            expect(count).toBe(0);
        });
    });

    describe('Status and Payment Status Options', () => {
        it('should provide all invoice status options', () => {
            const statusOptions = component.getStatusOptions();

            expect(statusOptions).toContain(InvoiceStatus.DRAFT);
            expect(statusOptions).toContain(InvoiceStatus.CONFIRMED);
            expect(statusOptions).toContain(InvoiceStatus.CANCELLED);
        });

        it('should provide all payment status options', () => {
            const paymentStatusOptions = component.getPaymentStatusOptions();

            expect(paymentStatusOptions).toContain(PaymentStatus.PENDING);
            expect(paymentStatusOptions).toContain(PaymentStatus.PARTIAL);
            expect(paymentStatusOptions).toContain(PaymentStatus.PAID);
        });

        it('should format status display correctly', () => {
            expect(component.formatStatusDisplay(InvoiceStatus.DRAFT)).toBe('Draft');
            expect(component.formatStatusDisplay(InvoiceStatus.CONFIRMED)).toBe('Confirmed');
            expect(component.formatStatusDisplay(InvoiceStatus.CANCELLED)).toBe('Cancelled');
        });

        it('should format payment status display correctly', () => {
            expect(component.formatPaymentStatusDisplay(PaymentStatus.PENDING)).toBe('Pending');
            expect(component.formatPaymentStatusDisplay(PaymentStatus.PARTIAL)).toBe('Partial');
            expect(component.formatPaymentStatusDisplay(PaymentStatus.PAID)).toBe('Paid');
        });
    });

    describe('Form State Management', () => {
        it('should detect if form has changes', () => {
            expect(component.hasActiveFilters()).toBe(false);

            component.filtersForm.get('search')?.setValue('test');

            expect(component.hasActiveFilters()).toBe(true);
        });

        it('should save filter state', () => {
            const filters = {
                search: 'test',
                status: [InvoiceStatus.DRAFT]
            };

            component.filtersForm.patchValue(filters);
            component.saveFilterState();

            const savedState = localStorage.getItem('invoiceFilters');
            expect(savedState).toBeTruthy();

            const parsedState = JSON.parse(savedState!);
            expect(parsedState.search).toBe('test');
        });

        it('should load saved filter state', () => {
            const filters = {
                search: 'saved test',
                status: [InvoiceStatus.CONFIRMED]
            };

            localStorage.setItem('invoiceFilters', JSON.stringify(filters));

            component.loadFilterState();

            expect(component.filtersForm.get('search')?.value).toBe('saved test');
            expect(component.filtersForm.get('status')?.value).toEqual([InvoiceStatus.CONFIRMED]);
        });
    });

    describe('Accessibility', () => {
        it('should have proper ARIA labels', () => {
            fixture.detectChanges();

            const searchInput = fixture.nativeElement.querySelector('input[formControlName="search"]');
            expect(searchInput.getAttribute('aria-label')).toBeTruthy();

            const statusSelect = fixture.nativeElement.querySelector('mat-select[formControlName="status"]');
            expect(statusSelect.getAttribute('aria-label')).toBeTruthy();
        });

        it('should support keyboard navigation', () => {
            fixture.detectChanges();

            const buttons = fixture.nativeElement.querySelectorAll('button');
            buttons.forEach((button: HTMLElement) => {
                expect(button.tabIndex).toBeGreaterThanOrEqual(0);
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle customer loading error gracefully', () => {
            mockCustomerService.getCustomers.and.returnValue(
                of({ success: false, message: 'Failed to load customers' } as any)
            );

            component.loadCustomers();

            expect(component.customers.length).toBe(0);
        });

        it('should handle salesman loading error gracefully', () => {
            mockSalesmanService.getSalesmen.and.returnValue(
                of({ success: false, message: 'Failed to load salesmen' } as any)
            );

            component.loadSalesmen();

            expect(component.salesmen.length).toBe(0);
        });
    });

    describe('Performance', () => {
        it('should debounce search input changes', () => {
            spyOn(component.filtersChanged, 'emit');

            // Simulate rapid typing
            component.filtersForm.get('search')?.setValue('t');
            component.filtersForm.get('search')?.setValue('te');
            component.filtersForm.get('search')?.setValue('tes');
            component.filtersForm.get('search')?.setValue('test');

            // Should only emit once after debounce period
            setTimeout(() => {
                expect(component.filtersChanged.emit).toHaveBeenCalledTimes(1);
            }, 350);
        });
    });
});