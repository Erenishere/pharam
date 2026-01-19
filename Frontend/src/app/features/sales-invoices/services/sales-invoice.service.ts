/**
 * Sales Invoice Service
 * 
 * This service handles all HTTP operations for sales invoices including
 * CRUD operations, status management, payment tracking, and statistics.
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, timer, of } from 'rxjs';
import { catchError, retry, map, retryWhen, mergeMap, finalize, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

import { CacheService } from './cache.service';
import { OfflineService } from './offline.service';
import { ErrorRecoveryService } from './error-recovery.service';

import {
    SalesInvoice,
    CreateInvoiceRequest,
    UpdateInvoiceRequest,
    PaymentRequest,
    StatusChangeRequest,
    Estimate,
    SMSNotificationRequest,
    InvoiceQueryParams,
    InvoiceStatistics,
    StatisticsQueryParams
} from '../models';

import {
    ApiResponse,
    PaginatedApiResponse,
    BulkOperationResponse,
    ExportResponse
} from '../models/api-response.model';

@Injectable({
    providedIn: 'root'
})
export class SalesInvoiceService {
    private readonly baseUrl = `${environment.apiUrl}/invoices/sales`;
    private readonly estimatesUrl = `${environment.apiUrl}/estimates`;
    private readonly maxRetries = 3;
    private readonly retryDelay = 1000; // 1 second base delay

    constructor(
        private http: HttpClient,
        private cacheService: CacheService,
        private offlineService: OfflineService,
        private errorRecoveryService: ErrorRecoveryService
    ) {
        this.initializeOfflineSupport();
    }

    /**
     * Get paginated list of sales invoices with filtering and sorting (with caching and offline support)
     */
    getInvoices(params: InvoiceQueryParams): Observable<PaginatedApiResponse<SalesInvoice>> {
        const httpParams = this.buildHttpParams(params);
        const cacheKey = this.cacheService.generateKey('invoices', params);

        return this.offlineService.createOfflineRequest(
            cacheKey,
            () => this.errorRecoveryService.withErrorRecovery(
                () => this.http.get<PaginatedApiResponse<SalesInvoice>>(this.baseUrl, { params: httpParams }),
                {
                    enableRetry: true,
                    enableCircuitBreaker: false,
                    enableFallback: true,
                    fallbackData: {
                        success: true,
                        data: [],
                        pagination: {
                            currentPage: 1,
                            totalPages: 0,
                            totalItems: 0,
                            pageSize: params.limit || 25
                        }
                    }
                }
            ).pipe(
                tap(response => {
                    if (response.success) {
                        this.offlineService.storeOfflineData(cacheKey, response);
                    }
                })
            )
        );
    }

    /**
     * Get single invoice by ID (with caching)
     */
    getInvoiceById(id: string): Observable<ApiResponse<SalesInvoice>> {
        const cacheKey = `invoice:${id}`;

        return this.cacheService.get(
            cacheKey,
            'invoiceDetail',
            () => this.http.get<ApiResponse<SalesInvoice>>(`${this.baseUrl}/${id}`)
                .pipe(
                    this.retryWithExponentialBackoff(),
                    catchError(this.handleError)
                )
        );
    }

    /**
     * Create new sales invoice (with offline support)
     */
    createInvoice(invoice: CreateInvoiceRequest): Observable<ApiResponse<SalesInvoice>> {
        if (!this.offlineService.isOnline()) {
            // Queue for offline sync
            this.offlineService.queueOperation('createInvoice', invoice, 'create');
            return of({
                success: true,
                data: { ...invoice, _id: 'temp_' + Date.now() } as any,
                message: 'Invoice queued for creation when online'
            });
        }

        return this.errorRecoveryService.withErrorRecovery(
            () => this.http.post<ApiResponse<SalesInvoice>>(this.baseUrl, invoice),
            {
                enableRetry: true,
                enableCircuitBreaker: false,
                enableFallback: false
            }
        ).pipe(
            finalize(() => {
                // Invalidate related cache entries
                this.cacheService.invalidateRelated(['invoices:.*', 'invoiceStats:.*']);
            }),
            catchError(error => {
                // Queue for offline sync if network error
                if (this.isNetworkError(error)) {
                    this.offlineService.queueOperation('createInvoice', invoice, 'create');
                    return of({
                        success: true,
                        data: { ...invoice, _id: 'temp_' + Date.now() } as any,
                        message: 'Invoice queued for creation when online'
                    });
                }
                return throwError(() => error);
            })
        );
    }

    /**
     * Update existing sales invoice (invalidates cache)
     */
    updateInvoice(id: string, invoice: UpdateInvoiceRequest): Observable<ApiResponse<SalesInvoice>> {
        return this.http.put<ApiResponse<SalesInvoice>>(`${this.baseUrl}/${id}`, invoice)
            .pipe(
                finalize(() => {
                    // Invalidate related cache entries
                    this.cacheService.invalidateRelated([`invoice:${id}`, 'invoices:.*', 'invoiceStats:.*']);
                }),
                catchError(this.handleError)
            );
    }

    /**
     * Delete sales invoice
     */
    deleteInvoice(id: string): Observable<ApiResponse<void>> {
        return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`)
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Confirm invoice (change status from draft to confirmed)
     */
    confirmInvoice(id: string, request?: StatusChangeRequest): Observable<ApiResponse<SalesInvoice>> {
        return this.http.patch<ApiResponse<SalesInvoice>>(`${this.baseUrl}/${id}/confirm`, request || {})
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Cancel invoice
     */
    cancelInvoice(id: string, request?: StatusChangeRequest): Observable<ApiResponse<SalesInvoice>> {
        return this.http.patch<ApiResponse<SalesInvoice>>(`${this.baseUrl}/${id}/cancel`, request || {})
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Mark invoice as paid
     */
    markAsPaid(id: string, payment: PaymentRequest): Observable<ApiResponse<SalesInvoice>> {
        return this.http.post<ApiResponse<SalesInvoice>>(`${this.baseUrl}/${id}/mark-paid`, payment)
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Mark invoice as partially paid
     */
    markAsPartialPaid(id: string, payment: PaymentRequest): Observable<ApiResponse<SalesInvoice>> {
        return this.http.post<ApiResponse<SalesInvoice>>(`${this.baseUrl}/${id}/mark-partial-paid`, payment)
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Get invoice statistics (with caching)
     */
    getStatistics(params?: StatisticsQueryParams): Observable<ApiResponse<InvoiceStatistics>> {
        const cacheKey = this.cacheService.generateKey('invoiceStats', params || {});

        return this.cacheService.get(
            cacheKey,
            'invoiceStats',
            () => {
                const httpParams = params ? this.buildHttpParams(params) : undefined;
                return this.http.get<ApiResponse<InvoiceStatistics>>(`${this.baseUrl}/statistics`, { params: httpParams })
                    .pipe(
                        this.retryWithExponentialBackoff(),
                        catchError(this.handleError)
                    );
            }
        );
    }

    /**
     * Get pending estimates for conversion
     */
    getPendingEstimates(): Observable<PaginatedApiResponse<Estimate>> {
        const params = new HttpParams().set('status', 'pending');
        return this.http.get<PaginatedApiResponse<Estimate>>(this.estimatesUrl, { params })
            .pipe(
                this.retryWithExponentialBackoff(),
                catchError(this.handleError)
            );
    }

    /**
     * Convert estimate to invoice
     */
    convertEstimateToInvoice(estimateId: string): Observable<ApiResponse<SalesInvoice>> {
        return this.http.post<ApiResponse<SalesInvoice>>(`${this.estimatesUrl}/${estimateId}/convert-to-invoice`, {})
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Send SMS notification
     */
    sendSMSNotification(request: SMSNotificationRequest): Observable<ApiResponse<void>> {
        return this.http.post<ApiResponse<void>>(`${this.baseUrl}/send-sms`, request)
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Export invoices to Excel/PDF
     */
    exportInvoices(params: InvoiceQueryParams, format: 'excel' | 'pdf' = 'excel'): Observable<ExportResponse> {
        const httpParams = this.buildHttpParams({ ...params, format });
        return this.http.get<ExportResponse>(`${this.baseUrl}/export`, { params: httpParams })
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Bulk operations on invoices
     */
    bulkConfirm(invoiceIds: string[]): Observable<BulkOperationResponse> {
        return this.http.post<BulkOperationResponse>(`${this.baseUrl}/bulk/confirm`, { invoiceIds })
            .pipe(
                catchError(this.handleError)
            );
    }

    bulkCancel(invoiceIds: string[], reason?: string): Observable<BulkOperationResponse> {
        return this.http.post<BulkOperationResponse>(`${this.baseUrl}/bulk/cancel`, { invoiceIds, reason })
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Get invoice PDF
     */
    getInvoicePDF(id: string): Observable<Blob> {
        return this.http.get(`${this.baseUrl}/${id}/pdf`, { responseType: 'blob' })
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Print invoice
     */
    printInvoice(id: string): Observable<Blob> {
        return this.http.get(`${this.baseUrl}/${id}/print`, { responseType: 'blob' })
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Download related document
     */
    downloadRelatedDocument(documentId: string, documentType: string): Observable<Blob> {
        return this.http.get(`${this.baseUrl}/related-documents/${documentId}`, {
            responseType: 'blob',
            params: { type: documentType }
        })
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Build HTTP parameters from query object
     */
    private buildHttpParams(params: any): HttpParams {
        let httpParams = new HttpParams();

        Object.keys(params).forEach(key => {
            const value = params[key];
            if (value !== null && value !== undefined && value !== '') {
                if (Array.isArray(value)) {
                    value.forEach(item => {
                        httpParams = httpParams.append(key, item.toString());
                    });
                } else if (value instanceof Date) {
                    httpParams = httpParams.set(key, value.toISOString());
                } else {
                    httpParams = httpParams.set(key, value.toString());
                }
            }
        });

        return httpParams;
    }

    /**
     * Retry with exponential backoff for GET requests
     */
    private retryWithExponentialBackoff<T>() {
        return retryWhen<T>(errors =>
            errors.pipe(
                mergeMap((error, index) => {
                    const retryAttempt = index + 1;

                    // Only retry on network errors or 5xx server errors
                    if (retryAttempt > this.maxRetries ||
                        (error.status >= 400 && error.status < 500)) {
                        return throwError(() => error);
                    }

                    const delay = this.retryDelay * Math.pow(2, index);
                    console.log(`Retry attempt ${retryAttempt} after ${delay}ms delay`);

                    return timer(delay);
                })
            )
        );
    }

    /**
     * Check if error is retryable
     */
    private isRetryableError(error: any): boolean {
        // Retry on network errors or 5xx server errors
        return !error.status || error.status >= 500 || error.status === 0;
    }

    /**
     * Initialize offline support
     */
    private initializeOfflineSupport(): void {
        // Register sync callbacks for offline operations
        this.offlineService.registerSyncCallback('createInvoice', (data) =>
            this.http.post<ApiResponse<SalesInvoice>>(this.baseUrl, data)
        );

        this.offlineService.registerSyncCallback('updateInvoice', (data) =>
            this.http.put<ApiResponse<SalesInvoice>>(`${this.baseUrl}/${data.id}`, data)
        );

        this.offlineService.registerSyncCallback('deleteInvoice', (data) =>
            this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${data.id}`)
        );

        this.offlineService.registerSyncCallback('confirmInvoice', (data) =>
            this.http.patch<ApiResponse<SalesInvoice>>(`${this.baseUrl}/${data.id}/confirm`, data.request || {})
        );

        this.offlineService.registerSyncCallback('cancelInvoice', (data) =>
            this.http.patch<ApiResponse<SalesInvoice>>(`${this.baseUrl}/${data.id}/cancel`, data.request || {})
        );

        this.offlineService.registerSyncCallback('markAsPaid', (data) =>
            this.http.post<ApiResponse<SalesInvoice>>(`${this.baseUrl}/${data.id}/mark-paid`, data.payment)
        );

        this.offlineService.registerSyncCallback('markAsPartialPaid', (data) =>
            this.http.post<ApiResponse<SalesInvoice>>(`${this.baseUrl}/${data.id}/mark-partial-paid`, data.payment)
        );
    }

    /**
     * Check if error is network-related
     */
    private isNetworkError(error: any): boolean {
        return !error.status || error.status === 0 || !navigator.onLine;
    }
    private handleError = (error: any): Observable<never> => {
        let errorMessage = 'An error occurred';
        let userFriendlyMessage = 'Something went wrong. Please try again.';

        if (error.error instanceof ErrorEvent) {
            // Client-side error
            errorMessage = error.error.message;
            userFriendlyMessage = 'Network error. Please check your connection.';
        } else {
            // Server-side error
            if (error.error && error.error.message) {
                errorMessage = error.error.message;
                userFriendlyMessage = error.error.message;
            } else {
                switch (error.status) {
                    case 0:
                        errorMessage = 'Network error';
                        userFriendlyMessage = 'Unable to connect to server. Please check your internet connection.';
                        break;
                    case 400:
                        errorMessage = 'Invalid request data';
                        userFriendlyMessage = 'Invalid data provided. Please check your input.';
                        break;
                    case 401:
                        errorMessage = 'Unauthorized access';
                        userFriendlyMessage = 'Your session has expired. Please log in again.';
                        break;
                    case 403:
                        errorMessage = 'Access forbidden';
                        userFriendlyMessage = 'You do not have permission to perform this action.';
                        break;
                    case 404:
                        errorMessage = 'Invoice not found';
                        userFriendlyMessage = 'The requested invoice could not be found.';
                        break;
                    case 409:
                        errorMessage = 'Invoice number already exists';
                        userFriendlyMessage = 'An invoice with this number already exists.';
                        break;
                    case 422:
                        errorMessage = 'Validation failed';
                        userFriendlyMessage = 'Please check your input and try again.';
                        break;
                    case 429:
                        errorMessage = 'Too many requests';
                        userFriendlyMessage = 'Too many requests. Please wait a moment and try again.';
                        break;
                    case 500:
                        errorMessage = 'Internal server error';
                        userFriendlyMessage = 'Server error. Please try again later.';
                        break;
                    case 502:
                    case 503:
                    case 504:
                        errorMessage = 'Service unavailable';
                        userFriendlyMessage = 'Service is temporarily unavailable. Please try again later.';
                        break;
                    default:
                        errorMessage = `HTTP Error: ${error.status}`;
                        userFriendlyMessage = 'An unexpected error occurred. Please try again.';
                }
            }
        }

        // Log detailed error for debugging
        console.error('SalesInvoiceService Error:', {
            status: error.status,
            message: errorMessage,
            url: error.url,
            timestamp: new Date().toISOString()
        });

        // Return user-friendly error
        return throwError(() => ({
            ...error,
            message: errorMessage,
            userMessage: userFriendlyMessage,
            isRetryable: this.isRetryableError(error)
        }));
    };
}