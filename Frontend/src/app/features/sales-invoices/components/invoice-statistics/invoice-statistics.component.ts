import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil, finalize, combineLatest } from 'rxjs';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';

// Models and services
import { InvoiceStatistics, StatisticsQueryParams, KPICardData, ChartData } from '../../models/invoice-statistics.model';
import { SalesInvoiceService } from '../../services/sales-invoice.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserRole } from '../../../../core/models/user.model';
import { InvoiceStatus, PaymentStatus } from '../../models/sales-invoice.model';

// Register Chart.js components
Chart.register(...registerables);

@Component({
    selector: 'app-invoice-statistics',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        MatFormFieldModule,
        MatInputModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatSelectModule,
        FormsModule
    ],
    templateUrl: './invoice-statistics.component.html',
    styleUrls: ['./invoice-statistics.component.scss']
})
export class InvoiceStatisticsComponent implements OnInit, OnDestroy, AfterViewInit {
    // Make Math available in template
    Math = Math;
    @ViewChild('salesTrendChart', { static: false }) salesTrendChartRef!: ElementRef<HTMLCanvasElement>;
    @ViewChild('statusChart', { static: false }) statusChartRef!: ElementRef<HTMLCanvasElement>;
    @ViewChild('paymentChart', { static: false }) paymentChartRef!: ElementRef<HTMLCanvasElement>;
    @ViewChild('topCustomersChart', { static: false }) topCustomersChartRef!: ElementRef<HTMLCanvasElement>;

    statistics: InvoiceStatistics | null = null;
    loading = false;
    error: string | null = null;

    // Permission flags
    canViewStatistics = false;
    canViewDetailedStats = false;
    canExportData = false;

    // Role-specific properties
    userRole: UserRole | null = null;
    roleBasedMessage = '';
    showLimitedView = false;

    // Date filter
    dateFilter: StatisticsQueryParams = {
        dateFrom: this.getDefaultStartDate(),
        dateTo: new Date()
    };

    // Chart instances
    private salesTrendChart: Chart | null = null;
    private statusChart: Chart | null = null;
    private paymentChart: Chart | null = null;
    private topCustomersChart: Chart | null = null;

    // KPI Cards data
    kpiCards: KPICardData[] = [];

    private destroy$ = new Subject<void>();

    constructor(
        private salesInvoiceService: SalesInvoiceService,
        private authService: AuthService,
        private router: Router,
        private snackBar: MatSnackBar
    ) { }

    ngOnInit(): void {
        this.checkPermissions();
        if (this.canViewStatistics) {
            this.loadStatistics();
        }
    }

    ngOnDestroy(): void {
        this.destroyCharts();
        this.destroy$.next();
        this.destroy$.complete();
    }

    ngAfterViewInit(): void {
        // Charts will be created after statistics are loaded
    }

    /**
     * Check user permissions for statistics access
     */
    private checkPermissions(): void {
        this.authService.currentUser$.pipe(
            takeUntil(this.destroy$)
        ).subscribe(user => {
            if (!user) {
                this.canViewStatistics = false;
                this.canViewDetailedStats = false;
                this.canExportData = false;
                this.userRole = null;
                this.roleBasedMessage = '';
                this.showLimitedView = false;
                return;
            }

            const role = user.role as UserRole;
            this.userRole = role;

            switch (role) {
                case UserRole.ADMIN:
                    this.canViewStatistics = true;
                    this.canViewDetailedStats = true;
                    this.canExportData = true;
                    this.roleBasedMessage = 'Full administrative access to all statistics and reports.';
                    this.showLimitedView = false;
                    break;
                case UserRole.SALES:
                    this.canViewStatistics = true;
                    this.canViewDetailedStats = true;
                    this.canExportData = true;
                    this.roleBasedMessage = 'Sales team access with full statistics and export capabilities.';
                    this.showLimitedView = false;
                    break;
                case UserRole.ACCOUNTANT:
                    this.canViewStatistics = true;
                    this.canViewDetailedStats = true;
                    this.canExportData = true;
                    this.roleBasedMessage = 'Accounting access with full financial statistics and reporting.';
                    this.showLimitedView = false;
                    break;
                case UserRole.PURCHASE:
                    this.canViewStatistics = true;
                    this.canViewDetailedStats = false;
                    this.canExportData = false;
                    this.roleBasedMessage = 'Purchase team access with basic sales overview for procurement planning.';
                    this.showLimitedView = true;
                    break;
                case UserRole.INVENTORY:
                    this.canViewStatistics = true;
                    this.canViewDetailedStats = false;
                    this.canExportData = false;
                    this.roleBasedMessage = 'Inventory access with basic sales metrics for stock planning.';
                    this.showLimitedView = true;
                    break;
                case UserRole.DATA_ENTRY:
                    this.canViewStatistics = false;
                    this.canViewDetailedStats = false;
                    this.canExportData = false;
                    this.roleBasedMessage = 'Data entry role does not have access to sales statistics.';
                    this.showLimitedView = false;
                    break;
                default:
                    this.canViewStatistics = false;
                    this.canViewDetailedStats = false;
                    this.canExportData = false;
                    this.roleBasedMessage = 'Your current role does not have access to sales statistics.';
                    this.showLimitedView = false;
                    break;
            }
        });
    }

