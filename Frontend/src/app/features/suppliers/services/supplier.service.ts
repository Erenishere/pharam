import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { API_CONFIG } from '../../../core/constants/api.constants';
import {
    Supplier,
    SupplierFormData,
    SupplierStatistics,
    SupplierQueryParams,
    PaginatedResponse,
    ApiResponse
} from '../models/supplier.model';

/**
 * Supplier Service
 * 
 * Handles all HTTP communication with the backend supplier API endpoints.
 * Provides methods for CRUD operations, filtering, pagination, and statistics.
 * 
 * Backend API Endpoints:
 * - GET /api/suppliers/statistics
 * - GET /api/suppliers/type/:type
 * - GET /api/suppliers/code/:code
 * - GET /api/suppliers (with pagination)
 * - POST /api/suppliers
 * - GET /api/suppliers/:id
 * - PUT /api/suppliers/:id
 * - DELETE /api/suppliers/:id
 * - POST /api/suppliers/:id/restore
 * - PATCH /api/suppliers/:id/toggle-status
 */
@Injectable({
    providedIn: 'root'
})
export class SupplierService {
    private statisticsCache$ = new BehaviorSubject<SupplierStatistics | null>(null);
    private readonly baseUrl = API_CONFIG.BASE_URL;

    constructor(private http: HttpClient) { }

    /**
     * Get paginated list of suppliers with optional filtering
     * 
     * @param params Query parameters for pagination and filtering
     * @returns Observable of paginated supplier response
     * 
     * Requirements: 2.2
     */
    getSuppliers(params?: SupplierQueryParams): Observable<PaginatedResponse<Supplier>> {
        let httpParams = new HttpParams();

        if (params) {
            if (params.page) {
                httpParams = httpParams.set('page', params.page.toString());
            }
            if (params.limit) {
                httpParams = httpParams.set('limit', params.limit.toString());
            }
            if (params.type) {
                httpParams = httpParams.set('type', params.type);
            }
            if (params.isActive !== undefined) {
                httpParams = httpParams.set('isActive', params.isActive.toString());
            }
            if (params.search) {
                httpParams = httpParams.set('search', params.search);
            }
        }

        return this.http.get<PaginatedResponse<Supplier>>(
            `${this.baseUrl}${API_CONFIG.ENDPOINTS.SUPPLIERS.BASE}`,
            { params: httpParams }
        ).pipe(
            catchError(this.handleError)
        );
    }

    /**
     * Get suppliers filtered by type
     * 
     * @param type Supplier type: 'customer', 'supplier', or 'both'
     * @returns Observable of supplier array
     * 
     * Requirements: 9.2
     */
    getSuppliersByType(type: 'customer' | 'supplier' | 'both'): Observable<ApiResponse<Supplier[]>> {
        return this.http.get<ApiResponse<Supplier[]>>(
            `${this.baseUrl}${API_CONFIG.ENDPOINTS.SUPPLIERS.BY_TYPE(type)}`
        ).pipe(
            catchError(this.handleError)
        );
    }

    /**
     * Get a single supplier by code
     * 
     * @param code Supplier code
     * @returns Observable of supplier
     * 
     * Requirements: 10.2
     */
    getSupplierByCode(code: string): Observable<ApiResponse<Supplier>> {
        return this.http.get<ApiResponse<Supplier>>(
            `${this.baseUrl}${API_CONFIG.ENDPOINTS.SUPPLIERS.BY_CODE(code)}`
        ).pipe(
            catchError(this.handleError)
        );
    }

    /**
     * Get a single supplier by ID
     * 
     * @param id Supplier ID
     * @returns Observable of supplier
     * 
     * Requirements: 8.2
     */
    getSupplierById(id: string): Observable<ApiResponse<Supplier>> {
        return this.http.get<ApiResponse<Supplier>>(
            `${this.baseUrl}${API_CONFIG.ENDPOINTS.SUPPLIERS.BY_ID(id)}`
        ).pipe(
            catchError(this.handleError)
        );
    }

    /**
     * Create a new supplier
     * 
     * @param data Supplier form data
     * @returns Observable of created supplier
     * 
     * Requirements: 3.6
     */
    createSupplier(data: SupplierFormData): Observable<ApiResponse<Supplier>> {
        return this.http.post<ApiResponse<Supplier>>(
            `${this.baseUrl}${API_CONFIG.ENDPOINTS.SUPPLIERS.BASE}`,
            data
        ).pipe(
            tap(() => this.invalidateStatisticsCache()),
            catchError(this.handleError)
        );
    }

