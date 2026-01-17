import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { SalesmanService, CommissionData } from '../../../../core/services/salesman.service';

@Component({
    selector: 'app-commission',
    standalone: true,
    imports: [CommonModule, MatCardModule, MatIconModule],
    template: `
    <div class="p-4">
      <mat-card class="pos-card overflow-hidden">
        <mat-card-header class="bg-primary text-white p-4 m-0">
          <mat-icon mat-card-avatar>payments</mat-icon>
          <mat-card-title>Commission Tracker</mat-card-title>
        </mat-card-header>
        <mat-card-content class="p-4">
          <div class="commission-stats grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div class="stat-box">
              <span class="label">Total Commission (This Period)</span>
              <span class="value">{{(commission?.totalCommission || 0) | currency:'PKR'}}</span>
            </div>
            <div class="stat-box">
              <span class="label">Commission Rate</span>
              <span class="value">{{commission?.commissionRate}}%</span>
            </div>
          </div>
          
          <h3 class="mt-6 mb-2 font-bold">Earnings Breakdown</h3>
          <p class="text-gray-500 italic">Historical details from {{commission?.period?.startDate | date}} to {{commission?.period?.endDate | date}}</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
    styles: [`
    .bg-primary { background-color: #867cf0; }
    .text-white { color: white; }
    .stat-box { padding: 1.5rem; border: 1px solid #eee; border-radius: 8px; background: #fdfdff; }
    .stat-box .label { display: block; font-size: 0.875rem; color: #6e6b7b; }
    .stat-box .value { display: block; font-size: 1.5rem; font-weight: 700; color: #867cf0; margin-top: 0.5rem; }
  `]
})
export class CommissionComponent implements OnInit {
    commission: CommissionData | null = null;
    constructor(private salesmanService: SalesmanService) { }
    ngOnInit(): void {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
        this.salesmanService.getMyCommission(firstDay, lastDay).subscribe(res => this.commission = res.data);
    }
}
