const smsService = require('../services/smsService');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');

/**
 * Send SMS
 * @route POST /api/sms/send
 */
const sendSMS = async (req, res, next) => {
    try {
        const { phoneNumber, message, templateId, variables, recipientType, recipientId, relatedInvoice } = req.body;

        // Validate required fields
        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required'
            });
        }

        let finalMessage = message;

        // If template is provided, render it
        if (templateId) {
            if (!variables) {
                return res.status(400).json({
                    success: false,
                    message: 'Variables are required when using a template'
                });
            }

            try {
                finalMessage = smsService.renderTemplate(templateId, variables);
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        }

        if (!finalMessage) {
            return res.status(400).json({
                success: false,
                message: 'Message or templateId is required'
            });
        }

        // Send SMS
        const smsLog = await smsService.sendSMS(phoneNumber, finalMessage, {
            sentBy: req.user._id,
            recipientType,
            recipientId,
            relatedInvoice
        });

        res.status(200).json({
            success: true,
            message: 'SMS sent successfully',
            data: smsLog
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get SMS templates
 * @route GET /api/sms/templates
 */
const getSMSTemplates = async (req, res, next) => {
    try {
        const templates = smsService.getSMSTemplates();

        res.status(200).json({
            success: true,
            data: templates
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get SMS history for an account
 * @route GET /api/sms/history/:accountId
 */
const getSMSHistory = async (req, res, next) => {
    try {
        const { accountId } = req.params;
        const { startDate, endDate } = req.query;

        const history = await smsService.getSMSHistory(accountId, {
            startDate,
            endDate
        });

        const stats = await smsService.getSMSStats(accountId);

        res.status(200).json({
            success: true,
            data: {
                history,
                stats
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Send SMS for a specific invoice
 * @route POST /api/invoices/:id/send-sms
 */
const sendInvoiceSMS = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { message, templateId } = req.body;

        // Get invoice
        const invoice = await Invoice.findById(id)
            .populate('customerId', 'name phoneNumber')
            .populate('supplierId', 'name phoneNumber');

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        // Determine recipient based on invoice type
        let recipient;
        let recipientType;
        let recipientId;

        if (invoice.type === 'sale' || invoice.type === 'return_sale') {
            if (!invoice.customerId) {
                return res.status(400).json({
                    success: false,
                    message: 'Invoice has no customer associated'
                });
            }
            recipient = invoice.customerId;
            recipientType = 'customer';
            recipientId = invoice.customerId._id;
        } else if (invoice.type === 'purchase' || invoice.type === 'return_purchase') {
            if (!invoice.supplierId) {
                return res.status(400).json({
                    success: false,
                    message: 'Invoice has no supplier associated'
                });
            }
            recipient = invoice.supplierId;
            recipientType = 'supplier';
            recipientId = invoice.supplierId._id;
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid invoice type'
            });
        }

        // Check if recipient has phone number
        if (!recipient.phoneNumber) {
            return res.status(400).json({
                success: false,
                message: `${recipientType === 'customer' ? 'Customer' : 'Supplier'} has no phone number`
            });
        }

        let finalMessage = message;

        // If template is provided, render it with invoice data
        if (templateId) {
            const variables = {
                customerName: recipient.name,
                invoiceNo: invoice.invoiceNo,
                amount: invoice.totals?.grandTotal || 0,
                dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'
            };

            try {
                finalMessage = smsService.renderTemplate(templateId, variables);
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
        }

        if (!finalMessage) {
            return res.status(400).json({
                success: false,
                message: 'Message or templateId is required'
            });
        }

        // Send SMS
        const smsLog = await smsService.sendSMS(recipient.phoneNumber, finalMessage, {
            sentBy: req.user._id,
            recipientType,
            recipientId,
            relatedInvoice: invoice._id
        });

        res.status(200).json({
            success: true,
            message: 'SMS sent successfully',
            data: smsLog
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    sendSMS,
    getSMSTemplates,
    getSMSHistory,
    sendInvoiceSMS
};
