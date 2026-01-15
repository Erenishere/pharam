import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const isAuth = authService.isAuthenticated();
    console.log('[AuthGuard] Is authenticated:', isAuth);
    console.log('[AuthGuard] Token:', authService.getToken() ? 'exists' : 'missing');

    if (isAuth) {
        return true;
    }

    console.log('[AuthGuard] Redirecting to login');
    router.navigate(['/login']);
    return false;
};
