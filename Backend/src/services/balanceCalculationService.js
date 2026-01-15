/**
 * Balance Calculation Service
 * Phase 2 - Requirement 29: Previous Balance Display on Invoices
 * Task 73.1: Add previous balance calculation
 */

const ledgerService = require('./ledgerService');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');

class BalanceCalculationService {
    /**
     * Calculate previous balance for an account before a specific date
     * @param {string} accountId - Account ID (Customer or Supplier)
     * @param {Date} invoiceDate - Invoice date (balance calculated before this date)
     * @param {string} accountType - Account type ('Customer' or 'Supplier')
     * @returns {Promise<number>} Previous balance
     */
    async calculatePreviousBalance(accountId, invoiceDate, accountType) {
        if (!accountId) {
            throw new Error('Account ID is required');
        }
        if (!invoiceDate) {
            throw new Error('Invoice date is required');
        }
        if (!accountType) {
            throw new Error('Account type is required');
        }

        // Validate account type
        if (accountType !== 'Customer' && accountType !== 'Supplier') {
            throw new Error('Account type must be Customer or Supplier');
        }

        try {
            // Calculate balance as of the day before the invoice date
            const balanceDate = new Date(invoiceDate);
            balanceDate.setDate(balanceDate.getDate() - 1);
            balanceDate.setHours(23, 59, 59, 999);

            // Get balance from ledger service
            const balance = await ledgerService.calculateAccountBalance(accountId, balanceDate);

            // Return absolute value (previous balance should be positive for receivables)
            return Math.abs(balance);
        } catch (error) {
            console.error('Error calculating previous balance:', error);
            return 0; // Return 0 if calculation fails
        }
    }

    /**
     * Calculate current balance for an account
     * @param {string} accountId - Account ID
     * @param {string} accountType - Account type ('Customer' or 'Supplier')
     * @returns {Promise<number>} Current balance
     */
    async calculateCurrentBalance(accountId, accountType) {
        if (!accountId) {
            throw new Error('Account ID is required');
        }
        if (!accountType) {
            throw new Error('Account type is required');
        }

        try {
            const balance = await ledgerService.calculateAccountBalance(accountId, new Date());
            return Math.abs(balance);
        } catch (error) {
            console.error('Error calculating current balance:', error);
            return 0;
        }
    }

    /**
     * Calculate total balance (previous + current invoice amount)
     * @param {number} previousBalance - Previous balance
     * @param {number} currentInvoiceAmount - Current invoice amount
     * @returns {number} Total balance
     */
    calculateTotalBalance(previousBalance = 0, currentInvoiceAmount = 0) {
        if (previousBalance < 0) {
            throw new Error('Previous balance cannot be negative');
        }
        if (currentInvoiceAmount < 0) {
            throw new Error('Current invoice amount cannot be negative');
        }

        return previousBalance + currentInvoiceAmount;
    }

    /**
     * Check if credit limit is exceeded
     * @param {string} accountId - Account ID
     * @param {number} totalBalance - Total balance to check
     * @param {string} accountType - Account type ('Customer' or 'Supplier')
     * @returns {Promise<Object>} Credit limit check result
     */
    async checkCreditLimit(accountId, totalBalance, accountType) {
        if (!accountId) {
            throw new Error('Account ID is required');
        }
        if (totalBalance < 0) {
            throw new Error('Total balance cannot be negative');
        }
        if (!accountType) {
            throw new Error('Account type is required');
        }

        try {
            let account;
            let creditLimit = 0;

            if (accountType === 'Customer') {
                account = await Customer.findById(accountId);
                if (account) {
                    creditLimit = account.financialInfo.creditLimit || 0;
                }
            } else if (accountType === 'Supplier') {
                account = await Supplier.findById(accountId);
                if (account) {
                    creditLimit = account.financialInfo.creditLimit || 0;
                }
            }

            if (!account) {
                return {
                    exceeded: false,
                    creditLimit: 0,
                    totalBalance,
                    availableCredit: 0,
                    warning: null,
                };
            }

            const exceeded = totalBalance > creditLimit;
            const availableCredit = Math.max(0, creditLimit - totalBalance);

            return {
                exceeded,
                creditLimit,
                totalBalance,
                availableCredit,
                warning: exceeded ? this.getCreditLimitWarning(accountId, totalBalance, creditLimit, accountType) : null,
            };
        } catch (error) {
            console.error('Error checking credit limit:', error);
            return {
                exceeded: false,
                creditLimit: 0,
                totalBalance,
                availableCredit: 0,
                warning: null,
            };
        }
    }

    /**
     * Get available credit for an account
     * @param {string} accountId - Account ID
     * @param {number} currentBalance - Current balance
     * @param {string} accountType - Account type ('Customer' or 'Supplier')
     * @returns {Promise<number>} Available credit
     */
    async getAvailableCredit(accountId, currentBalance, accountType) {
        if (!accountId) {
            throw new Error('Account ID is required');
        }
        if (currentBalance < 0) {
            throw new Error('Current balance cannot be negative');
        }
        if (!accountType) {
            throw new Error('Account type is required');
        }

        try {
            let account;
            let creditLimit = 0;

            if (accountType === 'Customer') {
                account = await Customer.findById(accountId);
                if (account) {
                    creditLimit = account.financialInfo.creditLimit || 0;
                }
            } else if (accountType === 'Supplier') {
                account = await Supplier.findById(accountId);
                if (account) {
                    creditLimit = account.financialInfo.creditLimit || 0;
                }
            }

            return Math.max(0, creditLimit - currentBalance);
        } catch (error) {
            console.error('Error getting available credit:', error);
            return 0;
        }
    }

    /**
     * Get credit limit warning message
     * @param {string} accountId - Account ID
     * @param {number} totalBalance - Total balance
     * @param {number} creditLimit - Credit limit
     * @param {string} accountType - Account type
     * @returns {string} Warning message
     */
    getCreditLimitWarning(accountId, totalBalance, creditLimit, accountType) {
        const exceededAmount = totalBalance - creditLimit;
        const accountLabel = accountType === 'Customer' ? 'Customer' : 'Supplier';

        return `WARNING: ${accountLabel} credit limit exceeded by ${exceededAmount.toFixed(2)}. ` +
            `Total balance: ${totalBalance.toFixed(2)}, Credit limit: ${creditLimit.toFixed(2)}`;
    }

    /**
     * Calculate balance summary for an invoice
     * @param {string} accountId - Account ID
     * @param {Date} invoiceDate - Invoice date
     * @param {number} invoiceAmount - Invoice amount
     * @param {string} accountType - Account type
     * @returns {Promise<Object>} Balance summary
     */
    async calculateBalanceSummary(accountId, invoiceDate, invoiceAmount, accountType) {
        if (!accountId || !invoiceDate || !invoiceAmount || !accountType) {
            throw new Error('All parameters are required');
        }

        // Calculate previous balance
        const previousBalance = await this.calculatePreviousBalance(accountId, invoiceDate, accountType);

        // Calculate total balance
        const totalBalance = this.calculateTotalBalance(previousBalance, invoiceAmount);

        // Check credit limit
        const creditCheck = await this.checkCreditLimit(accountId, totalBalance, accountType);

        return {
            previousBalance,
            currentInvoiceAmount: invoiceAmount,
            totalBalance,
            creditLimit: creditCheck.creditLimit,
            availableCredit: creditCheck.availableCredit,
            creditLimitExceeded: creditCheck.exceeded,
            warning: creditCheck.warning,
        };
    }
}

module.exports = new BalanceCalculationService();
