import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

export const adminGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
        console.log('[AdminGuard] User not authenticated, redirecting to login');
        router.navigate(['/login']);
        return false;
    }

    const currentUser = authService.currentUserValue;
    const role = currentUser?.role?.toLowerCase();

    console.log('[AdminGuard] User role:', role);
    console.log('[AdminGuard] Current user:', currentUser);

    if (role === UserRole.ADMIN || role === 'admin') {
        console.log('[AdminGuard] Access granted for admin');
        return true;
    }

    console.log('[AdminGuard] User is not admin, redirecting to dashboard');
    // For non-admins, redirect to dashboard. dashboardGuard will further handle sales role if needed.
    router.navigate(['/dashboard']);
    return false;
};
