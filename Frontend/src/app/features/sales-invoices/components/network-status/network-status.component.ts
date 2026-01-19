/**
 * Network Status Component
 * 
 * This component displays the current network status and sync information
 * for offline functionality awareness.
 */

import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { OfflineService, SyncStatus } from '../../services/offline.service';

@Component({
    selector: 'app-network-status',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
        MatProgressSpinnerModule,
        MatBadgeModule
    ],
    template: `
    <div class="network-status" [class]="getStatusClass(syncStatus$ | async)">
      <button 
        mat-icon-button 
        [matTooltip]="getTooltipText(syncStatus$ | async)"
        (click)="onStatusClick()"
        class="status-button">
        
        <!-- Online Status -->
        <mat-icon 
          *ngIf="(syncStatus$ | async)?.isOnline && !(syncStatus$ | async)?.syncInProgress"
          class="online-icon">
          wifi
        </mat-icon>
        
        <!-- Offline Status -->
        <mat-icon 
          *ngIf="!(syncStatus$ | async)?.isOnline"
          class="offline-icon">
          wifi_off
        </mat-icon>
        
        <!-- Syncing Status -->
        <mat-spinner 
          *ngIf="(syncStatus$ | async)?.syncInProgress"
          diameter="20"
          class="sync-spinner">
        </mat-spinner>
        
        <!-- Pending Operations Badge -->
        <span 
          *ngIf="(syncStatus$ | async)?.pendingOperations && (syncStatus$ | async)!.pendingOperations > 0"
          matBadge="{{ (syncStatus$ | async)!.pendingOperations }}"
          matBadgePosition="after"
          matBadgeSize="small"
          matBadgeColor="warn"
          class="badge-container">
        </span>
      </button>
      
      <!-- Status Text (optional, for larger screens) -->
      <span class="status-text" *ngIf="showStatusText">
        {{ getStatusText(syncStatus$ | async) }}
      </span>
    </div>
  `,
    styleUrls: ['./network-status.component.scss']
})
export class NetworkStatusComponent implements OnInit, OnDestroy {
    syncStatus$: Observable<SyncStatus>;
    showStatusText = false;

    private destroy$ = new Subject<void>();

    constructor(private offlineService: OfflineService) {
        this.syncStatus$ = this.offlineService.getSyncStatus();
    }

    ngOnInit(): void {
        // Check screen size to determine if we should show status text
        this.checkScreenSize();
        window.addEventListener('resize', () => this.checkScreenSize());
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        window.removeEventListener('resize', () => this.checkScreenSize());
    }

    onStatusClick(): void {
        // Trigger manual sync if offline operations are pending
        this.syncStatus$.pipe(takeUntil(this.destroy$)).subscribe(status => {
            if (status.isOnline && status.pendingOperations > 0 && !status.syncInProgress) {
                this.offlineService.syncNow().subscribe(
                    success => {
                        console.log('Manual sync result:', success);
                    },
                    error => {
                        console.error('Manual sync failed:', error);
                    }
                );
            }
        });
    }

    getStatusClass(status: SyncStatus | null): string {
        if (!status) return 'unknown';

        if (status.syncInProgress) return 'syncing';
        if (!status.isOnline) return 'offline';
        if (status.pendingOperations > 0) return 'pending';
        return 'online';
    }

    getTooltipText(status: SyncStatus | null): string {
        if (!status) return 'Network status unknown';

        if (status.syncInProgress) {
            return 'Syncing data...';
        }

        if (!status.isOnline) {
            const pendingText = status.pendingOperations > 0
                ? ` (${status.pendingOperations} operations pending)`
                : '';
            return `Offline${pendingText}`;
        }

        if (status.pendingOperations > 0) {
            return `Online - ${status.pendingOperations} operations pending sync. Click to sync now.`;
        }

        const lastSyncText = status.lastSyncTime > 0
            ? ` Last sync: ${new Date(status.lastSyncTime).toLocaleTimeString()}`
            : '';
        return `Online - All data synced${lastSyncText}`;
    }

    getStatusText(status: SyncStatus | null): string {
        if (!status) return 'Unknown';

        if (status.syncInProgress) return 'Syncing...';
        if (!status.isOnline) return 'Offline';
        if (status.pendingOperations > 0) return `${status.pendingOperations} pending`;
        return 'Online';
    }

    private checkScreenSize(): void {
        this.showStatusText = window.innerWidth > 768;
    }
}