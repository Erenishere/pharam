/**
 * Salesman Self-Service Routes
 * Routes for salesmen to access their own data
 */

const express = require('express');
const router = express.Router();
const salesmanSelfServiceController = require('../controllers/salesmanSelfServiceController');
const { authenticate, requireSales } = require('../middleware/auth');

/**
 * @route   GET /api/salesmen/me
 * @desc    Get logged-in salesman's profile
 * @access  Private (sales role)
 */
router.get('/me', authenticate, requireSales, salesmanSelfServiceController.getMyProfile);

/**
 * @route   GET /api/salesmen/my-invoices
 * @desc    Get logged-in salesman's invoices
 * @access  Private (sales role)
 * @query   page, limit, status, startDate, endDate
 */
router.get('/my-invoices', authenticate, requireSales, salesmanSelfServiceController.getMyInvoices);

/**
 * @route   GET /api/salesmen/my-commission
 * @desc    Get logged-in salesman's commission
 * @access  Private (sales role)
 * @query   startDate (required), endDate (required)
 */
router.get('/my-commission', authenticate, requireSales, salesmanSelfServiceController.getMyCommission);

/**
 * @route   GET /api/salesmen/my-performance
 * @desc    Get logged-in salesman's performance stats
 * @access  Private (sales role)
 * @query   startDate, endDate
 */
router.get('/my-performance', authenticate, requireSales, salesmanSelfServiceController.getMyPerformance);

module.exports = router;
