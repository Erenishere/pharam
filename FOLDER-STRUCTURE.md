# Angular 18 Pharma Management System - Folder Structure

## 📁 Complete Directory Tree

```
frontend/
├── src/
│   ├── app/
│   │   ├── core/                          # Core module (singleton services, guards, interceptors)
│   │   │   ├── guards/                    # Route guards (auth, role-based)
│   │   │   ├── interceptors/              # HTTP interceptors (auth token, error handling)
│   │   │   ├── services/                  # Core services (auth, API, storage)
│   │   │   ├── models/                    # TypeScript interfaces and types
│   │   │   ├── constants/                 # App-wide constants
│   │   │   └── enums/                     # Enumerations
│   │   │
│   │   ├── shared/                        # Shared module (reusable components, pipes, directives)
│   │   │   ├── components/                # Reusable UI components (tables, modals, buttons)
│   │   │   ├── directives/                # Custom directives
│   │   │   ├── pipes/                     # Custom pipes (date, currency, etc.)
│   │   │   ├── validators/                # Custom form validators
│   │   │   └── utils/                     # Utility functions
│   │   │
│   │   ├── layout/                        # Layout components
│   │   │   ├── header/                    # Header component
│   │   │   ├── sidebar/                   # Sidebar navigation
│   │   │   ├── footer/                    # Footer component
│   │   │   └── breadcrumb/                # Breadcrumb navigation
│   │   │
│   │   ├── features/                      # Feature modules (lazy-loaded)
│   │   │   │
│   │   │   ├── auth/                      # Authentication module
│   │   │   │   ├── components/
│   │   │   │   │   ├── login/             # Login component
│   │   │   │   │   └── profile/           # User profile component
│   │   │   │   └── services/              # Auth-specific services
│   │   │   │
│   │   │   ├── dashboard/                 # Dashboard module
│   │   │   │   ├── components/            # Dashboard widgets, charts
│   │   │   │   └── services/              # Dashboard data services
│   │   │   │
│   │   │   ├── users/                     # User management module
│   │   │   │   ├── components/
│   │   │   │   │   ├── user-list/         # Users listing
│   │   │   │   │   ├── user-form/         # Create/Edit user
│   │   │   │   │   └── user-detail/       # User details view
│   │   │   │   └── services/              # User CRUD services
│   │   │   │
│   │   │   ├── customers/                 # Customer management module
│   │   │   │   ├── components/
│   │   │   │   │   ├── customer-list/     # Customers listing
│   │   │   │   │   ├── customer-form/     # Create/Edit customer
│   │   │   │   │   └── customer-detail/   # Customer details
│   │   │   │   └── services/              # Customer CRUD services
│   │   │   │
│   │   │   ├── suppliers/                 # Supplier management module
│   │   │   │   ├── components/
│   │   │   │   │   ├── supplier-list/     # Suppliers listing
│   │   │   │   │   ├── supplier-form/     # Create/Edit supplier
│   │   │   │   │   └── supplier-detail/   # Supplier details
│   │   │   │   └── services/              # Supplier CRUD services
│   │   │   │
│   │   │   ├── items/                     # Items/Products management module
│   │   │   │   ├── components/
│   │   │   │   │   ├── item-list/         # Items listing
│   │   │   │   │   ├── item-form/         # Create/Edit item
│   │   │   │   │   ├── item-detail/       # Item details
│   │   │   │   │   └── low-stock/         # Low stock alerts
│   │   │   │   └── services/              # Item CRUD services
│   │   │   │
│   │   │   ├── batches/                   # Batch management module
│   │   │   │   ├── components/
│   │   │   │   │   ├── batch-list/        # Batches listing
│   │   │   │   │   ├── batch-form/        # Create/Edit batch
│   │   │   │   │   ├── batch-detail/      # Batch details
│   │   │   │   │   └── expiring-batches/  # Expiring batches alerts
│   │   │   │   └── services/              # Batch CRUD services
│   │   │   │
│   │   │   ├── sales-invoices/            # Sales invoices module
│   │   │   │   ├── components/
│   │   │   │   │   ├── invoice-list/      # Sales invoices listing
│   │   │   │   │   ├── invoice-form/      # Create/Edit invoice
│   │   │   │   │   ├── invoice-detail/    # Invoice details
│   │   │   │   │   └── invoice-confirm/   # Confirm invoice dialog
│   │   │   │   └── services/              # Sales invoice services
│   │   │   │
│   │   │   ├── purchase-invoices/         # Purchase invoices module
│   │   │   │   ├── components/
│   │   │   │   │   ├── invoice-list/      # Purchase invoices listing
│   │   │   │   │   ├── invoice-form/      # Create/Edit invoice
│   │   │   │   │   ├── invoice-detail/    # Invoice details
│   │   │   │   │   └── invoice-confirm/   # Confirm invoice dialog
│   │   │   │   └── services/              # Purchase invoice services
│   │   │   │
│   │   │   └── reports/                   # Reports module
│   │   │       ├── components/
│   │   │       │   ├── sales-report/      # Sales reports
│   │   │       │   ├── purchase-report/   # Purchase reports
│   │   │       │   ├── inventory-report/  # Inventory reports
│   │   │       │   └── financial-report/  # Financial reports
│   │   │       └── services/              # Report generation services
│   │   │
│   │   ├── app.component.ts               # Root component
│   │   ├── app.component.html
│   │   ├── app.component.scss
│   │   ├── app.config.ts                  # App configuration (Angular 18 standalone)
│   │   └── app.routes.ts                  # App routing configuration
│   │
│   ├── assets/                            # Static assets
│   │   ├── images/                        # Images
│   │   ├── icons/                         # Icons, SVGs
│   │   ├── fonts/                         # Custom fonts
│   │   └── styles/                        # Global styles, themes
│   │
│   ├── environments/                      # Environment configurations
│   │   ├── environment.ts                 # Development environment
│   │   └── environment.prod.ts            # Production environment
│   │
│   ├── index.html                         # Main HTML file
│   ├── main.ts                            # Application entry point
│   └── styles.scss                        # Global styles
│
├── angular.json                           # Angular CLI configuration
├── package.json                           # Dependencies
├── tsconfig.json                          # TypeScript configuration
└── README.md                              # Project documentation
```

