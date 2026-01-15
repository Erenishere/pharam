/**
 * Due Invoice Tracking Service
 * Phase 2 - Requirement 30: Due Invoice Quantity Tracking
 * Task 74.2: Create due invoice update service
 */

const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');

class DueInvoiceTrackingService {
    /**
     * Update due invoice count for a specific customer
     * @param {string} customerId - Customer ID
     * @returns {Promise<Object>} Updated customer with due invoice count
     */
    async updateDueInvoiceCount(customerId) {
        if (!customerId) {
            throw new Error('Customer ID is required');
        }

        try {
            // Find customer
            const customer = await Customer.findById(customerId);
            if (!customer) {
                throw new Error('Customer not found');
            }

            // Count due invoices (overdue and unpaid/partially paid)
            const dueInvoiceCount = await Invoice.countDocuments({
                customerId,
                type: { $in: ['sales', 'return_sales'] },
                status: { $in: ['confirmed', 'paid'] },
                paymentStatus: { $in: ['pending', 'partial'] },
                dueDate: { $lt: new Date() }, // Past due date
            });

            // Update customer record
            customer.dueInvoiceQty = dueInvoiceCount;
            await customer.save();

            return {
                customerId: customer._id,
                customerName: customer.name,
                dueInvoiceQty: customer.dueInvoiceQty,
                updated: true,
            };
        } catch (error) {
            console.error(`Error updating due invoice count for customer ${customerId}:`, error);
            throw error;
        }
    }

    /**
     * Get customers sorted by due invoice count
     * @param {number} limit - Maximum number of customers to return
     * @param {number} minDueInvoices - Minimum due invoices to include (default: 1)
     * @returns {Promise<Array>} Customers sorted by due invoice count (descending)
     */
    async getCustomersByDueInvoices(limit = 50, minDueInvoices = 1) {
        if (limit <= 0) {
            throw new Error('Limit must be greater than 0');
        }
        if (minDueInvoices < 0) {
            throw new Error('Minimum due invoices cannot be negative');
        }

        try {
            const customers = await Customer.find({
                dueInvoiceQty: { $gte: minDueInvoices },
                isActive: true,
            })
                .select('code name contactInfo.phone contactInfo.city dueInvoiceQty financialInfo.creditLimit')
                .sort({ dueInvoiceQty: -1 }) // Sort by due invoice count descending
                .limit(limit)
                .lean();

            return customers;
        } catch (error) {
            console.error('Error getting customers by due invoices:', error);
            throw error;
        }
    }

    /**
     * Filter customers by due invoice count range
     * @param {number} minCount - Minimum due invoice count (inclusive)
     * @param {number} maxCount - Maximum due invoice count (inclusive, optional)
     * @returns {Promise<Array>} Customers within the specified range
     */
    async filterCustomersByDueInvoices(minCount = 0, maxCount = null) {
        if (minCount < 0) {
            throw new Error('Minimum count cannot be negative');
        }
        if (maxCount !== null && maxCount < minCount) {
            throw new Error('Maximum count cannot be less than minimum count');
        }

        try {
            const query = {
                dueInvoiceQty: { $gte: minCount },
                isActive: true,
            };

            // Add maximum count if specified
            if (maxCount !== null) {
                query.dueInvoiceQty.$lte = maxCount;
            }

            const customers = await Customer.find(query)
                .select('code name contactInfo.phone contactInfo.city dueInvoiceQty financialInfo.creditLimit')
                .sort({ dueInvoiceQty: -1 })
                .lean();

            return customers;
        } catch (error) {
            console.error('Error filtering customers by due invoices:', error);
            throw error;
        }
    }

    /**
     * Update due invoice counts for all customers
     * @returns {Promise<Object>} Summary of updates
     */
    async updateAllCustomerDueCounts() {
        try {
            // Get all active customers
            const customers = await Customer.find({ isActive: true }).select('_id');

            let successCount = 0;
            let errorCount = 0;
            const errors = [];

            // Update each customer
            for (const customer of customers) {
                try {
                    await this.updateDueInvoiceCount(customer._id);
                    successCount++;
                } catch (error) {
                    errorCount++;
                    errors.push({
                        customerId: customer._id,
                        error: error.message,
                    });
                }
            }

            return {
                totalCustomers: customers.length,
                successCount,
                errorCount,
                errors: errors.length > 0 ? errors : undefined,
            };
        } catch (error) {
            console.error('Error updating all customer due counts:', error);
            throw error;
        }
    }

    /**
     * Get due invoice details for a customer
     * @param {string} customerId - Customer ID
     * @returns {Promise<Object>} Due invoice details
     */
    async getDueInvoiceDetails(customerId) {
        if (!customerId) {
            throw new Error('Customer ID is required');
        }

        try {
            const customer = await Customer.findById(customerId)
                .select('code name dueInvoiceQty financialInfo.creditLimit');

            if (!customer) {
                throw new Error('Customer not found');
            }

            // Get due invoices
            const dueInvoices = await Invoice.find({
                customerId,
                type: { $in: ['sales', 'return_sales'] },
                status: { $in: ['confirmed', 'paid'] },
                paymentStatus: { $in: ['pending', 'partial'] },
                dueDate: { $lt: new Date() },
            })
                .select('invoiceNumber invoiceDate dueDate totals.grandTotal paymentStatus')
                .sort({ dueDate: 1 }) // Oldest first
                .lean();

            // Calculate total due amount
            const totalDueAmount = dueInvoices.reduce((sum, inv) => sum + inv.totals.grandTotal, 0);

            // Calculate days overdue for each invoice
            const today = new Date();
            const invoicesWithOverdue = dueInvoices.map(inv => ({
                ...inv,
                daysOverdue: Math.floor((today - inv.dueDate) / (1000 * 60 * 60 * 24)),
            }));

            return {
                customer: {
                    id: customer._id,
                    code: customer.code,
                    name: customer.name,
                    creditLimit: customer.financialInfo.creditLimit,
                },
                dueInvoiceQty: customer.dueInvoiceQty,
                totalDueAmount,
                dueInvoices: invoicesWithOverdue,
            };
        } catch (error) {
            console.error(`Error getting due invoice details for customer ${customerId}:`, error);
            throw error;
        }
    }
}

module.exports = new DueInvoiceTrackingService();
