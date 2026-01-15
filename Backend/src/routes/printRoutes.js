const express = require('express');
const router = express.Router();
const printController = require('../controllers/printController');
const { authenticate } = require('../middleware/auth');

/**
 * Print Routes
 * Phase 2 - Requirement 19: Multiple Print Formats and Templates
 * Task 63: Create print API endpoints
 */

// All routes require authentication
router.use(authenticate);

// Get available print formats
// GET /api/print/formats
router.get('/formats', printController.getAvailableFormats);

// Get print data for invoice
// GET /api/print/invoices/:id
router.get('/invoices/:id', printController.getPrintData);

// Generate PDF for invoice
// GET /api/print/invoices/:id/pdf
router.get('/invoices/:id/pdf', printController.generatePDF);

module.exports = router;
