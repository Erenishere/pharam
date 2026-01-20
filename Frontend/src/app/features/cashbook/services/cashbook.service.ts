import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CashReceipt,
  CashPayment,
  CashBookSummary,
  CashBookStatistics,
  CashBookQueryParams,
  ApiResponse
} from '../models/cashbook.model';

@Injectable({
  providedIn: 'root'
})
export class CashBookService {
  private baseUrl = `${environment.apiUrl}/cashbook`;

  constructor(private http: HttpClient) {}

  getReceipts(params: CashBookQueryParams = {}): Observable<ApiResponse<CashReceipt[]>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<CashReceipt[]>>(`${this.baseUrl}/receipts`, { params: httpParams });
  }

  getReceiptById(id: string): Observable<ApiResponse<CashReceipt>> {
    return this.http.get<ApiResponse<CashReceipt>>(`${this.baseUrl}/receipts/${id}`);
  }

  createReceipt(receipt: Partial<CashReceipt>): Observable<ApiResponse<CashReceipt>> {
    return this.http.post<ApiResponse<CashReceipt>>(`${this.baseUrl}/receipts`, receipt);
  }

  updateReceipt(id: string, receipt: Partial<CashReceipt>): Observable<ApiResponse<CashReceipt>> {
    return this.http.put<ApiResponse<CashReceipt>>(`${this.baseUrl}/receipts/${id}`, receipt);
  }

  clearReceipt(id: string): Observable<ApiResponse<CashReceipt>> {
    return this.http.post<ApiResponse<CashReceipt>>(`${this.baseUrl}/receipts/${id}/clear`, {});
  }

  cancelReceipt(id: string, reason?: string): Observable<ApiResponse<CashReceipt>> {
    return this.http.post<ApiResponse<CashReceipt>>(`${this.baseUrl}/receipts/${id}/cancel`, { reason });
  }

  getReceiptStatistics(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/receipts/statistics`);
  }

  getPendingCheques(): Observable<ApiResponse<CashReceipt[]>> {
    return this.http.get<ApiResponse<CashReceipt[]>>(`${this.baseUrl}/receipts/pending-cheques`);
  }

  clearCheque(id: string): Observable<ApiResponse<CashReceipt>> {
    return this.http.post<ApiResponse<CashReceipt>>(`${this.baseUrl}/receipts/${id}/clear-cheque`, {});
  }

  bounceCheque(id: string, reason?: string): Observable<ApiResponse<CashReceipt>> {
    return this.http.post<ApiResponse<CashReceipt>>(`${this.baseUrl}/receipts/${id}/bounce-cheque`, { reason });
  }

  getPayments(params: CashBookQueryParams = {}): Observable<ApiResponse<CashPayment[]>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<CashPayment[]>>(`${this.baseUrl}/payments`, { params: httpParams });
  }

  getPaymentById(id: string): Observable<ApiResponse<CashPayment>> {
    return this.http.get<ApiResponse<CashPayment>>(`${this.baseUrl}/payments/${id}`);
  }

  createPayment(payment: Partial<CashPayment>): Observable<ApiResponse<CashPayment>> {
    return this.http.post<ApiResponse<CashPayment>>(`${this.baseUrl}/payments`, payment);
  }

  updatePayment(id: string, payment: Partial<CashPayment>): Observable<ApiResponse<CashPayment>> {
    return this.http.put<ApiResponse<CashPayment>>(`${this.baseUrl}/payments/${id}`, payment);
  }

  clearPayment(id: string): Observable<ApiResponse<CashPayment>> {
    return this.http.post<ApiResponse<CashPayment>>(`${this.baseUrl}/payments/${id}/clear`, {});
  }

  cancelPayment(id: string, reason?: string): Observable<ApiResponse<CashPayment>> {
    return this.http.post<ApiResponse<CashPayment>>(`${this.baseUrl}/payments/${id}/cancel`, { reason });
  }

  getPaymentStatistics(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/payments/statistics`);
  }

  getCashBookBalance(): Observable<ApiResponse<{ balance: number }>> {
    return this.http.get<ApiResponse<{ balance: number }>>(`${this.baseUrl}/balance`);
  }

  getCashBookSummary(startDate?: string, endDate?: string): Observable<ApiResponse<CashBookSummary>> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<ApiResponse<CashBookSummary>>(`${this.baseUrl}/summary`, { params });
  }

  getDailyCashBook(date?: string): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/daily`, { params });
  }

  getCashFlowStatement(startDate: string, endDate: string): Observable<ApiResponse<any>> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/cash-flow`, { params });
  }

  getCustomerPendingInvoices(customerId: string): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/customers/${customerId}/pending-invoices`);
  }

  applyPaymentToInvoices(data: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/receipts/apply-to-invoices`, data);
  }
}
