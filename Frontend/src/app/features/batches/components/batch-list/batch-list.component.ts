import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSortModule, MatSort, Sort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, catchError, of } from 'rxjs';

import { Batch, BatchStatus, PaginationParams, BatchResponse, Item, Location } from '../../models/batch.model';
import { BatchFilter } from '../../models/batch-filter.model';
import { BatchService } from '../../services/batch.service';
import { BatchFiltersComponent } from '../batch-filters/batch-filters.component';

export enum ViewMode {
  TABLE = 'table',
  BY_ITEM = 'by-item',
  BY_LOCATION = 'by-location'
}

export interface BatchGroup {
  key: string;
  name: string;
  batches: Batch[];
  totalQuantity: number;
  remainingQuantity: number;
  batchCount: number;
  expanded?: boolean;
}

@Component({
  selector: 'app-batch-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatTooltipModule,
    MatButtonToggleModule,
    MatExpansionModule,
    RouterModule,
    BatchFiltersComponent
  ],
  template: `
    <div class="batch-list-container">
      <div class="batch-header">
        <h1>Batch Management</h1>
        <button mat-raised-button color="primary" routerLink="/batches/create">
          <mat-icon>add</mat-icon>
          Add New Batch
        </button>
      </div>

      <!-- Filters Component -->
      <app-batch-filters 
        [initialFilters]="currentFilters"
        (filtersChanged)="onFiltersChanged($event)">
      </app-batch-filters>

      <!-- View Mode Toggle -->
      <div class="view-mode-container">
        <mat-button-toggle-group 
          [value]="currentViewMode" 
          (change)="onViewModeChange($event.value)"
          class="view-mode-toggle">
          <mat-button-toggle [value]="ViewMode.TABLE">
            <mat-icon>table_view</mat-icon>
            Table View
          </mat-button-toggle>
          <mat-button-toggle [value]="ViewMode.BY_ITEM">
            <mat-icon>inventory_2</mat-icon>
            View by Item
          </mat-button-toggle>
          <mat-button-toggle [value]="ViewMode.BY_LOCATION">
            <mat-icon>location_on</mat-icon>
            View by Location
          </mat-button-toggle>
        </mat-button-toggle-group>
      </div>

      <!-- Table View -->
      <mat-card *ngIf="currentViewMode === ViewMode.TABLE" class="table-card">
        <mat-card-content>
          <div class="table-container">
            <table mat-table [dataSource]="dataSource" matSort class="batch-table" (matSortChange)="onSortChange($event)">
              
              <!-- Batch Number Column -->
              <ng-container matColumnDef="batchNumber">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Batch Number</th>
                <td mat-cell *matCellDef="let batch">
                  <a [routerLink]="['/batches/detail', batch._id]" class="batch-link">
                    {{ batch.batchNumber }}
                  </a>
                </td>
              </ng-container>

              <!-- Item Column -->
              <ng-container matColumnDef="item">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Item</th>
                <td mat-cell *matCellDef="let batch">
                  <div class="item-info">
                    <div class="item-name">{{ batch.item?.name || 'N/A' }}</div>
                    <div class="item-code">{{ batch.item?.code || 'N/A' }}</div>
                  </div>
                </td>
              </ng-container>

              <!-- Quantity Column -->
              <ng-container matColumnDef="quantity">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Quantity</th>
                <td mat-cell *matCellDef="let batch">
                  <div class="quantity-info">
                    <div class="remaining">{{ batch.remainingQuantity }}</div>
                    <div class="total">/ {{ batch.quantity }}</div>
                  </div>
                </td>
              </ng-container>

              <!-- Expiry Date Column -->
              <ng-container matColumnDef="expiryDate">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Expiry Date</th>
                <td mat-cell *matCellDef="let batch">
                  <div class="expiry-date" [class]="getExpiryClass(batch.expiryDate)">
                    {{ batch.expiryDate | date:'dd/MM/yyyy' }}
                  </div>
                </td>
              </ng-container>

              <!-- Location Column -->
              <ng-container matColumnDef="location">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Location</th>
                <td mat-cell *matCellDef="let batch">
                  {{ batch.location?.name || 'N/A' }}
                </td>
              </ng-container>

              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
                <td mat-cell *matCellDef="let batch">
                  <mat-chip [class]="'status-' + batch.status">
                    {{ getStatusLabel(batch.status) }}
                  </mat-chip>
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let batch">
                  <button mat-icon-button [routerLink]="['/batches/detail', batch._id]" matTooltip="View Details">
                    <mat-icon>visibility</mat-icon>
                  </button>
                  <button mat-icon-button [routerLink]="['/batches/edit', batch._id]" matTooltip="Edit Batch">
                    <mat-icon>edit</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>

            <!-- Loading Spinner -->
            <div *ngIf="loading" class="loading-container">
              <mat-spinner diameter="50"></mat-spinner>
            </div>

            <!-- No Data Message -->
            <div *ngIf="!loading && dataSource.data.length === 0" class="no-data">
              <mat-icon>inventory_2</mat-icon>
              <p>No batches found</p>
            </div>
          </div>

          <!-- Paginator -->
          <mat-paginator 
            [length]="totalItems"
            [pageSize]="pageSize"
            [pageSizeOptions]="[10, 25, 50, 100]"
            [pageIndex]="currentPage"
            (page)="onPageChange($event)"
            showFirstLastButtons>
          </mat-paginator>
        </mat-card-content>
      </mat-card>

      <!-- Grouped View (By Item or By Location) -->
      <div *ngIf="currentViewMode !== ViewMode.TABLE" class="grouped-view">
        <!-- Loading Spinner for Grouped View -->
        <div *ngIf="loading" class="loading-container">
          <mat-spinner diameter="50"></mat-spinner>
        </div>

        <!-- No Data Message for Grouped View -->
        <div *ngIf="!loading && batchGroups.length === 0" class="no-data">
          <mat-icon>inventory_2</mat-icon>
          <p>No batches found</p>
        </div>

        <!-- Group Expansion Panels -->
        <mat-accordion *ngIf="!loading && batchGroups.length > 0" class="batch-groups">
          <mat-expansion-panel 
            *ngFor="let group of batchGroups; trackBy: trackByGroupKey"
            [expanded]="group.expanded"
            (expandedChange)="onGroupExpandedChange(group, $event)"
            class="batch-group-panel">
            
            <mat-expansion-panel-header>
              <mat-panel-title>
                <div class="group-header">
                  <div class="group-name">
                    <mat-icon>{{ currentViewMode === ViewMode.BY_ITEM ? 'inventory_2' : 'location_on' }}</mat-icon>
                    {{ group.name }}
                  </div>
                  <div class="group-summary">
                    <span class="batch-count">{{ group.batchCount }} batches</span>
                    <span class="quantity-summary">{{ group.remainingQuantity }}/{{ group.totalQuantity }}</span>
                  </div>
                </div>
              </mat-panel-title>
            </mat-expansion-panel-header>

            <!-- Batches within the group -->
            <div class="group-batches">
              <div *ngFor="let batch of group.batches; trackBy: trackByBatchId" class="batch-item">
                <div class="batch-info">
                  <div class="batch-primary">
                    <a [routerLink]="['/batches/detail', batch._id]" class="batch-link">
                      {{ batch.batchNumber }}
                    </a>
                    <mat-chip [class]="'status-' + batch.status" class="batch-status">
                      {{ getStatusLabel(batch.status) }}
                    </mat-chip>
                  </div>
                  
                  <div class="batch-details">
                    <div class="detail-item" *ngIf="currentViewMode === ViewMode.BY_LOCATION">
                      <span class="label">Item:</span>
                      <span class="value">{{ batch.item?.name || 'N/A' }} ({{ batch.item?.code || 'N/A' }})</span>
                    </div>
                    <div class="detail-item" *ngIf="currentViewMode === ViewMode.BY_ITEM">
                      <span class="label">Location:</span>
                      <span class="value">{{ batch.location?.name || 'N/A' }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">Quantity:</span>
                      <span class="value">{{ batch.remainingQuantity }}/{{ batch.quantity }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="label">Expiry:</span>
                      <span class="value expiry-date" [class]="getExpiryClass(batch.expiryDate)">
                        {{ batch.expiryDate | date:'dd/MM/yyyy' }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="batch-actions">
                  <button mat-icon-button [routerLink]="['/batches/detail', batch._id]" matTooltip="View Details">
                    <mat-icon>visibility</mat-icon>
                  </button>
                  <button mat-icon-button [routerLink]="['/batches/edit', batch._id]" matTooltip="Edit Batch">
                    <mat-icon>edit</mat-icon>
                  </button>
                </div>
              </div>
            </div>
          </mat-expansion-panel>
        </mat-accordion>

        <!-- Pagination for Grouped View -->
        <mat-card *ngIf="!loading && batchGroups.length > 0" class="pagination-card">
          <mat-paginator 
            [length]="totalItems"
            [pageSize]="pageSize"
            [pageSizeOptions]="[10, 25, 50, 100]"
            [pageIndex]="currentPage"
            (page)="onPageChange($event)"
            showFirstLastButtons>
          </mat-paginator>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .batch-list-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .batch-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .batch-header h1 {
      margin: 0;
      color: #7367F0;
      font-weight: 600;
    }

    /* View Mode Toggle */
    .view-mode-container {
      margin: 20px 0;
      display: flex;
      justify-content: center;
    }

    .view-mode-toggle {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
      background-color: #ffffff !important;
    }

    .view-mode-toggle .mat-button-toggle {
      border: none;
      border-right: 1px solid #e0e0e0;
      background-color: #ffffff !important;
    }

    .view-mode-toggle .mat-button-toggle:last-child {
      border-right: none;
    }

    .view-mode-toggle .mat-button-toggle .mat-button-toggle-button {
      background-color: #ffffff !important;
      color: #616161 !important; /* Darker gray for better visibility */
      border: none;
    }

    .view-mode-toggle .mat-button-toggle:not(.mat-button-toggle-checked) .mat-button-toggle-button {
      background-color: #ffffff !important;
      color: #616161 !important; /* Ensure inactive buttons have dark gray text */
    }

    .view-mode-toggle .mat-button-toggle:not(.mat-button-toggle-checked) mat-icon {
      color: #616161 !important; /* Ensure inactive icons have dark gray color */
    }

    .view-mode-toggle .mat-button-toggle:not(.mat-button-toggle-checked) .mat-button-toggle-label-content {
      color: #616161 !important; /* Ensure inactive text has dark gray color */
    }

    /* More specific selectors to override Material Design defaults */
    .view-mode-toggle .mat-button-toggle:not(.mat-button-toggle-checked) .mat-button-toggle-button .mat-button-toggle-label-content {
      color: #616161 !important;
    }

    .view-mode-toggle .mat-button-toggle:not(.mat-button-toggle-checked) .mat-button-toggle-button mat-icon.mat-icon-no-color {
      color: #616161 !important;
    }

    .view-mode-toggle .mat-button-toggle:not(.mat-button-toggle-checked) .mat-button-toggle-button .material-icons {
      color: #616161 !important;
    }

    .view-mode-toggle .mat-button-toggle-checked {
      background-color: #7367F0 !important;
      color: white !important;
    }

    .view-mode-toggle .mat-button-toggle-checked .mat-button-toggle-button {
      background-color: #7367F0 !important;
      color: #ffffff !important;
    }

    .view-mode-toggle .mat-button-toggle-checked mat-icon {
      color: #ffffff !important;
    }

    .view-mode-toggle .mat-button-toggle:not(.mat-button-toggle-checked):hover {
      background-color: #f5f5f5 !important;
    }

    .view-mode-toggle .mat-button-toggle:not(.mat-button-toggle-checked):hover .mat-button-toggle-button {
      background-color: #f5f5f5 !important;
      color: #7367F0 !important;
    }

    .view-mode-toggle .mat-button-toggle:not(.mat-button-toggle-checked):hover mat-icon {
      color: #7367F0 !important;
    }

    .view-mode-toggle mat-icon {
      margin-right: 8px;
      color: #616161; /* Default dark gray for inactive state */
    }

    .view-mode-toggle .mat-button-toggle-label-content {
      display: flex;
      align-items: center;
      padding: 8px 16px;
    }

    /* Global deep override for Material Design button toggle */
    ::ng-deep .view-mode-toggle .mat-button-toggle:not(.mat-button-toggle-checked) {
      .mat-button-toggle-button {
        color: #616161 !important;
        
        .mat-button-toggle-label-content {
          color: #616161 !important;
        }
        
        mat-icon,
        .mat-icon,
        .material-icons {
          color: #616161 !important;
        }
      }
    }

    /* Table View Styles */
    .table-card {
      margin-top: 20px;
      background-color: #ffffff !important;
    }

    .table-card .mat-mdc-card-content {
      background-color: #ffffff !important;
    }

    /* Breadcrumb styling */
    .breadcrumb,
    .breadcrumb a,
    .breadcrumb-link {
      color: #7367F0 !important;
    }

    .breadcrumb a:hover {
      color: #5a52d5 !important;
    }

    /* Navigation breadcrumbs */
    nav ol li a,
    .nav-breadcrumb a,
    .breadcrumb-item a {
      color: #7367F0 !important;
    }

    .table-container {
      position: relative;
      min-height: 400px;
    }

    .batch-table {
      width: 100%;
      background-color: #ffffff !important;
    }

    .batch-table .mat-mdc-header-row {
      background-color: #f8f9fa !important;
    }

    .batch-table .mat-mdc-row {
      background-color: #ffffff !important;
    }

    .batch-table .mat-mdc-row:hover {
      background-color: #f5f5f5 !important;
    }

    .batch-table .mat-mdc-cell,
    .batch-table .mat-mdc-header-cell {
      color: #212121 !important;
      border-bottom-color: #e0e0e0 !important;
    }

    .batch-link {
      color: #1976d2;
      text-decoration: none;
      font-weight: 500;
    }

    .batch-link:hover {
      text-decoration: underline;
    }

    .item-info .item-name {
      font-weight: 500;
      color: #333;
    }

    .item-info .item-code {
      font-size: 0.8em;
      color: #666;
    }

    .quantity-info {
      display: flex;
      align-items: center;
    }

    .quantity-info .remaining {
      font-weight: 500;
      color: #333;
    }

    .quantity-info .total {
      color: #666;
      margin-left: 2px;
    }

    .expiry-date {
      font-weight: 500;
    }

    .expiry-date.expired {
      color: #f44336;
    }

    .expiry-date.expiring-soon {
      color: #ff9800;
    }

    .expiry-date.expiring-warning {
      color: #ff5722;
    }

    .expiry-date.normal {
      color: #4caf50;
    }

    /* Status Chips */
    .status-active {
      background-color: #4caf50 !important;
      color: white !important;
    }

    .status-expired {
      background-color: #f44336 !important;
      color: white !important;
    }

    .status-depleted {
      background-color: #9e9e9e !important;
      color: white !important;
    }

    .status-quarantined {
      background-color: #ff9800 !important;
      color: white !important;
    }

    /* Grouped View Styles */
    .grouped-view {
      margin-top: 20px;
    }

    .batch-groups {
      margin-bottom: 20px;
    }

    .batch-group-panel {
      margin-bottom: 16px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
    }

    .batch-group-panel .mat-expansion-panel-header {
      padding: 16px 24px;
      background-color: #f5f5f5;
    }

    .group-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .group-name {
      display: flex;
      align-items: center;
      font-weight: 500;
      font-size: 1.1em;
      color: #333;
    }

    .group-name mat-icon {
      margin-right: 8px;
      color: #1976d2;
    }

    .group-summary {
      display: flex;
      gap: 16px;
      font-size: 0.9em;
      color: #666;
    }

    .batch-count {
      background-color: #e3f2fd;
      color: #1976d2;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.8em;
      font-weight: 500;
    }

    .quantity-summary {
      font-weight: 500;
    }

    /* Group Batches */
    .group-batches {
      padding: 0;
    }

    .batch-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid #f0f0f0;
      transition: background-color 0.2s ease;
    }

    .batch-item:hover {
      background-color: #f9f9f9;
    }

    .batch-item:last-child {
      border-bottom: none;
    }

    .batch-info {
      flex: 1;
    }

    .batch-primary {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .batch-primary .batch-link {
      font-size: 1.1em;
      font-weight: 500;
    }

    .batch-status {
      font-size: 0.8em !important;
      height: 24px !important;
      line-height: 24px !important;
    }

    .batch-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 8px;
      font-size: 0.9em;
    }

    .detail-item {
      display: flex;
      gap: 8px;
    }

    .detail-item .label {
      font-weight: 500;
      color: #666;
      min-width: 60px;
    }

    .detail-item .value {
      color: #333;
    }

    .batch-actions {
      display: flex;
      gap: 8px;
    }

    .pagination-card {
      margin-top: 16px;
      padding: 8px;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 200px;
    }

    .no-data {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: #666;
    }

    .no-data mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .batch-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .view-mode-toggle {
        width: 100%;
      }

      .view-mode-toggle .mat-button-toggle {
        flex: 1;
      }

      .batch-table {
        font-size: 0.9em;
      }

      .group-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .batch-details {
        grid-template-columns: 1fr;
      }

      .batch-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .batch-actions {
        align-self: flex-end;
      }
    }

    @media (max-width: 480px) {
      .batch-list-container {
        padding: 16px;
      }

      .view-mode-toggle mat-icon {
        margin-right: 4px;
      }

      .view-mode-toggle .mat-button-toggle-label-content {
        font-size: 0.9em;
      }
    }
  `]
})
export class BatchListComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Expose ViewMode enum to template
  ViewMode = ViewMode;

  displayedColumns: string[] = ['batchNumber', 'item', 'quantity', 'expiryDate', 'location', 'status', 'actions'];
  dataSource = new MatTableDataSource<Batch>([]);

  loading = false;
  totalItems = 0;
  pageSize = 25;
  currentPage = 0;

  // View mode properties
  currentViewMode: ViewMode = ViewMode.TABLE;
  batchGroups: BatchGroup[] = [];

  private destroy$ = new Subject<void>();
  currentFilters: BatchFilter = {};
  private currentSort: Sort = { active: 'expiryDate', direction: 'asc' };

  constructor(
    private batchService: BatchService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.loadFiltersFromUrl();
    this.loadViewModeFromUrl();
    this.loadBatches();
  }

  ngAfterViewInit(): void {
    // Initialize sort after view init
    if (this.sort) {
      this.sort.active = this.currentSort.active;
      this.sort.direction = this.currentSort.direction;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFiltersChanged(filters: BatchFilter): void {
    this.currentFilters = filters;
    this.currentPage = 0;
    this.updateUrlParams();
    this.loadBatches();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updateUrlParams();
    this.loadBatches();
  }

  onSortChange(sort: Sort): void {
    this.currentSort = sort;
    this.currentPage = 0;
    this.updateUrlParams();
    this.loadBatches();
  }

  /**
   * Handle view mode change
   */
  onViewModeChange(viewMode: ViewMode): void {
    this.currentViewMode = viewMode;
    this.updateUrlParams();

    // If switching to grouped view, reorganize the data
    if (viewMode !== ViewMode.TABLE) {
      this.organizeBatchesIntoGroups();
    }
  }

  /**
   * Handle group expansion/collapse
   */
  onGroupExpandedChange(group: BatchGroup, expanded: boolean): void {
    group.expanded = expanded;
  }

  /**
   * Track by function for group iteration
   */
  trackByGroupKey(index: number, group: BatchGroup): string {
    return group.key;
  }

  /**
   * Track by function for batch iteration
   */
  trackByBatchId(index: number, batch: Batch): string {
    return batch._id;
  }

  private loadBatches(): void {
    this.loading = true;

    const pagination: PaginationParams = {
      page: this.currentPage + 1, // API expects 1-based page numbers
      limit: this.pageSize,
      sortBy: this.currentSort.active,
      sortOrder: this.currentSort.direction || 'asc'
    };

    this.batchService.getBatches(this.currentFilters, pagination)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading batches:', error);
          return of({ success: false, data: [], pagination: { currentPage: 1, totalPages: 0, totalItems: 0, pageSize: this.pageSize } } as BatchResponse);
        })
      )
      .subscribe(response => {
        this.loading = false;
        if (response.success) {
          this.dataSource.data = response.data;
          if (response.pagination) {
            this.totalItems = response.pagination.totalItems;
            this.currentPage = response.pagination.currentPage - 1; // Convert back to 0-based
          }

          // If in grouped view, organize data into groups
          if (this.currentViewMode !== ViewMode.TABLE) {
            this.organizeBatchesIntoGroups();
          }
        } else {
          this.dataSource.data = [];
          this.totalItems = 0;
          this.batchGroups = [];
        }
      });
  }

  getStatusLabel(status: BatchStatus): string {
    switch (status) {
      case BatchStatus.ACTIVE:
        return 'Active';
      case BatchStatus.EXPIRED:
        return 'Expired';
      case BatchStatus.DEPLETED:
        return 'Depleted';
      case BatchStatus.QUARANTINED:
        return 'Quarantined';
      default:
        return 'Unknown';
    }
  }

  getExpiryClass(expiryDate: Date): string {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return 'expired';
    } else if (daysUntilExpiry <= 7) {
      return 'expiring-warning';
    } else if (daysUntilExpiry <= 30) {
      return 'expiring-soon';
    } else {
      return 'normal';
    }
  }

  /**
   * Load filters from URL query parameters
   */
  private loadFiltersFromUrl(): void {
    const params = this.route.snapshot.queryParams;

    this.currentFilters = {};

    if (params['itemSearch']) {
      this.currentFilters.itemSearch = params['itemSearch'];
    }

    if (params['locationIds']) {
      this.currentFilters.locationIds = params['locationIds'].split(',');
    }

    if (params['supplierIds']) {
      this.currentFilters.supplierIds = params['supplierIds'].split(',');
    }

    if (params['statuses']) {
      this.currentFilters.statuses = params['statuses'].split(',') as BatchStatus[];
    }

    if (params['expiryStart'] || params['expiryEnd']) {
      this.currentFilters.expiryDateRange = {
        start: params['expiryStart'] ? new Date(params['expiryStart']) : undefined,
        end: params['expiryEnd'] ? new Date(params['expiryEnd']) : undefined
      };
    }

    if (params['quantityMin'] || params['quantityMax']) {
      this.currentFilters.quantityRange = {
        min: params['quantityMin'] ? parseInt(params['quantityMin']) : undefined,
        max: params['quantityMax'] ? parseInt(params['quantityMax']) : undefined
      };
    }

    if (params['includeExpired']) {
      this.currentFilters.includeExpired = params['includeExpired'] === 'true';
    }

    if (params['includeDepleted']) {
      this.currentFilters.includeDepleted = params['includeDepleted'] === 'true';
    }

    // Load pagination and sorting from URL
    if (params['page']) {
      this.currentPage = parseInt(params['page']) - 1; // Convert to 0-based
    }

    if (params['pageSize']) {
      this.pageSize = parseInt(params['pageSize']);
    }

    if (params['sortBy']) {
      this.currentSort.active = params['sortBy'];
    }

    if (params['sortOrder']) {
      this.currentSort.direction = params['sortOrder'] as 'asc' | 'desc';
    }
  }

  /**
   * Load view mode from URL query parameters
   */
  private loadViewModeFromUrl(): void {
    const params = this.route.snapshot.queryParams;

    if (params['viewMode'] && Object.values(ViewMode).includes(params['viewMode'])) {
      this.currentViewMode = params['viewMode'] as ViewMode;
    }
  }

  /**
   * Organize batches into groups based on current view mode
   */
  private organizeBatchesIntoGroups(): void {
    const batches = this.dataSource.data;
    const groupMap = new Map<string, BatchGroup>();

    batches.forEach(batch => {
      let groupKey: string;
      let groupName: string;

      if (this.currentViewMode === ViewMode.BY_ITEM) {
        groupKey = batch.itemId;
        groupName = batch.item ? `${batch.item.name} (${batch.item.code})` : 'Unknown Item';
      } else if (this.currentViewMode === ViewMode.BY_LOCATION) {
        groupKey = batch.locationId;
        groupName = batch.location ? batch.location.name : 'Unknown Location';
      } else {
        return; // Should not happen
      }

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          key: groupKey,
          name: groupName,
          batches: [],
          totalQuantity: 0,
          remainingQuantity: 0,
          batchCount: 0,
          expanded: false
        });
      }

      const group = groupMap.get(groupKey)!;
      group.batches.push(batch);
      group.totalQuantity += batch.quantity;
      group.remainingQuantity += batch.remainingQuantity;
      group.batchCount++;
    });

    // Convert map to array and sort groups by name
    this.batchGroups = Array.from(groupMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    // Sort batches within each group by expiry date (soonest first)
    this.batchGroups.forEach(group => {
      group.batches.sort((a, b) => {
        const dateA = new Date(a.expiryDate).getTime();
        const dateB = new Date(b.expiryDate).getTime();
        return dateA - dateB;
      });
    });
  }

  /**
   * Update URL parameters with current filter, pagination, and sort state
   */
  private updateUrlParams(): void {
    const queryParams: any = {};

    // Add filter parameters
    if (this.currentFilters.itemSearch) {
      queryParams['itemSearch'] = this.currentFilters.itemSearch;
    }

    if (this.currentFilters.locationIds && this.currentFilters.locationIds.length > 0) {
      queryParams['locationIds'] = this.currentFilters.locationIds.join(',');
    }

    if (this.currentFilters.supplierIds && this.currentFilters.supplierIds.length > 0) {
      queryParams['supplierIds'] = this.currentFilters.supplierIds.join(',');
    }

    if (this.currentFilters.statuses && this.currentFilters.statuses.length > 0) {
      queryParams['statuses'] = this.currentFilters.statuses.join(',');
    }

    if (this.currentFilters.expiryDateRange?.start) {
      queryParams['expiryStart'] = this.currentFilters.expiryDateRange.start.toISOString();
    }

    if (this.currentFilters.expiryDateRange?.end) {
      queryParams['expiryEnd'] = this.currentFilters.expiryDateRange.end.toISOString();
    }

    if (this.currentFilters.quantityRange?.min !== undefined) {
      queryParams['quantityMin'] = this.currentFilters.quantityRange.min.toString();
    }

    if (this.currentFilters.quantityRange?.max !== undefined) {
      queryParams['quantityMax'] = this.currentFilters.quantityRange.max.toString();
    }

    if (this.currentFilters.includeExpired) {
      queryParams['includeExpired'] = 'true';
    }

    if (this.currentFilters.includeDepleted) {
      queryParams['includeDepleted'] = 'true';
    }

    // Add pagination parameters
    if (this.currentPage > 0) {
      queryParams['page'] = (this.currentPage + 1).toString(); // Convert to 1-based
    }

    if (this.pageSize !== 25) { // Only add if different from default
      queryParams['pageSize'] = this.pageSize.toString();
    }

    // Add sorting parameters
    if (this.currentSort.active !== 'expiryDate') { // Only add if different from default
      queryParams['sortBy'] = this.currentSort.active;
    }

    if (this.currentSort.direction !== 'asc') { // Only add if different from default
      queryParams['sortOrder'] = this.currentSort.direction;
    }

    // Add view mode parameter
    if (this.currentViewMode !== ViewMode.TABLE) { // Only add if different from default
      queryParams['viewMode'] = this.currentViewMode;
    }

    // Update URL without triggering navigation
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'replace'
    });
  }
}