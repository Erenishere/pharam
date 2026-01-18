import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: 'primary' | 'accent' | 'warn';
}

/**
 * Reusable confirmation dialog component
 * 
 * Used for confirming destructive actions like delete operations
 */
@Component({
    selector: 'app-confirm-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule
    ],
    template: `
    <div class="confirm-dialog">
      <h2 mat-dialog-title>
        <mat-icon class="dialog-icon">{{ data.confirmColor === 'warn' ? 'warning' : 'help_outline' }}</mat-icon>
        {{ data.title }}
      </h2>
      <mat-dialog-content>
        <p>{{ data.message }}</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button 
          mat-button 
          (click)="onCancel()">
          {{ data.cancelText || 'Cancel' }}
        </button>
        <button 
          mat-raised-button 
          [color]="data.confirmColor || 'primary'"
          (click)="onConfirm()">
          {{ data.confirmText || 'Confirm' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
    styles: [`
    .confirm-dialog {
      min-width: 300px;
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
    }

    .dialog-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    mat-dialog-content {
      padding: 20px 0;
    }

    mat-dialog-content p {
      margin: 0;
      color: rgba(0, 0, 0, 0.6);
    }

    mat-dialog-actions {
      padding: 8px 0 0 0;
      margin: 0;
    }
  `]
})
export class ConfirmDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<ConfirmDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
    ) { }

    onConfirm(): void {
        this.dialogRef.close(true);
    }

    onCancel(): void {
        this.dialogRef.close(false);
    }
}
