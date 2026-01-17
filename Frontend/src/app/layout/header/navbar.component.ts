// navbar.component.ts
import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';

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
    MatDividerModule
  ],
  template: `
    <mat-toolbar class="navbar">
      <!-- hamburger -->
      <button mat-icon-button class="menu-btn" (click)="toggleSidebar.emit()">
        <mat-icon>menu</mat-icon>
      </button>

      <!-- search (Hidden for Salesman) -->
      <div class="search-input-container" *ngIf="!isSalesman">
        <input type="text" placeholder="Search…" />
      </div>

      <!-- Company Name (Visible for Salesman) -->
      <div class="company-branding" *ngIf="isSalesman">
        <h2 style="margin: 0; color: #5e50ee; font-weight: 600;">Indus Pharma</h2>
      </div>

      <span class="spacer"></span>

      <!-- search icon (Hidden for Salesman) -->
      <button mat-icon-button class="icon-btn" *ngIf="!isSalesman">
        <mat-icon>search</mat-icon>
      </button>
      
      <span class="spacer" *ngIf="!isSalesman"></span>

      <!-- RIGHT CORNER GROUP -->
      <div class="right-group">
        <!-- notifications -->
        <button mat-icon-button class="icon-btn" [matMenuTriggerFor]="notifMenu">
          <mat-icon>notifications</mat-icon>
          <span class="badge-dot"></span>
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
      <mat-menu #notifMenu="matMenu">
        <div class="notif-placeholder">No new notifications</div>
      </mat-menu>

      <mat-menu #userMenu="matMenu">
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

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => this.currentUser = user);
  }

  get isSalesman(): boolean {
    return this.currentUser?.role === 'sales';
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }
}