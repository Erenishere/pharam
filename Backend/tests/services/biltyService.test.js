/**
 * Unit Tests for Bilty Service
 * Phase 2 - Requirement 22: Bilty (Transport) Management System
 * Tasks 66.2, 66.3, 66.4, 66.5
 */

const biltyService = require('../../src/services/biltyService');
const Invoice = require('../../src/models/Invoice');

// Mock the Invoice model
jest.mock('../../src/models/Invoice');

describe('Bilty Service - Phase 2 (Requirement 22)', () => {
    let mockInvoice;

    beforeEach(() => {
        jest.clearAllMocks();

        mockInvoice = {
            _id: 'invoice123',
            invoiceNumber: 'PI2023000001',
            type: 'purchase',
            supplierId: 'supplier123',
            biltyNo: null,
            biltyDate: null,
            transportCompany: null,
            transportCharges: 0,
            biltyStatus: 'pending',
            status: 'draft',
            save: jest.fn().mockResolvedValue(true)
        };
    });

    describe('recordBilty - Task 66.2', () => {
        it('should record bilty information for a purchase invoice', async () => {
            Invoice.findById = jest.fn().mockResolvedValue(mockInvoice);

            const biltyData = {
                biltyNo: 'BLT-2023-001',
                biltyDate: '2023-12-01',
                transportCompany: 'ABC Transport',
                transportCharges: 5000
            };

            const result = await biltyService.recordBilty('invoice123', biltyData);

            expect(Invoice.findById).toHaveBeenCalledWith('invoice123');
            expect(mockInvoice.biltyNo).toBe('BLT-2023-001');
            expect(mockInvoice.transportCompany).toBe('ABC Transport');
            expect(mockInvoice.transportCharges).toBe(5000);
            expect(mockInvoice.biltyStatus).toBe('pending');
            expect(mockInvoice.save).toHaveBeenCalled();
        });

        it('should throw error if invoice ID is not provided', async () => {
            await expect(
                biltyService.recordBilty(null, {})
            ).rejects.toThrow('Invoice ID is required');
        });

        it('should throw error if bilty data is not provided', async () => {
            await expect(
                biltyService.recordBilty('invoice123', null)
            ).rejects.toThrow('Bilty data is required');
        });

        it('should throw error if invoice not found', async () => {
            Invoice.findById = jest.fn().mockResolvedValue(null);

            await expect(
                biltyService.recordBilty('invoice123', { biltyNo: 'BLT-001' })
            ).rejects.toThrow('Invoice not found');
        });

        it('should throw error if invoice is not a purchase invoice', async () => {
            mockInvoice.type = 'sales';
            Invoice.findById = jest.fn().mockResolvedValue(mockInvoice);

            await expect(
                biltyService.recordBilty('invoice123', { biltyNo: 'BLT-001' })
            ).rejects.toThrow('Bilty can only be recorded for purchase invoices');
        });

        it('should throw error if transport charges are negative', async () => {
            Invoice.findById = jest.fn().mockResolvedValue(mockInvoice);

            await expect(
                biltyService.recordBilty('invoice123', { transportCharges: -100 })
            ).rejects.toThrow('Transport charges cannot be negative');
        });

        it('should allow partial bilty data updates', async () => {
            Invoice.findById = jest.fn().mockResolvedValue(mockInvoice);

            const biltyData = {
                biltyNo: 'BLT-2023-001'
            };

            await biltyService.recordBilty('invoice123', biltyData);

            expect(mockInvoice.biltyNo).toBe('BLT-2023-001');
            expect(mockInvoice.save).toHaveBeenCalled();
        });
    });

    describe('updateBiltyStatus - Task 66.3', () => {
        beforeEach(() => {
            mockInvoice.biltyNo = 'BLT-2023-001';
        });

        it('should update bilty status to in_transit', async () => {
            Invoice.findById = jest.fn().mockResolvedValue(mockInvoice);

            const result = await biltyService.updateBiltyStatus('invoice123', 'in_transit');

            expect(Invoice.findById).toHaveBeenCalledWith('invoice123');
            expect(mockInvoice.biltyStatus).toBe('in_transit');
            expect(mockInvoice.save).toHaveBeenCalled();
        });

        it('should update bilty status to received', async () => {
            Invoice.findById = jest.fn().mockResolvedValue(mockInvoice);

            const result = await biltyService.updateBiltyStatus('invoice123', 'received');

            expect(mockInvoice.biltyStatus).toBe('received');
            expect(mockInvoice.save).toHaveBeenCalled();
        });

        it('should throw error if invoice ID is not provided', async () => {
            await expect(
                biltyService.updateBiltyStatus(null, 'in_transit')
            ).rejects.toThrow('Invoice ID is required');
        });

        it('should throw error if status is not provided', async () => {
            await expect(
                biltyService.updateBiltyStatus('invoice123', null)
            ).rejects.toThrow('Status is required');
        });

        it('should throw error if status is invalid', async () => {
            Invoice.findById = jest.fn().mockResolvedValue(mockInvoice);

            await expect(
                biltyService.updateBiltyStatus('invoice123', 'invalid_status')
            ).rejects.toThrow('Invalid status. Must be one of: pending, in_transit, received');
        });

        it('should throw error if invoice does not have bilty information', async () => {
            mockInvoice.biltyNo = null;
            Invoice.findById = jest.fn().mockResolvedValue(mockInvoice);

            await expect(
                biltyService.updateBiltyStatus('invoice123', 'in_transit')
            ).rejects.toThrow('Invoice does not have bilty information');
        });
    });

    describe('markBiltyAsReceived - Task 66.4', () => {
        beforeEach(() => {
            mockInvoice.biltyNo = 'BLT-2023-001';
        });

        it('should mark bilty as received', async () => {
            Invoice.findById = jest.fn().mockResolvedValue(mockInvoice);

            const result = await biltyService.markBiltyAsReceived('invoice123');

            expect(Invoice.findById).toHaveBeenCalledWith('invoice123');
            expect(mockInvoice.biltyStatus).toBe('received');
            expect(mockInvoice.save).toHaveBeenCalled();
        });

        it('should update invoice status to confirmed if it was draft', async () => {
            mockInvoice.status = 'draft';
            Invoice.findById = jest.fn().mockResolvedValue(mockInvoice);

            await biltyService.markBiltyAsReceived('invoice123');

            expect(mockInvoice.status).toBe('confirmed');
            expect(mockInvoice.save).toHaveBeenCalled();
        });

        it('should not change invoice status if already confirmed', async () => {
            mockInvoice.status = 'confirmed';
            Invoice.findById = jest.fn().mockResolvedValue(mockInvoice);

            await biltyService.markBiltyAsReceived('invoice123');

            expect(mockInvoice.status).toBe('confirmed');
        });

        it('should throw error if invoice ID is not provided', async () => {
            await expect(
                biltyService.markBiltyAsReceived(null)
            ).rejects.toThrow('Invoice ID is required');
        });

        it('should throw error if invoice not found', async () => {
            Invoice.findById = jest.fn().mockResolvedValue(null);

            await expect(
                biltyService.markBiltyAsReceived('invoice123')
            ).rejects.toThrow('Invoice not found');
        });

        it('should throw error if invoice does not have bilty information', async () => {
            mockInvoice.biltyNo = null;
            Invoice.findById = jest.fn().mockResolvedValue(mockInvoice);

            await expect(
                biltyService.markBiltyAsReceived('invoice123')
            ).rejects.toThrow('Invoice does not have bilty information');
        });
    });

    describe('getPendingBilties - Task 66.5', () => {
        it('should return list of pending bilties', async () => {
            const mockBilties = [
                {
                    invoiceNumber: 'PI2023000001',
                    biltyNo: 'BLT-001',
                    biltyDate: new Date('2023-12-01'),
                    transportCompany: 'ABC Transport',
                    transportCharges: 5000,
                    biltyStatus: 'pending',
                    supplierId: { name: 'Supplier A' }
                },
                {
                    invoiceNumber: 'PI2023000002',
                    biltyNo: 'BLT-002',
                    biltyDate: new Date('2023-12-02'),
                    transportCompany: 'XYZ Transport',
                    transportCharges: 3000,
                    biltyStatus: 'in_transit',
                    supplierId: { name: 'Supplier B' }
                }
            ];

            const mockQuery = {
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                select: jest.fn().mockResolvedValue(mockBilties)
            };

            Invoice.find = jest.fn().mockReturnValue(mockQuery);

            const result = await biltyService.getPendingBilties();

            expect(Invoice.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    biltyNo: { $exists: true, $ne: null, $ne: '' },
                    biltyStatus: { $in: ['pending', 'in_transit'] },
                    status: { $ne: 'cancelled' },
                    type: { $in: ['purchase', 'return_purchase'] }
                })
            );
            expect(result).toHaveLength(2);
            expect(result[0].biltyNo).toBe('BLT-001');
        });

        it('should filter by supplier ID', async () => {
            const mockQuery = {
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                select: jest.fn().mockResolvedValue([])
            };

            Invoice.find = jest.fn().mockReturnValue(mockQuery);

            await biltyService.getPendingBilties({ supplierId: 'supplier123' });

            expect(Invoice.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    supplierId: 'supplier123'
                })
            );
        });

        it('should filter by transport company', async () => {
            const mockQuery = {
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                select: jest.fn().mockResolvedValue([])
            };

            Invoice.find = jest.fn().mockReturnValue(mockQuery);

            await biltyService.getPendingBilties({ transportCompany: 'ABC' });

            expect(Invoice.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    transportCompany: expect.any(RegExp)
                })
            );
        });

        it('should filter by date range', async () => {
            const mockQuery = {
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                select: jest.fn().mockResolvedValue([])
            };

            Invoice.find = jest.fn().mockReturnValue(mockQuery);

            await biltyService.getPendingBilties({
                startDate: '2023-12-01',
                endDate: '2023-12-31'
            });

            expect(Invoice.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    biltyDate: expect.objectContaining({
                        $gte: expect.any(Date),
                        $lte: expect.any(Date)
                    })
                })
            );
        });
    });

    describe('getBiltyDetails', () => {
        it('should return bilty details for an invoice', async () => {
            const mockInvoiceWithBilty = {
                ...mockInvoice,
                biltyNo: 'BLT-2023-001',
                biltyDate: new Date('2023-12-01'),
                transportCompany: 'ABC Transport',
                transportCharges: 5000,
                totals: { grandTotal: 100000 },
                items: [{}, {}],
                supplierId: { name: 'Supplier A' }
            };

            const mockQuery = {
                populate: jest.fn().mockReturnThis(),
                select: jest.fn().mockResolvedValue(mockInvoiceWithBilty)
            };

            Invoice.findById = jest.fn().mockReturnValue(mockQuery);

            const result = await biltyService.getBiltyDetails('invoice123');

            expect(result).toHaveProperty('biltyNo', 'BLT-2023-001');
            expect(result).toHaveProperty('transportCompany', 'ABC Transport');
            expect(result).toHaveProperty('itemCount', 2);
        });

        it('should throw error if invoice does not have bilty information', async () => {
            const mockQuery = {
                populate: jest.fn().mockReturnThis(),
                select: jest.fn().mockResolvedValue({ ...mockInvoice, biltyNo: null })
            };

            Invoice.findById = jest.fn().mockReturnValue(mockQuery);

            await expect(
                biltyService.getBiltyDetails('invoice123')
            ).rejects.toThrow('Invoice does not have bilty information');
        });
    });
});
