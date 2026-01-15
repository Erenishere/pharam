const QuotationHistory = require('../models/QuotationHistory');
const Invoice = require('../models/Invoice');

/**
 * QuotationHistory Service
 * Phase 2 - Requirement 18.1, 18.2
 * Handles business logic for quotation rate history tracking
 */
class QuotationHistoryService {
    /**
     * Record quotation rate from invoice
     * Task 59.2 - Requirement 18.1, 18.2
     * @param {Object} invoice - Invoice object
     * @returns {Promise<Array>} Array of created quotation history records
     */
    async recordQuotationRate(invoice) {
        if (!invoice) {
            throw new Error('Invoice is required');
        }

        if (!invoice.items || invoice.items.length === 0) {
            throw new Error('Invoice must have at least one item');
        }

        // Determine transaction type and party
        const transactionType = invoice.type === 'sales' || invoice.type === 'return_sales'
            ? 'sales'
            : 'purchase';

        const partyId = transactionType === 'sales' ? invoice.customerId : invoice.supplierId;
        const partyModel = transactionType === 'sales' ? 'Customer' : 'Supplier';

        if (!partyId) {
            throw new Error(`${partyModel} ID is required for ${transactionType} invoice`);
        }

        // Create quotation history records for each item
        const historyRecords = [];

        for (const item of invoice.items) {
            if (!item.itemId) {
                continue; // Skip items without itemId
            }

            const historyData = {
                itemId: item.itemId,
                partyId: partyId,
                partyModel: partyModel,
                invoiceId: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                transactionType: transactionType,
                rate: item.unitPrice || 0,
                quantity: item.quantity || 0,
                transactionDate: invoice.invoiceDate,
                discount: item.discount || 0,
                taxRate: item.gstRate || 0,
                finalRate: item.lineTotal / item.quantity || item.unitPrice || 0,
                notes: invoice.notes || ''
            };

            try {
                const history = await QuotationHistory.create(historyData);
                historyRecords.push(history);
            } catch (error) {
                console.error(`Error creating quotation history for item ${item.itemId}:`, error.message);
                // Continue with other items even if one fails
            }
        }

        return historyRecords;
    }

    /**
     * Get quotation history for an item and party
     * Task 59.3 - Requirement 18.2
     * @param {string} itemId - Item ID
     * @param {string} partyId - Party ID (customer or supplier)
     * @param {number} limit - Maximum number of records to return (default: 10)
     * @returns {Promise<Array>} Array of quotation history records
     */
    async getQuotationHistory(itemId, partyId, limit = 10) {
        if (!itemId) {
            throw new Error('Item ID is required');
        }

        if (!partyId) {
            throw new Error('Party ID is required');
        }

        if (limit < 1 || limit > 100) {
            throw new Error('Limit must be between 1 and 100');
        }

        const history = await QuotationHistory.getHistory(itemId, partyId, limit);

        return history.map(record => ({
            id: record._id,
            itemId: record.itemId,
            partyId: record.partyId,
            invoiceNumber: record.invoiceNumber,
            transactionType: record.transactionType,
            rate: record.rate,
            quantity: record.quantity,
            discount: record.discount,
            taxRate: record.taxRate,
            finalRate: record.finalRate,
            transactionDate: record.transactionDate,
            notes: record.notes,
            createdAt: record.createdAt
        }));
    }

    /**
     * Get latest quotation rate for an item and party
     * @param {string} itemId - Item ID
     * @param {string} partyId - Party ID (customer or supplier)
     * @returns {Promise<Object|null>} Latest quotation history record or null
     */
    async getLatestRate(itemId, partyId) {
        if (!itemId) {
            throw new Error('Item ID is required');
        }

        if (!partyId) {
            throw new Error('Party ID is required');
        }

        const latestRecord = await QuotationHistory.getLatestRate(itemId, partyId);

        if (!latestRecord) {
            return null;
        }

        return {
            id: latestRecord._id,
            itemId: latestRecord.itemId,
            partyId: latestRecord.partyId,
            invoiceNumber: latestRecord.invoiceNumber,
            transactionType: latestRecord.transactionType,
            rate: latestRecord.rate,
            quantity: latestRecord.quantity,
            discount: latestRecord.discount,
            taxRate: latestRecord.taxRate,
            finalRate: latestRecord.finalRate,
            transactionDate: latestRecord.transactionDate,
            notes: latestRecord.notes
        };
    }

    /**
     * Get quotation history by transaction type
     * @param {string} itemId - Item ID
     * @param {string} transactionType - Transaction type ('sales' or 'purchase')
     * @param {number} limit - Maximum number of records to return (default: 10)
     * @returns {Promise<Array>} Array of quotation history records
     */
    async getHistoryByType(itemId, transactionType, limit = 10) {
        if (!itemId) {
            throw new Error('Item ID is required');
        }

        if (!transactionType) {
            throw new Error('Transaction type is required');
        }

        if (!['sales', 'purchase'].includes(transactionType)) {
            throw new Error('Transaction type must be either sales or purchase');
        }

        if (limit < 1 || limit > 100) {
            throw new Error('Limit must be between 1 and 100');
        }

        const history = await QuotationHistory.getHistoryByType(itemId, transactionType, limit);

        return history.map(record => ({
            id: record._id,
            itemId: record.itemId,
            partyId: record.partyId,
            invoiceNumber: record.invoiceNumber,
            transactionType: record.transactionType,
            rate: record.rate,
            quantity: record.quantity,
            discount: record.discount,
            taxRate: record.taxRate,
            finalRate: record.finalRate,
            transactionDate: record.transactionDate,
            notes: record.notes,
            createdAt: record.createdAt
        }));
    }

    /**
     * Get all quotation history for an item
     * @param {string} itemId - Item ID
     * @param {Object} options - Query options
     * @param {number} options.limit - Maximum number of records
     * @param {Date} options.startDate - Start date filter
     * @param {Date} options.endDate - End date filter
     * @returns {Promise<Array>} Array of quotation history records
     */
    async getItemHistory(itemId, options = {}) {
        if (!itemId) {
            throw new Error('Item ID is required');
        }

        const { limit = 50, startDate, endDate } = options;

        const query = { itemId };

        if (startDate || endDate) {
            query.transactionDate = {};
            if (startDate) query.transactionDate.$gte = new Date(startDate);
            if (endDate) query.transactionDate.$lte = new Date(endDate);
        }

        const history = await QuotationHistory.find(query)
            .sort({ transactionDate: -1 })
            .limit(limit)
            .populate('itemId', 'code name')
            .populate('partyId', 'code name');

        return history.map(record => ({
            id: record._id,
            itemId: record.itemId,
            partyId: record.partyId,
            partyModel: record.partyModel,
            invoiceNumber: record.invoiceNumber,
            transactionType: record.transactionType,
            rate: record.rate,
            quantity: record.quantity,
            discount: record.discount,
            taxRate: record.taxRate,
            finalRate: record.finalRate,
            transactionDate: record.transactionDate,
            notes: record.notes
        }));
    }

    /**
     * Delete quotation history for an invoice
     * Used when an invoice is cancelled or deleted
     * @param {string} invoiceId - Invoice ID
     * @returns {Promise<Object>} Deletion result
     */
    async deleteByInvoice(invoiceId) {
        if (!invoiceId) {
            throw new Error('Invoice ID is required');
        }

        const result = await QuotationHistory.deleteMany({ invoiceId });

        return {
            deletedCount: result.deletedCount,
            success: result.deletedCount > 0
        };
    }
}

module.exports = new QuotationHistoryService();
