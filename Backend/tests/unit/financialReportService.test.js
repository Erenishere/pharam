const financialReportService = require('../../src/services/financialReportService');
const Invoice = require('../../src/models/Invoice');
const ledgerService = require('../../src/services/ledgerService');
const cashBookService = require('../../src/services/cashBookService');

// Mock dependencies
jest.mock('../../src/models/Invoice');
jest.mock('../../src/services/ledgerService');
jest.mock('../../src/services/cashBookService');

describe('Financial Report Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateProfitLossStatement', () => {
    it('should generate P&L statement', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockSalesInvoices = [
        {
          totals: { grandTotal: 10000, totalDiscount: 500, totalTax: 1000 },
        },
      ];

      const mockPurchaseInvoices = [
        {
          totals: { grandTotal: 6000, totalDiscount: 300, totalTax: 600 },
        },
      ];

      Invoice.find = jest
        .fn()
        .mockResolvedValueOnce(mockSalesInvoices)
        .mockResolvedValueOnce(mockPurchaseInvoices);

      const report = await financialReportService.generateProfitLossStatement(startDate, endDate);

      expect(report.reportType).toBe('profit_loss');
      expect(report.revenue.sales).toBe(10000);
      expect(report.costOfGoodsSold.purchases).toBe(6000);
      expect(report.grossProfit.amount).toBeGreaterThan(0);
    });

    it('should throw error without dates', async () => {
      await expect(financialReportService.generateProfitLossStatement()).rejects.toThrow(
        'Start date and end date are required'
      );
    });
  });

  describe('generateBalanceSheet', () => {
    it('should generate balance sheet', async () => {
      const asOfDate = new Date('2024-01-31');

      cashBookService.getCashBookBalance = jest.fn().mockResolvedValue({ balance: 50000 });
      ledgerService.getCustomerReceivablesAging = jest.fn().mockResolvedValue({
        summary: { total: 30000 },
      });
      ledgerService.getSupplierPayables = jest.fn().mockResolvedValue({
        summary: { total: 20000 },
      });

      const report = await financialReportService.generateBalanceSheet(asOfDate);

      expect(report.reportType).toBe('balance_sheet');
      expect(report.assets.currentAssets.cash).toBe(50000);
      expect(report.assets.currentAssets.accountsReceivable).toBe(30000);
      expect(report.liabilities.currentLiabilities.accountsPayable).toBe(20000);
      expect(report.balanceCheck).toBe(true);
    });

    it('should throw error without date', async () => {
      await expect(financialReportService.generateBalanceSheet()).rejects.toThrow(
        'As of date is required'
      );
    });
  });

  describe('generateCashFlowStatement', () => {
    it('should generate cash flow statement', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      cashBookService.getCashFlowStatement = jest.fn().mockResolvedValue({
        cashFlowFromOperations: {
          receiptsFromCustomers: 50000,
          paymentsToSuppliers: 30000,
          netCashFlow: 20000,
        },
        cashBalance: {
          openingBalance: 10000,
          netIncrease: 20000,
          closingBalance: 30000,
        },
      });

      const report = await financialReportService.generateCashFlowStatement(startDate, endDate);

      expect(report.reportType).toBe('cash_flow');
      expect(report.cashFlowFromOperations.netCashFlow).toBe(20000);
    });
  });

  describe('generateTaxComplianceReport', () => {
    it('should generate tax compliance report', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockSalesInvoices = [
        {
          totals: { subtotal: 10000, totalTax: 1000 },
        },
      ];

      const mockPurchaseInvoices = [
        {
          totals: { subtotal: 6000, totalTax: 600 },
        },
      ];

      Invoice.find = jest.fn().mockReturnValue({
        populate: jest
          .fn()
          .mockResolvedValueOnce(mockSalesInvoices)
          .mockResolvedValueOnce(mockPurchaseInvoices),
      });

      const report = await financialReportService.generateTaxComplianceReport(startDate, endDate);

      expect(report.reportType).toBe('tax_compliance');
      expect(report.salesTax.totalTaxCollected).toBe(1000);
      expect(report.purchaseTax.totalTaxPaid).toBe(600);
      expect(report.netTaxLiability).toBe(400);
    });
  });

  describe('generateFinancialSummary', () => {
    it('should generate comprehensive financial summary', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      // Mock the individual report methods
      jest.spyOn(financialReportService, 'generateProfitLossStatement').mockResolvedValue({
        revenue: { netSales: 10000 },
        costOfGoodsSold: { netPurchases: 6000 },
        netProfit: { amount: 3000, margin: 30 },
      });

      jest.spyOn(financialReportService, 'generateBalanceSheet').mockResolvedValue({
        assets: {
          currentAssets: { cash: 50000, accountsReceivable: 30000, total: 80000 },
          totalAssets: 80000,
        },
        liabilities: {
          currentLiabilities: { accountsPayable: 20000, total: 20000 },
          totalLiabilities: 20000,
        },
        equity: { totalEquity: 60000 },
      });

      jest.spyOn(financialReportService, 'generateCashFlowStatement').mockResolvedValue({
        cashFlowFromOperations: {
          receiptsFromCustomers: 50000,
          paymentsToSuppliers: 30000,
          netCashFlow: 20000,
        },
      });

      jest.spyOn(financialReportService, 'generateTaxComplianceReport').mockResolvedValue({
        salesTax: { totalTaxCollected: 1000 },
        purchaseTax: { totalTaxPaid: 600 },
        netTaxLiability: 400,
      });

      const summary = await financialReportService.generateFinancialSummary(startDate, endDate);

      expect(summary.reportType).toBe('financial_summary');
      expect(summary.profitability).toBeDefined();
      expect(summary.liquidity).toBeDefined();
      expect(summary.cashFlow).toBeDefined();
      expect(summary.taxation).toBeDefined();
      expect(summary.financialPosition).toBeDefined();
    });
  });
});
