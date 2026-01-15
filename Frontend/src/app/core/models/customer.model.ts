// Enums
export enum CustomerType {
    REGULAR = 'regular',
    WHOLESALE = 'wholesale',
    RETAIL = 'retail',
    DISTRIBUTOR = 'distributor'
}

// Core Customer Interface
export interface Customer {
    _id: string;
    code: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    type: CustomerType | string;
    isActive: boolean;
    creditLimit?: number;
    currentBalance?: number;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string;
}

// Customer Management Request/Response Types
export interface CustomerCreateRequest {
    code: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    type: CustomerType | string;
    isActive?: boolean;
    creditLimit?: number;
}

export interface CustomerUpdateRequest {
    code?: string;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    type?: CustomerType | string;
    isActive?: boolean;
    creditLimit?: number;
}

export interface CustomerListResponse {
    success: boolean;
    data: Customer[];
    pagination: {
        total?: number; // Fallback for mock data
        totalItems?: number; // Backend field name
        page: number;
        limit: number;
        pages: number;
    };
    message?: string;
    timestamp?: string;
}

export interface CustomerStatistics {
    total: number;
    active: number;
    inactive: number;
    deleted: number;
    byType: {
        [key: string]: number;
    };
    totalCreditLimit: number;
    totalCurrentBalance: number;
}

export interface CustomerFilters {
    page?: number;
    limit?: number;
    type?: CustomerType | string;
    isActive?: boolean;
    search?: string;
    includeDeleted?: boolean;
}

// Generic API Response
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    error?: string;
}