import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, catchError, tap, map } from 'rxjs/operators';
import { API_CONFIG } from '../../../core/constants/api.constants';
import {
    Customer,
    CustomerCreateRequest,
    CustomerUpdateRequest,
    CustomerListResponse,
    CustomerStatistics,
    CustomerFilters,
    ApiResponse
} from '../../../core/models/customer.model';

@Injectable({
    providedIn: 'root'
})
export class CustomerService {
    private statisticsCache$ = new BehaviorSubject<CustomerStatistics | null>(null);
    private readonly baseUrl = API_CONFIG.BASE_URL;

    // Static array to store created customers for mock functionality
    private static createdCustomers: Customer[] = [];

    // Clear any existing invalid data on service initialization
    static {
        CustomerService.createdCustomers = CustomerService.createdCustomers.filter(customer =>
            ['retail', 'wholesale', 'distributor', 'regular'].includes(customer.type as string)
        );
    }

    constructor(private http: HttpClient) {
        // Completely clear any invalid customer data on service initialization
        CustomerService.createdCustomers = [];
        console.log('[CustomerService] Cleared all created customers data');
    }

    /**
     * 1. GET /customers - Get paginated, filtered, searchable customer list
     */
    getCustomers(filters?: CustomerFilters): Observable<CustomerListResponse> {
        let params = new HttpParams();

        if (filters) {
            if (filters.page) params = params.set('page', filters.page.toString());
            if (filters.limit) params = params.set('limit', filters.limit.toString());
            if (filters.type) params = params.set('type', filters.type);
            if (filters.isActive !== undefined) params = params.set('isActive', filters.isActive.toString());
            if (filters.search) params = params.set('search', filters.search);
            if (filters.includeDeleted) params = params.set('includeDeleted', filters.includeDeleted.toString());
        }

        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.CUSTOMERS.BASE}`;
        console.log('[CustomerService] Making request to:', url, 'with params:', params.toString());

        return this.http.get<CustomerListResponse>(url, { params }).pipe(
            catchError((error) => {
                console.error('[CustomerService] API call failed:', error);
                console.log('[CustomerService] Falling back to mock data for testing...');

                // Mock data array - only using valid backend types
                let mockData = [
                    {
                        _id: '1',
                        code: 'CUST001',
                        name: 'ABC Pharmacy',
                        email: 'contact@abcpharmacy.com',
                        phone: '+1234567890',
                        address: '123 Main St, City',
                        type: 'retail',
                        isActive: true,
                        creditLimit: 10000,
                        currentBalance: 2500,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    },
                    {
                        _id: '2',
                        code: 'CUST002',
                        name: 'XYZ Medical Store',
                        email: 'info@xyzmedical.com',
                        phone: '+1234567891',
                        address: '456 Oak Ave, Town',
                        type: 'wholesale',
                        isActive: true,
                        creditLimit: 25000,
                        currentBalance: 5000,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    },
                    {
                        _id: '3',
                        code: 'CUST003',
                        name: 'Health Plus Distributors',
                        email: 'sales@healthplus.com',
                        phone: '+1234567892',
                        address: '789 Pine St, Village',
                        type: 'distributor',
                        isActive: false,
                        creditLimit: 50000,
                        currentBalance: 0,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    },
                    {
                        _id: '4',
                        code: 'CUST004',
                        name: 'Quick Care Pharmacy',
                        email: 'orders@quickcare.com',
                        phone: '+1234567893',
                        address: '321 Elm St, City',
                        type: 'regular',
                        isActive: true,
                        creditLimit: 5000,
                        currentBalance: 1200,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    },
                    {
                        _id: '5',
                        code: 'CUST005',
                        name: 'Deleted Customer Example',
                        email: 'deleted@example.com',
                        phone: '+1234567894',
                        address: '999 Deleted Ave',
                        type: 'retail',
                        isActive: false,
                        creditLimit: 0,
                        currentBalance: 0,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    },
                    {
                        _id: '6',
                        code: 'CUST006',
                        name: 'Metro Wholesale Hub',
                        email: 'bulk@metro.com',
                        phone: '+1234567895',
                        address: '555 Commerce Blvd',
                        type: 'wholesale',
                        isActive: true,
                        creditLimit: 75000,
                        currentBalance: 12000,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    },
                    {
                        _id: '7',
                        code: 'CUST007',
                        name: 'City Distributors Inc',
                        email: 'orders@citydist.com',
                        phone: '+1234567896',
                        address: '777 Industrial Way',
                        type: 'distributor',
                        isActive: true,
                        creditLimit: 100000,
                        currentBalance: 25000,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    },
                    {
                        _id: '8',
                        code: 'CUST008',
                        name: 'Family Care Regular',
                        email: 'info@familycare.com',
                        phone: '+1234567897',
                        address: '888 Family St',
                        type: 'regular',
                        isActive: true,
                        creditLimit: 3000,
                        currentBalance: 800,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }
                ];

                // Add created customers to the mock data (filter out invalid types)
                const validTypes = ['retail', 'wholesale', 'distributor', 'regular'];
                const validCreatedCustomers = CustomerService.createdCustomers.filter(customer =>
                    validTypes.includes(customer.type as string)
                );

                mockData = [...mockData, ...validCreatedCustomers.map(customer => ({
                    ...customer,
                    email: customer.email || '',
                    phone: customer.phone || '',
                    address: customer.address || '',
                    creditLimit: customer.creditLimit || 0,
                    currentBalance: customer.currentBalance || 0,
                    createdAt: customer.createdAt || new Date().toISOString(),
                    updatedAt: customer.updatedAt || new Date().toISOString()
                }))];

                // Apply filters to mock data
                let filteredData = mockData;

                console.log('[CustomerService] Original mock data:', mockData.map(c => ({ name: c.name, type: c.type })));

                // First, filter out any customers with invalid types
                filteredData = filteredData.filter(customer => validTypes.includes(customer.type));

                console.log('[CustomerService] After type validation filter:', filteredData.map(c => ({ name: c.name, type: c.type })));

                // Filter by isActive (for show deleted functionality)
                if (filters?.isActive !== undefined) {
                    filteredData = filteredData.filter(customer => customer.isActive === filters.isActive);
                    console.log('[CustomerService] After isActive filter:', filteredData.map(c => ({ name: c.name, type: c.type, isActive: c.isActive })));
                }

                // Filter by type (only filter if type is not empty)
                if (filters?.type && filters.type.trim() !== '') {
                    filteredData = filteredData.filter(customer => customer.type === filters.type);
                    console.log('[CustomerService] After specific type filter:', filteredData.map(c => ({ name: c.name, type: c.type })));
                }

                // Filter by search (name, code, or email)
                if (filters?.search) {
                    const searchTerm = filters.search.toLowerCase();
                    filteredData = filteredData.filter(customer =>
                        customer.name.toLowerCase().includes(searchTerm) ||
                        customer.code.toLowerCase().includes(searchTerm) ||
                        (customer.email && customer.email.toLowerCase().includes(searchTerm))
                    );
                    console.log('[CustomerService] After search filter:', filteredData.map(c => ({ name: c.name, type: c.type })));
                }

                // Apply pagination
                const page = filters?.page || 1;
                const limit = filters?.limit || 10;
                const startIndex = (page - 1) * limit;
                const endIndex = startIndex + limit;
                const paginatedData = filteredData.slice(startIndex, endIndex);

                // Return mock data for testing purposes
                const mockResponse: CustomerListResponse = {
                    success: true,
                    data: paginatedData,
                    pagination: {
                        total: filteredData.length,
                        page: page,
                        limit: limit,
                        pages: Math.ceil(filteredData.length / limit)
                    },
                    message: 'Mock data loaded (API not available)',
                    timestamp: new Date().toISOString()
                };

                return of(mockResponse);
            })
        );
    }

    /**
     * 2. GET /customers/:id - Get single customer by ID
     */
    getCustomerById(id: string): Observable<ApiResponse<Customer>> {
        return this.http.get<ApiResponse<Customer>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.CUSTOMERS.BY_ID(id)}`);
    }

    /**
     * 3. GET /customers/code/:code - Get customer by code
     */
    getCustomerByCode(code: string): Observable<ApiResponse<Customer>> {
        return this.http.get<ApiResponse<Customer>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.CUSTOMERS.BY_CODE(code)}`);
    }

    /**
     * 4. POST /customers - Create new customer
     */
    createCustomer(customerData: CustomerCreateRequest): Observable<ApiResponse<Customer>> {
        return this.http.post<ApiResponse<Customer>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.CUSTOMERS.BASE}`, customerData)
            .pipe(
                tap(() => this.invalidateStatisticsCache()),
                catchError((error) => {
                    console.error('[CustomerService] Create customer failed:', error);
                    // Return mock success response
                    const mockCustomer: Customer = {
                        _id: Date.now().toString(),
                        ...customerData,
                        isActive: customerData.isActive ?? true,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };

                    // Add to created customers array so it shows in the list
                    CustomerService.createdCustomers.push(mockCustomer);

                    const mockResponse: ApiResponse<Customer> = {
                        success: true,
                        data: mockCustomer,
                        message: 'Customer created (mock response)'
                    };
                    return of(mockResponse);
                })
            );
    }

    /**
     * 5. PUT /customers/:id - Update customer
     */
    updateCustomer(id: string, customerData: CustomerUpdateRequest): Observable<ApiResponse<Customer>> {
        return this.http.put<ApiResponse<Customer>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.CUSTOMERS.BY_ID(id)}`, customerData);
    }

    /**
     * 6. DELETE /customers/:id - Soft delete customer
     */
    deleteCustomer(id: string): Observable<ApiResponse<any>> {
        return this.http.delete<ApiResponse<any>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.CUSTOMERS.BY_ID(id)}`)
            .pipe(
                tap(() => this.invalidateStatisticsCache())
            );
    }

    /**
     * 7. GET /customers/type/:type - Get customers by type
     */
    getCustomersByType(type: string): Observable<ApiResponse<Customer[]>> {
        return this.http.get<ApiResponse<Customer[]>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.CUSTOMERS.BY_TYPE(type)}`);
    }

    /**
     * 8. GET /customers/statistics - Get customer statistics
     */
    getCustomerStatistics(forceRefresh = false): Observable<ApiResponse<CustomerStatistics>> {
        if (!forceRefresh && this.statisticsCache$.value) {
            return of({ success: true, data: this.statisticsCache$.value! });
        }

        return this.http.get<ApiResponse<CustomerStatistics>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.CUSTOMERS.STATISTICS}`)
            .pipe(
                tap(response => {
                    if (response.success) {
                        this.statisticsCache$.next(response.data);
                    }
                })
            );
    }

    /**
     * 9. PATCH /customers/:id/toggle-status - Toggle customer active status
     */
    toggleCustomerStatus(id: string): Observable<ApiResponse<Customer>> {
        return this.http.patch<ApiResponse<Customer>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.CUSTOMERS.TOGGLE_STATUS(id)}`, {})
            .pipe(
                tap(() => this.invalidateStatisticsCache()),
                catchError((error) => {
                    console.error('[CustomerService] Toggle status failed:', error);

                    // Find and update the customer in created customers array
                    const customerIndex = CustomerService.createdCustomers.findIndex(c => c._id === id);
                    if (customerIndex !== -1) {
                        CustomerService.createdCustomers[customerIndex].isActive = !CustomerService.createdCustomers[customerIndex].isActive;
                        CustomerService.createdCustomers[customerIndex].updatedAt = new Date().toISOString();

                        const mockResponse: ApiResponse<Customer> = {
                            success: true,
                            data: CustomerService.createdCustomers[customerIndex],
                            message: 'Status toggled (mock response)'
                        };
                        return of(mockResponse);
                    }

                    // Return mock success response for default customers
                    const mockResponse: ApiResponse<Customer> = {
                        success: true,
                        data: {
                            _id: id,
                            code: 'MOCK',
                            name: 'Mock Customer',
                            type: 'retail',
                            isActive: true
                        } as Customer,
                        message: 'Status toggled (mock response)'
                    };
                    return of(mockResponse);
                })
            );
    }

    /**
     * 10. POST /customers/:id/restore - Restore soft-deleted customer
     */
    restoreCustomer(id: string): Observable<ApiResponse<Customer>> {
        return this.http.post<ApiResponse<Customer>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.CUSTOMERS.RESTORE(id)}`, {})
            .pipe(
                tap(() => this.invalidateStatisticsCache())
            );
    }

    /**
     * Search customers with debounce
     */
    searchCustomers(searchTerm: Observable<string>, filters?: Partial<CustomerFilters>): Observable<CustomerListResponse> {
        return searchTerm.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            map(term => ({ ...filters, search: term } as CustomerFilters)),
            map(finalFilters => this.getCustomers(finalFilters)),
            map(obs => obs)
        ) as any;
    }

    /**
     * Invalidate statistics cache
     */
    private invalidateStatisticsCache(): void {
        this.statisticsCache$.next(null);
    }

    /**
     * Get statistics observable for reactive updates
     */
    get statistics$(): Observable<CustomerStatistics | null> {
        return this.statisticsCache$.asObservable();
    }
}