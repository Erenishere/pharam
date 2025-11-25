# Implementation Plan

- [x] 1. Set up project structure and core configuration

  - Initialize Node.js project with Express.js, MongoDB, and essential middleware
  - Configure environment variables, database connection, and basic server setup
  - Set up ESLint, Prettier, and Jest testing framework
  - Create folder structure following the layered architecture design
  - _Requirements: 9.3, 10.4_

- [x] 2. Implement database models and schemas

  - [x] 2.1 Create Mongoose schemas for core entities

    - Implement User, Customer, Supplier, Item, Invoice, StockMovement, and LedgerEntry schemas
    - Add validation rules, indexes, and schema methods
    - Write unit tests for schema validation and methods
    - _Requirements: 1.2, 9.1_

  - [x] 2.2 Set up database connection and configuration

    - Create MongoDB connection utility with error handling
    - Implement database seeding for initial data
    - Write integration tests for database operations
    - _Requirements: 10.3, 10.4_

- [x] 3. Build authentication and authorization system

  - [x] 3.1 Implement JWT authentication service

    - Create JWT token generation, validation, and refresh functionality
    - Implement password hashing using bcrypt
    - Write unit tests for authentication utilities
    - _Requirements: 1.1, 1.3_

  - [x] 3.2 Create authentication middleware and routes

    - Build login, logout, and token refresh endpoints
    - Implement role-based authorization middleware
    - Write integration tests for authentication endpoints
    - _Requirements: 1.2, 1.4_

- [x] 4. Develop user management system

  - [x] 4.1 Create user service and repository

    - Implement CRUD operations for user management
    - Add user role assignment and validation
    - Write unit tests for user service methods
    - _Requirements: 1.2_

  - [x] 4.2 Build user management API endpoints

    - Create REST endpoints for user operations
    - Implement user profile management
    - Write integration tests for user API endpoints
    - _Requirements: 1.2, 9.2_

- [x] 5. Implement customer and supplier management

  - [x] 5.1 Create customer/supplier service layer

    - Build service methods for customer and supplier CRUD operations
    - Implement credit limit validation and management
    - Write unit tests for customer/supplier services
    - _Requirements: 2.1, 3.1, 5.1_

  - [x] 5.2 Build customer/supplier API endpoints

    - Create REST endpoints for customer and supplier management
    - Implement search and filtering capabilities
    - Write integration tests for customer/supplier APIs
    - _Requirements: 2.4, 3.4, 9.4_

- [x] 6. Develop item and inventory management

  - [x] 6.1 Create item service and inventory tracking

    - Implement item CRUD operations with category management
    - Build inventory level tracking and stock validation
    - Write unit tests for item and inventory services
    - _Requirements: 4.1, 4.4_

  - [x] 6.2 Implement batch and expiry management

    - Create batch tracking system with manufacturing and expiry dates
    - Implement expired item flagging and prevention logic
    - Write unit tests for batch management functionality
    - _Requirements: 4.2, 4.5_

  - [x] 6.3 Build inventory API endpoints

    - Create REST endpoints for item and inventory operations
    - Implement low stock alerts and inventory reports
    - Write integration tests for inventory APIs
    - _Requirements: 4.3, 4.4, 9.4_

- [x] 7. Create tax calculation engine

  - [x] 7.1 Implement tax configuration service

    - Build tax rate management with GST and WHT support
    - Create tax category assignment and validation
    - Write unit tests for tax configuration methods
    - _Requirements: 7.1, 7.4_

  - [x] 7.2 Build tax calculation engine

    - Implement multi-tax calculation logic for invoices
    - Create tax computation algorithms for GST, WHT, and combined taxes
    - Write unit tests for tax calculation scenarios
    - _Requirements: 7.1, 7.2_

  - [x] 7.3 Build tax management API endpoints

    - Create REST endpoints for tax configuration and calculations
    - Implement tax report generation endpoints
    - Write integration tests for tax APIs
    - _Requirements: 7.3, 9.2_

