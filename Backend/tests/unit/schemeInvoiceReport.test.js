const mongoose = require('mongoose');
const reportService = require('../../src/services/reportService');
const Invoice = require('../../src/models/Invoice');
const Scheme = require('../../src/models/Scheme');

// Mock dependencies
jest.mock('../../src/models/Invoice');
jest.mock('../../src/models/Scheme');

describe('ReportService - Scheme Invoice Report', () => {
  let testScheme;
  let testInvoices;

  beforeEach(() => {
    jest.clearAllMocks();

    // Test scheme definition
    testScheme = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Test Scheme 12+1',
      type: 'scheme1',
      schemeFormat: '12+1',
      discountPercent: 5,
      company: {
        _id: new mongoose.Types.ObjectId(),
        name: 'Test Company',
        code: 'TC001'
      },
      claimAccountId: {
        _id: new mongoose.Types.ObjectId(),
        name: 'Promotional Claims',
        accountNumber: 'ACC-001'
      },
      isActive: true,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      applicableItems: [
        {
          _id: new mongoose.Types.ObjectId(),
          code: 'ITEM001',
          name: 'Test Item 1',
          category: 'Category A'
        },
        {
          _id: new mongoose.Types.ObjectId(),
          code: 'ITEM002',
          name: 'Test Item 2',
          category: 'Category B'
        }
      ],
      applicableCustomers: []
    };

    // Test invoices
    testInvoices = [
      {
        _id: new mongoose.Types.ObjectId(),
        invoiceNumber: 'SI2024000001',
        invoiceDate: new Date('2024-01-15'),
        type: 'sales',
        customerId: {
          _id: new mongoose.Types.ObjectId(),
          code: 'CUST001',
          name: 'Test Customer 1'
        },
        claimAccountId: {
          _id: testScheme.claimAccountId._id,
          name: 'Promotional Claims',
          accountNumber: 'ACC-001'
        },
        totals: {
          grandTotal: 1500
        },
        items: [
          {
            itemId: testScheme.applicableItems[0],
            unitPrice: 100,
            scheme1Quantity: 1,
            scheme2Quantity: 0
          },
          {
            itemId: testScheme.applicableItems[1],
            unitPrice: 200,
            scheme1Quantity: 2,
            scheme2Quantity: 1
          }
        ]
      },
      {
        _id: new mongoose.Types.ObjectId(),
        invoiceNumber: 'SI2024000002',
        invoiceDate: new Date('2024-01-20'),
        type: 'sales',
        customerId: {
          _id: new mongoose.Types.ObjectId(),
          code: 'CUST002',
          name: 'Test Customer 2'
        },
        totals: {
          grandTotal: 2000
        },
        items: [
          {
            itemId: testScheme.applicableItems[0],
            unitPrice: 100,
            scheme1Quantity: 0,
            scheme2Quantity: 2
          }
        ]
      },
      {
        _id: new mongoose.Types.ObjectId(),
        invoiceNumber: 'SI2024000003',
        invoiceDate: new Date('2024-01-25'),
        type: 'sales',
        customerId: {
          _id: new mongoose.Types.ObjectId(),
          code: 'CUST003',
          name: 'Test Customer 3'
        },
        totals: {
          grandTotal: 800
        },
        items: [
          {
            itemId: {
              _id: new mongoose.Types.ObjectId(),
              code: 'ITEM999',
              name: 'Non-applicable Item'
            },
            unitPrice: 150,
            scheme1Quantity: 1,
            scheme2Quantity: 0
          }
        ]
      }
    ];
  });

  describe('getSchemeInvoices', () => {
    beforeEach(() => {
      // Mock Scheme.findById with proper chaining
      const mockQuery = {
        populate: jest.fn().mockReturnThis()
      };
      // The last populate call should resolve to the scheme
      mockQuery.populate.mockResolvedValue(testScheme);
      
      Scheme.findById.mockReturnValue(mockQuery);

      // Mock Invoice.find
      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(testInvoices)
      });
    });

    it('should generate scheme invoice report successfully', async () => {
      const params = {
        schemeId: testScheme._id,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        invoiceType: 'sales'
      };

      const result = await reportService.getSchemeInvoices(params);

      expect(result.reportType).toBe('scheme_invoices');
      expect(result.scheme.id).toBe(testScheme._id);
      expect(result.scheme.name).toBe('Test Scheme 12+1');
      expect(result.invoiceType).toBe('sales');
      expect(result.period.startDate).toBe('2024-01-01');
      expect(result.period.endDate).toBe('2024-01-31');
    });

    it('should filter invoices with applicable scheme items', async () => {
      const params = {
        schemeId: testScheme._id,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        invoiceType: 'sales'
      };

      const result = await reportService.getSchemeInvoices(params);

      // Should include first 2 invoices (have applicable items with schemes)
      // Should exclude 3rd invoice (non-applicable item)
      expect(result.invoices).toHaveLength(2);
      expect(result.invoices[0].invoiceNumber).toBe('SI2024000001');
      expect(result.invoices[1].invoiceNumber).toBe('SI2024000002');
    });

    it('should calculate scheme quantities and values correctly', async () => {
      const params = {
        schemeId: testScheme._id,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        invoiceType: 'sales'
      };

      const result = await reportService.getSchemeInvoices(params);

      // First invoice: scheme1=3 (1+2), scheme2=1, value=500 (1*100 + 2*200 + 1*200)
      expect(result.invoices[0].schemeSummary.scheme1Quantity).toBe(3);
      expect(result.invoices[0].schemeSummary.scheme2Quantity).toBe(1);
      expect(result.invoices[0].schemeSummary.totalSchemeValue).toBe(700);

      // Second invoice: scheme1=0, scheme2=2, value=200 (2*100)
      expect(result.invoices[1].schemeSummary.scheme1Quantity).toBe(0);
      expect(result.invoices[1].schemeSummary.scheme2Quantity).toBe(2);
      expect(result.invoices[1].schemeSummary.totalSchemeValue).toBe(200);

      // Summary totals
      expect(result.summary.totalScheme1Quantity).toBe(3);
      expect(result.summary.totalScheme2Quantity).toBe(3);
      expect(result.summary.totalSchemeValue).toBe(900);
    });

    it('should include detailed scheme item information', async () => {
      const params = {
        schemeId: testScheme._id,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        invoiceType: 'sales'
      };

      const result = await reportService.getSchemeInvoices(params);

      const firstInvoice = result.invoices[0];
      expect(firstInvoice.schemeItems).toHaveLength(2);

      // First item
      expect(firstInvoice.schemeItems[0].itemCode).toBe('ITEM001');
      expect(firstInvoice.schemeItems[0].scheme1Quantity).toBe(1);
      expect(firstInvoice.schemeItems[0].scheme1Value).toBe(100);

      // Second item
      expect(firstInvoice.schemeItems[1].itemCode).toBe('ITEM002');
      expect(firstInvoice.schemeItems[1].scheme1Quantity).toBe(2);
      expect(firstInvoice.schemeItems[1].scheme2Quantity).toBe(1);
      expect(firstInvoice.schemeItems[1].totalSchemeValue).toBe(600);
    });

    it('should include invoice and customer details', async () => {
      const params = {
        schemeId: testScheme._id,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        invoiceType: 'sales'
      };

      const result = await reportService.getSchemeInvoices(params);

      const firstInvoice = result.invoices[0];
      expect(firstInvoice.invoiceNumber).toBe('SI2024000001');
      expect(firstInvoice.customer.code).toBe('CUST001');
      expect(firstInvoice.customer.name).toBe('Test Customer 1');
      expect(firstInvoice.totalAmount).toBe(1500);
      expect(firstInvoice.claimAccount.name).toBe('Promotional Claims');
    });

    it('should include scheme definition details', async () => {
      const params = {
        schemeId: testScheme._id,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        invoiceType: 'sales'
      };

      const result = await reportService.getSchemeInvoices(params);

      expect(result.scheme.name).toBe('Test Scheme 12+1');
      expect(result.scheme.type).toBe('scheme1');
      expect(result.scheme.schemeFormat).toBe('12+1');
      expect(result.scheme.discountPercent).toBe(5);
      expect(result.scheme.company.name).toBe('Test Company');
      expect(result.scheme.claimAccount.name).toBe('Promotional Claims');
    });

    it('should handle invoices with no scheme quantities', async () => {
      // Mock invoices with no scheme quantities
      const noSchemeInvoices = [
        {
          _id: new mongoose.Types.ObjectId(),
          invoiceNumber: 'SI2024000004',
          invoiceDate: new Date('2024-01-30'),
          type: 'sales',
          customerId: {
            _id: new mongoose.Types.ObjectId(),
            code: 'CUST004',
            name: 'Test Customer 4'
          },
          totals: { grandTotal: 1000 },
          items: [
            {
              itemId: testScheme.applicableItems[0],
              unitPrice: 100,
              scheme1Quantity: 0,
              scheme2Quantity: 0
            }
          ]
        }
      ];

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(noSchemeInvoices)
      });

      const params = {
        schemeId: testScheme._id,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        invoiceType: 'sales'
      };

      const result = await reportService.getSchemeInvoices(params);

      expect(result.invoices).toHaveLength(0);
      expect(result.summary.totalInvoices).toBe(0);
      expect(result.summary.totalSchemeQuantity).toBe(0);
      expect(result.summary.totalSchemeValue).toBe(0);
    });

    it('should filter by applicable customers when specified', async () => {
      // Update scheme to have specific applicable customers
      const schemeWithCustomers = {
        ...testScheme,
        applicableCustomers: [
          {
            _id: testInvoices[0].customerId._id,
            code: 'CUST001',
            name: 'Test Customer 1'
          }
        ]
      };

      const mockQuery = {
        populate: jest.fn().mockReturnThis()
      };
      mockQuery.populate.mockResolvedValue(schemeWithCustomers);
      
      Scheme.findById.mockReturnValue(mockQuery);

      const params = {
        schemeId: testScheme._id,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        invoiceType: 'sales'
      };

      await reportService.getSchemeInvoices(params);

      // Should filter invoices by applicable customers
      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: { $in: [testInvoices[0].customerId._id] }
        })
      );
    });

    it('should handle purchase invoices', async () => {
      const purchaseInvoices = [
        {
          _id: new mongoose.Types.ObjectId(),
          invoiceNumber: 'PI2024000001',
          invoiceDate: new Date('2024-01-15'),
          type: 'purchase',
          supplierId: {
            _id: new mongoose.Types.ObjectId(),
            code: 'SUPP001',
            name: 'Test Supplier 1'
          },
          totals: { grandTotal: 1200 },
          items: [
            {
              itemId: testScheme.applicableItems[0],
              unitPrice: 80,
              scheme1Quantity: 2,
              scheme2Quantity: 0
            }
          ]
        }
      ];

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(purchaseInvoices)
      });

      const params = {
        schemeId: testScheme._id,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        invoiceType: 'purchase'
      };

      const result = await reportService.getSchemeInvoices(params);

      expect(result.invoiceType).toBe('purchase');
      expect(result.invoices[0].supplier.code).toBe('SUPP001');
      expect(result.invoices[0].supplier.name).toBe('Test Supplier 1');
    });

    it('should round values to 2 decimal places', async () => {
      const invoicesWithDecimals = [
        {
          _id: new mongoose.Types.ObjectId(),
          invoiceNumber: 'SI2024000005',
          invoiceDate: new Date('2024-01-15'),
          type: 'sales',
          customerId: {
            _id: new mongoose.Types.ObjectId(),
            code: 'CUST005',
            name: 'Test Customer 5'
          },
          totals: { grandTotal: 1000 },
          items: [
            {
              itemId: testScheme.applicableItems[0],
              unitPrice: 33.33,
              scheme1Quantity: 3,
              scheme2Quantity: 0
            }
          ]
        }
      ];

      Invoice.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(invoicesWithDecimals)
      });

      const params = {
        schemeId: testScheme._id,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        invoiceType: 'sales'
      };

      const result = await reportService.getSchemeInvoices(params);

      expect(result.invoices[0].schemeItems[0].scheme1Value).toBe(99.99);
      expect(result.summary.totalScheme1Value).toBe(99.99);
    });

    it('should require scheme ID', async () => {
      const params = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        invoiceType: 'sales'
      };

      await expect(reportService.getSchemeInvoices(params))
        .rejects.toThrow('Scheme ID is required');
    });

    it('should require start and end dates', async () => {
      const params = {
        schemeId: testScheme._id,
        invoiceType: 'sales'
      };

      await expect(reportService.getSchemeInvoices(params))
        .rejects.toThrow('Start date and end date are required');
    });

    it('should handle non-existent scheme', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis()
      };
      mockQuery.populate.mockResolvedValue(null);
      
      Scheme.findById.mockReturnValue(mockQuery);

      const params = {
        schemeId: new mongoose.Types.ObjectId(),
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        invoiceType: 'sales'
      };

      await expect(reportService.getSchemeInvoices(params))
        .rejects.toThrow('Scheme not found');
    });

    it('should exclude cancelled invoices', async () => {
      const params = {
        schemeId: testScheme._id,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        invoiceType: 'sales'
      };

      await reportService.getSchemeInvoices(params);

      expect(Invoice.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: { $ne: 'cancelled' }
        })
      );
    });

    it('should sort invoices by date descending', async () => {
      const params = {
        schemeId: testScheme._id,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        invoiceType: 'sales'
      };

      await reportService.getSchemeInvoices(params);

      expect(Invoice.find().sort).toHaveBeenCalledWith({ invoiceDate: -1 });
    });
  });
});