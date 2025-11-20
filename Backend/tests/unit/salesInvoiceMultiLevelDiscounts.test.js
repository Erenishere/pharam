const salesInvoiceService = require('../../src/services/salesInvoiceService');
const discountCalculationService = require('../../src/services/discountCalculationService');
const customerService = require('../../src/services/customerService');
const itemService = require('../../src/services/itemService');
const invoiceRepository = require('../../src/repositories/invoiceRepository');

// Mock dependencies
jest.mock('../../src/services/customerService');
jest.mock('../../src/services/itemService');
jest.mock('../../src/repositories/invoiceRepository');
jest.mock('../../src/services/inventoryService');

describe('SalesInvoiceService - Multi-Level Discounts', () => {
  const mockCustomer = {
    _id: 'customer123',
    name: 'Test Customer',
    isActive: true,
    financialInfo: {
      creditLimit: 100000,
      paymentTerms: 30
    }
  };

  const mockItem = {
    _id: 'item123',
    name: 'Test Item',
    code: 'TEST001',
    isActive: true,
    inventory: {
      currentStock: 1000 // Increased to avoid stock availability issues
    },
    tax: {
      gstRate: 18,
      whtRate: 0
    },
    checkStockAvailability: jest.fn(() => true)
  };

  const mockAccount = {
    _id: 'account123',
    name: 'Discount Claims',
    code: 'DISC001',
    accountType: 'adjustment',
    isActive: true,
    canBeUsedForClaims: () => true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    customerService.getCustomerById.mockResolvedValue(mockCustomer);
    itemService.getItemById.mockResolvedValue(mockItem);
    invoiceRepository.generateInvoiceNumber.mockResolvedValue('SI2024000001');
    invoiceRepository.create.mockResolvedValue({ _id: 'invoice123' });

    // Reset the mock function
    mockItem.checkStockAvailability.mockReturnValue(true);

    // Mock discount calculation service
    jest.spyOn(discountCalculationService, 'applySequentialDiscounts');
    jest.spyOn(discountCalculationService, 'applySequentialDiscountsWithValidation');
  });

  describe('processInvoiceItems with multi-level discounts', () => {
    it('should process items with discount1 only', async () => {
      const items = [{
        itemId: 'item123',
        quantity: 10,
        unitPrice: 100,
        discount1Percent: 10
      }];

      discountCalculationService.applySequentialDiscounts.mockReturnValue({
        baseAmount: 1000,
        discount1: { amount: 100 },
        discount2: { amount: 0 },
        totalDiscount: { amount: 100 },
        finalAmount: 900
      });

      const result = await salesInvoiceService.processInvoiceItems(items);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        itemId: 'item123',
        quantity: 10,
        unitPrice: 100,
        discount1Percent: 10,
        discount1Amount: 100,
        discount2Percent: 0,
        discount2Amount: 0,
        lineSubtotal: 1000,
        totalDiscountAmount: 100,
        taxableAmount: 900
      });

      expect(discountCalculationService.applySequentialDiscounts).toHaveBeenCalledWith(1000, 10, 0);
    });

    it('should process items with both discount1 and discount2', async () => {
      const items = [{
        itemId: 'item123',
        quantity: 10,
        unitPrice: 100,
        discount1Percent: 10,
        discount2Percent: 5,
        claimAccountId: 'account123'
      }];

      discountCalculationService.applySequentialDiscountsWithValidation.mockResolvedValue({
        baseAmount: 1000,
        discount1: { amount: 100 },
        discount2: { amount: 45 },
        totalDiscount: { amount: 145 },
        finalAmount: 855,
        claimAccount: {
          id: 'account123',
          name: 'Discount Claims',
          code: 'DISC001',
          accountType: 'adjustment'
        }
      });

      const result = await salesInvoiceService.processInvoiceItems(items);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        itemId: 'item123',
        quantity: 10,
        unitPrice: 100,
        discount1Percent: 10,
        discount1Amount: 100,
        discount2Percent: 5,
        discount2Amount: 45,
        claimAccountId: 'account123',
        lineSubtotal: 1000,
        totalDiscountAmount: 145,
        taxableAmount: 855
      });

      expect(discountCalculationService.applySequentialDiscountsWithValidation).toHaveBeenCalledWith(
        1000, 10, 5, 'account123'
      );
    });

    it('should handle legacy single discount as discount1', async () => {
      const items = [{
        itemId: 'item123',
        quantity: 10,
        unitPrice: 100,
        discount: 15 // Legacy single discount
      }];

      discountCalculationService.applySequentialDiscounts.mockReturnValue({
        baseAmount: 1000,
        discount1: { amount: 150 },
        discount2: { amount: 0 },
        totalDiscount: { amount: 150 },
        finalAmount: 850
      });

      const result = await salesInvoiceService.processInvoiceItems(items);

      expect(result[0]).toMatchObject({
        discount: 15, // Legacy field
        discount1Percent: 15,
        discount1Amount: 150,
        discount2Percent: 0,
        discount2Amount: 0
      });

      expect(discountCalculationService.applySequentialDiscounts).toHaveBeenCalledWith(1000, 15, 0);
    });

    it('should validate discount percentages', async () => {
      const items = [{
        itemId: 'item123',
        quantity: 10,
        unitPrice: 100,
        discount1Percent: 150 // Invalid percentage
      }];

      await expect(salesInvoiceService.processInvoiceItems(items))
        .rejects.toThrow('Discount 1 must be between 0 and 100 for item item123');
    });

    it('should validate discount2 requires claim account', async () => {
      const items = [{
        itemId: 'item123',
        quantity: 10,
        unitPrice: 100,
        discount1Percent: 10,
        discount2Percent: 5
        // Missing claimAccountId
      }];

      discountCalculationService.applySequentialDiscountsWithValidation.mockRejectedValue(
        new Error('Claim account ID is required for discount 2')
      );

      await expect(salesInvoiceService.processInvoiceItems(items))
        .rejects.toThrow('Claim account ID is required for discount 2');
    });
  });

  describe('calculateInvoiceTotals with multi-level discounts', () => {
    it('should calculate totals with multi-level discounts', () => {
      const items = [
        {
          quantity: 10,
          unitPrice: 100,
          lineSubtotal: 1000,
          discount1Amount: 100,
          discount2Amount: 45,
          taxAmount: 153.9 // 18% of 855
        },
        {
          quantity: 5,
          unitPrice: 200,
          lineSubtotal: 1000,
          discount1Amount: 50,
          discount2Amount: 0,
          taxAmount: 171 // 18% of 950
        }
      ];

      const result = salesInvoiceService.calculateInvoiceTotals(items);

      expect(result).toEqual({
        subtotal: 2000,
        totalDiscount: 195, // 100 + 45 + 50 + 0
        totalDiscount1: 150, // 100 + 50
        totalDiscount2: 45, // 45 + 0
        taxableAmount: 1805, // 2000 - 195
        totalTax: 324.9, // 153.9 + 171
        grandTotal: 2129.9 // 1805 + 324.9
      });
    });

    it('should handle items without discount amounts', () => {
      const items = [
        {
          quantity: 10,
          unitPrice: 100,
          lineSubtotal: 1000,
          taxAmount: 180
        }
      ];

      const result = salesInvoiceService.calculateInvoiceTotals(items);

      expect(result).toEqual({
        subtotal: 1000,
        totalDiscount: 0,
        totalDiscount1: 0,
        totalDiscount2: 0,
        taxableAmount: 1000,
        totalTax: 180,
        grandTotal: 1180
      });
    });
  });

  describe('createSalesInvoice with multi-level discounts', () => {
    it('should create invoice with multi-level discounts', async () => {
      const invoiceData = {
        customerId: 'customer123',
        items: [
          {
            itemId: 'item123',
            quantity: 10,
            unitPrice: 100,
            discount1Percent: 10,
            discount2Percent: 5,
            claimAccountId: 'account123'
          }
        ],
        createdBy: 'user123'
      };

      discountCalculationService.applySequentialDiscountsWithValidation.mockResolvedValue({
        baseAmount: 1000,
        discount1: { amount: 100 },
        discount2: { amount: 45 },
        totalDiscount: { amount: 145 },
        finalAmount: 855,
        claimAccount: {
          id: 'account123',
          name: 'Discount Claims',
          code: 'DISC001',
          accountType: 'adjustment'
        }
      });

      const result = await salesInvoiceService.createSalesInvoice(invoiceData);

      expect(invoiceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sales',
          customerId: 'customer123',
          items: expect.arrayContaining([
            expect.objectContaining({
              discount1Percent: 10,
              discount1Amount: 100,
              discount2Percent: 5,
              discount2Amount: 45,
              claimAccountId: 'account123'
            })
          ]),
          totals: expect.objectContaining({
            totalDiscount1: 100,
            totalDiscount2: 45,
            totalDiscount: 145
          })
        })
      );
    });
  });
});