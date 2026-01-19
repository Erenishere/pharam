# Sales Invoice Frontend Module - Design Document

## Overview

This document outlines the comprehensive design for the Sales Invoice Frontend Module, a complete Angular-based user interface for managing sales invoices. The module will integrate with the existing Indus Traders ERP system, following established patterns and utilizing the Vuexy theme for consistent styling. The design emphasizes user experience, performance, and maintainability while providing full CRUD operations and advanced invoice management features.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Sales Invoice Module                      │
├─────────────────────────────────────────────────────────────┤
│  Components Layer                                            │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │ Invoice List    │ │ Invoice Form    │ │ Invoice Detail  ││
│  │ Component       │ │ Component       │ │ Component       ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │ Invoice Stats   │ │ Payment Dialog  │ │ Status Dialog   ││
│  │ Component       │ │ Component       │ │ Component       ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  Services Layer                                              │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │ Sales Invoice   │ │ Customer        │ │ Item            ││
│  │ Service         │ │ Service         │ │ Service         ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  Models & Interfaces                                         │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │ Invoice Models  │ │ API Response    │ │ Form Models     ││
│  │                 │ │ Models          │ │                 ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API Layer                         │
│  • GET /api/v1/invoices/sales                               │
│  • POST /api/v1/invoices/sales                              │
│  • PUT /api/v1/invoices/sales/:id                           │
│  • PATCH /api/v1/invoices/sales/:id/confirm                 │
│  • POST /api/v1/invoices/sales/:id/mark-paid                │
│  • ... (20+ endpoints)                                      │
└─────────────────────────────────────────────────────────────┘
```

### Module Structure

```
src/app/features/sales-invoices/
├── components/
│   ├── invoice-list/
│   │   ├── invoice-list.component.ts
│   │   ├── invoice-list.component.html
│   │   ├── invoice-list.component.scss
│   │   └── invoice-list.component.spec.ts
│   ├── invoice-form/
│   │   ├── invoice-form.component.ts
│   │   ├── invoice-form.component.html
│   │   ├── invoice-form.component.scss
│   │   └── invoice-form.component.spec.ts
│   ├── invoice-detail/
│   │   ├── invoice-detail.component.ts
│   │   ├── invoice-detail.component.html
│   │   ├── invoice-detail.component.scss
│   │   └── invoice-detail.component.spec.ts
│   ├── invoice-statistics/
│   │   ├── invoice-statistics.component.ts
│   │   ├── invoice-statistics.component.html
│   │   ├── invoice-statistics.component.scss
│   │   └── invoice-statistics.component.spec.ts
│   ├── invoice-filters/
│   │   ├── invoice-filters.component.ts
│   │   ├── invoice-filters.component.html
│   │   ├── invoice-filters.component.scss
│   │   └── invoice-filters.component.spec.ts
│   ├── payment-dialog/
│   │   ├── payment-dialog.component.ts
│   │   ├── payment-dialog.component.html
│   │   ├── payment-dialog.component.scss
│   │   └── payment-dialog.component.spec.ts
│   └── status-dialog/
│       ├── status-dialog.component.ts
│       ├── status-dialog.component.html
│       ├── status-dialog.component.scss
│       └── status-dialog.component.spec.ts
├── services/
│   ├── sales-invoice.service.ts
│   ├── sales-invoice.service.spec.ts
│   ├── invoice-calculation.service.ts
│   └── invoice-calculation.service.spec.ts
├── models/
│   ├── sales-invoice.model.ts
│   ├── invoice-item.model.ts
│   ├── invoice-filters.model.ts
│   └── invoice-statistics.model.ts
├── guards/
│   └── sales-invoice-access.guard.ts
├── resolvers/
│   └── invoice-detail.resolver.ts
├── sales-invoices-routing.module.ts
├── sales-invoices.module.ts
└── index.ts
```

## Components and Interfaces

### 1. Invoice List Component

**Purpose:** Display paginated list of sales invoices with search, filtering, and bulk operations.

**Key Features:**
- Server-side pagination with configurable page sizes
- Real-time search with debouncing (300ms)
- Advanced filtering (status, payment status, date range, customer)
- Sortable columns (date, amount, status)
- Bulk operations (confirm, cancel, export)
- Responsive design with mobile card view
- Loading states and error handling
- Role-based action visibility

**Template Structure:**
```html
<div class="invoice-list-container">
  <!-- Statistics Section (if user has permission) -->
  <app-invoice-statistics *ngIf="showStatistics"></app-invoice-statistics>
  
  <!-- Filters Section -->
  <app-invoice-filters (filtersChanged)="onFiltersChanged($event)"></app-invoice-filters>
  
  <!-- Actions Bar -->
  <div class="actions-bar">
    <button mat-raised-button color="primary" (click)="createInvoice()" *ngIf="canCreate">
      <mat-icon>add</mat-icon> Create Invoice
    </button>
    <button mat-button (click)="exportInvoices()" *ngIf="canExport">
      <mat-icon>download</mat-icon> Export
    </button>
  </div>
  
  <!-- Table/Card View -->
  <div class="table-container" *ngIf="!isMobile">
    <table mat-table [dataSource]="dataSource" matSort>
      <!-- Table columns -->
    </table>
    <mat-paginator></mat-paginator>
  </div>
  
  <div class="card-view" *ngIf="isMobile">
    <!-- Mobile card layout -->
  </div>
