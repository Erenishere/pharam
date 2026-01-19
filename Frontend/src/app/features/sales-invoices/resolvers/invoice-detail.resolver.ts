/**
 * Invoice Detail Resolver
 * 
 * This resolver pre-loads invoice data before navigating to the detail component.
 * Includes comprehensive error handling and loading states.
 */

import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, finalize } from 'rxjs/operators';

import { SalesInvoiceService } from '../services/sales-invoice.service';
import { SalesInvoice } from '../models';
import { LoadingService } from '../../../shared/services/loading.service';
import { NotificationService } from '../../../shared/services/notification.service';

@Injectable({
    providedIn: 'root'
})
export class InvoiceDetailResolver implements Resolve<SalesInvoice | null> {

    constructor(
        private salesInvoiceService: SalesInvoiceService,
        private router: Router,
        private loadingService: LoadingService,
        private notificationService: NotificationService
    ) { }

    resolve(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<SalesInvoice | null> {
        const invoiceId = route.paramMap.get('id');

        if (!invoiceId) {
            this.notificationService.error('Invalid invoice ID');
            this.router.navigate(['/sales-invoices']);
            return of(null);
        }

        // Show loading state
        this.loadingService.setLoading(true);

        return this.salesInvoiceService.getInvoiceById(invoiceId).pipe(
            map(response => {
                if (response.success && response.data) {
                    return response.data;
                } else {
                    this.notificationService.error('Invoice not found');
                    this.router.navigate(['/sales-invoices']);
                    return null;
                }
            }),
            catchError(error => {
                console.error('Error loading invoice:', error);

                // Handle different error types
                let errorMessage = 'Failed to load invoice';
                if (error.status === 404) {
                    errorMessage = 'Invoice not found';
                } else if (error.status === 403) {
                    errorMessage = 'You do not have permission to view this invoice';
                } else if (error.status === 0) {
                    errorMessage = 'Network error. Please check your connection';
                }

                this.notificationService.error(errorMessage);
                this.router.navigate(['/sales-invoices']);
                return of(null);
            }),
            finalize(() => {
                // Hide loading state
                this.loadingService.setLoading(false);
            })
        );
    }
}