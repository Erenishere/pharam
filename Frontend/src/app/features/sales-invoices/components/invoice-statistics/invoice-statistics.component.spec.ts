/**
 * Invoice Statistics Component Unit Tests
 * 
 * This file contains comprehensive unit tests for the InvoiceStatisticsComponent
 * covering statistics loading, date range filtering, chart rendering, and user interactions.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { InvoiceStatisticsComponent } from './invoice-statistics.component';
import { SalesInvoiceService } from '../../services/sales-invoice.service';
import { AuthService } from '../../../../core/services/auth.service';
import { InvoiceStatistics, InvoiceStatus, PaymentStatus } from '../../models';

describe('InvoiceStatisticsComponent', () => {
    let component: InvoiceStatisticsComponent;
    let fixture: ComponentFixture<InvoiceStatisticsComponent>;
    let mockSalesInvoiceService: jasmine.SpyObj<SalesInvoiceService>;
    let mockAuthService: jasmine.SpyObj<AuthService>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockSnackBar: jasmine.SpyObj<MatSnackBar>;

    const mockStatistics: InvoiceStatistics = {
        totalSales: 150000,
        totalInvoices: 25,
        averageInvoiceValue: 6000,
        pendingPayments: 45000,
        overdueInvoices: 3,
        statusBreakdown: {
            draft: 5,
            confirmed: 18,
            cancelled: 2
        },
        paymentStatusBreakdown: {
            pending: 8,
            partial: 5,
            paid: 12
        },
        topCustomers: [
            {
                customerId: 'customer1',
                customerName: 'ABC Corp',
                totalAmount: 25000,
                invoiceCount: 5
            },
            {
                customerId: 'customer2',
                customerName: 'XYZ Ltd',
                totalAmount: 20000,
                invoiceCount: 4
            }
        ],
        salesTrend: [
            { date: new Date('2024-01-01'), amount: 10000 },
            { date: new Date('2024-01-02'), amount: 15000 },
            { date: new Date('2024-01-03'), amount: 12000 }
        ],
        period: {
            from: new Date('2024-01-01'),
            to: new Date('2024-01-31')
        }
    };

    beforeEach(async () => {
        const salesInvoiceServiceSpy = jasmine.createSpyObj('SalesInvoiceService', [
            'getStatistics',
            'exportStatistics'
        ]);
        const authServiceSpy = jasmine.createSpyObj('AuthService', [], {
            currentUser: { role: 'admin', name: 'Test User' }
        });
        const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
        const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

        await TestBed.configureTestingModule({
            imports: [
                InvoiceStatisticsComponent,
                ReactiveFormsModule,
                NoopAnimationsModule,
                MatCardModule,
                MatButtonModule,
                MatIconModule,
                MatDatepickerModule,
                MatNativeDateModule,
                MatInputModule,
                MatSelectModule
            ],
            providers: [
                { provide: SalesInvoiceService, useValue: salesInvoiceServiceSpy },
                { provide: AuthService, useValue: authServiceSpy },
                { provide: Router, useValue: routerSpy },
                { provide: MatSnackBar, useValue: snackBarSpy }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(InvoiceStatisticsComponent);
        component = fixture.componentInstance;
        mockSalesInvoiceService = TestBed.inject(SalesInvoiceService) as jasmine.SpyObj<SalesInvoiceService>;
        mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
        mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
        mockSnackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;

        // Setup default mock responses
        mockSalesInvoiceService.getStatistics.and.returnValue(of({
            success: true,
            data: mockStatistics
        }));
    });

    beforeEach(() => {
        fixture.detectChanges();
    });

    describe('Component Initialization', () => {
        it('should create', () => {
            expect(component).toBeTruthy();
        });

        it('should initialize date range form with current month', () => {
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            expect(component.dateRangeForm.get('dateFrom')?.value).toEqual(firstDay);
            expect(component.dateRangeForm.get('dateTo')?.value).toEqual(lastDay);
        });

        it('should load statistics on init', () => {
            expect(mockSalesInvoiceService.getStatistics).toHaveBeenCalled();
            expect(component.statistics$.value).toEqual(mockStatistics);
        });

        it('should check permissions correctly for admin user', () => {
            expect(component.canViewStatistics).toBe(true);
            expect(component.canExportStatistics).toBe(true);
        });
    });

    describe('Statistics Loading', () => {
        it('should load statistics with date range', () => {
            const dateFrom = new Date('2024-01-01');
            const dateTo = new Date('2024-01-31');

            component.dateRangeForm.patchValue({ dateFrom, dateTo });
            component.loadStatistics();

            expect(mockSalesInvoiceService.getStatistics).toHaveBeenCalledWith({
                dateFrom,
                dateTo
            });
        });

        it('should handle statistics loading error', () => {
            const error = { userMessage: 'Failed to load statistics' };
            mockSalesInvoiceService.getStatistics.and.returnValue(throwError(() => error));

            component.loadStatistics();

            expect(component.isLoading).toBe(false);
            expect(component.error).toBe('Failed to load statistics');
        });

        it('should refresh statistics', () => {
            spyOn(component, 'loadStatistics');

            component.refreshStatistics();

            expect(component.loadStatistics).toHaveBeenCalled();
        });
    });

    describe('Date Range Handling', () => {
        it('should apply date range filter', () => {
            const dateFrom = new Date('2024-02-01');
            const dateTo = new Date('2024-02-29');

            component.dateRangeForm.patchValue({ dateFrom, dateTo });
            component.applyDateRange();

            expect(mockSalesInvoiceService.getStatistics).toHaveBeenCalledWith({
                dateFrom,
                dateTo
            });
        });

        it('should set predefined date ranges', () => {
            component.setDateRange('thisMonth');

            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            expect(component.dateRangeForm.get('dateFrom')?.value).toEqual(firstDay);
            expect(component.dateRangeForm.get('dateTo')?.value).toEqual(lastDay);
        });

        it('should set last month date range', () => {
            component.setDateRange('lastMonth');

            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);

            expect(component.dateRangeForm.get('dateFrom')?.value).toEqual(firstDay);
            expect(component.dateRangeForm.get('dateTo')?.value).toEqual(lastDay);
        });

        it('should set this year date range', () => {
            component.setDateRange('thisYear');

            const today = new Date();
            const firstDay = new Date(today.getFullYear(), 0, 1);
            const lastDay = new Date(today.getFullYear(), 11, 31);

            expect(component.dateRangeForm.get('dateFrom')?.value).toEqual(firstDay);
            expect(component.dateRangeForm.get('dateTo')?.value).toEqual(lastDay);
        });
    });

    describe('Statistics Display', () => {
        it('should format currency correctly', () => {
            const formatted = component.formatCurrency(150000);
            expect(formatted).toContain('150,000');
            expect(formatted).toContain('PKR');
        });

        it('should format percentage correctly', () => {
            const percentage = component.formatPercentage(0.75);
            expect(percentage).toBe('75.00%');
        });

        it('should calculate growth rate correctly', () => {
            const currentValue = 150000;
            const previousValue = 120000;
            const growth = component.calculateGrowthRate(currentValue, previousValue);

            expect(growth).toBeCloseTo(25, 1); // 25% growth
        });

        it('should handle zero previous value in growth calculation', () => {
            const growth = component.calculateGrowthRate(150000, 0);
            expect(growth).toBe(100);
        });

        it('should get correct status color for growth', () => {
            expect(component.getGrowthColor(25)).toBe('primary'); // Positive growth
            expect(component.getGrowthColor(-10)).toBe('warn'); // Negative growth
            expect(component.getGrowthColor(0)).toBe('accent'); // No growth
        });
    });

    describe('Chart Data Preparation', () => {
        it('should prepare sales trend chart data', () => {
            const chartData = component.prepareSalesTrendData(mockStatistics.salesTrend);

            expect(chartData.labels.length).toBe(3);
            expect(chartData.data.length).toBe(3);
            expect(chartData.data[0]).toBe(10000);
            expect(chartData.data[1]).toBe(15000);
            expect(chartData.data[2]).toBe(12000);
        });

        it('should prepare status breakdown chart data', () => {
            const chartData = component.prepareStatusBreakdownData(mockStatistics.statusBreakdown);

            expect(chartData.labels).toEqual(['Draft', 'Confirmed', 'Cancelled']);
            expect(chartData.data).toEqual([5, 18, 2]);
        });

        it('should prepare payment status chart data', () => {
            const chartData = component.preparePaymentStatusData(mockStatistics.paymentStatusBreakdown);

            expect(chartData.labels).toEqual(['Pending', 'Partial', 'Paid']);
            expect(chartData.data).toEqual([8, 5, 12]);
        });

        it('should prepare top customers chart data', () => {
            const chartData = component.prepareTopCustomersData(mockStatistics.topCustomers);

            expect(chartData.labels).toEqual(['ABC Corp', 'XYZ Ltd']);
            expect(chartData.data).toEqual([25000, 20000]);
        });
    });

    describe('Export Functionality', () => {
        it('should export statistics successfully', () => {
            const mockExportResponse = {
                success: true,
                filename: 'statistics.xlsx',
                downloadUrl: 'http://example.com/download/statistics.xlsx',
                format: 'excel' as const,
                size: 1024,
                expiresAt: new Date('2024-01-02')
            };

            mockSalesInvoiceService.exportStatistics.and.returnValue(of(mockExportResponse));

            component.exportStatistics('excel');

            expect(mockSalesInvoiceService.exportStatistics).toHaveBeenCalledWith(
                jasmine.any(Object),
                'excel'
            );
            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Statistics exported successfully',
                'Close',
                { duration: 3000 }
            );
        });

        it('should handle export error', () => {
            const error = { userMessage: 'Export failed' };
            mockSalesInvoiceService.exportStatistics.and.returnValue(throwError(() => error));

            component.exportStatistics('pdf');

            expect(component.isExporting).toBe(false);
            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Export failed',
                'Close',
                { duration: 5000 }
            );
        });
    });

    describe('Navigation', () => {
        it('should navigate to invoice list with status filter', () => {
            component.navigateToInvoices(InvoiceStatus.DRAFT);

            expect(mockRouter.navigate).toHaveBeenCalledWith(['/sales-invoices'], {
                queryParams: { status: InvoiceStatus.DRAFT }
            });
        });

        it('should navigate to invoice list with payment status filter', () => {
            component.navigateToInvoices(undefined, PaymentStatus.PENDING);

            expect(mockRouter.navigate).toHaveBeenCalledWith(['/sales-invoices'], {
                queryParams: { paymentStatus: PaymentStatus.PENDING }
            });
        });

        it('should navigate to customer details', () => {
            const customer = mockStatistics.topCustomers[0];

            component.navigateToCustomer(customer.customerId);

            expect(mockRouter.navigate).toHaveBeenCalledWith(['/customers', customer.customerId]);
        });
    });

    describe('Responsive Behavior', () => {
        it('should detect mobile view correctly', () => {
            // Mock window.innerWidth
            spyOnProperty(window, 'innerWidth').and.returnValue(500);

            component.checkScreenSize();

            expect(component.isMobile).toBe(true);
        });

        it('should detect desktop view correctly', () => {
            spyOnProperty(window, 'innerWidth').and.returnValue(1200);

            component.checkScreenSize();

            expect(component.isMobile).toBe(false);
        });
    });

    describe('Error Handling', () => {
        it('should display error message when statistics fail to load', () => {
            const error = { userMessage: 'Network error' };
            mockSalesInvoiceService.getStatistics.and.returnValue(throwError(() => error));

            component.loadStatistics();

            expect(component.error).toBe('Network error');
            expect(component.isLoading).toBe(false);
        });

        it('should retry loading statistics', () => {
            component.error = 'Previous error';
            spyOn(component, 'loadStatistics');

            component.retryLoad();

            expect(component.error).toBeNull();
            expect(component.loadStatistics).toHaveBeenCalled();
        });
    });

    describe('Accessibility', () => {
        it('should have proper ARIA labels for statistics cards', () => {
            fixture.detectChanges();

            const cards = fixture.nativeElement.querySelectorAll('[role="region"]');
            expect(cards.length).toBeGreaterThan(0);

            cards.forEach((card: HTMLElement) => {
                expect(card.getAttribute('aria-label')).toBeTruthy();
            });
        });

        it('should have keyboard navigation support', () => {
            fixture.detectChanges();

            const buttons = fixture.nativeElement.querySelectorAll('button');
            buttons.forEach((button: HTMLElement) => {
                expect(button.tabIndex).toBeGreaterThanOrEqual(0);
            });
        });
    });

    describe('Performance', () => {
        it('should debounce date range changes', () => {
            spyOn(component, 'loadStatistics');

            // Simulate rapid date changes
            component.dateRangeForm.get('dateFrom')?.setValue(new Date('2024-01-01'));
            component.dateRangeForm.get('dateFrom')?.setValue(new Date('2024-01-02'));
            component.dateRangeForm.get('dateFrom')?.setValue(new Date('2024-01-03'));

            // Should only call loadStatistics once after debounce
            setTimeout(() => {
                expect(component.loadStatistics).toHaveBeenCalledTimes(1);
            }, 350);
        });
    });
});