</div>
```

### 2. Invoice Form Component

**Purpose:** Create and edit sales invoices with comprehensive validation and calculation.

**Key Features:**
- Reactive forms with validation
- Customer search and selection
- Dynamic item addition/removal
- Real-time calculations (subtotal, tax, total)
- Batch and expiry date handling
- Discount management (item-level and invoice-level)
- Draft saving and confirmation workflow
- Print preview functionality

**Form Structure:**
```typescript
invoiceForm = this.fb.group({
  customerId: ['', [Validators.required]],
  invoiceDate: [new Date(), [Validators.required]],
  dueDate: ['', [Validators.required]],
  warehouseId: ['', [Validators.required]],
  salesmanId: [''],
  items: this.fb.array([]),
  notes: [''],
  discountType: ['percentage'],
  discountValue: [0],
  previousBalance: [0]
});
```

### 3. Invoice Detail Component

**Purpose:** Display comprehensive invoice information with action buttons.

**Key Features:**
- Tabbed interface (Details, Items, History, Stock Movements)
- Print and export options
- Status change actions
- Payment management
- Warranty information display
- Related documents linking
- Audit trail display

### 4. Invoice Statistics Component

**Purpose:** Display sales metrics and KPIs.

**Key Features:**
- Total sales amount (current period)
- Invoice count by status
- Payment status breakdown
- Top customers by volume
- Trend charts and graphs
- Date range selection
- Export capabilities

### 5. Payment Dialog Component

**Purpose:** Handle payment recording and tracking.

**Key Features:**
- Payment amount validation
- Payment method selection
- Partial payment support
- Payment history display
- Receipt generation
- Integration with cash book

### 6. Status Dialog Component

**Purpose:** Manage invoice status changes with confirmation.

**Key Features:**
- Status change confirmation
- Reason for change (optional)
- Impact warning messages
- Audit trail recording
- Permission validation

## Data Models

### Sales Invoice Model

```typescript
export interface SalesInvoice {
  _id: string;
  invoiceNumber: string;
  customerId: string;
  customer?: Customer;
  invoiceDate: Date;
  dueDate: Date;
  items: InvoiceItem[];
  totals: InvoiceTotals;
  payment: PaymentInfo;
  status: InvoiceStatus;
  warehouseId: string;
  warehouse?: Warehouse;
  salesmanId?: string;
  salesman?: Salesman;
  notes?: string;
  previousBalance: number;
  totalBalance: number;
  creditLimitExceeded: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  _id?: string;
  itemId: string;
  item?: Item;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: 'percentage' | 'amount';
  taxAmount: number;
  totalAmount: number;
  batchInfo?: {
    batchNumber: string;
    expiryDate: Date;
  };
}

export interface InvoiceTotals {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  gstAmount: number;
  whtAmount: number;
  grandTotal: number;
}

export interface PaymentInfo {
  paymentStatus: PaymentStatus;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod?: string;
  paymentHistory?: PaymentRecord[];
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid'
}
```

### Filter Models

```typescript
export interface InvoiceFilters {
  search?: string;
  status?: InvoiceStatus[];
  paymentStatus?: PaymentStatus[];
  customerId?: string;
  salesmanId?: string;
  warehouseId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  amountFrom?: number;
  amountTo?: number;
}

