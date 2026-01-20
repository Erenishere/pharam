import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { InvoiceService } from '../../services/invoice.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { Invoice, InvoiceStatistics, InvoiceQueryParams } from '../../models/invoice.model';

@Component({
  selector: 'app-purchase-invoice-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    MatMenuModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './purchase-invoice-list.component.html',
  styleUrl: './purchase-invoice-list.component.scss'
})
export class PurchaseInvoiceListComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = ['invoiceNumber', 'supplierBillNo', 'supplierName', 'invoiceDate', 'totals', 'status', 'paymentStatus', 'actions'];
  dataSource = new MatTableDataSource<Invoice>([]);

  searchControl = new FormControl('');
  selectedStatus: string = '';
  selectedPaymentStatus: string = '';
  dateFrom: Date | null = null;
  dateTo: Date | null = null;

  totalInvoices = 0;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [10, 25, 50, 100];

  loading = false;
  error: string | null = null;
  statistics: InvoiceStatistics | null = null;

  statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'paid', label: 'Paid' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  paymentStatusOptions = [
    { value: '', label: 'All Payment Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'partial', label: 'Partial' },
    { value: 'paid', label: 'Paid' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private invoiceService: InvoiceService,
    private toastService: ToastService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadInvoices();
    this.loadStatistics();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.pageIndex = 0;
        this.loadInvoices();
      });
  }

  loadInvoices(): void {
    this.loading = true;
    this.error = null;

    const params: InvoiceQueryParams = {
      page: this.pageIndex + 1,
      limit: this.pageSize,
      search: this.searchControl.value || undefined,
    };

    if (this.selectedStatus) {
      params.status = this.selectedStatus;
    }
    if (this.selectedPaymentStatus) {
      params.paymentStatus = this.selectedPaymentStatus;
    }
    if (this.dateFrom) {
      params.dateFrom = this.dateFrom.toISOString();
    }
    if (this.dateTo) {
      params.dateTo = this.dateTo.toISOString();
    }

    this.invoiceService.getPurchaseInvoices(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.dataSource.data = response.data || [];
            this.totalInvoices = response.pagination?.totalItems || this.dataSource.data.length;
          }
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Failed to load purchase invoices';
          this.toastService.error(this.error);
          this.loading = false;
        }
      });
  }

  loadStatistics(): void {
    this.invoiceService.getPurchaseStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.statistics = response.data;
          }
        }
      });
  }

  onPageChange(event: any): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.loadInvoices();
  }

  onFilterChange(): void {
    this.pageIndex = 0;
    this.loadInvoices();
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.selectedStatus = '';
    this.selectedPaymentStatus = '';
    this.dateFrom = null;
    this.dateTo = null;
    this.pageIndex = 0;
    this.loadInvoices();
  }

  confirmInvoice(invoice: Invoice): void {
    this.invoiceService.confirmPurchaseInvoice(invoice._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success('Invoice confirmed. Stock updated.');
            this.loadInvoices();
            this.loadStatistics();
          }
        },
        error: () => {
          this.toastService.error('Failed to confirm invoice');
        }
      });
  }

  markAsPaid(invoice: Invoice): void {
    this.invoiceService.markPurchaseInvoicePaid(invoice._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success('Invoice marked as paid');
            this.loadInvoices();
            this.loadStatistics();
          }
        },
        error: () => {
          this.toastService.error('Failed to mark invoice as paid');
        }
      });
  }

  async cancelInvoice(invoice: Invoice): Promise<void> {
    const confirmed = await this.toastService.confirm(
      `Cancel invoice ${invoice.invoiceNumber}? This will reverse any stock changes.`,
      'Cancel Invoice?',
      'Yes, cancel',
      'No'
    );

    if (!confirmed) return;

    this.invoiceService.cancelPurchaseInvoice(invoice._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success('Invoice cancelled');
            this.loadInvoices();
            this.loadStatistics();
          }
        },
        error: () => {
          this.toastService.error('Failed to cancel invoice');
        }
      });
  }

  async deleteInvoice(invoice: Invoice): Promise<void> {
    if (invoice.status !== 'draft') {
      this.toastService.error('Only draft invoices can be deleted');
      return;
    }

    const confirmed = await this.toastService.confirm(
      `Delete invoice ${invoice.invoiceNumber}? This cannot be undone.`,
      'Delete Invoice?',
      'Yes, delete',
      'No'
    );

    if (!confirmed) return;

    this.invoiceService.deletePurchaseInvoice(invoice._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success('Invoice deleted');
          this.loadInvoices();
          this.loadStatistics();
        },
        error: () => {
          this.toastService.error('Failed to delete invoice');
        }
      });
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'draft': 'accent',
      'confirmed': 'primary',
      'paid': 'primary',
      'cancelled': 'warn'
    };
    return colors[status] || '';
  }

  getPaymentStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'pending': 'warn',
      'partial': 'accent',
      'paid': 'primary'
    };
    return colors[status] || '';
  }

  formatCurrency(amount: number): string {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return 'PKR 0';
    }
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-PK');
  }
}
