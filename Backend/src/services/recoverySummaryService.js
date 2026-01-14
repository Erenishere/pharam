const RecoverySummary = require('../models/RecoverySummary');
const Salesman = require('../models/Salesman');
const Customer = require('../models/Customer');

/**
 * Recovery Summary Service
 * Phase 2 - Requirement 15: Cash Recovery Summary System
 * Task 52.2: Create RecoverySummary service
 */
class RecoverySummaryService {
    /**
     * Create a new recovery summary
     * @param {Object} data - Recovery summary data
     * @returns {Promise<Object>} Created recovery summary
     */
    async createRecoverySummary(data) {
        const { date, salesmanId, town, accounts, notes, createdBy } = data;

        // Validate required fields
        if (!salesmanId) {
            throw new Error('Salesman ID is required');
        }

        if (!town) {
            throw new Error('Town is required');
        }

        if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
            throw new Error('At least one account is required');
        }

        if (!createdBy) {
            throw new Error('Created by user is required');
        }

        // Validate salesman exists
        const salesman = await Salesman.findById(salesmanId);
        if (!salesman) {
            throw new Error('Salesman not found');
        }

        // Validate all accounts exist
        const accountIds = accounts.map(acc => acc.accountId);
        const customers = await Customer.find({ _id: { $in: accountIds } });

        if (customers.length !== accountIds.length) {
            throw new Error('One or more accounts not found');
        }

        // Create recovery summary
        const recoverySummary = new RecoverySummary({
            date: date || new Date(),
            salesmanId,
            town,
            accounts,
            notes,
            createdBy
        });

        await recoverySummary.save();

        // Populate references
        await recoverySummary.populate('salesmanId', 'code name');
        await recoverySummary.populate('accounts.accountId', 'code name');
        await recoverySummary.populate('createdBy', 'name email');

