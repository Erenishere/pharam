const twilio = require('twilio');
const SMSLog = require('../models/SMSLog');

class SMSService {
    constructor() {
        this.twilioClient = null;
        this.initializeTwilioClient();
    }

    /**
     * Initialize Twilio client with credentials from environment
     */
    initializeTwilioClient() {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;

        if (!accountSid || !authToken) {
            console.warn('Twilio credentials not configured. SMS functionality will be limited.');
            return;
        }

        try {
            this.twilioClient = twilio(accountSid, authToken);
        } catch (error) {
            console.error('Failed to initialize Twilio client:', error.message);
        }
    }

    /**
     * Validate phone number format (E.164)
     * @param {string} phoneNumber - Phone number to validate
     * @returns {object} - { valid: boolean, errors: array }
     */
    validatePhoneNumber(phoneNumber) {
        const errors = [];

        if (!phoneNumber || typeof phoneNumber !== 'string') {
            errors.push('Phone number must be a string');
            return { valid: false, errors };
        }

        const trimmed = phoneNumber.trim();

        if (trimmed.length === 0) {
            errors.push('Phone number cannot be empty');
        }

        // E.164 format: +[country code][number], max 15 digits
        const e164Regex = /^\+[1-9]\d{1,14}$/;
        if (!e164Regex.test(trimmed)) {
            errors.push('Phone number must be in E.164 format (e.g., +923001234567)');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Send SMS via Twilio
     * @param {string} phoneNumber - Recipient phone number (E.164 format)
     * @param {string} message - Message content
     * @param {object} options - Additional options (sentBy, recipientType, recipientId, relatedInvoice)
     * @returns {Promise<object>} - SMS log entry
     */
    async sendSMS(phoneNumber, message, options = {}) {
        // Validate phone number
        const validation = this.validatePhoneNumber(phoneNumber);
        if (!validation.valid) {
            throw new Error(`Invalid phone number: ${validation.errors.join(', ')}`);
        }

        // Validate message
        if (!message || message.trim().length === 0) {
            throw new Error('Message cannot be empty');
        }

        if (message.length > 500) {
            throw new Error('Message cannot exceed 500 characters');
        }

        // Validate required options
        if (!options.sentBy) {
            throw new Error('sentBy (user ID) is required');
        }

        // Create SMS log entry
        const smsLog = new SMSLog({
            recipientType: options.recipientType || 'other',
            recipientId: options.recipientId,
            phoneNumber: phoneNumber.trim(),
            message: message.trim(),
            status: 'pending',
            sentBy: options.sentBy,
            relatedInvoice: options.relatedInvoice
        });

        try {
            // Check if Twilio is configured
            if (!this.twilioClient) {
                throw new Error('Twilio client not initialized. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.');
            }

            const fromNumber = process.env.TWILIO_PHONE_NUMBER;
            if (!fromNumber) {
                throw new Error('TWILIO_PHONE_NUMBER environment variable not set');
            }

            // Send SMS via Twilio
            const twilioResponse = await this.twilioClient.messages.create({
                body: message.trim(),
                from: fromNumber,
                to: phoneNumber.trim()
            });

            // Update SMS log with success
            smsLog.status = 'sent';
            smsLog.sentDate = new Date();
            smsLog.twilioMessageSid = twilioResponse.sid;
            smsLog.deliveryStatus = twilioResponse.status;

            await smsLog.save();

            return smsLog;
        } catch (error) {
            // Update SMS log with failure
            smsLog.status = 'failed';
            smsLog.errorMessage = error.message;
            await smsLog.save();

            throw error;
        }
    }

    /**
     * Get predefined SMS templates
     * @returns {array} - Array of template objects
     */
    getSMSTemplates() {
        return [
            {
                id: 'invoice_reminder',
                name: 'Invoice Reminder',
                message: 'Dear {{customerName}}, your invoice #{{invoiceNo}} of Rs. {{amount}} is due. Please arrange payment. Thank you!',
                variables: ['customerName', 'invoiceNo', 'amount']
            },
            {
                id: 'payment_received',
                name: 'Payment Received',
                message: 'Dear {{customerName}}, we have received your payment of Rs. {{amount}} for invoice #{{invoiceNo}}. Thank you!',
                variables: ['customerName', 'invoiceNo', 'amount']
            },
            {
                id: 'invoice_created',
                name: 'Invoice Created',
                message: 'Dear {{customerName}}, invoice #{{invoiceNo}} has been created for Rs. {{amount}}. Due date: {{dueDate}}.',
                variables: ['customerName', 'invoiceNo', 'amount', 'dueDate']
            },
            {
                id: 'order_confirmation',
                name: 'Order Confirmation',
                message: 'Dear {{customerName}}, your order #{{invoiceNo}} has been confirmed. Total: Rs. {{amount}}. Thank you for your business!',
                variables: ['customerName', 'invoiceNo', 'amount']
            },
            {
                id: 'custom',
                name: 'Custom Message',
                message: '',
                variables: []
            }
        ];
    }

    /**
     * Render template with variables
     * @param {string} templateId - Template ID
     * @param {object} variables - Object with variable values
     * @returns {string} - Rendered message
     */
    renderTemplate(templateId, variables) {
        const templates = this.getSMSTemplates();
        const template = templates.find(t => t.id === templateId);

        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }

        let message = template.message;

        // Replace variables in template
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            message = message.replace(new RegExp(placeholder, 'g'), value);
        }

        // Check if any variables are still unreplaced
        const unreplacedVars = message.match(/{{(\w+)}}/g);
        if (unreplacedVars) {
            throw new Error(`Missing variables: ${unreplacedVars.join(', ')}`);
        }

        return message;
    }

    /**
     * Get SMS history for an account
     * @param {string} accountId - Customer or Supplier ID
     * @param {object} dateRange - Optional date range { startDate, endDate }
     * @returns {Promise<array>} - Array of SMS log entries
     */
    async getSMSHistory(accountId, dateRange = {}) {
        const query = { recipientId: accountId };

        // Add date range filter if provided
        if (dateRange.startDate || dateRange.endDate) {
            query.createdAt = {};
            if (dateRange.startDate) {
                query.createdAt.$gte = new Date(dateRange.startDate);
            }
            if (dateRange.endDate) {
                query.createdAt.$lte = new Date(dateRange.endDate);
            }
        }

        const smsLogs = await SMSLog.find(query)
            .populate('sentBy', 'username email')
            .populate('relatedInvoice', 'invoiceNo type')
            .sort({ createdAt: -1 })
            .lean();

        return smsLogs;
    }

    /**
     * Get SMS statistics for an account
     * @param {string} accountId - Customer or Supplier ID
     * @returns {Promise<object>} - SMS statistics
     */
    async getSMSStats(accountId) {
        const smsLogs = await SMSLog.find({ recipientId: accountId });

        return {
            total: smsLogs.length,
            sent: smsLogs.filter(log => log.status === 'sent' || log.status === 'delivered').length,
            failed: smsLogs.filter(log => log.status === 'failed').length,
            pending: smsLogs.filter(log => log.status === 'pending').length
        };
    }
}

module.exports = new SMSService();
