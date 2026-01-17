# Implementation Plan

- [x] 1. Create supplier data models and interfaces





  - Create Frontend/src/app/features/suppliers/models/supplier.model.ts
  - Define Supplier interface with all properties
  - Define ContactInfo and FinancialInfo interfaces
  - Define SupplierFormData interface for create/edit operations
  - Define SupplierStatistics interface
  - Define PaginatedResponse and ApiResponse generic interfaces
  - Define ApiError interface for error handling
  - _Requirements: All requirements (data foundation)_

- [x] 2. Create supplier service for API communication





  - Create Frontend/src/app/features/suppliers/services/supplier.service.ts
  - Implement getSuppliers method with pagination and filtering
  - Implement getSuppliersByType method
  - Implement getSupplierByCode method
  - Implement getSupplierById method
  - Implement createSupplier method
  - Implement updateSupplier method
  - Implement deleteSupplier method
  - Implement restoreSupplier method
  - Implement toggleSupplierStatus method
  - Implement getStatistics method
  - Add proper error handling for all methods
  - Add HttpClient injection and base URL configuration
  - _Requirements: 2.2, 3.6, 4.5, 5.2, 6.2, 7.2, 8.2, 9.2, 10.2, 11.2_

- [x] 3. Create main suppliers list component





  - Create Frontend/src/app/features/suppliers/suppliers.component.ts
  - Create Frontend/src/app/features/suppliers/suppliers.component.html
  - Create Frontend/src/app/features/suppliers/suppliers.component.scss
  - Implement component class with all required properties (suppliers array, pagination, filters, loading state)
  - Implement ngOnInit to load suppliers on component initialization
  - Implement loadSuppliers method to fetch suppliers from service
  - Implement search functionality with search input
  - Implement type filter dr opdown (All, Customer, Supplier, Both)
  - Implement status filter dropdown (All, Active, Inactive)
  - Implement pagination with MatPaginator
  - Add loading spinner during data fetch
  - Add error message display
  - Import all required Angular Material modules
  - _Requirements: 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 9.1, 9.2, 9.3, 9.4_

- [x] 4. Create suppliers table in template





  - Add MatTable with supplier data source
  - Define table columns: code, name, type, phone, email, city, isActive, actions
  - Add column headers
  - Display supplier data in table rows
  - Add status chip/badge for active/inactive display
  - Add action buttons column (view, edit, delete, restore)
  - Implement permission-based button visibility (canEdit, canDelete, canRestore)
  - Add MatPaginator below table
  - Style table for responsiveness
  - _Requirements: 2.3, 2.7, 5.5, 6.5, 7.5, 12.1, 12.2_

- [x] 5. Implement create supplier functionality












  - Add "Add Supplier" button in header
  - Implement openCreateDialog method to open supplier form dialog
  - Create Frontend/src/app/features/suppliers/components/supplier-form directory
  - Create supplier-form.component.ts, .html, .scss files
  - Build reactive form with FormBuilder
  - Add form fields for: code, name, type, contact info (phone, email, address, city, country)
  - Add form fields for financial info (creditLimit, paymentTerms, taxNumber, etc.)
  - Implement form validation (required fields, email format, numeric ranges)
  - Add submit button and cancel button
  - Implement onSubmit method to call createSupplier service
  - Show success message on successful creation
  - Close dialog and refresh supplier list after creation
  - Display validation errors inline in form
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 6. Implement edit supplier functionality





  - Add edit button in table actions column
  - Implement openEditDialog method to open supplier form with existing data
  - Modify supplier-form component to support edit mode
  - Pre-populate form with supplier data in edit mode
  - Change dialog title based on create/edit mode
  - Implement onSubmit to call updateSupplier service in edit mode
  - Show success message on successful update
  - Close dialog and refresh supplier list after update
  - Handle update errors and display error messages
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 7. Implement delete supplier functionality







  - Add delete button in table actions column (admin only)
  - Implement confirmDelete method to show confirmation dialog
  - Use MatDialog to display confirmation message
  - Implement delete action to call deleteSupplier service
  - Show success message on successful deletion
  - Refresh supplier list after deletion
  - Handle delete errors and display error messages
  - Hide delete button based on user role (check authService)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 8. Implement restore supplier functionality





  - Add restore button in table actions column for inactive suppliers (admin only)
  - Implement restoreSupplier method to call restore service
  - Show success message on successful restore
  - Refresh supplier list after restore
  - Handle restore errors and display error messages
  - Hide restore button based on user role
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 9. Implement toggle status functionality





  - Add status toggle (MatSlideToggle) in table status column
  - Implement toggleStatus method to call toggleSupplierStatus service
  - Update UI optimistically (toggle immediately)
  - Revert toggle if API call fails
  - Show success/error message
  - Hide toggle control based on user role (admin or purchase only)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 10. Implement supplier detail view





  - Add view/detail button in table actions column
  - Create Frontend/src/app/features/suppliers/components/supplier-detail directory/'
  - Create supplier-detail.component.ts, .html, .scss files
  - Implement openDetailDialog method to open detail dialog
  - Display all supplier information in organized sections (Basic Info, Contact Info, Financial Info)
  - Use MatTabs to organize information if needed
  - Add edit and delete action buttons in detail dialog
  - Implement navigation from detail to edit dialog
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 11. Implement search by code functionality





  - Add dedicated search by code input or use existing search
  - Implement search logic to call getSupplierByCode when code format is detected
  - Display single supplier result or highlight in list
  - Show "not found" message if supplier doesn't exist
  - Clear search to return to full list
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

