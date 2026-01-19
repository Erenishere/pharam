// navbar.component.ts
import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';

interface MenuItem {
  title: string;
  route: string;
  icon: string;
  category?: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatAutocompleteModule,
    MatInputModule,
    MatFormFieldModule,
    ReactiveFormsModule
  ],
  template: `
    <mat-toolbar class="navbar">
      <!-- hamburger -->
      <button mat-icon-button class="menu-btn" (click)="toggleSidebar.emit()">
        <mat-icon>menu</mat-icon>
      </button>

      <!-- search with autocomplete -->
      <div class="search-container">
        <mat-form-field class="search-field" appearance="outline">
          <input matInput
                 placeholder="Search menu items..."
                 [formControl]="searchControl"
                 [matAutocomplete]="auto">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
        
        <mat-autocomplete #auto="matAutocomplete" 
                         (optionSelected)="onMenuItemSelected($event)"
                         class="search-autocomplete">
          <mat-option *ngFor="let item of filteredMenuItems | async" 
                     [value]="item"
                     class="search-option">
            <mat-icon class="option-icon">{{ item.icon }}</mat-icon>
            <span class="option-text">{{ item.title }}</span>
            <span class="option-category" *ngIf="item.category">{{ item.category }}</span>
          </mat-option>
          <mat-option *ngIf="(filteredMenuItems | async)?.length === 0" disabled>
            <span class="no-results">No menu items found</span>
          </mat-option>
        </mat-autocomplete>
      </div>

      <span class="spacer"></span>

      <!-- RIGHT CORNER GROUP -->
      <div class="right-group">
        <!-- notifications -->
        <button mat-icon-button class="icon-btn" [matMenuTriggerFor]="notifMenu">
          <mat-icon>notifications</mat-icon>
          <!-- Remove the badge-dot initially -->
        </button>

        <!-- user pill -->
        <button mat-button class="user-menu-btn" [matMenuTriggerFor]="userMenu">
          <div class="info">
            <div class="username">{{ currentUser?.username || 'John Doe' }}</div>
            <div class="role">Admin</div>
          </div>
          <mat-icon>account_circle</mat-icon>
        </button>
      </div>

      <!-- menus -->
      <mat-menu #notifMenu="matMenu" class="notification-menu">
        <div class="notif-placeholder">No new notifications</div>
      </mat-menu>

      <mat-menu #userMenu="matMenu" class="user-menu">
        <button mat-menu-item>
          <mat-icon>person</mat-icon>
          <span>Profile</span>
        </button>
        <button mat-menu-item>
          <mat-icon>settings</mat-icon>
          <span>Settings</span>
        </button>
        <mat-divider></mat-divider>
        <button mat-menu-item (click)="logout()">
          <mat-icon>exit_to_app</mat-icon>
          <span>Logout</span>
        </button>
      </mat-menu>
    </mat-toolbar>
  `,
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  @Output() toggleSidebar = new EventEmitter<void>();
  currentUser: User | null = null;
  searchControl = new FormControl('');
  filteredMenuItems: Observable<MenuItem[]>;

  menuItems: MenuItem[] = [
    { title: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
    { title: 'Users', route: '/users', icon: 'people' },
    { title: 'Customers', route: '/customers', icon: 'person' },
    { title: 'Suppliers', route: '/suppliers', icon: 'local_shipping' },
    { title: 'Items', route: '/items', icon: 'inventory_2' },
    { title: 'All Batches', route: '/batches/list', icon: 'list', category: 'Batch Management' },
    { title: 'Create Batch', route: '/batches/create', icon: 'add', category: 'Batch Management' },
    { title: 'Expiring Batches', route: '/batches/expiring', icon: 'warning', category: 'Batch Management' },
    { title: 'Batch Statistics', route: '/batches/statistics', icon: 'analytics', category: 'Batch Management' },
    { title: 'All Invoices', route: '/sales-invoices/list', icon: 'list', category: 'Sales Invoices' },
    { title: 'Create Invoice', route: '/sales-invoices/create', icon: 'add', category: 'Sales Invoices' },
    { title: 'Invoice Statistics', route: '/sales-invoices/statistics', icon: 'analytics', category: 'Sales Invoices' },
    { title: 'Convert Estimates', route: '/sales-invoices/estimates', icon: 'transform', category: 'Sales Invoices' },
    { title: 'Purchase Invoices', route: '/purchase-invoices', icon: 'shopping_cart' },
    { title: 'Reports', route: '/reports', icon: 'assessment' }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.filteredMenuItems = this.searchControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value || ''))
    );
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => this.currentUser = user);
  }

  private _filter(value: string): MenuItem[] {
    if (typeof value !== 'string') {
      return this.menuItems;
    }

    const filterValue = value.toLowerCase();
    return this.menuItems.filter(item =>
      item.title.toLowerCase().includes(filterValue) ||
      (item.category && item.category.toLowerCase().includes(filterValue))
    );
  }

  onMenuItemSelected(event: any): void {
    const selectedItem = event.option.value as MenuItem;
    this.router.navigate([selectedItem.route]);
    this.searchControl.setValue('');
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }
}