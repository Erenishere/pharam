# Batch Management Frontend Design Document

## Overview

The Batch Management Frontend is a comprehensive Angular module that provides a modern, responsive interface for managing inventory batches. The system leverages Angular's component-based architecture with reactive forms, state management, and real-time data updates to deliver an intuitive user experience for inventory managers.

## Architecture

### Module Structure
```
src/app/features/batch-management/
├── components/
│   ├── batch-list/
│   ├── batch-form/
│   ├── batch-detail/
│   ├── quantity-adjustment/
│   ├── expiry-tracker/
│   ├── batch-statistics/
│   └── batch-filters/
├── services/
│   ├── batch.service.ts
│   ├── batch-statistics.service.ts
│   └── batch-state.service.ts
├── models/
│   ├── batch.model.ts
│   ├── batch-filter.model.ts
│   └── batch-statistics.model.ts
├── guards/
│   └── batch-access.guard.ts
└── batch-management-routing.module.ts
```

### State Management
- **NgRx Store**: Centralized state management for batch data, filters, and UI state
- **Effects**: Handle API calls and side effects
- **Selectors**: Optimized data selection and memoization
- **Actions**: Type-safe action definitions for all batch operations

### Routing Structure
```
/batches
├── /list (default)
├── /create
├── /edit/:id
├── /detail/:id
├── /expiring
└── /statistics
```

## Components and Interfaces

### 1. Batch List Component (`batch-list.component.ts`)

**Purpose**: Main listing interface with filtering, sorting, and pagination

**Key Features**:
- Server-side pagination with configurable page sizes
- Real-time filtering with debounced search
- Sortable columns (batch number, expiry date, quantity, status)
- Bulk operations support
- Export functionality (CSV/Excel)

**Template Structure**:
```html
<div class="batch-list-container">
  <app-batch-filters (filtersChanged)="onFiltersChanged($event)"></app-batch-filters>
  <div class="batch-actions">
    <button mat-raised-button color="primary" routerLink="/batches/create">
      Add New Batch
    </button>
  </div>
  <mat-table [dataSource]="batches$ | async" class="batch-table">
    <!-- Column definitions with sorting -->
  </mat-table>
  <mat-paginator></mat-paginator>
</div>
```

**State Management**:
- Subscribes to batch list state from NgRx store
- Dispatches filter and pagination actions
- Handles loading and error states

### 2. Batch Form Component (`batch-form.component.ts`)

**Purpose**: Reusable form for creating and editing batches

**Form Structure**:
```typescript
batchForm = this.fb.group({
  itemId: ['', [Validators.required]],
  batchNumber: ['', [Validators.required]],
  quantity: [0, [Validators.required, Validators.min(1)]],
  unitCost: [0, [Validators.required, Validators.min(0)]],
  manufacturingDate: ['', [Validators.required]],
  expiryDate: ['', [Validators.required]],
  locationId: ['', [Validators.required]],
  supplierId: [''],
  notes: ['']
});
```

**Validation Features**:
- Real-time validation with custom validators
- Async validation for batch number uniqueness
- Date validation (expiry > manufacturing)
- Auto-generation of batch numbers

**Integration Points**:
- Item selection with autocomplete
- Location dropdown with search
- Supplier selection (optional)

### 3. Batch Detail Component (`batch-detail.component.ts`)

**Purpose**: Comprehensive view of batch information with action buttons

**Layout Sections**:
- **Header**: Batch number, status badge, action buttons
- **Basic Info**: Item details, quantities, dates
- **Location & Supplier**: Warehouse and supplier information
- **History**: Audit trail of changes and movements
- **Related Batches**: Other batches of the same item

**Action Buttons**:
- Edit Batch Information
- Adjust Quantity
- Delete Batch (conditional)
- Print Batch Label
- View Movement History

### 4. Quantity Adjustment Component (`quantity-adjustment.component.ts`)

**Purpose**: Modal dialog for adjusting batch quantities

**Features**:
- Current quantity display
- Adjustment input (positive/negative)
- Reason selection dropdown
- Real-time calculation of new quantity
- Validation against available quantity

**Modal Structure**:
```html
<mat-dialog-content>
  <div class="quantity-info">
    <div>Current Quantity: {{currentQuantity}}</div>
    <div>Remaining Quantity: {{remainingQuantity}}</div>
  </div>
  <mat-form-field>
    <mat-label>Adjustment Amount</mat-label>
    <input matInput type="number" [(ngModel)]="adjustmentAmount">
  </mat-form-field>
  <div class="new-quantity">
    New Quantity: {{calculateNewQuantity()}}
  </div>
</mat-dialog-content>
```

### 5. Expiry Tracker Component (`expiry-tracker.component.ts`)

**Purpose**: Specialized view for tracking expiring batches

**Features**:
- Configurable expiry warning period
- Color-coded expiry status
- Grouping by urgency (Critical, Warning, Normal)
- Location-based filtering
- Export expiring batches report

**Visual Indicators**:
- Red: Expired batches
- Orange: Expiring within 7 days
- Yellow: Expiring within 30 days
- Green: Normal expiry timeline

