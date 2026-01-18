import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil, finalize } from 'rxjs';
import { Chart } from 'chart.js';

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
import { FormsModule } from '@angular/forms';

// Models and services
import { BatchStatistics, StatisticsFilter } from '../../models/batch-statistics.model';
import { BatchStatisticsService } from '../../services/batch-statistics.service';
import { ChartService } from '../../services/chart.service';

@Component({
  selector: 'app-batch-statistics',
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
    FormsModule
  ],
  templateUrl: './batch-statistics.component.html',
  styleUrls: ['./batch-statistics.component.scss']
})
export class BatchStatisticsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('statusChart', { static: false }) statusChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('locationChart', { static: false }) locationChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('supplierChart', { static: false }) supplierChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('expiryTrendChart', { static: false }) expiryTrendChartRef!: ElementRef<HTMLCanvasElement>;

  statistics: BatchStatistics | null = null;
  loading = false;
  error: string | null = null;

  // Date filter
  dateFilter: { start: Date | null; end: Date | null } = { start: null, end: null };

  // Chart instances
  private statusChart: Chart | null = null;
  private locationChart: Chart | null = null;
  private supplierChart: Chart | null = null;
  private expiryTrendChart: Chart | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private batchStatisticsService: BatchStatisticsService,
    private chartService: ChartService,
    private router: Router,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadStatistics();
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
   * Load batch statistics from the API
   */
  loadStatistics(filter?: StatisticsFilter): void {
    this.loading = true;
    this.error = null;

    this.batchStatisticsService.getBatchStatistics(filter)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (statistics) => {
          this.statistics = statistics;
          // Create charts after data is loaded and view is initialized
          setTimeout(() => this.createCharts(), 100);
        },
        error: (error) => {
          console.error('Error loading batch statistics:', error);
          this.error = 'Failed to load batch statistics. Please try again.';
          this.showErrorMessage('Failed to load statistics');
        }
      });
  }

  /**
   * Create all charts
   */
  private createCharts(): void {
    if (!this.statistics) return;

    this.destroyCharts();

    try {
      // Create status distribution chart
      if (this.statusChartRef?.nativeElement && this.statistics.batchesByStatus?.length) {
        this.statusChart = this.chartService.createStatusDistributionChart(
          this.statusChartRef.nativeElement,
          this.statistics.batchesByStatus
        );
      }

      // Create location distribution chart
      if (this.locationChartRef?.nativeElement && this.statistics.batchesByLocation?.length) {
        this.locationChart = this.chartService.createLocationDistributionChart(
          this.locationChartRef.nativeElement,
          this.statistics.batchesByLocation
        );
      }

      // Create supplier value chart
      if (this.supplierChartRef?.nativeElement && this.statistics.valueBySupplier?.length) {
        this.supplierChart = this.chartService.createSupplierValueChart(
          this.supplierChartRef.nativeElement,
          this.statistics.valueBySupplier
        );
      }

      // Create expiry trend chart
      if (this.expiryTrendChartRef?.nativeElement && this.statistics.expiryAnalytics?.expiryTrend?.length) {
        this.expiryTrendChart = this.chartService.createExpiryTrendChart(
          this.expiryTrendChartRef.nativeElement,
          this.statistics.expiryAnalytics.expiryTrend
        );
      }
    } catch (error) {
      console.error('Error creating charts:', error);
      this.showErrorMessage('Failed to create charts');
    }
  }

  /**
   * Destroy all chart instances
   */
  private destroyCharts(): void {
    this.chartService.destroyChart(this.statusChart);
    this.chartService.destroyChart(this.locationChart);
    this.chartService.destroyChart(this.supplierChart);
    this.chartService.destroyChart(this.expiryTrendChart);

    this.statusChart = null;
    this.locationChart = null;
    this.supplierChart = null;
    this.expiryTrendChart = null;
  }

  /**
   * Refresh statistics data
   */
  refreshStatistics(): void {
    this.loadStatistics();
    this.showSuccessMessage('Statistics refreshed');
  }

  /**
   * Get CSS class for FIFO compliance based on percentage
   */
  getFifoComplianceClass(): string {
    if (!this.statistics?.fifoCompliance?.overallCompliance) {
      return 'info';
    }

    const compliance = this.statistics.fifoCompliance.overallCompliance;
    if (compliance >= 90) return 'success';
    if (compliance >= 70) return 'warn';
    return 'danger';
  }

  /**
   * Navigate to expiring batches page
   */
  navigateToExpiringBatches(): void {
    this.router.navigate(['/batches/expiring']);
  }

  /**
   * Navigate to batch list page
   */
  navigateToBatchList(): void {
    this.router.navigate(['/batches/list']);
  }

  /**
   * Export statistics as a report
   */
  exportStatistics(): void {
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
      link.download = `batch-statistics-${new Date().toISOString().split('T')[0]}.csv`;
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
      ['Total Batches', this.statistics.totalBatches.toString()],
      ['Total Inventory Value', this.statistics.totalValue.toString()],
      ['Expired Batches', this.statistics.expiredBatches.toString()],
      ['Low Stock Alerts', this.statistics.lowStockAlerts.toString()],
      ['Average Batch Age (days)', this.statistics.averageBatchAge.toString()],
      ['FIFO Compliance (%)', this.statistics.fifoCompliance?.overallCompliance?.toString() || 'N/A']
    ];

    if (this.statistics.expiryAnalytics) {
      rows.push(
        ['Expiring in 7 days', this.statistics.expiryAnalytics.expiringIn7Days.toString()],
        ['Expiring in 30 days', this.statistics.expiryAnalytics.expiringIn30Days.toString()],
        ['Expiring in 90 days', this.statistics.expiryAnalytics.expiringIn90Days.toString()]
      );
    }

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
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
   * Handle date filter change
   */
  onDateFilterChange(): void {
    // Auto-apply filter when both dates are selected
    if (this.dateFilter.start && this.dateFilter.end) {
      this.applyDateFilter();
    }
  }

  /**
   * Apply date range filter
   */
  applyDateFilter(): void {
    if (!this.dateFilter.start || !this.dateFilter.end) {
      this.showErrorMessage('Please select both start and end dates');
      return;
    }

    if (this.dateFilter.start > this.dateFilter.end) {
      this.showErrorMessage('Start date must be before end date');
      return;
    }

    const filter: StatisticsFilter = {
      dateRange: {
        start: this.dateFilter.start,
        end: this.dateFilter.end
      }
    };

    this.loadStatistics(filter);
    this.showSuccessMessage('Date filter applied');
  }

  /**
   * Clear date filter
   */
  clearDateFilter(): void {
    this.dateFilter = { start: null, end: null };
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
      case 'year':
        start.setFullYear(now.getFullYear(), 0, 1);
        break;
      default:
        return;
    }

    this.dateFilter = { start, end: now };
    this.applyDateFilter();
  }

  /**
   * Drill down to batch list filtered by status
   */
  drillDownToStatus(): void {
    this.router.navigate(['/batches/list'], {
      queryParams: { view: 'status' }
    });
  }

  /**
   * Drill down to batch list grouped by location
   */
  drillDownToLocation(): void {
    this.router.navigate(['/batches/list'], {
      queryParams: { view: 'location' }
    });
  }

  /**
   * Drill down to batch list filtered by supplier
   */
  drillDownToSupplier(): void {
    this.router.navigate(['/batches/list'], {
      queryParams: { view: 'supplier' }
    });
  }

  /**
   * Drill down to expiring batches
   */
  drillDownToExpiring(): void {
    this.router.navigate(['/batches/expiring']);
  }
}