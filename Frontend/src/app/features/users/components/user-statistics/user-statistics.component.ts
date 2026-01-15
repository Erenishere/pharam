import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UserService } from '../../services/user.service';
import { UserStatistics } from '../../../../core/models/user.model';

@Component({
    selector: 'app-user-statistics',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatIconModule,
        MatProgressSpinnerModule
    ],
    template: `
    <div class="statistics-container">
      <div *ngIf="loading" class="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div *ngIf="!loading && statistics" class="stats-grid">
        <mat-card class="stat-card total">
          <div class="stat-icon">
            <mat-icon>people</mat-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.total }}</div>
            <div class="stat-label">Total Users</div>
          </div>
        </mat-card>

        <mat-card class="stat-card active">
          <div class="stat-icon">
            <mat-icon>check_circle</mat-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.active }}</div>
            <div class="stat-label">Active</div>
          </div>
        </mat-card>

        <mat-card class="stat-card inactive">
          <div class="stat-icon">
            <mat-icon>cancel</mat-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.inactive }}</div>
            <div class="stat-label">Inactive</div>
          </div>
        </mat-card>

        <mat-card class="stat-card deleted">
          <div class="stat-icon">
            <mat-icon>delete</mat-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.deleted }}</div>
            <div class="stat-label">Deleted</div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
    styles: [`
    .statistics-container {
      margin-bottom: 24px;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 24px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      padding: 20px;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .stat-icon {
        margin-right: 16px;
        
        mat-icon {
          font-size: 48px;
          width: 48px;
          height: 48px;
        }
      }

      .stat-content {
        .stat-value {
          font-size: 32px;
          font-weight: 600;
          line-height: 1;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 14px;
          color: #666;
          font-weight: 500;
        }
      }

      &.total {
        .stat-icon mat-icon {
          color: #673ab7;
        }
        .stat-value {
          color: #673ab7;
        }
      }

      &.active {
        .stat-icon mat-icon {
          color: #4caf50;
        }
        .stat-value {
          color: #4caf50;
        }
      }

      &.inactive {
        .stat-icon mat-icon {
          color: #ff9800;
        }
        .stat-value {
          color: #ff9800;
        }
      }

      &.deleted {
        .stat-icon mat-icon {
          color: #f44336;
        }
        .stat-value {
          color: #f44336;
        }
      }
    }
  `]
})
export class UserStatisticsComponent implements OnInit {
    statistics: UserStatistics | null = null;
    loading = false;

    constructor(private userService: UserService) { }

    ngOnInit(): void {
        this.loadStatistics();
    }

    loadStatistics(): void {
        this.loading = true;
        this.userService.getUserStatistics().subscribe({
            next: (response) => {
                if (response.success) {
                    this.statistics = response.data;
                }
                this.loading = false;
            },
            error: () => {
                this.loading = false;
            }
        });
    }
}