- [ ] 8. Develop sales invoice system

  - [x] 8.1 Create sales invoice service layer

    - Implement sales invoice creation with automatic calculations
    - Build invoice number generation and validation logic
    - Write unit tests for sales invoice business logic
    - _Requirements: 2.1, 2.2_

  - [x] 8.2 Create sales invoice controller and routes

    - Build invoice controller with CRUD operations
    - Create REST endpoints for sales invoice operations
    - Implement invoice search, filtering, and status management
    - _Requirements: 2.4, 9.4_

  - [x] 8.3 Implement sales invoice processing with inventory integration

    - Create invoice confirmation workflow with inventory updates
    - Implement stock movement recording on invoice confirmation
    - Build invoice status transitions (draft → confirmed → paid)
    - Write integration tests for complete invoice workflows
    - _Requirements: 2.3, 2.5, 4.1_

- [-] 9. Develop purchase invoice system

  - [x] 9.1 Create purchase invoice service layer

    - Implement purchase invoice creation with supplier validation
    - Build invoice number generation for purchase invoices
    - Add purchase item processing with tax calculations
    - Write unit tests for purchase invoice business logic
    - _Requirements: 3.1, 3.2_

  - [x] 9.2 Create purchase invoice controller and routes

    - Build purchase invoice controller with CRUD operations

    - Create REST endpoints for purchase invoice operations
    - Implement supplier-wise and date-wise filtering
    - Write integration tests for purchase invoice APIs
    - _Requirements: 3.3, 3.4_

  - [x] 9.3 Implement purchase invoice processing with inventory integration

  - [-] 9.3 Implement purchase invoice processing with inventory integration

    - Create invoice confirmation workflow with inventory updates
    - Implement stock movement recording on purchase confirmation
    - Build batch creation from purchase invoices
    - Write integration tests for complete purchase workflows
    - _Requirements: 3.2, 4.1, 4.2_

- [ ] 10. Implement accounts and ledger system

  - [x] 10.1 Create ledger service and repository

    - Implement ledger entry creation service methods
    - Build account balance calculation and tracking
    - Create double-entry bookkeeping utilities
    - Write unit tests for ledger operations
    - _Requirements: 5.1, 5.2_

  - [x] 10.2 Integrate ledger with invoice workflows

    - Create automatic ledger entries on invoice confirmation
    - Implement customer receivables tracking on sales invoices
    - Implement supplier payables tracking on purchase invoices
    - Write unit tests for invoice-ledger integration
    - _Requirements: 5.1, 5.2, 5.3_

  - [-] 10.3 Develop receivables and payables management

    - Create customer receivables aging reports
    - Implement supplier payables management with due dates
    - Build account statement generation
    - Write unit tests for receivables/payables calculations
    - _Requirements: 5.3, 5.4_

  - [x] 10.4 Build accounts API endpoints

    - Create REST endpoints for ledger queries and account statements
    - Implement account balance and transaction history APIs
    - Build receivables and payables reporting endpoints

    - Write integration tests for accounts APIs
    - _Requirements: 5.4, 9.2_

- [ ] 11. Develop cash book system

  - [x] 11.1 Create cash transaction models and services

    - Create CashReceipt and CashPayment models
    - Implement cash receipt service with customer balance updates
    - Build cash payment service with supplier balance updates
    - Write unit tests for cash transaction services
    - _Requirements: 6.1, 6.2_

  - [x] 11.2 Integrate cash transactions with ledger

    - Create automatic ledger entries for cash receipts
    - Create automatic ledger entries for cash payments
    - Implement cash book balance tracking
    - Write unit tests for cash-ledger integration
    - _Requirements: 6.1, 6.2, 5.2_

  - [x] 11.3 Implement bank reconciliation system

    - Create bank statement matching and reconciliation logic
    - Build reconciliation reporting and discrepancy handling
    - Write unit tests for bank reconciliation functionality
    - _Requirements: 6.3_

  - [x] 11.4 Build cash book API endpoints

    - Create REST endpoints for cash receipts and payments
    - Implement cash flow reporting and reconciliation APIs
    - Write integration tests for cash book APIs
    - _Requirements: 6.4, 9.2_

