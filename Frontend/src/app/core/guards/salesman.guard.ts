import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const salesmanGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const currentUser = authService.currentUserValue;
    const role = currentUser?.role?.toLowerCase();

    if (currentUser && (role === 'sales' || role === 'admin')) {
        return true;
    }

    router.navigate(['/dashboard']);
    return false;
};