    /**
     * Load invoice statistics from the API
     */
    loadStatistics(params?: StatisticsQueryParams): void {
        if (!this.canViewStatistics) {
            this.error = 'You do not have permission to view statistics.';
            return;
        }

        this.loading = true;
        this.error = null;

        const queryParams = params || this.dateFilter;

        this.salesInvoiceService.getStatistics(queryParams)
            .pipe(
                takeUntil(this.destroy$),
                finalize(() => this.loading = false)
            )
            .subscribe({
                next: (response) => {
                    if (response.success) {
                        this.statistics = response.data;
                        this.prepareKPICards();
                        // Create charts after data is loaded and view is initialized
                        setTimeout(() => this.createCharts(), 100);
                    } else {
                        this.error = response.message || 'Failed to load statistics';
                    }
                },
                error: (error) => {
                    console.error('Error loading invoice statistics:', error);
                    this.error = error.userMessage || 'Failed to load invoice statistics. Please try again.';
                    this.showErrorMessage('Failed to load statistics');
                }
            });
    }

    /**
     * Prepare KPI cards data from statistics
     */
    private prepareKPICards(): void {
        if (!this.statistics) return;

        // Base KPI cards available to all roles
        const baseCards: KPICardData[] = [
            {
                title: 'Total Sales',
                value: this.statistics.totalSales,
                format: 'currency',
                icon: 'attach_money',
                color: 'primary',
                change: this.calculateSalesGrowth(),
                changeType: this.getSalesGrowthType()
            },
            {
                title: 'Total Invoices',
                value: this.statistics.totalInvoices,
                format: 'number',
                icon: 'receipt',
                color: 'accent',
                change: this.calculateInvoiceGrowth(),
                changeType: this.getInvoiceGrowthType()
            }
        ];

        // Additional cards for detailed access roles
        const detailedCards: KPICardData[] = [
            {
                title: 'Average Invoice Value',
                value: this.statistics.averageInvoiceValue,
                format: 'currency',
                icon: 'trending_up',
                color: 'success'
            },
            {
                title: 'Pending Payments',
                value: this.statistics.pendingPayments,
                format: 'currency',
                icon: 'schedule',
                color: 'warn'
            },
            {
                title: 'Overdue Invoices',
                value: this.statistics.overdueInvoices,
                format: 'number',
                icon: 'warning',
                color: 'danger'
            }
        ];

        // Role-specific KPI selection
        if (this.canViewDetailedStats) {
            this.kpiCards = [...baseCards, ...detailedCards];
        } else {
            // Limited view for PURCHASE and INVENTORY roles
            this.kpiCards = [
                ...baseCards,
                {
                    title: 'Average Invoice Value',
                    value: this.statistics.averageInvoiceValue,
                    format: 'currency',
                    icon: 'trending_up',
                    color: 'success'
                }
            ];
        }
    }

    /**
     * Create all charts
     */
    private createCharts(): void {
        if (!this.statistics) return;

        this.destroyCharts();

        try {
            // Create sales trend chart
            if (this.salesTrendChartRef?.nativeElement && this.statistics.salesTrend?.length) {
                this.salesTrendChart = this.createSalesTrendChart();
            }

            // Create status distribution chart
            if (this.statusChartRef?.nativeElement) {
                this.statusChart = this.createStatusChart();
            }

            // Create payment status chart
            if (this.paymentChartRef?.nativeElement) {
                this.paymentChart = this.createPaymentChart();
            }

            // Create top customers chart
            if (this.topCustomersChartRef?.nativeElement && this.statistics.topCustomers?.length) {
                this.topCustomersChart = this.createTopCustomersChart();
            }
        } catch (error) {
            console.error('Error creating charts:', error);
            this.showErrorMessage('Failed to create charts');
        }
    }

