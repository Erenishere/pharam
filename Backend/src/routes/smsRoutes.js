const express = require('express');
const router = express.Router();
const { sendSMS, getSMSTemplates, getSMSHistory } = require('../controllers/smsController');
const { protect } = require('../middleware/auth');

/**
 * @route   POST /api/sms/send
 * @desc    Send SMS
 * @access  Private
 * @body    phoneNumber, message (or templateId + variables), recipientType, recipientId, relatedInvoice
 */
router.post('/send', protect, sendSMS);

/**
 * @route   GET /api/sms/templates
 * @desc    Get SMS templates
 * @access  Private
 */
router.get('/templates', protect, getSMSTemplates);

/**
 * @route   GET /api/sms/history/:accountId
 * @desc    Get SMS history for an account
 * @access  Private
 * @param   accountId - Customer or Supplier ID
 * @query   startDate, endDate (optional)
 */
router.get('/history/:accountId', protect, getSMSHistory);

module.exports = router;
