import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';
import { Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, startWith, map } from 'rxjs/operators';

import { Batch, BatchStatus, Location } from '../../models/batch.model';
import { BatchService } from '../../services/batch.service';
import { LocationService } from '../../../../core/services/location.service';
import { LocationOption } from '../../../../core/models/location.model';

export interface ExpiryGroup {
  level: 'critical' | 'warning' | 'normal';
  label: string;
  color: string;
  batches: Batch[];
  daysRemaining: number;
}

export interface LocationSummary {
  locationId: string;
  locationName: string;
  locationCode: string;
  expiredCount: number;
  criticalCount: number;
  warningCount: number;
  normalCount: number;
  totalCount: number;
}

@Component({
  selector: 'app-expiry-tracker',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    RouterModule
  ],
  template: `
    <div class="expiry-tracker-container">
      <mat-card class="header-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>schedule</mat-icon>
            Expiry Tracker
          </mat-card-title>
          <mat-card-subtitle>Monitor batches approaching expiration</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <form [formGroup]="configForm" class="config-form">
            <mat-form-field appearance="outline">
              <mat-label>Warning Period (Days)</mat-label>
              <input matInput type="number" formControlName="warningPeriod" 
                     min="1" max="365" placeholder="30">
              <mat-hint>Show batches expiring within this many days (1-365)</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Filter by Location</mat-label>
              <mat-select formControlName="selectedLocationIds" multiple>
                <mat-option value="">All Locations</mat-option>
                <mat-option *ngFor="let location of locationOptions$ | async" [value]="location.value">
                  {{ location.label }} ({{ location.type }})
                </mat-option>
              </mat-select>
              <mat-hint>Select specific locations to filter expiring batches</mat-hint>
            </mat-form-field>

            <div class="action-buttons">
              <button mat-raised-button color="primary" 
                      (click)="exportExpiringBatches()"
                      [disabled]="(expiryGroups$ | async)?.length === 0">
                <mat-icon>download</mat-icon>
                Export Report
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <div class="summary-cards" *ngIf="expiryGroups$ | async as groups">
        <mat-card class="summary-card expired" *ngIf="getExpiredCount(groups) > 0">
          <mat-card-content>
            <div class="summary-content">
              <mat-icon>dangerous</mat-icon>
              <div class="summary-text">
                <div class="count">{{ getExpiredCount(groups) }}</div>
                <div class="label">Already Expired</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card critical" *ngIf="getCriticalCount(groups) > 0">
          <mat-card-content>
            <div class="summary-content">
              <mat-icon>error</mat-icon>
              <div class="summary-text">
                <div class="count">{{ getCriticalCount(groups) }}</div>
                <div class="label">Critical (≤3 days)</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card warning" *ngIf="getWarningCount(groups) > 0">
          <mat-card-content>
            <div class="summary-content">
              <mat-icon>warning</mat-icon>
              <div class="summary-text">
                <div class="count">{{ getWarningCount(groups) }}</div>
                <div class="label">Warning (4-7 days)</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card normal" *ngIf="getNormalCount(groups) > 0">
          <mat-card-content>
            <div class="summary-content">
              <mat-icon>info</mat-icon>
              <div class="summary-text">
                <div class="count">{{ getNormalCount(groups) }}</div>
                <div class="label">Normal (8+ days)</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card total">
          <mat-card-content>
            <div class="summary-content">
              <mat-icon>inventory</mat-icon>
              <div class="summary-text">
                <div class="count">{{ getTotalCount(groups) }}</div>
                <div class="label">Total Expiring</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Location Summary -->
      <mat-card class="location-summary-card" *ngIf="getLocationSummary(expiryGroups$ | async) as locationSummary">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>location_on</mat-icon>
            Expiring Batches by Location
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="location-summary-grid">
            <div class="location-item" *ngFor="let item of locationSummary">
              <div class="location-info">
                <div class="location-name">{{ item.locationName }}</div>
                <div class="location-code">{{ item.locationCode }}</div>
              </div>
              <div class="location-counts">
                <mat-chip class="expired-chip" *ngIf="item.expiredCount > 0">
                  {{ item.expiredCount }} expired
                </mat-chip>
                <mat-chip class="critical-chip" *ngIf="item.criticalCount > 0">
                  {{ item.criticalCount }} critical
                </mat-chip>
                <mat-chip class="warning-chip" *ngIf="item.warningCount > 0">
                  {{ item.warningCount }} warning
                </mat-chip>
                <mat-chip class="normal-chip" *ngIf="item.normalCount > 0">
                  {{ item.normalCount }} normal
                </mat-chip>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <div class="loading-container" *ngIf="loading$ | async">
        <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
        <p>Loading expiring batches...</p>
      </div>

      <div class="expiry-groups" *ngIf="expiryGroups$ | async as groups">
        <mat-card *ngFor="let group of groups" class="group-card" [ngClass]="group.level">
          <mat-card-header>
            <mat-card-title>
              <mat-icon [style.color]="group.color">{{ getGroupIcon(group.level) }}</mat-icon>
              {{ group.label }}
              <mat-chip [style.background-color]="group.color" [style.color]="'white'">
                {{ group.batches.length }}
              </mat-chip>
            </mat-card-title>
          </mat-card-header>

          <mat-card-content>
            <div class="batch-table-container">
              <table mat-table [dataSource]="group.batches" class="batch-table">
                <!-- Batch Number Column -->
                <ng-container matColumnDef="batchNumber">
                  <th mat-header-cell *matHeaderCellDef>Batch Number</th>
                  <td mat-cell *matCellDef="let batch">
                    <a [routerLink]="['/batches/detail', batch._id]" class="batch-link">
                      {{ batch.batchNumber }}
                    </a>
                  </td>
                </ng-container>

                <!-- Item Column -->
                <ng-container matColumnDef="item">
                  <th mat-header-cell *matHeaderCellDef>Item</th>
                  <td mat-cell *matCellDef="let batch">
                    <div class="item-info">
                      <div class="item-name">{{ batch.item?.name || 'Unknown Item' }}</div>
                      <div class="item-code">{{ batch.item?.code }}</div>
                    </div>
                  </td>
                </ng-container>

                <!-- Quantity Column -->
                <ng-container matColumnDef="quantity">
                  <th mat-header-cell *matHeaderCellDef>Remaining Qty</th>
                  <td mat-cell *matCellDef="let batch">
                    <div class="quantity-info">
                      <span class="remaining">{{ batch.remainingQuantity }}</span>
                      <span class="unit">{{ batch.item?.unit }}</span>
                    </div>
                  </td>
                </ng-container>

                <!-- Expiry Date Column -->
                <ng-container matColumnDef="expiryDate">
                  <th mat-header-cell *matHeaderCellDef>Expiry Date</th>
                  <td mat-cell *matCellDef="let batch">
                    <div class="expiry-info">
                      <div class="date">{{ formatDate(batch.expiryDate) }}</div>
                      <div class="days-remaining" [ngClass]="getExpiryClass(batch)">
                        {{ getDaysRemaining(batch.expiryDate) }}
                      </div>
                    </div>
                  </td>
                </ng-container>

                <!-- Location Column -->
                <ng-container matColumnDef="location">
                  <th mat-header-cell *matHeaderCellDef>Location</th>
                  <td mat-cell *matCellDef="let batch">
                    <div class="location-info">
                      <div class="location-name">{{ batch.location?.name || 'Unknown' }}</div>
                      <div class="location-code">{{ batch.location?.code }}</div>
                    </div>
                  </td>
                </ng-container>

                <!-- Status Column -->
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let batch">
                    <mat-chip [ngClass]="'status-' + batch.status">
                      {{ getStatusLabel(batch.status) }}
                    </mat-chip>
                  </td>
                </ng-container>

                <!-- Actions Column -->
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>Actions</th>
                  <td mat-cell *matCellDef="let batch">
                    <div class="actions">
                      <button mat-icon-button 
                              [routerLink]="['/batches/detail', batch._id]"
                              matTooltip="View Details">
                        <mat-icon>visibility</mat-icon>
                      </button>
                      <button mat-icon-button 
                              [routerLink]="['/batches/edit', batch._id]"
                              matTooltip="Edit Batch"
                              *ngIf="batch.status !== 'expired'">
                        <mat-icon>edit</mat-icon>
                      </button>
                    </div>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>
            </div>

            <div class="no-batches" *ngIf="group.batches.length === 0">
              <mat-icon>check_circle</mat-icon>
              <p>No batches in this category</p>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="no-data" *ngIf="(expiryGroups$ | async)?.length === 0 && !(loading$ | async)">
        <mat-card>
          <mat-card-content>
            <div class="no-data-content">
              <mat-icon>check_circle_outline</mat-icon>
              <h3>No Expiring Batches</h3>
              <p>All batches are within safe expiry periods.</p>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styleUrls: ['./expiry-tracker-enhanced.component.scss']
})
export class ExpiryTrackerComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  configForm: FormGroup;
  displayedColumns = ['batchNumber', 'item', 'quantity', 'expiryDate', 'location', 'status', 'actions'];

  loading$ = new BehaviorSubject<boolean>(false);
  warningPeriod$ = new BehaviorSubject<number>(30);
  selectedLocationIds$ = new BehaviorSubject<string[]>([]);
  expiryGroups$ = new BehaviorSubject<ExpiryGroup[]>([]);
  locationOptions$ = new BehaviorSubject<LocationOption[]>([]);

  constructor(
    private fb: FormBuilder,
    private batchService: BatchService,
    private locationService: LocationService,
    private snackBar: MatSnackBar
  ) {
    this.configForm = this.fb.group({
      warningPeriod: [30],
      selectedLocationIds: [[]]
    });
  }

  ngOnInit(): void {
    // Load location options
    this.locationService.getLocationOptions().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (options) => {
        this.locationOptions$.next(options);
      },
      error: (error) => {
        console.error('Error loading locations:', error);
        this.snackBar.open('Failed to load locations', 'Close', { duration: 3000 });
      }
    });

    // Watch for warning period changes
    this.configForm.get('warningPeriod')?.valueChanges.pipe(
      startWith(30),
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(period => {
      if (period >= 1 && period <= 365) {
        this.warningPeriod$.next(period);
      }
    });

    // Watch for location filter changes
    this.configForm.get('selectedLocationIds')?.valueChanges.pipe(
      startWith([]),
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(locationIds => {
      this.selectedLocationIds$.next(locationIds || []);
    });

    // Load expiring batches when warning period or location filter changes
    combineLatest([
      this.warningPeriod$,
      this.selectedLocationIds$
    ]).pipe(
      switchMap(([period, locationIds]) => {
        this.loading$.next(true);
        // If specific locations are selected, we need to filter by them
        if (locationIds.length > 0) {
          // Get all expiring batches and filter by location on frontend
          // This is a simplified approach - ideally the backend would support multiple location filtering
          return this.batchService.getExpiringBatches(period).pipe(
            map(batches => batches.filter(batch =>
              locationIds.includes(batch.locationId)
            ))
          );
        } else {
          // Get all expiring batches
          return this.batchService.getExpiringBatches(period);
        }
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (batches) => {
        this.processExpiringBatches(batches);
        this.loading$.next(false);
      },
      error: (error) => {
        console.error('Error loading expiring batches:', error);
        this.snackBar.open('Failed to load expiring batches', 'Close', { duration: 3000 });
        this.loading$.next(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private processExpiringBatches(batches: Batch[]): void {
    const now = new Date();
    const groups: ExpiryGroup[] = [];

    // Sort batches by expiry date (soonest first)
    const sortedBatches = batches.sort((a, b) =>
      new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
    );

    // Enhanced grouping by urgency levels with more granular categories
    const expiredBatches = sortedBatches.filter(batch => {
      const daysRemaining = this.calculateDaysRemaining(batch.expiryDate);
      return daysRemaining < 0 || batch.status === BatchStatus.EXPIRED;
    });

    const todayBatches = sortedBatches.filter(batch => {
      const daysRemaining = this.calculateDaysRemaining(batch.expiryDate);
      return daysRemaining === 0 && batch.status !== BatchStatus.EXPIRED;
    });

    const criticalBatches = sortedBatches.filter(batch => {
      const daysRemaining = this.calculateDaysRemaining(batch.expiryDate);
      return daysRemaining > 0 && daysRemaining <= 3 && batch.status !== BatchStatus.EXPIRED;
    });

    const warningBatches = sortedBatches.filter(batch => {
      const daysRemaining = this.calculateDaysRemaining(batch.expiryDate);
      return daysRemaining > 3 && daysRemaining <= 7 && batch.status !== BatchStatus.EXPIRED;
    });

    const normalBatches = sortedBatches.filter(batch => {
      const daysRemaining = this.calculateDaysRemaining(batch.expiryDate);
      return daysRemaining > 7 && batch.status !== BatchStatus.EXPIRED;
    });

    // Create groups with enhanced categorization
    if (expiredBatches.length > 0) {
      groups.push({
        level: 'critical',
        label: `Expired Batches (${expiredBatches.length})`,
        color: '#d32f2f',
        batches: expiredBatches,
        daysRemaining: -1
      });
    }

    if (todayBatches.length > 0) {
      groups.push({
        level: 'critical',
        label: `Expiring Today (${todayBatches.length})`,
        color: '#f44336',
        batches: todayBatches,
        daysRemaining: 0
      });
    }

    if (criticalBatches.length > 0) {
      groups.push({
        level: 'critical',
        label: `Critical - Expiring in 1-3 Days (${criticalBatches.length})`,
        color: '#ff5722',
        batches: criticalBatches,
        daysRemaining: 3
      });
    }

    if (warningBatches.length > 0) {
      groups.push({
        level: 'warning',
        label: `Warning - Expiring in 4-7 Days (${warningBatches.length})`,
        color: '#ff9800',
        batches: warningBatches,
        daysRemaining: 7
      });
    }

    if (normalBatches.length > 0) {
      groups.push({
        level: 'normal',
        label: `Normal - Expiring in 8-${this.warningPeriod$.value} Days (${normalBatches.length})`,
        color: '#2196f3',
        batches: normalBatches,
        daysRemaining: this.warningPeriod$.value
      });
    }

    this.expiryGroups$.next(groups);
  }

  private calculateDaysRemaining(expiryDate: Date | string): number {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDaysRemaining(expiryDate: Date | string): string {
    const days = this.calculateDaysRemaining(expiryDate);

    if (days < 0) {
      return `Expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago`;
    } else if (days === 0) {
      return 'Expires today';
    } else if (days === 1) {
      return 'Expires tomorrow';
    } else {
      return `${days} days remaining`;
    }
  }

  getExpiryClass(batch: Batch): string {
    const days = this.calculateDaysRemaining(batch.expiryDate);

    if (batch.status === BatchStatus.EXPIRED || days < 0) {
      return 'expired';
    } else if (days === 0) {
      return 'critical';
    } else if (days <= 7) {
      return 'warning';
    } else {
      return 'normal';
    }
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getStatusLabel(status: BatchStatus): string {
    switch (status) {
      case BatchStatus.ACTIVE:
        return 'Active';
      case BatchStatus.EXPIRED:
        return 'Expired';
      case BatchStatus.DEPLETED:
        return 'Depleted';
      case BatchStatus.QUARANTINED:
        return 'Quarantined';
      default:
        return status;
    }
  }

  getGroupIcon(level: string): string {
    switch (level) {
      case 'critical':
        return 'error';
      case 'warning':
        return 'warning';
      case 'normal':
        return 'info';
      default:
        return 'info';
    }
  }

  getExpiredCount(groups: ExpiryGroup[]): number {
    return groups
      .filter(g => g.label.includes('Expired'))
      .reduce((sum, group) => sum + group.batches.length, 0);
  }

  getCriticalCount(groups: ExpiryGroup[]): number {
    return groups
      .filter(g => g.level === 'critical' && !g.label.includes('Expired'))
      .reduce((sum, group) => sum + group.batches.length, 0);
  }

  getWarningCount(groups: ExpiryGroup[]): number {
    const warningGroup = groups.find(g => g.level === 'warning');
    return warningGroup ? warningGroup.batches.length : 0;
  }

  getNormalCount(groups: ExpiryGroup[]): number {
    const normalGroup = groups.find(g => g.level === 'normal');
    return normalGroup ? normalGroup.batches.length : 0;
  }

  getTotalCount(groups: ExpiryGroup[]): number {
    return groups.reduce((sum, group) => sum + group.batches.length, 0);
  }

  /**
   * Generate location summary data
   */
  getLocationSummary(groups: ExpiryGroup[] | null): LocationSummary[] {
    if (!groups || groups.length === 0) {
      return [];
    }

    const locationMap = new Map<string, LocationSummary>();

    // Process all batches from all groups
    groups.forEach(group => {
      group.batches.forEach(batch => {
        const locationId = batch.locationId;
        const locationName = batch.location?.name || 'Unknown Location';
        const locationCode = batch.location?.code || '';

        if (!locationMap.has(locationId)) {
          locationMap.set(locationId, {
            locationId,
            locationName,
            locationCode,
            expiredCount: 0,
            criticalCount: 0,
            warningCount: 0,
            normalCount: 0,
            totalCount: 0
          });
        }

        const summary = locationMap.get(locationId)!;
        summary.totalCount++;

        // Categorize based on days remaining
        const daysRemaining = this.calculateDaysRemaining(batch.expiryDate);

        if (daysRemaining < 0 || batch.status === BatchStatus.EXPIRED) {
          summary.expiredCount++;
        } else if (daysRemaining <= 3) {
          summary.criticalCount++;
        } else if (daysRemaining <= 7) {
          summary.warningCount++;
        } else {
          summary.normalCount++;
        }
      });
    });

    // Convert to array and sort by total count (descending)
    return Array.from(locationMap.values())
      .sort((a, b) => b.totalCount - a.totalCount);
  }

  /**
   * Export expiring batches to CSV
   */
  exportExpiringBatches(): void {
    const groups = this.expiryGroups$.value;
    if (groups.length === 0) {
      this.snackBar.open('No expiring batches to export', 'Close', { duration: 3000 });
      return;
    }

    try {
      // Flatten all batches from all groups
      const allBatches = groups.reduce((acc, group) => {
        return acc.concat(group.batches.map(batch => ({
          ...batch,
          urgencyLevel: group.level,
          urgencyLabel: group.label
        })));
      }, [] as any[]);

      // Create CSV content
      const headers = [
        'Batch Number',
        'Item Name',
        'Item Code',
        'Remaining Quantity',
        'Unit',
        'Expiry Date',
        'Days Remaining',
        'Location Name',
        'Location Code',
        'Status',
        'Urgency Level',
        'Supplier Name',
        'Manufacturing Date',
        'Unit Cost',
        'Notes'
      ];

      const csvContent = [
        headers.join(','),
        ...allBatches.map(batch => [
          `"${batch.batchNumber}"`,
          `"${batch.item?.name || 'Unknown'}"`,
          `"${batch.item?.code || ''}"`,
          batch.remainingQuantity,
          `"${batch.item?.unit || ''}"`,
          `"${this.formatDate(batch.expiryDate)}"`,
          this.calculateDaysRemaining(batch.expiryDate),
          `"${batch.location?.name || 'Unknown'}"`,
          `"${batch.location?.code || ''}"`,
          `"${this.getStatusLabel(batch.status)}"`,
          `"${batch.urgencyLabel}"`,
          `"${batch.supplier?.name || ''}"`,
          `"${this.formatDate(batch.manufacturingDate)}"`,
          batch.unitCost,
          `"${batch.notes || ''}"`
        ].join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');

      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);

        // Generate filename with current date and location filter info
        const currentDate = new Date().toISOString().split('T')[0];
        const locationFilter = this.selectedLocationIds$.value.length > 0 ?
          '_filtered' : '_all_locations';
        const filename = `expiring_batches_${currentDate}${locationFilter}.csv`;

        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.snackBar.open(
          `Exported ${allBatches.length} expiring batches to ${filename}`,
          'Close',
          { duration: 5000 }
        );
      }
    } catch (error) {
      console.error('Error exporting batches:', error);
      this.snackBar.open('Failed to export batches', 'Close', { duration: 3000 });
    }
  }
}