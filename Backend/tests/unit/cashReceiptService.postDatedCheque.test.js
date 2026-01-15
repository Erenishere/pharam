const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const cashReceiptService = require('../../src/services/cashReceiptService');
const CashReceipt = require('../../src/models/CashReceipt');
const Customer = require('../../src/models/Customer');
const User = require('../../src/models/User');

describe('CashReceiptService - Post-Dated Cheque Management (Requirement 7)', () => {
  let mongoServer;
  let customer, user;

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
    await CashReceipt.deleteMany({});
    await Customer.deleteMany({});
    await User.deleteMany({});

    customer = await Customer.create({
      name: 'Test Customer',
      type: 'customer',
      isActive: true
    });

    user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin'
    });
  });

  describe('recordPostDatedCheque (Requirement 7.1, 7.2)', () => {
    it('should record post-dated cheque with pending status', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const receiptData = {
        customerId: customer._id,
        amount: 10000,
        bankDetails: {
          bankName: 'HBL',
          chequeNumber: 'CHQ123456',
          chequeDate: futureDate
        },
        description: 'Post-dated cheque payment',
        createdBy: user._id
      };

      const receipt = await cashReceiptService.recordPostDatedCheque(receiptData);

      expect(receipt.postDatedCheque).toBe(true);
      expect(receipt.paymentMethod).toBe('cheque');
      expect(receipt.status).toBe('pending');
      expect(receipt.chequeStatus).toBe('pending');
      expect(receipt.bankDetails.bankName).toBe('HBL');
      expect(receipt.bankDetails.chequeNumber).toBe('CHQ123456');
    });

    it('should require customer ID', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const receiptData = {
        amount: 10000,
        bankDetails: {
          bankName: 'HBL',
          chequeNumber: 'CHQ123456',
          chequeDate: futureDate
        },
        createdBy: user._id
      };

      await expect(cashReceiptService.recordPostDatedCheque(receiptData))
        .rejects.toThrow('Customer ID is required');
    });

    it('should require bank name', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const receiptData = {
        customerId: customer._id,
        amount: 10000,
        bankDetails: {
          chequeNumber: 'CHQ123456',
          chequeDate: futureDate
        },
        createdBy: user._id
      };

      await expect(cashReceiptService.recordPostDatedCheque(receiptData))
        .rejects.toThrow('Bank name is required for post-dated cheques');
    });

    it('should require cheque number', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const receiptData = {
        customerId: customer._id,
        amount: 10000,
        bankDetails: {
          bankName: 'HBL',
          chequeDate: futureDate
        },
        createdBy: user._id
      };

      await expect(cashReceiptService.recordPostDatedCheque(receiptData))
        .rejects.toThrow('Cheque number is required for post-dated cheques');
    });

    it('should require cheque date', async () => {
      const receiptData = {
        customerId: customer._id,
        amount: 10000,
        bankDetails: {
          bankName: 'HBL',
          chequeNumber: 'CHQ123456'
        },
        createdBy: user._id
      };

      await expect(cashReceiptService.recordPostDatedCheque(receiptData))
        .rejects.toThrow('Cheque date is required for post-dated cheques');
    });
  });

  describe('clearCheque (Requirement 7.3)', () => {
    it('should clear pending post-dated cheque', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      // Record post-dated cheque
      const receipt = await cashReceiptService.recordPostDatedCheque({
        customerId: customer._id,
        amount: 10000,
        bankDetails: {
          bankName: 'HBL',
          chequeNumber: 'CHQ123456',
          chequeDate: futureDate
        },
        createdBy: user._id
      });

      // Clear the cheque
      const clearedReceipt = await cashReceiptService.clearCheque(receipt._id, user._id);

      expect(clearedReceipt.chequeStatus).toBe('cleared');
      expect(clearedReceipt.status).toBe('cleared');
      expect(clearedReceipt.clearedDate).toBeDefined();
    });

    it('should not clear non-post-dated cheque', async () => {
      // Create regular cheque receipt
      const receipt = await CashReceipt.create({
        customerId: customer._id,
        amount: 10000,
        paymentMethod: 'cheque',
        postDatedCheque: false,
        bankDetails: {
          bankName: 'HBL',
          chequeNumber: 'CHQ789'
        },
        createdBy: user._id
      });

      await expect(cashReceiptService.clearCheque(receipt._id, user._id))
        .rejects.toThrow('This is not a post-dated cheque');
    });

    it('should not clear already cleared cheque', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const receipt = await cashReceiptService.recordPostDatedCheque({
        customerId: customer._id,
        amount: 10000,
        bankDetails: {
          bankName: 'HBL',
          chequeNumber: 'CHQ123456',
          chequeDate: futureDate
        },
        createdBy: user._id
      });

      // Clear once
      await cashReceiptService.clearCheque(receipt._id, user._id);

      // Try to clear again
      await expect(cashReceiptService.clearCheque(receipt._id, user._id))
        .rejects.toThrow('Cannot clear cheque with status: cleared');
    });
  });

  describe('bounceCheque (Requirement 7.4)', () => {
    it('should bounce pending post-dated cheque', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const receipt = await cashReceiptService.recordPostDatedCheque({
        customerId: customer._id,
        amount: 10000,
        bankDetails: {
          bankName: 'HBL',
          chequeNumber: 'CHQ123456',
          chequeDate: futureDate
        },
        createdBy: user._id
      });

      const bouncedReceipt = await cashReceiptService.bounceCheque(
        receipt._id,
        'Insufficient funds',
        user._id
      );

      expect(bouncedReceipt.chequeStatus).toBe('bounced');
      expect(bouncedReceipt.status).toBe('bounced');
      expect(bouncedReceipt.bounceReason).toBe('Insufficient funds');
    });

    it('should bounce cleared cheque and reverse entries', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const receipt = await cashReceiptService.recordPostDatedCheque({
        customerId: customer._id,
        amount: 10000,
        bankDetails: {
          bankName: 'HBL',
          chequeNumber: 'CHQ123456',
          chequeDate: futureDate
        },
        createdBy: user._id
      });

      // Clear the cheque first
      await cashReceiptService.clearCheque(receipt._id, user._id);

      // Then bounce it
      const bouncedReceipt = await cashReceiptService.bounceCheque(
        receipt._id,
        'Account closed',
        user._id
      );

      expect(bouncedReceipt.chequeStatus).toBe('bounced');
      expect(bouncedReceipt.status).toBe('bounced');
      expect(bouncedReceipt.bounceReason).toBe('Account closed');
    });

    it('should not bounce non-post-dated cheque', async () => {
      const receipt = await CashReceipt.create({
        customerId: customer._id,
        amount: 10000,
        paymentMethod: 'cheque',
        postDatedCheque: false,
        bankDetails: {
          bankName: 'HBL',
          chequeNumber: 'CHQ789'
        },
        createdBy: user._id
      });

      await expect(cashReceiptService.bounceCheque(receipt._id, 'Test reason', user._id))
        .rejects.toThrow('This is not a post-dated cheque');
    });

    it('should not bounce already bounced cheque', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const receipt = await cashReceiptService.recordPostDatedCheque({
        customerId: customer._id,
        amount: 10000,
        bankDetails: {
          bankName: 'HBL',
          chequeNumber: 'CHQ123456',
          chequeDate: futureDate
        },
        createdBy: user._id
      });

      // Bounce once
      await cashReceiptService.bounceCheque(receipt._id, 'First bounce', user._id);

      // Try to bounce again
      await expect(cashReceiptService.bounceCheque(receipt._id, 'Second bounce', user._id))
        .rejects.toThrow('Cheque is already marked as bounced');
    });
  });

  describe('getPendingPostDatedCheques (Requirement 7.5)', () => {
    it('should return all pending post-dated cheques', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      // Create pending post-dated cheques
      await cashReceiptService.recordPostDatedCheque({
        customerId: customer._id,
        amount: 10000,
        bankDetails: {
          bankName: 'HBL',
          chequeNumber: 'CHQ001',
          chequeDate: futureDate
        },
        createdBy: user._id
      });

      await cashReceiptService.recordPostDatedCheque({
        customerId: customer._id,
        amount: 15000,
        bankDetails: {
          bankName: 'UBL',
          chequeNumber: 'CHQ002',
          chequeDate: futureDate
        },
        createdBy: user._id
      });

      const pendingCheques = await cashReceiptService.getPendingPostDatedCheques();

      expect(pendingCheques.length).toBe(2);
      expect(pendingCheques.every(c => c.postDatedCheque)).toBe(true);
      expect(pendingCheques.every(c => c.chequeStatus === 'pending')).toBe(true);
    });
  });

  describe('getPostDatedChequesByDueDate (Requirement 7.5)', () => {
    it('should return post-dated cheques within date range', async () => {
      const today = new Date();
      const future30 = new Date(today);
      future30.setDate(future30.getDate() + 30);
      const future60 = new Date(today);
      future60.setDate(future60.getDate() + 60);

      await cashReceiptService.recordPostDatedCheque({
        customerId: customer._id,
        amount: 10000,
        bankDetails: {
          bankName: 'HBL',
          chequeNumber: 'CHQ001',
          chequeDate: future30
        },
        createdBy: user._id
      });

      await cashReceiptService.recordPostDatedCheque({
        customerId: customer._id,
        amount: 15000,
        bankDetails: {
          bankName: 'UBL',
          chequeNumber: 'CHQ002',
          chequeDate: future60
        },
        createdBy: user._id
      });

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 45);

      const cheques = await cashReceiptService.getPostDatedChequesByDueDate(startDate, endDate);

      expect(cheques.length).toBe(1); // Only CHQ001 within 45 days
      expect(cheques[0].bankDetails.chequeNumber).toBe('CHQ001');
    });

    it('should require start and end dates', async () => {
      await expect(cashReceiptService.getPostDatedChequesByDueDate(null, null))
        .rejects.toThrow('Start date and end date are required');
    });
  });
});
