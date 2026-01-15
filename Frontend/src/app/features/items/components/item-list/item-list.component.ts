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
import { FormsModule } from '@angular/forms';

interface Item {
  _id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  pricing: {
    costPrice: number;
    salePrice: number;
    currency: string;
  };
  inventory: {
    currentStock: number;
    minimumStock: number;
    maximumStock: number;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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
    FormsModule
  ],
  template: `
    <div class="item-list-container">
      <div class="page-header">
        <h1>
          <mat-icon>inventory_2</mat-icon>
          Items Management
        </h1>
        <p class="page-description">Manage your inventory items, stock levels, and pricing</p>
      </div>

      <mat-card class="items-card">
        <mat-card-header>
          <mat-card-title>Items List</mat-card-title>
          <mat-card-subtitle>{{ totalItems }} items found</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <!-- Filters Section -->
          <div class="filters-section">
            <div class="search-filters">
              <mat-form-field appearance="outline" class="search-field">
                <mat-label>Search items</mat-label>
                <input matInput [(ngModel)]="searchKeyword" (input)="onSearch()" placeholder="Search by name, code, or description">
                <mat-icon matSuffix>search</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline" class="category-filter">
                <mat-label>Category</mat-label>
                <mat-select [(ngModel)]="selectedCategory" (selectionChange)="onCategoryChange()">
                  <mat-option value="">All Categories</mat-option>
                  <mat-option *ngFor="let category of categories" [value]="category">
                    {{ category }}
                  </mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="stock-filter">
                <mat-label>Stock Status</mat-label>
                <mat-select [(ngModel)]="selectedStockStatus" (selectionChange)="onStockStatusChange()">
                  <mat-option value="">All Stock</mat-option>
                  <mat-option value="low">Low Stock</mat-option>
                  <mat-option value="out">Out of Stock</mat-option>
                  <mat-option value="normal">Normal Stock</mat-option>
                  <mat-option value="overstock">Overstock</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="action-buttons">
              <button mat-raised-button color="primary" (click)="addItem()">
                <mat-icon>add</mat-icon>
                Add Item
              </button>
              <button mat-stroked-button (click)="refreshItems()">
                <mat-icon>refresh</mat-icon>
                Refresh
              </button>
            </div>
          </div>

          <!-- Items Table -->
          <div class="table-container" *ngIf="!loading; else loadingTemplate">
            <table mat-table [dataSource]="items" class="items-table">
              <!-- Code Column -->
              <ng-container matColumnDef="code">
                <th mat-header-cell *matHeaderCellDef>Code</th>
                <td mat-cell *matCellDef="let item">
                  <span class="item-code">{{ item.code }}</span>
                </td>
              </ng-container>

              <!-- Name Column -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let item">
                  <div class="item-name">
                    <strong>{{ item.name }}</strong>
                    <small class="item-category">{{ item.category }}</small>
                  </div>
                </td>
              </ng-container>

              <!-- Pricing Column -->
              <ng-container matColumnDef="pricing">
                <th mat-header-cell *matHeaderCellDef>Pricing</th>
                <td mat-cell *matCellDef="let item">
                  <div class="pricing-info">
                    <div class="sale-price">{{ item.pricing.currency }} {{ item.pricing.salePrice | number:'1.2-2' }}</div>
                    <div class="cost-price">Cost: {{ item.pricing.currency }} {{ item.pricing.costPrice | number:'1.2-2' }}</div>
                  </div>
                </td>
              </ng-container>

              <!-- Stock Column -->
              <ng-container matColumnDef="stock">
                <th mat-header-cell *matHeaderCellDef>Stock</th>
                <td mat-cell *matCellDef="let item">
                  <div class="stock-info">
                    <mat-chip [class]="getStockStatusClass(item)">
                      {{ item.inventory.currentStock }} {{ item.unit }}
                    </mat-chip>
                    <small>Min: {{ item.inventory.minimumStock }}</small>
                  </div>
                </td>
              </ng-container>

              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let item">
                  <mat-chip [class]="item.isActive ? 'status-active' : 'status-inactive'">
                    {{ item.isActive ? 'Active' : 'Inactive' }}
                  </mat-chip>
                </td>
              </ng-container>

              <!-- Actions Column -->
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
                    <button mat-icon-button (click)="updateStock(item)" matTooltip="Update Stock">
                      <mat-icon>inventory</mat-icon>
                    </button>
                  </div>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>

            <!-- No Data Message -->
            <div *ngIf="items.length === 0" class="no-data">
              <mat-icon>inventory_2</mat-icon>
              <h3>No items found</h3>
              <p>{{ searchKeyword ? 'Try adjusting your search criteria' : 'Start by adding your first item' }}</p>
              <button mat-raised-button color="primary" (click)="addItem()">
                <mat-icon>add</mat-icon>
                Add First Item
              </button>
            </div>
          </div>

          <!-- Loading Template -->
          <ng-template #loadingTemplate>
            <div class="loading-container">
              <mat-icon class="loading-icon">hourglass_empty</mat-icon>
              <p>Loading items...</p>
            </div>
          </ng-template>

          <!-- Pagination -->
          <mat-paginator
            *ngIf="items.length > 0"
            [length]="totalItems"
            [pageSize]="pageSize"
            [pageSizeOptions]="[10, 25, 50, 100]"
            (page)="onPageChange($event)"
            showFirstLastButtons>
          </mat-paginator>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styleUrl: './item-list.component.scss'
})
export class ItemListComponent implements OnInit {
  allItems: Item[] = [];
  items: Item[] = [];
  categories: string[] = [];
  totalItems = 0;
  pageSize = 10;
  currentPage = 0;
  loading = false;

  // Filters
  searchKeyword = '';
  selectedCategory = '';
  selectedStockStatus = '';

  displayedColumns: string[] = ['code', 'name', 'pricing', 'stock', 'status', 'actions'];

  ngOnInit() {
    this.loadItems();
    this.loadCategories();
  }

  loadItems() {
    this.loading = true;

    // Simulate API call - replace with actual service call
    setTimeout(() => {
      // Store original items in allItems
      this.allItems = this.getMockItems();
      // Apply initial filters
      this.applyFilters();
      this.loading = false;
    }, 1000);
  }

  loadCategories() {
    // Simulate API call - replace with actual service call
    this.categories = ['Medicine', 'Tablet', 'Syrup', 'Injection', 'Capsule', 'Ointment'];
  }

  applyFilters() {
    let filtered = [...this.allItems];

    // 1. Filter by Search Keyword
    if (this.searchKeyword.trim()) {
      const keyword = this.searchKeyword.toLowerCase().trim();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(keyword) ||
        item.code.toLowerCase().includes(keyword) ||
        item.category.toLowerCase().includes(keyword)
      );
    }

    // 2. Filter by Category
    if (this.selectedCategory) {
      filtered = filtered.filter(item => item.category === this.selectedCategory);
    }

    // 3. Filter by Stock Status
    if (this.selectedStockStatus) {
      filtered = filtered.filter(item => {
        const current = item.inventory.currentStock;
        const min = item.inventory.minimumStock;
        const max = item.inventory.maximumStock;

        switch (this.selectedStockStatus) {
          case 'low':
            return current > 0 && current <= min;
          case 'out':
            return current === 0;
          case 'overstock':
            return current >= max;
          case 'normal':
            return current > min && current < max;
          default:
            return true;
        }
      });
    }

    // Update displayed items and total count
    this.totalItems = filtered.length;
    // For client-side pagination:
    const startIndex = this.currentPage * this.pageSize;
    this.items = filtered.slice(startIndex, startIndex + this.pageSize);
  }

  onSearch() {
    this.currentPage = 0; // Reset to first page on filter change
    this.applyFilters();
  }

  onCategoryChange() {
    this.currentPage = 0;
    this.applyFilters();
  }

  onStockStatusChange() {
    this.currentPage = 0;
    this.applyFilters();
  }

  onPageChange(event: any) {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.applyFilters(); // Re-slice the array
  }

  addItem() {
    console.log('Add new item');
    // Implement add item logic
  }

  viewItem(item: Item) {
    console.log('View item:', item);
    // Implement view item logic
  }

  editItem(item: Item) {
    console.log('Edit item:', item);
    // Implement edit item logic
  }

  updateStock(item: Item) {
    console.log('Update stock for item:', item);
    // Implement stock update logic
  }

  refreshItems() {
    this.loadItems();
  }

  getStockStatusClass(item: Item): string {
    if (item.inventory.currentStock === 0) return 'stock-out';
    if (item.inventory.currentStock <= item.inventory.minimumStock) return 'stock-low';
    if (item.inventory.currentStock >= item.inventory.maximumStock) return 'stock-over';
    return 'stock-normal';
  }

  private getMockItems(): Item[] {
    return [
      {
        _id: '1',
        code: 'ITEM001',
        name: 'Paracetamol 500mg',
        category: 'Tablet',
        unit: 'piece',
        pricing: {
          costPrice: 2.50,
          salePrice: 5.00,
          currency: 'PKR'
        },
        inventory: {
          currentStock: 150,
          minimumStock: 50,
          maximumStock: 500
        },
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        _id: '2',
        code: 'ITEM002',
        name: 'Amoxicillin 250mg',
        category: 'Capsule',
        unit: 'piece',
        pricing: {
          costPrice: 8.00,
          salePrice: 15.00,
          currency: 'PKR'
        },
        inventory: {
          currentStock: 25,
          minimumStock: 30,
          maximumStock: 200
        },
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        _id: '3',
        code: 'ITEM003',
        name: 'Cough Syrup 100ml',
        category: 'Syrup',
        unit: 'ml',
        pricing: {
          costPrice: 45.00,
          salePrice: 85.00,
          currency: 'PKR'
        },
        inventory: {
          currentStock: 0,
          minimumStock: 20,
          maximumStock: 100
        },
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ];
  }
}