import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { PosService, Item } from '../../../../core/services/pos.service';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-item-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    FormsModule
  ],
  template: `
    <div class="item-list-container">
      <div class="header">
        <h1>Items Management</h1>
        <button mat-raised-button color="primary" (click)="addItem()">
          <mat-icon>add</mat-icon>
          Add Item
        </button>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="search-filters">
            <mat-form-field appearance="outline">
              <mat-label>Search items</mat-label>
              <input matInput [(ngModel)]="searchKeyword" (input)="onSearch()" placeholder="Search by name, code, or category..." />
              <mat-icon matPrefix>search</mat-icon>
            </mat-form-field>
          </div>

          <div class="filter-actions">
            <mat-form-field appearance="outline" class="category-filter">
              <mat-label>Category</mat-label>
              <mat-select [(ngModel)]="selectedCategory" (selectionChange)="onCategoryChange()">
                <mat-option value="" class="all-option">All</mat-option>
                <mat-option *ngFor="let category of categories" [value]="category">
                  {{ category }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="stock-filter">
              <mat-label>Stock Status</mat-label>
              <mat-select [(ngModel)]="selectedStockStatus" (selectionChange)="onStockStatusChange()">
                <mat-option value="" class="all-option">All</mat-option>
                <mat-option value="low">Low</mat-option>
                <mat-option value="out">Out</mat-option>
                <mat-option value="normal">Normal</mat-option>
                <mat-option value="overstock">Overstock</mat-option>
              </mat-select>
            </mat-form-field>

            <button mat-stroked-button (click)="refreshItems()">
              <mat-icon>refresh</mat-icon>
              Refresh
            </button>
          </div>
        </div>

        <div class="table-responsive">
          <!-- Loading State -->
          <div *ngIf="loading" class="loading-container">
            <mat-icon class="loading-icon">refresh</mat-icon>
            <p>Loading items...</p>
          </div>

          <!-- No Data State -->
          <div *ngIf="!loading && items.length === 0" class="no-data">
            <mat-icon>inventory_2</mat-icon>
            <p>No items found</p>
          </div>

          <!-- Items Table -->
          <table mat-table [dataSource]="items" class="items-table" *ngIf="!loading && items.length > 0">
            <ng-container matColumnDef="code">
              <th mat-header-cell *matHeaderCellDef>Code</th>
              <td mat-cell *matCellDef="let item">
                <span class="item-code">{{ item.code }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let item">
                <div class="item-name">
                  <strong>{{ item.name }}</strong>
                  <span class="item-category">{{ item.category }}</span>
                </div>
              </td>
            </ng-container>

              <!-- Pricing Column -->
              <ng-container matColumnDef="pricing">
                <th mat-header-cell *matHeaderCellDef>Pricing</th>
                <td mat-cell *matCellDef="let item">
                  <div class="pricing-info">
                    <div class="sale-price">PKR {{ (item.pricing?.salePrice || item.salePrice || 0) | number:'1.2-2' }}</div>
                    <div class="cost-price" *ngIf="item.pricing?.costPrice">Cost: PKR {{ item.pricing.costPrice | number:'1.2-2' }}</div>
                  </div>
                </td>
              </ng-container>

              <!-- Stock Column -->
              <ng-container matColumnDef="stock">
                <th mat-header-cell *matHeaderCellDef>Stock</th>
                <td mat-cell *matCellDef="let item">
                  <div class="stock-info">
                    <mat-chip [class]="getStockStatusClass(item)">
                      {{ item.inventory?.currentStock || 0 }} {{ item.unit }}
                    </mat-chip>
                    <small>Min: {{ item.inventory?.minimumStock || 0 }}</small>
                  </div>
                </td>
              </ng-container>

              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let item">
                  <mat-chip class="status-chip" [class.active]="item.isActive" [class.inactive]="!item.isActive">
                    {{ item.isActive ? 'Active' : 'Inactive' }}
                  </mat-chip>
                </td>
              </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let item">
                <div class="action-buttons">
                  <button mat-icon-button (click)="viewItem(item)" matTooltip="View Details">
                    <mat-icon>visibility</mat-icon>
                  </button>
                  <button mat-icon-button (click)="editItem(item)" matTooltip="Edit Item">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button (click)="deleteItem(item)" matTooltip="Delete Item" class="delete-button">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>

        <mat-paginator
          [length]="totalItems"
          [pageSize]="pageSize"
          (page)="onPageChange($event)">
        </mat-paginator>
      </div>
    </div>
  `,
  styleUrl: './item-list.component.scss'
})
export class ItemListComponent implements OnInit {
  items: Item[] = [];
  categories: string[] = ['Medicine', 'Tablet', 'Syrup', 'Injection', 'Capsule', 'Ointment', 'Surgical', 'Herbal'];
  totalItems = 0;
  pageSize = 10;
  currentPage = 0; // Angular Paginator is 0-indexed
  loading = false;

  searchKeyword = '';
  selectedCategory = '';
  selectedStockStatus = '';

  displayedColumns: string[] = ['code', 'name', 'pricing', 'stock', 'status', 'actions'];

  constructor(
    private posService: PosService,
    private toastService: ToastService
  ) { }

  ngOnInit() {
    this.loadItems();
  }

  loadItems() {
    this.loading = true;

    // API page is 1-indexed
    const apiPage = this.currentPage + 1;

    this.posService.getItems(apiPage, this.pageSize, {
      keyword: this.searchKeyword,
      category: this.selectedCategory,
      stockStatus: this.selectedStockStatus
    }).subscribe({
      next: (response) => {
        this.items = response.data;
        this.items.forEach(i => {
          // Ensure pricing exists for safe template access
          if (!i.pricing) {
            i.pricing = { costPrice: 0, salePrice: i.salePrice || 0 };
          }
          if (!i.inventory) {
            i.inventory = { currentStock: i.stock || 0, minimumStock: 0, maximumStock: 0, batches: [] };
          }
        });

        if (response.pagination) {
          this.totalItems = response.pagination.totalItems;
        } else {
          this.totalItems = response.data.length;
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading items', err);
        this.toastService.error('Failed to load items');
        this.loading = false;
        this.items = [];
      }
    });
  }

  onSearch() {
    this.currentPage = 0;
    this.loadItems();
  }

  onCategoryChange() {
    this.currentPage = 0;
    this.loadItems();
  }

  onStockStatusChange() {
    this.currentPage = 0;
    this.loadItems();
  }

  onPageChange(event: any) {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadItems();
  }

  addItem() {
    console.log('Add new item');
  }

  viewItem(item: Item) {
    console.log('View', item);
  }

  editItem(item: Item) {
    console.log('Edit', item);
  }

  updateStock(item: Item) {
    console.log('Update Stock', item);
  }

  refreshItems() {
    this.loadItems();
  }

  getStockStatusClass(item: Item): string {
    const current = item.inventory?.currentStock || 0;
    const min = item.inventory?.minimumStock || 0;
    const max = item.inventory?.maximumStock || 0;

    if (current === 0) return 'stock-out';
    if (current <= min) return 'stock-low';
    if (max > 0 && current >= max) return 'stock-over';
    return 'stock-normal';
  }
}