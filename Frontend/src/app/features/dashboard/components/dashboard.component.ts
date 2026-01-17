import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, RouterModule],
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

        <mat-card class="dashboard-card">
          <mat-card-content>
            <mat-icon class="card-icon">person</mat-icon>
            <h2>Customers</h2>
            <p>Manage customers</p>
          </mat-card-content>
        </mat-card>

        <mat-card class="dashboard-card">
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

        <mat-card class="dashboard-card">
          <mat-card-content>
            <mat-icon class="card-icon">receipt</mat-icon>
            <h2>Sales</h2>
            <p>Sales invoices</p>
          </mat-card-content>
        </mat-card>

        <mat-card class="dashboard-card">
          <mat-card-content>
            <mat-icon class="card-icon">shopping_cart</mat-icon>
            <h2>Purchases</h2>
            <p>Purchase invoices</p>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styleUrl: './dashboard.component.scss'
})

export class DashboardComponent {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    const user = this.authService.currentUserValue;
    if (user && user.role === 'sales') {
      this.router.navigate(['/salesman/dashboard']);
    }
  }
}