-

- [x] 12. Implement statistics dashboard



  - Create Frontend/src/app/features/suppliers/components/supplier-stats directory
  - Create supplier-stats.component.ts, .html, .scss files
  - Implement loadStatistics method in main component
  - Check user role (admin or accountant) to show statistics
  - Display statistics cards: Total Suppliers, Active, Inactive, By Type breakdown
  - Display financial summaries if available
  - Use MatCard for statistics display
  - Add loading state for statistics
  - Handle statistics fetch errors
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
-

- [x] 13. Configure routing for suppliers module




  - Add suppliers route to Frontend/src/app/app.routes.ts
  - Configure route path as '/suppliers'
  - Use lazy loading with loadComponent
  - Apply authGuard to protect route
  - Test navigation from sidebar to suppliers page
  - Verify route loads SuppliersComponent correctly
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 14. Verify and test sidebar navigation





  - Verify Suppliers link exists in Frontend/src/app/layout/sidebar/sidebar.component.ts
  - Verify routerLink is set to '/suppliers'
  - Verify icon and label are appropriate
  - Test clicking link navigates to suppliers page
  - Verify active route highlighting works
  - _Requirements: 1.1_

- [x] 15. Implement permission-based UI controls





  - Inject AuthService in suppliers component
  - Implement checkPermissions method to determine user role
  - Set boolean flags: canCreate, canEdit, canDelete, canRestore, canToggleStatus, showStatistics
  - Use *ngIf directives to conditionally show/hide buttons based on permissions
  - Test with different user roles (admin, purchase, data_entry, accountant, etc.)
  - _Requirements: 3.1, 4.1, 5.5, 6.5, 7.5, 11.5_

- [x] 16. Add loading states and error handling





  - Add loading spinner (MatProgressSpinner) during API calls
  - Implement error property to store error messages
  - Display error messages using MatSnackBar or inline error display
  - Add try-catch or error callbacks for all service calls
  - Provide user-friendly error messages
  - Add retry functionality for failed operations
  - _Requirements: 2.7, 2.8, 3.8, 4.7, 5.4, 6.4, 7.4, 8.4, 9.4, 12.5_
-

- [x] 17. Style and responsive design




  - Create suppliers.component.scss with proper styling
  - Style header section with title and add button
  - Style filters section with proper spacing
  - Style table for readability
  - Make table responsive (consider card view for mobile)
  - Style statistics cards
  - Style dialogs (form and detail)
  - Ensure consistent spacing and colors with app theme
  - Test on different screen sizes
  - _Requirements: 12.1, 12.2, 12.3_
-

- [x] 18. Implement form validation and user feedback




  - Add validators to all form fields (required, minLength, maxLength, email, min, max)
  - Display validation errors below form fields
  - Disable submit button when form is invalid
  - Mark fields as touched on submit attempt
  - Show success messages using MatSnackBar after successful operations
  - Show error messages for failed operations
  - Add loading state to submit button
  - _Requirements: 3.3, 3.4, 3.5, 3.8, 4.4, 12.3, 12.5_
-

- [x] 19. Test all supplier operations end-to-end



  - Test loading supplier list on page load
  - Test pagination (change page, change page size)
  - Test search functionality
  - Test type filter
  - Test status filter
  - Test create supplier flow (open dialog, fill form, submit, verify in list)
  - Test edit supplier flow (open dialog, modify data, submit, verify changes)
  - Test delete supplier flow (confirm dialog, delete, verify removal)
  - Test restore supplier flow (restore, verify status change)
  - Test toggle status (toggle, verify change)
  - Test view supplier details
  - Test statistics display (if admin/accountant)
  - Test permission-based UI (different roles)
  - Test error scenarios (network errors, validation errors)
  - _Requirements: All requirements_


- [x] 20. Code cleanup and documentation






  - Add JSDoc comments to all public methods
  - Remove console.logs and debug code
  - Ensure consistent code formatting
  - Add component documentation comments
  - Review and optimize imports
  - Check for unused variables and methods
  - Ensure TypeScript strict mode compliance
  - _Requirements: All requirements_