## 📋 Module Breakdown

### **Core Module** (Singleton - Imported once in AppConfig)
- **Guards**: Authentication guard, role-based access guard
- **Interceptors**: JWT token interceptor, error handling interceptor, loading interceptor
- **Services**: AuthService, ApiService, LocalStorageService, NotificationService
- **Models**: User, Customer, Supplier, Item, Batch, Invoice, etc.
- **Constants**: API endpoints, app constants, error messages
- **Enums**: UserRole, InvoiceStatus, PaymentStatus, etc.

### **Shared Module** (Imported in multiple feature modules)
- **Components**: DataTable, Modal, ConfirmDialog, Loader, Pagination, SearchBar, etc.
- **Directives**: Permission directive, number-only directive, etc.
- **Pipes**: Date format, currency format, status badge, etc.
- **Validators**: Custom form validators
- **Utils**: Helper functions, formatters

### **Layout Module**
- Header with user profile, notifications
- Sidebar with navigation menu
- Footer
- Breadcrumb navigation

### **Feature Modules** (Lazy-loaded for performance)
Each feature module follows the same structure:
- **Components**: List, Form (Create/Edit), Detail views
- **Services**: CRUD operations, API calls
- **Routing**: Feature-specific routes

## 🎯 Key Features by Module

### **Authentication**
- Login/Logout
- Token management
- Profile management
- Password change

### **Dashboard**
- Overview statistics
- Quick actions
- Recent activities
- Alerts (low stock, expiring batches)

### **Users Management**
- List all users
- Create/Edit/Delete users
- Role management
- User statistics

### **Customers Management**
- Customer CRUD operations
- Customer details with transaction history
- Credit limit tracking

### **Suppliers Management**
- Supplier CRUD operations
- Supplier details with purchase history

### **Items Management**
- Product/Item CRUD operations
- Stock management
- Low stock alerts
- Category management

### **Batches Management**
- Batch tracking
- Expiry date management
- Expiring batches alerts
- Batch-wise stock

### **Sales Invoices**
- Create/Edit sales invoices
- Confirm invoices (inventory update)
- Payment tracking
- Invoice history

### **Purchase Invoices**
- Create/Edit purchase invoices
- Confirm invoices (inventory update)
- Payment tracking
- Invoice history

### **Reports**
- Sales reports
- Purchase reports
- Inventory reports
- Financial reports

## 🔐 Security & Access Control

All routes are protected with:
- **AuthGuard**: Ensures user is authenticated
- **RoleGuard**: Ensures user has required permissions

## 📱 Responsive Design

All components are designed to be responsive and work on:
- Desktop (primary focus for admin)
- Tablet
- Mobile (limited functionality)

## 🎨 UI/UX Considerations

- Clean, professional admin interface
- Consistent design patterns
- Easy navigation
- Quick actions
- Real-time notifications
- Form validation
- Loading states
- Error handling

---

**Status**: ✅ Folder structure created  
**Next Steps**: Generate Angular 18 project and implement components
