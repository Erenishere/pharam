/**
 * Income Tax Service
 * Phase 2 - Requirement 23: Income Tax Calculation (5.5%)
 * Tasks 67.2, 67.3, 67.4, 67.5
 */

const Invoice = require('../models/Invoice');
const ledgerService = require('./ledgerService');

class IncomeTaxService {
    /**
     * Income tax rate (5.5%)
     */
    static INCOME_TAX_RATE = 5.5;

    /**
     * Calculate income tax on an amount
     * Task 67.2: Create income tax calculation service
     * @param {number} amount - The amount to calculate income tax on
     * @returns {number} Calculated income tax amount
     */
    calculateIncomeTax(amount) {
        if (!amount || amount <= 0) {
            return 0;
        }

        return (amount * IncomeTaxService.INCOME_TAX_RATE) / 100;
    }

    /**
     * Apply income tax to invoice
     * Task 67.3: Update invoice calculation for income tax
     * @param {Object} invoice - Invoice object
     * @param {number} taxableAmount - Amount to calculate income tax on
     * @returns {Object} Updated invoice with income tax
     */
    applyIncomeTaxToInvoice(invoice, taxableAmount) {
        if (!invoice) {
            throw new Error('Invoice is required');
        }

        if (!taxableAmount || taxableAmount <= 0) {
            invoice.incomeTax = 0;
            if (invoice.totals) {
                invoice.totals.incomeTaxTotal = 0;
            }
            return invoice;
        }

        const incomeTaxAmount = this.calculateIncomeTax(taxableAmount);
        invoice.incomeTax = incomeTaxAmount;

        // Update totals
        if (invoice.totals) {
            invoice.totals.incomeTaxTotal = incomeTaxAmount;
        }

        return invoice;
    }

    /**
     * Create ledger entries for income tax
     * Task 67.4: Create income tax ledger entries
     * @param {Object} invoice - Invoice object with income tax
     * @param {string} incomeTaxAccountId - Income tax account ID
     * @param {string} userId - User ID creating the entries
     * @returns {Promise<Object>} Created ledger entries
     */
    async createIncomeTaxLedgerEntries(invoice, incomeTaxAccountId, userId) {
        if (!invoice) {
            throw new Error('Invoice is required');
        }

        if (!userId) {
            throw new Error('User ID is required');
        }

        const incomeTaxAmount = invoice.incomeTax || invoice.totals?.incomeTaxTotal || 0;

        // Only create entries if there is income tax
        if (incomeTaxAmount <= 0) {
            return { entries: [], totalAmount: 0 };
        }

        if (!incomeTaxAccountId) {
            throw new Error('Income tax account ID is required when income tax is applied');
        }

        // Determine the party account (customer or supplier)
        const partyAccountId = invoice.customerId || invoice.supplierId;
        const partyAccountType = invoice.customerId ? 'Customer' : 'Supplier';

        if (!partyAccountId) {
            throw new Error('Invoice must have either a customer or supplier');
        }

        // Create ledger entry for income tax
        // Debit: Income Tax Account (Asset/Receivable increases)
        // Credit: Party Account (Liability decreases for customer, or reduces payable for supplier)
        const entry = await ledgerService.createDoubleEntry(
            {
                accountId: incomeTaxAccountId,
                accountType: 'Account'
            },
            {
                accountId: partyAccountId,
                accountType: partyAccountType
            },
            incomeTaxAmount,
            `Income Tax (${IncomeTaxService.INCOME_TAX_RATE}%) - Invoice ${invoice.invoiceNumber}`,
            'invoice',
            invoice._id,
            userId
        );

        return {
            entries: [entry],
            totalAmount: incomeTaxAmount
        };
    }

    /**
     * Get income tax report
     * Task 67.5: Create income tax report
     * @param {Object} dateRange - { startDate, endDate }
     * @param {Object} filters - Optional filters
     * @returns {Promise<Object>} Income tax report
     */
    async getIncomeTaxReport(dateRange, filters = {}) {
        if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
            throw new Error('Date range with startDate and endDate is required');
        }

