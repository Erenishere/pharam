import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SalesmanService, Salesman, PerformanceStats } from '../../../../core/services/salesman.service';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
    selector: 'app-salesman-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './salesman-dashboard.component.html',
    styleUrl: './salesman-dashboard.component.scss'
})
export class SalesmanDashboardComponent implements OnInit {
    salesman: Salesman | null = null;
    performance: PerformanceStats | null = null;
    loading = true;
    error = '';

    constructor(
        private salesmanService: SalesmanService,
        private toastService: ToastService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadDashboardData();
    }

    loadDashboardData(): void {
        this.loading = true;
        this.error = '';

        // Load salesman profile
        this.salesmanService.getMyProfile().subscribe({
            next: (response) => {
                if (response.success) {
                    this.salesman = response.data;
                    this.loadPerformance();
                }
            },
            error: (error) => {
                console.error('Error loading profile:', error);
                if (error.status === 404) {
                    this.error = 'Your user account is not linked to a salesman profile. Please contact the administrator to link your account.';
                } else {
                    this.error = 'Failed to load profile. Please try again.';
                }
                this.loading = false;
                this.toastService.error('Failed to load salesman profile. Ensure you are a registered salesman.');
            }
        });
    }

    loadPerformance(): void {
        // Get current month performance
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        this.salesmanService.getMyPerformance(
            firstDay.toISOString(),
            lastDay.toISOString()
        ).subscribe({
            next: (response) => {
                if (response.success) {
                    this.performance = response.data;
                }
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading performance:', error);
                this.loading = false;
            }
        });
    }

    navigateToPOS(): void {
        this.router.navigate(['/salesman/pos']);
    }

    navigateToSalesHistory(): void {
        this.router.navigate(['/salesman/sales-history']);
    }

    navigateToCommission(): void {
        this.router.navigate(['/salesman/commission']);
    }

    navigateToProfile(): void {
        this.router.navigate(['/salesman/profile']);
    }

    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR'
        }).format(amount);
    }
}
