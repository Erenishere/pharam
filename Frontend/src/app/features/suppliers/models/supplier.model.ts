/**
 * Supplier Module Data Models and Interfaces
 * 
 * This file contains all TypeScript interfaces and types for the Supplier module.
 * These models align with the backend API structure and provide type safety
 * throughout the frontend application.
 */

/**
 * Contact information for a supplier
 */
export interface ContactInfo {
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    country?: string;
}

/**
 * Financial information for a supplier
 */
export interface FinancialInfo {
    creditLimit: number;
    paymentTerms: number;
    taxNumber?: string;
    licenseNo?: string;
    srbNo?: string;
    ntn?: string;
    strn?: string;
    nicNumber?: string;
    whtPercent: number;
    creditDays: number;
    currency: string;
    advanceTaxRate: 0 | 0.5 | 2.5;
    isNonFiler: boolean;
}

/**
 * Main Supplier interface representing a complete supplier entity
 */
export interface Supplier {
    _id: string;
    code: string;
    name: string;
    type: 'customer' | 'supplier' | 'both';
    contactInfo: ContactInfo;
    financialInfo: FinancialInfo;
    route?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

/**
 * Form data interface for creating or editing suppliers
 * Used in supplier form component
 */
export interface SupplierFormData {
    code?: string;
    name: string;
    type: 'customer' | 'supplier' | 'both';
    contactInfo?: Partial<ContactInfo>;
    financialInfo?: Partial<FinancialInfo>;
    route?: string;
}

/**
 * Statistics interface for supplier analytics
 * Used in statistics dashboard
 */
export interface SupplierStatistics {
    total: number;
    active: number;
    inactive: number;
    byType: {
        customer: number;
        supplier: number;
        both: number;
    };
    totalCreditLimit?: number;
    averagePaymentTerms?: number;
}

/**
 * Generic paginated response interface
 * Used for list endpoints with pagination
 */
export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        totalItems: number;
        totalPages: number;
        currentPage: number;
        itemsPerPage: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        nextPage: number | null;
        previousPage: number | null;
    };
    message: string;
    timestamp: string;
}

/**
 * Generic API response interface
 * Used for single entity responses
 */
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message: string;
    timestamp: string;
}

/**
 * API error interface
 * Used for error handling and display
 */
export interface ApiError {
    success: false;
    error: {
        code: string;
        message: string;
    };
    timestamp: string;
}

/**
 * Query parameters for supplier list endpoint
 * Used for filtering and pagination
 */
export interface SupplierQueryParams {
    page?: number;
    limit?: number;
    type?: 'customer' | 'supplier' | 'both';
    isActive?: boolean;
    search?: string;
}