        return recoverySummary;
    }

    /**
     * Get all recovery summaries with optional filters
     * @param {Object} filters - Query filters
     * @returns {Promise<Array>} List of recovery summaries
     */
    async getRecoverySummaries(filters = {}) {
        const { startDate, endDate, salesmanId, town, page = 1, limit = 50 } = filters;

        const query = { isDeleted: false };

        // Add date filter
        if (startDate || endDate) {
            query.date = {};
            if (startDate) {
                query.date.$gte = new Date(startDate);
            }
            if (endDate) {
                query.date.$lte = new Date(endDate);
            }
        }

        // Add salesman filter
        if (salesmanId) {
            query.salesmanId = salesmanId;
        }

        // Add town filter
        if (town) {
            query.town = new RegExp(town, 'i'); // Case-insensitive search
        }

        const skip = (page - 1) * limit;

        const summaries = await RecoverySummary.find(query)
            .populate('salesmanId', 'code name')
            .populate('accounts.accountId', 'code name')
            .populate('createdBy', 'name email')
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit);

        const total = await RecoverySummary.countDocuments(query);

        return {
            summaries,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get recovery summary by ID
     * @param {string} id - Recovery summary ID
     * @returns {Promise<Object>} Recovery summary
     */
    async getRecoverySummaryById(id) {
        const summary = await RecoverySummary.findOne({ _id: id, isDeleted: false })
            .populate('salesmanId', 'code name phone email')
            .populate('accounts.accountId', 'code name phone address')
            .populate('createdBy', 'name email');

        if (!summary) {
            throw new Error('Recovery summary not found');
        }

        return summary;
    }

    /**
     * Update recovery summary
     * @param {string} id - Recovery summary ID
     * @param {Object} data - Update data
     * @returns {Promise<Object>} Updated recovery summary
     */
    async updateRecoverySummary(id, data) {
        const summary = await RecoverySummary.findOne({ _id: id, isDeleted: false });

        if (!summary) {
            throw new Error('Recovery summary not found');
        }

        // Update allowed fields
        const allowedFields = ['date', 'town', 'accounts', 'notes'];
        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                summary[field] = data[field];
            }
        });

        // Validate accounts if updated
        if (data.accounts) {
            const accountIds = data.accounts.map(acc => acc.accountId);
            const customers = await Customer.find({ _id: { $in: accountIds } });

            if (customers.length !== accountIds.length) {
                throw new Error('One or more accounts not found');
            }
        }

        await summary.save();

        // Populate references
        await summary.populate('salesmanId', 'code name');
        await summary.populate('accounts.accountId', 'code name');
        await summary.populate('createdBy', 'name email');

        return summary;
    }

    /**
     * Delete (soft delete) recovery summary
     * @param {string} id - Recovery summary ID
     * @returns {Promise<Object>} Deleted recovery summary
     */
    async deleteRecoverySummary(id) {
        const summary = await RecoverySummary.findOne({ _id: id, isDeleted: false });

        if (!summary) {
            throw new Error('Recovery summary not found');
        }

        summary.isDeleted = true;
        await summary.save();

        return summary;
    }

    /**
     * Get recovery summary statistics
     * @param {Object} filters - Query filters
     * @returns {Promise<Object>} Recovery statistics
     */
    async getRecoveryStatistics(filters = {}) {
        const { startDate, endDate, salesmanId, town } = filters;

        const query = { isDeleted: false };

        // Add filters
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }
        if (salesmanId) query.salesmanId = salesmanId;
        if (town) query.town = new RegExp(town, 'i');

        const summaries = await RecoverySummary.find(query);

        const stats = {
            totalSummaries: summaries.length,
            totalInvoiceAmount: 0,
            totalBalance: 0,
            totalRecovery: 0,
            averageRecoveryPercentage: 0,
            totalOutstanding: 0
        };

        summaries.forEach(summary => {
            stats.totalInvoiceAmount += summary.totalInvoiceAmount;
            stats.totalBalance += summary.totalBalance;
            stats.totalRecovery += summary.totalRecovery;
        });

        stats.totalOutstanding = stats.totalInvoiceAmount - stats.totalRecovery;
        stats.averageRecoveryPercentage = stats.totalInvoiceAmount > 0
            ? (stats.totalRecovery / stats.totalInvoiceAmount) * 100
            : 0;

        // Round to 2 decimal places
        stats.totalInvoiceAmount = Math.round(stats.totalInvoiceAmount * 100) / 100;
        stats.totalBalance = Math.round(stats.totalBalance * 100) / 100;
        stats.totalRecovery = Math.round(stats.totalRecovery * 100) / 100;
        stats.totalOutstanding = Math.round(stats.totalOutstanding * 100) / 100;
        stats.averageRecoveryPercentage = Math.round(stats.averageRecoveryPercentage * 100) / 100;

        return stats;
    }

    /**
     * Generate recovery summary for printing
     * Phase 2 - Requirement 15.3, 15.6 - Task 54.3
     * @param {string} id - Recovery summary ID
     * @returns {Promise<Object>} Formatted print data
     */
    async generateRecoverySummaryPrint(id) {
        const summary = await this.getRecoverySummaryById(id);

        // Format date
        const printDate = new Date().toLocaleDateString();
        const summaryDate = new Date(summary.date).toLocaleDateString();

        // Calculate totals if not present (though they should be)
        const totalInvoice = summary.totalInvoiceAmount || 0;
        const totalRecovery = summary.totalRecovery || 0;
        const totalBalance = summary.totalBalance || 0;

        // Format accounts for table
        const accountRows = summary.accounts.map(acc => ({
            customerName: acc.accountId.name,
            customerCode: acc.accountId.code,
            town: summary.town, // Assuming all accounts in summary are from same town
            invoiceAmount: acc.invoiceAmount,
            balance: acc.balance,
            recoveryAmount: acc.recoveryAmount,
            remainingBalance: acc.balance - acc.recoveryAmount
        }));

        return {
            companyInfo: {
                name: 'Indus Traders',
                address: '123 Main St, City', // Placeholder
                phone: '555-0123' // Placeholder
            },
            reportInfo: {
                title: 'Cash Recovery Summary',
                generatedAt: printDate,
                generatedBy: summary.createdBy.name
            },
            summaryDetails: {
                id: summary._id,
                date: summaryDate,
                salesman: {
                    name: summary.salesmanId.name,
                    code: summary.salesmanId.code
                },
                town: summary.town,
                notes: summary.notes
            },
            financials: {
                totalInvoiceAmount: totalInvoice,
                totalBalance: totalBalance,
                totalRecovery: totalRecovery,
                netOutstanding: totalBalance - totalRecovery,
                recoveryPercentage: totalInvoice > 0 ? ((totalRecovery / totalInvoice) * 100).toFixed(2) + '%' : '0%'
            },
            accounts: accountRows
        };
    }
}

module.exports = new RecoverySummaryService();