    /**
     * Create sales trend line chart
     */
    private createSalesTrendChart(): Chart {
        const ctx = this.salesTrendChartRef.nativeElement.getContext('2d')!;

        const config: ChartConfiguration = {
            type: 'line' as ChartType,
            data: {
                labels: this.statistics!.salesTrend.map(item =>
                    new Date(item.date).toLocaleDateString()
                ),
                datasets: [
                    {
                        label: 'Sales Amount',
                        data: this.statistics!.salesTrend.map(item => item.sales),
                        borderColor: '#3f51b5',
                        backgroundColor: 'rgba(63, 81, 181, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Invoice Count',
                        data: this.statistics!.salesTrend.map(item => item.invoiceCount),
                        borderColor: '#ff9800',
                        backgroundColor: 'rgba(255, 152, 0, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Sales Trend Over Time'
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Sales Amount'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Invoice Count'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        };

        return new Chart(ctx, config);
    }

    /**
     * Create status distribution pie chart
     */
    private createStatusChart(): Chart {
        const ctx = this.statusChartRef.nativeElement.getContext('2d')!;

        const statusData = [
            this.statistics!.statusBreakdown[InvoiceStatus.DRAFT],
            this.statistics!.statusBreakdown[InvoiceStatus.CONFIRMED],
            this.statistics!.statusBreakdown[InvoiceStatus.CANCELLED]
        ];

        const config: ChartConfiguration = {
            type: 'doughnut' as ChartType,
            data: {
                labels: ['Draft', 'Confirmed', 'Cancelled'],
                datasets: [{
                    data: statusData,
                    backgroundColor: [
                        '#ffc107',
                        '#4caf50',
                        '#f44336'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Invoice Status Distribution'
                    },
                    legend: {
                        display: true,
                        position: 'bottom'
                    }
                }
            }
        };

        return new Chart(ctx, config);
    }

    /**
     * Create payment status pie chart
     */
    private createPaymentChart(): Chart {
        const ctx = this.paymentChartRef.nativeElement.getContext('2d')!;

        const paymentData = [
            this.statistics!.paymentBreakdown[PaymentStatus.PENDING],
            this.statistics!.paymentBreakdown[PaymentStatus.PARTIAL],
            this.statistics!.paymentBreakdown[PaymentStatus.PAID]
        ];

        const config: ChartConfiguration = {
            type: 'doughnut' as ChartType,
            data: {
                labels: ['Pending', 'Partial', 'Paid'],
                datasets: [{
                    data: paymentData,
                    backgroundColor: [
                        '#ff9800',
                        '#2196f3',
                        '#4caf50'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Payment Status Distribution'
                    },
                    legend: {
                        display: true,
                        position: 'bottom'
                    }
                }
            }
        };

        return new Chart(ctx, config);
    }

    /**
     * Create top customers bar chart
     */
    private createTopCustomersChart(): Chart {
        const ctx = this.topCustomersChartRef.nativeElement.getContext('2d')!;

        const topCustomers = this.statistics!.topCustomers.slice(0, 10); // Top 10 customers

        const config: ChartConfiguration = {
            type: 'bar' as ChartType,
            data: {
                labels: topCustomers.map(customer => customer.customerName),
                datasets: [{
                    label: 'Total Sales',
                    data: topCustomers.map(customer => customer.totalSales),
                    backgroundColor: '#3f51b5',
                    borderColor: '#303f9f',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Top 10 Customers by Sales'
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Sales Amount'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Customers'
                        }
                    }
                }
            }
        };

        return new Chart(ctx, config);
    }

    /**
     * Destroy all chart instances
     */
    private destroyCharts(): void {
        if (this.salesTrendChart) {
            this.salesTrendChart.destroy();
            this.salesTrendChart = null;
        }
        if (this.statusChart) {
            this.statusChart.destroy();
            this.statusChart = null;
        }
        if (this.paymentChart) {
            this.paymentChart.destroy();
            this.paymentChart = null;
        }
        if (this.topCustomersChart) {
            this.topCustomersChart.destroy();
            this.topCustomersChart = null;
        }
    }

    /**
     * Get default start date (30 days ago)
     */
    private getDefaultStartDate(): Date {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date;
    }

    /**
     * Calculate sales growth percentage
     */
    private calculateSalesGrowth(): number {
        if (!this.statistics?.monthlyComparison) return 0;
        return this.statistics.monthlyComparison.growth.salesGrowth;
    }

    /**
     * Get sales growth type
     */
    getSalesGrowthType(): 'increase' | 'decrease' | 'neutral' {
        const growth = this.calculateSalesGrowth();
        if (growth > 0) return 'increase';
        if (growth < 0) return 'decrease';
        return 'neutral';
    }

    /**
     * Calculate invoice growth percentage
     */
    private calculateInvoiceGrowth(): number {
        if (!this.statistics?.monthlyComparison) return 0;
        return this.statistics.monthlyComparison.growth.invoiceGrowth;
    }

    /**
     * Get invoice growth type
     */
    getInvoiceGrowthType(): 'increase' | 'decrease' | 'neutral' {
        const growth = this.calculateInvoiceGrowth();
        if (growth > 0) return 'increase';
        if (growth < 0) return 'decrease';
        return 'neutral';
    }

    /**
     * Refresh statistics data
     */
    refreshStatistics(): void {
        this.loadStatistics();
        this.showSuccessMessage('Statistics refreshed');
    }

    /**
     * Handle date filter change
     */
    onDateFilterChange(): void {
        // Auto-apply filter when both dates are selected
        if (this.dateFilter.dateFrom && this.dateFilter.dateTo) {
            if (this.dateFilter.dateFrom <= this.dateFilter.dateTo) {
                this.loadStatistics(this.dateFilter);
            }
        }
    }

    /**
     * Apply date filter
     */
    applyDateFilter(): void {
        if (!this.dateFilter.dateFrom || !this.dateFilter.dateTo) {
            this.showErrorMessage('Please select both start and end dates');
            return;
        }

        if (this.dateFilter.dateFrom > this.dateFilter.dateTo) {
            this.showErrorMessage('Start date must be before end date');
            return;
        }

        this.loadStatistics(this.dateFilter);
        this.showSuccessMessage('Date filter applied');
    }

    /**
     * Clear date filter
     */
    clearDateFilter(): void {
        this.dateFilter = {
            dateFrom: this.getDefaultStartDate(),
            dateTo: new Date()
        };
        this.loadStatistics();
        this.showSuccessMessage('Date filter cleared');
    }

    /**
     * Set quick date filter
     */
    setQuickFilter(period: string): void {
        const now = new Date();
        const start = new Date();

        switch (period) {
            case '7days':
                start.setDate(now.getDate() - 7);
                break;
            case '30days':
                start.setDate(now.getDate() - 30);
                break;
            case '90days':
                start.setDate(now.getDate() - 90);
                break;
            case 'thisMonth':
                start.setDate(1);
                break;
            case 'lastMonth':
                start.setMonth(now.getMonth() - 1, 1);
                now.setDate(0); // Last day of previous month
                break;
            case 'thisYear':
                start.setMonth(0, 1);
                break;
            default:
                return;
        }

        this.dateFilter = { dateFrom: start, dateTo: now };
        this.applyDateFilter();
    }

    /**
     * Export statistics data
     */
    exportStatistics(): void {
        if (!this.canExportData) {
            this.showErrorMessage('You do not have permission to export data');
            return;
        }

        if (!this.statistics) {
            this.showErrorMessage('No statistics data to export');
            return;
        }

        try {
            const reportData = this.generateReportData();
            const blob = new Blob([reportData], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `invoice-statistics-${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            window.URL.revokeObjectURL(url);

            this.showSuccessMessage('Statistics report exported successfully');
        } catch (error) {
            console.error('Error exporting statistics:', error);
            this.showErrorMessage('Failed to export statistics report');
        }
    }

    /**
     * Generate CSV report data
     */
    private generateReportData(): string {
        if (!this.statistics) return '';

        const headers = ['Metric', 'Value'];
        const rows = [
            ['Total Sales', this.statistics.totalSales.toString()],
            ['Total Invoices', this.statistics.totalInvoices.toString()],
            ['Average Invoice Value', this.statistics.averageInvoiceValue.toString()],
            ['Pending Payments', this.statistics.pendingPayments.toString()],
            ['Overdue Invoices', this.statistics.overdueInvoices.toString()],
            ['Draft Invoices', this.statistics.statusBreakdown[InvoiceStatus.DRAFT].toString()],
            ['Confirmed Invoices', this.statistics.statusBreakdown[InvoiceStatus.CONFIRMED].toString()],
            ['Cancelled Invoices', this.statistics.statusBreakdown[InvoiceStatus.CANCELLED].toString()],
            ['Pending Payments Count', this.statistics.paymentBreakdown[PaymentStatus.PENDING].toString()],
            ['Partial Payments Count', this.statistics.paymentBreakdown[PaymentStatus.PARTIAL].toString()],
            ['Paid Invoices Count', this.statistics.paymentBreakdown[PaymentStatus.PAID].toString()]
        ];

        // Add top customers data
        if (this.statistics.topCustomers?.length) {
            rows.push(['', '']); // Empty row
            rows.push(['Top Customers', '']);
            this.statistics.topCustomers.forEach((customer, index) => {
                rows.push([`${index + 1}. ${customer.customerName}`, customer.totalSales.toString()]);
            });
        }

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        return csvContent;
    }

    /**
     * Get role-specific error message
     */
    getRoleSpecificErrorMessage(): string {
        if (!this.userRole) {
            return 'Authentication required to view statistics.';
        }

        switch (this.userRole) {
            case UserRole.DATA_ENTRY:
                return 'Data entry users do not have access to sales statistics. Contact your administrator if you need access.';
            case UserRole.PURCHASE:
            case UserRole.INVENTORY:
                return 'Limited access role. You can view basic sales metrics but not detailed analytics.';
            default:
                return 'You do not have permission to view sales statistics. Contact your administrator for access.';
        }
    }

    /**
     * Get role-specific loading message
     */
    getRoleSpecificLoadingMessage(): string {
        if (this.showLimitedView) {
            return 'Loading basic sales metrics...';
        }
        return 'Loading comprehensive sales statistics...';
    }

    /**
     * Check if user can perform specific actions based on role
     */
    canPerformAction(action: string): boolean {
        switch (action) {
            case 'create_invoice':
                return this.userRole === UserRole.ADMIN ||
                    this.userRole === UserRole.SALES ||
                    this.userRole === UserRole.DATA_ENTRY;
            case 'view_detailed_reports':
                return this.canViewDetailedStats;
            case 'export_data':
                return this.canExportData;
            case 'view_customer_details':
                return this.userRole === UserRole.ADMIN ||
                    this.userRole === UserRole.SALES ||
                    this.userRole === UserRole.ACCOUNTANT;
            default:
                return false;
        }
    }

    /**
     * Navigate to invoice list
     */
    navigateToInvoiceList(): void {
        this.router.navigate(['/sales-invoices']);
    }

    /**
     * Navigate to create invoice
     */
    navigateToCreateInvoice(): void {
        if (this.canPerformAction('create_invoice')) {
            this.router.navigate(['/sales-invoices/create']);
        } else {
            this.showErrorMessage('You do not have permission to create invoices');
        }
    }

    /**
     * Navigate to pending payments
     */
    navigateToPendingPayments(): void {
        this.router.navigate(['/sales-invoices'], {
            queryParams: { paymentStatus: PaymentStatus.PENDING }
        });
    }

    /**
     * Navigate to overdue invoices
     */
    navigateToOverdueInvoices(): void {
        this.router.navigate(['/sales-invoices'], {
            queryParams: { overdue: true }
        });
    }

    /**
     * Show success message
     */
    private showSuccessMessage(message: string): void {
        this.snackBar.open(message, 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
        });
    }

    /**
     * Show error message
     */
    private showErrorMessage(message: string): void {
        this.snackBar.open(message, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
        });
    }

    /**
     * Get KPI card CSS class based on color
     */
    getKPICardClass(color: string): string {
        return `kpi-card ${color}`;
    }

    /**
     * Format KPI value based on format type
     */
    formatKPIValue(value: number | string, format?: string): string {
        if (typeof value === 'string') return value;

        switch (format) {
            case 'currency':
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }).format(value);
            case 'percentage':
                return `${value.toFixed(1)}%`;
            case 'number':
            default:
                return new Intl.NumberFormat('en-US').format(value);
        }
    }

    /**
     * Get change indicator icon
     */
    getChangeIcon(changeType?: string): string {
        switch (changeType) {
            case 'increase':
                return 'trending_up';
            case 'decrease':
                return 'trending_down';
            default:
                return 'trending_flat';
        }
    }

    /**
     * Get change indicator class
     */
    getChangeClass(changeType?: string): string {
        switch (changeType) {
            case 'increase':
                return 'change-positive';
            case 'decrease':
                return 'change-negative';
            default:
                return 'change-neutral';
        }
    }
}