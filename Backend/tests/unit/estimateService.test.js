const estimateService = require('../../src/services/estimateService');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');

// Mock the models
jest.mock('../../src/models/Invoice');
jest.mock('../../src/models/Customer');

describe('Estimate Service - Task 75', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('convertEstimateToInvoice - Task 75.3', () => {
        it('should convert draft estimate to confirmed invoice', async () => {
            const mockEstimate = {
                _id: 'estimate123',
                invoiceNumber: 'SI2024000001',
                status: 'draft',
                estimatePrint: true,
                printFormat: 'estimate',
                expiryDate: new Date(Date.now() + 86400000), // Tomorrow
                save: jest.fn().mockResolvedValue(true),
                populate: jest.fn().mockReturnThis(),
            };

            Invoice.findById = jest.fn().mockResolvedValue(mockEstimate);

            const result = await estimateService.convertEstimateToInvoice('estimate123');

            expect(Invoice.findById).toHaveBeenCalledWith('estimate123');
            expect(mockEstimate.status).toBe('confirmed');
            expect(mockEstimate.estimatePrint).toBe(false);
            expect(mockEstimate.expiryDate).toBeUndefined();
            expect(mockEstimate.printFormat).toBe('standard');
            expect(mockEstimate.save).toHaveBeenCalled();
        });

        it('should throw error when estimate ID is not provided', async () => {
            await expect(estimateService.convertEstimateToInvoice(null))
                .rejects.toThrow('Estimate ID is required');
        });

        it('should throw error when estimate not found', async () => {
            Invoice.findById = jest.fn().mockResolvedValue(null);

            await expect(estimateService.convertEstimateToInvoice('invalid'))
                .rejects.toThrow('Estimate not found');
        });

        it('should throw error when invoice is not draft', async () => {
            const mockInvoice = {
                _id: 'invoice123',
                status: 'confirmed',
                estimatePrint: true,
            };

            Invoice.findById = jest.fn().mockResolvedValue(mockInvoice);

            await expect(estimateService.convertEstimateToInvoice('invoice123'))
                .rejects.toThrow('Only draft estimates can be converted to invoices');
        });

        it('should throw error when estimate is expired', async () => {
            const mockEstimate = {
                _id: 'estimate123',
                status: 'draft',
                estimatePrint: true,
                expiryDate: new Date(Date.now() - 86400000), // Yesterday
            };

            Invoice.findById = jest.fn().mockResolvedValue(mockEstimate);

            await expect(estimateService.convertEstimateToInvoice('estimate123'))
                .rejects.toThrow('Cannot convert expired estimate to invoice');
        });

        it('should keep printFormat if not estimate format', async () => {
            const mockEstimate = {
                _id: 'estimate123',
                status: 'draft',
                estimatePrint: true,
                printFormat: 'logo',
                save: jest.fn().mockResolvedValue(true),
                populate: jest.fn().mockReturnThis(),
            };

            Invoice.findById = jest.fn().mockResolvedValue(mockEstimate);

            await estimateService.convertEstimateToInvoice('estimate123');

            expect(mockEstimate.printFormat).toBe('logo');
        });
    });

    describe('getPendingEstimates - Task 75.4', () => {
        it('should return pending estimates with pagination', async () => {
            const mockEstimates = [
                {
                    _id: 'est1',
                    invoiceNumber: 'SI2024000001',
                    status: 'draft',
                    estimatePrint: true,
                },
                {
                    _id: 'est2',
                    invoiceNumber: 'SI2024000002',
                    status: 'draft',
                    estimatePrint: true,
                },
            ];

            Invoice.find = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockEstimates),
            });

            Invoice.countDocuments = jest.fn().mockResolvedValue(2);

            const result = await estimateService.getPendingEstimates({}, { page: 1, limit: 10 });

            expect(result.estimates).toHaveLength(2);
            expect(result.pagination.total).toBe(2);
            expect(result.pagination.page).toBe(1);
            expect(result.pagination.pages).toBe(1);
        });

        it('should exclude expired estimates by default', async () => {
            Invoice.find = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([]),
            });

            Invoice.countDocuments = jest.fn().mockResolvedValue(0);

            await estimateService.getPendingEstimates({}, { page: 1, limit: 10 });

            const findCall = Invoice.find.mock.calls[0][0];
            expect(findCall.$or).toBeDefined();
            expect(findCall.$or).toContainEqual({ expiryDate: { $exists: false } });
        });

        it('should include expired estimates when explicitly requested', async () => {
            Invoice.find = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([]),
            });

            Invoice.countDocuments = jest.fn().mockResolvedValue(0);

            await estimateService.getPendingEstimates({ includeExpired: true }, { page: 1, limit: 10 });

            const findCall = Invoice.find.mock.calls[0][0];
            expect(findCall.$or).toBeUndefined();
        });

        it('should apply custom filters', async () => {
            Invoice.find = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([]),
            });

            Invoice.countDocuments = jest.fn().mockResolvedValue(0);

            await estimateService.getPendingEstimates({ customerId: 'cust123' }, { page: 1, limit: 10 });

            const findCall = Invoice.find.mock.calls[0][0];
            expect(findCall.customerId).toBe('cust123');
        });
    });

    describe('getExpiredEstimates - Task 75.5', () => {
        it('should return expired estimates with pagination', async () => {
            const mockExpiredEstimates = [
                {
                    _id: 'est1',
                    invoiceNumber: 'SI2024000001',
                    status: 'draft',
                    estimatePrint: true,
                    expiryDate: new Date(Date.now() - 86400000),
                },
            ];

            Invoice.find = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockExpiredEstimates),
            });

            Invoice.countDocuments = jest.fn().mockResolvedValue(1);

            const result = await estimateService.getExpiredEstimates({}, { page: 1, limit: 10 });

            expect(result.estimates).toHaveLength(1);
            expect(result.pagination.total).toBe(1);
        });

        it('should query for expired estimates only', async () => {
            Invoice.find = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([]),
            });

            Invoice.countDocuments = jest.fn().mockResolvedValue(0);

            await estimateService.getExpiredEstimates({}, { page: 1, limit: 10 });

            const findCall = Invoice.find.mock.calls[0][0];
            expect(findCall.status).toBe('draft');
            expect(findCall.estimatePrint).toBe(true);
            expect(findCall.expiryDate.$lt).toBeDefined();
        });
    });

    describe('checkEstimateExpiry - Task 75.5', () => {
        it('should return expiry status for valid estimate', async () => {
            const futureDate = new Date(Date.now() + 86400000 * 5); // 5 days from now
            const mockEstimate = {
                _id: 'estimate123',
                invoiceNumber: 'SI2024000001',
                status: 'draft',
                estimatePrint: true,
                expiryDate: futureDate,
            };

            Invoice.findById = jest.fn().mockResolvedValue(mockEstimate);

            const result = await estimateService.checkEstimateExpiry('estimate123');

            expect(result.invoiceId).toBe('estimate123');
            expect(result.isExpired).toBe(false);
            expect(result.daysUntilExpiry).toBeGreaterThan(0);
        });

        it('should detect expired estimate', async () => {
            const pastDate = new Date(Date.now() - 86400000); // Yesterday
            const mockEstimate = {
                _id: 'estimate123',
                invoiceNumber: 'SI2024000001',
                status: 'draft',
                estimatePrint: true,
                expiryDate: pastDate,
            };

            Invoice.findById = jest.fn().mockResolvedValue(mockEstimate);

            const result = await estimateService.checkEstimateExpiry('estimate123');

            expect(result.isExpired).toBe(true);
            expect(result.daysUntilExpiry).toBeLessThan(0);
        });

        it('should throw error when invoice ID is not provided', async () => {
            await expect(estimateService.checkEstimateExpiry(null))
                .rejects.toThrow('Invoice ID is required');
        });

        it('should throw error when invoice not found', async () => {
            Invoice.findById = jest.fn().mockResolvedValue(null);

            await expect(estimateService.checkEstimateExpiry('invalid'))
                .rejects.toThrow('Invoice not found');
        });

        it('should throw error when invoice is not an estimate', async () => {
            const mockInvoice = {
                _id: 'invoice123',
                estimatePrint: false,
            };

            Invoice.findById = jest.fn().mockResolvedValue(mockInvoice);

            await expect(estimateService.checkEstimateExpiry('invoice123'))
                .rejects.toThrow('Invoice is not an estimate');
        });
    });

    describe('markEstimateAsExpired - Task 75.5', () => {
        it('should mark expired estimate as cancelled', async () => {
            const pastDate = new Date(Date.now() - 86400000);
            const mockEstimate = {
                _id: 'estimate123',
                status: 'draft',
                estimatePrint: true,
                expiryDate: pastDate,
                notes: '',
                save: jest.fn().mockResolvedValue(true),
            };

            Invoice.findById = jest.fn().mockResolvedValue(mockEstimate);

            const result = await estimateService.markEstimateAsExpired('estimate123');

            expect(mockEstimate.status).toBe('cancelled');
            expect(mockEstimate.notes).toContain('EXPIRED');
            expect(mockEstimate.save).toHaveBeenCalled();
        });

        it('should throw error when estimate has not expired yet', async () => {
            const futureDate = new Date(Date.now() + 86400000);
            const mockEstimate = {
                _id: 'estimate123',
                status: 'draft',
                estimatePrint: true,
                expiryDate: futureDate,
            };

            Invoice.findById = jest.fn().mockResolvedValue(mockEstimate);

            await expect(estimateService.markEstimateAsExpired('estimate123'))
                .rejects.toThrow('Estimate has not expired yet');
        });

        it('should throw error when estimate is not draft', async () => {
            const pastDate = new Date(Date.now() - 86400000);
            const mockEstimate = {
                _id: 'estimate123',
                status: 'confirmed',
                estimatePrint: true,
                expiryDate: pastDate,
            };

            Invoice.findById = jest.fn().mockResolvedValue(mockEstimate);

            await expect(estimateService.markEstimateAsExpired('estimate123'))
                .rejects.toThrow('Only draft estimates can be marked as expired');
        });
    });

    describe('calculateDefaultExpiryDate', () => {
        it('should calculate default expiry date (30 days)', () => {
            const invoiceDate = new Date('2024-01-01');
            const expiryDate = estimateService.calculateDefaultExpiryDate(invoiceDate);

            const expectedDate = new Date('2024-01-31');
            expect(expiryDate.toDateString()).toBe(expectedDate.toDateString());
        });

        it('should calculate custom expiry date', () => {
            const invoiceDate = new Date('2024-01-01');
            const expiryDate = estimateService.calculateDefaultExpiryDate(invoiceDate, 60);

            const expectedDate = new Date('2024-03-01');
            expect(expiryDate.toDateString()).toBe(expectedDate.toDateString());
        });
    });
});
