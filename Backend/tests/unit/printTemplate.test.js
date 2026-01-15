const printTemplateService = require('../../src/services/printTemplateService');
const Invoice = require('../../src/models/Invoice');

// Mock the Invoice model
jest.mock('../../src/models/Invoice');

describe('Print Template Service - Phase 2 (Requirement 19)', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    const mockInvoice = {
        _id: 'invoice123',
        invoiceNumber: 'INV001',
        type: 'sales',
        invoiceDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        status: 'confirmed',
        paymentStatus: 'pending',
        printFormat: 'standard',
        customerId: {
            _id: 'cust123',
            code: 'CUST001',
            name: 'Test Customer',
            address: '123 Main St',
            city: 'Test City',
            phone: '1234567890',
            email: 'customer@test.com',
            gstNumber: 'GST123'
        },
        items: [
            {
                itemId: {
                    _id: 'item1',
                    code: 'ITEM001',
                    name: 'Test Item 1',
                    unit: 'pcs'
                },
                quantity: 10,
                unitPrice: 100,
                discount: 10,
                gstRate: 18,
                gstAmount: 162,
                lineTotal: 1000,
                warrantyMonths: 12,
                warrantyDetails: '1 year warranty'
            }
        ],
        totals: {
            subtotal: 1000,
            totalDiscount: 10,
            totalTax: 162,
            grandTotal: 1152,
            gst4Total: 0,
            gst18Total: 162
        },
        createdBy: {
            username: 'admin',
            email: 'admin@test.com'
        }
    };

    describe('generatePrintData - Task 62.2', () => {
        it('should generate print data for standard format', async () => {
            Invoice.findById = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockInvoice)
            });

            const result = await printTemplateService.generatePrintData('invoice123');

            expect(result.format).toBe('standard');
            expect(result.invoice).toBeTruthy();
            expect(result.party).toBeTruthy();
            expect(result.items).toHaveLength(1);
            expect(result.totals).toBeTruthy();
            expect(result.metadata).toBeTruthy();
            expect(result.formatting).toBeTruthy();
        });

        it('should throw error when invoiceId is not provided', async () => {
            await expect(printTemplateService.generatePrintData(null))
                .rejects.toThrow('Invoice ID is required');
        });

        it('should throw error when invoice not found', async () => {
            Invoice.findById = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(null)
            });

            await expect(printTemplateService.generatePrintData('invalid'))
                .rejects.toThrow('Invoice not found');
        });

        it('should throw error for invalid print format', async () => {
            Invoice.findById = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockInvoice)
            });

            await expect(printTemplateService.generatePrintData('invoice123', 'invalid_format'))
                .rejects.toThrow('Invalid print format');
        });

        it('should use provided format over invoice printFormat', async () => {
            Invoice.findById = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockInvoice)
            });

            const result = await printTemplateService.generatePrintData('invoice123', 'thermal');

            expect(result.format).toBe('thermal');
        });
    });

    describe('Logo Inclusion Logic - Task 62.3', () => {
        it('should include logo for logo format', async () => {
            Invoice.findById = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue({ ...mockInvoice, printFormat: 'logo' })
            });

            const result = await printTemplateService.generatePrintData('invoice123');

            expect(result.metadata.includeLogo).toBe(true);
        });

        it('should include logo for warranty_bill format', async () => {
            Invoice.findById = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue({ ...mockInvoice, printFormat: 'warranty_bill' })
            });

            const result = await printTemplateService.generatePrintData('invoice123');

            expect(result.metadata.includeLogo).toBe(true);
        });

        it('should exclude logo for letterhead format', async () => {
            Invoice.findById = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue({ ...mockInvoice, printFormat: 'letterhead' })
            });

            const result = await printTemplateService.generatePrintData('invoice123');

            expect(result.metadata.includeLogo).toBe(false);
        });
    });

    describe('Thermal Print Format - Task 62.4', () => {
        it('should generate compact thermal format', async () => {
            Invoice.findById = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue({ ...mockInvoice, printFormat: 'thermal' })
            });

            const result = await printTemplateService.generatePrintData('invoice123');

            expect(result.format).toBe('thermal');
            expect(result.formatting.pageSize).toBe('80mm');
            expect(result.formatting.fontSize).toBe('small');
            expect(result.formatting.compactLayout).toBe(true);
            expect(result.formatting.showHeader).toBe(false);
            expect(result.formatting.showBankDetails).toBe(false);
        });

        it('should exclude discount and GST details in thermal format items', async () => {
            Invoice.findById = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue({ ...mockInvoice, printFormat: 'thermal' })
            });

            const result = await printTemplateService.generatePrintData('invoice123');

            expect(result.items[0].discount).toBeUndefined();
            expect(result.items[0].gstRate).toBeUndefined();
        });
    });

    describe('Estimate/Quotation Format - Task 62.5', () => {
        it('should mark as ESTIMATE when estimatePrint is true', async () => {
            Invoice.findById = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue({
                    ...mockInvoice,
                    printFormat: 'estimate',
                    estimatePrint: true
                })
            });

            const result = await printTemplateService.generatePrintData('invoice123');

            expect(result.metadata.documentLabel).toBe('ESTIMATE');
            expect(result.metadata.isEstimate).toBe(true);
            expect(result.formatting.watermark).toBe('ESTIMATE');
        });

        it('should mark as QUOTATION when estimatePrint is false', async () => {
            Invoice.findById = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue({
                    ...mockInvoice,
                    printFormat: 'estimate',
                    estimatePrint: false
                })
            });

            const result = await printTemplateService.generatePrintData('invoice123');

            expect(result.metadata.documentLabel).toBe('QUOTATION');
        });

        it('should exclude bank details in estimate format', async () => {
            Invoice.findById = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue({ ...mockInvoice, printFormat: 'estimate' })
            });

            const result = await printTemplateService.generatePrintData('invoice123');

            expect(result.formatting.showBankDetails).toBe(false);
            expect(result.formatting.showPaymentStatus).toBe(false);
        });
    });

    describe('Voucher Format - Task 62.6', () => {
        it('should include payment details in voucher format', async () => {
            Invoice.findById = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue({
                    ...mockInvoice,
                    printFormat: 'voucher',
                    paidAmount: 500
                })
            });

            const result = await printTemplateService.generatePrintData('invoice123');

            expect(result.formatting.showPaymentDetails).toBe(true);
            expect(result.formatting.showBankDetails).toBe(true);
            expect(result.totals.paidAmount).toBe(500);
            expect(result.totals.remainingAmount).toBe(652); // 1152 - 500
        });
    });

    describe('Store Copy Format - Task 62.7', () => {
        it('should include warehouse and batch details', async () => {
            const invoiceWithBatch = {
                ...mockInvoice,
                printFormat: 'store_copy',
                items: [
                    {
                        ...mockInvoice.items[0],
                        batchNumber: 'BATCH001',
                        expiryDate: new Date('2025-12-31'),
                        boxQuantity: 5,
                        unitQuantity: 50
                    }
                ]
            };

            Invoice.findById = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(invoiceWithBatch)
            });

            const result = await printTemplateService.generatePrintData('invoice123');

            expect(result.formatting.showWarehouseDetails).toBe(true);
            expect(result.formatting.showBatchDetails).toBe(true);
            expect(result.formatting.watermark).toBe('STORE COPY');
            expect(result.items[0].batchNumber).toBe('BATCH001');
            expect(result.items[0].boxQuantity).toBe(5);
        });
    });

    describe('Tax Invoice Format - Task 62.8', () => {
        it('should include detailed tax breakdown', async () => {
            Invoice.findById = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue({ ...mockInvoice, printFormat: 'tax_invoice' })
            });

            const result = await printTemplateService.generatePrintData('invoice123');

            expect(result.formatting.showTaxBreakdown).toBe(true);
            expect(result.formatting.showGSTNumbers).toBe(true);
            expect(result.formatting.showTaxRegistration).toBe(true);
            expect(result.totals.gst4Total).toBe(0);
            expect(result.totals.gst18Total).toBe(162);
        });

        it('should include tax details in items', async () => {
            Invoice.findById = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue({ ...mockInvoice, printFormat: 'tax_invoice' })
            });

            const result = await printTemplateService.generatePrintData('invoice123');

            expect(result.items[0].gstRate).toBe(18);
            expect(result.items[0].gstAmount).toBe(162);
        });
    });

    describe('Warranty Bill Format - Task 62.9', () => {
        it('should include warranty information', async () => {
            Invoice.findById = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue({ ...mockInvoice, printFormat: 'warranty_bill' })
            });

            const result = await printTemplateService.generatePrintData('invoice123');

            expect(result.formatting.showWarrantyInfo).toBe(true);
            expect(result.formatting.showWarrantyTerms).toBe(true);
            expect(result.metadata.includeLogo).toBe(true);
            expect(result.items[0].warrantyMonths).toBe(12);
            expect(result.items[0].warrantyDetails).toBe('1 year warranty');
        });
    });

    describe('getAvailableFormats', () => {
        it('should return all available print formats', () => {
            const formats = printTemplateService.getAvailableFormats();

            expect(formats).toHaveLength(9);
            expect(formats[0].value).toBe('standard');
            expect(formats[3].value).toBe('thermal');
            expect(formats[8].value).toBe('warranty_bill');
        });
    });
});
