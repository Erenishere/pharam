import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { LoadingService, LoadingState } from '../../services/loading.service';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';

@Component({
    selector: 'app-global-loading',
    standalone: true,
    imports: [
        CommonModule,
        LoadingSpinnerComponent
    ],
    template: `
    <div 
      class="global-loading-overlay" 
      *ngIf="loadingState.isLoading"
      [class.show]="loadingState.isLoading">
      
      <div class="loading-content">
        <app-loading-spinner
          [show]="true"
          [size]="50"
          [overlay]="false"
          [message]="getLoadingMessage()">
        </app-loading-spinner>
        
        <div class="loading-details" *ngIf="showDetails">
          <div class="active-requests">
            {{ loadingState.activeRequests }} active request{{ loadingState.activeRequests !== 1 ? 's' : '' }}
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .global-loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(3px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease, visibility 0.3s ease;
    }

    .global-loading-overlay.show {
      opacity: 1;
      visibility: visible;
    }

    .loading-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      background: white;
      padding: 32px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      min-width: 200px;
    }

    .loading-details {
      text-align: center;
      color: rgba(0, 0, 0, 0.6);
      font-size: 12px;
    }

    .active-requests {
      margin-top: 8px;
    }

    @media (max-width: 768px) {
      .loading-content {
        margin: 20px;
        padding: 24px;
        min-width: unset;
        width: calc(100% - 40px);
        max-width: 300px;
      }
    }
  `]
})
export class GlobalLoadingComponent implements OnInit, OnDestroy {
    loadingState: LoadingState = {
        isLoading: false,
        activeRequests: 0,
        requestUrls: []
    };

    showDetails = false;
    private destroy$ = new Subject<void>();

    constructor(private loadingService: LoadingService) { }

    ngOnInit(): void {
        this.loadingService.loadingState$
            .pipe(takeUntil(this.destroy$))
            .subscribe(state => {
                this.loadingState = state;
                // Show details if there are multiple requests or loading takes more than 2 seconds
                if (state.activeRequests > 1) {
                    this.showDetails = true;
                } else if (state.isLoading) {
                    setTimeout(() => {
                        if (this.loadingState.isLoading) {
                            this.showDetails = true;
                        }
                    }, 2000);
                } else {
                    this.showDetails = false;
                }
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    getLoadingMessage(): string {
        if (this.loadingState.activeRequests > 1) {
            return 'Processing multiple requests...';
        }
        return 'Loading...';
    }
}