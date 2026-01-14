import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { STORAGE_KEYS } from '../constants/api.constants';

export const adminGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
        console.log('[AdminGuard] User not authenticated, redirecting to login');
        router.navigate(['/login']);
        return false;
    }

    // Get user from localStorage synchronously
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    if (!userStr) {
        console.log('[AdminGuard] No user in localStorage, redirecting to login');
        router.navigate(['/login']);
        return false;
    }

    try {
        const user = JSON.parse(userStr);
        console.log('[AdminGuard] User role:', user.role);

        if (user && user.role === 'admin') {
            console.log('[AdminGuard] Access granted');
            return true;
        }

        console.log('[AdminGuard] User is not admin, redirecting to dashboard');
        router.navigate(['/dashboard']);
        return false;
    } catch (error) {
        console.error('[AdminGuard] Error parsing user:', error);
        router.navigate(['/login']);
        return false;
    }
};
