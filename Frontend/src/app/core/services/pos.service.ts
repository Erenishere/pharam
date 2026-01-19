import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Customer {
    _id: string;
    code: string;
    name: string;
    type: string;
    phone?: string;
    email?: string;
    address?: string;
    contactInfo?: {
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

export interface Batch {
    batchNumber: string;
    expiryDate: string;
    stock: number;
    costPrice?: number;
    salePrice?: number;
}

export interface Item {
    _id: string;
    code: string;
    name: string;
    category: string;
    unitPrice: number;
    salePrice: number;
    pricing?: {
        costPrice: number;
        salePrice: number;
    };
    barcode?: string;
    stock: number;
    unit: string;
    manufacturer?: string;
    inventory?: {
        currentStock: number;
        batches: Batch[];
        minimumStock?: number;
        maximumStock?: number;
    };
    tax?: {
        gstRate: number;
        whtRate: number;
    };
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
    searchCustomers(query: string, limit: number = 10, routeId?: string): Observable<PaginatedResponse<Customer>> {
        let params = new HttpParams()
            .set('keyword', query)
            .set('limit', limit.toString())
            .set('isActive', 'true');

        if (routeId) {
            params = params.set('routeId', routeId);
        }

        return this.http.get<PaginatedResponse<Customer>>(
            `${this.baseUrl}/customers`,
            { params }
        );
    }

    /**
     * Get paginated items with filters
     */
    getItems(page: number, limit: number, filters: { keyword?: string; category?: string; stockStatus?: string } = {}): Observable<PaginatedResponse<Item>> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('limit', limit.toString());

        if (filters.keyword) params = params.set('keyword', filters.keyword);
        if (filters.category) params = params.set('category', filters.category);
        if (filters.stockStatus) params = params.set('stockStatus', filters.stockStatus);

        return this.http.get<PaginatedResponse<Item>>(`${this.baseUrl}/items`, { params });
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
     * Get customer by code
     */
    getCustomerByCode(code: string): Observable<ApiResponse<Customer>> {
        return this.http.get<ApiResponse<Customer>>(
            `${this.baseUrl}/customers/code/${code}`
        );
    }

    /**
     * Search items
     */
    searchItems(query: string, limit: number = 20): Observable<PaginatedResponse<Item>> {
        const params = new HttpParams()
            .set('keyword', query)
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
    getItemByBarcode(barcode: string): Observable<ApiResponse<{ item: Item, batchSelectionRequired?: boolean }>> {
        return this.http.post<ApiResponse<{ item: Item, batchSelectionRequired?: boolean }>>(
            `${this.baseUrl}/items/scan-barcode`,
            { barcode }
        ).pipe(
            map((response: any) => {
                // Map backend response structure to expected frontend structure if needed
                // Backend returns { success: true, data: item, batchSelectionRequired: boolean }
                // We want to return ApiResponse structure
                return {
                    success: response.success,
                    message: response.message,
                    data: {
                        item: response.data,
                        batchSelectionRequired: response.batchSelectionRequired
                    }
                };
            })
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
            `${this.baseUrl}/invoices/sales`,
            invoiceData
        );
    }

    /**
     * Calculate cart totals
     * @param items - Array of cart items with optional gstRate for dynamic tax calculation
     */
    calculateTotals(items: Array<{ quantity: number; unitPrice: number; discount: number; gstRate?: number }>): {
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
            // Use item-specific GST rate if available, otherwise default to 18%
            const gstRate = item.gstRate ?? 18;
            const taxAmount = (taxableAmount * gstRate) / 100;

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
