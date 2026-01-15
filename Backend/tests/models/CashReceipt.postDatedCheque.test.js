const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const CashReceipt = require('../../src/models/CashReceipt');
const Customer = require('../../src/models/Customer');
const User = require('../../src/models/User');

describe('CashReceipt Model - Post-Dated Cheque Management (Requirement 7)', () => {
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

    // Create test data
    customer = await Customer.create({
      name: 'Test Customer',
      type: 'customer'
    });

    user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin'
    });
  });

  describe('Post-Dated Cheque Fields (Requirement 7.1, 7.2)', () => {
    it('should create receipt with post-dated cheque', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const receiptData = {
        receiptDate: new Date(),
        customerId: customer._id,
        amount: 10000,
        paymentMethod: 'cheque',
        postDatedCheque: true,
        bankDetails: {
          bankName: 'HBL',
          chequeNumber: 'CHQ123456',
          chequeDate: futureDate
        },
        description: 'Post-dated cheque payment',
        createdBy: user._id
      };

      const receipt = new CashReceipt(receiptData);
      const savedReceipt = await receipt.save();

      expect(savedReceipt.postDatedCheque).toBe(true);
      expect(savedReceipt.bankDetails.bankName).toBe('HBL');
      expect(savedReceipt.bankDetails.chequeNumber).toBe('CHQ123456');
      expect(savedReceipt.bankDetails.chequeDate).toEqual(futureDate);
      expect(savedReceipt.chequeStatus).toBe('pending');
    });

    it('should require cheque date for post-dated cheques', async () => {
      const receiptData = {
        receiptDate: new Date(),
        customerId: customer._id,
        amount: 10000,
        paymentMethod: 'cheque',
        postDatedCheque: true,
        bankDetails: {
          bankName: 'HBL',
          chequeNumber: 'CHQ123456'
          // Missing chequeDate
        },
        createdBy: user._id
      };

      const receipt = new CashReceipt(receiptData);
      await expect(receipt.save()).rejects.toThrow('Cheque date is required for post-dated cheques');
    });

    it('should require bank name for post-dated cheques', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const receiptData = {
        receiptDate: new Date(),
        customerId: customer._id,
        amount: 10000,
        paymentMethod: 'cheque',
        postDatedCheque: true,
        bankDetails: {
          chequeNumber: 'CHQ123456',
          chequeDate: futureDate
          // Missing bankName
        },
        createdBy: user._id
      };

      const receipt = new CashReceipt(receiptData);
      await expect(receipt.save()).rejects.toThrow('Bank name is required for post-dated cheques');
    });

    it('should reject cheque date in the past', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const receiptData = {
        receiptDate: new Date(),
        customerId: customer._id,
        amount: 10000,
        paymentMethod: 'cheque',
        postDatedCheque: true,
        bankDetails: {
          bankName: 'HBL',
          chequeNumber: 'CHQ123456',
          chequeDate: pastDate
        },
        createdBy: user._id
      };

      const receipt = new CashReceipt(receiptData);
      await expect(receipt.save()).rejects.toThrow('Cheque date cannot be in the past for post-dated cheques');
    });

    it('should allow cheque date as today', async () => {
      const today = new Date();

      const receiptData = {
        receiptDate: new Date(),
        customerId: customer._id,
        amount: 10000,
        paymentMethod: 'cheque',
        postDatedCheque: true,
        bankDetails: {
          bankName: 'HBL',
          chequeNumber: 'CHQ123456',
          chequeDate: today
        },
        createdBy: user._id
      };

      const receipt = new CashReceipt(receiptData);
      const savedReceipt = await receipt.save();

      expect(savedReceipt.postDatedCheque).toBe(true);
      expect(savedReceipt.chequeStatus).toBe('pending');
    });

    it('should set initial cheque status to pending', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const receiptData = {
        receiptDate: new Date(),
        customerId: customer._id,
        amount: 10000,
        paymentMethod: 'cheque',
        postDatedCheque: true,
        bankDetails: {
          bankName: 'HBL',
          chequeNumber: 'CHQ123456',
          chequeDate: futureDate
        },
        createdBy: user._id
      };

      const receipt = new CashReceipt(receiptData);
      const savedReceipt = await receipt.save();

      expect(savedReceipt.chequeStatus).toBe('pending');
    });

    it('should validate cheque status enum values', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const receiptData = {
        receiptDate: new Date(),
        customerId: customer._id,
        amount: 10000,
        paymentMethod: 'cheque',
        postDatedCheque: true,
        bankDetails: {
          bankName: 'HBL',
          chequeNumber: 'CHQ123456',
          chequeDate: futureDate
        },
        chequeStatus: 'invalid_status',
        createdBy: user._id
      };

      const receipt = new CashReceipt(receiptData);
      await expect(receipt.save()).rejects.toThrow();
    });

    it('should accept valid cheque status values', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const validStatuses = ['pending', 'cleared', 'bounced'];

      for (const status of validStatuses) {
        const receiptData = {
          receiptDate: new Date(),
          customerId: customer._id,
          amount: 10000,
          paymentMethod: 'cheque',
          postDatedCheque: true,
          bankDetails: {
            bankName: 'HBL',
            chequeNumber: `CHQ${status}`,
            chequeDate: futureDate
          },
          chequeStatus: status,
          createdBy: user._id
        };

        const receipt = new CashReceipt(receiptData);
        const savedReceipt = await receipt.save();
        expect(savedReceipt.chequeStatus).toBe(status);

        // Clean up for next iteration
        await CashReceipt.findByIdAndDelete(savedReceipt._id);
      }
    });
  });

  describe('Duplicate Cheque Number Validation (Requirement 7.2)', () => {
    it('should reject duplicate cheque number for same bank', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      // Create first receipt
      await CashReceipt.create({
        receiptDate: new Date(),
        customerId: customer._id,
        amount: 10000,
        paymentMethod: 'cheque',
        postDatedCheque: true,
        bankDetails: {
          bankName: 'HBL',
          chequeNumber: 'CHQ123456',
          chequeDate: futureDate
        },
        createdBy: user._id
      });

      // Try to create duplicate
      const duplicateReceipt = new CashReceipt({
        receiptDate: new Date(),
        customerId: customer._id,
        amount: 5000,
        paymentMethod: 'cheque',
        postDatedCheque: true,
        bankDetails: {
          bankName: 'HBL',
          chequeNumber: 'CHQ123456',
          chequeDate: futureDate
        },
        createdBy: user._id
      });

      await expect(duplicateReceipt.save()).rejects.toThrow(/already exists/);
    });

    it('should allow same cheque number for different banks', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      // Create first receipt with HBL
      await CashReceipt.create({
        receiptDate: new Date(),
        customerId: customer._id,
        amount: 10000,
        paymentMethod: 'cheque',
        postDatedCheque: true,
        bankDetails: {
          bankName: 'HBL',
          chequeNumber: 'CHQ123456',
          chequeDate: futureDate
        },
        createdBy: user._id
      });

      // Create second receipt with UBL (same cheque number, different bank)
      const receipt2 = new CashReceipt({
        receiptDate: new Date(),
        customerId: customer._id,
        amount: 5000,
        paymentMethod: 'cheque',
        postDatedCheque: true,
        bankDetails: {
          bankName: 'UBL',
          chequeNumber: 'CHQ123456',
          chequeDate: futureDate
        },
        createdBy: user._id
      });

      const savedReceipt = await receipt2.save();
      expect(savedReceipt.bankDetails.chequeNumber).toBe('CHQ123456');
      expect(savedReceipt.bankDetails.bankName).toBe('UBL');
    });

    it('should allow duplicate cheque number if original is cancelled', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      // Create and cancel first receipt
      const receipt1 = await CashReceipt.create({
        receiptDate: new Date(),
        customerId: customer._id,
        amount: 10000,
        paymentMethod: 'cheque',
        postDatedCheque: true,
        bankDetails: {
          bankName: 'HBL',
          chequeNumber: 'CHQ123456',
          chequeDate: futureDate
        },
        status: 'pending',
        createdBy: user._id
      });

      receipt1.status = 'cancelled';
      await receipt1.save();

      // Create new receipt with same cheque number
      const receipt2 = new CashReceipt({
        receiptDate: new Date(),
        customerId: customer._id,
        amount: 5000,
        paymentMethod: 'cheque',
        postDatedCheque: true,
        bankDetails: {
          bankName: 'HBL',
          chequeNumber: 'CHQ123456',
          chequeDate: futureDate
        },
        createdBy: user._id
      });

      const savedReceipt = await receipt2.save();
      expect(savedReceipt.bankDetails.chequeNumber).toBe('CHQ123456');
    });
  });

  describe('Static Methods for Post-Dated Cheques (Requirement 7.5)', () => {
    beforeEach(async () => {
      const today = new Date();
      const future30 = new Date(today);
      future30.setDate(future30.getDate() + 30);
      const future60 = new Date(today);
      future60.setDate(future60.getDate() + 60);

      // Create test receipts
      await CashReceipt.create([
        {
          receiptDate: today,
          customerId: customer._id,
          amount: 10000,
          paymentMethod: 'cheque',
          postDatedCheque: true,
          bankDetails: {
            bankName: 'HBL',
            chequeNumber: 'CHQ001',
            chequeDate: future30
          },
          chequeStatus: 'pending',
          createdBy: user._id
        },
        {
          receiptDate: today,
          customerId: customer._id,
          amount: 15000,
          paymentMethod: 'cheque',
          postDatedCheque: true,
          bankDetails: {
            bankName: 'UBL',
            chequeNumber: 'CHQ002',
            chequeDate: future60
          },
          chequeStatus: 'pending',
          createdBy: user._id
        },
        {
          receiptDate: today,
          customerId: customer._id,
          amount: 5000,
          paymentMethod: 'cheque',
          postDatedCheque: true,
          bankDetails: {
            bankName: 'MCB',
            chequeNumber: 'CHQ003',
            chequeDate: future30
          },
          chequeStatus: 'cleared',
          createdBy: user._id
        }
      ]);
    });

    it('should find post-dated cheques by due date range', async () => {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 45);

      const cheques = await CashReceipt.findPostDatedChequesByDueDate(startDate, endDate);

      expect(cheques.length).toBe(2); // CHQ001 and CHQ003 within 45 days
    });

    it('should find pending post-dated cheques', async () => {
      const pendingCheques = await CashReceipt.findPendingPostDatedCheques();

      expect(pendingCheques.length).toBe(2); // CHQ001 and CHQ002 are pending
      expect(pendingCheques.every(c => c.chequeStatus === 'pending')).toBe(true);
    });
  });

  describe('Regular Cheque (Non Post-Dated)', () => {
    it('should create regular cheque without post-dated flag', async () => {
      const receiptData = {
        receiptDate: new Date(),
        customerId: customer._id,
        amount: 10000,
        paymentMethod: 'cheque',
        postDatedCheque: false,
        bankDetails: {
          bankName: 'HBL',
          chequeNumber: 'CHQ789',
          chequeDate: new Date()
        },
        createdBy: user._id
      };

      const receipt = new CashReceipt(receiptData);
      const savedReceipt = await receipt.save();

      expect(savedReceipt.postDatedCheque).toBe(false);
      expect(savedReceipt.bankDetails.chequeNumber).toBe('CHQ789');
    });
  });
});
