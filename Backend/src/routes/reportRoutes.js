const express = require('express');
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All report routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/reports/sales
 * @desc    Generate sales report
 * @access  Private
 * @query   startDate, endDate, customerId (optional), groupBy (optional), format (optional)
 */
router.get('/sales', reportController.getSalesReport);

/**
 * @route   GET /api/v1/reports/purchase
 * @desc    Generate purchase report
 * @access  Private
 * @query   startDate, endDate, supplierId (optional), groupBy (optional), format (optional)
 */
router.get('/purchase', reportController.getPurchaseReport);

/**
 * @route   GET /api/v1/reports/inventory
 * @desc    Generate inventory report
 * @access  Private
 * @query   category (optional), lowStockOnly (optional), includeInactive (optional), format (optional)
 */
router.get('/inventory', reportController.getInventoryReport);

/**
 * @route   GET /api/v1/reports/financial/profit-loss
 * @desc    Generate profit & loss statement
 * @access  Private
 * @query   startDate, endDate, format (optional)
 */
router.get('/financial/profit-loss', reportController.getProfitLossStatement);

/**
 * @route   GET /api/v1/reports/financial/balance-sheet
 * @desc    Generate balance sheet
 * @access  Private
 * @query   asOfDate, format (optional)
 */
router.get('/financial/balance-sheet', reportController.getBalanceSheet);

/**
 * @route   GET /api/v1/reports/financial/cash-flow
 * @desc    Generate cash flow statement
 * @access  Private
 * @query   startDate, endDate, format (optional)
 */
router.get('/financial/cash-flow', reportController.getCashFlowStatement);

/**
 * @route   GET /api/v1/reports/financial/tax-compliance
 * @desc    Generate tax compliance report
 * @access  Private
 * @query   startDate, endDate, format (optional)
 */
router.get('/financial/tax-compliance', reportController.getTaxComplianceReport);

/**
 * @route   GET /api/v1/reports/financial/summary
 * @desc    Generate financial summary
 * @access  Private
 * @query   startDate, endDate, format (optional)
 */
router.get('/financial/summary', reportController.getFinancialSummary);

/**
 * @route   GET /api/v1/reports/analytics/dashboard
 * @desc    Get dashboard summary
 * @access  Private
 */
router.get('/analytics/dashboard', reportController.getDashboardSummary);

/**
 * @route   GET /api/v1/reports/analytics/sales-trends
 * @desc    Get sales trends
 * @access  Private
 * @query   startDate, endDate, interval (optional: daily, weekly, monthly)
 */
router.get('/analytics/sales-trends', reportController.getSalesTrends);

/**
 * @route   GET /api/v1/reports/analytics/top-customers
 * @desc    Get top customers by revenue
 * @access  Private
 * @query   startDate, endDate, limit (optional, default: 10)
 */
router.get('/analytics/top-customers', reportController.getTopCustomers);

/**
 * @route   GET /api/v1/reports/analytics/top-items
 * @desc    Get top selling items
 * @access  Private
 * @query   startDate, endDate, limit (optional, default: 10)
 */
router.get('/analytics/top-items', reportController.getTopSellingItems);

/**
 * @route   GET /api/v1/reports/analytics/revenue-by-category
 * @desc    Get revenue breakdown by category
 * @access  Private
 * @query   startDate, endDate
 */
router.get('/analytics/revenue-by-category', reportController.getRevenueByCategory);

/**
 * @route   GET /api/v1/reports/analytics/profit-margins
 * @desc    Get profit margin analysis
 * @access  Private
 * @query   startDate, endDate
 */
router.get('/analytics/profit-margins', reportController.getProfitMargins);

/**
 * @route   GET /api/v1/reports/analytics/collection-efficiency
 * @desc    Get payment collection efficiency
 * @access  Private
 * @query   asOfDate (optional, defaults to today)
 */
router.get('/analytics/collection-efficiency', reportController.getPaymentCollectionEfficiency);

/**
 * @route   GET /api/v1/reports/analytics/inventory-turnover
 * @desc    Get inventory turnover metrics
 * @access  Private
 * @query   startDate, endDate
 */
router.get('/analytics/inventory-turnover', reportController.getInventoryTurnover);

/**
 * @route   GET /api/v1/reports/analytics/kpis
 * @desc    Get real-time KPIs
 * @access  Private
 */
router.get('/analytics/kpis', reportController.getRealTimeKPIs);

/**
 * @route   GET /api/v1/reports/purchase-gst-breakdown
 * @desc    Get purchase GST breakdown report (4% and 18%)
 * @access  Private
 * @query   startDate, endDate, supplierId (optional), format (optional)
 */
router.get('/purchase-gst-breakdown', reportController.getPurchaseGSTBreakdown);

