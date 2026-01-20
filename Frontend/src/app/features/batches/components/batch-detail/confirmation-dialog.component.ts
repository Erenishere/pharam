import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmationDialogData {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'warn' | 'primary' | 'accent';
}

@Component({
    selector: 'app-confirmation-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule
    ],
    template: `
    <div class="confirmation-dialog">
      <h2 mat-dialog-title>
        <mat-icon [color]="data.type || 'primary'">
          {{ data.type === 'warn' ? 'warning' : 'help' }}
        </mat-icon>
        {{ data.title }}
      </h2>
      
      <mat-dialog-content>
        <p>{{ data.message }}</p>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">
          {{ data.cancelText || 'Cancel' }}
        </button>
        <button 
          mat-raised-button 
          [color]="data.type || 'primary'" 
          (click)="onConfirm()"
          cdkFocusInitial>
          {{ data.confirmText || 'Confirm' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
    styles: [`
    .confirmation-dialog {
      h2 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        
        mat-icon {
          font-size: 24px;
          width: 24px;
          height: 24px;
        }
      }
      
      mat-dialog-content {
        padding: 16px 0;
        
        p {
          margin: 0;
          line-height: 1.5;
        }
      }
      
      mat-dialog-actions {
        padding: 16px 0 0 0;
        gap: 8px;
      }
    }
  `]
})
export class ConfirmationDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData
    ) { }

    onConfirm(): void {
        this.dialogRef.close(true);
    }

    onCancel(): void {
        this.dialogRef.close(false);
    }
}