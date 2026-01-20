import { Component, EventEmitter, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { Subject, filter, takeUntil } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatBadgeModule,
    MatDividerModule
  ],
  template: `
    <div class="sidebar-header">
      <div class="logo-text">
        <span>Indus</span>traders
      </div>
    </div>

    <mat-nav-list class="sidebar-nav">
      <!-- Admin/Manager Section -->
      <ng-container *ngIf="isAdmin">
        <a mat-list-item routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
          <mat-icon matListItemIcon>dashboard</mat-icon>
          <span matListItemTitle>Dashboard</span>
        </a>

        <a mat-list-item routerLink="/users" routerLinkActive="active">
          <mat-icon matListItemIcon>people</mat-icon>
          <span matListItemTitle>Users</span>
          <span matListItemMeta class="badge" *ngIf="userCount > 0">{{ userCount }}</span>
        </a>

        <a mat-list-item routerLink="/customers" routerLinkActive="active">
          <mat-icon matListItemIcon>person</mat-icon>
          <span matListItemTitle>Customers</span>
        </a>

        <a mat-list-item routerLink="/suppliers" routerLinkActive="active">
          <mat-icon matListItemIcon>local_shipping</mat-icon>
          <span matListItemTitle>Suppliers</span>
        </a>

        <a mat-list-item routerLink="/items" routerLinkActive="active">
          <mat-icon matListItemIcon>inventory_2</mat-icon>
          <span matListItemTitle>Items</span>
        </a>

        <!-- Batch Management Dropdown -->
        <div class="batch-dropdown-container">
          <div class="batch-main-item" [class.active]="isBatchRouteActive" (click)="toggleBatchDropdown()">
            <mat-icon class="batch-icon">qr_code</mat-icon>
            <span class="batch-title">Batches</span>
            <mat-icon class="dropdown-arrow" [class.rotated]="isBatchDropdownOpen">chevron_right</mat-icon>
          </div>
          <div class="batch-submenu" [class.open]="isBatchDropdownOpen">
            <a mat-list-item routerLink="/batches" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="submenu-item">
              <mat-icon matListItemIcon>list</mat-icon>
              <span matListItemTitle>All Batches</span>
            </a>
            <a mat-list-item routerLink="/batches/create" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>add_circle</mat-icon>
              <span matListItemTitle>New Batch</span>
            </a>
            <a mat-list-item routerLink="/batches/statistics" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>insights</mat-icon>
              <span matListItemTitle>Statistics</span>
            </a>
            <a mat-list-item routerLink="/batches/expiring" routerLinkActive="active" class="submenu-item">
              <mat-icon matListItemIcon>schedule</mat-icon>
              <span matListItemTitle>Expiring Batches</span>
            </a>
          </div>
        </div>

        <mat-divider></mat-divider>

        <a mat-list-item routerLink="/sales-invoices" routerLinkActive="active">
          <mat-icon matListItemIcon>receipt</mat-icon>
          <span matListItemTitle>Sales Invoices</span>
        </a>

        <a mat-list-item routerLink="/purchase-invoices" routerLinkActive="active">
          <mat-icon matListItemIcon>shopping_cart</mat-icon>
          <span matListItemTitle>Purchase Invoices</span>
        </a>
      </ng-container>

      <mat-divider *ngIf="isAdmin || isSalesman"></mat-divider>

      <!-- Salesman Specific -->
      <ng-container *ngIf="isSalesman">
        <a mat-list-item routerLink="/salesman/pos" routerLinkActive="active">
          <mat-icon matListItemIcon>point_of_sale</mat-icon>
          <span matListItemTitle>Salesman POS</span>
        </a>
        <a mat-list-item routerLink="/suppliers" routerLinkActive="active">
          <mat-icon matListItemIcon>local_shipping</mat-icon>
          <span matListItemTitle>Suppliers</span>
        </a>

        <a mat-list-item routerLink="/items" routerLinkActive="active">
          <mat-icon matListItemIcon>inventory_2</mat-icon>
          <span matListItemTitle>Items</span>
        </a>
      </ng-container>


      <mat-divider></mat-divider>

      <a mat-list-item routerLink="/reports" routerLinkActive="active" *ngIf="isAdmin">
        <mat-icon matListItemIcon>assessment</mat-icon>
        <span matListItemTitle>Reports</span>
      </a>
    </mat-nav-list>
  `,
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Output() closeSidebar = new EventEmitter<void>();
  userCount = 0;
  isBatchSectionExpanded = false;
  isBatchRouteActive = false;
  isBatchDropdownOpen = false;
  userRole: string | null = null;
  private destroy$ = new Subject<void>();

  get isAdmin(): boolean {
    const user = this.authService.currentUserValue;
    return user?.role === 'admin' || user?.role === 'manager';
  }

  get isSalesman(): boolean {
    const user = this.authService.currentUserValue;
    return user?.role === 'sales';
  }

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    // TODO: Load user count from service
  }

  ngOnInit(): void {
    // Track batch route state
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: any) => {
      this.checkBatchRoute(event.urlAfterRedirects);
    });

    // Set initial state
    this.checkBatchRoute(this.router.url);
  }

  private checkBatchRoute(url: string): void {
    this.isBatchRouteActive = url.includes('/batches');
    if (this.isBatchRouteActive) {
      this.isBatchDropdownOpen = true;
    }
  }

  toggleBatchDropdown(): void {
    this.isBatchDropdownOpen = !this.isBatchDropdownOpen;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
