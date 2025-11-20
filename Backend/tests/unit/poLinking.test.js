const salesInvoiceService = require('../../src/services/salesInvoiceService');
const customerService = require('../../src/services/customerService');
const invoiceRepository = require('../../src/repositories/invoiceRepository');
const PurchaseOrder = require('../../src/models/PurchaseOrder');

// Mock dependencies
jest.mock('../../src/services/customerService');
jest.mock('../../src/repositories/invoiceRepository');
jest.mock('../../src/models/PurchaseOrder');

describe('SalesInvoiceService - PO Linking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAndLinkPO', () => {
    test('should validate PO exists', async () => {
      const mockPO = {
        _id: 'po123',
        poNumber: 'PO001',
        status: 'approved'
      };

      PurchaseOrder.findById.mockResolvedValue(mockPO);

      const result = await salesInvoiceService.validateAndLinkPO('po123');

      expect(result).toEqual(mockPO);
      expect(PurchaseOrder.findById).toHaveBeenCalledWith('po123');
    });

    test('should throw error if PO not found', async () => {
      PurchaseOrder.findById.mockResolvedValue(null);

      await expect(
        salesInvoiceService.validateAndLinkPO('nonexistent')
      ).rejects.toThrow('Purchase Order not found');
    });

    test('should reject cancelled PO', async () => {
      const mockPO = {
        _id: 'po123',
        poNumber: 'PO001',
        status: 'cancelled'
      };

      PurchaseOrder.findById.mockResolvedValue(mockPO);

      await expect(
        salesInvoiceService.validateAndLinkPO('po123')
      ).rejects.toThrow('Cannot create invoice from cancelled Purchase Order');
    });

    test('should reject completed PO', async () => {
      const mockPO = {
        _id: 'po123',
        poNumber: 'PO001',
        status: 'completed'
      };

      PurchaseOrder.findById.mockResolvedValue(mockPO);

      await expect(
        salesInvoiceService.validateAndLinkPO('po123')
      ).rejects.toThrow('Purchase Order is already completed');
    });

    test('should accept approved PO', async () => {
      const mockPO = {
        _id: 'po123',
        poNumber: 'PO001',
        status: 'approved'
      };

      PurchaseOrder.findById.mockResolvedValue(mockPO);

      const result = await salesInvoiceService.validateAndLinkPO('po123');

      expect(result.status).toBe('approved');
    });

    test('should accept partial PO', async () => {
      const mockPO = {
        _id: 'po123',
        poNumber: 'PO001',
        status: 'partial'
      };

      PurchaseOrder.findById.mockResolvedValue(mockPO);

      const result = await salesInvoiceService.validateAndLinkPO('po123');

      expect(result.status).toBe('partial');
    });

    test('should reject unapproved PO', async () => {
      const mockPO = {
        _id: 'po123',
        poNumber: 'PO001',
        status: 'draft'
      };

      PurchaseOrder.findById.mockResolvedValue(mockPO);

      await expect(
        salesInvoiceService.validateAndLinkPO('po123')
      ).rejects.toThrow('Purchase Order must be approved');
    });

    test('should throw error if PO ID not provided', async () => {
      await expect(
        salesInvoiceService.validateAndLinkPO(null)
      ).rejects.toThrow('Purchase Order ID is required');
    });
  });

  describe('createInvoiceFromPO', () => {
    test('should create invoice from PO', async () => {
      const mockPO = {
        _id: 'po123',
        poNumber: 'PO001',
        status: 'approved',
        customerId: 'customer123',
        items: [
          { itemId: 'item1', quantity: 10, unitPrice: 100, discount: 0 }
        ],
        save: jest.fn().mockResolvedValue(true)
      };

      const mockCustomer = {
        _id: 'customer123',
        name: 'Test Customer',
        isActive: true,
        financialInfo: { paymentTerms: 30 }
      };

      const mockInvoice = {
        _id: 'inv123',
        invoiceNumber: 'INV001',
        poId: 'po123',
        poNumber: 'PO001'
      };

      PurchaseOrder.findById.mockResolvedValue(mockPO);
      customerService.getCustomerById.mockResolvedValue(mockCustomer);
      invoiceRepository.generateInvoiceNumber.mockResolvedValue('INV001');
      invoiceRepository.create.mockResolvedValue(mockInvoice);

      const invoiceData = {
        customerId: 'customer123',
        createdBy: 'user123'
      };

      const result = await salesInvoiceService.createInvoiceFromPO('po123', invoiceData);

      expect(result.poId).toBe('po123');
      expect(result.poNumber).toBe('PO001');
      expect(mockPO.save).toHaveBeenCalled();
    });

    test('should update PO status to partial', async () => {
      const mockPO = {
        _id: 'po123',
        poNumber: 'PO001',
        status: 'approved',
        customerId: 'customer123',
        items: [
          { itemId: 'item1', quantity: 10, unitPrice: 100 }
        ],
        save: jest.fn().mockResolvedValue(true)
      };

      const mockCustomer = {
        _id: 'customer123',
        isActive: true,
        financialInfo: { paymentTerms: 30 }
      };

      const mockInvoice = {
        _id: 'inv123',
        invoiceNumber: 'INV001',
        poId: 'po123'
      };

      PurchaseOrder.findById.mockResolvedValue(mockPO);
      customerService.getCustomerById.mockResolvedValue(mockCustomer);
      invoiceRepository.generateInvoiceNumber.mockResolvedValue('INV001');
      invoiceRepository.create.mockResolvedValue(mockInvoice);

      await salesInvoiceService.createInvoiceFromPO('po123', {
        customerId: 'customer123',
        createdBy: 'user123'
      });

      expect(mockPO.status).toBe('partial');
      expect(mockPO.save).toHaveBeenCalled();
    });

    test('should require customer ID', async () => {
      const mockPO = {
        _id: 'po123',
        poNumber: 'PO001',
        status: 'approved'
      };

      PurchaseOrder.findById.mockResolvedValue(mockPO);

      await expect(
        salesInvoiceService.createInvoiceFromPO('po123', {
          createdBy: 'user123'
        })
      ).rejects.toThrow('Customer ID is required');
    });

    test('should require createdBy', async () => {
      const mockPO = {
        _id: 'po123',
        poNumber: 'PO001',
        status: 'approved'
      };

      PurchaseOrder.findById.mockResolvedValue(mockPO);

      await expect(
        salesInvoiceService.createInvoiceFromPO('po123', {
          customerId: 'customer123'
        })
      ).rejects.toThrow('Created by user ID is required');
    });

    test('should use PO items if not provided', async () => {
      const mockPO = {
        _id: 'po123',
        poNumber: 'PO001',
        status: 'approved',
        customerId: 'customer123',
        items: [
          { itemId: 'item1', quantity: 10, unitPrice: 100, discount: 0 },
          { itemId: 'item2', quantity: 5, unitPrice: 200, discount: 0 }
        ],
        save: jest.fn().mockResolvedValue(true)
      };

      const mockCustomer = {
        _id: 'customer123',
        isActive: true,
        financialInfo: { paymentTerms: 30 }
      };

      const mockInvoice = {
        _id: 'inv123',
        invoiceNumber: 'INV001',
        items: [
          { itemId: 'item1', quantity: 10 },
          { itemId: 'item2', quantity: 5 }
        ]
      };

      PurchaseOrder.findById.mockResolvedValue(mockPO);
      customerService.getCustomerById.mockResolvedValue(mockCustomer);
      invoiceRepository.generateInvoiceNumber.mockResolvedValue('INV001');
      invoiceRepository.create.mockResolvedValue(mockInvoice);

      const result = await salesInvoiceService.createInvoiceFromPO('po123', {
        customerId: 'customer123',
        createdBy: 'user123'
      });

      expect(result.items).toHaveLength(2);
    });

    test('should use provided items if specified', async () => {
      const mockPO = {
        _id: 'po123',
        poNumber: 'PO001',
        status: 'approved',
        customerId: 'customer123',
        items: [
          { itemId: 'item1', quantity: 10, unitPrice: 100 }
        ],
        save: jest.fn().mockResolvedValue(true)
      };

      const mockCustomer = {
        _id: 'customer123',
        isActive: true,
        financialInfo: { paymentTerms: 30 }
      };

      const mockInvoice = {
        _id: 'inv123',
        invoiceNumber: 'INV001',
        items: [
          { itemId: 'item1', quantity: 5 } // Different quantity
        ]
      };

      PurchaseOrder.findById.mockResolvedValue(mockPO);
      customerService.getCustomerById.mockResolvedValue(mockCustomer);
      invoiceRepository.generateInvoiceNumber.mockResolvedValue('INV001');
      invoiceRepository.create.mockResolvedValue(mockInvoice);

      const result = await salesInvoiceService.createInvoiceFromPO('po123', {
        customerId: 'customer123',
        items: [{ itemId: 'item1', quantity: 5, unitPrice: 100 }],
        createdBy: 'user123'
      });

      expect(result.items[0].quantity).toBe(5);
    });

    test('should include PO reference in notes', async () => {
      const mockPO = {
        _id: 'po123',
        poNumber: 'PO001',
        status: 'approved',
        customerId: 'customer123',
        items: [
          { itemId: 'item1', quantity: 10, unitPrice: 100 }
        ],
        save: jest.fn().mockResolvedValue(true)
      };

      const mockCustomer = {
        _id: 'customer123',
        isActive: true,
        financialInfo: { paymentTerms: 30 }
      };

      const mockInvoice = {
        _id: 'inv123',
        invoiceNumber: 'INV001',
        notes: 'Created from PO: PO001'
      };

      PurchaseOrder.findById.mockResolvedValue(mockPO);
      customerService.getCustomerById.mockResolvedValue(mockCustomer);
      invoiceRepository.generateInvoiceNumber.mockResolvedValue('INV001');
      invoiceRepository.create.mockResolvedValue(mockInvoice);

      const result = await salesInvoiceService.createInvoiceFromPO('po123', {
        customerId: 'customer123',
        createdBy: 'user123'
      });

      expect(result.notes).toContain('PO001');
    });
  });

  describe('createSalesInvoice with PO', () => {
    test('should link PO to invoice when poId provided', async () => {
      const mockPO = {
        _id: 'po123',
        poNumber: 'PO001',
        status: 'approved'
      };

      const mockCustomer = {
        _id: 'customer123',
        isActive: true,
        financialInfo: { paymentTerms: 30 }
      };

      const mockInvoice = {
        _id: 'inv123',
        invoiceNumber: 'INV001',
        poId: 'po123',
        poNumber: 'PO001'
      };

      PurchaseOrder.findById.mockResolvedValue(mockPO);
      customerService.getCustomerById.mockResolvedValue(mockCustomer);
      invoiceRepository.generateInvoiceNumber.mockResolvedValue('INV001');
      invoiceRepository.create.mockResolvedValue(mockInvoice);

      const result = await salesInvoiceService.createSalesInvoice({
        customerId: 'customer123',
        items: [{ itemId: 'item1', quantity: 10, unitPrice: 100 }],
        poId: 'po123',
        poNumber: 'PO001',
        createdBy: 'user123'
      });

      expect(result.poId).toBe('po123');
      expect(result.poNumber).toBe('PO001');
    });

    test('should create invoice without PO', async () => {
      const mockCustomer = {
        _id: 'customer123',
        isActive: true,
        financialInfo: { paymentTerms: 30 }
      };

      const mockInvoice = {
        _id: 'inv123',
        invoiceNumber: 'INV001',
        poId: null,
        poNumber: null
      };

      customerService.getCustomerById.mockResolvedValue(mockCustomer);
      invoiceRepository.generateInvoiceNumber.mockResolvedValue('INV001');
      invoiceRepository.create.mockResolvedValue(mockInvoice);

      const result = await salesInvoiceService.createSalesInvoice({
        customerId: 'customer123',
        items: [{ itemId: 'item1', quantity: 10, unitPrice: 100 }],
        createdBy: 'user123'
      });

      expect(result.poId).toBeNull();
      expect(result.poNumber).toBeNull();
    });
  });
});
