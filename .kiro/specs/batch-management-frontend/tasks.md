# Implementation Plan

- [x] 1. Set up batch management module structure and core interfaces





  - Create batch-management feature module with routing
  - Define TypeScript interfaces for Batch, BatchFilter, and BatchStatistics models
  - Set up module imports for Angular Material, ReactiveFormsModule, and HttpClientModule
  - Create batch-management-routing.module.ts with all required routes
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1_

- [x] 2. Implement batch service layer and API integration





  - [x] 2.1 Create BatchService with all CRUD operations

    - Implement getBatches() with filtering and pagination support
    - Add createBatch(), updateBatch(), deleteBatch 
    - Implement adjustQuantity() for quantity management
    - Add getExpiringBatches() and getNextBatchNumber() methods
    - _Requirements: 1.1, 2.2, 3.3, 4.2, 5.1, 7.2_

  - [x] 2.2 Create BatchStatisticsService for analytics

    - Implement getBatchStatistics() method
    - Add getExpiryAnalytics() and getLocationDistribution() methods
    - Create getSupplierAnalytics() for supplier performance metrics
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 2.3 Write unit tests for service methods
    - Test all BatchService methods with HttpClientTestingModule
    - Mock API responses and test error handling
    - Validate request parameters and response mapping
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1_

- [x] 3. Create batch list component with filtering and pagination








  - [x] 3.1 Implement BatchListComponent with data table




    - Create component with Angular Material table
    - Add sorting functionality for all columns
    - Implement server-side pagination with MatPaginator
    - Display batch status with color-coded indicators
    - _Requirements: 1.1, 1.4, 8.4_

  - [x] 3.2 Create BatchFiltersComponent for advanced filtering


    - Build reactive form with all filter options
    - Implement item search with autocomplete
    - Add location and supplier multi-select dropdowns
    - Create date range picker for expiry filtering
    - _Requirements: 1.2, 1.3, 5.5, 8.5_

  - [x] 3.3 Integrate filtering with batch list display


    - Connect filter component to batch list component
    - Implement real-time filtering with debounced search
    - Add filter state management and URL parameter sync
    - _Requirements: 1.2, 1.3, 8.5_

  - [ ]* 3.4 Write component tests for batch list functionality
    - Test table rendering and sorting behavior
    - Validate filter integration and pagination
    - Test navigation to detail and edit views
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 4. Implement batch form component for create and edit operations





  - [x] 4.1 Create BatchFormComponent with reactive forms


    - Build form with all required fields and validation
    - Implement custom validators for dates and quantities
    - Add async validation for batch number uniqueness
    - Create item selection with autocomplete functionality
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2_

  - [x] 4.2 Add auto-generation of batch numbers


    - Integrate with getNextBatchNumber API
    - Implement batch number format ITEM-CODE-YYYYMMDD-XXX
    - Auto-populate batch number when item is selected
    - _Requirements: 2.3_


  - [x] 4.3 Implement form submission and navigation

    - Handle create and update operations
    - Add success/error notifications
    - Implement navigation back to batch list after successful submission
    - _Requirements: 2.5, 3.5_

  - [ ]* 4.4 Write tests for form validation and submission
    - Test all form validators and error messages
    - Validate async batch number checking
    - Test successful form submission flows
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5. Create batch detail component with comprehensive information display





  - [x] 5.1 Implement BatchDetailComponent layout


    - Create detailed view with all batch information
    - Display item details, quantities, dates, and location
    - Add status badges and visual indicators
    - Include supplier information and notes section
    - _Requirements: 1.5, 8.4_

  - [x] 5.2 Add action buttons for batch operations


    - Implement Edit, Delete, and Adjust Quantity buttons
    - Add conditional logic for delete button (zero remaining quantity)
    - Create navigation to edit form
    - _Requirements: 3.1, 4.1, 7.1, 7.2_

  - [ ]* 5.3 Write tests for detail component functionality
    - Test data display and action button visibility
    - Validate navigation to edit and adjustment components
    - Test conditional delete button logic
    - _Requirements: 1.5, 3.1, 4.1, 7.1, 7.2_

