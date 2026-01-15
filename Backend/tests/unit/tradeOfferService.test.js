const mongoose = require('mongoose');

// Mock mongoose
jest.mock('mongoose', () => ({
    model: jest.fn(),
    Schema: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
}));

const tradeOfferService = require('../../src/services/tradeOfferService');

describe('Trade Offer Service - Phase 2 (Requirement 20)', () => {
    describe('calculateTO1', () => {
        it('should calculate TO1 based on percentage', () => {
            const amount = 1000;
            const percent = 10;
            const result = tradeOfferService.calculateTO1(amount, percent);
            expect(result).toBe(100);
        });

        it('should use fixed amount if provided', () => {
            const amount = 1000;
            const percent = 10;
            const fixedAmount = 150;
            const result = tradeOfferService.calculateTO1(amount, percent, fixedAmount);
            expect(result).toBe(150);
        });

        it('should return 0 for invalid inputs', () => {
            expect(tradeOfferService.calculateTO1(0, 10)).toBe(0);
            expect(tradeOfferService.calculateTO1(1000, -5)).toBe(0);
            expect(tradeOfferService.calculateTO1(-1000, 10)).toBe(0);
        });
    });

    describe('calculateTO2', () => {
        it('should calculate TO2 based on percentage', () => {
            const amount = 900;
            const percent = 5;
            const result = tradeOfferService.calculateTO2(amount, percent);
            expect(result).toBe(45);
        });

        it('should use fixed amount if provided', () => {
            const amount = 900;
            const percent = 5;
            const fixedAmount = 50;
            const result = tradeOfferService.calculateTO2(amount, percent, fixedAmount);
            expect(result).toBe(50);
        });
    });

    describe('calculateNetAfterTO', () => {
        it('should calculate net amount with both TO1 and TO2 (percentage)', () => {
            const subtotal = 1000;
            const to1 = { percent: 10 }; // 100
            const to2 = { percent: 5 };  // 5% of (1000-100) = 45

            const result = tradeOfferService.calculateNetAfterTO(subtotal, to1, to2);

            expect(result.to1Amount).toBe(100);
            expect(result.to2Amount).toBe(45);
            expect(result.netAmount).toBe(855);
        });

        it('should calculate net amount with fixed amounts', () => {
            const subtotal = 1000;
            const to1 = { amount: 100 };
            const to2 = { amount: 50 };

            const result = tradeOfferService.calculateNetAfterTO(subtotal, to1, to2);

            expect(result.to1Amount).toBe(100);
            expect(result.to2Amount).toBe(50);
            expect(result.netAmount).toBe(850);
        });

        it('should handle mixed percentage and fixed amount', () => {
            const subtotal = 1000;
            const to1 = { percent: 10 }; // 100
            const to2 = { amount: 50 };  // 50

            const result = tradeOfferService.calculateNetAfterTO(subtotal, to1, to2);

            expect(result.to1Amount).toBe(100);
            expect(result.to2Amount).toBe(50);
            expect(result.netAmount).toBe(850);
        });

        it('should handle zero subtotal', () => {
            const result = tradeOfferService.calculateNetAfterTO(0, { percent: 10 }, { percent: 5 });
            expect(result.netAmount).toBe(0);
            expect(result.to1Amount).toBe(0);
            expect(result.to2Amount).toBe(0);
        });
    });

    describe('getTOAnalysis', () => {
        it('should return TO analysis report', async () => {
            const mockAggregate = jest.fn().mockResolvedValue([{
                totalTO1: 100,
                totalTO2: 50,
                totalTO: 150,
                count: 2,
                invoices: []
            }]);

            mongoose.model.mockReturnValue({ aggregate: mockAggregate });

            const result = await tradeOfferService.getTOAnalysis({ startDate: '2023-01-01', endDate: '2023-01-31' });

            expect(result.totalTO).toBe(150);
            expect(mockAggregate).toHaveBeenCalled();
        });

        it('should return empty report if no data found', async () => {
            const mockAggregate = jest.fn().mockResolvedValue([]);

            mongoose.model.mockReturnValue({ aggregate: mockAggregate });

            const result = await tradeOfferService.getTOAnalysis({ startDate: '2023-01-01', endDate: '2023-01-31' });

            expect(result.totalTO).toBe(0);
            expect(result.count).toBe(0);
        });
    });
});
