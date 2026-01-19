/**
 * Sales Invoice Module Data Models and Interfaces
 * 
 * This file contains all TypeScript interfaces and types for the Sales Invoice module.
 * These models align with the backend API structure and provide type safety
 * throughout the frontend application.
 */

import { Customer } from '../../../core/models/customer.model';

/**
 * Sales Invoice Status Enum
 */
export enum InvoiceStatus {
    DRAFT = 'draft',
    CONFIRMED = 'confirmed',
    CANCELLED = 'cancelled'
}

/**
 * Payment Status Enum
 */
export enum PaymentStatus {
    PENDING = 'pending',
    PARTIAL = 'partial',
    PAID = 'paid'
}

/**
 * Discount Type Enum
 */
export enum DiscountType {
    PERCENTAGE = 'percentage',
    AMOUNT = 'amount'
}

/**
 * Payment Method Enum
 */
export enum PaymentMethod {
    CASH = 'cash',
    BANK_TRANSFER = 'bank_transfer',
    CHEQUE = 'cheque',
    CREDIT_CARD = 'credit_card',
    MOBILE_PAYMENT = 'mobile_payment'
}

/**
 * Item interface for invoice items
 */
export interface Item {
    _id: string;
    code: string;
    name: string;
    description?: string;
    category: string;
    unit: string;
    sellingPrice: number;
    gstRate: number;
    whtRate: number;
    isActive: boolean;
}

/**
 * Warehouse interface
 */
export interface Warehouse {
    _id: string;
    name: string;
    code: string;
    location?: string;
    isActive: boolean;
}

/**
 * Salesman interface
 */
export interface Salesman {
    _id: string;
    name: string;
    code: string;
    email?: string;
    phone?: string;
    isActive: boolean;
}

/**
 * Batch information for items
 */
export interface BatchInfo {
    batchNumber: string;
    expiryDate: Date;
    availableQuantity?: number;
}

/**
 * Invoice Item interface
 */
export interface InvoiceItem {
    _id?: string;
    itemId: string;
    item?: Item;
    quantity: number;
    unitPrice: number;
    discount: number;
    discountType: DiscountType;
    taxAmount: number;
    totalAmount: number;
    batchInfo?: BatchInfo;
    notes?: string;
}

/**
 * Invoice Totals interface
 */
export interface InvoiceTotals {
    subtotal: number;
    discountAmount: number;
    taxableAmount: number;
    gstAmount: number;
    whtAmount: number;
    grandTotal: number;
}

/**
 * Payment Record interface
 */
export interface PaymentRecord {
    _id: string;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentDate: Date;
    reference?: string;
    notes?: string;
    createdBy: string;
    createdAt: Date;
}

/**
 * Payment Information interface
 */
export interface PaymentInfo {
    paymentStatus: PaymentStatus;
    paidAmount: number;
    remainingAmount: number;
    paymentHistory: PaymentRecord[];
}

/**
 * Stock Movement interface
 */
export interface StockMovement {
    _id: string;
    itemId: string;
    item?: Item;
    quantity: number;
    movementType: 'out';
    reference: string;
    warehouseId: string;
    warehouse?: Warehouse;
    batchInfo?: BatchInfo;
    createdAt: Date;
}

/**
 * Invoice History interface
 */
export interface InvoiceHistory {
    _id: string;
    action: string;
    previousStatus?: InvoiceStatus;
    newStatus?: InvoiceStatus;
    reason?: string;
    performedBy: string;
    performedAt: Date;
    details?: any;
}

/**
 * Main Sales Invoice interface
 */
export interface SalesInvoice {
    _id: string;
    invoiceNumber: string;
    customerId: string;
    customer?: Customer;
    invoiceDate: Date;
    dueDate: Date;
    items: InvoiceItem[];
    totals: InvoiceTotals;
    payment: PaymentInfo;
    status: InvoiceStatus;
    warehouseId: string;
    warehouse?: Warehouse;
    salesmanId?: string;
    salesman?: Salesman;
    notes?: string;
    previousBalance: number;
    totalBalance: number;
    creditLimitExceeded: boolean;
    discountType: DiscountType;
    discountValue: number;
    stockMovements?: StockMovement[];
    history?: InvoiceHistory[];
    metadata?: {
        convertedFromEstimate?: boolean;
        estimateId?: string;
        estimateNumber?: string;
        estimateDate?: Date;
        [key: string]: any;
    };
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Create Invoice Request interface
 */
export interface CreateInvoiceRequest {
    customerId: string;
    invoiceDate: Date;
    dueDate: Date;
    warehouseId: string;
    salesmanId?: string;
    items: Omit<InvoiceItem, '_id' | 'item' | 'taxAmount' | 'totalAmount'>[];
    notes?: string;
    discountType: DiscountType;
    discountValue: number;
}

/**
 * Update Invoice Request interface
 */
export interface UpdateInvoiceRequest {
    customerId?: string;
    invoiceDate?: Date;
    dueDate?: Date;
    warehouseId?: string;
    salesmanId?: string;
    items?: Omit<InvoiceItem, '_id' | 'item' | 'taxAmount' | 'totalAmount'>[];
    notes?: string;
    discountType?: DiscountType;
    discountValue?: number;
}

/**
 * Payment Request interface
 */
export interface PaymentRequest {
    amount: number;
    paymentMethod: PaymentMethod;
    paymentDate: Date;
    reference?: string;
    notes?: string;
}

/**
 * Status Change Request interface
 */
export interface StatusChangeRequest {
    reason?: string;
    notes?: string;
}

/**
 * Estimate interface for conversion
 */
export interface Estimate {
    _id: string;
    estimateNumber: string;
    customerId: string;
    customer?: Customer;
    estimateDate: Date;
    validUntil: Date;
    items: InvoiceItem[];
    totals: InvoiceTotals;
    status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'converted';
    warehouseId: string;
    warehouse?: Warehouse;
    salesmanId?: string;
    salesman?: Salesman;
    notes?: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * SMS Notification Request interface
 */
export interface SMSNotificationRequest {
    invoiceId: string;
    message?: string;
    phoneNumber?: string;
}

/**
 * Warranty Information interface
 */
export interface WarrantyInfo {
    itemId: string;
    item?: Item;
    warrantyPeriod: number; // in months
    warrantyStartDate: Date;
    warrantyEndDate: Date;
    warrantyTerms?: string;
    isActive: boolean;
}

/**
 * Audit Trail Entry interface
 */
export interface AuditTrailEntry {
    _id: string;
    timestamp: Date;
    event: string;
    eventType: 'creation' | 'status_change' | 'payment' | 'stock_movement' | 'modification' | 'notification' | 'export' | 'print';
    user: string;
    changes: {
        status?: { from: InvoiceStatus | null; to: InvoiceStatus };
        payment?: { amount: number; method: PaymentMethod; reference?: string };
        stock?: { item: string; quantity: number; warehouse: string; batch?: string };
        [key: string]: any;
    };
    impact: string;
    reason?: string;
    metadata?: any;
}

/**
 * Related Document interface
 */
export interface RelatedDocument {
    _id: string;
    type: 'Estimate' | 'Delivery Note' | 'Payment Receipt' | 'Return Note' | 'Purchase Order' | 'Warranty Document';
    reference: string;
    date: Date;
    status: 'generated' | 'issued' | 'converted' | 'pending' | 'cancelled' | 'completed';
    description: string;
    url: string;
    canView: boolean;
    canDownload: boolean;
}