### 6. Batch Statistics Component (`batch-statistics.component.ts`)

**Purpose**: Dashboard with comprehensive batch analytics

**Chart Types**:
- **Donut Chart**: Batch distribution by status
- **Bar Chart**: Batches by location
- **Line Chart**: Expiry timeline
- **Pie Chart**: Value distribution by supplier

**KPI Cards**:
- Total Batches
- Total Inventory Value
- Expired Batches
- Low Stock Alerts
- Average Batch Age

**Libraries Used**:
- Chart.js with ng2-charts for visualizations
- Angular Material cards for KPI display

### 7. Batch Filters Component (`batch-filters.component.ts`)

**Purpose**: Advanced filtering interface

**Filter Options**:
- Item search with autocomplete
- Location multi-select
- Supplier dropdown
- Status checkboxes
- Date range picker (manufacturing/expiry)
- Quantity range slider

**Implementation**:
```typescript
filterForm = this.fb.group({
  itemSearch: [''],
  locations: [[]],
  suppliers: [[]],
  statuses: [[]],
  expiryDateRange: this.fb.group({
    start: [''],
    end: ['']
  }),
  quantityRange: this.fb.group({
    min: [0],
    max: [10000]
  })
});
```

## Data Models

### Batch Model
```typescript
export interface Batch {
  _id: string;
  itemId: string;
  item?: Item;
  batchNumber: string;
  quantity: number;
  remainingQuantity: number;
  unitCost: number;
  manufacturingDate: Date;
  expiryDate: Date;
  locationId: string;
  location?: Location;
  supplierId?: string;
  supplier?: Supplier;
  status: BatchStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export enum BatchStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  DEPLETED = 'depleted',
  QUARANTINED = 'quarantined'
}
```

### Filter Model
```typescript
export interface BatchFilter {
  itemSearch?: string;
  locationIds?: string[];
  supplierIds?: string[];
  statuses?: BatchStatus[];
  expiryDateRange?: {
    start?: Date;
    end?: Date;
  };
  quantityRange?: {
    min?: number;
    max?: number;
  };
  includeExpired?: boolean;
}
```

## Services

### Batch Service (`batch.service.ts`)

**API Integration**:
```typescript
@Injectable()
export class BatchService {
  private apiUrl = '/api/batches';

  getBatches(filter?: BatchFilter, pagination?: PaginationParams): Observable<BatchResponse> {
    // GET /api/batches with query parameters
  }

  getBatchById(id: string): Observable<Batch> {
    // GET /api/batches/:id
  }

  createBatch(batch: CreateBatchRequest): Observable<Batch> {
    // POST /api/batches
  }

  updateBatch(id: string, batch: UpdateBatchRequest): Observable<Batch> {
    // PUT /api/batches/:id
  }

  adjustQuantity(id: string, adjustment: QuantityAdjustment): Observable<Batch> {
    // PATCH /api/batches/:id/quantity
  }

  deleteBatch(id: string): Observable<void> {
    // DELETE /api/batches/:id
  }

  getExpiringBatches(days: number, locationId?: string): Observable<Batch[]> {
    // GET /api/batches/expiring-soon
  }

  getNextBatchNumber(itemId: string): Observable<string> {
    // GET /api/items/:itemId/next-batch-number
  }
}
```

### Batch Statistics Service (`batch-statistics.service.ts`)

**Analytics Methods**:
```typescript
@Injectable()
export class BatchStatisticsService {
  getBatchStatistics(filter?: StatisticsFilter): Observable<BatchStatistics> {
    // GET /api/batches/statistics
  }

  getExpiryAnalytics(): Observable<ExpiryAnalytics> {
    // Custom analytics for expiry trends
  }

  getLocationDistribution(): Observable<LocationDistribution[]> {
    // Batch distribution by location
  }

  getSupplierAnalytics(): Observable<SupplierAnalytics[]> {
    // Supplier performance metrics
  }
}
```

## Error Handling

### Global Error Interceptor
- HTTP error interception and user-friendly messages
- Retry logic for transient failures
- Loading state management

### Validation Error Display
- Field-level validation messages
- Form submission error handling
- Server-side validation error mapping

### User Feedback
- Toast notifications for success/error states
- Loading spinners during API calls
- Confirmation dialogs for destructive actions

## Testing Strategy

### Unit Testing
- **Component Testing**: Angular Testing Utilities with shallow rendering
- **Service Testing**: HTTP client mocking with HttpClientTestingModule
- **State Testing**: NgRx store testing with MockStore
- **Pipe Testing**: Custom pipe functionality validation

### Integration Testing
- **Component Integration**: Full component tree testing
- **API Integration**: End-to-end service testing with real HTTP calls
- **Navigation Testing**: Router testing for all batch management routes

### E2E Testing
- **User Workflows**: Complete batch management scenarios
- **Cross-browser Testing**: Chrome, Firefox, Safari compatibility
- **Responsive Testing**: Mobile and tablet layouts
- **Accessibility Testing**: WCAG 2.1 compliance validation

### Test Coverage Targets
- Unit Tests: 90% code coverage
- Integration Tests: All critical user paths
- E2E Tests: Primary workflows and edge cases

