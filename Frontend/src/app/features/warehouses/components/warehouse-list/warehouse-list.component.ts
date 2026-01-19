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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { WarehouseService, Warehouse, WarehouseQueryParams } from '../../services/warehouse.service';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-warehouse-list',
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
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    MatMenuModule
  ],
  templateUrl: './warehouse-list.component.html',
  styleUrl: './warehouse-list.component.scss'
})
export class WarehouseListComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = ['code', 'name', 'city', 'phone', 'isActive', 'actions'];
  dataSource = new MatTableDataSource<Warehouse>([]);

  searchControl = new FormControl('');
  showInactive = false;

  totalWarehouses = 0;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [10, 25, 50];

  loading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private warehouseService: WarehouseService,
    private toastService: ToastService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadWarehouses();
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
        this.loadWarehouses();
      });
  }

  loadWarehouses(): void {
    this.loading = true;
    this.error = null;

    const params: WarehouseQueryParams = {
      page: this.pageIndex + 1,
      limit: this.pageSize,
      search: this.searchControl.value || undefined,
    };

    if (this.showInactive) {
      params.isActive = false;
    }

    this.warehouseService.getWarehouses(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.dataSource.data = response.data || [];
            this.totalWarehouses = response.pagination?.totalItems || this.dataSource.data.length;
          }
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Failed to load warehouses';
          this.toastService.error(this.error);
          this.loading = false;
        }
      });
  }

  onPageChange(event: any): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.loadWarehouses();
  }

  toggleShowInactive(): void {
    this.pageIndex = 0;
    this.loadWarehouses();
  }

  toggleStatus(warehouse: Warehouse, event: any): void {
    event.stopPropagation();
    const previousStatus = warehouse.isActive;
    warehouse.isActive = !previousStatus;

    this.warehouseService.toggleWarehouseStatus(warehouse._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            const statusText = response.data.isActive ? 'activated' : 'deactivated';
            this.toastService.success(`Warehouse ${statusText} successfully`);
          } else {
            warehouse.isActive = previousStatus;
          }
        },
        error: () => {
          warehouse.isActive = previousStatus;
          this.toastService.error('Failed to toggle warehouse status');
        }
      });
  }

  async deleteWarehouse(warehouse: Warehouse): Promise<void> {
    const confirmed = await this.toastService.confirm(
      `Delete warehouse "${warehouse.name}"? This cannot be undone.`,
      'Delete Warehouse?',
      'Yes, delete',
      'No'
    );

    if (!confirmed) return;

    this.warehouseService.deleteWarehouse(warehouse._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success('Warehouse deleted');
          this.loadWarehouses();
        },
        error: () => {
          this.toastService.error('Failed to delete warehouse');
        }
      });
  }

  getStatusColor(isActive: boolean): string {
    return isActive ? 'primary' : 'warn';
  }
}
