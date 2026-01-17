import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
    selector: 'app-loading-spinner',
    standalone: true,
    imports: [
        CommonModule,
        MatProgressSpinnerModule,
        MatProgressBarModule
    ],
    template: `
    <div class="loading-container" [ngClass]="containerClass">
      <div class="loading-content" *ngIf="show">
        <!-- Spinner for general loading -->
        <mat-spinner 
          *ngIf="type === 'spinner'" 
          [diameter]="size"
          [color]="color">
        </mat-spinner>
        
        <!-- Progress bar for linear loading -->
        <mat-progress-bar 
          *ngIf="type === 'bar'" 
          [mode]="mode"
          [value]="value"
          [color]="color">
        </mat-progress-bar>
        
        <!-- Loading message -->
        <div class="loading-message" *ngIf="message">
          {{ message }}
        </div>
      </div>
    </div>
  `,
    styles: [`
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .loading-container.overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(2px);
    }

    .loading-container.inline {
      padding: 20px;
      min-height: 100px;
    }

    .loading-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .loading-message {
      font-size: 14px;
      color: rgba(0, 0, 0, 0.6);
      text-align: center;
      max-width: 300px;
    }

    mat-progress-bar {
      width: 200px;
    }
  `]
})
export class LoadingSpinnerComponent {
    @Input() show: boolean = true;
    @Input() type: 'spinner' | 'bar' = 'spinner';
    @Input() size: number = 40;
    @Input() color: 'primary' | 'accent' | 'warn' = 'primary';
    @Input() message: string = '';
    @Input() overlay: boolean = false;
    @Input() mode: 'determinate' | 'indeterminate' | 'buffer' | 'query' = 'indeterminate';
    @Input() value: number = 0;

    get containerClass(): string {
        return this.overlay ? 'overlay' : 'inline';
    }
}