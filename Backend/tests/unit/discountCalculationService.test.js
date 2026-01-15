const discountCalculationService = require('../../src/services/discountCalculationService');

describe('DiscountCalculationService', () => {
  describe('calculateDiscount1', () => {
    it('should calculate discount1 correctly', () => {
      const result = discountCalculationService.calculateDiscount1(1000, 10);

      expect(result).toEqual({
        originalAmount: 1000,
        discountPercent: 10,
        discountAmount: 100,
        amountAfterDiscount: 900
      });
    });

    it('should handle zero discount percentage', () => {
      const result = discountCalculationService.calculateDiscount1(1000, 0);

      expect(result).toEqual({
        originalAmount: 1000,
        discountPercent: 0,
        discountAmount: 0,
        amountAfterDiscount: 1000
      });
    });

    it('should throw error for negative amount', () => {
      expect(() => {
        discountCalculationService.calculateDiscount1(-100, 10);
      }).toThrow('Amount cannot be negative');
    });

    it('should throw error for invalid discount percentage', () => {
      expect(() => {
        discountCalculationService.calculateDiscount1(1000, -5);
      }).toThrow('Discount percentage must be between 0 and 100');

      expect(() => {
        discountCalculationService.calculateDiscount1(1000, 150);
      }).toThrow('Discount percentage must be between 0 and 100');
    });
  });

  describe('calculateDiscount2', () => {
    it('should calculate discount2 correctly with claim account', () => {
      const result = discountCalculationService.calculateDiscount2(900, 5, 'claim123');

      expect(result).toEqual({
        originalAmount: 900,
        discountPercent: 5,
        discountAmount: 45,
        amountAfterDiscount: 855,
        claimAccountId: 'claim123'
      });
    });

    it('should require claim account when discount2 is applied', () => {
      expect(() => {
        discountCalculationService.calculateDiscount2(900, 5);
      }).toThrow('Claim account ID is required when applying discount 2');

      expect(() => {
        discountCalculationService.calculateDiscount2(900, 5, null);
      }).toThrow('Claim account ID is required when applying discount 2');
    });

    it('should allow zero discount without claim account', () => {
      const result = discountCalculationService.calculateDiscount2(900, 0);

      expect(result).toEqual({
        originalAmount: 900,
        discountPercent: 0,
        discountAmount: 0,
        amountAfterDiscount: 900,
        claimAccountId: null
      });
    });
  });

  describe('applySequentialDiscounts', () => {
    it('should apply discounts in sequence', () => {
      const result = discountCalculationService.applySequentialDiscounts(1000, 10, 5, 'claim123');

      expect(result.baseAmount).toBe(1000);
      expect(result.discount1.amount).toBe(100); // 10% of 1000
      expect(result.discount2.amount).toBe(45); // 5% of 900
      expect(result.totalDiscount.amount).toBe(145);
      expect(result.finalAmount).toBe(855);
    });

    it('should require claim account for discount2', () => {
      expect(() => {
        discountCalculationService.applySequentialDiscounts(1000, 10, 5);
      }).toThrow('Claim account ID is required when applying discount 2');
    });
  });

  describe('Claim Account Validation for Discount 2', () => {
    const mongoose = require('mongoose');
    const Account = require('../../src/models/Account');

    // Mock account data
    const mockClaimAccount = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Discount Claims',
      code: 'DISC001',
      accountType: 'adjustment',
      isActive: true,
      canBeUsedForClaims: () => true
    };

    const mockInactiveAccount = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Inactive Claim Account',
      code: 'DISC002',
      accountType: 'adjustment',
      isActive: false,
      canBeUsedForClaims: () => false
    };

    const mockInvalidTypeAccount = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Asset Account',
      code: 'ASSET001',
      accountType: 'asset',
      isActive: true,
      canBeUsedForClaims: () => false
    };

    beforeEach(() => {
      // Reset all mocks
      jest.clearAllMocks();
    });

    describe('validateClaimAccountForDiscount2', () => {
      it('should validate a valid claim account', async () => {
        // Mock Account.findById to return valid claim account
        jest.spyOn(Account, 'findById').mockResolvedValue(mockClaimAccount);

        const result = await discountCalculationService.validateClaimAccountForDiscount2(mockClaimAccount._id.toString());

        expect(result).toEqual(mockClaimAccount);
        expect(Account.findById).toHaveBeenCalledWith(mockClaimAccount._id.toString());
      });

      it('should throw error when claim account ID is not provided', async () => {
        await expect(discountCalculationService.validateClaimAccountForDiscount2(null))
          .rejects.toThrow('Claim account ID is required for discount 2');

        await expect(discountCalculationService.validateClaimAccountForDiscount2(''))
          .rejects.toThrow('Claim account ID is required for discount 2');
      });

      it('should throw error for invalid ObjectId format', async () => {
        await expect(discountCalculationService.validateClaimAccountForDiscount2('invalid-id'))
          .rejects.toThrow('Invalid claim account ID format');
      });

      it('should throw error when claim account is not found', async () => {
        const validObjectId = new mongoose.Types.ObjectId().toString();
        jest.spyOn(Account, 'findById').mockResolvedValue(null);

        await expect(discountCalculationService.validateClaimAccountForDiscount2(validObjectId))
          .rejects.toThrow('Claim account not found');

        expect(Account.findById).toHaveBeenCalledWith(validObjectId);
      });

      it('should throw error when claim account is not active', async () => {
        jest.spyOn(Account, 'findById').mockResolvedValue(mockInactiveAccount);

        await expect(discountCalculationService.validateClaimAccountForDiscount2(mockInactiveAccount._id.toString()))
          .rejects.toThrow(`Claim account '${mockInactiveAccount.name}' is not active`);
      });

      it('should throw error when account cannot be used for claims', async () => {
        jest.spyOn(Account, 'findById').mockResolvedValue(mockInvalidTypeAccount);

        await expect(discountCalculationService.validateClaimAccountForDiscount2(mockInvalidTypeAccount._id.toString()))
          .rejects.toThrow(`Account '${mockInvalidTypeAccount.name}' cannot be used for discount claims. Must be adjustment, claim, or expense type.`);
      });
    });

    describe('validateDiscountDataWithClaimAccount', () => {
      it('should validate discount data with valid claim account', async () => {
        jest.spyOn(Account, 'findById').mockResolvedValue(mockClaimAccount);

        const discountData = {
          baseAmount: 1000,
          discount1Percent: 10,
          discount2Percent: 5,
          claimAccountId: mockClaimAccount._id.toString()
        };

        const result = await discountCalculationService.validateDiscountDataWithClaimAccount(discountData);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should return validation errors for invalid claim account', async () => {
        jest.spyOn(Account, 'findById').mockResolvedValue(null);

        const discountData = {
          baseAmount: 1000,
          discount1Percent: 10,
          discount2Percent: 5,
          claimAccountId: new mongoose.Types.ObjectId().toString()
        };

        const result = await discountCalculationService.validateDiscountDataWithClaimAccount(discountData);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Claim account not found');
      });

      it('should validate without claim account when no discount2', async () => {
        const discountData = {
          baseAmount: 1000,
          discount1Percent: 10,
          discount2Percent: 0 // No discount2
        };

        const result = await discountCalculationService.validateDiscountDataWithClaimAccount(discountData);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('applySequentialDiscountsWithValidation', () => {
      it('should apply discounts with valid claim account', async () => {
        jest.spyOn(Account, 'findById').mockResolvedValue(mockClaimAccount);

        const result = await discountCalculationService.applySequentialDiscountsWithValidation(
          1000, 10, 5, mockClaimAccount._id.toString()
        );

        expect(result.baseAmount).toBe(1000);
        expect(result.discount1.amount).toBe(100);
        expect(result.discount2.amount).toBe(45);
        expect(result.finalAmount).toBe(855);
        expect(result.claimAccount).toEqual({
          id: mockClaimAccount._id,
          name: mockClaimAccount.name,
          code: mockClaimAccount.code,
          accountType: mockClaimAccount.accountType
        });
      });

      it('should apply discounts without claim account when no discount2', async () => {
        const result = await discountCalculationService.applySequentialDiscountsWithValidation(
          1000, 10, 0 // No discount2
        );

        expect(result.baseAmount).toBe(1000);
        expect(result.discount1.amount).toBe(100);
        expect(result.discount2.amount).toBe(0);
        expect(result.finalAmount).toBe(900);
        expect(result.claimAccount).toBeNull();
      });

      it('should throw error for invalid claim account', async () => {
        jest.spyOn(Account, 'findById').mockResolvedValue(null);

        await expect(discountCalculationService.applySequentialDiscountsWithValidation(
          1000, 10, 5, new mongoose.Types.ObjectId().toString()
        )).rejects.toThrow('Claim account not found');
      });

      it('should throw error when discount2 applied without claim account', async () => {
        await expect(discountCalculationService.applySequentialDiscountsWithValidation(
          1000, 10, 5 // discount2 without claim account
        )).rejects.toThrow('Claim account ID is required for discount 2');
      });
    });

    describe('getAvailableClaimAccounts', () => {
      it('should return list of available claim accounts', async () => {
        const mockClaimAccounts = [
          mockClaimAccount,
          {
            _id: new mongoose.Types.ObjectId(),
            name: 'Expense Claims',
            code: 'EXP001',
            accountType: 'expense',
            isActive: true
          }
        ];

        jest.spyOn(Account, 'getClaimAccounts').mockResolvedValue(mockClaimAccounts);

        const result = await discountCalculationService.getAvailableClaimAccounts();

        expect(result).toEqual(mockClaimAccounts);
        expect(Account.getClaimAccounts).toHaveBeenCalled();
      });
    });

    describe('isValidClaimAccount', () => {
      it('should return true for valid claim account', async () => {
        jest.spyOn(Account, 'findById').mockResolvedValue(mockClaimAccount);

        const result = await discountCalculationService.isValidClaimAccount(mockClaimAccount._id.toString());

        expect(result).toBe(true);
      });

      it('should return false for invalid claim account', async () => {
        jest.spyOn(Account, 'findById').mockResolvedValue(null);

        const result = await discountCalculationService.isValidClaimAccount(new mongoose.Types.ObjectId().toString());

        expect(result).toBe(false);
      });

      it('should return false for inactive claim account', async () => {
        jest.spyOn(Account, 'findById').mockResolvedValue(mockInactiveAccount);

        const result = await discountCalculationService.isValidClaimAccount(mockInactiveAccount._id.toString());

        expect(result).toBe(false);
      });
    });
  });
});