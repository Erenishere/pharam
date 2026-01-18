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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ItemFormDialogComponent } from '../item-form-dialog/item-form-dialog.component';
import { ItemDetailDialogComponent } from '../item-detail-dialog/item-detail-dialog.component';
import { ItemService } from '../../services/item.service';
import { ToastService } from '../../../../shared/services/toast.service';

interface Item {
  _id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  pricing: {
    costPrice: number;
    salePrice: number;
    currency: string;
  };
  tax?: {
    gstRate: number;
    whtRate: number;
    taxCategory: string;
  };
  inventory: {
    currentStock: number;
    minimumStock: number;
    maximumStock: number;
  };
  barcode?: string;
  packSize?: number;
  defaultWarrantyMonths?: number;
  defaultWarrantyDetails?: string;
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

            <ng-container matColumnDef="pricing">
              <th mat-header-cell *matHeaderCellDef>Pricing</th>
              <td mat-cell *matCellDef="let item">
                <div class="pricing-info">
                  <div class="sale-price">{{ item.pricing.currency }} {{ item.pricing.salePrice }}</div>
                  <div class="cost-price">Cost: {{ item.pricing.currency }} {{ item.pricing.costPrice }}</div>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="stock">
              <th mat-header-cell *matHeaderCellDef>Stock</th>
              <td mat-cell *matCellDef="let item">
                <div class="stock-info">
                  <mat-chip class="stock-normal">{{ item.inventory.currentStock }}</mat-chip>
                  <small>Min: {{ item.inventory.minimumStock }}</small>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let item">
                <mat-chip [class]="item.isActive ? 'status-active' : 'status-inactive'">
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

  allItems: Item[] = [];
  items: Item[] = [];
  categories: string[] = [];
  totalItems = 0;
  pageSize = 10;
  currentPage = 0;
  loading = false;

  searchKeyword = '';
  selectedCategory = '';
  selectedStockStatus = '';

  displayedColumns: string[] = ['code', 'name', 'pricing', 'stock', 'status', 'actions'];

  constructor(
    private dialog: MatDialog,
    private itemService: ItemService,
    private toastService: ToastService
  ) { }

  ngOnInit() {
    this.loadItems();
    this.loadCategories();
  }

  loadItems() {
    this.loading = true;

    this.itemService.getItems().subscribe({
      next: (response) => {
        if (response.success) {
          // Filter out inactive/deleted items (soft delete)
          this.allItems = (response.data || []).filter(item => item.isActive !== false);
          this.applyFilters();
        } else {
          this.toastService.error('Failed to load items');
          // Fallback to mock data for development
          this.allItems = this.getMockItems();
          this.applyFilters();
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading items:', error);
        this.toastService.error('Failed to load items from server');
        // Fallback to mock data for development
        this.allItems = this.getMockItems();
        this.applyFilters();
        this.loading = false;
      }
    });
  }

  loadCategories() {
    // Use predefined categories list - always reliable
    this.categories = ['Medicine', 'Tablet', 'Syrup', 'Injection', 'Capsule', 'Ointment', 'Drops', 'Cream', 'Powder', 'Gel'];
  }

  applyFilters() {
    let filtered = [...this.allItems];

    if (this.searchKeyword) {
      const keyword = this.searchKeyword.toLowerCase();
      filtered = filtered.filter(i =>
        i.name.toLowerCase().includes(keyword) ||
        i.code.toLowerCase().includes(keyword) ||
        (i.category && i.category.toLowerCase().includes(keyword)) ||
        (i.description && i.description.toLowerCase().includes(keyword))
      );
    }

    if (this.selectedCategory) {
      filtered = filtered.filter(i => i.category === this.selectedCategory);
    }

    this.totalItems = filtered.length;
    this.items = filtered.slice(
      this.currentPage * this.pageSize,
      (this.currentPage + 1) * this.pageSize
    );
  }

  onSearch() { this.currentPage = 0; this.applyFilters(); }
  onCategoryChange() { this.currentPage = 0; this.applyFilters(); }
  onStockStatusChange() { this.currentPage = 0; this.applyFilters(); }
  onPageChange(e: any) { this.currentPage = e.pageIndex; this.pageSize = e.pageSize; this.applyFilters(); }

  addItem() {
    const dialogRef = this.dialog.open(ItemFormDialogComponent, {
      width: '600px',
      disableClose: true,
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadItems(); // Refresh the list to show the new item
      }
    });
  }

  viewItem(item: Item) {
    const dialogRef = this.dialog.open(ItemDetailDialogComponent, {
      width: '600px',
      data: item
    });

    dialogRef.afterClosed().subscribe(() => {
      // Optional: refresh data if needed
    });
  }

  editItem(item: Item) {
    const dialogRef = this.dialog.open(ItemFormDialogComponent, {
      width: '600px',
      disableClose: true,
      data: { item }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadItems(); // Refresh the list to show updated item
      }
    });
  }

  updateStock(item: Item) { }

  async deleteItem(item: Item): Promise<void> {
    const confirmed = await this.toastService.confirm(
      `This will permanently delete the item "${item.name}" (${item.code}). This action cannot be undone.`,
      'Delete Item?',
      'Yes, delete it',
      'Cancel'
    );

    if (!confirmed) {
      return;
    }

    this.itemService.deleteItem(item._id).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.success('Item deleted successfully!');
          this.loadItems(); // Refresh the list
        }
      },
      error: (error) => {
        this.toastService.error(error.error?.error?.message || 'Failed to delete item');
      }
    });
  }

  refreshItems() {
    this.loadItems();
  }

  private getMockItems(): Item[] {
    return [
      {
        _id: '1',
        code: 'ITEM001',
        name: 'Paracetamol',
        description: 'Pain relief and fever reducer medication',
        category: 'Tablet',
        unit: 'piece',
        pricing: { costPrice: 2, salePrice: 5, currency: 'PKR' },
        tax: { gstRate: 17, whtRate: 1, taxCategory: 'standard' },
        inventory: { currentStock: 100, minimumStock: 20, maximumStock: 300 },
        barcode: '1234567890123',
        packSize: 10,
        defaultWarrantyMonths: 24,
        defaultWarrantyDetails: 'Manufacturer warranty against defects',
        isActive: true,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z'
      },
      {
        _id: '2',
        code: 'ITEM002',
        name: 'Amoxicillin',
        description: 'Antibiotic medication for bacterial infections',
        category: 'Capsule',
        unit: 'piece',
        pricing: { costPrice: 8, salePrice: 15, currency: 'PKR' },
        tax: { gstRate: 17, whtRate: 1, taxCategory: 'standard' },
        inventory: { currentStock: 50, minimumStock: 25, maximumStock: 200 },
        barcode: '2345678901234',
        packSize: 20,
        defaultWarrantyMonths: 36,
        isActive: true,
        createdAt: '2024-01-10T14:20:00Z',
        updatedAt: '2024-01-12T09:15:00Z'
      },
      {
        _id: '3',
        code: 'ITEM003',
        name: 'Cough Syrup',
        description: 'Herbal cough syrup for dry and wet cough',
        category: 'Syrup',
        unit: 'ml',
        pricing: { costPrice: 25, salePrice: 45, currency: 'PKR' },
        tax: { gstRate: 17, whtRate: 1, taxCategory: 'standard' },
        inventory: { currentStock: 15, minimumStock: 30, maximumStock: 100 },
        barcode: '3456789012345',
        packSize: 1,
        isActive: true,
        createdAt: '2024-01-08T16:45:00Z',
        updatedAt: '2024-01-14T11:30:00Z'
      }
    ];
  }
}
