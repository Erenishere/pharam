import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { StockMovementService } from '../services/stock-movement.service';
import { ItemService } from '../../items/services/item.service';
import { ToastService } from '../../../shared/services/toast.service';
import { StockMovement, StockMovementStatistics, LowStockItem, StockMovementQueryParams } from '../models/stock-movement.model';

@Component({
  selector: 'app-stock-movements',
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
    MatNativeDateModule,
    MatTabsModule,
    MatCardModule
  ],
  templateUrl: './stock-movements.component.html',
  styleUrl: './stock-movements.component.scss'
})
export class StockMovementsComponent implements OnInit, OnDestroy {
  activeTab = 0;

  movementColumns = ['createdAt', 'itemName', 'movementType', 'referenceType', 'quantity', 'previousStock', 'newStock', 'reason'];
  lowStockColumns = ['code', 'name', 'currentStock', 'minimumStock', 'daysUntilStockout', 'actions'];

  movementsDataSource = new MatTableDataSource<StockMovement>([]);
  lowStockDataSource = new MatTableDataSource<LowStockItem>([]);

  loading = false;
  showAdjustmentForm = false;

  adjustmentForm!: FormGroup;
  items: any[] = [];

  searchControl = new FormControl('');
  dateFrom: Date | null = null;
  dateTo: Date | null = null;
  selectedMovementType = '';
  selectedReferenceType = '';

  totalMovements = 0;
  pageSize = 10;
  pageIndex = 0;

  statistics: StockMovementStatistics = {
    totalIn: 0,
    totalOut: 0,
    totalAdjustments: 0,
    netChange: 0,
    movementCount: 0
  };

  movementTypes = [
    { value: '', label: 'All Types' },
    { value: 'in', label: 'Stock In' },
    { value: 'out', label: 'Stock Out' },
    { value: 'adjustment', label: 'Adjustment' },
    { value: 'transfer', label: 'Transfer' }
  ];

  referenceTypes = [
    { value: '', label: 'All References' },
    { value: 'purchase', label: 'Purchase' },
    { value: 'sale', label: 'Sale' },
    { value: 'return', label: 'Return' },
    { value: 'adjustment', label: 'Adjustment' },
    { value: 'correction', label: 'Correction' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private stockMovementService: StockMovementService,
    private itemService: ItemService,
    private toastService: ToastService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadData();
    this.loadItems();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.adjustmentForm = this.fb.group({
      itemId: ['', Validators.required],
      adjustmentType: ['adjustment', Validators.required],
      quantity: [0, Validators.required],
      actualStock: [0],
      reason: ['', Validators.required]
    });
  }

  private setupSearch(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.pageIndex = 0;
        this.loadMovements();
      });
  }

  loadData(): void {
    this.loadMovements();
    this.loadStatistics();
    this.loadLowStockItems();
  }

  loadMovements(): void {
    this.loading = true;
    const params: StockMovementQueryParams = {
      page: this.pageIndex + 1,
      limit: this.pageSize
    };
    if (this.dateFrom) params.startDate = this.dateFrom.toISOString();
    if (this.dateTo) params.endDate = this.dateTo.toISOString();
    if (this.selectedMovementType) params.movementType = this.selectedMovementType;
    if (this.selectedReferenceType) params.referenceType = this.selectedReferenceType;

    this.stockMovementService.getMovements(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.movementsDataSource.data = response.data || [];
          this.totalMovements = response.pagination?.totalItems || 0;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.toastService.error('Failed to load stock movements');
        }
      });
  }

  loadStatistics(): void {
    const startDate = this.dateFrom?.toISOString();
    const endDate = this.dateTo?.toISOString();

    this.stockMovementService.getStatistics(startDate, endDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.statistics = response.data;
          }
        }
      });
  }

  loadLowStockItems(): void {
    this.stockMovementService.getLowStockItems()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.lowStockDataSource.data = response.data || [];
        }
      });
  }

  loadItems(): void {
    this.itemService.getItems({ isActive: true, limit: 500 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.items = response.data || [];
        }
      });
  }

  onFilterChange(): void {
    this.pageIndex = 0;
    this.loadMovements();
    this.loadStatistics();
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.dateFrom = null;
    this.dateTo = null;
    this.selectedMovementType = '';
    this.selectedReferenceType = '';
    this.pageIndex = 0;
    this.loadData();
  }

  openAdjustmentForm(): void {
    this.adjustmentForm.reset({
      adjustmentType: 'adjustment',
      quantity: 0
    });
    this.showAdjustmentForm = true;
  }

  saveAdjustment(): void {
    if (this.adjustmentForm.invalid) {
      this.toastService.error('Please fill all required fields');
      return;
    }

    const formValue = this.adjustmentForm.value;
    const request$ = formValue.adjustmentType === 'correction'
      ? this.stockMovementService.recordCorrection({
          itemId: formValue.itemId,
          actualStock: formValue.actualStock,
          reason: formValue.reason
        })
      : this.stockMovementService.recordAdjustment({
          itemId: formValue.itemId,
          quantity: formValue.quantity,
          reason: formValue.reason
        });

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.success('Stock adjustment recorded successfully');
          this.showAdjustmentForm = false;
          this.loadData();
        }
      },
      error: (error) => {
        this.toastService.error(error.message || 'Failed to record adjustment');
      }
    });
  }

  cancelForm(): void {
    this.showAdjustmentForm = false;
  }

  onPageChange(event: any): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.loadMovements();
  }

  getMovementTypeColor(type: string): string {
    const colors: { [key: string]: string } = {
      'in': 'primary',
      'out': 'warn',
      'adjustment': 'accent',
      'transfer': 'primary'
    };
    return colors[type] || '';
  }

  getMovementTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'in': 'arrow_downward',
      'out': 'arrow_upward',
      'adjustment': 'swap_vert',
      'transfer': 'swap_horiz'
    };
    return icons[type] || 'help';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatNumber(num: number): string {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return new Intl.NumberFormat('en-PK').format(num);
  }
}