        const { startDate, endDate } = dateRange;

        const query = {
            invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
            status: { $ne: 'cancelled' },
            $or: [
                { incomeTax: { $gt: 0 } },
                { 'totals.incomeTaxTotal': { $gt: 0 } }
            ]
        };

        // Add optional filters
        if (filters.customerId) {
            query.customerId = filters.customerId;
        }

        if (filters.supplierId) {
            query.supplierId = filters.supplierId;
        }

        if (filters.type) {
            query.type = filters.type;
        }

        const invoices = await Invoice.find(query)
            .populate('customerId', 'name')
            .populate('supplierId', 'name')
            .sort({ invoiceDate: -1 })
            .select('invoiceNumber invoiceDate type customerId supplierId incomeTax totals.incomeTaxTotal totals.subtotal totals.grandTotal');

        // Calculate totals and group by account
        let totalIncomeTax = 0;
        const accountBreakdown = {};

        invoices.forEach(invoice => {
            const incomeTaxAmount = invoice.incomeTax || invoice.totals?.incomeTaxTotal || 0;
            totalIncomeTax += incomeTaxAmount;

            // Group by account
            const accountId = invoice.customerId?._id || invoice.supplierId?._id;
            const accountName = invoice.customerId?.name || invoice.supplierId?.name;
            const accountType = invoice.customerId ? 'Customer' : 'Supplier';

            if (accountId) {
                const key = accountId.toString();
                if (!accountBreakdown[key]) {
                    accountBreakdown[key] = {
                        accountId,
                        accountName,
                        accountType,
                        totalIncomeTax: 0,
                        invoiceCount: 0,
                        invoices: []
                    };
                }

                accountBreakdown[key].totalIncomeTax += incomeTaxAmount;
                accountBreakdown[key].invoiceCount++;
                accountBreakdown[key].invoices.push({
                    invoiceNumber: invoice.invoiceNumber,
                    invoiceDate: invoice.invoiceDate,
                    type: invoice.type,
                    incomeTax: incomeTaxAmount,
                    subtotal: invoice.totals?.subtotal || 0,
                    grandTotal: invoice.totals?.grandTotal || 0
                });
            }
        });

        return {
            dateRange: {
                startDate: new Date(startDate),
                endDate: new Date(endDate)
            },
            totalIncomeTax,
            invoiceCount: invoices.length,
            incomeTaxRate: IncomeTaxService.INCOME_TAX_RATE,
            accountBreakdown: Object.values(accountBreakdown),
            invoices: invoices.map(inv => ({
                invoiceNumber: inv.invoiceNumber,
                invoiceDate: inv.invoiceDate,
                type: inv.type,
                accountName: inv.customerId?.name || inv.supplierId?.name,
                accountType: inv.customerId ? 'Customer' : 'Supplier',
                incomeTax: inv.incomeTax || inv.totals?.incomeTaxTotal || 0,
                subtotal: inv.totals?.subtotal || 0,
                grandTotal: inv.totals?.grandTotal || 0
            }))
        };
    }

    /**
     * Get income tax summary
     * @param {Object} dateRange - { startDate, endDate }
     * @returns {Promise<Object>} Income tax summary
     */
    async getIncomeTaxSummary(dateRange) {
        const report = await this.getIncomeTaxReport(dateRange);

        return {
            totalIncomeTax: report.totalIncomeTax,
            invoiceCount: report.invoiceCount,
            incomeTaxRate: report.incomeTaxRate,
            averageIncomeTaxPerInvoice: report.invoiceCount > 0
                ? report.totalIncomeTax / report.invoiceCount
                : 0,
            accountCount: report.accountBreakdown.length
        };
    }
}

module.exports = new IncomeTaxService();
