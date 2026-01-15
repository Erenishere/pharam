const balanceCalculationService = require('../../src/services/balanceCalculationService');
const ledgerService = require('../../src/services/ledgerService');
const Customer = require('../../src/models/Customer');
const Supplier = require('../../src/models/Supplier');

jest.mock('../../src/services/ledgerService');
jest.mock('../../src/models/Customer');
jest.mock('../../src/models/Supplier');

/**
 * Unit Tests for Balance Calculation Service
 * Phase 2 - Requirement 29: Previous Balance Display on Invoices
 * Task 73.1: Add previous balance calculation
 */
describe('BalanceCalculationService - Task 73.1 (Requirement 29.1, 29.2, 29.3, 29.4)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('calculatePreviousBalance', () => {
        it('should calculate previous balance correctly', async () => {
            ledgerService.calculateAccountBalance.mockResolvedValue(1000);

            const result = await balanceCalculationService.calculatePreviousBalance(
                'customer123',
                new Date('2024-01-15'),
                'Customer'
            );

            expect(result).toBe(1000);
            expect(ledgerService.calculateAccountBalance).toHaveBeenCalled();
        });

        it('should return absolute value of balance', async () => {
            ledgerService.calculateAccountBalance.mockResolvedValue(-500);

            const result = await balanceCalculationService.calculatePreviousBalance(
                'customer123',
                new Date('2024-01-15'),
                'Customer'
            );

            expect(result).toBe(500);
        });

        it('should return 0 if calculation fails', async () => {
            ledgerService.calculateAccountBalance.mockRejectedValue(new Error('Ledger error'));

            const result = await balanceCalculationService.calculatePreviousBalance(
                'customer123',
                new Date('2024-01-15'),
                'Customer'
            );

            expect(result).toBe(0);
        });

        it('should throw error for missing account ID', async () => {
            await expect(
                balanceCalculationService.calculatePreviousBalance(null, new Date(), 'Customer')
            ).rejects.toThrow('Account ID is required');
        });

        it('should throw error for missing invoice date', async () => {
            await expect(
                balanceCalculationService.calculatePreviousBalance('customer123', null, 'Customer')
            ).rejects.toThrow('Invoice date is required');
        });

        it('should throw error for missing account type', async () => {
            await expect(
                balanceCalculationService.calculatePreviousBalance('customer123', new Date(), null)
            ).rejects.toThrow('Account type is required');
        });

        it('should throw error for invalid account type', async () => {
            await expect(
                balanceCalculationService.calculatePreviousBalance('customer123', new Date(), 'Invalid')
            ).rejects.toThrow('Account type must be Customer or Supplier');
        });
    });

    describe('calculateCurrentBalance', () => {
        it('should calculate current balance correctly', async () => {
            ledgerService.calculateAccountBalance.mockResolvedValue(2000);

            const result = await balanceCalculationService.calculateCurrentBalance('customer123', 'Customer');

            expect(result).toBe(2000);
        });

        it('should return absolute value', async () => {
            ledgerService.calculateAccountBalance.mockResolvedValue(-1500);

            const result = await balanceCalculationService.calculateCurrentBalance('customer123', 'Customer');

            expect(result).toBe(1500);
        });

        it('should return 0 if calculation fails', async () => {
            ledgerService.calculateAccountBalance.mockRejectedValue(new Error('Error'));

            const result = await balanceCalculationService.calculateCurrentBalance('customer123', 'Customer');

            expect(result).toBe(0);
        });

        it('should throw error for missing account ID', async () => {
            await expect(
                balanceCalculationService.calculateCurrentBalance(null, 'Customer')
            ).rejects.toThrow('Account ID is required');
        });
    });

    describe('calculateTotalBalance', () => {
        it('should calculate total balance correctly', () => {
            const result = balanceCalculationService.calculateTotalBalance(1000, 500);
            expect(result).toBe(1500);
        });

        it('should handle zero previous balance', () => {
            const result = balanceCalculationService.calculateTotalBalance(0, 500);
            expect(result).toBe(500);
        });

        it('should handle zero current invoice amount', () => {
            const result = balanceCalculationService.calculateTotalBalance(1000, 0);
            expect(result).toBe(1000);
        });

        it('should throw error for negative previous balance', () => {
            expect(() => {
                balanceCalculationService.calculateTotalBalance(-100, 500);
            }).toThrow('Previous balance cannot be negative');
        });

        it('should throw error for negative current invoice amount', () => {
            expect(() => {
                balanceCalculationService.calculateTotalBalance(1000, -500);
            }).toThrow('Current invoice amount cannot be negative');
        });
    });

    describe('checkCreditLimit', () => {
        it('should detect credit limit exceeded for customer', async () => {
            Customer.findById.mockResolvedValue({
                financialInfo: { creditLimit: 5000 },
            });

            const result = await balanceCalculationService.checkCreditLimit('customer123', 6000, 'Customer');

            expect(result.exceeded).toBe(true);
            expect(result.creditLimit).toBe(5000);
            expect(result.totalBalance).toBe(6000);
            expect(result.availableCredit).toBe(0);
            expect(result.warning).toContain('credit limit exceeded');
        });

        it('should show available credit when under limit', async () => {
            Customer.findById.mockResolvedValue({
                financialInfo: { creditLimit: 10000 },
            });

            const result = await balanceCalculationService.checkCreditLimit('customer123', 7000, 'Customer');

            expect(result.exceeded).toBe(false);
            expect(result.availableCredit).toBe(3000);
            expect(result.warning).toBeNull();
        });

        it('should handle supplier credit limit', async () => {
            Supplier.findById.mockResolvedValue({
                financialInfo: { creditLimit: 8000 },
            });

            const result = await balanceCalculationService.checkCreditLimit('supplier123', 9000, 'Supplier');

            expect(result.exceeded).toBe(true);
            expect(result.creditLimit).toBe(8000);
        });

        it('should handle account not found', async () => {
            Customer.findById.mockResolvedValue(null);

            const result = await balanceCalculationService.checkCreditLimit('customer123', 5000, 'Customer');

            expect(result.exceeded).toBe(false);
            expect(result.creditLimit).toBe(0);
            expect(result.availableCredit).toBe(0);
        });

        it('should handle zero credit limit', async () => {
            Customer.findById.mockResolvedValue({
                financialInfo: { creditLimit: 0 },
            });

            const result = await balanceCalculationService.checkCreditLimit('customer123', 1000, 'Customer');

            expect(result.exceeded).toBe(true);
            expect(result.availableCredit).toBe(0);
        });

        it('should throw error for missing account ID', async () => {
            await expect(
                balanceCalculationService.checkCreditLimit(null, 5000, 'Customer')
            ).rejects.toThrow('Account ID is required');
        });

        it('should throw error for negative total balance', async () => {
            await expect(
                balanceCalculationService.checkCreditLimit('customer123', -1000, 'Customer')
            ).rejects.toThrow('Total balance cannot be negative');
        });
    });

    describe('getAvailableCredit', () => {
        it('should calculate available credit correctly', async () => {
            Customer.findById.mockResolvedValue({
                financialInfo: { creditLimit: 10000 },
            });

            const result = await balanceCalculationService.getAvailableCredit('customer123', 6000, 'Customer');

            expect(result).toBe(4000);
        });

        it('should return 0 when balance exceeds limit', async () => {
            Customer.findById.mockResolvedValue({
                financialInfo: { creditLimit: 5000 },
            });

            const result = await balanceCalculationService.getAvailableCredit('customer123', 7000, 'Customer');

            expect(result).toBe(0);
        });

        it('should return 0 when account not found', async () => {
            Customer.findById.mockResolvedValue(null);

            const result = await balanceCalculationService.getAvailableCredit('customer123', 5000, 'Customer');

            expect(result).toBe(0);
        });

        it('should handle supplier', async () => {
            Supplier.findById.mockResolvedValue({
                financialInfo: { creditLimit: 15000 },
            });

            const result = await balanceCalculationService.getAvailableCredit('supplier123', 10000, 'Supplier');

            expect(result).toBe(5000);
        });

        it('should throw error for missing account ID', async () => {
            await expect(
                balanceCalculationService.getAvailableCredit(null, 5000, 'Customer')
            ).rejects.toThrow('Account ID is required');
        });
    });

    describe('getCreditLimitWarning', () => {
        it('should generate warning message for customer', () => {
            const warning = balanceCalculationService.getCreditLimitWarning(
                'customer123',
                6000,
                5000,
                'Customer'
            );

            expect(warning).toContain('Customer credit limit exceeded');
            expect(warning).toContain('1000.00');
            expect(warning).toContain('Total balance: 6000.00');
            expect(warning).toContain('Credit limit: 5000.00');
        });

        it('should generate warning message for supplier', () => {
            const warning = balanceCalculationService.getCreditLimitWarning(
                'supplier123',
                8000,
                7000,
                'Supplier'
            );

            expect(warning).toContain('Supplier credit limit exceeded');
            expect(warning).toContain('1000.00');
        });
    });

    describe('calculateBalanceSummary', () => {
        it('should calculate complete balance summary', async () => {
            ledgerService.calculateAccountBalance.mockResolvedValue(2000);
            Customer.findById.mockResolvedValue({
                financialInfo: { creditLimit: 10000 },
            });

            const result = await balanceCalculationService.calculateBalanceSummary(
                'customer123',
                new Date('2024-01-15'),
                3000,
                'Customer'
            );

            expect(result.previousBalance).toBe(2000);
            expect(result.currentInvoiceAmount).toBe(3000);
            expect(result.totalBalance).toBe(5000);
            expect(result.creditLimit).toBe(10000);
            expect(result.availableCredit).toBe(5000);
            expect(result.creditLimitExceeded).toBe(false);
            expect(result.warning).toBeNull();
        });

        it('should include warning when credit limit exceeded', async () => {
            ledgerService.calculateAccountBalance.mockResolvedValue(4000);
            Customer.findById.mockResolvedValue({
                financialInfo: { creditLimit: 5000 },
            });

            const result = await balanceCalculationService.calculateBalanceSummary(
                'customer123',
                new Date('2024-01-15'),
                2000,
                'Customer'
            );

            expect(result.totalBalance).toBe(6000);
            expect(result.creditLimitExceeded).toBe(true);
            expect(result.warning).toContain('credit limit exceeded');
        });

        it('should throw error for missing parameters', async () => {
            await expect(
                balanceCalculationService.calculateBalanceSummary(null, new Date(), 1000, 'Customer')
            ).rejects.toThrow('All parameters are required');
        });
    });
});