- [x] 6. Implement quantity adjustment modal component





  - [x] 6.1 Create QuantityAdjustmentComponent as modal dialog

    - Build modal with current quantity display
    - Add adjustment input with positive/negative validation
    - Implement real-time calculation of new quantity
    - Create reason selection dropdown
    - _Requirements: 4.1, 4.2, 4.3, 4.4_


  - [x] 6.2 Integrate quantity adjustment with batch service

    - Connect modal to adjustQuantity API method
    - Handle validation for quantity limits
    - Implement confirmation dialog before adjustment
    - Add success notification and data refresh
    - _Requirements: 4.2, 4.3, 4.5_

  - [ ]* 6.3 Write tests for quantity adjustment functionality
    - Test modal display and form validation
    - Validate quantity calculations and limits
    - Test API integration and error handling
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [-] 7. Create expiry tracker component for batch expiration management



  - [x] 7.1 Implement ExpiryTrackerComponent with configurable periods






    - Create component to display expiring batches
    - Add configurable expiry warning period (1-365 days)
    - Implement color-coded expiry status indicators
    - Sort batches by expiry date with soonest first
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 7.2 Add location filtering for expiry tracking







    - Integrate location filter with expiry display
    - Implement grouping by urgency levels
    - Add export functionality for expiring batches
    - _Requirements: 5.5_

  - [ ]* 7.3 Write tests for expiry tracking functionality
    - Test expiry period configuration
    - Validate color coding and sorting logic
    - Test location filtering integration
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 8. Implement batch statistics dashboard with charts and analytics





  - [x] 8.1 Create BatchStatisticsComponent with KPI cards


    - Build dashboard layout with key performance indicators
    - Display total batches, inventory value, expired batches
    - Add low stock alerts and average batch age metrics
    - Implement responsive card layout
    - _Requirements: 6.1, 6.4_

  - [x] 8.2 Add interactive charts for batch analytics


    - Integrate Chart.js with ng2-charts for visualizations
    - Create donut chart for batch distribution by status
    - Add bar chart for batches by location
    - Implement pie chart for value distribution by supplier
    - _Requirements: 6.2_

  - [x] 8.3 Implement date range filtering for statistics


    - Add date range picker for statistical period selection
    - Update all charts and KPIs based on selected date range
    - Implement drill-down functionality from charts to detailed lists
    - _Requirements: 6.3, 6.5_

  - [ ]* 8.4 Write tests for statistics dashboard functionality
    - Test KPI calculations and display
    - Validate chart rendering and data binding
    - Test date range filtering and drill-down features
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 9. Add view mode switching for item and location organization





  - [x] 9.1 Implement view mode toggle in batch list


    - Add toggle buttons for "View by Item" and "View by Location"
    - Create expandable group sections for each view mode
    - Display summary information for each grouping
    - _Requirements: 8.1, 8.2, 8.3_


  - [x] 9.2 Implement grouped batch display functionality

    - Show batches grouped under items or locations
    - Sort batches within groups by expiry date
    - Maintain filter and search functionality across view modes
    - Add expand/collapse functionality for groups
    - _Requirements: 8.3, 8.4, 8.5_

  - [ ]* 9.3 Write tests for view mode functionality
    - Test view mode switching and group display
    - Validate sorting within groups
    - Test filter integration across view modes
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 10. Implement error handling and user feedback systems





  - [x] 10.1 Create global error interceptor for HTTP requests


    - Implement HTTP error interception with user-friendly messages
    - Add retry logic for transient failures
    - Create loading state management across components
    - _Requirements: 2.4, 3.4, 4.4, 7.4_

  - [x] 10.2 Add comprehensive user feedback notifications


    - Implement toast notifications for success/error states
    - Add confirmation dialogs for destructive actions
    - Create loading spinners during API calls
    - _Requirements: 2.5, 3.5, 4.5, 7.4_

  - [ ]* 10.3 Write tests for error handling and notifications
    - Test error interceptor functionality
    - Validate notification display and user interactions
    - Test loading state management
    - _Requirements: 2.4, 2.5, 3.4, 3.5, 4.4, 4.5, 7.4_

- [x] 12. Implement enhanced styling and light theme for expiring batch module





  - [ ] 12.1 Create enhanced SCSS styles for batch components
    - Implement light theme color palette with #7367F0 primary color
    - Create enhanced search field styling with purple border focus
    - Add color-coded status indicators for batch expiry states
    - Implement card-based layout with proper shadows and spacing


    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ] 12.2 Apply enhanced styling to expiry tracker component
    - Implement gradient backgrounds for different expiry status levels
    - Add hover effects and smooth transitions for batch cards


    - Create visual hierarchy with proper typography and spacing
    - Apply consistent border styling and color coding
    - _Requirements: 9.1, 9.2, 9.4, 9.5_

  - [x] 12.3 Enhance batch filters component styling


    - Style search fields with #7367F0 border on focus
    - Implement elevated card design for filter container
    - Add proper spacing and visual grouping for filter options
    - Apply dark gray text color (#4B4B4B) throughout
    - _Requirements: 9.2, 9.3, 9.4_

  - [ ] 12.4 Update batch table and list styling
    - Apply light theme colors to table headers and rows
    - Implement hover effects with primary color accent
    - Add proper visual separation and spacing
    - Ensure consistent text colors and typography
    - _Requirements: 9.1, 9.2, 9.4_

  - [ ]* 12.5 Write tests for styling implementation
    - Test CSS class applications and theme consistency
    - Validate color usage and accessibility compliance
    - Test responsive behavior across different screen sizes
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_