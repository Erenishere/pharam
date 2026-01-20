import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

export const dashboardGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentUser = authService.currentUserValue;
  console.log('[DashboardGuard] Checking access for user:', currentUser?.username, 'Role:', currentUser?.role);
  console.log('[DashboardGuard] Target route:', state.url);

  if (currentUser) {
    const role = currentUser.role?.toLowerCase();

    // Allow admin full access to all pages
    if (role === UserRole.ADMIN || role === 'admin') {
      console.log('[DashboardGuard] Admin access granted');
      return true;
    }

    // Restrict sales role from admin-only/general management pages
    if (role === UserRole.SALES || role === 'sales') {
      // Allow access to main dashboard, but redirect if trying to access restricted pages
      const restrictedRoutes = ['/customers', '/suppliers', '/users', '/batches'];
      const isRestricted = restrictedRoutes.some(route => state.url.includes(route));
      
      if (isRestricted) {
        console.log('[DashboardGuard] Sales role trying to access restricted route:', state.url);
        router.navigate(['/salesman/dashboard']);
        return false;
      }
      
      // Allow access to main dashboard and other non-restricted routes
      console.log('[DashboardGuard] Sales role access to main dashboard allowed');
      return true;
    }

    // All other roles (purchase, inventory, accountant, data_entry) are allowed
    console.log('[DashboardGuard] Access granted for role:', role);
    return true;
  }

  // Not logged in, authGuard should handle this but redirect to login as fallback
  console.log('[DashboardGuard] No user detected, redirecting to login');
  router.navigate(['/login']);
  return false;
};
