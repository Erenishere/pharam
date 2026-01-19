export interface ReportParams {
  startDate?: string;
  endDate?: string;
  customerId?: string;
  supplierId?: string;
  salesmanId?: string;
  itemId?: string;
  warehouseId?: string;
  categoryId?: string;
  groupBy?: string;
  format?: 'json' | 'csv' | 'pdf';
}

export interface SalesReportData {
  summary: {
    totalSales: number;
    totalInvoices: number;
    totalDiscount: number;
    totalTax: number;
    netSales: number;
    averageOrderValue: number;
  };
  byDate?: Array<{ date: string; total: number; count: number }>;
  byCustomer?: Array<{ customer: any; total: number; count: number }>;
  byItem?: Array<{ item: any; quantity: number; total: number }>;
  bySalesman?: Array<{ salesman: any; total: number; count: number; commission: number }>;
  invoices?: any[];
}

export interface PurchaseReportData {
  summary: {
    totalPurchases: number;
    totalInvoices: number;
    gst4Total: number;
    gst18Total: number;
    netPurchases: number;
  };
  byDate?: Array<{ date: string; total: number; count: number }>;
  bySupplier?: Array<{ supplier: any; total: number; count: number; gst4: number; gst18: number }>;
  byItem?: Array<{ item: any; quantity: number; total: number }>;
  invoices?: any[];
}

export interface InventoryReportData {
  summary: {
    totalItems: number;
    totalStock: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalValue: number;
  };
  byCategory?: Array<{ category: string; itemCount: number; totalStock: number; value: number }>;
  byWarehouse?: Array<{ warehouse: any; itemCount: number; totalStock: number; value: number }>;
  lowStockItems?: any[];
  expiringBatches?: any[];
  items?: any[];
}

export interface FinancialReportData {
  profitLoss?: {
    revenue: number;
    costOfGoodsSold: number;
    grossProfit: number;
    grossMargin: number;
    operatingExpenses: number;
    netProfit: number;
    netMargin: number;
  };
  balanceSheet?: {
    assets: { cash: number; receivables: number; inventory: number; total: number };
    liabilities: { payables: number; loans: number; total: number };
    equity: { capital: number; retainedEarnings: number; total: number };
  };
  cashFlow?: {
    receipts: number;
    payments: number;
    netCashFlow: number;
    openingBalance: number;
    closingBalance: number;
  };
}

export interface TaxReportData {
  summary: {
    totalGst18: number;
    totalGst4: number;
    totalAdvanceTax: number;
    totalNonFilerGst: number;
    totalIncomeTax: number;
    netTaxLiability: number;
  };
  gstBreakdown?: Array<{ rate: string; taxableAmount: number; taxAmount: number }>;
  advanceTaxBreakdown?: Array<{ type: string; amount: number }>;
  byMonth?: Array<{ month: string; gst18: number; gst4: number; advanceTax: number }>;
}

export interface AccountsReportData {
  receivables: {
    total: number;
    aging: {
      current: number;
      days30: number;
      days60: number;
      days90: number;
      over90: number;
    };
    byCustomer?: Array<{ customer: any; total: number; aging: any }>;
  };
  payables: {
    total: number;
    bySupplier?: Array<{ supplier: any; total: number }>;
  };
  pendingCheques?: Array<{ chequeNo: string; amount: number; dueDate: string; customer: any }>;
}

export interface SalesmanReportData {
  summary: {
    totalSalesmen: number;
    totalSales: number;
    totalCollections: number;
    totalCommission: number;
  };
  performance?: Array<{
    salesman: any;
    sales: number;
    collections: number;
    commission: number;
    target: number;
    achievement: number;
  }>;
}

export interface SchemeReportData {
  summary: {
    totalSchemes: number;
    totalScheme1Quantity: number;
    totalScheme2Quantity: number;
    totalSchemeValue: number;
  };
  schemes?: Array<{
    item: any;
    scheme1Qty: number;
    scheme2Qty: number;
    totalValue: number;
  }>;
  discountBreakdown?: {
    discount1Total: number;
    discount2Total: number;
    byClaimAccount?: Array<{ account: string; discount1: number; discount2: number }>;
  };
}

export interface WarehouseReportData {
  summary: {
    totalWarehouses: number;
    totalStock: number;
    totalValue: number;
  };
  byWarehouse?: Array<{
    warehouse: any;
    itemCount: number;
    totalStock: number;
    value: number;
  }>;
  stockMovements?: Array<{
    date: string;
    item: any;
    fromWarehouse: any;
    toWarehouse: any;
    quantity: number;
    type: string;
  }>;
}

export interface AnalyticsData {
  kpis: {
    todaySales: number;
    monthSales: number;
    todayCollections: number;
    pendingReceivables: number;
  };
  salesTrends: Array<{ date: string; sales: number; orders: number }>;
  topCustomers: Array<{ customer: any; revenue: number; orders: number }>;
  topItems: Array<{ item: any; quantity: number; revenue: number }>;
  revenueByCategory: Array<{ category: string; revenue: number; percentage: number }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
