const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');

/**
 * Estimate Service
 * Phase 2 - Requirement 31: Estimate/Quotation Printing
 * Task 75: Implement estimate printing
 */
class EstimateService {
    /**
     * Convert estimate to invoice (Task 75.3)
     * Changes status from draft to confirmed and generates final invoice number
     * @param {string} estimateId - Estimate ID
     * @returns {Promise<Object>} Converted invoice
     */
    async convertEstimateToInvoice(estimateId) {
        if (!estimateId) {
            throw new Error('Estimate ID is required');
        }

        // Get the estimate
        const estimate = await Invoice.findById(estimateId);

        if (!estimate) {
            throw new Error('Estimate not found');
        }

        // Validate it's a draft estimate
        if (estimate.status !== 'draft') {
            throw new Error('Only draft estimates can be converted to invoices');
        }

        // Check if it's expired
        if (estimate.expiryDate && estimate.expiryDate < new Date()) {
            throw new Error('Cannot convert expired estimate to invoice');
        }

        // Change status to confirmed
        estimate.status = 'confirmed';

        // Remove estimate-specific fields
        estimate.estimatePrint = false;
        estimate.expiryDate = undefined;

        // Change print format from 'estimate' to 'standard' if needed
        if (estimate.printFormat === 'estimate') {
            estimate.printFormat = 'standard';
        }

        // Save the invoice
        await estimate.save();

        // Populate references for return
        await estimate.populate('customerId', 'code name address city phone email');
        await estimate.populate('items.itemId', 'code name unit');

        return estimate;
    }

    /**
     * Get pending estimates (Task 75.4)
     * Returns all draft invoices with estimatePrint = true
     * @param {Object} filters - Filter criteria
     * @param {Object} options - Pagination and sorting options
     * @returns {Promise<Object>} Pending estimates with pagination
     */
    async getPendingEstimates(filters = {}, options = {}) {
        const {
            page = 1,
            limit = 10,
            sort = { invoiceDate: -1 }
        } = options;

        // Build query for pending estimates
        const query = {
            status: 'draft',
            estimatePrint: true,
            ...filters
        };

        // Exclude expired estimates by default unless explicitly requested
        if (!filters.includeExpired) {
            query.$or = [
                { expiryDate: { $exists: false } },
                { expiryDate: null },
                { expiryDate: { $gte: new Date() } }
            ];
        }

        const skip = (page - 1) * limit;

        // Execute query with pagination
        const [estimates, total] = await Promise.all([
            Invoice.find(query)
                .populate('customerId', 'code name address city phone email')
                .populate('items.itemId', 'code name unit')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            Invoice.countDocuments(query)
        ]);

        return {
            estimates,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get expired estimates (Task 75.5)
     * Returns all estimates that have passed their expiry date
     * @param {Object} filters - Filter criteria
     * @param {Object} options - Pagination and sorting options
     * @returns {Promise<Object>} Expired estimates with pagination
     */
    async getExpiredEstimates(filters = {}, options = {}) {
        const {
            page = 1,
            limit = 10,
            sort = { expiryDate: -1 }
        } = options;

        // Build query for expired estimates
        const query = {
            status: 'draft',
            estimatePrint: true,
            expiryDate: { $lt: new Date() },
            ...filters
        };

        const skip = (page - 1) * limit;

        // Execute query with pagination
        const [estimates, total] = await Promise.all([
            Invoice.find(query)
                .populate('customerId', 'code name address city phone email')
                .populate('items.itemId', 'code name unit')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            Invoice.countDocuments(query)
        ]);

        return {
            estimates,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Check if estimate has expired (Task 75.5)
     * @param {string} invoiceId - Invoice ID
     * @returns {Promise<Object>} Expiry status
     */
    async checkEstimateExpiry(invoiceId) {
        if (!invoiceId) {
            throw new Error('Invoice ID is required');
        }

        const invoice = await Invoice.findById(invoiceId);

        if (!invoice) {
            throw new Error('Invoice not found');
        }

        if (!invoice.estimatePrint) {
            throw new Error('Invoice is not an estimate');
        }

        const isExpired = invoice.expiryDate && invoice.expiryDate < new Date() && invoice.status === 'draft';

        return {
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            expiryDate: invoice.expiryDate,
            isExpired,
            daysUntilExpiry: invoice.expiryDate
                ? Math.ceil((invoice.expiryDate - new Date()) / (1000 * 60 * 60 * 24))
                : null
        };
    }

    /**
     * Mark estimate as expired (Task 75.5)
     * This is a utility method to cancel expired estimates
     * @param {string} invoiceId - Invoice ID
     * @returns {Promise<Object>} Updated invoice
     */
    async markEstimateAsExpired(invoiceId) {
        if (!invoiceId) {
            throw new Error('Invoice ID is required');
        }

        const invoice = await Invoice.findById(invoiceId);

        if (!invoice) {
            throw new Error('Invoice not found');
        }

        if (!invoice.estimatePrint) {
            throw new Error('Invoice is not an estimate');
        }

        if (invoice.status !== 'draft') {
            throw new Error('Only draft estimates can be marked as expired');
        }

        if (!invoice.expiryDate || invoice.expiryDate >= new Date()) {
            throw new Error('Estimate has not expired yet');
        }

        // Mark as cancelled with expiry note
        invoice.status = 'cancelled';
        invoice.notes = (invoice.notes || '') + '\n[EXPIRED: Estimate expired on ' + invoice.expiryDate.toLocaleDateString() + ']';

        await invoice.save();

        return invoice;
    }

    /**
     * Set default expiry date for estimate
     * Default is 30 days from invoice date
     * @param {Date} invoiceDate - Invoice date
     * @param {number} days - Days until expiry (default: 30)
     * @returns {Date} Expiry date
     */
    calculateDefaultExpiryDate(invoiceDate, days = 30) {
        const expiryDate = new Date(invoiceDate);
        expiryDate.setDate(expiryDate.getDate() + days);
        return expiryDate;
    }
}

module.exports = new EstimateService();
