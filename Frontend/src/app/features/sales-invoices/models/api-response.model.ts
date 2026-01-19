/**
 * API Response Models
 * 
 * This file contains interfaces for API responses and error handling.
 * These models provide consistent typing for all API interactions.
 */

/**
 * Generic API Response interface
 */
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    timestamp?: string;
}

/**
 * Paginated API Response interface
 */
export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
    pagination: PaginationInfo;
}

/**
 * Pagination Information interface
 */
export interface PaginationInfo {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    hasNext?: boolean;
    hasPrev?: boolean;
}

/**
 * API Error Response interface
 */
export interface ApiError {
    success: false;
    message: string;
    errors?: ValidationError[];
    statusCode: number;
    timestamp?: string;
}

/**
 * Validation Error interface
 */
export interface ValidationError {
    field: string;
    message: string;
    value?: any;
    code?: string;
}

/**
 * Bulk Operation Response interface
 */
export interface BulkOperationResponse {
    success: boolean;
    processed: number;
    successful: number;
    failed: number;
    errors?: BulkOperationError[];
    message?: string;
}

/**
 * Bulk Operation Error interface
 */
export interface BulkOperationError {
    id: string;
    error: string;
    details?: any;
}

/**
 * File Upload Response interface
 */
export interface FileUploadResponse {
    success: boolean;
    filename: string;
    originalName: string;
    size: number;
    mimetype: string;
    url?: string;
    message?: string;
}

/**
 * Export Response interface
 */
export interface ExportResponse {
    success: boolean;
    filename: string;
    downloadUrl: string;
    format: 'pdf' | 'excel' | 'csv';
    size: number;
    expiresAt: Date;
    message?: string;
}