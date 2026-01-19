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
import { MatTabsModule } from '@angular/material/tabs';
import { ReportService } from '../../services/report.service';
import { ReportParams } from '../../models/report.models';

@Component({
  selector: 'app-purchase-reports',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, MatCardModule, MatIconModule,
    MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatDatepickerModule, MatNativeDateModule, MatProgressSpinnerModule, MatTabsModule
  ],
  templateUrl: './purchase-reports.component.html',
  styleUrl: './purchase-reports.component.scss'
})
export class PurchaseReportsComponent implements OnInit {
  loading = false;
  activeTab = 0;
  startDate: Date | null = null;
  endDate: Date | null = null;

  summary: any = null;
  purchaseByDate: any[] = [];
  purchaseBySupplier: any[] = [];
  purchaseByItem: any[] = [];
  gstBreakdown: any = null;
  supplierWiseGst: any[] = [];

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
      endDate: this.endDate?.toISOString().split('T')[0]
    };

    this.reportService.getPurchaseReport(params).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.summary = response.data.summary || this.getDefaultSummary();
          this.purchaseByDate = response.data.byDate || [];
          this.purchaseBySupplier = response.data.bySupplier || [];
          this.purchaseByItem = response.data.byItem || [];
        } else {
          this.setDefaultData();
        }
        this.loadGstData(params);
      },
      error: () => {
        this.setDefaultData();
        this.loading = false;
      }
    });
  }

  loadGstData(params: ReportParams): void {
    this.reportService.getPurchaseGstBreakdown(params).subscribe({
      next: (res) => { this.gstBreakdown = res.data || null; },
      error: () => { this.gstBreakdown = null; }
    });

    this.reportService.getSupplierWiseGst(params).subscribe({
      next: (res) => { 
        this.supplierWiseGst = res.data || []; 
        this.loading = false;
      },
      error: () => { 
        this.supplierWiseGst = []; 
        this.loading = false;
      }
    });
  }

  setDefaultData(): void {
    this.summary = this.getDefaultSummary();
    this.purchaseByDate = [];
    this.purchaseBySupplier = [];
    this.purchaseByItem = [];
  }

  getDefaultSummary(): any {
    return { totalPurchases: 0, totalInvoices: 0, gst4Total: 0, gst18Total: 0, netPurchases: 0 };
  }

  applyFilters(): void { this.loadReport(); }

  resetFilters(): void {
    const today = new Date();
    this.startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    this.endDate = today;
    this.loadReport();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(value || 0);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-PK').format(value || 0);
  }
}
