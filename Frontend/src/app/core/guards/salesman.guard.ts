import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const salesmanGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const currentUser = authService.currentUserValue;

    if (currentUser && currentUser.role === 'sales') {
        return true;
    }

    // Not a salesman, redirect to dashboard
    router.navigate(['/dashboard']);
    return false;
};