/**
 * @route   GET /api/v1/reports/purchase-summary-gst
 * @desc    Get purchase summary with GST breakdown
 * @access  Private
 * @query   startDate, endDate, supplierId (optional), format (optional)
 */
router.get('/purchase-summary-gst', reportController.getPurchaseSummaryWithGST);

/**
 * @route   GET /api/v1/reports/supplier-wise-gst
 * @desc    Get supplier-wise GST report
 * @access  Private
 * @query   startDate, endDate, format (optional)
 */
router.get('/supplier-wise-gst', reportController.getSupplierWiseGSTReport);

/**
 * @route   GET /api/reports/warehouse-stock
 * @desc    Get warehouse stock level report
 * @access  Private
 * @query   warehouseId (required)
 */
router.get('/warehouse-stock', reportController.getWarehouseStockReport);

/**
 * @route   GET /api/reports/warehouse-comparison/:itemId
 * @desc    Get warehouse comparison report for an item
 * @access  Private
 * @param   itemId - Item ID
 */
router.get('/warehouse-comparison/:itemId', reportController.getWarehouseComparisonReport);

/**
 * @route   GET /api/reports/discount-breakdown
 * @desc    Get discount breakdown report with multi-level discount analysis
 * @access  Private
 * @query   startDate (required), endDate (required), invoiceType (optional: sales, purchase, all), 
 *          discountType (optional: discount1, discount2, all), claimAccountId (optional), format (optional)
 */
router.get('/discount-breakdown', reportController.getDiscountBreakdown);

/**
 * @route   GET /api/reports/tax-summary
 * @desc    Get comprehensive tax summary report (Requirement 6.5)
 *          Separates regular GST, advance tax, and non-filer GST
 *          Groups by tax type and rate
 * @access  Private
 * @query   startDate (required), endDate (required), invoiceType (optional: sales, purchase, all),
 *          customerId (optional), supplierId (optional), format (optional)
 */
router.get('/tax-summary', reportController.getTaxSummary);

/**
 * @route   GET /api/reports/scheme-analysis
 * @desc    Get scheme analysis report
 * @access  Private
 * @query   startDate (required), endDate (required), customerId (optional), supplierId (optional),
 *          invoiceType (optional: sales, purchase), format (optional)
 */
router.get('/scheme-analysis', reportController.getSchemeAnalysis);

/**
 * @route   GET /api/reports/scheme-invoices/:schemeId
 * @desc    Get scheme-wise invoice report
 * @access  Private
 * @param   schemeId - Scheme ID
 * @query   startDate (required), endDate (required), invoiceType (optional: sales, purchase), format (optional)
 */
router.get('/scheme-invoices/:schemeId', reportController.getSchemeInvoices);

/**
 * Phase 2: Post-Dated Cheque Reports (Requirement 7.5)
 * @route   GET /api/reports/pending-cheques
 * @desc    Get pending post-dated cheques report
 * @access  Private
 * @query   dueDate (optional - filter by cheques due on or before this date), format (optional)
 */
router.get('/pending-cheques', reportController.getPendingChequesReport);

/**
 * Phase 2: Aging Report (Requirement 8.5)
 * @route   GET /api/reports/aging
 * @desc    Get accounts receivable aging report
 * @access  Private
 * @query   accountId (optional - filter by specific customer), format (optional)
 */
router.get('/aging', reportController.getAgingReport);

/**
 * Phase 2: Salesman Reports (Requirement 9.3, 9.4)
 * @route   GET /api/reports/salesman-sales
 * @desc    Get salesman sales report
 * @access  Private
 * @query   salesmanId (optional), startDate (required), endDate (required), format (optional)
 */
router.get('/salesman-sales', reportController.getSalesmanSalesReport);

/**
 * @route   GET /api/reports/salesman-collections
 * @desc    Get salesman collections report
 * @access  Private
 * @query   salesmanId (optional), startDate (required), endDate (required), format (optional)
 */
router.get('/salesman-collections', reportController.getSalesmanCollectionsReport);

/**
 * @route   GET /api/reports/salesman-performance
 * @desc    Get salesman performance report
 * @access  Private
 * @query   salesmanId (required), startDate (required), endDate (required), format (optional)
 */
router.get('/salesman-performance', reportController.getSalesmanPerformanceReport);

/**
 * Phase 2: Salesman Commission Report (Requirement 9.5 - Task 40.2)
 * @route   GET /api/reports/salesman-commission
 * @desc    Get salesman commission report
 * @access  Private
 * @query   salesmanId (optional - if not provided, calculates for all salesmen),
 *          startDate (required), endDate (required),
 *          commissionBasis (optional: 'sales', 'collections', 'both' - default: 'both'),
 *          salesCommissionRate (optional - override sales commission rate),
 *          collectionsCommissionRate (optional - override collections commission rate),
 *          format (optional)
 */
router.get('/salesman-commission', reportController.getSalesmanCommissionReport);

module.exports = router;
