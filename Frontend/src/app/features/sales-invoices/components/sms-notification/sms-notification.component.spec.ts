/**
 * SMS Notification Component Unit Tests
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { SMSNotificationComponent, SMSDialogData } from './sms-notification.component';
import { SalesInvoiceService } from '../../services/sales-invoice.service';
import { SalesInvoice } from '../../models/sales-invoice.model';

describe('SMSNotificationComponent', () => {
    let component: SMSNotificationComponent;
    let fixture: ComponentFixture<SMSNotificationComponent>;
    let mockSalesInvoiceService: jasmine.SpyObj<SalesInvoiceService>;
    let mockDialogRef: jasmine.SpyObj<MatDialogRef<SMSNotificationComponent>>;

    const mockInvoice: SalesInvoice = {
        _id: '1',
        invoiceNumber: 'INV-001',
        customerId: 'customer1',
        customer: {
            _id: 'customer1',
            name: 'Test Customer',
            code: 'CUST001',
            email: 'test@example.com',
            phone: '+92 300 1234567',
            address: 'Test Address',
            city: 'Test City',
            creditLimit: 100000,
            isActive: true
        },
        invoiceDate: new Date('2024-01-01'),
        dueDate: new Date('2024-02-01'),
        items: [],
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

    const mockDialogData: SMSDialogData = {
        invoice: mockInvoice
    };

    beforeEach(async () => {
        const salesInvoiceServiceSpy = jasmine.createSpyObj('SalesInvoiceService', [
            'sendSMSNotification'
        ]);
        const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

        await TestBed.configureTestingModule({
            imports: [
                SMSNotificationComponent,
                ReactiveFormsModule,
                MatSnackBarModule,
                NoopAnimationsModule
            ],
            providers: [
                { provide: SalesInvoiceService, useValue: salesInvoiceServiceSpy },
                { provide: MatDialogRef, useValue: dialogRefSpy },
                { provide: MAT_DIALOG_DATA, useValue: mockDialogData }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(SMSNotificationComponent);
        component = fixture.componentInstance;
        mockSalesInvoiceService = TestBed.inject(SalesInvoiceService) as jasmine.SpyObj<SalesInvoiceService>;
        mockDialogRef = TestBed.inject(MatDialogRef) as jasmine.SpyObj<MatDialogRef<SMSNotificationComponent>>;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize form with default values', () => {
        component.ngOnInit();

        expect(component.smsForm.get('templateId')?.value).toBe('invoice_created');
        expect(component.smsForm.get('phoneNumber')?.value).toBe('+92 300 1234567');
        expect(component.smsForm.get('sendImmediately')?.value).toBe(true);
        expect(component.smsForm.get('includeInvoiceLink')?.value).toBe(false);
        expect(component.smsForm.get('saveAsTemplate')?.value).toBe(false);
    });

    it('should load template when template ID changes', () => {
        component.ngOnInit();

        component.smsForm.patchValue({ templateId: 'payment_reminder' });

        const message = component.smsForm.get('message')?.value;
        expect(message).toContain('Test Customer');
        expect(message).toContain('INV-001');
        expect(message).toContain('PKR 1,170');
    });

    it('should update character count when message changes', () => {
        component.ngOnInit();

        const testMessage = 'This is a test message';
        component.smsForm.patchValue({ message: testMessage });

        expect(component.characterCount).toBe(testMessage.length);
        expect(component.estimatedParts).toBe(1);
    });

    it('should calculate multiple SMS parts for long messages', () => {
        component.ngOnInit();

        const longMessage = 'A'.repeat(200);
        component.smsForm.patchValue({ message: longMessage });

        expect(component.characterCount).toBe(200);
        expect(component.estimatedParts).toBe(2);
    });

    it('should replace variables in template correctly', () => {
        component.ngOnInit();

        const template = 'Dear {{customerName}}, your invoice {{invoiceNumber}} for {{amount}} is ready.';
        const result = component['replaceVariables'](template);

        expect(result).toContain('Test Customer');
        expect(result).toContain('INV-001');
        expect(result).toContain('PKR 1,170');
    });

    it('should insert variable into message', () => {
        component.ngOnInit();
        component.smsForm.patchValue({ message: 'Hello ' });

        component.insertVariable('customerName');

        expect(component.smsForm.get('message')?.value).toBe('Hello {{customerName}}');
    });

    it('should get preview message with replaced variables', () => {
        component.ngOnInit();
        component.smsForm.patchValue({ message: 'Hello {{customerName}}' });

        const preview = component.getPreviewMessage();

        expect(preview).toBe('Hello Test Customer');
    });

    it('should send SMS successfully', () => {
        const mockResponse = { success: true, data: null };
        mockSalesInvoiceService.sendSMSNotification.and.returnValue(of(mockResponse));

        component.ngOnInit();
        component.smsForm.patchValue({
            phoneNumber: '+92 300 1234567',
            message: 'Test message'
        });

        component.sendSMS();

        expect(mockSalesInvoiceService.sendSMSNotification).toHaveBeenCalledWith({
            invoiceId: '1',
            message: 'Test message',
            phoneNumber: '+92 300 1234567'
        });
        expect(mockDialogRef.close).toHaveBeenCalledWith(true);
    });

    it('should handle SMS sending error', () => {
        const error = { userMessage: 'SMS sending failed' };
        mockSalesInvoiceService.sendSMSNotification.and.returnValue(throwError(() => error));
        spyOn(component, 'showError' as any);

        component.ngOnInit();
        component.smsForm.patchValue({
            phoneNumber: '+92 300 1234567',
            message: 'Test message'
        });

        component.sendSMS();

        expect(component.isLoading).toBeFalse();
    });

    it('should not send SMS with invalid form', () => {
        component.ngOnInit();
        component.smsForm.patchValue({
            phoneNumber: '', // Invalid
            message: 'Test message'
        });

        component.sendSMS();

        expect(mockSalesInvoiceService.sendSMSNotification).not.toHaveBeenCalled();
    });

    it('should validate phone number format', () => {
        component.ngOnInit();

        const phoneControl = component.smsForm.get('phoneNumber');

        phoneControl?.setValue('invalid-phone');
        expect(phoneControl?.hasError('pattern')).toBe(true);

        phoneControl?.setValue('+92 300 1234567');
        expect(phoneControl?.hasError('pattern')).toBe(false);
    });

    it('should handle schedule date validation', () => {
        component.ngOnInit();

        // When send immediately is false, schedule date should be required
        component.smsForm.patchValue({ sendImmediately: false });

        const scheduleControl = component.smsForm.get('scheduleDateTime');
        expect(scheduleControl?.hasError('required')).toBe(true);

        scheduleControl?.setValue(new Date());
        expect(scheduleControl?.hasError('required')).toBe(false);
    });

    it('should handle template name validation when saving template', () => {
        component.ngOnInit();

        component.smsForm.patchValue({ saveAsTemplate: true });

        const templateNameControl = component.smsForm.get('templateName');
        expect(templateNameControl?.hasError('required')).toBe(true);

        templateNameControl?.setValue('My Template');
        expect(templateNameControl?.hasError('required')).toBe(false);
    });

    it('should extract variables from template content', () => {
        const content = 'Hello {{customerName}}, your {{invoiceNumber}} is ready. Amount: {{amount}}';
        const variables = component['extractVariables'](content);

        expect(variables).toEqual(['customerName', 'invoiceNumber', 'amount']);
    });

    it('should get available variables for current template', () => {
        component.ngOnInit();
        component.smsForm.patchValue({ templateId: 'invoice_created' });

        const variables = component.getAvailableVariables();

        expect(variables).toContain('customerName');
        expect(variables).toContain('invoiceNumber');
        expect(variables).toContain('amount');
        expect(variables).toContain('dueDate');
    });

    it('should close dialog', () => {
        component.close();

        expect(mockDialogRef.close).toHaveBeenCalledWith(false);
    });

    it('should save custom template', () => {
        component.ngOnInit();
        component.smsForm.patchValue({
            saveAsTemplate: true,
            templateName: 'My Custom Template',
            message: 'Custom message with {{customerName}}'
        });
        spyOn(component, 'showSuccess' as any);

        const initialTemplateCount = component.templates.length;
        component.saveTemplate();

        expect(component.templates.length).toBe(initialTemplateCount + 1);
        expect(component.templates[component.templates.length - 1].name).toBe('My Custom Template');
    });
});