import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    error?: any;
}

interface Item {
    _id: string;
    code: string;
    name: string;
    description?: string;
    category: string;
    unit: string;
    pricing: {
        costPrice: number;
        salePrice: number;
        currency: string;
    };
    tax?: {
        gstRate: number;
        whtRate: number;
        taxCategory: string;
    };
    inventory: {
        currentStock: number;
        minimumStock: number;
        maximumStock: number;
    };
    barcode?: string;
    packSize?: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface ItemCreateRequest {
    code: string;
    name: string;
    description?: string;
    category: string;
    unit: string;
    pricing: {
        costPrice: number;
        salePrice: number;
        currency: string;
    };
    tax?: {
        gstRate: number;
        whtRate: number;
        taxCategory: string;
    };
    inventory: {
        currentStock: number;
        minimumStock: number;
        maximumStock: number;
    };
    barcode?: string;
    packSize?: number;
    isActive: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class ItemService {
    private apiUrl = `${environment.apiUrl}/items`;

    constructor(private http: HttpClient) { }

    createItem(itemData: ItemCreateRequest): Observable<ApiResponse<Item>> {
        return this.http.post<ApiResponse<Item>>(this.apiUrl, itemData);
    }

    updateItem(id: string, itemData: Partial<ItemCreateRequest>): Observable<ApiResponse<Item>> {
        return this.http.put<ApiResponse<Item>>(`${this.apiUrl}/${id}`, itemData);
    }

    getItem(id: string): Observable<ApiResponse<Item>> {
        return this.http.get<ApiResponse<Item>>(`${this.apiUrl}/${id}`);
    }

    getItems(params?: any): Observable<ApiResponse<Item[]>> {
        // Always filter for active items only
        const activeParams = { ...params, isActive: true };
        return this.http.get<ApiResponse<Item[]>>(this.apiUrl, { params: activeParams });
    }

    deleteItem(id: string): Observable<ApiResponse<any>> {
        return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
    }
}