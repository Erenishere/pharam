import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  StockMovement,
  StockMovementStatistics,
  LowStockItem,
  StockMovementQueryParams,
  ApiResponse
} from '../models/stock-movement.model';

@Injectable({
  providedIn: 'root'
})
export class StockMovementService {
  private baseUrl = `${environment.apiUrl}/stock-movements`;

  constructor(private http: HttpClient) {}

  getMovements(params: StockMovementQueryParams = {}): Observable<ApiResponse<StockMovement[]>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<StockMovement[]>>(this.baseUrl, { params: httpParams });
  }

  getMovementById(id: string): Observable<ApiResponse<StockMovement>> {
    return this.http.get<ApiResponse<StockMovement>>(`${this.baseUrl}/${id}`);
  }

  getMovementsByItem(itemId: string, limit = 50): Observable<ApiResponse<StockMovement[]>> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<ApiResponse<StockMovement[]>>(`${this.baseUrl}/item/${itemId}`, { params });
  }

  getItemMovementHistory(itemId: string, days = 30): Observable<ApiResponse<StockMovement[]>> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<ApiResponse<StockMovement[]>>(`${this.baseUrl}/item/${itemId}/history`, { params });
  }

  getStockBalance(itemId: string, asOfDate?: string): Observable<ApiResponse<{ balance: number }>> {
    let params = new HttpParams();
    if (asOfDate) params = params.set('asOfDate', asOfDate);
    return this.http.get<ApiResponse<{ balance: number }>>(`${this.baseUrl}/item/${itemId}/balance`, { params });
  }

  getStatistics(startDate?: string, endDate?: string): Observable<ApiResponse<StockMovementStatistics>> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<ApiResponse<StockMovementStatistics>>(`${this.baseUrl}/statistics`, { params });
  }

  getItemWiseReport(startDate: string, endDate: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/item-wise-report`, { params });
  }

  getMovementsByDateRange(startDate: string, endDate: string, itemId?: string, movementType?: string): Observable<ApiResponse<StockMovement[]>> {
    let params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    if (itemId) params = params.set('itemId', itemId);
    if (movementType) params = params.set('movementType', movementType);
    return this.http.get<ApiResponse<StockMovement[]>>(`${this.baseUrl}/by-date-range`, { params });
  }

  getLowStockItems(days = 30): Observable<ApiResponse<LowStockItem[]>> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<ApiResponse<LowStockItem[]>>(`${this.baseUrl}/low-stock`, { params });
  }

  getExpiredBatches(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/expired-batches`);
  }

  validateStockAvailability(itemId: string, quantity: number): Observable<ApiResponse<{ available: boolean; currentStock: number }>> {
    const params = new HttpParams()
      .set('itemId', itemId)
      .set('quantity', quantity.toString());
    return this.http.get<ApiResponse<{ available: boolean; currentStock: number }>>(`${this.baseUrl}/validate-availability`, { params });
  }

  recordAdjustment(data: { itemId: string; quantity: number; reason: string; warehouseId?: string }): Observable<ApiResponse<StockMovement>> {
    return this.http.post<ApiResponse<StockMovement>>(`${this.baseUrl}/adjustment`, data);
  }

  recordCorrection(data: { itemId: string; actualStock: number; reason: string; warehouseId?: string }): Observable<ApiResponse<StockMovement>> {
    return this.http.post<ApiResponse<StockMovement>>(`${this.baseUrl}/correction`, data);
  }
}
