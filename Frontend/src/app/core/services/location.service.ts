import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Location, LocationOption } from '../models/location.model';

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

@Injectable({
    providedIn: 'root'
})
export class LocationService {
    private apiUrl = '/api/locations';

    constructor(private http: HttpClient) { }

    /**
     * Get all active locations
     */
    getLocations(): Observable<Location[]> {
        return this.http.get<ApiResponse<Location[]>>(this.apiUrl)
            .pipe(
                map(response => response.success ? response.data : [])
            );
    }

    /**
     * Get locations formatted for dropdown options
     */
    getLocationOptions(): Observable<LocationOption[]> {
        return this.getLocations().pipe(
            map(locations => locations.map(location => ({
                value: location._id,
                label: location.name,
                type: location.type
            })))
        );
    }

    /**
     * Search locations by name
     */
    searchLocations(query: string): Observable<LocationOption[]> {
        return this.getLocationOptions().pipe(
            map(options => options.filter(option =>
                option.label.toLowerCase().includes(query.toLowerCase())
            ))
        );
    }
}