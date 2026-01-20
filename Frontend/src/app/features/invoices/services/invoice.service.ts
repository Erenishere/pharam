import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Invoice, InvoiceQueryParams, InvoiceStatistics, ApiResponse } from '../models/invoice.model';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private salesUrl = `${environment.apiUrl}/invoices/sales`;
  private purchaseUrl = `${environment.apiUrl}/invoices/purchase`;

  constructor(private http: HttpClient) {}

  getSalesInvoices(params: InvoiceQueryParams = {}): Observable<ApiResponse<Invoice[]>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<Invoice[]>>(this.salesUrl, { params: httpParams });
  }

  getSalesInvoiceById(id: string): Observable<ApiResponse<Invoice>> {
    return this.http.get<ApiResponse<Invoice>>(`${this.salesUrl}/${id}`);
  }

  createSalesInvoice(invoice: Partial<Invoice>): Observable<ApiResponse<Invoice>> {
    return this.http.post<ApiResponse<Invoice>>(this.salesUrl, invoice);
  }

  updateSalesInvoice(id: string, invoice: Partial<Invoice>): Observable<ApiResponse<Invoice>> {
    return this.http.put<ApiResponse<Invoice>>(`${this.salesUrl}/${id}`, invoice);
  }

  deleteSalesInvoice(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.salesUrl}/${id}`);
  }

  confirmSalesInvoice(id: string): Observable<ApiResponse<Invoice>> {
    return this.http.patch<ApiResponse<Invoice>>(`${this.salesUrl}/${id}/confirm`, {});
  }

  cancelSalesInvoice(id: string, reason?: string): Observable<ApiResponse<Invoice>> {
    return this.http.patch<ApiResponse<Invoice>>(`${this.salesUrl}/${id}/cancel`, { reason });
  }

  markSalesInvoicePaid(id: string, data?: any): Observable<ApiResponse<Invoice>> {
    return this.http.post<ApiResponse<Invoice>>(`${this.salesUrl}/${id}/mark-paid`, data || {});
  }

  getSalesStatistics(): Observable<ApiResponse<InvoiceStatistics>> {
    return this.http.get<ApiResponse<InvoiceStatistics>>(`${this.salesUrl}/statistics`);
  }

  getPurchaseInvoices(params: InvoiceQueryParams = {}): Observable<ApiResponse<Invoice[]>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<Invoice[]>>(this.purchaseUrl, { params: httpParams });
  }

  getPurchaseInvoiceById(id: string): Observable<ApiResponse<Invoice>> {
    return this.http.get<ApiResponse<Invoice>>(`${this.purchaseUrl}/${id}`);
  }

  createPurchaseInvoice(invoice: Partial<Invoice>): Observable<ApiResponse<Invoice>> {
    return this.http.post<ApiResponse<Invoice>>(this.purchaseUrl, invoice);
  }

  updatePurchaseInvoice(id: string, invoice: Partial<Invoice>): Observable<ApiResponse<Invoice>> {
    return this.http.put<ApiResponse<Invoice>>(`${this.purchaseUrl}/${id}`, invoice);
  }

  deletePurchaseInvoice(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.purchaseUrl}/${id}`);
  }

  confirmPurchaseInvoice(id: string): Observable<ApiResponse<Invoice>> {
    return this.http.patch<ApiResponse<Invoice>>(`${this.purchaseUrl}/${id}/confirm`, {});
  }

  cancelPurchaseInvoice(id: string, reason?: string): Observable<ApiResponse<Invoice>> {
    return this.http.patch<ApiResponse<Invoice>>(`${this.purchaseUrl}/${id}/cancel`, { reason });
  }

  markPurchaseInvoicePaid(id: string, data?: any): Observable<ApiResponse<Invoice>> {
    return this.http.post<ApiResponse<Invoice>>(`${this.purchaseUrl}/${id}/mark-paid`, data || {});
  }

  getPurchaseStatistics(): Observable<ApiResponse<InvoiceStatistics>> {
    return this.http.get<ApiResponse<InvoiceStatistics>>(`${this.purchaseUrl}/statistics`);
  }
}