export interface InvoiceQueryParams extends InvoiceFilters {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

## Error Handling

### Error Types and Responses

```typescript
export interface ApiError {
  success: false;
  message: string;
  errors?: ValidationError[];
  statusCode: number;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}
```

### Error Handling Strategy

1. **Network Errors:** Display retry options with exponential backoff
2. **Validation Errors:** Show field-specific error messages
3. **Permission Errors:** Redirect to appropriate page with message
4. **Server Errors:** Show user-friendly messages with error codes
5. **Offline Handling:** Cache operations and sync when online

### User-Friendly Error Messages

```typescript
private getErrorMessage(error: any, operation: string): string {
  if (!navigator.onLine) {
    return 'No internet connection. Please check your network.';
  }
  
  switch (error.status) {
    case 400: return 'Invalid data provided. Please check your input.';
    case 401: return 'Session expired. Please log in again.';
    case 403: return 'You do not have permission for this action.';
    case 404: return 'Invoice not found.';
    case 409: return 'Invoice number already exists.';
    case 422: return error.message || 'Validation failed.';
    case 500: return 'Server error. Please try again later.';
    default: return `Error ${operation}. Please try again.`;
  }
}
```

## Testing Strategy

### Unit Testing

**Components Testing:**
- Component initialization and lifecycle
- Form validation and submission
- Event handling and user interactions
- Conditional rendering based on permissions
- Error state handling

**Services Testing:**
- HTTP requests and responses
- Error handling and retry logic
- Data transformation and calculations
- Caching mechanisms

**Example Test Structure:**
```typescript
describe('InvoiceListComponent', () => {
  let component: InvoiceListComponent;
  let fixture: ComponentFixture<InvoiceListComponent>;
  let mockInvoiceService: jasmine.SpyObj<SalesInvoiceService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('SalesInvoiceService', ['getInvoices', 'deleteInvoice']);
    
    TestBed.configureTestingModule({
      imports: [InvoiceListComponent],
      providers: [
        { provide: SalesInvoiceService, useValue: spy }
      ]
    });
    
    fixture = TestBed.createComponent(InvoiceListComponent);
    component = fixture.componentInstance;
    mockInvoiceService = TestBed.inject(SalesInvoiceService) as jasmine.SpyObj<SalesInvoiceService>;
  });

  it('should load invoices on init', () => {
    mockInvoiceService.getInvoices.and.returnValue(of(mockInvoiceResponse));
    component.ngOnInit();
    expect(mockInvoiceService.getInvoices).toHaveBeenCalled();
  });
});
```

### Integration Testing

**API Integration:**
- Test actual API endpoints with mock backend
- Verify request/response formats
- Test error scenarios and edge cases

**Component Integration:**
- Test component communication
- Verify data flow between parent and child components
- Test dialog interactions

### E2E Testing

**User Workflows:**
- Complete invoice creation workflow
- Invoice editing and status changes
- Payment recording process
- Search and filtering functionality
- Mobile responsive behavior

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading:** Load components on demand
2. **Virtual Scrolling:** For large invoice lists
3. **OnPush Change Detection:** Optimize change detection cycles
4. **Caching:** Cache frequently accessed data
5. **Debouncing:** Debounce search and filter inputs
6. **Pagination:** Server-side pagination for large datasets

### Bundle Size Optimization

```typescript
// Lazy load heavy components
const InvoiceFormComponent = () => import('./components/invoice-form/invoice-form.component');

// Tree-shake unused Material modules
const MATERIAL_MODULES = [
  MatTableModule,
  MatPaginatorModule,
  MatSortModule,
  // Only import what's needed
];
```

### Memory Management

```typescript
export class InvoiceListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.invoiceService.getInvoices()
      .pipe(takeUntil(this.destroy$))
      .subscribe(/* ... */);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

## Security Considerations

### Frontend Security Measures

1. **Input Sanitization:** Sanitize all user inputs
2. **XSS Prevention:** Use Angular's built-in sanitization
3. **CSRF Protection:** Include CSRF tokens in requests
4. **Permission Validation:** Validate permissions before API calls
5. **Secure Storage:** Use secure storage for sensitive data

### Role-Based Access Control

```typescript
export class InvoiceListComponent {
  canCreate = false;
  canEdit = false;
  canDelete = false;
  canConfirm = false;
  canCancel = false;
  canViewStatistics = false;

