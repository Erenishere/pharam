const mongoose = require('mongoose');
const DiscountCalculationService = require('../../src/services/discountCalculationService');
const Account = require('../../src/models/Account');

// Mock the Account model
jest.mock('../../src/models/Account');

describe('DiscountCalculationService - Claim Account Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateClaimAccountForDiscount2', () => {
    it('should throw error when claimAccountId is not provided', async () => {
      await expect(
        DiscountCalculationService.validateClaimAccountForDiscount2(null)
      ).rejects.toThrow('Claim account ID is required for discount 2');
    });

    it('should throw error when claimAccountId is invalid ObjectId format', async () => {
      await expect(
        DiscountCalculationService.validateClaimAccountForDiscount2('invalid-id')
      ).rejects.toThrow('Invalid claim account ID format');
    });

    it('should throw error when claim account is not found', async () => {
      const validObjectId = new mongoose.Types.ObjectId();
      Account.findById.mockResolvedValue(null);

      await expect(
        DiscountCalculationService.validateClaimAccountForDiscount2(validObjectId.toString())
      ).rejects.toThrow('Claim account not found');
    });

    it('should throw error when claim account is not active', async () => {
      const validObjectId = new mongoose.Types.ObjectId();
      const inactiveAccount = {
        _id: validObjectId,
        name: 'Inactive Claim Account',
        isActive: false,
        canBeUsedForClaims: jest.fn().mockReturnValue(true)
      };
      Account.findById.mockResolvedValue(inactiveAccount);

      await expect(
        DiscountCalculationService.validateClaimAccountForDiscount2(validObjectId.toString())
      ).rejects.toThrow("Claim account 'Inactive Claim Account' is not active");
    });

    it('should throw error when account cannot be used for claims', async () => {
      const validObjectId = new mongoose.Types.ObjectId();
      const invalidAccount = {
        _id: validObjectId,
        name: 'Invalid Account Type',
        isActive: true,
        canBeUsedForClaims: jest.fn().mockReturnValue(false)
      };
      Account.findById.mockResolvedValue(invalidAccount);

      await expect(
        DiscountCalculationService.validateClaimAccountForDiscount2(validObjectId.toString())
      ).rejects.toThrow("Account 'Invalid Account Type' cannot be used for discount claims. Must be adjustment, claim, or expense type.");
    });

    it('should return account when validation passes', async () => {
      const validObjectId = new mongoose.Types.ObjectId();
      const validAccount = {
        _id: validObjectId,
        name: 'Valid Claim Account',
        code: 'CLAIM001',
        accountType: 'claim',
        isActive: true,
        canBeUsedForClaims: jest.fn().mockReturnValue(true)
      };
      Account.findById.mockResolvedValue(validAccount);

      const result = await DiscountCalculationService.validateClaimAccountForDiscount2(validObjectId.toString());
      
      expect(result).toEqual(validAccount);
      expect(Account.findById).toHaveBeenCalledWith(validObjectId.toString());
      expect(validAccount.canBeUsedForClaims).toHaveBeenCalled();
    });
  });

  describe('getAvailableClaimAccounts', () => {
    it('should return list of claim accounts', async () => {
      const claimAccounts = [
        { _id: '1', name: 'Discount Claims', accountType: 'claim' },
        { _id: '2', name: 'Adjustment Account', accountType: 'adjustment' },
        { _id: '3', name: 'Promotional Expense', accountType: 'expense' }
      ];
      Account.getClaimAccounts.mockResolvedValue(claimAccounts);

      const result = await DiscountCalculationService.getAvailableClaimAccounts();
      
      expect(result).toEqual(claimAccounts);
      expect(Account.getClaimAccounts).toHaveBeenCalled();
    });
  });

  describe('isValidClaimAccount', () => {
    it('should return true for valid claim account', async () => {
      const validObjectId = new mongoose.Types.ObjectId();
      const validAccount = {
        _id: validObjectId,
        name: 'Valid Claim Account',
        isActive: true,
        canBeUsedForClaims: jest.fn().mockReturnValue(true)
      };
      Account.findById.mockResolvedValue(validAccount);

      const result = await DiscountCalculationService.isValidClaimAccount(validObjectId.toString());
      
      expect(result).toBe(true);
    });

    it('should return false for invalid claim account', async () => {
      Account.findById.mockResolvedValue(null);

      const result = await DiscountCalculationService.isValidClaimAccount('invalid-id');
      
      expect(result).toBe(false);
    });
  });

  describe('validateDiscountData - Enhanced', () => {
    it('should validate discount data with type checking', () => {
      const invalidData = {
        discount1Percent: 'invalid',
        discount2Amount: 'invalid',
        baseAmount: -100
      };

      const result = DiscountCalculationService.validateDiscountData(invalidData);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Discount 1 percentage must be a number');
      expect(result.errors).toContain('Discount 2 amount must be a number');
      expect(result.errors).toContain('Base amount cannot be negative');
    });

    it('should validate discount amounts against base amount', () => {
      const invalidData = {
        baseAmount: 100,
        discount1Amount: 150
      };

      const result = DiscountCalculationService.validateDiscountData(invalidData);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Discount 1 amount cannot exceed base amount');
    });

    it('should validate claim account ID format', () => {
      const invalidData = {
        discount2Percent: 10,
        claimAccountId: 'invalid-id'
      };

      const result = DiscountCalculationService.validateDiscountData(invalidData);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid claim account ID format');
    });

    it('should warn when claim account provided without discount2', () => {
      const validObjectId = new mongoose.Types.ObjectId();
      const invalidData = {
        discount1Percent: 10,
        claimAccountId: validObjectId.toString()
      };

      const result = DiscountCalculationService.validateDiscountData(invalidData);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Claim account provided but discount 2 is not applied');
    });

    it('should pass validation for valid discount data', () => {
      const validObjectId = new mongoose.Types.ObjectId();
      const validData = {
        baseAmount: 1000,
        discount1Percent: 10,
        discount1Amount: 100,
        discount2Percent: 5,
        discount2Amount: 45,
        claimAccountId: validObjectId.toString()
      };

      const result = DiscountCalculationService.validateDiscountData(validData);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateDiscountDataWithClaimAccount', () => {
    it('should return basic validation errors first', async () => {
      const invalidData = {
        discount1Percent: 150,
        discount2Percent: 10
      };

      const result = await DiscountCalculationService.validateDiscountDataWithClaimAccount(invalidData);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Discount 1 percentage must be between 0 and 100');
      expect(result.errors).toContain('Claim account is required when applying discount 2');
    });

    it('should validate claim account when discount2 is applied', async () => {
      const validObjectId = new mongoose.Types.ObjectId();
      Account.findById.mockResolvedValue(null);

      const discountData = {
        discount2Percent: 10,
        claimAccountId: validObjectId.toString()
      };

      const result = await DiscountCalculationService.validateDiscountDataWithClaimAccount(discountData);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Claim account not found');
    });

    it('should pass validation when all data is valid', async () => {
      const validObjectId = new mongoose.Types.ObjectId();
      const validAccount = {
        _id: validObjectId,
        name: 'Valid Claim Account',
        isActive: true,
        canBeUsedForClaims: jest.fn().mockReturnValue(true)
      };
      Account.findById.mockResolvedValue(validAccount);

      const validData = {
        discount1Percent: 10,
        discount2Percent: 5,
        claimAccountId: validObjectId.toString()
      };

      const result = await DiscountCalculationService.validateDiscountDataWithClaimAccount(validData);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('calculateDiscount2 - Enhanced validation', () => {
    it('should require claim account when discount2 percent is applied', () => {
      expect(() => {
        DiscountCalculationService.calculateDiscount2(1000, 10);
      }).toThrow('Claim account ID is required when applying discount 2');
    });

    it('should allow zero discount without claim account', () => {
      const result = DiscountCalculationService.calculateDiscount2(1000, 0);
      
      expect(result.discountAmount).toBe(0);
      expect(result.claimAccountId).toBeNull();
    });

    it('should calculate discount2 with claim account', () => {
      const validObjectId = new mongoose.Types.ObjectId();
      const result = DiscountCalculationService.calculateDiscount2(1000, 10, validObjectId.toString());
      
      expect(result.discountAmount).toBe(100);
      expect(result.claimAccountId).toBe(validObjectId.toString());
    });
  });

  describe('applySequentialDiscountsWithValidation', () => {
    it('should validate claim account before applying discounts', async () => {
      const validObjectId = new mongoose.Types.ObjectId();
      Account.findById.mockResolvedValue(null);

      await expect(
        DiscountCalculationService.applySequentialDiscountsWithValidation(1000, 10, 5, validObjectId.toString())
      ).rejects.toThrow('Claim account not found');
    });

    it('should apply discounts with valid claim account', async () => {
      const validObjectId = new mongoose.Types.ObjectId();
      const validAccount = {
        _id: validObjectId,
        name: 'Valid Claim Account',
        code: 'CLAIM001',
        accountType: 'claim',
        isActive: true,
        canBeUsedForClaims: jest.fn().mockReturnValue(true)
      };
      Account.findById.mockResolvedValue(validAccount);

      const result = await DiscountCalculationService.applySequentialDiscountsWithValidation(
        1000, 10, 5, validObjectId.toString()
      );
      
      expect(result.baseAmount).toBe(1000);
      expect(result.discount1.amount).toBe(100);
      expect(result.discount2.amount).toBe(45);
      expect(result.finalAmount).toBe(855);
      expect(result.claimAccount).toEqual({
        id: validObjectId,
        name: 'Valid Claim Account',
        code: 'CLAIM001',
        accountType: 'claim'
      });
    });

    it('should work without discount2 and claim account', async () => {
      const result = await DiscountCalculationService.applySequentialDiscountsWithValidation(1000, 10, 0);
      
      expect(result.baseAmount).toBe(1000);
      expect(result.discount1.amount).toBe(100);
      expect(result.discount2.amount).toBe(0);
      expect(result.finalAmount).toBe(900);
      expect(result.claimAccount).toBeNull();
    });
  });
});