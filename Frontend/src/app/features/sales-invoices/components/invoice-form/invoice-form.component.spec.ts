/**
 * Invoice Form Component Unit Tests
 * 
 * This file contains comprehensive unit tests for the InvoiceFormComponent
 * covering form validation, calculations, item management, and user interactions.
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
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { of } from 'rxjs';

import { InvoiceFormComponent } from './invoice-form.component';
import { SalesInvoiceService } from '../../services/sales-invoice.service';
import { InvoiceCalculationService } from '../../services/invoice-calculation.service';
import { CustomerService } from '../../../customers/services/customer.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { DiscountType, InvoiceStatus } from '../../models';

describe('InvoiceFormComponent', () => {
    let component: InvoiceFormComponent;
    let fixture: ComponentFixture<InvoiceFormComponent>;
    let mockSalesInvoiceService: jasmine.SpyObj<SalesInvoiceService>;
    let mockCalculationService: jasmine.SpyObj<InvoiceCalculationService>;
    let mockCustomerService: jasmine.SpyObj<CustomerService>;
    let mockToastService: jasmine.SpyObj<ToastService>;

    const mockCustomers = [
        {
            _id: '1',
            code: 'CUST001',
            name: 'Test Customer 1',
            email: 'test1@example.com',
            phone: '+1234567890',
            address: '123 Test St',
            type: 'retail',
            isActive: true,
            creditLimit: 10000,
            currentBalance: 2500
        },
        {
            _id: '2',
            code: 'CUST002',
            name: 'Test Customer 2',
            email: 'test2@example.com',
            phone: '+1234567891',
            address: '456 Test Ave',
            type: 'wholesale',
            isActive: true,
            creditLimit: 25000,
            currentBalance: 5000
        }
    ];

    const mockTotals = {
        subtotal: 1000,
        discountAmount: 100,
        taxableAmount: 900,
        gstAmount: 153,
        whtAmount: 0,
        grandTotal: 1053
    };

    beforeEach(async () => {
        const salesInvoiceServiceSpy = jasmine.createSpyObj('SalesInvoiceService', [
            'createInvoice',
            'updateInvoice'
        ]);
        const calculationServiceSpy = jasmine.createSpyObj('InvoiceCalculationService', [
            'calculateItemTotal',
            'calculateInvoiceTotals',
            'calculateDueDate',
            'validateInvoice',
            'validateCustomerCredit'
        ]);
        const customerServiceSpy = jasmine.createSpyObj('CustomerService', ['getCustomers']);
        const toastServiceSpy = jasmine.createSpyObj('ToastService', ['success', 'error']);

        await TestBed.configureTestingModule({
            imports: [
                InvoiceFormComponent,
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
                MatTableModule,
                MatTooltipModule,
                MatDividerModule
            ],
            providers: [
                { provide: SalesInvoiceService, useValue: salesInvoiceServiceSpy },
                { provide: InvoiceCalculationService, useValue: calculationServiceSpy },
                { provide: CustomerService, useValue: customerServiceSpy },
                { provide: ToastService, useValue: toastServiceSpy }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(InvoiceFormComponent);
        component = fixture.componentInstance;
        mockSalesInvoiceService = TestBed.inject(SalesInvoiceService) as jasmine.SpyObj<SalesInvoiceService>;
        mockCalculationService = TestBed.inject(InvoiceCalculationService) as jasmine.SpyObj<InvoiceCalculationService>;
        mockCustomerService = TestBed.inject(CustomerService) as jasmine.SpyObj<CustomerService>;
        mockToastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;

        // Setup default mock responses
        mockCustomerService.getCustomers.and.returnValue(of({
            success: true,
            data: mockCustomers,
            pagination: { total: 2, page: 1, limit: 100, pages: 1 }
        }));
        mockCalculationService.calculateInvoiceTotals.and.returnValue(mockTotals);
        mockCalculationService.calculateItemTotal.and.returnValue(100);
        mockCalculationService.calculateDueDate.and.returnValue(new Date());
        mockCalculationService.validateInvoice.and.returnValue({ isValid: true, errors: [] });
        mockCalculationService.validateCustomerCredit.and.returnValue({
            isValid: true,
            errors: [],
            warnings: []
        });
    });

    beforeEach(() => {
        fixture.detectChanges();
    });

    describe('Component Initialization', () => {
        it('should create', () => {
            expect(component).toBeTruthy();
        });

        it('should initialize form with default values', () => {
            expect(component.invoiceForm).toBeDefined();
            expect(component.invoiceForm.get('invoiceDate')?.value).toBeInstanceOf(Date);
            expect(component.invoiceForm.get('discountType')?.value).toBe(DiscountType.PERCENTAGE);
            expect(component.itemsFormArray.length).toBe(1); // Should have one empty item
        });

        it('should load customers on init', () => {
            expect(mockCustomerService.getCustomers).toHaveBeenCalled();
            expect(component.customers.length).toBe(2);
        });

        it('should setup form subscriptions', () => {
            spyOn(component, 'calculateTotals' as any);
            component.invoiceForm.get('discountValue')?.setValue(10);

            // Wait for debounce
            setTimeout(() => {
                expect(component['calculateTotals']).toHaveBeenCalled();
            }, 350);
        });
    });

    describe('Form Validation', () => {
        it('should validate required fields', () => {
            const form = component.invoiceForm;

            // Clear required fields
            form.get('customerId')?.setValue('');
            form.get('invoiceDate')?.setValue('');
            form.get('dueDate')?.setValue('');
            form.get('warehouseId')?.setValue('');

            expect(form.invalid).toBeTruthy();
            expect(form.get('customerId')?.hasError('required')).toBeTruthy();
            expect(form.get('invoiceDate')?.hasError('required')).toBeTruthy();
            expect(form.get('dueDate')?.hasError('required')).toBeTruthy();
            expect(form.get('warehouseId')?.hasError('required')).toBeTruthy();
        });

        it('should validate discount value', () => {
            const discountControl = component.invoiceForm.get('discountValue');

            // Test negative discount
            discountControl?.setValue(-10);
            expect(discountControl?.hasError('min')).toBeTruthy();

            // Test percentage over 100
            component.invoiceForm.get('discountType')?.setValue(DiscountType.PERCENTAGE);
            discountControl?.setValue(150);
            expect(discountControl?.invalid).toBeTruthy();
        });

        it('should validate due date is not before invoice date', () => {
            const invoiceDate = new Date();
            const dueDate = new Date(invoiceDate.getTime() - 24 * 60 * 60 * 1000); // Yesterday

            component.invoiceForm.get('invoiceDate')?.setValue(invoiceDate);
            component.invoiceForm.get('dueDate')?.setValue(dueDate);

            expect(component.invoiceForm.get('dueDate')?.invalid).toBeTruthy();
        });

        it('should validate items array is not empty', () => {
            // Remove all items
            while (component.itemsFormArray.length > 0) {
                component.itemsFormArray.removeAt(0);
            }

            expect(component.itemsFormArray.hasError('required')).toBeTruthy();
        });
    });

    describe('Item Management', () => {
        it('should add new item', () => {
            const initialLength = component.itemsFormArray.length;
            component.addItem();
            expect(component.itemsFormArray.length).toBe(initialLength + 1);
        });

        it('should remove item when more than one exists', () => {
            component.addItem(); // Add second item
            const initialLength = component.itemsFormArray.length;

            component.removeItem(0);
            expect(component.itemsFormArray.length).toBe(initialLength - 1);
        });

        it('should not remove item when only one exists', () => {
            // Ensure only one item exists
            while (component.itemsFormArray.length > 1) {
                component.itemsFormArray.removeAt(1);
            }

            component.removeItem(0);
            expect(component.itemsFormArray.length).toBe(1);
        });

        it('should handle item selection', () => {
            const mockItem = {
                _id: '1',
                code: 'ITEM001',
                name: 'Test Item',
                sellingPrice: 100,
                gstRate: 17,
                whtRate: 0
            };

            component.items = [mockItem as any];
            component.onItemSelected(0, '1');

            const itemGroup = component.itemsFormArray.at(0);
            expect(itemGroup.get('unitPrice')?.value).toBe(100);
            expect(mockCalculationService.calculateItemTotal).toHaveBeenCalled();
        });

        it('should duplicate item', () => {
            const itemGroup = component.itemsFormArray.at(0);
            itemGroup.patchValue({
                itemId: '1',
                itemSearch: 'Test Item',
                unitPrice: 100,
                discount: 10
            });

            component.duplicateItem(0);
            expect(component.itemsFormArray.length).toBe(2);

            const duplicatedItem = component.itemsFormArray.at(1);
            expect(duplicatedItem.get('itemId')?.value).toBe('1');
            expect(duplicatedItem.get('unitPrice')?.value).toBe(100);
            expect(duplicatedItem.get('quantity')?.value).toBe(1); // Should reset quantity
        });

        it('should move item up', () => {
            component.addItem(); // Add second item

            const firstItem = component.itemsFormArray.at(0);
            const secondItem = component.itemsFormArray.at(1);

            firstItem.get('itemSearch')?.setValue('First Item');
            secondItem.get('itemSearch')?.setValue('Second Item');

            component.moveItemUp(1);

            expect(component.itemsFormArray.at(0).get('itemSearch')?.value).toBe('Second Item');
            expect(component.itemsFormArray.at(1).get('itemSearch')?.value).toBe('First Item');
        });

        it('should move item down', () => {
            component.addItem(); // Add second item

            const firstItem = component.itemsFormArray.at(0);
            const secondItem = component.itemsFormArray.at(1);

            firstItem.get('itemSearch')?.setValue('First Item');
            secondItem.get('itemSearch')?.setValue('Second Item');

            component.moveItemDown(0);

            expect(component.itemsFormArray.at(0).get('itemSearch')?.value).toBe('Second Item');
            expect(component.itemsFormArray.at(1).get('itemSearch')?.value).toBe('First Item');
        });
    });

    describe('Customer Selection', () => {
        it('should handle customer selection', () => {
            component.customers = mockCustomers as any;
            component.onCustomerSelected('1');

            expect(component.invoiceForm.get('customerSearch')?.value).toBe('Test Customer 1');
            expect(component.invoiceForm.get('previousBalance')?.value).toBe(2500);
            expect(mockCalculationService.calculateDueDate).toHaveBeenCalled();
        });

        it('should filter customers for autocomplete', () => {
            component.customers = mockCustomers as any;
            const filtered = component['filterCustomers']('Test Customer 1');

            expect(filtered.length).toBe(1);
            expect(filtered[0].name).toBe('Test Customer 1');
        });

        it('should display customer correctly', () => {
            const customer = mockCustomers[0] as any;
            const display = component.displayCustomer(customer);

            expect(display).toBe('Test Customer 1 (CUST001)');
        });
    });

    describe('Calculations', () => {
        it('should calculate item total', () => {
            const itemGroup = component.itemsFormArray.at(0);
            itemGroup.patchValue({
                itemId: '1',
                quantity: 10,
                unitPrice: 100
            });

            component.calculateItemTotal(0);

            expect(mockCalculationService.calculateItemTotal).toHaveBeenCalled();
        });

        it('should calculate invoice totals', () => {
            component.invoiceForm.patchValue({
                discountType: DiscountType.PERCENTAGE,
                discountValue: 10
            });

            component['calculateTotals']();

            expect(mockCalculationService.calculateInvoiceTotals).toHaveBeenCalled();
        });

        it('should get item total for display', () => {
            const itemGroup = component.itemsFormArray.at(0);
            (itemGroup as any)._calculatedTotal = 150;

            const total = component.getItemTotal(0);
            expect(total).toBe(150);
        });
    });

    describe('Form Submission', () => {
        beforeEach(() => {
            // Setup valid form data
            component.invoiceForm.patchValue({
                customerId: '1',
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                warehouseId: '1'
            });

            const itemGroup = component.itemsFormArray.at(0);
            itemGroup.patchValue({
                itemId: '1',
                quantity: 10,
                unitPrice: 100
            });

            component.customers = mockCustomers as any;
        });

        it('should submit valid form', () => {
            spyOn(component.formSubmit, 'emit');

            component.onSubmit();

            expect(component.formSubmit.emit).toHaveBeenCalled();
            expect(component.saving).toBeTruthy();
        });

        it('should not submit invalid form', () => {
            component.invoiceForm.get('customerId')?.setValue('');
            spyOn(component.formSubmit, 'emit');

            component.onSubmit();

            expect(component.formSubmit.emit).not.toHaveBeenCalled();
            expect(mockToastService.error).toHaveBeenCalled();
        });

        it('should save draft with minimal validation', () => {
            spyOn(component.draftSave, 'emit');

            component.onSaveDraft();

            expect(component.draftSave.emit).toHaveBeenCalled();
        });

        it('should handle form success', () => {
            const mockInvoice = { _id: '1', invoiceNumber: 'INV-001' } as any;
            spyOn(component.formSuccess, 'emit');

            component.onFormSuccess(mockInvoice);

            expect(component.saving).toBeFalsy();
            expect(mockToastService.success).toHaveBeenCalled();
            expect(component.formSuccess.emit).toHaveBeenCalledWith(mockInvoice);
        });

        it('should handle form error', () => {
            const errorMessage = 'Test error';
            spyOn(component.formError, 'emit');

            component.onFormError(errorMessage);

            expect(component.saving).toBeFalsy();
            expect(mockToastService.error).toHaveBeenCalledWith(errorMessage);
            expect(component.formError.emit).toHaveBeenCalledWith(errorMessage);
        });
    });

    describe('Form Reset and Utilities', () => {
        it('should reset form to initial state', () => {
            // Make some changes
            component.invoiceForm.get('customerId')?.setValue('1');
            component.addItem();

            component.resetForm();

            expect(component.invoiceForm.pristine).toBeTruthy();
            expect(component.itemsFormArray.length).toBe(1);
            expect(Object.keys(component.formErrors).length).toBe(0);
        });

        it('should detect unsaved changes', () => {
            expect(component.hasUnsavedChanges()).toBeFalsy();

            component.invoiceForm.get('customerId')?.setValue('1');

            expect(component.hasUnsavedChanges()).toBeTruthy();
        });

        it('should get validation summary', () => {
            const summary = component.getValidationSummary();

            expect(summary).toHaveProperty('isValid');
            expect(summary).toHaveProperty('errorCount');
            expect(summary).toHaveProperty('errors');
        });

        it('should confirm cancel when form is dirty', () => {
            spyOn(window, 'confirm').and.returnValue(false);
            spyOn(component.formCancel, 'emit');

            component.invoiceForm.markAsDirty();
            component.onCancel();

            expect(window.confirm).toHaveBeenCalled();
            expect(component.formCancel.emit).not.toHaveBeenCalled();
        });
    });

    describe('Edit Mode', () => {
        const mockInvoice = {
            _id: '1',
            invoiceNumber: 'INV-001',
            customerId: '1',
            customer: mockCustomers[0],
            invoiceDate: new Date(),
            dueDate: new Date(),
            warehouseId: '1',
            salesmanId: '1',
            items: [
                {
                    itemId: '1',
                    item: { _id: '1', name: 'Test Item', code: 'ITEM001' },
                    quantity: 10,
                    unitPrice: 100,
                    discount: 5,
                    discountType: DiscountType.PERCENTAGE
                }
            ],
            notes: 'Test notes',
            discountType: DiscountType.PERCENTAGE,
            discountValue: 10,
            previousBalance: 1000
        };

        beforeEach(() => {
            component.isEditMode = true;
            component.invoice = mockInvoice as any;
            component.ngOnInit();
        });

        it('should populate form in edit mode', () => {
            expect(component.invoiceForm.get('customerId')?.value).toBe('1');
            expect(component.invoiceForm.get('notes')?.value).toBe('Test notes');
            expect(component.invoiceForm.get('discountValue')?.value).toBe(10);
            expect(component.itemsFormArray.length).toBe(1);
        });

        it('should set customer search display in edit mode', () => {
            expect(component.invoiceForm.get('customerSearch')?.value).toBe('Test Customer 1');
        });
    });
});