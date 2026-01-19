import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { ReportService } from '../../services/report.service';

@Component({
  selector: 'app-warehouse-reports',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule, MatTabsModule],
  templateUrl: './warehouse-reports.component.html',
  styleUrl: './warehouse-reports.component.scss'
})
export class WarehouseReportsComponent implements OnInit {
  loading = false;
  activeTab = 0;

  warehouseStock: any = null;

  constructor(private reportService: ReportService) {}

  ngOnInit(): void {
    this.loadReport();
  }

  loadReport(): void {
    this.loading = true;
    this.reportService.getWarehouseStockReport({}).subscribe({
      next: (res) => { this.warehouseStock = res.data || null; this.loading = false; },
      error: () => { this.warehouseStock = null; this.loading = false; }
    });
  }

  formatCurrency(value: number): string { return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(value || 0); }
  formatNumber(value: number): string { return new Intl.NumberFormat('en-PK').format(value || 0); }
}
