import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { ReportService } from '../../services/report.service';
import { ReportParams } from '../../models/report.models';

@Component({
  selector: 'app-sales-reports',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, MatCardModule, MatIconModule,
    MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatDatepickerModule, MatNativeDateModule, MatProgressSpinnerModule,
    MatTableModule, MatTabsModule
  ],
  templateUrl: './sales-reports.component.html',
  styleUrl: './sales-reports.component.scss'
})
export class SalesReportsComponent implements OnInit {
  loading = false;
  activeTab = 0;
  startDate: Date | null = null;
  endDate: Date | null = null;
  groupBy = 'date';

  summary: any = null;
  salesByDate: any[] = [];
  salesByCustomer: any[] = [];
  salesByItem: any[] = [];
  salesBySalesman: any[] = [];
  topCustomers: any[] = [];
  salesTrends: any[] = [];

  constructor(private reportService: ReportService) {}

  ngOnInit(): void {
    const today = new Date();
    this.startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    this.endDate = today;
    this.loadReport();
  }

  loadReport(): void {
    this.loading = true;
    const params: ReportParams = {
      startDate: this.startDate?.toISOString().split('T')[0],
      endDate: this.endDate?.toISOString().split('T')[0],
      groupBy: this.groupBy
    };

    this.reportService.getSalesReport(params).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.summary = response.data.summary || this.getDefaultSummary();
          this.salesByDate = response.data.byDate || [];
          this.salesByCustomer = response.data.byCustomer || [];
          this.salesByItem = response.data.byItem || [];
          this.salesBySalesman = response.data.bySalesman || [];
        } else {
          this.setDefaultData();
        }
        this.loadAdditionalData(params);
      },
      error: () => {
        this.setDefaultData();
        this.loading = false;
      }
    });
  }

  loadAdditionalData(params: ReportParams): void {
    this.reportService.getTopCustomers(params).subscribe({
      next: (res) => { this.topCustomers = res.data || []; },
      error: () => { this.topCustomers = []; }
    });

    this.reportService.getSalesTrends(params).subscribe({
      next: (res) => { 
        this.salesTrends = res.data || []; 
        this.loading = false;
      },
      error: () => { 
        this.salesTrends = []; 
        this.loading = false;
      }
    });
  }

  setDefaultData(): void {
    this.summary = this.getDefaultSummary();
    this.salesByDate = [];
    this.salesByCustomer = [];
    this.salesByItem = [];
    this.salesBySalesman = [];
  }

  getDefaultSummary(): any {
    return {
      totalSales: 0,
      totalInvoices: 0,
      totalDiscount: 0,
      totalTax: 0,
      netSales: 0,
      averageOrderValue: 0
    };
  }

  applyFilters(): void {
    this.loadReport();
  }

  resetFilters(): void {
    const today = new Date();
    this.startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    this.endDate = today;
    this.groupBy = 'date';
    this.loadReport();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(value || 0);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-PK').format(value || 0);
  }
}
