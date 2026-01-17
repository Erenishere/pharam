import { Component, EventEmitter, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatBadgeModule
  ],
  template: `
    <div class="sidebar-header">
      <div class="logo-text">
        <span>Pharma</span> System
      </div>
    </div>

    <mat-nav-list class="sidebar-nav">
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

      <!-- Batch Management with Dropdown -->
      <div class="batch-dropdown-container" [class.active]="isBatchRouteActive">
        <div class="batch-main-item" (click)="toggleBatchDropdown()" 
             [class.expanded]="isBatchDropdownOpen" [class.active]="isBatchRouteActive">
          <mat-icon class="batch-icon">qr_code</mat-icon>
          <span class="batch-title">Batch Management</span>
          <mat-icon class="dropdown-arrow" [class.rotated]="isBatchDropdownOpen">keyboard_arrow_right</mat-icon>
        </div>
        
        <div class="batch-submenu" [class.open]="isBatchDropdownOpen">
          <a mat-list-item routerLink="/batches/list" routerLinkActive="active" class="submenu-item">
            <mat-icon matListItemIcon>list</mat-icon>
            <span matListItemTitle>All Batches</span>
          </a>
          
          <a mat-list-item routerLink="/batches/create" routerLinkActive="active" class="submenu-item">
            <mat-icon matListItemIcon>add</mat-icon>
            <span matListItemTitle>Create Batch</span>
          </a>
          
          <a mat-list-item routerLink="/batches/expiring" routerLinkActive="active" class="submenu-item">
            <mat-icon matListItemIcon>warning</mat-icon>
            <span matListItemTitle>Expiring Batches</span>
          </a>
          
          <a mat-list-item routerLink="/batches/statistics" routerLinkActive="active" class="submenu-item">
            <mat-icon matListItemIcon>analytics</mat-icon>
            <span matListItemTitle>Statistics</span>
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

      <mat-divider></mat-divider>

      <a mat-list-item routerLink="/reports" routerLinkActive="active">
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
  private destroy$ = new Subject<void>();

  constructor(private router: Router) {
    // TODO: Load user count from service
  }

  ngOnInit(): void {
    // Listen to route changes to update batch section state
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        this.updateBatchSectionState(event.url);
      });

    // Initial check
    this.updateBatchSectionState(this.router.url);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleBatchDropdown(): void {
    this.isBatchDropdownOpen = !this.isBatchDropdownOpen;
  }

  private updateBatchSectionState(url: string): void {
    this.isBatchRouteActive = url.includes('/batches');
    this.isBatchDropdownOpen = this.isBatchRouteActive;
  }
}
