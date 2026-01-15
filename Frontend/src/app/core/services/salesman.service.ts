import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Salesman {
    _id: string;
    code: string;
    name: string;
    phone?: string;
    email?: string;
    userId: string;
    commissionRate: number;
    routeId?: {
        _id: string;
        code: string;
        name: string;
    };
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface SalesmanInvoice {
    _id: string;
    invoiceNumber: string;
    type: string;
    customerId: {
        _id: string;
        name: string;
        code: string;
        phone?: string;
    };
    invoiceDate: string;
    dueDate: string;
    status: string;
    paymentStatus: string;
    totals: {
        subtotal: number;
        totalDiscount: number;
        totalTax: number;
        grandTotal: number;
    };
}

export interface CommissionData {
    salesmanId: string;
    salesmanName: string;
    salesmanCode: string;
    period: {
        startDate: string;
        endDate: string;
    };
    totalSales: number;
    commissionRate: number;
    totalCommission: number;
    invoiceCount: number;
    details: Array<{
        invoiceNumber: string;
        invoiceDate: string;
        customerName: string;
        saleAmount: number;
        commission: number;
    }>;
}

export interface PerformanceStats {
    salesmanName: string;
    salesmanCode: string;
    period: {
        startDate?: string;
        endDate?: string;
    };
    stats: {
        totalInvoices: number;
        confirmedInvoices: number;
        totalSales: number;
        paidInvoices: number;
        pendingAmount: number;
        averageInvoiceValue: number;
    };
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
    message?: string;
}

@Injectable({
    providedIn: 'root'
})
export class SalesmanService {
    private baseUrl = `${environment.apiUrl}/salesmen`;

    constructor(private http: HttpClient) { }

    /**
     * Get logged-in salesman's profile
     */
    getMyProfile(): Observable<ApiResponse<Salesman>> {
        return this.http.get<ApiResponse<Salesman>>(`${this.baseUrl}/me`);
    }

    /**
     * Get logged-in salesman's invoices
     */
    getMyInvoices(params?: {
        page?: number;
        limit?: number;
        status?: string;
        startDate?: string;
        endDate?: string;
    }): Observable<PaginatedResponse<SalesmanInvoice>> {
        let httpParams = new HttpParams();

        if (params) {
            if (params.page) httpParams = httpParams.set('page', params.page.toString());
            if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
            if (params.status) httpParams = httpParams.set('status', params.status);
            if (params.startDate) httpParams = httpParams.set('startDate', params.startDate);
            if (params.endDate) httpParams = httpParams.set('endDate', params.endDate);
        }

        return this.http.get<PaginatedResponse<SalesmanInvoice>>(
            `${this.baseUrl}/my-invoices`,
            { params: httpParams }
        );
    }

    /**
     * Get logged-in salesman's commission
     */
    getMyCommission(startDate: string, endDate: string): Observable<ApiResponse<CommissionData>> {
        const params = new HttpParams()
            .set('startDate', startDate)
            .set('endDate', endDate);

        return this.http.get<ApiResponse<CommissionData>>(
            `${this.baseUrl}/my-commission`,
            { params }
        );
    }

    /**
     * Get logged-in salesman's performance stats
     */
    getMyPerformance(startDate?: string, endDate?: string): Observable<ApiResponse<PerformanceStats>> {
        let params = new HttpParams();

        if (startDate) params = params.set('startDate', startDate);
        if (endDate) params = params.set('endDate', endDate);

        return this.http.get<ApiResponse<PerformanceStats>>(
            `${this.baseUrl}/my-performance`,
            { params }
        );
    }
}
