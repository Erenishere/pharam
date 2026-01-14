import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { debounceTime, distinctUntilChanged, catchError, tap, map } from 'rxjs/operators';
import { API_CONFIG } from '../../../core/constants/api.constants';
import {
    User,
    UserCreateRequest,
    UserUpdateRequest,
    UserListResponse,
    UserStatistics,
    UserFilters,
    ChangePasswordRequest,
    ResetPasswordResponse,
    UpdateRoleRequest,
    ApiResponse
} from '../../../core/models/user.model';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private statisticsCache$ = new BehaviorSubject<UserStatistics | null>(null);
    private readonly baseUrl = API_CONFIG.BASE_URL;

    constructor(private http: HttpClient) { }

    /**
     * 1. GET /users - Get paginated, filtered, searchable user list
     */
    getUsers(filters?: UserFilters): Observable<UserListResponse> {
        let params = new HttpParams();

        if (filters) {
            if (filters.page) params = params.set('page', filters.page.toString());
            if (filters.limit) params = params.set('limit', filters.limit.toString());
            if (filters.role) params = params.set('role', filters.role);
            if (filters.isActive !== undefined) params = params.set('isActive', filters.isActive.toString());
            if (filters.search) params = params.set('search', filters.search);
            if (filters.includeDeleted) params = params.set('includeDeleted', filters.includeDeleted.toString());
        }

        return this.http.get<UserListResponse>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.USERS.BASE}`, { params });
    }

    /**
     * 2. GET /users/:id - Get single user by ID
     */
    getUserById(id: string): Observable<ApiResponse<User>> {
        return this.http.get<ApiResponse<User>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.USERS.BY_ID(id)}`);
    }

    /**
     * 3. POST /users - Create new user
     */
    createUser(userData: UserCreateRequest): Observable<ApiResponse<User>> {
        return this.http.post<ApiResponse<User>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.USERS.BASE}`, userData)
            .pipe(
                tap(() => this.invalidateStatisticsCache())
            );
    }

    /**
     * 4. PUT /users/:id - Update user
     */
    updateUser(id: string, userData: UserUpdateRequest): Observable<ApiResponse<User>> {
        return this.http.put<ApiResponse<User>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.USERS.BY_ID(id)}`, userData);
    }

    /**
     * 5. DELETE /users/:id - Soft delete user
     */
    deleteUser(id: string): Observable<ApiResponse<any>> {
        return this.http.delete<ApiResponse<any>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.USERS.BY_ID(id)}`)
            .pipe(
                tap(() => this.invalidateStatisticsCache())
            );
    }

    /**
     * 6. PATCH /users/:id/toggle-status - Toggle user active status
     */
    toggleUserStatus(id: string): Observable<ApiResponse<User>> {
        return this.http.patch<ApiResponse<User>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.USERS.TOGGLE_STATUS(id)}`, {})
            .pipe(
                tap(() => this.invalidateStatisticsCache())
            );
    }

    /**
     * 7. PATCH /users/:id/role - Update user role
     */
    updateUserRole(id: string, role: string): Observable<ApiResponse<User>> {
        const request: UpdateRoleRequest = { role };
        return this.http.patch<ApiResponse<User>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.USERS.UPDATE_ROLE(id)}`, request)
            .pipe(
                tap(() => this.invalidateStatisticsCache())
            );
    }

    /**
     * 8. POST /users/:id/reset-password - Reset user password
     */
    resetUserPassword(id: string): Observable<ResetPasswordResponse> {
        return this.http.post<ResetPasswordResponse>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.USERS.RESET_PASSWORD(id)}`, {});
    }

    /**
     * 9. POST /users/:id/restore - Restore soft-deleted user
     */
    restoreUser(id: string): Observable<ApiResponse<User>> {
        return this.http.post<ApiResponse<User>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.USERS.RESTORE(id)}`, {})
            .pipe(
                tap(() => this.invalidateStatisticsCache())
            );
    }

    /**
     * 10. GET /users/role/:role - Get users by role
     */
    getUsersByRole(role: string): Observable<ApiResponse<User[]>> {
        return this.http.get<ApiResponse<User[]>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.USERS.BY_ROLE(role)}`);
    }

    /**
     * 11. GET /users/statistics - Get user statistics
     */
    getUserStatistics(forceRefresh = false): Observable<ApiResponse<UserStatistics>> {
        if (!forceRefresh && this.statisticsCache$.value) {
            return new Observable(observer => {
                observer.next({ success: true, data: this.statisticsCache$.value! });
                observer.complete();
            });
        }

        return this.http.get<ApiResponse<UserStatistics>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.USERS.STATISTICS}`)
            .pipe(
                tap(response => {
                    if (response.success) {
                        this.statisticsCache$.next(response.data);
                    }
                })
            );
    }

    /**
     * 12. GET /users/profile/me - Get current user's profile
     */
    getMyProfile(): Observable<ApiResponse<User>> {
        return this.http.get<ApiResponse<User>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.USERS.PROFILE_ME}`);
    }

    /**
     * 13. PUT /users/profile/me - Update current user's profile
     */
    updateMyProfile(userData: UserUpdateRequest): Observable<ApiResponse<User>> {
        return this.http.put<ApiResponse<User>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.USERS.PROFILE_ME}`, userData);
    }

    /**
     * 14. POST /users/profile/change-password - Change current user's password
     */
    changeMyPassword(passwordData: ChangePasswordRequest): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(`${this.baseUrl}${API_CONFIG.ENDPOINTS.USERS.CHANGE_PASSWORD}`, passwordData);
    }

    /**
     * 15. Helper method - Get total user count for sidebar badge
     */
    getUsersCount(): Observable<number> {
        return this.getUserStatistics().pipe(
            map(response => response.data.total)
        );
    }

    /**
     * Search users with debounce
     */
    searchUsers(searchTerm: Observable<string>, filters?: Partial<UserFilters>): Observable<UserListResponse> {
        return searchTerm.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            map(term => ({ ...filters, search: term } as UserFilters)),
            map(finalFilters => this.getUsers(finalFilters)),
            // Flatten the nested observable
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
    get statistics$(): Observable<UserStatistics | null> {
        return this.statisticsCache$.asObservable();
    }
}
