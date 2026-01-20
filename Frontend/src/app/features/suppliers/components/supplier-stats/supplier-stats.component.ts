import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { SupplierStatistics } from '../../models/supplier.model';

/**
 * Supplier Statistics Component
 * 
 * Displays supplier statistics in card format.
 * Shows total suppliers, active/inactive counts, breakdown by type, and financial summaries.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */
@Component({
    selector: 'app-supplier-stats',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatButtonModule
    ],
    templateUrl: './supplier-stats.component.html',
    styleUrl: './supplier-stats.component.scss'
})
export class SupplierStatsComponent implements OnInit {
    @Input() statistics: SupplierStatistics | null = null;
    @Input() loading = false;
    @Input() error: string | null = null;
    @Output() retry = new EventEmitter<void>();

    /**
     * Component initialization lifecycle hook
     * 
     * @public
     * @returns {void}
     */
    ngOnInit(): void {
        // Component initialization
    }

    /**
     * Emit retry event to parent component
     * 
     * Signals the parent component to retry loading statistics after an error.
     * 
     * @public
     * @returns {void}
     */
    onRetry(): void {
        this.retry.emit();
    }

    /**
     * Format currency value for display
     * 
     * Formats numeric values as Pakistani Rupee currency with proper localization.
     * 
     * @public
     * @param {number | undefined} value - The numeric value to format
     * @returns {string} Formatted currency string or 'PKR 0' if value is invalid
     */
    formatCurrency(value: number | undefined): string {
        if (value === undefined || value === null || isNaN(value)) {
            return 'PKR 0';
        }
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    }

    /**
     * Format number with thousands separators
     * 
     * @public
     * @param {number | undefined} value - The numeric value to format
     * @returns {string} Formatted number string or '0' if value is invalid
     */
    formatNumber(value: number | undefined): string {
        if (value === undefined || value === null || isNaN(value)) {
            return '0';
        }
        return new Intl.NumberFormat('en-US').format(value);
    }

    /**
     * Calculate percentage of part relative to total
     * 
     * @public
     * @param {number} part - The part value
     * @param {number} total - The total value
     * @returns {number} The percentage (0-100)
     */
    calculatePercentage(part: number, total: number): number {
        if (total === 0) return 0;
        return Math.round((part / total) * 100);
    }
}
