import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { STORAGE_KEYS } from '../constants/api.constants';

export const batchAccessGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
        console.log('[BatchAccessGuard] User not authenticated, redirecting to login');
        router.navigate(['/login']);
        return false;
    }

    // Get user from localStorage synchronously
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    if (!userStr) {
        console.log('[BatchAccessGuard] No user in localStorage, redirecting to login');
        router.navigate(['/login']);
        return false;
    }

    try {
        const user = JSON.parse(userStr);
        console.log('[BatchAccessGuard] User role:', user.role);

        // Allow access for admin and inventory manager roles
        if (user && (user.role === 'admin' || user.role === 'inventory_manager')) {
            console.log('[BatchAccessGuard] Access granted for batch management');
            return true;
        }

        console.log('[BatchAccessGuard] User does not have batch management permissions, redirecting to dashboard');
        router.navigate(['/dashboard']);
        return false;
    } catch (error) {
        console.error('[BatchAccessGuard] Error parsing user:', error);
        router.navigate(['/login']);
        return false;
    }
};