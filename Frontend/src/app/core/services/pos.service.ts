import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Customer {
    _id: string;
    code: string;
    name: string;
    type: string;
    contactInfo: {
        phone?: string;
        email?: string;
        address?: string;
        city?: string;
    };
    financialInfo: {
        creditLimit: number;
        paymentTerms: number;
    };
}

export interface Item {
    _id: string;
    code: string;
    name: string;
    category: string;
    unitPrice: number;
    salePrice: number;
    barcode?: string;
    stock: number;
    unit: string;
}

export interface InvoiceItem {
    itemId: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxAmount: number;
    lineTotal: number;
}

export interface CreateInvoiceData {
    type: 'sales';
    customerId: string;
    salesmanId?: string;
    invoiceDate: string;
    dueDate: string;
    items: InvoiceItem[];
    totals: {
        subtotal: number;
        totalDiscount: number;
        totalTax: number;
        grandTotal: number;
    };
    status: 'draft' | 'confirmed';
    paymentStatus: 'pending';
    notes?: string;
}

export interface Invoice {
    _id: string;
    invoiceNumber: string;
    type: string;
    customerId: Customer;
    invoiceDate: string;
    dueDate: string;
    items: Array<InvoiceItem & { itemId: Item }>;
    totals: {
        subtotal: number;
        totalDiscount: number;
        totalTax: number;
        grandTotal: number;
    };
    status: string;
    paymentStatus: string;
    notes?: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
    };
}

@Injectable({
    providedIn: 'root'
})
export class PosService {
    private baseUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    /**
     * Search customers
     */
    searchCustomers(query: string, limit: number = 10): Observable<PaginatedResponse<Customer>> {
        const params = new HttpParams()
            .set('search', query)
            .set('limit', limit.toString())
            .set('isActive', 'true');

        return this.http.get<PaginatedResponse<Customer>>(
            `${this.baseUrl}/customers`,
            { params }
        );
    }

    /**
     * Get customer by ID
     */
    getCustomerById(id: string): Observable<ApiResponse<{ customer: Customer }>> {
        return this.http.get<ApiResponse<{ customer: Customer }>>(
            `${this.baseUrl}/customers/${id}`
        );
    }

    /**
     * Search items
     */
    searchItems(query: string, limit: number = 20): Observable<PaginatedResponse<Item>> {
        const params = new HttpParams()
            .set('search', query)
            .set('limit', limit.toString())
            .set('isActive', 'true');

        return this.http.get<PaginatedResponse<Item>>(
            `${this.baseUrl}/items`,
            { params }
        );
    }

    /**
     * Get item by barcode
     */
    getItemByBarcode(barcode: string): Observable<ApiResponse<{ item: Item }>> {
        return this.http.get<ApiResponse<{ item: Item }>>(
            `${this.baseUrl}/items/barcode/${barcode}`
        );
    }

    /**
     * Get item by ID
     */
    getItemById(id: string): Observable<ApiResponse<{ item: Item }>> {
        return this.http.get<ApiResponse<{ item: Item }>>(
            `${this.baseUrl}/items/${id}`
        );
    }

    /**
     * Create sales invoice
     */
    createInvoice(invoiceData: CreateInvoiceData): Observable<ApiResponse<{ invoice: Invoice }>> {
        return this.http.post<ApiResponse<{ invoice: Invoice }>>(
            `${this.baseUrl}/invoices`,
            invoiceData
        );
    }

    /**
     * Calculate cart totals
     */
    calculateTotals(items: Array<{ quantity: number; unitPrice: number; discount: number }>): {
        subtotal: number;
        totalDiscount: number;
        totalTax: number;
        grandTotal: number;
    } {
        let subtotal = 0;
        let totalDiscount = 0;
        let totalTax = 0;

        items.forEach(item => {
            const itemSubtotal = item.quantity * item.unitPrice;
            const discountAmount = (itemSubtotal * item.discount) / 100;
            const taxableAmount = itemSubtotal - discountAmount;
            const taxAmount = (taxableAmount * 18) / 100; // Default 18% GST

            subtotal += itemSubtotal;
            totalDiscount += discountAmount;
            totalTax += taxAmount;
        });

        const grandTotal = subtotal - totalDiscount + totalTax;

        return {
            subtotal,
            totalDiscount,
            totalTax,
            grandTotal
        };
    }
}
