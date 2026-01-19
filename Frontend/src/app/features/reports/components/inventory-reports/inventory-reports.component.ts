import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { ReportService } from '../../services/report.service';

@Component({
  selector: 'app-inventory-reports',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, MatCardModule, MatIconModule,
    MatButtonModule, MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule, MatTabsModule
  ],
  templateUrl: './inventory-reports.component.html',
  styleUrl: './inventory-reports.component.scss'
})
export class InventoryReportsComponent implements OnInit {
  loading = false;
  activeTab = 0;
  categoryFilter = '';

  summary: any = null;
  stockByCategory: any[] = [];
  stockByWarehouse: any[] = [];
  lowStockItems: any[] = [];
  expiringBatches: any[] = [];
  inventoryTurnover: any = null;

  constructor(private reportService: ReportService) {}

  ngOnInit(): void {
    this.loadReport();
  }

  loadReport(): void {
    this.loading = true;
    const params = this.categoryFilter ? { categoryId: this.categoryFilter } : {};

    this.reportService.getInventoryReport(params).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.summary = response.data.summary || this.getDefaultSummary();
          this.stockByCategory = response.data.byCategory || [];
          this.stockByWarehouse = response.data.byWarehouse || [];
          this.lowStockItems = response.data.lowStockItems || [];
          this.expiringBatches = response.data.expiringBatches || [];
        } else {
          this.setDefaultData();
        }
        this.loadTurnover();
      },
      error: () => {
        this.setDefaultData();
        this.loading = false;
      }
    });
  }

  loadTurnover(): void {
    this.reportService.getInventoryTurnover({}).subscribe({
      next: (res) => { 
        this.inventoryTurnover = res.data || null; 
        this.loading = false;
      },
      error: () => { 
        this.inventoryTurnover = null;
        this.loading = false;
      }
    });
  }

  setDefaultData(): void {
    this.summary = this.getDefaultSummary();
    this.stockByCategory = [];
    this.stockByWarehouse = [];
    this.lowStockItems = [];
    this.expiringBatches = [];
  }

  getDefaultSummary(): any {
    return { totalItems: 0, totalStock: 0, lowStockCount: 0, outOfStockCount: 0, totalValue: 0 };
  }

  applyFilters(): void { this.loadReport(); }
  resetFilters(): void { this.categoryFilter = ''; this.loadReport(); }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(value || 0);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-PK').format(value || 0);
  }
}
