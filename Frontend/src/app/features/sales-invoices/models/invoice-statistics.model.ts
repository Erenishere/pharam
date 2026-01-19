/**
 * Sales Invoice Statistics Models
 * 
 * This file contains interfaces for sales invoice statistics and metrics.
 * These models are used for dashboard and reporting functionality.
 */

import { InvoiceStatus, PaymentStatus } from './sales-invoice.model';

/**
 * Invoice Statistics interface
 */
export interface InvoiceStatistics {
    totalSales: number;
    totalInvoices: number;
    averageInvoiceValue: number;
    pendingPayments: number;
    overdueInvoices: number;
    statusBreakdown: StatusBreakdown;
    paymentBreakdown: PaymentBreakdown;
    topCustomers: TopCustomer[];
    salesTrend: SalesTrendData[];
    monthlyComparison: MonthlyComparison;
}

/**
 * Status Breakdown interface
 */
export interface StatusBreakdown {
    [InvoiceStatus.DRAFT]: number;
    [InvoiceStatus.CONFIRMED]: number;
    [InvoiceStatus.CANCELLED]: number;
}

/**
 * Payment Breakdown interface
 */
export interface PaymentBreakdown {
    [PaymentStatus.PENDING]: number;
    [PaymentStatus.PARTIAL]: number;
    [PaymentStatus.PAID]: number;
}

/**
 * Top Customer interface
 */
export interface TopCustomer {
    customerId: string;
    customerName: string;
    customerCode: string;
    totalSales: number;
    invoiceCount: number;
    averageInvoiceValue: number;
    lastInvoiceDate: Date;
}

/**
 * Sales Trend Data interface
 */
export interface SalesTrendData {
    date: Date;
    sales: number;
    invoiceCount: number;
    averageValue: number;
}

/**
 * Monthly Comparison interface
 */
export interface MonthlyComparison {
    currentMonth: {
        sales: number;
        invoices: number;
        average: number;
    };
    previousMonth: {
        sales: number;
        invoices: number;
        average: number;
    };
    growth: {
        salesGrowth: number;
        invoiceGrowth: number;
        averageGrowth: number;
    };
}

/**
 * Statistics Query Parameters
 */
export interface StatisticsQueryParams {
    dateFrom?: Date;
    dateTo?: Date;
    customerId?: string;
    salesmanId?: string;
    warehouseId?: string;
    groupBy?: 'day' | 'week' | 'month' | 'year';
}

/**
 * Chart Data interface for statistics visualization
 */
export interface ChartData {
    labels: string[];
    datasets: ChartDataset[];
}

/**
 * Chart Dataset interface
 */
export interface ChartDataset {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
}

/**
 * KPI Card Data interface
 */
export interface KPICardData {
    title: string;
    value: number | string;
    change?: number;
    changeType?: 'increase' | 'decrease' | 'neutral';
    icon?: string;
    color?: string;
    format?: 'currency' | 'number' | 'percentage';
}