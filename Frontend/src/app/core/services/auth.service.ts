import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { API_CONFIG, STORAGE_KEYS } from '../constants/api.constants';
import { LoginRequest, LoginResponse, RefreshTokenRequest, RefreshTokenResponse, ApiResponse, User } from '../models/user.model';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
    public currentUser$ = this.currentUserSubject.asObservable();

    public get currentUserValue(): User | null {
        return this.currentUserSubject.value;
    }

    constructor(private http: HttpClient) { }

    login(credentials: LoginRequest): Observable<LoginResponse> {
        console.log('[AuthService] Login attempt with:', credentials.identifier);
        return this.http.post<LoginResponse>(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.LOGIN}`, credentials)
            .pipe(
                tap(response => {
                    console.log('[AuthService] Login response:', response);
                    if (response.success) {
                        console.log('[AuthService] Login successful, setting session');
                        console.log('[AuthService] AccessToken:', response.data.accessToken);
                        console.log('[AuthService] User:', response.data.user);
                        this.setSession(response.data);
                    } else {
                        console.error('[AuthService] Login failed:', response);
                    }
                })
            );
    }

    refreshToken(refreshToken: string): Observable<RefreshTokenResponse> {
        const request: RefreshTokenRequest = { refreshToken };
        return this.http.post<RefreshTokenResponse>(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.REFRESH}`, request)
            .pipe(
                tap(response => {
                    if (response.success) {
                        localStorage.setItem(STORAGE_KEYS.TOKEN, response.data.accessToken);
                        if (response.data.refreshToken) {
                            localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.refreshToken);
                        }
                        if (response.data.user) {
                            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data.user));
                            this.currentUserSubject.next(response.data.user);
                        }
                    }
                })
            );
    }

    logout(): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.LOGOUT}`, {})
            .pipe(
                tap(() => {
                    this.clearSession();
                })
            );
    }

    getProfile(): Observable<ApiResponse<User>> {
        return this.http.get<ApiResponse<User>>(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.PROFILE}`);
    }

    verifyToken(): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.VERIFY}`);
    }

    private setSession(authResult: { accessToken: string; refreshToken: string; user: User }): void {
        console.log('[AuthService] setSession called with:', authResult);
        console.log('[AuthService] Storing accessToken:', authResult.accessToken);
        console.log('[AuthService] Storing refresh token:', authResult.refreshToken);
        console.log('[AuthService] Storing user:', authResult.user);

        localStorage.setItem(STORAGE_KEYS.TOKEN, authResult.accessToken);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, authResult.refreshToken);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(authResult.user));

        console.log('[AuthService] Verification - Token in storage:', localStorage.getItem(STORAGE_KEYS.TOKEN));
        console.log('[AuthService] Verification - User in storage:', localStorage.getItem(STORAGE_KEYS.USER));

        this.currentUserSubject.next(authResult.user);
    }

    private clearSession(): void {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
        this.currentUserSubject.next(null);
    }

    private getUserFromStorage(): User | null {
        const userStr = localStorage.getItem(STORAGE_KEYS.USER);
        return userStr ? JSON.parse(userStr) : null;
    }

    getToken(): string | null {
        return localStorage.getItem(STORAGE_KEYS.TOKEN);
    }

    getRefreshToken(): string | null {
        return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    }

    isAuthenticated(): boolean {
        const token = this.getToken();
        console.log('[AuthService] isAuthenticated called, token:', token);
        return !!token;
    }
}
