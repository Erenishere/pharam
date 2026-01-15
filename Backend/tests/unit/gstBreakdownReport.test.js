const reportService = require('../../src/services/reportService');
const Invoice = require('../../src/models/Invoice');

jest.mock('../../src/models/Invoice');

describe('GST Breakdown Report Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPurchaseGSTBreakdown', () => {
    test('should generate GST breakdown report with 18% and 4% rates', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          invoiceNumber: 'PUR-001',
          type: 'purchase',
          invoiceDate: new Date('2025-01-15'),
          status: 'confirmed',
          supplierId: {
            _id: 'sup1',
            code: 'SUP001',
            name: 'Supplier A'
          },
          items: [
            {
              itemId: 'item1',
              quantity: 10,
              unitPrice: 100,
              discount: 0,
              gstRate: 18
            },
            {
              itemId: 'item2',
              quantity: 5,
              unitPrice: 200,
              discount: 0,
              gstRate: 4
            }
          ]
        }
      ];

      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInvoices)
        })
      });

      const result = await reportService.getPurchaseGSTBreakdown({
        startDate: '2025-01-01',
        endDate: '2025-01-31'
      });

      expect(result.reportType).toBe('purchase_gst_breakdown');
      expect(result.breakdown.gst18).toBeDefined();
      expect(result.breakdown.gst4).toBeDefined();
      
      // GST 18%: 10 * 100 = 1000, GST = 180
      expect(result.breakdown.gst18.taxableAmount).toBe(1000);
      expect(result.breakdown.gst18.gstAmount).toBe(180);
      expect(result.breakdown.gst18.totalAmount).toBe(1180);
      
      // GST 4%: 5 * 200 = 1000, GST = 40
      expect(result.breakdown.gst4.taxableAmount).toBe(1000);
      expect(result.breakdown.gst4.gstAmount).toBe(40);
      expect(result.breakdown.gst4.totalAmount).toBe(1040);
      
      // Total
      expect(result.breakdown.total.taxableAmount).toBe(2000);
      expect(result.breakdown.total.gstAmount).toBe(220);
      expect(result.breakdown.total.totalAmount).toBe(2220);
    });

    test('should handle invoices with only 18% GST', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          invoiceNumber: 'PUR-001',
          type: 'purchase',
          invoiceDate: new Date('2025-01-15'),
          status: 'confirmed',
          supplierId: {
            _id: 'sup1',
            code: 'SUP001',
            name: 'Supplier A'
          },
          items: [
            {
              itemId: 'item1',
              quantity: 10,
              unitPrice: 100,
              discount: 0,
              gstRate: 18
            }
          ]
        }
      ];

      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInvoices)
        })
      });

      const result = await reportService.getPurchaseGSTBreakdown({
        startDate: '2025-01-01',
        endDate: '2025-01-31'
      });

      expect(result.breakdown.gst18.invoiceCount).toBe(1);
      expect(result.breakdown.gst4.invoiceCount).toBe(0);
      expect(result.breakdown.gst4.taxableAmount).toBe(0);
    });

    test('should handle invoices with only 4% GST', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          invoiceNumber: 'PUR-001',
          type: 'purchase',
          invoiceDate: new Date('2025-01-15'),
          status: 'confirmed',
          supplierId: {
            _id: 'sup1',
            code: 'SUP001',
            name: 'Supplier A'
          },
          items: [
            {
              itemId: 'item1',
              quantity: 10,
              unitPrice: 100,
              discount: 0,
              gstRate: 4
            }
          ]
        }
      ];

      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInvoices)
        })
      });

      const result = await reportService.getPurchaseGSTBreakdown({
        startDate: '2025-01-01',
        endDate: '2025-01-31'
      });

      expect(result.breakdown.gst18.invoiceCount).toBe(0);
      expect(result.breakdown.gst4.invoiceCount).toBe(1);
      expect(result.breakdown.gst18.taxableAmount).toBe(0);
    });

    test('should handle return invoices with negative amounts', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          invoiceNumber: 'PUR-001',
          type: 'purchase',
          invoiceDate: new Date('2025-01-15'),
          status: 'confirmed',
          supplierId: {
            _id: 'sup1',
            code: 'SUP001',
            name: 'Supplier A'
          },
          items: [
            {
              itemId: 'item1',
              quantity: 10,
              unitPrice: 100,
              discount: 0,
              gstRate: 18
            }
          ]
        },
        {
          _id: 'inv2',
          invoiceNumber: 'RET-001',
          type: 'return_purchase',
          invoiceDate: new Date('2025-01-20'),
          status: 'confirmed',
          supplierId: {
            _id: 'sup1',
            code: 'SUP001',
            name: 'Supplier A'
          },
          items: [
            {
              itemId: 'item1',
              quantity: -5,
              unitPrice: 100,
              discount: 0,
              gstRate: 18
            }
          ]
        }
      ];

      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInvoices)
        })
      });

      const result = await reportService.getPurchaseGSTBreakdown({
        startDate: '2025-01-01',
        endDate: '2025-01-31'
      });

      // Net: 10 * 100 - 5 * 100 = 500, GST = 90
      expect(result.breakdown.gst18.taxableAmount).toBe(1500);
      expect(result.breakdown.gst18.gstAmount).toBe(270);
    });

    test('should filter by supplier when supplierId is provided', async () => {
      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([])
        })
      });

      await reportService.getPurchaseGSTBreakdown({
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        supplierId: 'sup123'
      });

      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          supplierId: 'sup123'
        })
      );
    });

    test('should throw error when dates are missing', async () => {
      await expect(
        reportService.getPurchaseGSTBreakdown({})
      ).rejects.toThrow('Start date and end date are required');
    });

    test('should handle discounts in GST calculation', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          invoiceNumber: 'PUR-001',
          type: 'purchase',
          invoiceDate: new Date('2025-01-15'),
          status: 'confirmed',
          supplierId: {
            _id: 'sup1',
            code: 'SUP001',
            name: 'Supplier A'
          },
          items: [
            {
              itemId: 'item1',
              quantity: 10,
              unitPrice: 100,
              discount: 100, // 100 discount
              gstRate: 18
            }
          ]
        }
      ];

      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInvoices)
        })
      });

      const result = await reportService.getPurchaseGSTBreakdown({
        startDate: '2025-01-01',
        endDate: '2025-01-31'
      });

      // Taxable: 1000 - 100 = 900, GST = 162
      expect(result.breakdown.gst18.taxableAmount).toBe(900);
      expect(result.breakdown.gst18.gstAmount).toBe(162);
    });
  });

  describe('getSupplierWiseGSTReport', () => {
    test('should group invoices by supplier with GST breakdown', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          invoiceNumber: 'PUR-001',
          type: 'purchase',
          invoiceDate: new Date('2025-01-15'),
          status: 'confirmed',
          supplierId: {
            _id: 'sup1',
            code: 'SUP001',
            name: 'Supplier A'
          },
          items: [
            {
              itemId: 'item1',
              quantity: 10,
              unitPrice: 100,
              discount: 0,
              gstRate: 18
            }
          ]
        },
        {
          _id: 'inv2',
          invoiceNumber: 'PUR-002',
          type: 'purchase',
          invoiceDate: new Date('2025-01-20'),
          status: 'confirmed',
          supplierId: {
            _id: 'sup2',
            code: 'SUP002',
            name: 'Supplier B'
          },
          items: [
            {
              itemId: 'item2',
              quantity: 5,
              unitPrice: 200,
              discount: 0,
              gstRate: 4
            }
          ]
        }
      ];

      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInvoices)
        })
      });

      const result = await reportService.getSupplierWiseGSTReport({
        startDate: '2025-01-01',
        endDate: '2025-01-31'
      });

      expect(result.reportType).toBe('supplier_wise_gst');
      expect(result.suppliers).toHaveLength(2);
      expect(result.summary.totalSuppliers).toBe(2);
      expect(result.summary.totalInvoices).toBe(2);
    });

    test('should sort suppliers by total amount descending', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          invoiceNumber: 'PUR-001',
          type: 'purchase',
          invoiceDate: new Date('2025-01-15'),
          status: 'confirmed',
          supplierId: {
            _id: 'sup1',
            code: 'SUP001',
            name: 'Supplier A'
          },
          items: [
            {
              itemId: 'item1',
              quantity: 10,
              unitPrice: 100,
              discount: 0,
              gstRate: 18
            }
          ]
        },
        {
          _id: 'inv2',
          invoiceNumber: 'PUR-002',
          type: 'purchase',
          invoiceDate: new Date('2025-01-20'),
          status: 'confirmed',
          supplierId: {
            _id: 'sup2',
            code: 'SUP002',
            name: 'Supplier B'
          },
          items: [
            {
              itemId: 'item2',
              quantity: 20,
              unitPrice: 200,
              discount: 0,
              gstRate: 18
            }
          ]
        }
      ];

      Invoice.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInvoices)
        })
      });

      const result = await reportService.getSupplierWiseGSTReport({
        startDate: '2025-01-01',
        endDate: '2025-01-31'
      });

      // Supplier B should be first (higher amount)
      expect(result.suppliers[0].supplierCode).toBe('SUP002');
      expect(result.suppliers[1].supplierCode).toBe('SUP001');
    });
  });
});