    /**
     * Update an existing supplier
     * 
     * @param id Supplier ID
     * @param data Supplier form data
     * @returns Observable of updated supplier
     * 
     * Requirements: 4.5
     */
    updateSupplier(id: string, data: SupplierFormData): Observable<ApiResponse<Supplier>> {
        return this.http.put<ApiResponse<Supplier>>(
            `${this.baseUrl}${API_CONFIG.ENDPOINTS.SUPPLIERS.BY_ID(id)}`,
            data
        ).pipe(
            tap(() => this.invalidateStatisticsCache()),
            catchError(this.handleError)
        );
    }

    /**
     * Soft delete a supplier
     * 
     * @param id Supplier ID
     * @returns Observable of void
     * 
     * Requirements: 5.2
     */
    deleteSupplier(id: string): Observable<ApiResponse<any>> {
        return this.http.delete<ApiResponse<any>>(
            `${this.baseUrl}${API_CONFIG.ENDPOINTS.SUPPLIERS.BY_ID(id)}`
        ).pipe(
            tap(() => this.invalidateStatisticsCache()),
            catchError(this.handleError)
        );
    }

    /**
     * Restore a soft-deleted supplier
     * 
     * @param id Supplier ID
     * @returns Observable of restored supplier
     * 
     * Requirements: 6.2
     */
    restoreSupplier(id: string): Observable<ApiResponse<Supplier>> {
        return this.http.post<ApiResponse<Supplier>>(
            `${this.baseUrl}${API_CONFIG.ENDPOINTS.SUPPLIERS.RESTORE(id)}`,
            {}
        ).pipe(
            tap(() => this.invalidateStatisticsCache()),
            catchError(this.handleError)
        );
    }

    /**
     * Toggle supplier active status
     * 
     * @param id Supplier ID
     * @returns Observable of updated supplier
     * 
     * Requirements: 7.2
     */
    toggleSupplierStatus(id: string): Observable<ApiResponse<Supplier>> {
        return this.http.patch<ApiResponse<Supplier>>(
            `${this.baseUrl}${API_CONFIG.ENDPOINTS.SUPPLIERS.TOGGLE_STATUS(id)}`,
            {}
        ).pipe(
            tap(() => this.invalidateStatisticsCache()),
            catchError(this.handleError)
        );
    }

    /**
     * Get supplier statistics
     * 
     * @param forceRefresh Force refresh cache
     * @returns Observable of supplier statistics
     * 
     * Requirements: 11.2
     */
    getStatistics(forceRefresh = false): Observable<ApiResponse<SupplierStatistics>> {
        // Return cached statistics if available and not forcing refresh
        if (!forceRefresh && this.statisticsCache$.value) {
            return new Observable(observer => {
                observer.next({
                    success: true,
                    data: this.statisticsCache$.value!,
                    message: 'Statistics retrieved from cache',
                    timestamp: new Date().toISOString()
                });
                observer.complete();
            });
        }

        return this.http.get<ApiResponse<SupplierStatistics>>(
            `${this.baseUrl}${API_CONFIG.ENDPOINTS.SUPPLIERS.STATISTICS}`
        ).pipe(
            tap(response => {
                if (response.success) {
                    this.statisticsCache$.next(response.data);
                }
            }),
            catchError(this.handleError)
        );
    }

    /**
     * Invalidate the statistics cache
     * 
     * Clears the cached statistics data, forcing a fresh fetch on next request.
     * Called after operations that affect statistics (create, update, delete, restore, toggle).
     * 
     * @private
     * @returns {void}
     */
    private invalidateStatisticsCache(): void {
        this.statisticsCache$.next(null);
    }

    /**
     * Get statistics observable for reactive updates
     * 
     * Returns an observable that emits the current statistics or null if not cached.
     * Useful for components that need to react to statistics changes.
     * 
     * @public
     * @returns {Observable<SupplierStatistics | null>} Observable of statistics data
     */
    get statistics$(): Observable<SupplierStatistics | null> {
        return this.statisticsCache$.asObservable();
    }

    /**
     * Centralized error handling for HTTP requests
     * 
     * Processes different types of errors and returns user-friendly error messages.
     * Handles network errors, HTTP status codes, and backend error responses.
     * 
     * @private
     * @param {any} error - The HTTP error response
     * @returns {Observable<never>} Observable that throws formatted error
     */
    private handleError(error: any): Observable<never> {
        let errorMessage = 'An error occurred';

        if (error.error instanceof ErrorEvent) {
            // Client-side or network error
            errorMessage = `Network error: ${error.error.message}`;
        } else {
            // Backend error
            if (error.error?.error?.message) {
                errorMessage = error.error.error.message;
            } else if (error.error?.message) {
                errorMessage = error.error.message;
            } else if (error.message) {
                errorMessage = error.message;
            } else {
                errorMessage = `Server error: ${error.status} - ${error.statusText}`;
            }
        }

        return throwError(() => ({
            message: errorMessage,
            originalError: error
        }));
    }
}
