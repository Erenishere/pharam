import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Warehouse {
  _id: string;
  code: string;
  name: string;
  location: {
    address: string;
    city: string;
    state?: string;
    country: string;
    postalCode?: string;
  };
  contact?: {
    phone?: string;
    email?: string;
  };
  isActive: boolean;
  capacity?: number;
  manager?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class WarehouseService {
  private apiUrl = `${environment.apiUrl}/warehouses`;

  constructor(private http: HttpClient) {}

  getWarehouses(params: WarehouseQueryParams = {}): Observable<ApiResponse<Warehouse[]>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<Warehouse[]>>(this.apiUrl, { params: httpParams });
  }

  getWarehouseById(id: string): Observable<ApiResponse<Warehouse>> {
    return this.http.get<ApiResponse<Warehouse>>(`${this.apiUrl}/${id}`);
  }

  createWarehouse(warehouse: Partial<Warehouse>): Observable<ApiResponse<Warehouse>> {
    return this.http.post<ApiResponse<Warehouse>>(this.apiUrl, warehouse);
  }

  updateWarehouse(id: string, warehouse: Partial<Warehouse>): Observable<ApiResponse<Warehouse>> {
    return this.http.put<ApiResponse<Warehouse>>(`${this.apiUrl}/${id}`, warehouse);
  }

  deleteWarehouse(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }

  toggleWarehouseStatus(id: string): Observable<ApiResponse<Warehouse>> {
    return this.http.patch<ApiResponse<Warehouse>>(`${this.apiUrl}/${id}/toggle-status`, {});
  }

  getWarehouseStatistics(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/statistics`);
  }
}