  private checkPermissions() {
    const user = this.authService.currentUser;
    const role = user?.role;

    switch (role) {
      case UserRole.ADMIN:
        this.canCreate = this.canEdit = this.canDelete = 
        this.canConfirm = this.canCancel = this.canViewStatistics = true;
        break;
      case UserRole.SALES:
        this.canCreate = this.canEdit = this.canConfirm = true;
        break;
      case UserRole.DATA_ENTRY:
        this.canCreate = this.canEdit = true;
        break;
      default:
        // Read-only access
        break;
    }
  }
}
```

## Accessibility Features

### WCAG 2.1 Compliance

1. **Keyboard Navigation:** Full keyboard support
2. **Screen Reader Support:** Proper ARIA labels and roles
3. **Color Contrast:** Meet WCAG AA standards
4. **Focus Management:** Visible focus indicators
5. **Alternative Text:** Descriptive alt text for images

### Implementation Examples

```html
<!-- Accessible table -->
<table mat-table [dataSource]="dataSource" role="table" aria-label="Sales Invoices">
  <thead>
    <tr mat-header-row role="row">
      <th mat-header-cell role="columnheader" aria-sort="none">Invoice Number</th>
    </tr>
  </thead>
</table>

<!-- Accessible form -->
<mat-form-field>
  <mat-label>Customer</mat-label>
  <input matInput 
         formControlName="customerId"
         aria-describedby="customer-error"
         [attr.aria-invalid]="customerControl.invalid">
  <mat-error id="customer-error">Customer is required</mat-error>
</mat-form-field>
```

## Responsive Design

### Breakpoint Strategy

```scss
// Mobile First Approach
.invoice-list-container {
  padding: 16px;

  @media (min-width: 768px) {
    padding: 24px;
  }

  @media (min-width: 1024px) {
    padding: 32px;
  }
}

// Table to Card View
.table-container {
  display: none;

  @media (min-width: 768px) {
    display: block;
  }
}

.card-view {
  display: block;

  @media (min-width: 768px) {
    display: none;
  }
}
```

### Mobile Optimizations

1. **Touch-Friendly:** Minimum 44px touch targets
2. **Swipe Gestures:** Swipe for actions on mobile
3. **Simplified Navigation:** Collapsible menus and filters
4. **Optimized Forms:** Stack form fields vertically
5. **Performance:** Reduce animations and effects on mobile

## Integration Points

### External Service Dependencies

1. **Customer Service:** For customer lookup and validation
2. **Item Service:** For item search and pricing
3. **Warehouse Service:** For warehouse selection
4. **Auth Service:** For user authentication and permissions
5. **Toast Service:** For user notifications
6. **Loading Service:** For global loading states

### API Integration

```typescript
@Injectable({
  providedIn: 'root'
})
export class SalesInvoiceService {
  private baseUrl = `${environment.apiUrl}/invoices/sales`;

  constructor(private http: HttpClient) {}

  getInvoices(params: InvoiceQueryParams): Observable<ApiResponse<SalesInvoice[]>> {
    return this.http.get<ApiResponse<SalesInvoice[]>>(this.baseUrl, { params });
  }

  createInvoice(invoice: CreateInvoiceRequest): Observable<ApiResponse<SalesInvoice>> {
    return this.http.post<ApiResponse<SalesInvoice>>(this.baseUrl, invoice);
  }

  confirmInvoice(id: string): Observable<ApiResponse<SalesInvoice>> {
    return this.http.patch<ApiResponse<SalesInvoice>>(`${this.baseUrl}/${id}/confirm`, {});
  }

  markAsPaid(id: string, payment: PaymentRequest): Observable<ApiResponse<SalesInvoice>> {
    return this.http.post<ApiResponse<SalesInvoice>>(`${this.baseUrl}/${id}/mark-paid`, payment);
  }
}
```

This comprehensive design provides a solid foundation for implementing a professional, user-friendly, and maintainable sales invoice frontend module that integrates seamlessly with the existing Indus Traders ERP system.