- [ ] 12. Create reporting and analytics system

  - [x] 12.1 Implement report generation engine

    - Build dynamic report generation with flexible parameters
    - Create sales, purchase, and inventory report generators
    - Write unit tests for report generation logic
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 12.2 Develop financial reporting system

    - Implement profit/loss, balance sheet, and cash flow reports
    - Create tax compliance reports for SRB/FBR requirements
    - Write unit tests for financial report calculations
    - _Requirements: 8.4, 7.3_

  - [x] 12.3 Build export and analytics services

    - Implement PDF, Excel, and CSV export functionality
    - Create real-time analytics and dashboard data services
    - Write unit tests for export and analytics services
    - _Requirements: 8.5, 9.2_

  - [x] 12.4 Build reporting API endpoints

    - Create REST endpoints for all report types and exports
    - Implement report scheduling and caching mechanisms
    - Write integration tests for reporting APIs
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 13. Implement stock movement tracking

  - [x] 13.1 Create stock movement service and repository

    - Build stock movement repository for database operations
    - Implement stock movement service with transaction recording
    - Create stock adjustment and correction functionality
    - Write unit tests for stock movement tracking
    - _Requirements: 4.1, 4.4_

  - [x] 13.2 Integrate stock movements with invoice workflows

    - Record stock movements automatically on sales invoice confirmation
    - Record stock movements automatically on purchase invoice confirmation
    - Implement stock movement tracking for batch operations
    - Write integration tests for invoice-stock movement workflows
    - _Requirements: 4.1, 4.4_

  - [x] 13.3 Build stock movement API endpoints

    - Create REST endpoints for stock movement queries and reports
    - Implement stock history and audit trail functionality
    - Build stock movement filtering by item, date, and type
    - Write integration tests for stock movement APIs
    - _Requirements: 4.4, 9.4_

- [ ] 14. Enhance validation and error handling

  - [x] 14.1 Add invoice-specific validation

    - Implement invoice item validation (stock availability, pricing)
    - Build credit limit validation for sales invoices
    - Create payment terms validation for purchase invoices
    - Write unit tests for invoice validation logic
    - _Requirements: 2.5, 3.1, 4.5_

  - [x] 14.2 Enhance global error handling

    - Review and improve centralized error handling middleware
    - Add specific error types for business rule violations
    - Implement error logging and monitoring
    - Write integration tests for error handling scenarios
    - _Requirements: 9.2_

- [x] 15. Optimize performance and add monitoring

  - [x] 15.1 Review and optimize database indexes

    - Review existing indexes on all models
    - Add compound indexes for common query patterns
    - Optimize aggregation pipelines for reporting
    - Write performance tests for database operations
    - _Requirements: 10.1, 10.3_

  - [x] 15.2 Implement caching strategy

    - Add caching for frequently accessed data (tax configs, items)

    - Implement cache invalidation strategies
    - Write tests for cache functionality
    - _Requirements: 10.1_

  - [x] 15.3 Add API performance monitoring

    - Implement request logging and performance tracking
    - Create health check endpoints and monitoring
    - Write load tests for concurrent user scenarios
    - _Requirements: 10.1, 10.2_

- [x] 16. Complete API documentation and final integration


  - [x] 16.1 Expand Swagger/OpenAPI documentation

    - Document invoice endpoints with examples
    - Document accounts and ledger endpoints
    - Document cash book and reporting endpoints
    - Add authentication and authorization documentation
    - _Requirements: 9.3_

  - [ ] 16.2 Create API usage guide

    - Write getting started guide for API consumers
    - Document common workflows (create invoice, process payment, etc.)
    - Add code examples in multiple languages
    - _Requirements: 9.3_

  - [ ] 16.3 Final system integration and testing
    - Perform end-to-end testing of complete business workflows
    - Test invoice-to-payment complete cycles
    - Test inventory updates across all transaction types
    - Verify system performance and reliability requirements
    - _Requirements: 10.1, 10.2, 10.4_
