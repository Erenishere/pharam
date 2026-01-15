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
              <input matInput [(ngModel)]="searchKeyword" (input)="onSearch()" />
              <mat-icon matPrefix>search</mat-icon>
            </mat-form-field>
          </div>

          <div class="filter-actions">
            <mat-form-field appearance="outline">
              <mat-label>Category</mat-label>
              <mat-select [(ngModel)]="selectedCategory" (selectionChange)="onCategoryChange()">
                <mat-option value="">All</mat-option>
                <mat-option *ngFor="let category of categories" [value]="category">
                  {{ category }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Stock Status</mat-label>
              <mat-select [(ngModel)]="selectedStockStatus" (selectionChange)="onStockStatusChange()">
                <mat-option value="">All</mat-option>
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

        <table mat-table [dataSource]="items">
          <ng-container matColumnDef="code">
            <th mat-header-cell *matHeaderCellDef>Code</th>
            <td mat-cell *matCellDef="let item">{{ item.code }}</td>
          </ng-container>

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let item">{{ item.name }}</td>
          </ng-container>

          <ng-container matColumnDef="pricing">
            <th mat-header-cell *matHeaderCellDef>Pricing</th>
            <td mat-cell *matCellDef="let item">
              {{ item.pricing.currency }} {{ item.pricing.salePrice }}
            </td>
          </ng-container>

          <ng-container matColumnDef="stock">
            <th mat-header-cell *matHeaderCellDef>Stock</th>
            <td mat-cell *matCellDef="let item">
              {{ item.inventory.currentStock }}
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let item">
              {{ item.isActive ? 'Active' : 'Inactive' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let item">
              <button mat-icon-button (click)="viewItem(item)">
                <mat-icon>visibility</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

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

  ngOnInit() {
    this.loadItems();
    this.loadCategories();
  }

  loadItems() {
    this.allItems = this.getMockItems();
    this.applyFilters();
  }

  loadCategories() {
    this.categories = ['Medicine', 'Tablet', 'Syrup', 'Injection', 'Capsule', 'Ointment'];
  }

  applyFilters() {
    let filtered = [...this.allItems];

    if (this.searchKeyword) {
      filtered = filtered.filter(i =>
        i.name.toLowerCase().includes(this.searchKeyword.toLowerCase())
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

  addItem() { }
  viewItem(item: Item) { }
  editItem(item: Item) { }
  updateStock(item: Item) { }

  refreshItems() {
    this.loadItems();
  }

  private getMockItems(): Item[] {
    return [
      {
        _id: '1',
        code: 'ITEM001',
        name: 'Paracetamol',
        category: 'Tablet',
        unit: 'piece',
        pricing: { costPrice: 2, salePrice: 5, currency: 'PKR' },
        inventory: { currentStock: 100, minimumStock: 20, maximumStock: 300 },
        isActive: true,
        createdAt: '',
        updatedAt: ''
      }
    ];
  }
}
