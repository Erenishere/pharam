/**
 * Sales Invoice Service Unit Tests
 * 
 * This test suite covers all HTTP operations for the SalesInvoiceService
 * including CRUD operations, status management, payment tracking, and error handling.
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SalesInvoiceService } from './sales-invoice.service';
import { environment } from '../../../../environments/environment';
import {
    SalesInvoice,
    CreateInvoiceRequest,
    UpdateInvoiceRequest,
    PaymentRequest,
    StatusChangeRequest,
    InvoiceStatus,
    PaymentStatus,
    DiscountType,
    PaymentMethod,
    InvoiceQueryParams
} from '../models';

describe('SalesInvoiceService', () => {
    let service: SalesInvoiceService;
    let httpMock: HttpTestingController;
    const baseUrl = `${environment.apiUrl}/invoices/sales`;

    // Mock data
    const mockInvoice: SalesInvoice = {
        _id: '1',
        invoiceNumber: 'INV-001',
        customerId: 'customer1',
        invoiceDate: new Date('2024-01-01'),
        dueDate: new Date('2024-01-31'),
        items: [{
            _id: 'item1',
            itemId: 'item1',
            quantity: 10,
            unitPrice: 100,
            discount: 5,
            discountType: DiscountType.PERCENTAGE,
            taxAmount: 95,
            totalAmount: 1095
        }],
        totals: {
            subtotal: 1000,
            discountAmount: 50,
            taxableAmount: 950,
            gstAmount: 95,
            whtAmount: 0,
            grandTotal: 1045
        },
        payment: {
            paymentStatus: PaymentStatus.PENDING,
            paidAmount: 0,
            remainingAmount: 1045,
            paymentHistory: []
        },
        status: InvoiceStatus.DRAFT,
        warehouseId: 'warehouse1',
        previousBalance: 0,
        totalBalance: 1045,
        creditLimitExceeded: false,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 0,
        createdBy: 'user1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
    };

    const mockCreateRequest: CreateInvoiceRequest = {
        customerId: 'customer1',
        invoiceDate: new Date('2024-01-01'),
        dueDate: new Date('2024-01-31'),
        warehouseId: 'warehouse1',
        items: [{
            itemId: 'item1',
            quantity: 10,
            unitPrice: 100,
            discount: 5,
            discountType: DiscountType.PERCENTAGE
        }],
        discountType: DiscountType.PERCENTAGE,
        discountValue: 0
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [SalesInvoiceService]
        });
        service = TestBed.inject(SalesInvoiceService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    describe('HTTP Operations', () => {
        it('should be created', () => {
            expect(service).toBeTruthy();
        });

        it('should get invoices with query parameters', () => {
            const queryParams: InvoiceQueryParams = {
                page: 1,
                limit: 10,
                search: 'test',
                status: [InvoiceStatus.DRAFT]
            };

            const mockResponse = {
                success: true,
                data: [mockInvoice],
                pagination: {
                    total: 1,
                    page: 1,
                    limit: 10,
                    pages: 1,
                    hasNext: false,
                    hasPrev: false
                }
            };

            service.getInvoices(queryParams).subscribe(response => {
                expect(response).toEqual(mockResponse);
            });

            const req = httpMock.expectOne((request) => {
                return request.url === baseUrl &&
                    request.params.get('page') === '1' &&
                    request.params.get('limit') === '10' &&
                    request.params.get('search') === 'test';
            });
            expect(req.request.method).toBe('GET');
            req.flush(mockResponse);
        });

        it('should get invoice by ID', () => {
            const mockResponse = {
                success: true,
                data: mockInvoice
            };

            service.getInvoiceById('1').subscribe(response => {
                expect(response).toEqual(mockResponse);
            });

            const req = httpMock.expectOne(`${baseUrl}/1`);
            expect(req.request.method).toBe('GET');
            req.flush(mockResponse);
        });

        it('should create invoice', () => {
            const mockResponse = {
                success: true,
                data: mockInvoice
            };

            service.createInvoice(mockCreateRequest).subscribe(response => {
                expect(response).toEqual(mockResponse);
            });

            const req = httpMock.expectOne(baseUrl);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(mockCreateRequest);
            req.flush(mockResponse);
        });

        it('should update invoice', () => {
            const updateRequest: UpdateInvoiceRequest = {
                customerId: 'customer2'
            };
            const mockResponse = {
                success: true,
                data: { ...mockInvoice, customerId: 'customer2' }
            };

            service.updateInvoice('1', updateRequest).subscribe(response => {
                expect(response).toEqual(mockResponse);
            });

            const req = httpMock.expectOne(`${baseUrl}/1`);
            expect(req.request.method).toBe('PUT');
            expect(req.request.body).toEqual(updateRequest);
            req.flush(mockResponse);
        });

        it('should delete invoice', () => {
            const mockResponse = {
                success: true,
                data: null
            };

            service.deleteInvoice('1').subscribe(response => {
                expect(response).toEqual(mockResponse);
            });

            const req = httpMock.expectOne(`${baseUrl}/1`);
            expect(req.request.method).toBe('DELETE');
            req.flush(mockResponse);
        });
    });

    describe('Status Management', () => {
        it('should confirm invoice', () => {
            const statusRequest: StatusChangeRequest = {
                reason: 'Ready for processing'
            };
            const mockResponse = {
                success: true,
                data: { ...mockInvoice, status: InvoiceStatus.CONFIRMED }
            };

            service.confirmInvoice('1', statusRequest).subscribe(response => {
                expect(response).toEqual(mockResponse);
            });

            const req = httpMock.expectOne(`${baseUrl}/1/confirm`);
            expect(req.request.method).toBe('PATCH');
            expect(req.request.body).toEqual(statusRequest);
            req.flush(mockResponse);
        });

        it('should confirm invoice without request body', () => {
            const mockResponse = {
                success: true,
                data: { ...mockInvoice, status: InvoiceStatus.CONFIRMED }
            };

            service.confirmInvoice('1').subscribe(response => {
                expect(response).toEqual(mockResponse);
            });

            const req = httpMock.expectOne(`${baseUrl}/1/confirm`);
            expect(req.request.method).toBe('PATCH');
            expect(req.request.body).toEqual({});
            req.flush(mockResponse);
        });

        it('should cancel invoice', () => {
            const statusRequest: StatusChangeRequest = {
                reason: 'Customer request'
            };
            const mockResponse = {
                success: true,
                data: { ...mockInvoice, status: InvoiceStatus.CANCELLED }
            };

            service.cancelInvoice('1', statusRequest).subscribe(response => {
                expect(response).toEqual(mockResponse);
            });

            const req = httpMock.expectOne(`${baseUrl}/1/cancel`);
            expect(req.request.method).toBe('PATCH');
            expect(req.request.body).toEqual(statusRequest);
            req.flush(mockResponse);
        });
    });

    describe('Payment Management', () => {
        it('should mark invoice as paid', () => {
            const paymentRequest: PaymentRequest = {
                amount: 1045,
                paymentMethod: PaymentMethod.CASH,
                paymentDate: new Date('2024-01-15'),
                reference: 'CASH-001'
            };
            const mockResponse = {
                success: true,
                data: {
                    ...mockInvoice,
                    payment: {
                        ...mockInvoice.payment,
                        paymentStatus: PaymentStatus.PAID,
                        paidAmount: 1045,
                        remainingAmount: 0
                    }
                }
            };

            service.markAsPaid('1', paymentRequest).subscribe(response => {
                expect(response).toEqual(mockResponse);
            });

            const req = httpMock.expectOne(`${baseUrl}/1/mark-paid`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(paymentRequest);
            req.flush(mockResponse);
        });

        it('should mark invoice as partially paid', () => {
            const paymentRequest: PaymentRequest = {
                amount: 500,
                paymentMethod: PaymentMethod.BANK_TRANSFER,
                paymentDate: new Date('2024-01-15'),
                reference: 'TXN-001'
            };
            const mockResponse = {
                success: true,
                data: {
                    ...mockInvoice,
                    payment: {
                        ...mockInvoice.payment,
                        paymentStatus: PaymentStatus.PARTIAL,
                        paidAmount: 500,
                        remainingAmount: 545
                    }
                }
            };

            service.markAsPartialPaid('1', paymentRequest).subscribe(response => {
                expect(response).toEqual(mockResponse);
            });

            const req = httpMock.expectOne(`${baseUrl}/1/mark-partial-paid`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(paymentRequest);
            req.flush(mockResponse);
        });
    });

    describe('Statistics and Reporting', () => {
        it('should get statistics', () => {
            const mockStatistics = {
                totalSales: 10000,
                totalInvoices: 10,
                averageInvoiceValue: 1000,
                pendingPayments: 5000,
                overdueInvoices: 2
            };
            const mockResponse = {
                success: true,
                data: mockStatistics
            };

            service.getStatistics().subscribe(response => {
                expect(response).toEqual(mockResponse);
            });

            const req = httpMock.expectOne(`${baseUrl}/statistics`);
            expect(req.request.method).toBe('GET');
            req.flush(mockResponse);
        });

        it('should export invoices', () => {
            const queryParams: InvoiceQueryParams = {
                page: 1,
                limit: 100
            };
            const mockResponse = {
                success: true,
                filename: 'invoices.xlsx',
                downloadUrl: 'http://example.com/download/invoices.xlsx',
                format: 'excel' as const,
                size: 1024,
                expiresAt: new Date('2024-01-02')
            };

            service.exportInvoices(queryParams, 'excel').subscribe(response => {
                expect(response).toEqual(mockResponse);
            });

            const req = httpMock.expectOne((request) => {
                return request.url === `${baseUrl}/export` &&
                    request.params.get('format') === 'excel';
            });
            expect(req.request.method).toBe('GET');
            req.flush(mockResponse);
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors', () => {
            service.getInvoices({ page: 1, limit: 10 }).subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.userMessage).toContain('Network error');
                    expect(error.isRetryable).toBe(true);
                }
            });

            const req = httpMock.expectOne(baseUrl);
            req.error(new ErrorEvent('Network error'), { status: 0 });
        });

        it('should handle 404 errors', () => {
            service.getInvoiceById('999').subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.userMessage).toContain('could not be found');
                    expect(error.isRetryable).toBe(false);
                }
            });

            const req = httpMock.expectOne(`${baseUrl}/999`);
            req.error(new ErrorEvent('Not found'), { status: 404 });
        });

        it('should handle validation errors', () => {
            const validationError = {
                success: false,
                message: 'Validation failed',
                errors: [
                    { field: 'customerId', message: 'Customer is required' }
                ]
            };

            service.createInvoice(mockCreateRequest).subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.userMessage).toContain('check your input');
                    expect(error.isRetryable).toBe(false);
                }
            });

            const req = httpMock.expectOne(baseUrl);
            req.error(new ErrorEvent('Validation error'), {
                status: 422,
                error: validationError
            });
        });

        it('should handle server errors with retry', () => {
            service.getInvoices({ page: 1, limit: 10 }).subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.userMessage).toContain('try again later');
                    expect(error.isRetryable).toBe(true);
                }
            });

            const req = httpMock.expectOne(baseUrl);
            req.error(new ErrorEvent('Server error'), { status: 500 });
        });
    });

    describe('Bulk Operations', () => {
        it('should bulk confirm invoices', () => {
            const invoiceIds = ['1', '2', '3'];
            const mockResponse = {
                success: true,
                processed: 3,
                successful: 3,
                failed: 0,
                errors: []
            };

            service.bulkConfirm(invoiceIds).subscribe(response => {
                expect(response).toEqual(mockResponse);
            });

            const req = httpMock.expectOne(`${baseUrl}/bulk/confirm`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ invoiceIds });
            req.flush(mockResponse);
        });

        it('should bulk cancel invoices', () => {
            const invoiceIds = ['1', '2'];
            const reason = 'Bulk cancellation';
            const mockResponse = {
                success: true,
                processed: 2,
                successful: 2,
                failed: 0,
                errors: []
            };

            service.bulkCancel(invoiceIds, reason).subscribe(response => {
                expect(response).toEqual(mockResponse);
            });

            const req = httpMock.expectOne(`${baseUrl}/bulk/cancel`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ invoiceIds, reason });
            req.flush(mockResponse);
        });
    });

    describe('File Operations', () => {
        it('should get invoice PDF', () => {
            const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });

            service.getInvoicePDF('1').subscribe(blob => {
                expect(blob).toEqual(mockBlob);
            });

            const req = httpMock.expectOne(`${baseUrl}/1/pdf`);
            expect(req.request.method).toBe('GET');
            expect(req.request.responseType).toBe('blob');
            req.flush(mockBlob);
        });

        it('should print invoice', () => {
            const mockBlob = new Blob(['Print content'], { type: 'application/pdf' });

            service.printInvoice('1').subscribe(blob => {
                expect(blob).toEqual(mockBlob);
            });

            const req = httpMock.expectOne(`${baseUrl}/1/print`);
            expect(req.request.method).toBe('GET');
            expect(req.request.responseType).toBe('blob');
            req.flush(mockBlob);
        });
    });

    describe('Estimate Operations', () => {
        it('should get pending estimates', () => {
            const mockEstimate = {
                _id: '1',
                estimateNumber: 'EST-001',
                customerId: 'customer1',
                status: 'pending' as const
            };
            const mockResponse = {
                success: true,
                data: [mockEstimate],
                pagination: {
                    total: 1,
                    page: 1,
                    limit: 10,
                    pages: 1,
                    hasNext: false,
                    hasPrev: false
                }
            };

            service.getPendingEstimates().subscribe(response => {
                expect(response).toEqual(mockResponse);
            });

            const req = httpMock.expectOne((request) => {
                return request.url.includes('/estimates') &&
                    request.params.get('status') === 'pending';
            });
            expect(req.request.method).toBe('GET');
            req.flush(mockResponse);
        });

        it('should convert estimate to invoice', () => {
            const mockResponse = {
                success: true,
                data: mockInvoice
            };

            service.convertEstimateToInvoice('est1').subscribe(response => {
                expect(response).toEqual(mockResponse);
            });

            const req = httpMock.expectOne(`${environment.apiUrl}/estimates/est1/convert-to-invoice`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({});
            req.flush(mockResponse);
        });
    });

    describe('SMS Notifications', () => {
        it('should send SMS notification', () => {
            const smsRequest = {
                invoiceId: '1',
                message: 'Your invoice is ready',
                phoneNumber: '+923001234567'
            };
            const mockResponse = {
                success: true,
                data: null
            };

            service.sendSMSNotification(smsRequest).subscribe(response => {
                expect(response).toEqual(mockResponse);
            });

            const req = httpMock.expectOne(`${baseUrl}/send-sms`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(smsRequest);
            req.flush(mockResponse);
        });
    });

    describe('HTTP Parameter Building', () => {
        it('should build HTTP parameters correctly', () => {
            const queryParams: InvoiceQueryParams = {
                page: 1,
                limit: 10,
                search: 'test invoice',
                status: [InvoiceStatus.DRAFT, InvoiceStatus.CONFIRMED],
                dateFrom: new Date('2024-01-01'),
                dateTo: new Date('2024-01-31'),
                customerId: 'customer1'
            };

            service.getInvoices(queryParams).subscribe();

            const req = httpMock.expectOne((request) => {
                const params = request.params;
                return request.url === baseUrl &&
                    params.get('page') === '1' &&
                    params.get('limit') === '10' &&
                    params.get('search') === 'test invoice' &&
                    params.getAll('status').includes('draft') &&
                    params.getAll('status').includes('confirmed') &&
                    params.get('dateFrom') === new Date('2024-01-01').toISOString() &&
                    params.get('dateTo') === new Date('2024-01-31').toISOString() &&
                    params.get('customerId') === 'customer1';
            });
            expect(req.request.method).toBe('GET');
            req.flush({ success: true, data: [], pagination: {} });
        });

        it('should skip null and undefined parameters', () => {
            const queryParams: InvoiceQueryParams = {
                page: 1,
                limit: 10,
                search: null as any,
                status: undefined as any,
                customerId: ''
            };

            service.getInvoices(queryParams).subscribe();

            const req = httpMock.expectOne((request) => {
                const params = request.params;
                return request.url === baseUrl &&
                    params.get('page') === '1' &&
                    params.get('limit') === '10' &&
                    !params.has('search') &&
                    !params.has('status') &&
                    !params.has('customerId');
            });
            expect(req.request.method).toBe('GET');
            req.flush({ success: true, data: [], pagination: {} });
        });
    });
});