/**
 * Virtual Invoice List Component
 * 
 * This component provides a virtualized list for large datasets to improve performance.
 * It uses Angular CDK's virtual scrolling to render only visible items.
 */

import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, TrackByFunction } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';

import { SalesInvoice, InvoiceStatus, PaymentStatus } from '../../models/sales-invoice.model';

@Component({
    selector: 'app-virtual-invoice-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ScrollingModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatMenuModule,
        RouterModule
    ],
    template: `
    <cdk-virtual-scroll-viewport 
      [itemSize]="itemSize"
      [minBufferPx]="minBufferPx"
      [maxBufferPx]="maxBufferPx"
      class="virtual-scroll-viewport">
      
      <div *cdkVirtualFor="let invoice of invoices; trackBy: trackByFn; templateCacheSize: 20" 
           class="invoice-card">
        <mat-card (click)="onInvoiceClick(invoice)" class="invoice-card-content">
          <mat-card-header>
            <div class="card-header">
              <div class="invoice-number">
                <a [routerLink]="['/sales-invoices/detail', invoice._id]" 
                   class="invoice-link"
                   (click)="$event.stopPropagation()">
                  {{ invoice.invoiceNumber }}
                </a>
              </div>
              <div class="status-chips">
                <mat-chip [class]="'status-' + invoice.status" class="status-chip">
                  {{ getStatusLabel(invoice.status) }}
                </mat-chip>
                <mat-chip [class]="'payment-' + invoice.payment.paymentStatus" class="payment-chip">
                  {{ getPaymentStatusLabel(invoice.payment.paymentStatus) }}
                </mat-chip>
              </div>
            </div>
          </mat-card-header>
          
          <mat-card-content>
            <div class="card-details">
              <div class="detail-row">
                <span class="label">Customer:</span>
                <span class="value">{{ invoice.customer?.name || 'N/A' }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Date:</span>
                <span class="value">{{ invoice.invoiceDate | date:'dd/MM/yyyy' }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Due Date:</span>
                <span class="value" [class]="getDueDateClass(invoice.dueDate)">
                  {{ invoice.dueDate | date:'dd/MM/yyyy' }}
                </span>
              </div>
              <div class="detail-row">
                <span class="label">Amount:</span>
                <span class="value amount">
                  {{ invoice.totals.grandTotal | currency:'PKR':'symbol':'1.2-2' }}
                </span>
              </div>
            </div>
          </mat-card-content>
          
          <mat-card-actions>
            <button mat-button 
                    [routerLink]="['/sales-invoices/detail', invoice._id]"
                    (click)="$event.stopPropagation()">
              <mat-icon>visibility</mat-icon>
              View
            </button>
            <button mat-button 
                    [routerLink]="['/sales-invoices/edit', invoice._id]" 
                    *ngIf="canEdit && invoice.status === 'draft'"
                    (click)="$event.stopPropagation()">
              <mat-icon>edit</mat-icon>
              Edit
            </button>
            <button mat-button 
                    [matMenuTriggerFor]="actionMenu"
                    (click)="$event.stopPropagation()">
              <mat-icon>more_vert</mat-icon>
              More
            </button>
            <mat-menu #actionMenu="matMenu">
              <button mat-menu-item 
                      (click)="onConfirmInvoice(invoice)" 
                      *ngIf="canConfirm && invoice.status === 'draft'">
                <mat-icon>check_circle</mat-icon>
                Confirm
              </button>
              <button mat-menu-item 
                      (click)="onCancelInvoice(invoice)" 
                      *ngIf="canCancel && invoice.status !== 'cancelled'">
                <mat-icon>cancel</mat-icon>
                Cancel
              </button>
              <button mat-menu-item 
                      (click)="onRecordPayment(invoice)" 
                      *ngIf="canRecordPayment && invoice.status === 'confirmed'">
                <mat-icon>payment</mat-icon>
                Record Payment
              </button>
              <button mat-menu-item (click)="onPrintInvoice(invoice)">
                <mat-icon>print</mat-icon>
                Print
              </button>
              <button mat-menu-item (click)="onDownloadPDF(invoice)">
                <mat-icon>picture_as_pdf</mat-icon>
                Download PDF
              </button>
            </mat-menu>
          </mat-card-actions>
        </mat-card>
      </div>
    </cdk-virtual-scroll-viewport>
  `,
    styleUrls: ['./virtual-invoice-list.component.scss']
})
export class VirtualInvoiceListComponent {
    @Input() invoices: SalesInvoice[] = [];
    @Input() itemSize = 200; // Height of each item in pixels
    @Input() minBufferPx = 200; // Minimum buffer size
    @Input() maxBufferPx = 400; // Maximum buffer size
    @Input() canEdit = false;
    @Input() canConfirm = false;
    @Input() canCancel = false;
    @Input() canRecordPayment = false;
    @Input() trackByFn: TrackByFunction<SalesInvoice> = (index, item) => item._id;

    @Output() invoiceClick = new EventEmitter<SalesInvoice>();
    @Output() confirmInvoice = new EventEmitter<SalesInvoice>();
    @Output() cancelInvoice = new EventEmitter<SalesInvoice>();
    @Output() recordPayment = new EventEmitter<SalesInvoice>();
    @Output() printInvoice = new EventEmitter<SalesInvoice>();
    @Output() downloadPDF = new EventEmitter<SalesInvoice>();

    onInvoiceClick(invoice: SalesInvoice): void {
        this.invoiceClick.emit(invoice);
    }

    onConfirmInvoice(invoice: SalesInvoice): void {
        this.confirmInvoice.emit(invoice);
    }

    onCancelInvoice(invoice: SalesInvoice): void {
        this.cancelInvoice.emit(invoice);
    }

    onRecordPayment(invoice: SalesInvoice): void {
        this.recordPayment.emit(invoice);
    }

    onPrintInvoice(invoice: SalesInvoice): void {
        this.printInvoice.emit(invoice);
    }

    onDownloadPDF(invoice: SalesInvoice): void {
        this.downloadPDF.emit(invoice);
    }

    getStatusLabel(status: InvoiceStatus): string {
        switch (status) {
            case InvoiceStatus.DRAFT:
                return 'Draft';
            case InvoiceStatus.CONFIRMED:
                return 'Confirmed';
            case InvoiceStatus.CANCELLED:
                return 'Cancelled';
            default:
                return 'Unknown';
        }
    }

    getPaymentStatusLabel(status: PaymentStatus): string {
        switch (status) {
            case PaymentStatus.PENDING:
                return 'Pending';
            case PaymentStatus.PARTIAL:
                return 'Partial';
            case PaymentStatus.PAID:
                return 'Paid';
            default:
                return 'Unknown';
        }
    }

    getDueDateClass(dueDate: Date): string {
        const today = new Date();
        const due = new Date(dueDate);
        const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilDue < 0) {
            return 'overdue';
        } else if (daysUntilDue <= 3) {
            return 'due-soon';
        } else if (daysUntilDue <= 7) {
            return 'due-warning';
        } else {
            return 'normal';
        }
    }
}