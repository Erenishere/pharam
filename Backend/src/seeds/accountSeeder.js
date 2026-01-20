const mongoose = require('mongoose');
const Account = require('../models/Account');

const systemAccounts = [
    {
        code: 'SALES_REVENUE',
        name: 'Sales Revenue',
        accountType: 'revenue',
        description: 'General sales revenue account',
        isSystemAccount: true
    },
    {
        code: 'INVENTORY_ASSET',
        name: 'Inventory Asset',
        accountType: 'asset',
        description: 'Inventory/Stock asset account',
        isSystemAccount: true
    },
    {
        code: 'ACCOUNTS_RECEIVABLE',
        name: 'Accounts Receivable',
        accountType: 'asset',
        description: 'Total amount owed by customers',
        isSystemAccount: true
    },
    {
        code: 'ACCOUNTS_PAYABLE',
        name: 'Accounts Payable',
        accountType: 'liability',
        description: 'Total amount owed to suppliers',
        isSystemAccount: true
    },
    {
        code: 'COGS',
        name: 'Cost of Goods Sold',
        accountType: 'expense',
        description: 'Cost of products sold',
        isSystemAccount: true
    },
    {
        code: 'TO_ADJUSTMENT',
        name: 'Trade Offer Adjustment',
        accountType: 'adjustment',
        description: 'Adjustments for trade offers and discounts',
        isSystemAccount: true
    },
    {
        code: 'CASH_IN_HAND',
        name: 'Cash in Hand',
        accountType: 'asset',
        description: 'Physical cash at the counter',
        isSystemAccount: true
    },
    {
        code: 'BANK_ACCOUNT',
        name: 'Main Bank Account',
        accountType: 'asset',
        description: 'Primary bank account for payments',
        isSystemAccount: true
    }
];

module.exports = {
    async seed() {
        try {
            const results = [];
            for (const accountData of systemAccounts) {
                // Find existing or create new to avoid duplicate code errors if seeder re-run
                let account = await Account.findOne({ code: accountData.code });

                if (account) {
                    // Update existing system account
                    Object.assign(account, accountData);
                    await account.save();
                    results.push(account);
                } else {
                    // Create new
                    account = new Account(accountData);
                    await account.save();
                    results.push(account);
                }
            }
            console.log(`  - Seeded ${results.length} system accounts`);
        } catch (error) {
            console.error('Account seeding error:', error);
            throw error;
        }
    },

    async clear() {
        // Only clear non-system accounts or clear all if needed
        // For safety, let's only delete the ones we know about in this seeder if we are just clearing
        const codes = systemAccounts.map(a => a.code);
        await Account.deleteMany({ code: { $in: codes } });
        console.log('  - System accounts cleared');
    }
};
