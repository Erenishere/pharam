import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { SalesmanService, SalesmanInvoice } from '../../../../core/services/salesman.service';

@Component({
    selector: 'app-sales-history',
    standalone: true,
    imports: [CommonModule, MatCardModule, MatTableModule, MatIconModule, MatButtonModule],
    template: `
    <div class="p-4">
      <mat-card class="pos-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>history</mat-icon>
          <mat-card-title>My Sales History</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <table mat-table [dataSource]="invoices" class="w-full">
            <ng-container matColumnDef="invoice">
              <th mat-header-cell *matHeaderCellDef>Invoice #</th>
              <td mat-cell *matCellDef="let inv">{{inv.invoiceNumber}}</td>
            </ng-container>
            <ng-container matColumnDef="customer">
              <th mat-header-cell *matHeaderCellDef>Customer</th>
              <td mat-cell *matCellDef="let inv">{{inv.customerId.name}}</td>
            </ng-container>
            <ng-container matColumnDef="amount">
              <th mat-header-cell *matHeaderCellDef>Amount</th>
              <td mat-cell *matCellDef="let inv">{{inv.totals.grandTotal | currency:'PKR'}}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let inv">
                <span class="badge" [ngClass]="inv.status">{{inv.status}}</span>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="['invoice', 'customer', 'amount', 'status']"></tr>
            <tr mat-row *matRowDef="let row; columns: ['invoice', 'customer', 'amount', 'status'];"></tr>
          </table>
        </mat-card-content>
      </mat-card>
    </div>
  `,
    styles: [`
    .w-full { width: 100%; }
    .badge { padding: 4px 8px; border-radius: 4px; text-transform: capitalize; font-size: 12px; }
    .confirmed { background: rgba(40, 199, 111, 0.12); color: #28c76f; }
    .pending { background: rgba(255, 159, 67, 0.12); color: #ff9f43; }
  `]
})
export class SalesHistoryComponent implements OnInit {
    invoices: SalesmanInvoice[] = [];
    constructor(private salesmanService: SalesmanService) { }
    ngOnInit(): void {
        this.salesmanService.getMyInvoices().subscribe(res => this.invoices = res.data);
    }
}
