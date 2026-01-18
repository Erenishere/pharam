import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
    BatchStatistics,
    ExpiryAnalytics,
    LocationDistribution,
    SupplierDistribution,
    StatisticsFilter
} from '../models/batch-statistics.model';

@Injectable({
    providedIn: 'root'
})
export class BatchStatisticsService {
    private apiUrl = '/api/batches/statistics';

    constructor(private http: HttpClient) { }

    /**
     * Get comprehensive batch statistics
     */
    getBatchStatistics(filter?: StatisticsFilter): Observable<BatchStatistics> {
        let params = new HttpParams();

        if (filter) {
            if (filter.dateRange?.start) {
                params = params.set('startDate', filter.dateRange.start.toISOString());
            }
            if (filter.dateRange?.end) {
                params = params.set('endDate', filter.dateRange.end.toISOString());
            }
            if (filter.locationIds && filter.locationIds.length > 0) {
                params = params.set('locationIds', filter.locationIds.join(','));
            }
            if (filter.supplierIds && filter.supplierIds.length > 0) {
                params = params.set('supplierIds', filter.supplierIds.join(','));
            }
            if (filter.itemCategories && filter.itemCategories.length > 0) {
                params = params.set('itemCategories', filter.itemCategories.join(','));
            }
        }

        return this.http.get<BatchStatistics>(this.apiUrl, { params });
    }

    /**
     * Get expiry analytics
     */
    getExpiryAnalytics(): Observable<ExpiryAnalytics> {
        return this.http.get<ExpiryAnalytics>(`${this.apiUrl}/expiry`);
    }

    /**
     * Get batch distribution by location
     */
    getLocationDistribution(): Observable<LocationDistribution[]> {
        return this.http.get<LocationDistribution[]>(`${this.apiUrl}/location-distribution`);
    }

    /**
     * Get supplier analytics
     */
    getSupplierAnalytics(): Observable<SupplierDistribution[]> {
        return this.http.get<SupplierDistribution[]>(`${this.apiUrl}/supplier-analytics`);
    }
}