const discountService = require('../../src/services/discountService');
const Account = require('../../src/models/Account');

// Mock Account model
jest.mock('../../src/models/Account');

describe('DiscountService - Claim Account Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateDiscount2', () => {
    test('should require claim account when discount2 is applied', async () => {
      await expect(
        discountService.calculateDiscount2(1000, 10, null)
      ).rejects.toThrow('Claim account is required when applying Discount 2');
    });

    test('should allow discount2 with valid claim account', async () => {
      const mockAccount = {
        _id: 'account123',
        name: 'Claim Account',
        accountType: 'claim',
        isActive: true
      };

      Account.findById.mockResolvedValue(mockAccount);

      const discount = await discountService.calculateDiscount2(1000, 10, 'account123');
      
      expect(discount).toBe(100);
      expect(Account.findById).toHaveBeenCalledWith('account123');
    });

    test('should throw error if claim account not found', async () => {
      Account.findById.mockResolvedValue(null);

      await expect(
        discountService.calculateDiscount2(1000, 10, 'nonexistent')
      ).rejects.toThrow('Claim account not found');
    });

    test('should throw error if claim account is not active', async () => {
      const mockAccount = {
        _id: 'account123',
        name: 'Inactive Claim Account',
        accountType: 'claim',
        isActive: false
      };

      Account.findById.mockResolvedValue(mockAccount);

      await expect(
        discountService.calculateDiscount2(1000, 10, 'account123')
      ).rejects.toThrow('is not active');
    });

    test('should validate account type is suitable for claims', async () => {
      const mockAccount = {
        _id: 'account123',
        name: 'Revenue Account',
        accountType: 'revenue',
        isActive: true
      };

      Account.findById.mockResolvedValue(mockAccount);

      await expect(
        discountService.calculateDiscount2(1000, 10, 'account123')
      ).rejects.toThrow('not a valid claim account type');
    });

    test('should allow zero discount2 without claim account', async () => {
      const discount = await discountService.calculateDiscount2(1000, 0, null);
      
      expect(discount).toBe(0);
      expect(Account.findById).not.toHaveBeenCalled();
    });

    test('should calculate correct discount amount', async () => {
      const mockAccount = {
        _id: 'account123',
        name: 'Claim Account',
        accountType: 'claim',
        isActive: true
      };

      Account.findById.mockResolvedValue(mockAccount);

      const discount = await discountService.calculateDiscount2(1000, 7.69, 'account123');
      
      expect(discount).toBeCloseTo(76.9, 1);
    });
  });

  describe('validateClaimAccount', () => {
    test('should validate claim account exists', async () => {
      const mockAccount = {
        _id: 'account123',
        name: 'Claim Account',
        accountType: 'claim',
        isActive: true
      };

      Account.findById.mockResolvedValue(mockAccount);

      const account = await discountService.validateClaimAccount('account123');
      
      expect(account).toEqual(mockAccount);
    });

    test('should throw error if account ID not provided', async () => {
      await expect(
        discountService.validateClaimAccount(null)
      ).rejects.toThrow('Claim account ID is required');
    });

    test('should accept expense account type', async () => {
      const mockAccount = {
        _id: 'account123',
        name: 'Expense Account',
        accountType: 'expense',
        isActive: true
      };

      Account.findById.mockResolvedValue(mockAccount);

      const account = await discountService.validateClaimAccount('account123');
      
      expect(account).toEqual(mockAccount);
    });

    test('should accept adjustment account type', async () => {
      const mockAccount = {
        _id: 'account123',
        name: 'Adjustment Account',
        accountType: 'adjustment',
        isActive: true
      };

      Account.findById.mockResolvedValue(mockAccount);

      const account = await discountService.validateClaimAccount('account123');
      
      expect(account).toEqual(mockAccount);
    });
  });

  describe('applyDiscounts', () => {
    test('should apply discount1 first, then discount2', async () => {
      const mockAccount = {
        _id: 'account123',
        name: 'Claim Account',
        accountType: 'claim',
        isActive: true
      };

      Account.findById.mockResolvedValue(mockAccount);

      const result = await discountService.applyDiscounts(1000, {
        discount1Percent: 10,
        discount2Percent: 5,
        claimAccountId: 'account123'
      });

      expect(result.discount1Amount).toBe(100);
      expect(result.amountAfterDiscount1).toBe(900);
      expect(result.discount2Amount).toBe(45); // 5% of 900
      expect(result.finalAmount).toBe(855);
      expect(result.totalDiscount).toBe(145);
    });

    test('should handle only discount1', async () => {
      const result = await discountService.applyDiscounts(1000, {
        discount1Percent: 10,
        discount2Percent: 0
      });

      expect(result.discount1Amount).toBe(100);
      expect(result.discount2Amount).toBe(0);
      expect(result.finalAmount).toBe(900);
    });

    test('should require claim account for discount2', async () => {
      await expect(
        discountService.applyDiscounts(1000, {
          discount1Percent: 10,
          discount2Percent: 5
          // No claimAccountId
        })
      ).rejects.toThrow('Claim account is required');
    });

    test('should handle no discounts', async () => {
      const result = await discountService.applyDiscounts(1000, {
        discount1Percent: 0,
        discount2Percent: 0
      });

      expect(result.finalAmount).toBe(1000);
      expect(result.totalDiscount).toBe(0);
    });
  });

  describe('validateInvoiceDiscounts', () => {
    test('should require claim account when any item has discount2', async () => {
      const invoiceData = {
        items: [
          { itemId: 'item1', discount1Percent: 5, discount2Percent: 0 },
          { itemId: 'item2', discount1Percent: 5, discount2Percent: 3 }
        ]
        // No claimAccountId
      };

      await expect(
        discountService.validateInvoiceDiscounts(invoiceData)
      ).rejects.toThrow('Claim account is required when applying Discount 2');
    });

    test('should validate claim account when provided', async () => {
      const mockAccount = {
        _id: 'account123',
        name: 'Claim Account',
        accountType: 'claim',
        isActive: true
      };

      Account.findById.mockResolvedValue(mockAccount);

      const invoiceData = {
        items: [
          { itemId: 'item1', discount1Percent: 5, discount2Percent: 3 }
        ],
        claimAccountId: 'account123'
      };

      const result = await discountService.validateInvoiceDiscounts(invoiceData);
      
      expect(result).toBe(true);
      expect(Account.findById).toHaveBeenCalledWith('account123');
    });

    test('should allow invoice without discount2 and no claim account', async () => {
      const invoiceData = {
        items: [
          { itemId: 'item1', discount1Percent: 5, discount2Percent: 0 },
          { itemId: 'item2', discount1Percent: 10, discount2Percent: 0 }
        ]
      };

      const result = await discountService.validateInvoiceDiscounts(invoiceData);
      
      expect(result).toBe(true);
      expect(Account.findById).not.toHaveBeenCalled();
    });

    test('should validate discount percentages are within range', async () => {
      const invoiceData = {
        items: [
          { itemId: 'item1', discount1Percent: 150, discount2Percent: 0 }
        ]
      };

      await expect(
        discountService.validateInvoiceDiscounts(invoiceData)
      ).rejects.toThrow('must be between 0 and 100');
    });

    test('should validate negative discount percentages', async () => {
      const invoiceData = {
        items: [
          { itemId: 'item1', discount1Percent: -5, discount2Percent: 0 }
        ]
      };

      await expect(
        discountService.validateInvoiceDiscounts(invoiceData)
      ).rejects.toThrow('must be between 0 and 100');
    });
  });

  describe('calculateLineTotal', () => {
    test('should calculate line total with multi-level discounts', async () => {
      const mockAccount = {
        _id: 'account123',
        name: 'Claim Account',
        accountType: 'claim',
        isActive: true
      };

      Account.findById.mockResolvedValue(mockAccount);

      const lineItem = {
        quantity: 10,
        unitPrice: 100,
        discount1Percent: 10,
        discount2Percent: 5,
        taxRate: 18
      };

      const result = await discountService.calculateLineTotal(lineItem, 'account123');

      expect(result.lineSubtotal).toBe(1000);
      expect(result.discount1Amount).toBe(100);
      expect(result.discount2Amount).toBe(45);
      expect(result.totalDiscount).toBe(145);
      expect(result.taxableAmount).toBe(855);
      expect(result.taxAmount).toBeCloseTo(153.9, 1);
      expect(result.lineTotal).toBeCloseTo(1008.9, 1);
    });

    test('should apply tax after discounts', async () => {
      const mockAccount = {
        _id: 'account123',
        name: 'Claim Account',
        accountType: 'claim',
        isActive: true
      };

      Account.findById.mockResolvedValue(mockAccount);

      const lineItem = {
        quantity: 10,
        unitPrice: 100,
        discount1Percent: 20,
        discount2Percent: 10,
        taxRate: 18
      };

      const result = await discountService.calculateLineTotal(lineItem, 'account123');

      // 1000 - 200 (20%) = 800
      // 800 - 80 (10%) = 720
      // 720 + 129.6 (18% tax) = 849.6
      expect(result.taxableAmount).toBe(720);
      expect(result.taxAmount).toBeCloseTo(129.6, 1);
      expect(result.lineTotal).toBeCloseTo(849.6, 1);
    });

    test('should require claim account for discount2 in line calculation', async () => {
      const lineItem = {
        quantity: 10,
        unitPrice: 100,
        discount1Percent: 10,
        discount2Percent: 5,
        taxRate: 18
      };

      await expect(
        discountService.calculateLineTotal(lineItem, null)
      ).rejects.toThrow('Claim account is required');
    });
  });

  describe('Integration scenarios', () => {
    test('should handle multiple items with different discount configurations', async () => {
      const mockAccount = {
        _id: 'account123',
        name: 'Claim Account',
        accountType: 'claim',
        isActive: true
      };

      Account.findById.mockResolvedValue(mockAccount);

      const invoiceData = {
        items: [
          { itemId: 'item1', discount1Percent: 10, discount2Percent: 0 },
          { itemId: 'item2', discount1Percent: 5, discount2Percent: 5 },
          { itemId: 'item3', discount1Percent: 0, discount2Percent: 7.69 }
        ],
        claimAccountId: 'account123'
      };

      const result = await discountService.validateInvoiceDiscounts(invoiceData);
      
      expect(result).toBe(true);
    });

    test('should handle decimal discount percentages', async () => {
      const mockAccount = {
        _id: 'account123',
        name: 'Claim Account',
        accountType: 'claim',
        isActive: true
      };

      Account.findById.mockResolvedValue(mockAccount);

      const result = await discountService.applyDiscounts(1000, {
        discount1Percent: 7.5,
        discount2Percent: 7.69,
        claimAccountId: 'account123'
      });

      expect(result.discount1Amount).toBe(75);
      expect(result.amountAfterDiscount1).toBe(925);
      expect(result.discount2Amount).toBeCloseTo(71.13, 2);
      expect(result.finalAmount).toBeCloseTo(853.87, 2);
    });
  });
});
