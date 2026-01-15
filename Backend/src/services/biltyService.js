/**
 * Bilty (Transport) Management Service
 * Phase 2 - Requirement 22: Bilty (Transport) Management System
 * Tasks 66.2, 66.3, 66.4, 66.5
 */

const Invoice = require('../models/Invoice');

class BiltyService {
    /**
     * Record bilty information for an invoice
     * Task 66.2: Create bilty tracking service
     * @param {string} invoiceId - Invoice ID
     * @param {Object} biltyData - Bilty information
     * @returns {Promise<Object>} Updated invoice
     */
    async recordBilty(invoiceId, biltyData) {
        if (!invoiceId) {
            throw new Error('Invoice ID is required');
        }

        if (!biltyData) {
            throw new Error('Bilty data is required');
        }

        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) {
            throw new Error('Invoice not found');
        }

        // Only allow bilty for purchase invoices
        if (invoice.type !== 'purchase' && invoice.type !== 'return_purchase') {
            throw new Error('Bilty can only be recorded for purchase invoices');
        }

        // Update bilty fields
        if (biltyData.biltyNo) {
            invoice.biltyNo = biltyData.biltyNo;
        }

        if (biltyData.biltyDate) {
            invoice.biltyDate = new Date(biltyData.biltyDate);
        }

        if (biltyData.transportCompany) {
            invoice.transportCompany = biltyData.transportCompany;
        }

        if (biltyData.transportCharges !== undefined) {
            if (biltyData.transportCharges < 0) {
                throw new Error('Transport charges cannot be negative');
            }
            invoice.transportCharges = biltyData.transportCharges;
        }

        // Set initial status if bilty number is provided
        if (biltyData.biltyNo && !invoice.biltyStatus) {
            invoice.biltyStatus = 'pending';
        }

        await invoice.save();

        return invoice;
    }

    /**
     * Update bilty status
     * Task 66.3: Create bilty status tracking
     * @param {string} invoiceId - Invoice ID
     * @param {string} status - New status (pending, in_transit, received)
     * @returns {Promise<Object>} Updated invoice
     */
    async updateBiltyStatus(invoiceId, status) {
        if (!invoiceId) {
            throw new Error('Invoice ID is required');
        }

        if (!status) {
            throw new Error('Status is required');
        }

        const validStatuses = ['pending', 'in_transit', 'received'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }

        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) {
            throw new Error('Invoice not found');
        }

        // Verify invoice has bilty information
        if (!invoice.biltyNo) {
            throw new Error('Invoice does not have bilty information');
        }

        invoice.biltyStatus = status;

        await invoice.save();

        return invoice;
    }

    /**
     * Link bilty to goods receipt
     * Task 66.4: Link bilty to goods receipt
     * @param {string} invoiceId - Invoice ID
     * @returns {Promise<Object>} Updated invoice
     */
    async markBiltyAsReceived(invoiceId) {
        if (!invoiceId) {
            throw new Error('Invoice ID is required');
        }

        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) {
            throw new Error('Invoice not found');
        }

        // Verify invoice has bilty information
        if (!invoice.biltyNo) {
            throw new Error('Invoice does not have bilty information');
        }

        // Update status to received
        invoice.biltyStatus = 'received';

        // Optionally update invoice status if needed
        if (invoice.status === 'draft') {
            invoice.status = 'confirmed';
        }

        await invoice.save();

        return invoice;
    }

    /**
     * Get pending bilties report
     * Task 66.5: Create pending bilties report
     * @param {Object} filters - Optional filters
     * @returns {Promise<Array>} List of invoices with pending bilties
     */
    async getPendingBilties(filters = {}) {
        const query = {
            biltyNo: { $exists: true, $ne: null, $ne: '' },
            biltyStatus: { $in: ['pending', 'in_transit'] },
            status: { $ne: 'cancelled' },
            type: { $in: ['purchase', 'return_purchase'] }
        };

        // Add optional filters
        if (filters.supplierId) {
            query.supplierId = filters.supplierId;
        }

        if (filters.transportCompany) {
            query.transportCompany = new RegExp(filters.transportCompany, 'i');
        }

        if (filters.startDate || filters.endDate) {
            query.biltyDate = {};
            if (filters.startDate) {
                query.biltyDate.$gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                query.biltyDate.$lte = new Date(filters.endDate);
            }
        }

        const bilties = await Invoice.find(query)
            .populate('supplierId', 'name contactPerson phone')
            .sort({ biltyDate: -1 })
            .select('invoiceNumber biltyNo biltyDate transportCompany transportCharges biltyStatus supplierId invoiceDate totals.grandTotal');

        return bilties;
    }

    /**
     * Get all bilties with optional filters
     * @param {Object} filters - Optional filters
     * @returns {Promise<Array>} List of invoices with bilty information
     */
    async getAllBilties(filters = {}) {
        const query = {
            biltyNo: { $exists: true, $ne: null, $ne: '' },
            status: { $ne: 'cancelled' },
            type: { $in: ['purchase', 'return_purchase'] }
        };

        // Add optional filters
        if (filters.status) {
            query.biltyStatus = filters.status;
        }

        if (filters.supplierId) {
            query.supplierId = filters.supplierId;
        }

        if (filters.transportCompany) {
            query.transportCompany = new RegExp(filters.transportCompany, 'i');
        }

        if (filters.startDate || filters.endDate) {
            query.biltyDate = {};
            if (filters.startDate) {
                query.biltyDate.$gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                query.biltyDate.$lte = new Date(filters.endDate);
            }
        }

        const bilties = await Invoice.find(query)
            .populate('supplierId', 'name contactPerson phone')
            .sort({ biltyDate: -1 })
            .select('invoiceNumber biltyNo biltyDate transportCompany transportCharges biltyStatus supplierId invoiceDate totals.grandTotal');

        return bilties;
    }

    /**
     * Get bilty details for a specific invoice
     * @param {string} invoiceId - Invoice ID
     * @returns {Promise<Object>} Bilty information
     */
    async getBiltyDetails(invoiceId) {
        if (!invoiceId) {
            throw new Error('Invoice ID is required');
        }

        const invoice = await Invoice.findById(invoiceId)
            .populate('supplierId', 'name contactPerson phone address')
            .select('invoiceNumber biltyNo biltyDate transportCompany transportCharges biltyStatus supplierId invoiceDate totals items');

        if (!invoice) {
            throw new Error('Invoice not found');
        }

        if (!invoice.biltyNo) {
            throw new Error('Invoice does not have bilty information');
        }

        return {
            invoiceNumber: invoice.invoiceNumber,
            invoiceDate: invoice.invoiceDate,
            biltyNo: invoice.biltyNo,
            biltyDate: invoice.biltyDate,
            transportCompany: invoice.transportCompany,
            transportCharges: invoice.transportCharges,
            biltyStatus: invoice.biltyStatus,
            supplier: invoice.supplierId,
            grandTotal: invoice.totals.grandTotal,
            itemCount: invoice.items.length
        };
    }
}

module.exports = new BiltyService();
