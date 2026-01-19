/**
 * Sales Invoice Access Guard
 * 
 * This guard controls access to sales invoice features based on user roles and permissions.
 */

import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../shared/services/notification.service';

@Injectable({
    providedIn: 'root'
})
export class SalesInvoiceAccessGuard implements CanActivate {

    constructor(
        private router: Router,
        private authService: AuthService,
        private notificationService: NotificationService
    ) { }

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<boolean> | Promise<boolean> | boolean {

        // Check if user is authenticated first
        if (!this.authService.isAuthenticated()) {
            this.router.navigate(['/login']);
            return false;
        }

        return this.authService.currentUser$.pipe(
            map(user => {
                if (!user) {
                    this.router.navigate(['/login']);
                    return false;
                }

                // Get required permissions from route data
                const requiredPermissions = route.data['requiredPermissions'] as string[] || [];

                // Define role-based permissions
                const rolePermissions = this.getRolePermissions(user.role);

                // Check if user has all required permissions
                const hasAccess = requiredPermissions.length === 0 ||
                    requiredPermissions.every(permission => rolePermissions.includes(permission));

                if (!hasAccess) {
                    this.notificationService.error('You do not have permission to access this page');
                    this.router.navigate(['/dashboard']);
                    return false;
                }

                return true;
            }),
            tap(hasAccess => {
                if (!hasAccess) {
                    console.warn('[SalesInvoiceAccessGuard] Access denied for route:', state.url);
                }
            })
        );
    }

    /**
     * Get permissions based on user role
     */
    private getRolePermissions(role: string): string[] {
        const permissions: { [key: string]: string[] } = {
            'admin': [
                'sales_invoice_view',
                'sales_invoice_create',
                'sales_invoice_edit',
                'sales_invoice_delete',
                'sales_invoice_confirm',
                'sales_invoice_cancel',
                'sales_invoice_statistics',
                'estimate_view',
                'estimate_convert'
            ],
            'sales': [
                'sales_invoice_view',
                'sales_invoice_create',
                'sales_invoice_edit',
                'sales_invoice_confirm',
                'estimate_view',
                'estimate_convert'
            ],
            'data_entry': [
                'sales_invoice_view',
                'sales_invoice_create',
                'sales_invoice_edit'
            ],
            'viewer': [
                'sales_invoice_view'
            ]
        };

        return permissions[role] || [];
    }
}