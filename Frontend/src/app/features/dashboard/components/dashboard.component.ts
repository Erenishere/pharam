import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatMenuModule, MatButtonModule, RouterModule],
  template: `
    <div class="dashboard-container">
      <h1>Dashboard</h1>
      <p class="welcome-text">Welcome to Pharma Management System</p>
      
      <div class="cards-grid">
        <mat-card class="dashboard-card" routerLink="/users">
          <mat-card-content>
            <mat-icon class="card-icon">people</mat-icon>
            <h2>Users</h2>
            <p>Manage system users</p>
          </mat-card-content>
        </mat-card>

        <mat-card class="dashboard-card" routerLink="/customers">
          <mat-card-content>
            <mat-icon class="card-icon">person</mat-icon>
            <h2>Customers</h2>
            <p>Manage customers</p>
          </mat-card-content>
        </mat-card>

        <mat-card class="dashboard-card" routerLink="/suppliers">
          <mat-card-content>
            <mat-icon class="card-icon">local_shipping</mat-icon>
            <h2>Suppliers</h2>
            <p>Manage suppliers</p>
          </mat-card-content>
        </mat-card>

        <mat-card class="dashboard-card" routerLink="/items">
          <mat-card-content>
            <mat-icon class="card-icon">inventory_2</mat-icon>
            <h2>Items</h2>
            <p>Manage inventory items</p>
          </mat-card-content>
        </mat-card>

        <!-- Batch Management Card with Dropdown -->
        <mat-card class="dashboard-card batch-card">
          <mat-card-content>
            <div class="card-header">
              <mat-icon class="card-icon">qr_code</mat-icon>
              <button mat-icon-button [matMenuTriggerFor]="batchMenu" class="dropdown-trigger">
                <mat-icon>keyboard_arrow_down</mat-icon>
              </button>
            </div>
            <h2>Batch Management</h2>
            <p>Manage product batches</p>
          </mat-card-content>
          
          <mat-menu #batchMenu="matMenu" class="batch-dropdown-menu">
            <button mat-menu-item routerLink="/batches/list">
              <mat-icon>list</mat-icon>
              <span>All Batches</span>
            </button>
            <button mat-menu-item routerLink="/batches/create">
              <mat-icon>add</mat-icon>
              <span>Create Batch</span>
            </button>
            <button mat-menu-item routerLink="/batches/expiring">
              <mat-icon>warning</mat-icon>
              <span>Expiring Batches</span>
            </button>
            <button mat-menu-item routerLink="/batches/statistics">
              <mat-icon>analytics</mat-icon>
              <span>Statistics</span>
            </button>
          </mat-menu>
        </mat-card>

        <mat-card class="dashboard-card" routerLink="/sales-invoices">
          <mat-card-content>
            <mat-icon class="card-icon">receipt</mat-icon>
            <h2>Sales</h2>
            <p>Sales invoices</p>
          </mat-card-content>
        </mat-card>

        <mat-card class="dashboard-card" routerLink="/purchase-invoices">
          <mat-card-content>
            <mat-icon class="card-icon">shopping_cart</mat-icon>
            <h2>Purchases</h2>
            <p>Purchase invoices</p>
          </mat-card-content>
        </mat-card>

        <mat-card class="dashboard-card" routerLink="/reports">
          <mat-card-content>
            <mat-icon class="card-icon">assessment</mat-icon>
            <h2>Reports</h2>
            <p>Analytics & Reports</p>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styleUrl: './dashboard.component.scss'
})

export class DashboardComponent { }
