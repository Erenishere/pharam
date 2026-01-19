/**
 * Sales Invoices Module
 * 
 * This module contains all components, services, and dependencies for the sales invoices feature.
 * It follows Angular best practices with lazy loading and modular architecture.
 */

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

// Angular Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSliderModule } from '@angular/material/slider';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatStepperModule } from '@angular/material/stepper';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

// Third-party modules (if needed)
// import { NgChartsModule } from 'ng2-charts';

// Routing
import { SalesInvoicesRoutingModule } from './sales-invoices-routing.module';

// Services
import { SalesInvoiceService } from './services/sales-invoice.service';
import { InvoiceCalculationService } from './services/invoice-calculation.service';
import { CacheService } from './services/cache.service';
import { PerformanceService } from './services/performance.service';
import { OfflineService } from './services/offline.service';
import { ErrorRecoveryService } from './services/error-recovery.service';

// Guards
import { SalesInvoiceAccessGuard } from './guards/sales-invoice-access.guard';

// Resolvers
import { InvoiceDetailResolver } from './resolvers/invoice-detail.resolver';

@NgModule({
    declarations: [
        // Components will be added as they are created
        // Note: Using standalone components, so declarations may not be needed
    ],
    imports: [
        // Core Angular modules
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        HttpClientModule,

        // Routing
        SalesInvoicesRoutingModule,

        // Angular Material modules
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatCheckboxModule,
        MatChipsModule,
        MatTooltipModule,
        MatProgressSpinnerModule,
        MatDialogModule,
        MatSnackBarModule,
        MatSliderModule,
        MatAutocompleteModule,
        MatBadgeModule,
        MatTabsModule,
        MatExpansionModule,
        MatMenuModule,
        MatToolbarModule,
        MatSidenavModule,
        MatListModule,
        MatGridListModule,
        MatStepperModule,
        MatSlideToggleModule,
        MatProgressBarModule,
        MatDividerModule,
        MatButtonToggleModule

        // Third-party modules
        // NgChartsModule
    ],
    providers: [
        // Services
        SalesInvoiceService,
        InvoiceCalculationService,
        CacheService,
        PerformanceService,
        OfflineService,
        ErrorRecoveryService,

        // Guards
        SalesInvoiceAccessGuard,

        // Resolvers
        InvoiceDetailResolver
    ],
    exports: [
        // Export components if needed by other modules
    ]
})
export class SalesInvoicesModule { }