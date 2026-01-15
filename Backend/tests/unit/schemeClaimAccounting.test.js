const mongoose = require('mongoose');
const schemeTrackingService = require('../../src/services/schemeTrackingService');
const ledgerService = require('../../src/services/ledgerService');
const Invoice = require('../../src/models/Invoice');
const Account = require('../../src/models/Account');
const Customer = require('../../src/models/Customer');
const User = require('../../src/models/User');

// Mock dependencies
jest.mock('../../src/services/ledgerService');

describe('Scheme Claim Accounting', () => {
  let testInvoice;
  let testCustomer;
  let testUser;
  let testClaimAccount;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create test user
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin',
      isActive: true
    });

    // Create test customer
    testCustomer = new Customer({
      code: 'CUST001',
      name: 'Test Customer',
      contactPerson: 'John Doe',
      phone: '1234567890',
      email: 'customer@example.com',
      address: 'Test Address',
      city: 'Test City',
      state: 'Test State',
      gstin: '27AABCU9603R1ZX',
      isActive: true
    });

    // Create test claim account
    testClaimAccount = new Account({
      name: 'Promotional Claims',
      code: 'CLAIM001',
      accountNumber: 'ACC-CLAIM-001',
      accountType: 'claim',
      description: 'Account for promotional scheme claims',
      isActive: true
    });

    // Create test invoice with scheme items
    testInvoice = new Invoice({
      invoiceNumber: 'SI2024000001',
      type: 'sales',
      customerId: testCustomer._id,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: [
        {
          itemId: new mongoose.Types.ObjectId(),
          quantity: 12,
          unitPrice: 100,
          discount: 0,
          taxAmount: 180,
          lineTotal: 1380,
          scheme1Quantity: 1, // Regular bonus
          scheme2Quantity: 2  // Claim-based bonus
        },
        {
          itemId: new mongoose.Types.ObjectId(),
          quantity: 24,
          unitPrice: 50,
          discount: 0,
          taxAmount: 216,
          lineTotal: 1416,
          scheme1Quantity: 2,
          scheme2Quantity: 1
        }
      ],
      totals: {
        subtotal: 2400,
        totalDiscount: 0,
        totalTax: 396,
        grandTotal: 2796
      },
      status: 'confirmed',
      paymentStatus: 'pending'
    });
  });

  describe('validateClaimAccount', () => {
    it('should validate a valid claim account', async () => {
      // Mock Account.findById
      jest.spyOn(Account, 'findById').mockResolvedValue(testClaimAccount);

      const result = await schemeTrackingService.validateClaimAccount(testClaimAccount._id);

      expect(result).toEqual(testClaimAccount);
      expect(Account.findById).toHaveBeenCalledWith(testClaimAccount._id);
    });

    it('should throw error if claim account ID is not provided', async () => {
      await expect(schemeTrackingService.validateClaimAccount(null))
        .rejects.toThrow('Claim account ID is required');
    });

    it('should throw error if claim account is not found', async () => {
      jest.spyOn(Account, 'findById').mockResolvedValue(null);

      await expect(schemeTrackingService.validateClaimAccount('nonexistent'))
        .rejects.toThrow('Claim account not found');
    });

    it('should throw error if claim account is not active', async () => {
      const inactiveAccount = { ...testClaimAccount.toObject(), isActive: false };
      jest.spyOn(Account, 'findById').mockResolvedValue(inactiveAccount);

      await expect(schemeTrackingService.validateClaimAccount(testClaimAccount._id))
        .rejects.toThrow('Claim account Promotional Claims is not active');
    });

    it('should throw error if account cannot be used for claims', async () => {
      const invalidAccount = {
        ...testClaimAccount.toObject(),
        accountType: 'asset',
        canBeUsedForClaims: () => false
      };
      jest.spyOn(Account, 'findById').mockResolvedValue(invalidAccount);

      await expect(schemeTrackingService.validateClaimAccount(testClaimAccount._id))
        .rejects.toThrow('Account Promotional Claims cannot be used for claims');
    });
  });

  describe('createSchemeClaimLedgerEntries', () => {
    beforeEach(() => {
      // Mock ledgerService.createDoubleEntry
      ledgerService.createDoubleEntry.mockResolvedValue([
        { _id: 'debit_entry', transactionType: 'debit', amount: 150 },
        { _id: 'credit_entry', transactionType: 'credit', amount: 150 }
      ]);

      // Mock account.updateBalance
      testClaimAccount.updateBalance = jest.fn().mockResolvedValue(testClaimAccount);
    });

    it('should create ledger entries for scheme claims', async () => {
      const claimAmount = 150;

      const result = await schemeTrackingService.createSchemeClaimLedgerEntries(
        testInvoice,
        testClaimAccount,
        claimAmount,
        testUser._id
      );

      expect(ledgerService.createDoubleEntry).toHaveBeenCalledWith(
        {
          accountId: testClaimAccount._id,
          accountType: 'Account'
        },
        {
          accountId: testInvoice.customerId,
          accountType: 'Customer'
        },
        claimAmount,
        `Scheme2 claim for invoice ${testInvoice.invoiceNumber} - ${testClaimAccount.name}`,
        'scheme_claim',
        testInvoice._id,
        testUser._id
      );

      expect(testClaimAccount.updateBalance).toHaveBeenCalledWith(claimAmount, 'add');
      expect(result).toHaveLength(2);
    });

    it('should throw error if claim amount is zero or negative', async () => {
      await expect(schemeTrackingService.createSchemeClaimLedgerEntries(
        testInvoice,
        testClaimAccount,
        0,
        testUser._id
      )).rejects.toThrow('Claim amount must be greater than 0');

      await expect(schemeTrackingService.createSchemeClaimLedgerEntries(
        testInvoice,
        testClaimAccount,
        -100,
        testUser._id
      )).rejects.toThrow('Claim amount must be greater than 0');
    });
  });

  describe('linkSchemeToClaimAccount', () => {
    beforeEach(() => {
      // Mock dependencies
      jest.spyOn(Account, 'findById').mockResolvedValue(testClaimAccount);
      jest.spyOn(Invoice, 'findById').mockResolvedValue(testInvoice);
      jest.spyOn(Invoice, 'findByIdAndUpdate').mockResolvedValue({
        ...testInvoice.toObject(),
        claimAccountId: testClaimAccount._id
      });

      ledgerService.createDoubleEntry.mockResolvedValue([
        { _id: 'debit_entry', transactionType: 'debit', amount: 150 },
        { _id: 'credit_entry', transactionType: 'credit', amount: 150 }
      ]);

      testClaimAccount.updateBalance = jest.fn().mockResolvedValue(testClaimAccount);
    });

    it('should link scheme to claim account and create ledger entries', async () => {
      const result = await schemeTrackingService.linkSchemeToClaimAccount(
        testInvoice._id,
        testClaimAccount._id,
        testUser._id
      );

      expect(result).toHaveProperty('invoice');
      expect(result).toHaveProperty('claimAccount');
      expect(result).toHaveProperty('ledgerEntries');
      expect(result).toHaveProperty('totalScheme2Value');

      expect(result.claimAccount).toEqual(testClaimAccount);
      expect(result.ledgerEntries).toHaveLength(2);
      expect(result.totalScheme2Value).toBe(250); // (2 * 100) + (1 * 50)

      expect(Invoice.findByIdAndUpdate).toHaveBeenCalledWith(
        testInvoice._id,
        { claimAccountId: testClaimAccount._id },
        { new: true }
      );
    });

    it('should throw error if no scheme2 quantities found', async () => {
      const invoiceWithoutScheme2 = {
        ...testInvoice.toObject(),
        items: [
          {
            itemId: new mongoose.Types.ObjectId(),
            quantity: 12,
            unitPrice: 100,
            scheme1Quantity: 1,
            scheme2Quantity: 0 // No scheme2
          }
        ]
      };

      jest.spyOn(Invoice, 'findById').mockResolvedValue(invoiceWithoutScheme2);

      await expect(schemeTrackingService.linkSchemeToClaimAccount(
        testInvoice._id,
        testClaimAccount._id,
        testUser._id
      )).rejects.toThrow('No scheme2 quantities found in invoice');
    });

    it('should throw error if required parameters are missing', async () => {
      await expect(schemeTrackingService.linkSchemeToClaimAccount(
        null,
        testClaimAccount._id,
        testUser._id
      )).rejects.toThrow('Invoice ID is required');

      await expect(schemeTrackingService.linkSchemeToClaimAccount(
        testInvoice._id,
        null,
        testUser._id
      )).rejects.toThrow('Claim account ID is required');

      await expect(schemeTrackingService.linkSchemeToClaimAccount(
        testInvoice._id,
        testClaimAccount._id,
        null
      )).rejects.toThrow('User ID is required');
    });
  });

  describe('processSchemeApplication', () => {
    beforeEach(() => {
      // Mock recordSchemeQuantities
      jest.spyOn(schemeTrackingService, 'recordSchemeQuantities').mockResolvedValue({
        invoiceId: testInvoice._id,
        schemes: [
          {
            itemId: testInvoice.items[0].itemId,
            scheme1Quantity: 1,
            scheme2Quantity: 2,
            claimAccountId: testClaimAccount._id
          }
        ],
        totalScheme1: 1,
        totalScheme2: 2
      });

      // Mock linkSchemeToClaimAccount
      jest.spyOn(schemeTrackingService, 'linkSchemeToClaimAccount').mockResolvedValue({
        invoice: testInvoice,
        claimAccount: testClaimAccount,
        ledgerEntries: [
          { _id: 'debit_entry', transactionType: 'debit', amount: 200 },
          { _id: 'credit_entry', transactionType: 'credit', amount: 200 }
        ],
        totalScheme2Value: 200
      });
    });

    it('should process scheme application with claim accounts', async () => {
      const schemeItems = [
        {
          itemId: testInvoice.items[0].itemId,
          scheme1Quantity: 1,
          scheme2Quantity: 2,
          claimAccountId: testClaimAccount._id
        }
      ];

      const result = await schemeTrackingService.processSchemeApplication(
        testInvoice._id,
        schemeItems,
        testUser._id
      );

      expect(result).toHaveProperty('ledgerEntries');
      expect(result.ledgerEntries).toHaveLength(2);

      expect(schemeTrackingService.recordSchemeQuantities).toHaveBeenCalledWith(
        testInvoice._id,
        schemeItems
      );

      expect(schemeTrackingService.linkSchemeToClaimAccount).toHaveBeenCalledWith(
        testInvoice._id,
        testClaimAccount._id.toString(),
        testUser._id
      );
    });

    it('should throw error if scheme2 items missing claim accounts', async () => {
      const schemeItemsWithoutClaimAccount = [
        {
          itemId: testInvoice.items[0].itemId,
          scheme1Quantity: 1,
          scheme2Quantity: 2
          // Missing claimAccountId
        }
      ];

      await expect(schemeTrackingService.processSchemeApplication(
        testInvoice._id,
        schemeItemsWithoutClaimAccount,
        testUser._id
      )).rejects.toThrow('Claim account is required for all scheme2 quantities');
    });

    it('should process schemes without scheme2 quantities', async () => {
      const schemeItemsWithoutScheme2 = [
        {
          itemId: testInvoice.items[0].itemId,
          scheme1Quantity: 1,
          scheme2Quantity: 0
        }
      ];

      // Mock recordSchemeQuantities for scheme1 only
      jest.spyOn(schemeTrackingService, 'recordSchemeQuantities').mockResolvedValue({
        invoiceId: testInvoice._id,
        schemes: [
          {
            itemId: testInvoice.items[0].itemId,
            scheme1Quantity: 1,
            scheme2Quantity: 0
          }
        ],
        totalScheme1: 1,
        totalScheme2: 0
      });

      const result = await schemeTrackingService.processSchemeApplication(
        testInvoice._id,
        schemeItemsWithoutScheme2,
        testUser._id
      );

      expect(result).not.toHaveProperty('ledgerEntries');
      expect(schemeTrackingService.linkSchemeToClaimAccount).not.toHaveBeenCalled();
    });

    it('should throw error if required parameters are missing', async () => {
      const schemeItems = [
        {
          itemId: testInvoice.items[0].itemId,
          scheme1Quantity: 1,
          scheme2Quantity: 0
        }
      ];

      await expect(schemeTrackingService.processSchemeApplication(
        null,
        schemeItems,
        testUser._id
      )).rejects.toThrow('Invoice ID is required');

      await expect(schemeTrackingService.processSchemeApplication(
        testInvoice._id,
        null,
        testUser._id
      )).rejects.toThrow('Scheme items are required');

      await expect(schemeTrackingService.processSchemeApplication(
        testInvoice._id,
        schemeItems,
        null
      )).rejects.toThrow('User ID is required');
    });
  });

  describe('Integration with Account model', () => {
    it('should work with different account types for claims', async () => {
      const adjustmentAccount = new Account({
        name: 'Adjustment Account',
        code: 'ADJ001',
        accountType: 'adjustment',
        isActive: true
      });

      const expenseAccount = new Account({
        name: 'Promotional Expense',
        code: 'EXP001',
        accountType: 'expense',
        isActive: true
      });

      // Test adjustment account
      jest.spyOn(Account, 'findById').mockResolvedValueOnce(adjustmentAccount);
      const result1 = await schemeTrackingService.validateClaimAccount(adjustmentAccount._id);
      expect(result1).toEqual(adjustmentAccount);

      // Test expense account
      jest.spyOn(Account, 'findById').mockResolvedValueOnce(expenseAccount);
      const result2 = await schemeTrackingService.validateClaimAccount(expenseAccount._id);
      expect(result2).toEqual(expenseAccount);
    });
  });
});