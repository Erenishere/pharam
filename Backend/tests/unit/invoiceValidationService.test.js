const invoiceValidationService = require('../../src/services/invoiceValidationService');
const Item = require('../../src/models/Item');
const Customer = require('../../src/models/Customer');
const Supplier = require('../../src/models/Supplier');

// Mock the models
jest.mock('../../src/models/Item');
jest.mock('../../src/models/Customer');
jest.mock('../../src/models/Supplier');

describe('InvoiceValidationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateInvoiceItems', () => {
    it('should return error when items array is empty', async () => {
      const result = await invoiceValidationService.validateInvoiceItems([], 'sales');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('ITEMS_REQUIRED');
    });

    it('should return error when items is not an array', async () => {
      const result = await invoiceValidationService.validateInvoiceItems(null, 'sales');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('ITEMS_REQUIRED');
    });

    it('should validate multiple items successfully', async () => {
      const mockItem = {
        _id: 'item123',
        name: 'Test Item',
        code: 'TEST001',
        isActive: true,
        inventory: { currentStock: 100, minStock: 10 },
        pricing: { salePrice: 100, costPrice: 80 },
      };

      Item.findById.mockResolvedValue(mockItem);

      const items = [
        { itemId: 'item123', quantity: 5, unitPrice: 100, discount: 0 },
        { itemId: 'item123', quantity: 10, unitPrice: 100, discount: 5 },
      ];

      const result = await invoiceValidationService.validateInvoiceItems(items, 'sales');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateSingleItem', () => {
    it('should return error when itemId is missing', async () => {
      const item = { quantity: 10, unitPrice: 100 };
      const result = await invoiceValidationService.validateSingleItem(item, 0, 'sales');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('ITEM_ID_REQUIRED');
    });

    it('should return error when item is not found', async () => {
      Item.findById.mockResolvedValue(null);

      const item = { itemId: 'nonexistent', quantity: 10, unitPrice: 100 };
      const result = await invoiceValidationService.validateSingleItem(item, 0, 'sales');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('ITEM_NOT_FOUND');
    });

    it('should return error when item is inactive', async () => {
      const mockItem = {
        _id: 'item123',
        name: 'Test Item',
        isActive: false,
        inventory: { currentStock: 100 },
      };

      Item.findById.mockResolvedValue(mockItem);

      const item = { itemId: 'item123', quantity: 10, unitPrice: 100 };
      const result = await invoiceValidationService.validateSingleItem(item, 0, 'sales');

      expect(result.errors.some((e) => e.code === 'ITEM_INACTIVE')).toBe(true);
    });

    it('should return error when quantity is zero or negative', async () => {
      const mockItem = {
        _id: 'item123',
        name: 'Test Item',
        isActive: true,
        inventory: { currentStock: 100 },
      };

      Item.findById.mockResolvedValue(mockItem);

      const item = { itemId: 'item123', quantity: 0, unitPrice: 100 };
      const result = await invoiceValidationService.validateSingleItem(item, 0, 'sales');

      expect(result.errors.some((e) => e.code === 'INVALID_QUANTITY')).toBe(true);
    });

    it('should return error when unit price is negative', async () => {
      const mockItem = {
        _id: 'item123',
        name: 'Test Item',
        isActive: true,
        inventory: { currentStock: 100 },
      };

      Item.findById.mockResolvedValue(mockItem);

      const item = { itemId: 'item123', quantity: 10, unitPrice: -50 };
      const result = await invoiceValidationService.validateSingleItem(item, 0, 'sales');

      expect(result.errors.some((e) => e.code === 'INVALID_UNIT_PRICE')).toBe(true);
    });

    it('should return error when discount is outside 0-100 range', async () => {
      const mockItem = {
        _id: 'item123',
        name: 'Test Item',
        isActive: true,
        inventory: { currentStock: 100 },
      };

      Item.findById.mockResolvedValue(mockItem);

      const item = { itemId: 'item123', quantity: 10, unitPrice: 100, discount: 150 };
      const result = await invoiceValidationService.validateSingleItem(item, 0, 'sales');

      expect(result.errors.some((e) => e.code === 'INVALID_DISCOUNT')).toBe(true);
    });
  });

  describe('validateStockAvailability', () => {
    it('should return error when stock is insufficient', () => {
      const item = {
        name: 'Test Item',
        code: 'TEST001',
        inventory: { currentStock: 5, minStock: 2 },
      };

      const result = invoiceValidationService.validateStockAvailability(item, 10, 0);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INSUFFICIENT_STOCK');
      expect(result.errors[0].details.shortfall).toBe(5);
    });

    it('should return warning when stock will fall below minimum', () => {
      const item = {
        name: 'Test Item',
        code: 'TEST001',
        inventory: { currentStock: 15, minStock: 10 },
      };

      const result = invoiceValidationService.validateStockAvailability(item, 10, 0);

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('LOW_STOCK_WARNING');
    });

    it('should pass validation when stock is sufficient', () => {
      const item = {
        name: 'Test Item',
        code: 'TEST001',
        inventory: { currentStock: 100, minStock: 10 },
      };

      const result = invoiceValidationService.validateStockAvailability(item, 10, 0);

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('validatePricing', () => {
    it('should return warning when price differs significantly from standard', () => {
      const item = {
        name: 'Test Item',
        code: 'TEST001',
        pricing: { salePrice: 100, costPrice: 80 },
      };

      const result = invoiceValidationService.validatePricing(item, 150, 'sale', 0);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('PRICE_VARIANCE_WARNING');
      expect(result.warnings[0].details.variance).toBe('50.00%');
    });

    it('should not return warning when price is within acceptable range', () => {
      const item = {
        name: 'Test Item',
        code: 'TEST001',
        pricing: { salePrice: 100, costPrice: 80 },
      };

      const result = invoiceValidationService.validatePricing(item, 110, 'sale', 0);

      expect(result.warnings).toHaveLength(0);
    });

    it('should handle missing standard price gracefully', () => {
      const item = {
        name: 'Test Item',
        code: 'TEST001',
        pricing: {},
      };

      const result = invoiceValidationService.validatePricing(item, 100, 'sale', 0);

      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('validateBatchInfo', () => {
    it('should return error when expiry date is before manufacturing date', () => {
      const futureDate1 = new Date();
      futureDate1.setDate(futureDate1.getDate() + 60); // 60 days from now
      
      const futureDate2 = new Date();
      futureDate2.setDate(futureDate2.getDate() + 30); // 30 days from now (before futureDate1)

      const batchInfo = {
        manufacturingDate: futureDate1.toISOString(),
        expiryDate: futureDate2.toISOString(),
      };

      const result = invoiceValidationService.validateBatchInfo(batchInfo, 0);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_BATCH_DATES');
    });

    it('should return error when batch is already expired', () => {
      const batchInfo = {
        manufacturingDate: '2023-01-01',
        expiryDate: '2023-12-01',
      };

      const result = invoiceValidationService.validateBatchInfo(batchInfo, 0);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('BATCH_EXPIRED');
    });

    it('should return warning when batch expires soon', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15); // 15 days from now

      const batchInfo = {
        manufacturingDate: '2024-01-01',
        expiryDate: futureDate.toISOString(),
      };

      const result = invoiceValidationService.validateBatchInfo(batchInfo, 0);

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('BATCH_EXPIRING_SOON');
    });

    it('should pass validation for valid batch dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 365); // 1 year from now

      const batchInfo = {
        manufacturingDate: '2024-01-01',
        expiryDate: futureDate.toISOString(),
      };

      const result = invoiceValidationService.validateBatchInfo(batchInfo, 0);

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('validateCreditLimit', () => {
    it('should return error when customer is not found', async () => {
      Customer.findById.mockResolvedValue(null);

      const result = await invoiceValidationService.validateCreditLimit('customer123', 1000);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('CUSTOMER_NOT_FOUND');
    });

    it('should return error when customer is inactive', async () => {
      const mockCustomer = {
        _id: 'customer123',
        name: 'Test Customer',
        isActive: false,
      };

      Customer.findById.mockResolvedValue(mockCustomer);

      const result = await invoiceValidationService.validateCreditLimit('customer123', 1000);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('CUSTOMER_INACTIVE');
    });

    it('should return warning when no credit limit is set', async () => {
      const mockCustomer = {
        _id: 'customer123',
        name: 'Test Customer',
        isActive: true,
        financialInfo: { creditLimit: 0 },
      };

      Customer.findById.mockResolvedValue(mockCustomer);

      const result = await invoiceValidationService.validateCreditLimit('customer123', 1000);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('NO_CREDIT_LIMIT');
    });

    it('should return error when credit limit is exceeded', async () => {
      const mockCustomer = {
        _id: 'customer123',
        code: 'CUST001',
        name: 'Test Customer',
        isActive: true,
        financialInfo: { creditLimit: 5000 },
      };

      Customer.findById.mockResolvedValue(mockCustomer);

      const result = await invoiceValidationService.validateCreditLimit(
        'customer123',
        6000,
        0
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('CREDIT_LIMIT_EXCEEDED');
      expect(result.errors[0].details.excess).toBe(1000);
    });

    it('should return warning when approaching credit limit', async () => {
      const mockCustomer = {
        _id: 'customer123',
        code: 'CUST001',
        name: 'Test Customer',
        isActive: true,
        financialInfo: { creditLimit: 10000 },
      };

      Customer.findById.mockResolvedValue(mockCustomer);

      const result = await invoiceValidationService.validateCreditLimit(
        'customer123',
        9500,
        0
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('CREDIT_LIMIT_WARNING');
    });

    it('should consider existing balance in credit limit calculation', async () => {
      const mockCustomer = {
        _id: 'customer123',
        code: 'CUST001',
        name: 'Test Customer',
        isActive: true,
        financialInfo: { creditLimit: 10000 },
      };

      Customer.findById.mockResolvedValue(mockCustomer);

      const result = await invoiceValidationService.validateCreditLimit(
        'customer123',
        3000,
        8000
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('CREDIT_LIMIT_EXCEEDED');
      expect(result.errors[0].details.totalExposure).toBe(11000);
    });

    it('should pass validation when within credit limit', async () => {
      const mockCustomer = {
        _id: 'customer123',
        code: 'CUST001',
        name: 'Test Customer',
        isActive: true,
        financialInfo: { creditLimit: 10000 },
      };

      Customer.findById.mockResolvedValue(mockCustomer);

      const result = await invoiceValidationService.validateCreditLimit(
        'customer123',
        5000,
        0
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validatePaymentTerms', () => {
    it('should return error when supplier is not found', async () => {
      Supplier.findById.mockResolvedValue(null);

      const result = await invoiceValidationService.validatePaymentTerms('supplier123', 30);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('SUPPLIER_NOT_FOUND');
    });

    it('should return error when supplier is inactive', async () => {
      const mockSupplier = {
        _id: 'supplier123',
        name: 'Test Supplier',
        isActive: false,
      };

      Supplier.findById.mockResolvedValue(mockSupplier);

      const result = await invoiceValidationService.validatePaymentTerms('supplier123', 30);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('SUPPLIER_INACTIVE');
    });

    it('should return warning when payment terms differ from standard', async () => {
      const mockSupplier = {
        _id: 'supplier123',
        code: 'SUPP001',
        name: 'Test Supplier',
        isActive: true,
        financialInfo: { paymentTerms: 30 },
      };

      Supplier.findById.mockResolvedValue(mockSupplier);

      const result = await invoiceValidationService.validatePaymentTerms('supplier123', 60);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('PAYMENT_TERMS_VARIANCE');
    });

    it('should return warning when payment terms exceed 90 days', async () => {
      const mockSupplier = {
        _id: 'supplier123',
        code: 'SUPP001',
        name: 'Test Supplier',
        isActive: true,
        financialInfo: { paymentTerms: 30 },
      };

      Supplier.findById.mockResolvedValue(mockSupplier);

      const result = await invoiceValidationService.validatePaymentTerms('supplier123', 120);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.code === 'LONG_PAYMENT_TERMS')).toBe(true);
    });

    it('should pass validation when payment terms match standard', async () => {
      const mockSupplier = {
        _id: 'supplier123',
        code: 'SUPP001',
        name: 'Test Supplier',
        isActive: true,
        financialInfo: { paymentTerms: 30 },
      };

      Supplier.findById.mockResolvedValue(mockSupplier);

      const result = await invoiceValidationService.validatePaymentTerms('supplier123', 30);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateSalesInvoice', () => {
    it('should validate complete sales invoice successfully', async () => {
      const mockItem = {
        _id: 'item123',
        name: 'Test Item',
        code: 'TEST001',
        isActive: true,
        inventory: { currentStock: 100, minStock: 10 },
        pricing: { salePrice: 100 },
      };

      const mockCustomer = {
        _id: 'customer123',
        code: 'CUST001',
        name: 'Test Customer',
        isActive: true,
        financialInfo: { creditLimit: 10000 },
      };

      Item.findById.mockResolvedValue(mockItem);
      Customer.findById.mockResolvedValue(mockCustomer);

      const invoiceData = {
        customerId: 'customer123',
        items: [{ itemId: 'item123', quantity: 5, unitPrice: 100, discount: 0 }],
        totals: { grandTotal: 500 },
      };

      const result = await invoiceValidationService.validateSalesInvoice(invoiceData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid sales invoice', async () => {
      const mockItem = {
        _id: 'item123',
        name: 'Test Item',
        code: 'TEST001',
        isActive: true,
        inventory: { currentStock: 5, minStock: 10 },
        pricing: { salePrice: 100 },
      };

      const mockCustomer = {
        _id: 'customer123',
        code: 'CUST001',
        name: 'Test Customer',
        isActive: true,
        financialInfo: { creditLimit: 100 },
      };

      Item.findById.mockResolvedValue(mockItem);
      Customer.findById.mockResolvedValue(mockCustomer);

      const invoiceData = {
        customerId: 'customer123',
        items: [{ itemId: 'item123', quantity: 10, unitPrice: 100, discount: 0 }],
        totals: { grandTotal: 1000 },
      };

      const result = await invoiceValidationService.validateSalesInvoice(invoiceData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validatePurchaseInvoice', () => {
    it('should validate complete purchase invoice successfully', async () => {
      const mockItem = {
        _id: 'item123',
        name: 'Test Item',
        code: 'TEST001',
        isActive: true,
        inventory: { currentStock: 100, minStock: 10 },
        pricing: { costPrice: 80 },
      };

      const mockSupplier = {
        _id: 'supplier123',
        code: 'SUPP001',
        name: 'Test Supplier',
        isActive: true,
        financialInfo: { paymentTerms: 30 },
      };

      Item.findById.mockResolvedValue(mockItem);
      Supplier.findById.mockResolvedValue(mockSupplier);

      const invoiceData = {
        supplierId: 'supplier123',
        items: [
          {
            itemId: 'item123',
            quantity: 10,
            unitPrice: 80,
            discount: 0,
            batchInfo: {
              batchNumber: 'BATCH001',
              manufacturingDate: '2024-01-01',
              expiryDate: '2025-12-31',
            },
          },
        ],
        paymentTerms: 30,
      };

      const result = await invoiceValidationService.validatePurchaseInvoice(invoiceData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid batch information', async () => {
      const mockItem = {
        _id: 'item123',
        name: 'Test Item',
        code: 'TEST001',
        isActive: true,
        inventory: { currentStock: 100, minStock: 10 },
        pricing: { costPrice: 80 },
      };

      const mockSupplier = {
        _id: 'supplier123',
        code: 'SUPP001',
        name: 'Test Supplier',
        isActive: true,
        financialInfo: { paymentTerms: 30 },
      };

      Item.findById.mockResolvedValue(mockItem);
      Supplier.findById.mockResolvedValue(mockSupplier);

      const invoiceData = {
        supplierId: 'supplier123',
        items: [
          {
            itemId: 'item123',
            quantity: 10,
            unitPrice: 80,
            discount: 0,
            batchInfo: {
              batchNumber: 'BATCH001',
              manufacturingDate: '2024-12-01',
              expiryDate: '2024-01-01', // Invalid: expiry before manufacturing
            },
          },
        ],
        paymentTerms: 30,
      };

      const result = await invoiceValidationService.validatePurchaseInvoice(invoiceData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_BATCH_DATES')).toBe(true);
    });
  });
});
