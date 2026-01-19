import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ReportParams,
  SalesReportData,
  PurchaseReportData,
  InventoryReportData,
  FinancialReportData,
  TaxReportData,
  AccountsReportData,
  SalesmanReportData,
  SchemeReportData,
  WarehouseReportData,
  AnalyticsData,
  ApiResponse
} from '../models/report.models';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private baseUrl = `${environment.apiUrl}/reports`;
  private analyticsUrl = `${environment.apiUrl}/reports/analytics`;

  constructor(private http: HttpClient) {}

  private buildParams(params: ReportParams): HttpParams {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return httpParams;
  }

  getSalesReport(params: ReportParams = {}): Observable<ApiResponse<SalesReportData>> {
    return this.http.get<ApiResponse<SalesReportData>>(`${this.baseUrl}/sales`, { params: this.buildParams(params) });
  }

  getPurchaseReport(params: ReportParams = {}): Observable<ApiResponse<PurchaseReportData>> {
    return this.http.get<ApiResponse<PurchaseReportData>>(`${this.baseUrl}/purchase`, { params: this.buildParams(params) });
  }

  getPurchaseGstBreakdown(params: ReportParams = {}): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/purchase-gst-breakdown`, { params: this.buildParams(params) });
  }

  getSupplierWiseGst(params: ReportParams = {}): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/supplier-wise-gst`, { params: this.buildParams(params) });
  }

  getInventoryReport(params: ReportParams = {}): Observable<ApiResponse<InventoryReportData>> {
    return this.http.get<ApiResponse<InventoryReportData>>(`${this.baseUrl}/inventory`, { params: this.buildParams(params) });
  }

  getProfitLossReport(params: ReportParams = {}): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/financial/profit-loss`, { params: this.buildParams(params) });
  }

  getBalanceSheet(params: ReportParams = {}): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/financial/balance-sheet`, { params: this.buildParams(params) });
  }

  getCashFlowReport(params: ReportParams = {}): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/financial/cash-flow`, { params: this.buildParams(params) });
  }

  getFinancialSummary(params: ReportParams = {}): Observable<ApiResponse<FinancialReportData>> {
    return this.http.get<ApiResponse<FinancialReportData>>(`${this.baseUrl}/financial/summary`, { params: this.buildParams(params) });
  }

  getTaxSummary(params: ReportParams = {}): Observable<ApiResponse<TaxReportData>> {
    return this.http.get<ApiResponse<TaxReportData>>(`${this.baseUrl}/tax-summary`, { params: this.buildParams(params) });
  }

  getTaxComplianceReport(params: ReportParams = {}): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/financial/tax-compliance`, { params: this.buildParams(params) });
  }

  getAgingReport(params: ReportParams = {}): Observable<ApiResponse<AccountsReportData>> {
    return this.http.get<ApiResponse<AccountsReportData>>(`${this.baseUrl}/aging`, { params: this.buildParams(params) });
  }

  getPendingCheques(params: ReportParams = {}): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/pending-cheques`, { params: this.buildParams(params) });
  }

  getSalesmanSalesReport(params: ReportParams = {}): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/salesman-sales`, { params: this.buildParams(params) });
  }

  getSalesmanCollectionsReport(params: ReportParams = {}): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/salesman-collections`, { params: this.buildParams(params) });
  }

  getSalesmanPerformanceReport(params: ReportParams = {}): Observable<ApiResponse<SalesmanReportData>> {
    return this.http.get<ApiResponse<SalesmanReportData>>(`${this.baseUrl}/salesman-performance`, { params: this.buildParams(params) });
  }

  getSalesmanCommissionReport(params: ReportParams = {}): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/salesman-commission`, { params: this.buildParams(params) });
  }

  getSchemeAnalysis(params: ReportParams = {}): Observable<ApiResponse<SchemeReportData>> {
    return this.http.get<ApiResponse<SchemeReportData>>(`${this.baseUrl}/scheme-analysis`, { params: this.buildParams(params) });
  }

  getDiscountBreakdown(params: ReportParams = {}): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/discount-breakdown`, { params: this.buildParams(params) });
  }

  getWarehouseStockReport(params: ReportParams = {}): Observable<ApiResponse<WarehouseReportData>> {
    return this.http.get<ApiResponse<WarehouseReportData>>(`${this.baseUrl}/warehouse-stock`, { params: this.buildParams(params) });
  }

  getWarehouseComparison(itemId: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/warehouse-comparison/${itemId}`);
  }

  getDashboardAnalytics(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.analyticsUrl}/dashboard`);
  }

  getSalesTrends(params: ReportParams = {}): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.analyticsUrl}/sales-trends`, { params: this.buildParams(params) });
  }

  getTopCustomers(params: ReportParams = {}): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.analyticsUrl}/top-customers`, { params: this.buildParams(params) });
  }

  getTopItems(params: ReportParams = {}): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.analyticsUrl}/top-items`, { params: this.buildParams(params) });
  }

  getRevenueByCategory(params: ReportParams = {}): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.analyticsUrl}/revenue-by-category`, { params: this.buildParams(params) });
  }

  getProfitMargins(params: ReportParams = {}): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.analyticsUrl}/profit-margins`, { params: this.buildParams(params) });
  }

  getCollectionEfficiency(params: ReportParams = {}): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.analyticsUrl}/collection-efficiency`, { params: this.buildParams(params) });
  }

  getInventoryTurnover(params: ReportParams = {}): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.analyticsUrl}/inventory-turnover`, { params: this.buildParams(params) });
  }

  getKpis(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.analyticsUrl}/kpis`);
  }

  exportReport(reportType: string, params: ReportParams = {}, format: 'csv' | 'pdf' = 'csv'): Observable<Blob> {
    const httpParams = this.buildParams({ ...params, format });
    return this.http.get(`${this.baseUrl}/${reportType}/export`, {
      params: httpParams,
      responseType: 'blob'
    });
  }
}
