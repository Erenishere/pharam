/**
 * Sales Invoice Filters and Query Parameters
 * 
 * This file contains interfaces for filtering and querying sales invoices.
 * These models are used for search, filtering, and pagination functionality.
 */

import { InvoiceStatus, PaymentStatus } from './sales-invoice.model';

/**
 * Invoice Filters interface for search and filtering
 */
export interface InvoiceFilters {
    search?: string;
    status?: InvoiceStatus[];
    paymentStatus?: PaymentStatus[];
    customerId?: string;
    salesmanId?: string;
    warehouseId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    amountFrom?: number;
    amountTo?: number;
}

/**
 * Invoice Query Parameters for API requests
 */
export interface InvoiceQueryParams extends InvoiceFilters {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

/**
 * Sort Options for invoice list
 */
export interface SortOption {
    field: string;
    direction: 'asc' | 'desc';
    label: string;
}

/**
 * Filter Option interface for dropdowns
 */
export interface FilterOption {
    value: string;
    label: string;
    count?: number;
}

/**
 * Date Range Filter interface
 */
export interface DateRangeFilter {
    startDate?: Date;
    endDate?: Date;
    preset?: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';
}

/**
 * Advanced Filter State interface
 */
export interface AdvancedFilterState {
    isExpanded: boolean;
    activeFilters: string[];
    filterCount: number;
}