import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';

export interface EnhancedConfirmDialogData {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: 'primary' | 'accent' | 'warn';
    icon?: string;
    type?: 'info' | 'warning' | 'error' | 'success';
    showCheckbox?: boolean;
    checkboxText?: string;
    checkboxRequired?: boolean;
    details?: string[];
    htmlContent?: string;
}

export interface EnhancedConfirmDialogResult {
    confirmed: boolean;
    checkboxValue?: boolean;
}

/**
 * Enhanced confirmation dialog component with additional features
 * 
 * Features:
 * - Custom icons and colors based on dialog type
 * - Optional checkbox for additional confirmation
 * - Support for detailed information lists
 * - HTML content support
 * - Flexible button configuration
 */
@Component({
    selector: 'app-enhanced-confirm-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatCheckboxModule,
        FormsModule
    ],
    template: `
    <div class="enhanced-confirm-dialog" [ngClass]="'dialog-' + (data.type || 'info')">
      <h2 mat-dialog-title>
        <mat-icon class="dialog-icon" [ngClass]="getIconClass()">
          {{ getIcon() }}
        </mat-icon>
        {{ data.title }}
      </h2>
      
      <mat-dialog-content>
        <div class="dialog-message">
          <p *ngIf="!data.htmlContent">{{ data.message }}</p>
          <div *ngIf="data.htmlContent" [innerHTML]="data.htmlContent"></div>
        </div>
        
        <div class="dialog-details" *ngIf="data.details && data.details.length > 0">
          <ul>
            <li *ngFor="let detail of data.details">{{ detail }}</li>
          </ul>
        </div>
        
        <div class="dialog-checkbox" *ngIf="data.showCheckbox">
          <mat-checkbox 
            [(ngModel)]="checkboxValue"
            [required]="data.checkboxRequired">
            {{ data.checkboxText || 'I understand the consequences' }}
          </mat-checkbox>
        </div>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button 
          mat-button 
          (click)="onCancel()">
          {{ data.cancelText || 'Cancel' }}
        </button>
        <button 
          mat-raised-button 
          [color]="data.confirmColor || getDefaultConfirmColor()"
          [disabled]="isConfirmDisabled()"
          (click)="onConfirm()">
          {{ data.confirmText || 'Confirm' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
    styles: [`
    .enhanced-confirm-dialog {
      min-width: 350px;
      max-width: 500px;
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      font-size: 20px;
    }

    .dialog-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .dialog-icon.info { color: #2196F3; }
    .dialog-icon.warning { color: #FF9800; }
    .dialog-icon.error { color: #F44336; }
    .dialog-icon.success { color: #4CAF50; }

    mat-dialog-content {
      padding: 20px 0;
      max-height: 400px;
      overflow-y: auto;
    }

    .dialog-message {
      margin-bottom: 16px;
    }

    .dialog-message p {
      margin: 0;
      color: rgba(0, 0, 0, 0.7);
      line-height: 1.5;
    }

    .dialog-details {
      background-color: #f5f5f5;
      border-radius: 4px;
      padding: 12px;
      margin: 16px 0;
    }

    .dialog-details ul {
      margin: 0;
      padding-left: 20px;
    }

    .dialog-details li {
      color: rgba(0, 0, 0, 0.6);
      font-size: 14px;
      margin-bottom: 4px;
    }

    .dialog-checkbox {
      margin-top: 16px;
      padding: 12px;
      background-color: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 4px;
    }

    .dialog-warning .dialog-checkbox {
      background-color: #f8d7da;
      border-color: #f5c6cb;
    }

    .dialog-error .dialog-checkbox {
      background-color: #f8d7da;
      border-color: #f5c6cb;
    }

    mat-dialog-actions {
      padding: 8px 0 0 0;
      margin: 0;
      gap: 8px;
    }

    button[mat-raised-button]:disabled {
      opacity: 0.6;
    }

    @media (max-width: 600px) {
      .enhanced-confirm-dialog {
        min-width: unset;
        width: 100%;
        max-width: unset;
      }
      
      mat-dialog-actions {
        flex-direction: column-reverse;
      }
      
      mat-dialog-actions button {
        width: 100%;
        margin: 4px 0;
      }
    }
  `]
})
export class EnhancedConfirmDialogComponent {
    checkboxValue = false;

    constructor(
        public dialogRef: MatDialogRef<EnhancedConfirmDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: EnhancedConfirmDialogData
    ) { }

    onConfirm(): void {
        const result: EnhancedConfirmDialogResult = {
            confirmed: true,
            checkboxValue: this.data.showCheckbox ? this.checkboxValue : undefined
        };
        this.dialogRef.close(result);
    }

    onCancel(): void {
        const result: EnhancedConfirmDialogResult = {
            confirmed: false,
            checkboxValue: false
        };
        this.dialogRef.close(result);
    }

    getIcon(): string {
        if (this.data.icon) {
            return this.data.icon;
        }

        switch (this.data.type) {
            case 'warning':
                return 'warning';
            case 'error':
                return 'error';
            case 'success':
                return 'check_circle';
            case 'info':
            default:
                return 'info';
        }
    }

    getIconClass(): string {
        return this.data.type || 'info';
    }

    getDefaultConfirmColor(): 'primary' | 'accent' | 'warn' {
        switch (this.data.type) {
            case 'warning':
            case 'error':
                return 'warn';
            default:
                return 'primary';
        }
    }

    isConfirmDisabled(): boolean {
        if (this.data.showCheckbox && this.data.checkboxRequired) {
            return !this.checkboxValue;
        }
        return false;
    }
}