import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, Subject, takeUntil } from 'rxjs';
import { Batch, BatchStatus } from '../../models/batch.model';
import { BatchService } from '../../services/batch.service';

@Component({
  selector: 'app-batch-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './batch-detail.component.html',
  styleUrls: ['./batch-detail.component.scss']
})
export class BatchDetailComponent implements OnInit, OnDestroy {
  batch$: Observable<Batch> | null = null;
  batch: Batch | null = null;
  loading = true;
  error: string | null = null;
  batchId: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private batchService: BatchService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.batchId = this.route.snapshot.paramMap.get('id');
    if (this.batchId) {
      this.loadBatchDetails();
    } else {
      this.error = 'No batch ID provided';
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadBatchDetails(): void {
    if (!this.batchId) return;

    this.loading = true;
    this.error = null;

    this.batchService.getBatchById(this.batchId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (batch) => {
          this.batch = batch;
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Failed to load batch details';
          this.loading = false;
          console.error('Error loading batch:', error);
        }
      });
  }

  getStatusColor(status: BatchStatus): string {
    switch (status) {
      case BatchStatus.ACTIVE:
        return 'primary';
      case BatchStatus.EXPIRED:
        return 'warn';
      case BatchStatus.DEPLETED:
        return 'accent';
      case BatchStatus.QUARANTINED:
        return 'warn';
      default:
        return 'primary';
    }
  }

  getStatusIcon(status: BatchStatus): string {
    switch (status) {
      case BatchStatus.ACTIVE:
        return 'check_circle';
      case BatchStatus.EXPIRED:
        return 'warning';
      case BatchStatus.DEPLETED:
        return 'remove_circle';
      case BatchStatus.QUARANTINED:
        return 'block';
      default:
        return 'help';
    }
  }

  isExpiringSoon(expiryDate: Date): boolean {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  }

  isExpired(expiryDate: Date): boolean {
    const today = new Date();
    const expiry = new Date(expiryDate);
    return expiry < today;
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  calculateTotalValue(): number {
    return this.batch ? this.batch.remainingQuantity * this.batch.unitCost : 0;
  }

  onEditBatch(): void {
    if (this.batchId) {
      this.router.navigate(['/batches/edit', this.batchId]);
    }
  }

  onAdjustQuantity(): void {
    if (!this.batch || !this.batchId) return;

    // Import and open the quantity adjustment modal
    import('../quantity-adjustment/quantity-adjustment.component').then(m => {
      const dialogRef = this.dialog.open(m.QuantityAdjustmentComponent, {
        width: '500px',
        data: {
          batch: this.batch,
          batchId: this.batchId
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          // Refresh batch data after quantity adjustment
          this.loadBatchDetails();
          this.snackBar.open('Quantity adjusted successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
        }
      });
    }).catch(error => {
      console.error('Error loading quantity adjustment component:', error);
      this.snackBar.open('Failed to open quantity adjustment dialog', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    });
  }

  onDeleteBatch(): void {
    if (!this.batch || !this.batchId) return;

    if (!this.canDeleteBatch()) {
      this.snackBar.open('Cannot delete batch with remaining quantity', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Import and open confirmation dialog
    import('./confirmation-dialog.component').then(m => {
      const dialogRef = this.dialog.open(m.ConfirmationDialogComponent, {
        width: '400px',
        data: {
          title: 'Delete Batch',
          message: `Are you sure you want to delete batch "${this.batch?.batchNumber}"? This action cannot be undone.`,
          confirmText: 'Delete',
          cancelText: 'Cancel',
          type: 'warn'
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result && this.batchId) {
          this.deleteBatch();
        }
      });
    }).catch(error => {
      console.error('Error loading confirmation dialog:', error);
      this.snackBar.open('Failed to open confirmation dialog', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    });
  }

  private deleteBatch(): void {
    if (!this.batchId) return;

    this.batchService.deleteBatch(this.batchId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Batch deleted successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.router.navigate(['/batches']);
        },
        error: (error) => {
          console.error('Error deleting batch:', error);
          this.snackBar.open('Failed to delete batch', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
      });
  }

  canDeleteBatch(): boolean {
    return this.batch ? this.batch.remainingQuantity === 0 : false;
  }

  goBack(): void {
    this.router.navigate(['/batches']);
  }
}