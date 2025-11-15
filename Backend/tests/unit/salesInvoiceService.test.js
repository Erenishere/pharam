const salesInvoiceService = require('../../src/services/salesInvoiceService');
const invoiceRepository = require('../../src/repositories/invoiceRepository');
const customerService = require('../../src/services/customerService');
const itemService = require('../../src/services/itemService');

// Mock dependencies
jest.mock('../../src/repositories/invoiceRepository');
jest.mock('../../src/services/customerService');
jest.mock('../../src/services/itemService');

describe('Sales Invoice Service Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSalesInvoice', () => {
    const mockCustomer = {
      _id: 'customer123',
      code: 'CUST001',
      name: 'Test Customer',
      isActive: true,
      financialInfo: {
        creditLimit: 100000,
        paymentTerms: 30
      }
    };

    const mockItem = {
      _id: 'item123',
      code: 'ITEM001',
      name: 'Test Item',
      isActive: true,
      pricing: {
        salePrice: 100
      },
      tax: {
        gstRate: 18,
        whtRate: 0
      },
      inventory: {
        currentStock: 100
      },
      checkStockAvailability: jest.fn().mockReturnValue(true)
    };

    const validInvoiceData = {
      customerId: 'customer123',
      items: [
        {
          itemId: 'item123',
          quantity: 10,
         