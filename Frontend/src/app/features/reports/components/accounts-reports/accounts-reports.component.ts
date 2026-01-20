import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatInputModule } from '@angular/material/input';
import { ReportService } from '../../services/report.service';
import { ReportParams } from '../../models/report.models';

@Component({
  selector: 'app-accounts-reports',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MatCardModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatDatepickerModule, MatNativeDateModule, MatProgressSpinnerModule, MatTabsModule, MatInputModule],
  templateUrl: './accounts-reports.component.html',
  styleUrl: './accounts-reports.component.scss'
})
export class AccountsReportsComponent implements OnInit {
  loading = false;
  activeTab = 0;
  startDate: Date | null = null;
  endDate: Date | null = null;

  agingReport: any = null;
  pendingCheques: any[] = [];
  collectionEfficiency: any = null;

  constructor(private reportService: ReportService) {}

  ngOnInit(): void {
    const today = new Date();
    this.startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    this.endDate = today;
    this.loadReport();
  }

  loadReport(): void {
    this.loading = true;
    const params: ReportParams = { startDate: this.startDate?.toISOString().split('T')[0], endDate: this.endDate?.toISOString().split('T')[0] };

    this.reportService.getAgingReport(params).subscribe({
      next: (res) => { this.agingReport = res.data || null; },
      error: () => { this.agingReport = null; }
    });

    this.reportService.getPendingCheques(params).subscribe({
      next: (res) => { this.pendingCheques = res.data || []; },
      error: () => { this.pendingCheques = []; }
    });

    this.reportService.getCollectionEfficiency(params).subscribe({
      next: (res) => { this.collectionEfficiency = res.data || null; this.loading = false; },
      error: () => { this.collectionEfficiency = null; this.loading = false; }
    });
  }

  applyFilters(): void { this.loadReport(); }
  resetFilters(): void { const today = new Date(); this.startDate = new Date(today.getFullYear(), today.getMonth(), 1); this.endDate = today; this.loadReport(); }
  formatCurrency(value: number): string { return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(value || 0); }
  formatNumber(value: number): string { return new Intl.NumberFormat('en-PK').format(value || 0); }
}
