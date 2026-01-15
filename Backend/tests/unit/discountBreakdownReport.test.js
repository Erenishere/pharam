const reportService = require('../../src/services/reportService');
const Invoice = require('../../src/models/Invoice');

// Mock dependencies
jest.mock('../../src/models/Invoice');

describe('ReportService - Discount Breakdown Report', () => {
  const mockInvoices = [
    {
      _id: 'invoice1',
      invoiceNumber: 'SI2024000001',
      invoiceDate: new Date('2024-01-15'),
      type: 'sales',
      status: 'confirmed',
      customerId: {
        _id: 'customer1',
        code: 'CUST001',
        name: 'Customer One'
      },
      totals: {
        grandTotal: 1000,
        totalDiscount: 150,
        totalDiscount1: 100,
        totalDiscount2: 50
      },
      items: [
        {
          itemId: 'item1',
          discount1Amount: 100,
          discount2Amount: 50,
          claimAccountId: {
            _id: 'claim1',
            name: 'Marketing Claims',
            code: 'CLAIM001',
            accountType: 'adjustment'
          }
        }
      ]
    },
    {
      _id: 'invoice2',
      invoiceNumber: 'PI2024000001',
      invoiceDate: new Date('2024-01-20'),
      type: 'purchase',
      status: 'confirmed',
      supplierId: {
        _id: 'supplier1',
        code: 'SUPP001',
        name: 'Supplier One'
      },
      totals: {
        grandTotal: 2000,
        totalDiscount: 200,
        totalDiscount1: 150,
        totalDiscount2: 50
      },
      items: [
        {
          itemId: 'item2',
          discount1Amount: 150,
          discount2Amount: 50,
          claimAccountId: {
            _id: 'claim2',
            name: 'Purchase Claims',
            code: 'CLAIM002',
            accountType: 'expense'
          }
        }
      ]
    },
    {
      _id: 'invoice3',
      invoiceNumber: 'SI2024000002',
      invoiceDate: new Date('2024-01-25'),
      type: 'sales',
      status: 'confirmed',
      customerId: {
        _id: 'customer2',
        code: 'CUST002',
        name: 'Customer Two'
      },
      totals: {
        grandTotal: 500,
        totalDiscount: 25,
        totalDiscount1: 25,
        totalDiscount2: 0
      },
      items: [
        {
          itemId: 'item3',
          discount1Amount: 25,
          discount2Amount: 0
        }
      ]
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Invoice.find to return a query object with chaining methods
    const mockQuery = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnValue(mockInvoices)
    };
    
    Invoice.find.mockReturnValue(mockQuery);
  });

  describe('getDiscountBreakdown', () => {
    it('should generate discount breakdown report for all invoices', async () => {
      const params = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        invoiceType: 'all',
        discountType: 'all'
      };

      const result = await reportService.getDiscountBreakdown(params);

      expect(result).toMatchObject({
        reportType: 'discount-breakdown',
        period: {
          startDate: params.startDate,
          endDate: params.endDate
        },
        filters: {
          invoiceType: 'all',
          discountType: 'all'
        }
      });

      expect(result.summary).toMatchObject({
        totalInvoices: 3,
        totalInvoiceAmount: 3500, // 1000 + 2000 + 500
        totalDiscountAmount: 375, // 150 + 200 + 25
        totalDiscount1Amount: 275, // 100 + 150 + 25
        totalDiscount2Amount: 100 // 50 + 50 + 0
      });

      expect(result.invoices).toHaveLength(3);
    });

    it('should filter by invoice type (sales only)', async () => {
      // Mock only sales invoices
      const salesInvoices = mockInvoices.filter(inv => inv.type === 'sales');
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnValue(salesInvoices)
      };
      
      Invoice.find.mockReturnValue(mockQuery);

      const params = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        invoiceType: 'sales',
        discountType: 'all'
      };

      const result = await reportService.getDiscountBreakdown(params);

      expect(result.summary.totalInvoices).toBe(2); // Only sales invoices
      expect(result.summary.totalInvoiceAmount).toBe(1500); // 1000 + 500
      expect(result.summary.totalDiscountAmount).toBe(175); // 150 + 25

      expect(result.invoiceTypeBreakdown.sales.invoiceCount).toBe(2);
      expect(result.invoiceTypeBreakdown.purchase.invoiceCount).toBe(0);
    });

    it('should filter by discount type (discount1 only)', async () => {
      const params = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        invoiceType: 'all',
        discountType: 'discount1'
      };

      const result = await reportService.getDiscountBreakdown(params);

      expect(result.summary.totalInvoices).toBe(3); // All invoices have discount1
      expect(result.summary.totalDiscount1Amount).toBe(275);
      expect(result.summary.totalDiscount2Amount).toBe(100); // Still calculated but filtered
    });

    it('should filter by discount type (discount2 only)', async () => {
      const params = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        invoiceType: 'all',
        discountType: 'discount2'
      };

      const result = await reportService.getDiscountBreakdown(params);

      expect(result.summary.totalInvoices).toBe(2); // Only invoices with discount2
      expect(result.summary.totalInvoiceAmount).toBe(3000); // 1000 + 2000 (excluding invoice3)
      expect(result.summary.totalDiscount2Amount).toBe(100);
    });

    it('should group discounts by claim account', async () => {
      const params = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        invoiceType: 'all',
        discountType: 'all'
      };

      const result = await reportService.getDiscountBreakdown(params);

      expect(result.claimAccountBreakdown).toHaveLength(2);
      
      const marketingClaim = result.claimAccountBreakdown.find(
        claim => claim.claimAccount.code === 'CLAIM001'
      );
      expect(marketingClaim).toMatchObject({
        claimAccount: {
          name: 'Marketing Claims',
          code: 'CLAIM001',
          accountType: 'adjustment'
        },
        discount2Amount: 50,
        invoiceCount: 1
      });

      const purchaseClaim = result.claimAccountBreakdown.find(
        claim => claim.claimAccount.code === 'CLAIM002'
      );
      expect(purchaseClaim).toMatchObject({
        claimAccount: {
          name: 'Purchase Claims',
          code: 'CLAIM002',
          accountType: 'expense'
        },
        discount2Amount: 50,
        invoiceCount: 1
      });
    });

    it('should filter by specific claim account', async () => {
      // Mock only invoices with claim1
      const filteredInvoices = mockInvoices.filter(inv => 
        inv.items.some(item => item.claimAccountId && item.claimAccountId._id === 'claim1')
      );
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnValue(filteredInvoices)
      };
      
      Invoice.find.mockReturnValue(mockQuery);

      const params = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        invoiceType: 'all',
        discountType: 'all',
        claimAccountId: 'claim1'
      };

      const result = await reportService.getDiscountBreakdown(params);

      expect(result.summary.totalInvoices).toBe(1); // Only invoice with claim1
      expect(result.summary.totalDiscountAmount).toBe(150);
      expect(result.claimAccountBreakdown).toHaveLength(1);
      expect(result.claimAccountBreakdown[0].claimAccount.code).toBe('CLAIM001');
    });

    it('should calculate discount percentages correctly', async () => {
      const params = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        invoiceType: 'all',
        discountType: 'all'
      };

      const result = await reportService.getDiscountBreakdown(params);

      // Total invoice amount: 3500, Total discount: 375
      expect(result.summary.totalDiscountPercentage).toBeCloseTo(10.71, 2); // 375/3500 * 100
      
      // Discount1: 275/3500 * 100
      expect(result.summary.discount1Percentage).toBeCloseTo(7.86, 2);
      
      // Discount2: 100/3500 * 100
      expect(result.summary.discount2Percentage).toBeCloseTo(2.86, 2);
    });

    it('should separate sales and purchase invoice breakdowns', async () => {
      const params = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        invoiceType: 'all',
        discountType: 'all'
      };

      const result = await reportService.getDiscountBreakdown(params);

      expect(result.invoiceTypeBreakdown.sales).toMatchObject({
        discount1Amount: 125, // 100 + 25
        discount2Amount: 50, // 50 + 0
        totalDiscountAmount: 175,
        invoiceCount: 2
      });

      expect(result.invoiceTypeBreakdown.purchase).toMatchObject({
        discount1Amount: 150,
        discount2Amount: 50,
        totalDiscountAmount: 200,
        invoiceCount: 1
      });
    });

    it('should handle invoices without totals (fallback to item calculation)', async () => {
      const invoicesWithoutTotals = [
        {
          _id: 'invoice4',
          invoiceNumber: 'SI2024000003',
          invoiceDate: new Date('2024-01-30'),
          type: 'sales',
          status: 'confirmed',
          customerId: {
            _id: 'customer3',
            code: 'CUST003',
            name: 'Customer Three'
          },
          // No totals field
          items: [
            {
              itemId: 'item4',
              discount1Amount: 75,
              discount2Amount: 25,
              claimAccountId: {
                _id: 'claim1',
                name: 'Marketing Claims',
                code: 'CLAIM001',
                accountType: 'adjustment'
              }
            }
          ]
        }
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnValue(invoicesWithoutTotals)
      };
      
      Invoice.find.mockReturnValue(mockQuery);

      const params = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        invoiceType: 'all',
        discountType: 'all'
      };

      const result = await reportService.getDiscountBreakdown(params);

      expect(result.summary.totalDiscount1Amount).toBe(75);
      expect(result.summary.totalDiscount2Amount).toBe(25);
      expect(result.summary.totalDiscountAmount).toBe(100);
    });

    it('should exclude cancelled invoices', async () => {
      const invoicesWithCancelled = [
        ...mockInvoices,
        {
          _id: 'invoice5',
          invoiceNumber: 'SI2024000004',
          invoiceDate: new Date('2024-01-30'),
          type: 'sales',
          status: 'cancelled', // This should be excluded
          totals: {
            grandTotal: 1000,
            totalDiscount: 100,
            totalDiscount1: 100,
            totalDiscount2: 0
          },
          items: []
        }
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnValue(mockInvoices) // Returns only non-cancelled
      };
      
      Invoice.find.mockReturnValue(mockQuery);

      const params = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        invoiceType: 'all',
        discountType: 'all'
      };

      const result = await reportService.getDiscountBreakdown(params);

      // Should still be 3 invoices (cancelled one excluded by query)
      expect(result.summary.totalInvoices).toBe(3);
      
      // Verify the query was called with correct parameters
      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: { $ne: 'cancelled' }
        })
      );
    });

    it('should require start and end dates', async () => {
      const params = {
        invoiceType: 'all',
        discountType: 'all'
      };

      await expect(reportService.getDiscountBreakdown(params))
        .rejects.toThrow('Start date and end date are required');
    });

    it('should handle empty result set', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnValue([]) // No invoices
      };
      
      Invoice.find.mockReturnValue(mockQuery);

      const params = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        invoiceType: 'all',
        discountType: 'all'
      };

      const result = await reportService.getDiscountBreakdown(params);

      expect(result.summary).toMatchObject({
        totalInvoices: 0,
        totalInvoiceAmount: 0,
        totalDiscountAmount: 0,
        totalDiscount1Amount: 0,
        totalDiscount2Amount: 0,
        discount1Percentage: 0,
        discount2Percentage: 0,
        totalDiscountPercentage: 0
      });

      expect(result.claimAccountBreakdown).toHaveLength(0);
      expect(result.invoices).toHaveLength(0);
    });
  });
});