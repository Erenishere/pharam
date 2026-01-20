const Account = require('../models/Account');

/**
 * Account Service
 * Handles business logic for account management
 */
class AccountService {
    /**
     * Get account by ID
     * @param {string} id - Account ID
     * @returns {Promise<Object>} Account document
     */
    async getAccountById(id) {
        const account = await Account.findById(id);
        if (!account) {
            throw new Error('Account not found');
        }
        return account;
    }

    /**
     * Get account by code
     * @param {string} code - Account code
     * @returns {Promise<Object>} Account document
     */
    async getAccountByCode(code) {
        const account = await Account.findOne({ code: code.toUpperCase() });
        if (!account) {
            throw new Error(`Account with code ${code} not found`);
        }
        return account;
    }

    /**
     * Get or create a system account by code
     * @param {string} code - Account code (e.g., 'SALES_REVENUE')
     * @param {Object} defaultData - Data for creating the account if it doesn't exist
     * @returns {Promise<Object>} Account document
     */
    async getOrCreateSystemAccount(code, defaultData = {}) {
        let account = await Account.findOne({ code: code.toUpperCase() });

        if (!account) {
            account = new Account({
                code: code.toUpperCase(),
                name: defaultData.name || code,
                accountType: defaultData.accountType || 'expense',
                isSystemAccount: true,
                ...defaultData
            });
            await account.save();
        }

        return account;
    }

    /**
     * Get all accounts with optional filtering
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} List of accounts
     */
    async getAllAccounts(filters = {}) {
        return Account.find(filters).sort({ name: 1 });
    }
}

module.exports = new AccountService();
