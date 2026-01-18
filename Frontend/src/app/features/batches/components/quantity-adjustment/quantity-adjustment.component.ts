import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { Batch, QuantityAdjustment } from '../../models/batch.model';
import { BatchService } from '../../services/batch.service';

export interface QuantityAdjustmentDialogData {
  batch: Batch;
  batchId: string;
}

@Component({
  selector: 'app-quantity-adjustment',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule
  ],
  template: `
    <div class="quantity-adjustment-dialog">
      <h2 mat-dialog-title>
        <mat-icon>tune</mat-icon>
        Adjust Quantity - {{ data.batch.batchNumber }}
      </h2>
      
      <mat-dialog-content>
        <div class="current-info">
          <div class="info-item">
            <label>Current Quantity:</label>
            <span>{{ data.batch.remainingQuantity }}</span>
          </div>
        </div>
        
        <form [formGroup]="adjustmentForm" class="adjustment-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Adjustment Amount</mat-label>
            <input matInput type="number" formControlName="adjustmentAmount" 
                   placeholder="Enter positive or negative amount">
            <mat-hint>Positive for additions, negative for removals</mat-hint>
            <mat-error *ngIf="adjustmentForm.get('adjustmentAmount')?.hasError('required')">
              Adjustment amount is required
            </mat-error>
            <mat-error *ngIf="adjustmentForm.get('adjustmentAmount')?.hasError('invalidAdjustment')">
              Cannot remove more than remaining quantity
            </mat-error>
          </mat-form-field>
          
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Reason</mat-label>
            <mat-select formControlName="reason">
              <mat-option value="damaged">Damaged</mat-option>
              <mat-option value="expired">Expired</mat-option>
              <mat-option value="sold">Sold</mat-option>
              <mat-option value="returned">Returned</mat-option>
              <mat-option value="transfer">Transfer</mat-option>
              <mat-option value="adjustment">Inventory Adjustment</mat-option>
              <mat-option value="other">Other</mat-option>
            </mat-select>
            <mat-error *ngIf="adjustmentForm.get('reason')?.hasError('required')">
              Reason is required
            </mat-error>
          </mat-form-field>
          
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Notes (Optional)</mat-label>
            <textarea matInput formControlName="notes" rows="3" 
                      placeholder="Additional notes about this adjustment"></textarea>
          </mat-form-field>
          
          <div class="calculation-display" *ngIf="getNewQuantity() !== null">
            <div class="calculation-item">
              <label>New Quantity:</label>
              <span [class.negative]="getNewQuantity()! < 0">{{ getNewQuantity() }}</span>
            </div>
          </div>
        </form>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" 
                [disabled]="adjustmentForm.invalid || submitting"
                (click)="onSubmit()">
          {{ submitting ? 'Adjusting...' : 'Adjust Quantity' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .quantity-adjustment-dialog {
      h2 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        
        mat-icon {
          color: #1976d2;
        }
      }
      
      mat-dialog-content {
        padding: 16px 0;
        min-width: 400px;
        
        .current-info {
          background-color: #f5f5f5;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          
          .info-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            
            label {
              font-weight: 500;
              color: rgba(0, 0, 0, 0.7);
            }
            
            span {
              font-weight: 600;
              font-size: 1.1rem;
              color: #1976d2;
            }
          }
        }
        
        .adjustment-form {
          .full-width {
            width: 100%;
            margin-bottom: 16px;
          }
          
          .calculation-display {
            background-color: #e3f2fd;
            padding: 16px;
            border-radius: 8px;
            border-left: 4px solid #1976d2;
            
            .calculation-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              
              label {
                font-weight: 500;
                color: rgba(0, 0, 0, 0.7);
              }
              
              span {
                font-weight: 600;
                font-size: 1.2rem;
                color: #1976d2;
                
                &.negative {
                  color: #f44336;
                }
              }
            }
          }
        }
      }
      
      mat-dialog-actions {
        padding: 16px 0 0 0;
        gap: 8px;
      }
    }
  `]
})
export class QuantityAdjustmentComponent implements OnInit {
  adjustmentForm: FormGroup;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private batchService: BatchService,
    public dialogRef: MatDialogRef<QuantityAdjustmentComponent>,
    @Inject(MAT_DIALOG_DATA) public data: QuantityAdjustmentDialogData
  ) {
    this.adjustmentForm = this.fb.group({
      adjustmentAmount: [0, [Validators.required, this.adjustmentValidator.bind(this)]],
      reason: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    // Watch for changes in adjustment amount to validate
    this.adjustmentForm.get('adjustmentAmount')?.valueChanges.subscribe(() => {
      this.adjustmentForm.get('adjustmentAmount')?.updateValueAndValidity();
    });
  }

  adjustmentValidator(control: any) {
    const adjustmentAmount = control.value;
    if (adjustmentAmount === null || adjustmentAmount === undefined) {
      return null;
    }

    const newQuantity = this.data.batch.remainingQuantity + adjustmentAmount;
    if (newQuantity < 0) {
      return { invalidAdjustment: true };
    }

    return null;
  }

  getNewQuantity(): number | null {
    const adjustmentAmount = this.adjustmentForm.get('adjustmentAmount')?.value;
    if (adjustmentAmount === null || adjustmentAmount === undefined || adjustmentAmount === '') {
      return null;
    }
    return this.data.batch.remainingQuantity + Number(adjustmentAmount);
  }

  onSubmit(): void {
    if (this.adjustmentForm.valid && !this.submitting) {
      this.submitting = true;

      const adjustment: QuantityAdjustment = {
        adjustmentAmount: this.adjustmentForm.get('adjustmentAmount')?.value,
        reason: this.adjustmentForm.get('reason')?.value,
        notes: this.adjustmentForm.get('notes')?.value || undefined
      };

      this.batchService.adjustQuantity(this.data.batchId, adjustment).subscribe({
        next: (updatedBatch) => {
          this.submitting = false;
          this.dialogRef.close(updatedBatch);
        },
        error: (error) => {
          this.submitting = false;
          console.error('Error adjusting quantity:', error);
          // Let the parent component handle the error display
          this.dialogRef.close(null);
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}