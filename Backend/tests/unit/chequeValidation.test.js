const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const CashReceipt = require('../../src/models/CashReceipt');
const Customer = require('../../src/models/Customer');
const User = require('../../src/models/User');
const Account = require('../../src/models/Account');

/**
 * Unit Tests for Cheque Validation
 * Tests for Requirement 7.1, 7.2 - Task 31.2
 */
describe('CashReceipt Model - Cheque Validation', () => {
  let mongoServer;
  let testCustomer;
  let testUser;
  let testAccount;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear collections
    await CashReceipt.deleteMany({});
    await Customer.deleteMany({});
    await User.deleteMany({});
    await Account.deleteMany({});

    // Create test account
    testAccount = await Account.create({
      name: 'Accounts Receivable',
      code: 'AR-001',
      type: 'asset',
      category: 'current_asset',
      isActive: true,
    });

    // Create test customer
    testCustomer = await Customer.create({
      name: 'Test Customer',
      code: 'CUST001',
      contactPerson: 'John Doe',
      phone: '1234567890',
      email: 'customer@test.com',
      address: '123 Test St',
      city: 'Test City',
      isActive: true,
      accountId: testAccount._id,
    });

    // Create test user
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin',
    });
  });

  describe('Cheque field validation when postDatedCheque is true', () => {
    it('should require chequeDate for post-dated cheques', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await expect(
        CashReceipt.create({
          customerId: testCustomer._id,
          amount: 1000,
          paymentMethod: 'cheque',
          postDatedCheque: true,
          bankDetails: {
            bankName: 'Test Bank',
            chequeNumber: 'CHQ001',
            // Missing chequeDate
          },
          createdBy: testUser._id,
        })
      ).rejects.toThrow('Cheque date is required for post-dated cheques');
    });

    it('should require bankName for post-dated cheques', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await expect(
        CashReceipt.create({
          customerId: testCustomer._id,
          amount: 1000,
          paymentMethod: 'cheque',
          postDatedCheque: true,
          bankDetails: {
            // Missing bankName
            chequeNumber: 'CHQ001',
            chequeDate: tomorrow,
          },
          createdBy: testUser._id,
        })
      ).rejects.toThrow('Bank name is required for post-dated cheques');
    });

    it('should require chequeNumber for cheque payments', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await expect(
        CashReceipt.create({
          customerId: testCustomer._id,
          amount: 1000,
          paymentMethod: 'cheque',
          postDatedCheque: true,
          bankDetails: {
            bankName: 'Test Bank',
            // Missing chequeNumber
            chequeDate: tomorrow,
          },
          createdBy: testUser._id,
        })
      ).rejects.toThrow('Cheque number is required for cheque payments');
    });

    it('should accept valid post-dated cheque', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const receipt = await CashReceipt.create({
        customerId: testCustomer._id,
        amount: 1000,
        paymentMethod: 'cheque',
        postDatedCheque: true,
        bankDetails: {
          bankName: 'Test Bank',
          chequeNumber: 'CHQ001',
          chequeDate: tomorrow,
        },
        createdBy: testUser._id,
      });

      expect(receipt).toBeDefined();
      expect(receipt.postDatedCheque).toBe(true);
      expect(receipt.chequeStatus).toBe('pending');
    });
  });

  describe('Cheque date validation', () => {
    it('should reject cheque date in the past for new post-dated cheques', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await expect(
        CashReceipt.create({
          customerId: testCustomer._id,
          amount: 1000,
          paymentMethod: 'cheque',
          postDatedCheque: true,
          bankDetails: {
            bankName: 'Test Bank',
            chequeNumber: 'CHQ001',
            chequeDate: yesterday,
          },
          createdBy: testUser._id,
        })
      ).rejects.toThrow('Cheque date cannot be in the past for post-dated cheques');
    });

    it('should accept cheque date today', async () => {
      const today = new Date();

      const receipt = await CashReceipt.create({
        customerId: testCustomer._id,
        amount: 1000,
        paymentMethod: 'cheque',
        postDatedCheque: true,
        bankDetails: {
          bankName: 'Test Bank',
          chequeNumber: 'CHQ001',
          chequeDate: today,
        },
        createdBy: testUser._id,
      });

      expect(receipt).toBeDefined();
    });

    it('should accept future cheque date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const receipt = await CashReceipt.create({
        customerId: testCustomer._id,
        amount: 1000,
        paymentMethod: 'cheque',
        postDatedCheque: true,
        bankDetails: {
          bankName: 'Test Bank',
          chequeNumber: 'CHQ001',
          chequeDate: futureDate,
        },
        createdBy: testUser._id,
      });

      expect(receipt).toBeDefined();
      expect(receipt.bankDetails.chequeDate).toEqual(futureDate);
    });
  });

  describe('Cheque number uniqueness per bank', () => {
    it('should reject duplicate cheque number for same bank', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Create first receipt
      await CashReceipt.create({
        customerId: testCustomer._id,
        amount: 1000,
        paymentMethod: 'cheque',
        postDatedCheque: true,
        bankDetails: {
          bankName: 'Test Bank',
          chequeNumber: 'CHQ001',
          chequeDate: tomorrow,
        },
        createdBy: testUser._id,
      });

      // Try to create duplicate
      await expect(
        CashReceipt.create({
          customerId: testCustomer._id,
          amount: 2000,
          paymentMethod: 'cheque',
          postDatedCheque: true,
          bankDetails: {
            bankName: 'Test Bank',
            chequeNumber: 'CHQ001', // Same cheque number
            chequeDate: tomorrow,
          },
          createdBy: testUser._id,
        })
      ).rejects.toThrow(/already exists/);
    });

    it('should allow same cheque number for different banks', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Create first receipt with Bank A
      await CashReceipt.create({
        customerId: testCustomer._id,
        amount: 1000,
        paymentMethod: 'cheque',
        postDatedCheque: true,
        bankDetails: {
          bankName: 'Bank A',
          chequeNumber: 'CHQ001',
          chequeDate: tomorrow,
        },
        createdBy: testUser._id,
      });

      // Create second receipt with Bank B (same cheque number)
      const receipt2 = await CashReceipt.create({
        customerId: testCustomer._id,
        amount: 2000,
        paymentMethod: 'cheque',
        postDatedCheque: true,
        bankDetails: {
          bankName: 'Bank B',
          chequeNumber: 'CHQ001', // Same cheque number but different bank
          chequeDate: tomorrow,
        },
        createdBy: testUser._id,
      });

      expect(receipt2).toBeDefined();
    });

    it('should allow duplicate cheque number if original is cancelled', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Create first receipt
      const receipt1 = await CashReceipt.create({
        customerId: testCustomer._id,
        amount: 1000,
        paymentMethod: 'cheque',
        postDatedCheque: true,
        bankDetails: {
          bankName: 'Test Bank',
          chequeNumber: 'CHQ001',
          chequeDate: tomorrow,
        },
        createdBy: testUser._id,
      });

      // Cancel first receipt
      receipt1.status = 'cancelled';
      await receipt1.save();

      // Create new receipt with same cheque number
      const receipt2 = await CashReceipt.create({
        customerId: testCustomer._id,
        amount: 2000,
        paymentMethod: 'cheque',
        postDatedCheque: true,
        bankDetails: {
          bankName: 'Test Bank',
          chequeNumber: 'CHQ001',
          chequeDate: tomorrow,
        },
        createdBy: testUser._id,
      });

      expect(receipt2).toBeDefined();
    });

    it('should include receipt details in duplicate error message', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Create first receipt
      const receipt1 = await CashReceipt.create({
        customerId: testCustomer._id,
        amount: 1000,
        paymentMethod: 'cheque',
        postDatedCheque: true,
        bankDetails: {
          bankName: 'Test Bank',
          chequeNumber: 'CHQ001',
          chequeDate: tomorrow,
        },
        createdBy: testUser._id,
      });

      // Try to create duplicate
      try {
        await CashReceipt.create({
          customerId: testCustomer._id,
          amount: 2000,
          paymentMethod: 'cheque',
          postDatedCheque: true,
          bankDetails: {
            bankName: 'Test Bank',
            chequeNumber: 'CHQ001',
            chequeDate: tomorrow,
          },
          createdBy: testUser._id,
        });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('CHQ001');
        expect(error.message).toContain('Test Bank');
        expect(error.message).toContain(receipt1.receiptNumber);
      }
    });
  });

  describe('Cheque status initialization', () => {
    it('should set chequeStatus to pending for new post-dated cheques', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const receipt = await CashReceipt.create({
        customerId: testCustomer._id,
        amount: 1000,
        paymentMethod: 'cheque',
        postDatedCheque: true,
        bankDetails: {
          bankName: 'Test Bank',
          chequeNumber: 'CHQ001',
          chequeDate: tomorrow,
        },
        createdBy: testUser._id,
      });

      expect(receipt.chequeStatus).toBe('pending');
    });

    it('should not override explicitly set chequeStatus', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const receipt = await CashReceipt.create({
        customerId: testCustomer._id,
        amount: 1000,
        paymentMethod: 'cheque',
        postDatedCheque: true,
        chequeStatus: 'cleared',
        bankDetails: {
          bankName: 'Test Bank',
          chequeNumber: 'CHQ001',
          chequeDate: tomorrow,
        },
        createdBy: testUser._id,
      });

      expect(receipt.chequeStatus).toBe('cleared');
    });
  });

  describe('Non-post-dated cheque validation', () => {
    it('should allow cheque without postDatedCheque flag', async () => {
      const receipt = await CashReceipt.create({
        customerId: testCustomer._id,
        amount: 1000,
        paymentMethod: 'cheque',
        postDatedCheque: false,
        bankDetails: {
          bankName: 'Test Bank',
          chequeNumber: 'CHQ001',
        },
        createdBy: testUser._id,
      });

      expect(receipt).toBeDefined();
      expect(receipt.postDatedCheque).toBe(false);
    });

    it('should not require chequeDate for non-post-dated cheques', async () => {
      const receipt = await CashReceipt.create({
        customerId: testCustomer._id,
        amount: 1000,
        paymentMethod: 'cheque',
        bankDetails: {
          chequeNumber: 'CHQ001',
          // No chequeDate
        },
        createdBy: testUser._id,
      });

      expect(receipt).toBeDefined();
    });
  });
});
