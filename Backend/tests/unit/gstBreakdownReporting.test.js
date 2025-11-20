const reportService = require('../../src/services/reportService');
const Invoice = require('../../src/models/Invoice');

// Mock Invoice model
jest.mock('../../src/models/Invoice');

describe('ReportService - GST Breakdown Reporting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPurchaseSummaryWithGST', () => {
    test('should return purchase summary with GST breakdown', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          type: 'purchase',
          invoiceDate: new Date('2024-01-15'),
          supplierId: { code: 'SUP001', name: 'Supplier 1' },
          items: [
            {
              itemId: { code: 'I001', name: 'Item 1' },
              quantity: 10,
              unitPrice: 100,
              gstRate: 18,
              discount: 0
            }
          ],
          totals: {
            subtotal: 1000,
            totalDiscount: 0,
            totalTax: 180,
            gst18Total: 180,
            gst4Total: 0,
            grandTotal: 1180
          }
        }
      ];

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInvoices)
        })
      });

      const result = await reportService.getPurchaseSummaryWithGST({
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      expect(result.reportType).toBe('purchase');
      expect(result.gstBreakdown).toBeDefined();
      expect(result.gstBreakdown.gst18).toBeDefined();
    });

    test('should include GST breakdown in purchase summary', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          type: 'purchase',
          invoiceDate: new Date('2024-01-15'),
          supplierId: { code: 'SUP001', name: 'Supplier 1' },
          items: [
            {
              itemId: { code: 'I001', name: 'Item 1' },
              quantity: 10,
              unitPrice: 100,
              gstRate: 18,
              discount: 0
            }
          ],
          totals: {
            subtotal: 1000,
            totalDiscount: 0,
            totalTax: 180,
            gst18Total: 180,
            gst4Total: 0,
            grandTotal: 1180
          }
        }
      ];

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInvoices)
        })
      });

      const result = await reportService.getPurchaseSummaryWithGST({
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      expect(result.gstBreakdown.gst18.gstAmount).toBe(180);
      expect(result.gstBreakdown.gst4.gstAmount).toBe(0);
    });
  });

  describe('getSupplierWiseGSTReport', () => {
    test('should return supplier-wise GST report', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          type: 'purchase',
          invoiceDate: new Date('2024-01-15'),
          supplierId: { _id: 'sup1', code: 'SUP001', name: 'Supplier 1' },
          items: [
            {
              itemId: { code: 'I001', name: 'Item 1' },
              quantity: 10,
              unitPrice: 100,
              gstRate: 18,
              discount: 0
            }
          ]
        },
        {
          _id: 'inv2',
          type: 'purchase',
          invoiceDate: new Date('2024-01-20'),
          supplierId: { _id: 'sup2', code: 'SUP002', name: 'Supplier 2' },
          items: [
            {
              itemId: { code: 'I002', name: 'Item 2' },
              quantity: 5,
              unitPrice: 200,
              gstRate: 4,
              discount: 0
            }
          ]
        }
      ];

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInvoices)
        })
      });

      const result = await reportService.getSupplierWiseGSTReport({
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      expect(result.reportType).toBe('supplier_wise_gst');
      expect(result.suppliers).toHaveLength(2);
      expect(result.summary.totalSuppliers).toBe(2);
    });

    test('should separate GST 18% and 4% by supplier', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          type: 'purchase',
          invoiceDate: new Date('2024-01-15'),
          supplierId: { _id: 'sup1', code: 'SUP001', name: 'Supplier 1' },
          items: [
            {
              itemId: { code: 'I001', name: 'Item 1' },
              quantity: 10,
              unitPrice: 100,
              gstRate: 18,
              discount: 0
            },
            {
              itemId: { code: 'I002', name: 'Item 2' },
              quantity: 5,
              unitPrice: 200,
              gstRate: 4,
              discount: 0
            }
          ]
        }
      ];

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInvoices)
        })
      });

      const result = await reportService.getSupplierWiseGSTReport({
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      const supplier = result.suppliers[0];
      expect(supplier.gst18.gstAmount).toBeGreaterThan(0);
      expect(supplier.gst4.gstAmount).toBeGreaterThan(0);
    });

    test('should calculate correct GST amounts', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          type: 'purchase',
          invoiceDate: new Date('2024-01-15'),
          supplierId: { _id: 'sup1', code: 'SUP001', name: 'Supplier 1' },
          items: [
            {
              itemId: { code: 'I001', name: 'Item 1' },
              quantity: 10,
              unitPrice: 100,
              gstRate: 18,
              discount: 0
            }
          ]
        }
      ];

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInvoices)
        })
      });

      const result = await reportService.getSupplierWiseGSTReport({
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      const supplier = result.suppliers[0];
      expect(supplier.gst18.taxableAmount).toBe(1000);
      expect(supplier.gst18.gstAmount).toBe(180);
      expect(supplier.gst18.totalAmount).toBe(1180);
    });

    test('should sort suppliers by total amount descending', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          type: 'purchase',
          invoiceDate: new Date('2024-01-15'),
          supplierId: { _id: 'sup1', code: 'SUP001', name: 'Supplier 1' },
          items: [
            {
              itemId: { code: 'I001', name: 'Item 1' },
              quantity: 10,
              unitPrice: 100,
              gstRate: 18,
              discount: 0
            }
          ]
        },
        {
          _id: 'inv2',
          type: 'purchase',
          invoiceDate: new Date('2024-01-20'),
          supplierId: { _id: 'sup2', code: 'SUP002', name: 'Supplier 2' },
          items: [
            {
              itemId: { code: 'I002', name: 'Item 2' },
              quantity: 50,
              unitPrice: 200,
              gstRate: 18,
              discount: 0
            }
          ]
        }
      ];

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInvoices)
        })
      });

      const result = await reportService.getSupplierWiseGSTReport({
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      expect(result.suppliers[0].supplierCode).toBe('SUP002');
      expect(result.suppliers[0].total.totalAmount).toBeGreaterThan(
        result.suppliers[1].total.totalAmount
      );
    });

    test('should include summary totals', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          type: 'purchase',
          invoiceDate: new Date('2024-01-15'),
          supplierId: { _id: 'sup1', code: 'SUP001', name: 'Supplier 1' },
          items: [
            {
              itemId: { code: 'I001', name: 'Item 1' },
              quantity: 10,
              unitPrice: 100,
              gstRate: 18,
              discount: 0
            }
          ]
        }
      ];

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInvoices)
        })
      });

      const result = await reportService.getSupplierWiseGSTReport({
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      expect(result.summary.totalSuppliers).toBe(1);
      expect(result.summary.totalInvoices).toBe(1);
      expect(result.summary.totalGST18).toBe(180);
      expect(result.summary.grandTotal).toBe(1180);
    });

    test('should handle multiple invoices from same supplier', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          type: 'purchase',
          invoiceDate: new Date('2024-01-15'),
          supplierId: { _id: 'sup1', code: 'SUP001', name: 'Supplier 1' },
          items: [
            {
              itemId: { code: 'I001', name: 'Item 1' },
              quantity: 10,
              unitPrice: 100,
              gstRate: 18,
              discount: 0
            }
          ]
        },
        {
          _id: 'inv2',
          type: 'purchase',
          invoiceDate: new Date('2024-01-20'),
          supplierId: { _id: 'sup1', code: 'SUP001', name: 'Supplier 1' },
          items: [
            {
              itemId: { code: 'I002', name: 'Item 2' },
              quantity: 5,
              unitPrice: 200,
              gstRate: 18,
              discount: 0
            }
          ]
        }
      ];

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInvoices)
        })
      });

      const result = await reportService.getSupplierWiseGSTReport({
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      expect(result.suppliers).toHaveLength(1);
      expect(result.suppliers[0].invoiceCount).toBe(2);
      expect(result.summary.totalInvoices).toBe(2);
    });

    test('should handle mixed GST rates from same supplier', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          type: 'purchase',
          invoiceDate: new Date('2024-01-15'),
          supplierId: { _id: 'sup1', code: 'SUP001', name: 'Supplier 1' },
          items: [
            {
              itemId: { code: 'I001', name: 'Item 1' },
              quantity: 10,
              unitPrice: 100,
              gstRate: 18,
              discount: 0
            },
            {
              itemId: { code: 'I002', name: 'Item 2' },
              quantity: 5,
              unitPrice: 200,
              gstRate: 4,
              discount: 0
            }
          ]
        }
      ];

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInvoices)
        })
      });

      const result = await reportService.getSupplierWiseGSTReport({
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      const supplier = result.suppliers[0];
      expect(supplier.gst18.gstAmount).toBe(180);
      expect(supplier.gst4.gstAmount).toBe(40);
      expect(supplier.total.gstAmount).toBe(220);
    });

    test('should exclude cancelled invoices', async () => {
      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([])
        })
      });

      await reportService.getSupplierWiseGSTReport({
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'confirmed'
        })
      );
    });

    test('should filter by date range', async () => {
      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([])
        })
      });

      await reportService.getSupplierWiseGSTReport({
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceDate: expect.objectContaining({
            $gte: expect.any(Date),
            $lte: expect.any(Date)
          })
        })
      );
    });

    test('should round amounts to 2 decimal places', async () => {
      const mockInvoices = [
        {
          _id: 'inv1',
          type: 'purchase',
          invoiceDate: new Date('2024-01-15'),
          supplierId: { _id: 'sup1', code: 'SUP001', name: 'Supplier 1' },
          items: [
            {
              itemId: { code: 'I001', name: 'Item 1' },
              quantity: 3,
              unitPrice: 33.33,
              gstRate: 18,
              discount: 0
            }
          ]
        }
      ];

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockInvoices)
        })
      });

      const result = await reportService.getSupplierWiseGSTReport({
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      const supplier = result.suppliers[0];
      expect(supplier.gst18.taxableAmount).toBe(99.99);
      expect(supplier.gst18.gstAmount).toBeCloseTo(17.998, 2);
    });
  });
});
