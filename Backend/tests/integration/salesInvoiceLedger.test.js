const mongoose = require('mongoose');
const salesInvoiceService = require('../../src/services/salesInvoiceService');
const Invoice = require('../../src/models/Invoice');
const User = require('../../src/models/User');
const Customer = require('../../src/models/Customer');
const Item = require('../../src/models/Item');
const Account = require('../../src/models/Account');
const LedgerEntry = require('../../src/models/LedgerEntry');

describe('Sales Invoice Ledger Integration (Requirement 20.4)', () => {
    let user, customer, item, adjustmentAccount;

    beforeAll(async () => {
        // Connection handled by setup.js

        user = await User.create({
            username: 'ledgeruser',
            email: 'ledger@example.com',
            password: 'password123',
            role: 'admin'
        });

        customer = await Customer.create({
            code: 'CUST_LEDGER',
            name: 'Ledger Customer',
            type: 'customer',
            address: '123 Ledger St',
            phone: '1234567890',
            financialInfo: { creditLimit: 10000 }
        });

        item = await Item.create({
            code: 'ITEM_LEDGER',
            name: 'Ledger Item',
            category: 'Test',
            unit: 'piece',
            pricing: { salePrice: 100, costPrice: 80 },
            stock: { currentStock: 100 },
            gstRate: 0 // Simplify tax
        });

        adjustmentAccount = await Account.create({
            code: 'ADJ001',
            name: 'Trade Offer Adjustment',
            accountType: 'adjustment',
            isActive: true
        });
    });

    beforeEach(async () => {
        await Invoice.deleteMany({});
        await LedgerEntry.deleteMany({});
    });

    it('should create ledger entries for Trade Offers when invoice is confirmed', async () => {
        // Create invoice with TO
        const invoiceData = {
            customerId: customer._id,
            invoiceDate: new Date(),
            dueDate: new Date(),
            items: [{
                itemId: item._id,
                quantity: 10,
                unitPrice: 100,
                lineTotal: 1000,
                gstRate: 0
            }],
            createdBy: user._id
        };

        const invoice = await salesInvoiceService.createSalesInvoice(invoiceData);

        // Update invoice with TO details and adjustment account
        invoice.to1Percent = 10; // 100
        invoice.adjustmentAccountId = adjustmentAccount._id;
        await invoice.save();

        // Confirm invoice
        await salesInvoiceService.confirmSalesInvoice(invoice._id, user._id);

        // Check ledger entries
        const entries = await LedgerEntry.find({ referenceId: invoice._id });

        // Expect:
        // 1. Sales Entry (Dr Customer, Cr Sales) - Amount: Grand Total (900)
        // 2. TO Entry (Dr Adjustment, Cr Customer) - Amount: TO (100)
        expect(entries.length).toBe(4); // 2 double entries = 4 single entries

        // Check Sales Entry
        const salesDebit = entries.find(e => e.accountId.equals(customer._id) && e.transactionType === 'debit' && e.amount === 900);
        const salesCredit = entries.find(e => e.accountId.equals(customer._id) && e.transactionType === 'credit' && e.amount === 900);
        expect(salesDebit).toBeDefined();
        expect(salesCredit).toBeDefined(); // Placeholder sales account is customer

        // Check TO Entry
        const toDebit = entries.find(e => e.accountId.equals(adjustmentAccount._id) && e.transactionType === 'debit' && e.amount === 100);
        const toCredit = entries.find(e => e.accountId.equals(customer._id) && e.transactionType === 'credit' && e.amount === 100);
        expect(toDebit).toBeDefined();
        expect(toCredit).toBeDefined();
    });

    it('should throw error if adjustment account is missing for TO', async () => {
        const invoiceData = {
            customerId: customer._id,
            invoiceDate: new Date(),
            dueDate: new Date(),
            items: [{
                itemId: item._id,
                quantity: 10,
                unitPrice: 100,
                lineTotal: 1000,
                gstRate: 0
            }],
            createdBy: user._id
        };

        const invoice = await salesInvoiceService.createSalesInvoice(invoiceData);
        invoice.to1Percent = 10; // 100
        // No adjustmentAccountId
        await invoice.save();

        await expect(salesInvoiceService.confirmSalesInvoice(invoice._id, user._id))
            .rejects
            .toThrow('Adjustment account is required when Trade Offers are applied');
    });
});
