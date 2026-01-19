const reportService = require('../services/reportService');
const financialReportService = require('../services/financialReportService');
const analyticsService = require('../services/analyticsService');
const exportService = require('../services/exportService');
const inventoryService = require('../services/inventoryService');

/**
 * Report Controller
 * Handles HTTP requests for report generation and export
 */
class ReportController {
  /**
   * Generate sales report
   */
  async getSalesReport(req, res, next) {
    try {
      const { startDate, endDate, customerId, groupBy, format } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const report = await reportService.generateSalesReport({
        startDate,
        endDate,
        customerId,
        groupBy,
      });

      // If format is specified, export the report
      if (format && ['csv', 'excel', 'pdf'].includes(format.toLowerCase())) {
        return await this._exportReport(res, report, format);
      }

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate purchase report
   */
  async getPurchaseReport(req, res, next) {
    try {
      const { startDate, endDate, supplierId, groupBy, format } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const report = await reportService.generatePurchaseReport({
        startDate,
        endDate,
        supplierId,
        groupBy,
      });

      // If format is specified, export the report
      if (format && ['csv', 'excel', 'pdf'].includes(format.toLowerCase())) {
        return await this._exportReport(res, report, format);
      }

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate inventory report
   */
  async getInventoryReport(req, res, next) {
    try {
      const { category, lowStockOnly, includeInactive, format } = req.query;

      const report = await reportService.generateInventoryReport({
        category,
        lowStockOnly: lowStockOnly === 'true',
        includeInactive: includeInactive === 'true',
      });

      // If format is specified, export the report
      if (format && ['csv', 'excel', 'pdf'].includes(format.toLowerCase())) {
        return await this._exportReport(res, report, format);
      }

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate profit & loss statement
   */
  async getProfitLossStatement(req, res, next) {
    try {
      const { startDate, endDate, format } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const report = await financialReportService.generateProfitLossStatement(
        new Date(startDate),
        new Date(endDate)
      );

      // If format is specified, export the report
      if (format && ['csv', 'excel', 'pdf'].includes(format.toLowerCase())) {
        return await this._exportReport(res, report, format);
      }

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate balance sheet
   */
  async getBalanceSheet(req, res, next) {
    try {
      const { asOfDate, format } = req.query;

      if (!asOfDate) {
        return res.status(400).json({
          success: false,
          message: 'As of date is required',
        });
      }

      const report = await financialReportService.generateBalanceSheet(new Date(asOfDate));

      // If format is specified, export the report
      if (format && ['csv', 'excel', 'pdf'].includes(format.toLowerCase())) {
        return await this._exportReport(res, report, format);
      }

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate cash flow statement
   */
  async getCashFlowStatement(req, res, next) {
    try {
      const { startDate, endDate, format } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const report = await financialReportService.generateCashFlowStatement(
        new Date(startDate),
        new Date(endDate)
      );

      // If format is specified, export the report
      if (format && ['csv', 'excel', 'pdf'].includes(format.toLowerCase())) {
        return await this._exportReport(res, report, format);
      }

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate tax compliance report
   */
  async getTaxComplianceReport(req, res, next) {
    try {
      const { startDate, endDate, format } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const report = await financialReportService.generateTaxComplianceReport(
        new Date(startDate),
        new Date(endDate)
      );

      // If format is specified, export the report
      if (format && ['csv', 'excel', 'pdf'].includes(format.toLowerCase())) {
        return await this._exportReport(res, report, format);
      }

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate financial summary
   */
  async getFinancialSummary(req, res, next) {
    try {
      const { startDate, endDate, format } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const report = await financialReportService.generateFinancialSummary(
        new Date(startDate),
        new Date(endDate)
      );

      // If format is specified, export the report
      if (format && ['csv', 'excel', 'pdf'].includes(format.toLowerCase())) {
        return await this._exportReport(res, report, format);
      }

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get dashboard summary
   */
  async getDashboardSummary(req, res, next) {
    try {
      const dashboard = await analyticsService.getDashboardSummary();

      res.status(200).json({
        success: true,
        data: dashboard,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get sales trends
   */
  async getSalesTrends(req, res, next) {
    try {
      const { startDate, endDate, interval = 'daily' } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const trends = await analyticsService.getSalesTrends(
        new Date(startDate),
        new Date(endDate),
        interval
      );

      res.status(200).json({
        success: true,
        data: trends,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get top customers
   */
  async getTopCustomers(req, res, next) {
    try {
      const { startDate, endDate, limit = 10 } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const topCustomers = await analyticsService.getTopCustomers(
        new Date(startDate),
        new Date(endDate),
        parseInt(limit, 10)
      );

      res.status(200).json({
        success: true,
        data: topCustomers,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get top selling items
   */
  async getTopSellingItems(req, res, next) {
    try {
      const { startDate, endDate, limit = 10 } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const topItems = await analyticsService.getTopSellingItems(
        new Date(startDate),
        new Date(endDate),
        parseInt(limit, 10)
      );

      res.status(200).json({
        success: true,
        data: topItems,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get revenue by category
   */
  async getRevenueByCategory(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const categoryRevenue = await analyticsService.getRevenueByCategory(
        new Date(startDate),
        new Date(endDate)
      );

      res.status(200).json({
        success: true,
        data: categoryRevenue,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get profit margins
   */
  async getProfitMargins(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const margins = await analyticsService.getProfitMargins(
        new Date(startDate),
        new Date(endDate)
      );

      res.status(200).json({
        success: true,
        data: margins,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payment collection efficiency
   */
  async getPaymentCollectionEfficiency(req, res, next) {
    try {
      const { asOfDate } = req.query;
      const date = asOfDate ? new Date(asOfDate) : new Date();

      const efficiency = await analyticsService.getPaymentCollectionEfficiency(date);

      res.status(200).json({
        success: true,
        data: efficiency,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get inventory turnover
   */
  async getInventoryTurnover(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const turnover = await analyticsService.getInventoryTurnover(
        new Date(startDate),
        new Date(endDate)
      );

      res.status(200).json({
        success: true,
        data: turnover,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get real-time KPIs
   */
  async getRealTimeKPIs(req, res, next) {
    try {
      const kpis = await analyticsService.getRealTimeKPIs();

      res.status(200).json({
        success: true,
        data: kpis,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Phase 2: Get dimension report (Task 68.2 - Requirement 24.2)
   * @route GET /api/reports/dimension/:dimension
   */
  async getDimensionReport(req, res, next) {
    try {
      const { dimension } = req.params;
      const { startDate, endDate, format } = req.query;

      if (!dimension) {
        return res.status(400).json({
          success: false,
          message: 'Dimension is required',
        });
      }

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const report = await reportService.getDimensionReport(dimension, {
        startDate,
        endDate,
      });

      // If format is specified, export the report
      if (format && ['csv', 'excel', 'pdf'].includes(format.toLowerCase())) {
        return await this._exportReport(res, report, format);
      }

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Phase 2: Get dimension expense analysis (Task 68.3 - Requirement 24.3)
   * @route GET /api/reports/dimension-expenses
   */
  async getDimensionExpenses(req, res, next) {
    try {
      const { startDate, endDate, format } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const report = await reportService.getDimensionExpenses({
        startDate,
        endDate,
      });

      // If format is specified, export the report
      if (format && ['csv', 'excel', 'pdf'].includes(format.toLowerCase())) {
        return await this._exportReport(res, report, format);
      }

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Phase 2: Get dimension budget comparison (Task 68.4 - Requirement 24.4)
   * @route GET /api/reports/dimension-budget/:dimension
   */
  async getDimensionBudgetComparison(req, res, next) {
    try {
      const { dimension } = req.params;
      const { startDate, endDate, format } = req.query;

      if (!dimension) {
        return res.status(400).json({
          success: false,
          message: 'Dimension is required',
        });
      }

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const report = await reportService.compareDimensionBudget(dimension, {
        startDate,
        endDate,
      });

      // If format is specified, export the report
      if (format && ['csv', 'excel', 'pdf'].includes(format.toLowerCase())) {
        return await this._exportReport(res, report, format);
      }

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export report helper
   * @private
   */
  async _exportReport(res, report, format) {
    try {
      const exportData = await exportService.formatReportForExport(report, format);

      // Set appropriate headers based on format
      const contentTypes = {
        csv: 'text/csv',
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        pdf: 'application/pdf',
      };

      const extensions = {
        csv: 'csv',
        excel: 'xlsx',
        pdf: 'pdf',
      };

      const filename = `${report.reportType}_${Date.now()}.${extensions[format.toLowerCase()]}`;

      res.setHeader('Content-Type', contentTypes[format.toLowerCase()]);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      if (format.toLowerCase() === 'csv') {
        res.send(exportData);
      } else {
        res.send(exportData);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get purchase GST breakdown report
   * @route GET /api/reports/purchase-gst-breakdown
   */
  async getPurchaseGSTBreakdown(req, res, next) {
    try {
      const { startDate, endDate, supplierId, format } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const report = await reportService.getPurchaseGSTBreakdown({
        startDate,
        endDate,
        supplierId,
      });

      // If format is specified, export the report
      if (format && ['csv', 'excel', 'pdf'].includes(format.toLowerCase())) {
        return await this._exportReport(res, report, format);
      }

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get purchase summary with GST breakdown
   * @route GET /api/reports/purchase-summary-gst
   */
  async getPurchaseSummaryWithGST(req, res, next) {
    try {
      const { startDate, endDate, supplierId, format } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const report = await reportService.getPurchaseSummaryWithGST({
        startDate,
        endDate,
        supplierId,
      });

      // If format is specified, export the report
      if (format && ['csv', 'excel', 'pdf'].includes(format.toLowerCase())) {
        return await this._exportReport(res, report, format);
      }

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get supplier-wise GST report
   * @route GET /api/reports/supplier-wise-gst
   */
  async getSupplierWiseGSTReport(req, res, next) {
    try {
      const { startDate, endDate, format } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const report = await reportService.getSupplierWiseGSTReport({
        startDate,
        endDate,
      });

      // If format is specified, export the report
      if (format && ['csv', 'excel', 'pdf'].includes(format.toLowerCase())) {
        return await this._exportReport(res, report, format);
      }

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get warehouse stock level report
   * @route GET /api/reports/warehouse-stock
   */
  async getWarehouseStockReport(req, res, next) {
    try {
      const { warehouseId } = req.query;

      const report = await inventoryService.getWarehouseStockLevels(warehouseId || null);

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get warehouse comparison report for an item
   * @route GET /api/reports/warehouse-comparison/:itemId
   */
  async getWarehouseComparisonReport(req, res, next) {
    try {
      const { itemId } = req.params;

      if (!itemId) {
        return res.status(400).json({
          success: false,
          message: 'Item ID is required',
        });
      }

      const report = await inventoryService.compareWarehouseStock(itemId);

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get discount breakdown report
   * @route GET /api/reports/discount-breakdown
   */
  async getDiscountBreakdown(req, res, next) {
    try {
      const { startDate, endDate, invoiceType, discountType, claimAccountId, format } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const report = await reportService.getDiscountBreakdown({
        startDate,
        endDate,
        invoiceType: invoiceType || 'all',
        discountType: discountType || 'all',
        claimAccountId,
      });

      // If format is specified, export the report
      if (format && ['csv', 'excel', 'pdf'].includes(format.toLowerCase())) {
        return await this._exportReport(res, report, format);
      }

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get comprehensive tax summary report (Requirement 6.5)
   * Separates regular GST, advance tax, and non-filer GST
   * Groups by tax type and rate
   * @route GET /api/reports/tax-summary
   */
  async getTaxSummary(req, res, next) {
    try {
      const { startDate, endDate, invoiceType, customerId, supplierId, format } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const report = await reportService.getTaxReport({
        startDate,
        endDate,
        invoiceType: invoiceType || 'all',
        customerId,
        supplierId,
      });

      // If format is specified, export the report
      if (format && ['csv', 'excel', 'pdf'].includes(format.toLowerCase())) {
        return await this._exportReport(res, report, format);
      }

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get scheme analysis report
   * @route GET /api/reports/scheme-analysis
   */
  async getSchemeAnalysis(req, res, next) {
    try {
      const { startDate, endDate, customerId, supplierId, invoiceType, format } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const report = await reportService.getSchemeAnalysis({
        startDate,
        endDate,
        customerId,
        supplierId,
        invoiceType: invoiceType || 'sales',
      });

      // If format is specified, export the report
      if (format && ['csv', 'excel', 'pdf'].includes(format.toLowerCase())) {
        return await this._exportReport(res, report, format);
      }

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get scheme-wise invoice report
   * @route GET /api/reports/scheme-invoices/:schemeId
   */
  async getSchemeInvoices(req, res, next) {
    try {
      const { schemeId } = req.params;
      const { startDate, endDate, invoiceType, format } = req.query;

      if (!schemeId) {
        return res.status(400).json({
          success: false,
          message: 'Scheme ID is required',
        });
      }

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const report = await reportService.getSchemeInvoices({
        schemeId,
        startDate,
        endDate,
        invoiceType: invoiceType || 'sales',
      });

      // If format is specified, export the report
      if (format && ['csv', 'excel', 'pdf'].includes(format.toLowerCase())) {
        return await this._exportReport(res, report, format);
      }

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Phase 2: Get pending post-dated cheques report (Requirement 7.5)
   * @route GET /api/reports/pending-cheques
   */
  async getPendingChequesReport(req, res, next) {
    try {
      const { dueDate, format } = req.query;

      const report = await reportService.getPendingCheques(
        dueDate ? new Date(dueDate) : null
      );

      // If format is specified, export the report
      if (format && ['csv', 'excel', 'pdf'].includes(format.toLowerCase())) {
        return await this._exportReport(res, report, format);
      }

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Phase 2: Get aging report (Requirement 8.5)
   * @route GET /api/reports/aging
   */
  async getAgingReport(req, res, next) {
    try {
      const { accountId, format } = req.query;

      const report = await reportService.getAgingReport(accountId || null);

      // If format is specified, export the report
      if (format && ['csv', 'excel', 'pdf'].includes(format.toLowerCase())) {
        return await this._exportReport(res, report, format);
      }

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Phase 2: Get salesman sales report (Requirement 9.3)
   * @route GET /api/reports/salesman-sales
   */
  async getSalesmanSalesReport(req, res, next) {
    try {
      const { salesmanId, startDate, endDate, format } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const report = await reportService.getSalesmanSales(salesmanId, startDate, endDate);

      if (format && ['csv', 'excel', 'pdf'].includes(format.toLowerCase())) {
        return await this._exportReport(res, report, format);
      }

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Phase 2: Get salesman collections report (Requirement 9.3)
   * @route GET /api/reports/salesman-collections
   */
  async getSalesmanCollectionsReport(req, res, next) {
    try {
      const { salesmanId, startDate, endDate, format } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const report = await reportService.getSalesmanCollections(salesmanId, startDate, endDate);

      if (format && ['csv', 'excel', 'pdf'].includes(format.toLowerCase())) {
        return await this._exportReport(res, report, format);
      }

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Phase 2: Get salesman performance report (Requirement 9.4)
   * @route GET /api/reports/salesman-performance
   */
  async getSalesmanPerformanceReport(req, res, next) {
    try {
      const { salesmanId, startDate, endDate, format } = req.query;

      if (!salesmanId) {
        return res.status(400).json({
          success: false,
          message: 'Salesman ID is required',
        });
      }

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const report = await reportService.getSalesmanPerformance(salesmanId, startDate, endDate);

      if (format && ['csv', 'excel', 'pdf'].includes(format.toLowerCase())) {
        return await this._exportReport(res, report, format);
      }

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Phase 2: Get salesman commission report (Requirement 9.5 - Task 40.2)
   * @route GET /api/reports/salesman-commission
   */
  async getSalesmanCommissionReport(req, res, next) {
    try {
      const { salesmanId, startDate, endDate, commissionBasis, salesCommissionRate, collectionsCommissionRate, format } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      // Build options object
      const options = {};
      if (commissionBasis) {
        if (!['sales', 'collections', 'both'].includes(commissionBasis)) {
          return res.status(400).json({
            success: false,
            message: 'Commission basis must be one of: sales, collections, both',
          });
        }
        options.commissionBasis = commissionBasis;
      }
      if (salesCommissionRate !== undefined) {
        options.salesCommissionRate = parseFloat(salesCommissionRate);
      }
      if (collectionsCommissionRate !== undefined) {
        options.collectionsCommissionRate = parseFloat(collectionsCommissionRate);
      }

      const report = await reportService.calculateCommission(
        salesmanId || null,
        startDate,
        endDate,
        options
      );

      if (format && ['csv', 'excel', 'pdf'].includes(format.toLowerCase())) {
        return await this._exportReport(res, report, format);
      }

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReportController();