## UI/UX Design and Styling

### Theme and Color Palette
The batch management interface follows the Vuexy light theme with enhanced styling for optimal user experience:

**Primary Color Palette**:
- **Primary**: #7367F0 (Vuexy purple - used for search field borders, buttons, and accents)
- **Secondary**: #82868B (Neutral gray)
- **Success**: #28C76F (Green for active batches)
- **Warning**: #FF9F43 (Orange for expiring soon)
- **Danger**: #EA5455 (Red for expired batches)

**Typography and Text Colors**:
- **Primary Text**: #4B4B4B (Dark gray for main content)
- **Secondary Text**: #6E6B7B (Medium gray for supporting text)
- **Card Titles**: #5E5873 (Darker gray for headings)
- **Muted Text**: #B8B8B8 (Light gray for placeholders and hints)

**Background Colors**:
- **Page Background**: #F8F7FA (Light gray background)
- **Card Background**: #FFFFFF (Pure white for content cards)
- **Table Alternate Rows**: #F8F7FA (Subtle striping)

### Expiry Tracker Specific Styling

**Color-Coded Status Indicators**:
- **Expired Batches**: Background #FFF5F5, Border #EA5455, Text #C53030
- **Critical (≤7 days)**: Background #FFF7ED, Border #FF9F43, Text #C05621
- **Warning (≤30 days)**: Background #FFFBEB, Border #F6E05E, Text #B7791F
- **Normal (>30 days)**: Background #F0FFF4, Border #28C76F, Text #276749

**Enhanced Visual Elements**:
- **Search Fields**: Border color #7367F0 with 2px width on focus
- **Filter Cards**: Elevated shadow with rounded corners (8px radius)
- **Status Badges**: Rounded pills with appropriate color coding
- **Action Buttons**: Primary color with hover effects and subtle shadows

### Component-Specific Styling

**Batch Filters Component**:
```scss
.batch-filters {
  background: #FFFFFF;
  border-radius: 8px;
  box-shadow: 0 4px 24px 0 rgba(34, 41, 47, .1);
  padding: 24px;
  margin-bottom: 24px;

  .search-field {
    .mat-form-field {
      .mat-form-field-outline {
        color: #D8D6DE;
      }
      
      &.mat-focused .mat-form-field-outline-thick {
        color: #7367F0;
        border-width: 2px;
      }
    }
    
    input {
      color: #4B4B4B;
      font-weight: 400;
    }
  }
}
```

**Expiry Tracker Layout**:
```scss
.expiry-tracker {
  .expiry-section {
    margin-bottom: 32px;
    
    .section-header {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
      
      .status-indicator {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin-right: 12px;
      }
      
      h3 {
        color: #5E5873;
        font-weight: 600;
        margin: 0;
      }
    }
    
    .batch-card {
      background: #FFFFFF;
      border-left: 4px solid;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 12px;
      box-shadow: 0 2px 8px rgba(34, 41, 47, .08);
      transition: all 0.2s ease;
      
      &:hover {
        box-shadow: 0 4px 16px rgba(34, 41, 47, .12);
        transform: translateY(-1px);
      }
      
      &.expired {
        border-left-color: #EA5455;
        background: linear-gradient(90deg, #FFF5F5 0%, #FFFFFF 8%);
      }
      
      &.critical {
        border-left-color: #FF9F43;
        background: linear-gradient(90deg, #FFF7ED 0%, #FFFFFF 8%);
      }
      
      &.warning {
        border-left-color: #F6E05E;
        background: linear-gradient(90deg, #FFFBEB 0%, #FFFFFF 8%);
      }
    }
  }
}
```

**Enhanced Table Styling**:
```scss
.batch-table {
  background: #FFFFFF;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 24px 0 rgba(34, 41, 47, .1);
  
  .mat-header-row {
    background: #F3F2F7;
    
    .mat-header-cell {
      color: #6E6B7B;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }
  
  .mat-row {
    &:hover {
      background: rgba(115, 103, 240, .04);
    }
    
    .mat-cell {
      color: #4B4B4B;
      font-weight: 400;
    }
  }
}
```

### Responsive Design
- **Mobile First**: Optimized for mobile devices with collapsible filters
- **Tablet Layout**: Adjusted grid layouts for medium screens
- **Desktop Enhancement**: Full feature set with expanded layouts
- **Touch Targets**: Minimum 44px touch targets for mobile interaction

### Accessibility Features
- **High Contrast**: WCAG AA compliant color ratios
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **Focus Indicators**: Clear focus states with #7367F0 accent color

## Performance Optimization

### Data Loading
- **Virtual Scrolling**: For large batch lists
- **Lazy Loading**: Route-based code splitting
- **Caching**: Service-level caching with TTL
- **Pagination**: Server-side pagination with configurable page sizes

### State Management
- **Memoization**: Selector optimization with reselect
- **OnPush Strategy**: Change detection optimization
- **Subscription Management**: Automatic unsubscription with takeUntil

### Bundle Optimization
- **Tree Shaking**: Unused code elimination
- **Code Splitting**: Feature-based lazy loading
- **Asset Optimization**: Image compression and lazy loading