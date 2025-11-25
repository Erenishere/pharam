/**
 * Unit Tests for TO Adjustment Service
 * Phase 2 - Requirement 20: Trade Offer (TO) Management System
 * Task 64.4: Link TOs to adjustment accounts - Unit Tests
 */

const mongoose = require('mongoose');
const toAdjustmentService = require('../../src/services/toAdjustmentService');
const ledgerService = require('../../src/services/ledgerService');
const Account = require('../../src/models/Account');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');

// Mock the services
jest.mock('../../src/services/ledgerService');

describe('TO Adjustment Service', () => {
    let testAccount;
    let testCustomer;
    let testInvoice;
    let testUserId;

    beforeEach(async () => {
        // Create test user ID
        testUserId = new mongoose.Types.ObjectId();

        // Create test adjustment account
        testAccount = await Account.create({
            code: 'ADJ001',
            name: 'Trade Offer Adjustment Account',
            accountType: 'adjustment',
            isActive: true,
            balance: 0,
            createdBy: testUserId
        });

        // Create test customer
        testCustomer = await Customer.create({
            code: 'CUST001',
            name: 'Test Customer',
            email: 'test@customer.com',
            phone: '1234567890',
            isActive: true,
            createdBy: testUserId
        });

        // Create test invoice with TOs
        testInvoice = await Invoice.create({
            invoiceNumber: 'SI2025000001',
            type: 'sales',
            customerId: testCustomer._id,
            adjustmentAccountId: testAccount._id,
            invoiceDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            items: [{
                itemId: new mongoose.Types.ObjectId(),
                quantity: 10,
                unitPrice: 100,
                lineTotal: 1000
            }],
            totals: {
                subtotal: 1000,
                totalDiscount: 0,
                totalTax: 0,
                grandTotal: 950
            },
            to1Percent: 3,
            to1Amount: 30,
            to2Percent: 2,
            to2Amount: 19.4,
            status: 'draft',
            paymentStatus: 'pending',
            createdBy: testUserId
        });

        // Clear mock calls
        jest.clearAllMocks();
    });

    afterEach(async () => {
        await Account.deleteMany({});
        await Customer.deleteMany({});
        await Invoice.deleteMany({});
    });

    describe('validateAdjustmentAccount', () => {
        it('should validate and return active adjustment account', async () => {
            const account = await toAdjustmentService.validateAdjustmentAccount(testAccount._id);

            expect(account).toBeDefined();
            expect(account._id.toString()).toBe(testAccount._id.toString());
            expect(account.isActive).toBe(true);
        });

        it('should throw error if account ID is not provided', async () => {
            await expect(
                toAdjustmentService.validateAdjustmentAccount(null)
            ).rejects.toThrow('Adjustment account ID is required');
        });

        it('should throw error if account does not exist', async () => {
            const fakeId = new mongoose.Types.ObjectId();

            await expect(
                toAdjustmentService.validateAdjustmentAccount(fakeId)
            ).rejects.toThrow('Adjustment account not found');
        });

        it('should throw error if account is not active', async () => {
            testAccount.isActive = false;
            await testAccount.save();

            await expect(
                toAdjustmentService.validateAdjustmentAccount(testAccount._id)
            ).rejects.toThrow('Adjustment account is not active');
        });
    });

    describe('createTOLedgerEntries', () => {
        beforeEach(() => {
            // Mock ledgerService.createDoubleEntry
            ledgerService.createDoubleEntry.mockResolvedValue({
                debit: { accountId: testAccount._id, amount: 30 },
                credit: { accountId: testCustomer._id, amount: 30 }
            });
        });

        it('should create ledger entries for TO1 and TO2', async () => {
            const result = await toAdjustmentService.createTOLedgerEntries(testInvoice, testUserId);

            expect(result.entries).toHaveLength(2);
            expect(result.totalAmount).toBe(49.4);
            expect(result.to1Amount).toBe(30);
            expect(result.to2Amount).toBe(19.4);
            expect(ledgerService.createDoubleEntry).toHaveBeenCalledTimes(2);
        });

        it('should create ledger entry only for TO1 if TO2 is zero', async () => {
            testInvoice.to2Amount = 0;
            testInvoice.to2Percent = 0;

            const result = await toAdjustmentService.createTOLedgerEntries(testInvoice, testUserId);

            expect(result.entries).toHaveLength(1);
            expect(result.totalAmount).toBe(30);
            expect(result.to1Amount).toBe(30);
            expect(result.to2Amount).toBe(0);
            expect(ledgerService.createDoubleEntry).toHaveBeenCalledTimes(1);
        });

        it('should return empty entries if no TO amounts', async () => {
            testInvoice.to1Amount = 0;
            testInvoice.to2Amount = 0;

            const result = await toAdjustmentService.createTOLedgerEntries(testInvoice, testUserId);

            expect(result.entries).toHaveLength(0);
            expect(result.totalAmount).toBe(0);
            expect(ledgerService.createDoubleEntry).not.toHaveBeenCalled();
        });

        it('should throw error if invoice is not provided', async () => {
            await expect(
                toAdjustmentService.createTOLedgerEntries(null, testUserId)
            ).rejects.toThrow('Invoice is required');
        });

        it('should throw error if user ID is not provided', async () => {
            await expect(
                toAdjustmentService.createTOLedgerEntries(testInvoice, null)
            ).rejects.toThrow('User ID is required');
        });

        it('should throw error if adjustment account is not set when TOs are applied', async () => {
            testInvoice.adjustmentAccountId = null;

            await expect(
                toAdjustmentService.createTOLedgerEntries(testInvoice, testUserId)
            ).rejects.toThrow('Adjustment account is required when Trade Offers are applied');
        });

        it('should call createDoubleEntry with correct parameters for TO1', async () => {
            await toAdjustmentService.createTOLedgerEntries(testInvoice, testUserId);

            expect(ledgerService.createDoubleEntry).toHaveBeenCalledWith(
                { accountId: testAccount._id, accountType: 'Account' },
                { accountId: testCustomer._id, accountType: 'Customer' },
                30,
                expect.stringContaining('Trade Offer 1'),
                'invoice',
                testInvoice._id,
                testUserId
            );
        });

        it('should call createDoubleEntry with correct parameters for TO2', async () => {
            await toAdjustmentService.createTOLedgerEntries(testInvoice, testUserId);

            expect(ledgerService.createDoubleEntry).toHaveBeenCalledWith(
                { accountId: testAccount._id, accountType: 'Account' },
                { accountId: testCustomer._id, accountType: 'Customer' },
                19.4,
                expect.stringContaining('Trade Offer 2'),
                'invoice',
                testInvoice._id,
                testUserId
            );
        });
    });

    describe('reverseTOLedgerEntries', () => {
        beforeEach(() => {
            ledgerService.reverseLedgerEntries.mockResolvedValue([
                { id: '1', reversed: true },
                { id: '2', reversed: true }
            ]);
        });

        it('should reverse TO ledger entries', async () => {
            const result = await toAdjustmentService.reverseTOLedgerEntries(
                testInvoice._id,
                'Invoice cancelled',
                testUserId
            );

            expect(result).toHaveLength(2);
            expect(ledgerService.reverseLedgerEntries).toHaveBeenCalledWith(
                'invoice',
                testInvoice._id,
                'Invoice cancelled',
                testUserId
            );
        });

        it('should throw error if invoice ID is not provided', async () => {
            await expect(
                toAdjustmentService.reverseTOLedgerEntries(null, 'Reason', testUserId)
            ).rejects.toThrow('Invoice ID is required');
        });

        it('should throw error if reason is not provided', async () => {
            await expect(
                toAdjustmentService.reverseTOLedgerEntries(testInvoice._id, null, testUserId)
            ).rejects.toThrow('Reason for reversal is required');
        });

        it('should throw error if user ID is not provided', async () => {
            await expect(
                toAdjustmentService.reverseTOLedgerEntries(testInvoice._id, 'Reason', null)
            ).rejects.toThrow('User ID is required');
        });
    });

    describe('linkAdjustmentAccount', () => {
        it('should link adjustment account to invoice', async () => {
            const newInvoice = new Invoice({
                invoiceNumber: 'SI2025000002',
                type: 'sales',
                customerId: testCustomer._id,
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: [{
                    itemId: new mongoose.Types.ObjectId(),
                    quantity: 10,
                    unitPrice: 100,
                    lineTotal: 1000
                }],
                totals: {
                    subtotal: 1000,
                    totalDiscount: 0,
                    totalTax: 0,
                    grandTotal: 1000
                },
                status: 'draft',
                paymentStatus: 'pending',
                createdBy: testUserId
            });

            const result = await toAdjustmentService.linkAdjustmentAccount(
                newInvoice,
                testAccount._id
            );

            expect(result.adjustmentAccountId.toString()).toBe(testAccount._id.toString());
        });

        it('should throw error if invoice is not provided', async () => {
            await expect(
                toAdjustmentService.linkAdjustmentAccount(null, testAccount._id)
            ).rejects.toThrow('Invoice is required');
        });

        it('should throw error if adjustment account does not exist', async () => {
            const fakeId = new mongoose.Types.ObjectId();

            await expect(
                toAdjustmentService.linkAdjustmentAccount(testInvoice, fakeId)
            ).rejects.toThrow('Adjustment account not found');
        });
    });
});
