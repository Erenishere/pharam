const dueInvoiceTrackingService = require('../../src/services/dueInvoiceTrackingService');
const Customer = require('../../src/models/Customer');
const Invoice = require('../../src/models/Invoice');

jest.mock('../../src/models/Customer');
jest.mock('../../src/models/Invoice');

/**
 * Unit Tests for Due Invoice Tracking Service
 * Phase 2 - Requirement 30: Due Invoice Quantity Tracking
 * Task 74.2: Create due invoice update service
 */
describe('DueInvoiceTrackingService - Task 74.2 (Requirement 30.1, 30.2, 30.3, 30.4, 30.5)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('updateDueInvoiceCount', () => {
        it('should update due invoice count for a customer', async () => {
            const mockCustomer = {
                _id: 'customer123',
                name: 'Test Customer',
                dueInvoiceQty: 0,
                save: jest.fn().mockResolvedValue(true),
            };

            Customer.findById.mockResolvedValue(mockCustomer);
            Invoice.countDocuments.mockResolvedValue(3);

            const result = await dueInvoiceTrackingService.updateDueInvoiceCount('customer123');

            expect(Customer.findById).toHaveBeenCalledWith('customer123');
            expect(Invoice.countDocuments).toHaveBeenCalledWith({
                customerId: 'customer123',
                type: { $in: ['sales', 'return_sales'] },
                status: { $in: ['confirmed', 'paid'] },
                paymentStatus: { $in: ['pending', 'partial'] },
                dueDate: { $lt: expect.any(Date) },
            });
            expect(mockCustomer.dueInvoiceQty).toBe(3);
            expect(mockCustomer.save).toHaveBeenCalled();
            expect(result.dueInvoiceQty).toBe(3);
            expect(result.updated).toBe(true);
        });

        it('should set count to 0 when no due invoices', async () => {
            const mockCustomer = {
                _id: 'customer123',
                name: 'Test Customer',
                dueInvoiceQty: 5,
                save: jest.fn().mockResolvedValue(true),
            };

            Customer.findById.mockResolvedValue(mockCustomer);
            Invoice.countDocuments.mockResolvedValue(0);

            const result = await dueInvoiceTrackingService.updateDueInvoiceCount('customer123');

            expect(mockCustomer.dueInvoiceQty).toBe(0);
            expect(result.dueInvoiceQty).toBe(0);
        });

        it('should throw error for missing customer ID', async () => {
            await expect(
                dueInvoiceTrackingService.updateDueInvoiceCount(null)
            ).rejects.toThrow('Customer ID is required');
        });

        it('should throw error when customer not found', async () => {
            Customer.findById.mockResolvedValue(null);

            await expect(
                dueInvoiceTrackingService.updateDueInvoiceCount('customer123')
            ).rejects.toThrow('Customer not found');
        });
    });

    describe('getCustomersByDueInvoices', () => {
        it('should return customers sorted by due invoice count', async () => {
            const mockCustomers = [
                { _id: '1', name: 'Customer A', dueInvoiceQty: 10 },
                { _id: '2', name: 'Customer B', dueInvoiceQty: 5 },
                { _id: '3', name: 'Customer C', dueInvoiceQty: 3 },
            ];

            const mockQuery = {
                select: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockCustomers),
            };

            Customer.find.mockReturnValue(mockQuery);

            const result = await dueInvoiceTrackingService.getCustomersByDueInvoices(50, 1);

            expect(Customer.find).toHaveBeenCalledWith({
                dueInvoiceQty: { $gte: 1 },
                isActive: true,
            });
            expect(mockQuery.sort).toHaveBeenCalledWith({ dueInvoiceQty: -1 });
            expect(mockQuery.limit).toHaveBeenCalledWith(50);
            expect(result).toEqual(mockCustomers);
        });

        it('should use default parameters', async () => {
            const mockQuery = {
                select: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([]),
            };

            Customer.find.mockReturnValue(mockQuery);

            await dueInvoiceTrackingService.getCustomersByDueInvoices();

            expect(Customer.find).toHaveBeenCalledWith({
                dueInvoiceQty: { $gte: 1 },
                isActive: true,
            });
            expect(mockQuery.limit).toHaveBeenCalledWith(50);
        });

        it('should throw error for invalid limit', async () => {
            await expect(
                dueInvoiceTrackingService.getCustomersByDueInvoices(0)
            ).rejects.toThrow('Limit must be greater than 0');
        });

        it('should throw error for negative minimum', async () => {
            await expect(
                dueInvoiceTrackingService.getCustomersByDueInvoices(50, -1)
            ).rejects.toThrow('Minimum due invoices cannot be negative');
        });
    });

    describe('filterCustomersByDueInvoices', () => {
        it('should filter customers by due invoice range', async () => {
            const mockCustomers = [
                { _id: '1', name: 'Customer A', dueInvoiceQty: 7 },
                { _id: '2', name: 'Customer B', dueInvoiceQty: 5 },
            ];

            const mockQuery = {
                select: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockCustomers),
            };

            Customer.find.mockReturnValue(mockQuery);

            const result = await dueInvoiceTrackingService.filterCustomersByDueInvoices(5, 10);

            expect(Customer.find).toHaveBeenCalledWith({
                dueInvoiceQty: { $gte: 5, $lte: 10 },
                isActive: true,
            });
            expect(result).toEqual(mockCustomers);
        });

        it('should filter with only minimum count', async () => {
            const mockQuery = {
                select: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([]),
            };

            Customer.find.mockReturnValue(mockQuery);

            await dueInvoiceTrackingService.filterCustomersByDueInvoices(3);

            expect(Customer.find).toHaveBeenCalledWith({
                dueInvoiceQty: { $gte: 3 },
                isActive: true,
            });
        });

        it('should use default minimum of 0', async () => {
            const mockQuery = {
                select: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([]),
            };

            Customer.find.mockReturnValue(mockQuery);

            await dueInvoiceTrackingService.filterCustomersByDueInvoices();

            expect(Customer.find).toHaveBeenCalledWith({
                dueInvoiceQty: { $gte: 0 },
                isActive: true,
            });
        });

        it('should throw error for negative minimum', async () => {
            await expect(
                dueInvoiceTrackingService.filterCustomersByDueInvoices(-1)
            ).rejects.toThrow('Minimum count cannot be negative');
        });

        it('should throw error when max is less than min', async () => {
            await expect(
                dueInvoiceTrackingService.filterCustomersByDueInvoices(10, 5)
            ).rejects.toThrow('Maximum count cannot be less than minimum count');
        });
    });

    describe('updateAllCustomerDueCounts', () => {
        it('should update all customer due counts', async () => {
            const mockCustomers = [
                { _id: 'customer1' },
                { _id: 'customer2' },
                { _id: 'customer3' },
            ];

            const mockQuery = {
                select: jest.fn().mockResolvedValue(mockCustomers),
            };

            Customer.find.mockReturnValue(mockQuery);

            // Mock updateDueInvoiceCount
            const originalUpdate = dueInvoiceTrackingService.updateDueInvoiceCount;
            dueInvoiceTrackingService.updateDueInvoiceCount = jest.fn().mockResolvedValue({
                updated: true,
            });

            const result = await dueInvoiceTrackingService.updateAllCustomerDueCounts();

            expect(result.totalCustomers).toBe(3);
            expect(result.successCount).toBe(3);
            expect(result.errorCount).toBe(0);

            // Restore original method
            dueInvoiceTrackingService.updateDueInvoiceCount = originalUpdate;
        });

        it('should handle errors for individual customers', async () => {
            const mockCustomers = [
                { _id: 'customer1' },
                { _id: 'customer2' },
            ];

            const mockQuery = {
                select: jest.fn().mockResolvedValue(mockCustomers),
            };

            Customer.find.mockReturnValue(mockQuery);

            // Mock updateDueInvoiceCount with one failure
            const originalUpdate = dueInvoiceTrackingService.updateDueInvoiceCount;
            dueInvoiceTrackingService.updateDueInvoiceCount = jest.fn()
                .mockResolvedValueOnce({ updated: true })
                .mockRejectedValueOnce(new Error('Update failed'));

            const result = await dueInvoiceTrackingService.updateAllCustomerDueCounts();

            expect(result.totalCustomers).toBe(2);
            expect(result.successCount).toBe(1);
            expect(result.errorCount).toBe(1);
            expect(result.errors).toHaveLength(1);

            // Restore original method
            dueInvoiceTrackingService.updateDueInvoiceCount = originalUpdate;
        });
    });

    describe('getDueInvoiceDetails', () => {
        it('should return due invoice details for a customer', async () => {
            const mockCustomer = {
                _id: 'customer123',
                code: 'CUST001',
                name: 'Test Customer',
                dueInvoiceQty: 2,
                financialInfo: { creditLimit: 10000 },
            };

            const mockInvoices = [
                {
                    invoiceNumber: 'INV001',
                    invoiceDate: new Date('2024-01-01'),
                    dueDate: new Date('2024-01-15'),
                    totals: { grandTotal: 1000 },
                    paymentStatus: 'pending',
                },
                {
                    invoiceNumber: 'INV002',
                    invoiceDate: new Date('2024-01-10'),
                    dueDate: new Date('2024-01-20'),
                    totals: { grandTotal: 2000 },
                    paymentStatus: 'partial',
                },
            ];

            const mockCustomerQuery = {
                select: jest.fn().mockResolvedValue(mockCustomer),
            };

            const mockInvoiceQuery = {
                select: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockInvoices),
            };

            Customer.findById.mockReturnValue(mockCustomerQuery);
            Invoice.find.mockReturnValue(mockInvoiceQuery);

            const result = await dueInvoiceTrackingService.getDueInvoiceDetails('customer123');

            expect(result.customer.code).toBe('CUST001');
            expect(result.dueInvoiceQty).toBe(2);
            expect(result.totalDueAmount).toBe(3000);
            expect(result.dueInvoices).toHaveLength(2);
            expect(result.dueInvoices[0]).toHaveProperty('daysOverdue');
        });

        it('should throw error for missing customer ID', async () => {
            await expect(
                dueInvoiceTrackingService.getDueInvoiceDetails(null)
            ).rejects.toThrow('Customer ID is required');
        });

        it('should throw error when customer not found', async () => {
            const mockQuery = {
                select: jest.fn().mockResolvedValue(null),
            };

            Customer.findById.mockReturnValue(mockQuery);

            await expect(
                dueInvoiceTrackingService.getDueInvoiceDetails('customer123')
            ).rejects.toThrow('Customer not found');
        });
    });
});
