# Requirements Document

## Introduction

This specification defines the implementation of a comprehensive Supplier Module frontend interface for the inventory management application. The backend API already provides 10 RESTful endpoints for managing supplier data (statistics, filtering by type/code, CRUD operations, soft delete, restore, and status toggle). This specification focuses on creating the Angular frontend components, services, and UI to consume these APIs and provide a complete supplier management interface accessible from the dashboard sidebar.

## Glossary

- **Supplier Frontend**: The Angular components, services, and UI for supplier management
- **Supplier Service**: The Angular service that communicates with backend APIs
- **Supplier Component**: The main Angular component for displaying and managing suppliers
- **Supplier List**: A table view displaying all suppliers with filtering and pagination
- **Supplier Form**: A dialog or form for creating and editing suppliers
- **Dashboard Sidebar**: The navigation menu providing access to different modules
- **API Client**: The HTTP service layer for making backend API calls
- **Route Configuration**: Angular routing setup for navigation

## Requirements

### Requirement 1

**User Story:** As a user, I want to navigate to the supplier management interface from the dashboard sidebar, so that I can access supplier operations

#### Acceptance Criteria

1. WHEN a user clicks the Suppliers link in the sidebar, THE Supplier Frontend SHALL navigate to the /suppliers route
2. THE Supplier Frontend SHALL configure the /suppliers route in the Angular routing module
3. THE Supplier Frontend SHALL protect the route with authentication guard
4. THE Supplier Frontend SHALL load the supplier management component when navigating to /suppliers

### Requirement 2

**User Story:** As a user, I want to view a list of all suppliers with filtering and pagination, so that I can browse and search through suppliers efficiently

#### Acceptance Criteria

1. WHEN a user navigates to the suppliers page, THE Supplier Frontend SHALL display a table with all suppliers
2. THE Supplier Frontend SHALL fetch suppliers from GET /api/suppliers endpoint with pagination
3. THE Supplier Frontend SHALL display supplier code, name, type, contact info, and status in the table
4. THE Supplier Frontend SHALL provide search functionality to filter by name or code
5. THE Supplier Frontend SHALL provide filter controls for type and active status
6. THE Supplier Frontend SHALL implement pagination controls with page size selection
7. THE Supplier Frontend SHALL display loading state while fetching data
8. IF the API returns an error, THEN THE Supplier Frontend SHALL display an error message

### Requirement 3

**User Story:** As a user with appropriate permissions, I want to create new suppliers, so that I can add business entities to the system

#### Acceptance Criteria

1. WHEN a user clicks the "Add Supplier" button, THE Supplier Frontend SHALL open a create supplier dialog or form
2. THE Supplier Frontend SHALL display form fields for all supplier properties (name, code, type, contact info, financial info)
3. THE Supplier Frontend SHALL validate required fields before submission
4. THE Supplier Frontend SHALL validate email format if provided
5. THE Supplier Frontend SHALL validate numeric fields (credit limit, payment terms)
6. WHEN the user submits valid data, THE Supplier Frontend SHALL call POST /api/suppliers endpoint
7. IF creation succeeds, THEN THE Supplier Frontend SHALL close the dialog, refresh the list, and show success message
8. IF creation fails, THEN THE Supplier Frontend SHALL display validation errors or error message

### Requirement 4

**User Story:** As a user with appropriate permissions, I want to edit existing suppliers, so that I can update supplier information

#### Acceptance Criteria

1. WHEN a user clicks the edit button for a supplier, THE Supplier Frontend SHALL open an edit supplier dialog with pre-filled data
2. THE Supplier Frontend SHALL fetch supplier details from GET /api/suppliers/:id if needed
3. THE Supplier Frontend SHALL allow editing all supplier fields
4. THE Supplier Frontend SHALL validate fields same as create form
5. WHEN the user submits valid changes, THE Supplier Frontend SHALL call PUT /api/suppliers/:id endpoint
6. IF update succeeds, THEN THE Supplier Frontend SHALL close the dialog, refresh the list, and show success message
7. IF update fails, THEN THE Supplier Frontend SHALL display validation errors or error message

### Requirement 5

**User Story:** As an administrator, I want to delete suppliers, so that I can remove suppliers from active use

#### Acceptance Criteria

1. WHEN a user clicks the delete button for a supplier, THE Supplier Frontend SHALL show a confirmation dialog
2. WHEN the user confirms deletion, THE Supplier Frontend SHALL call DELETE /api/suppliers/:id endpoint
3. IF deletion succeeds, THEN THE Supplier Frontend SHALL refresh the list and show success message
4. IF deletion fails, THEN THE Supplier Frontend SHALL display an error message
5. THE Supplier Frontend SHALL only show delete button to users with admin role

### Requirement 6

**User Story:** As an administrator, I want to restore deleted suppliers, so that I can reactivate previously removed suppliers

#### Acceptance Criteria

1. THE Supplier Frontend SHALL provide a way to view deleted/inactive suppliers
2. WHEN a user clicks the restore button for an inactive supplier, THE Supplier Frontend SHALL call POST /api/suppliers/:id/restore endpoint
3. IF restore succeeds, THEN THE Supplier Frontend SHALL refresh the list and show success message
4. IF restore fails, THEN THE Supplier Frontend SHALL display an error message
5. THE Supplier Frontend SHALL only show restore button to users with admin role

### Requirement 7

**User Story:** As a user with appropriate permissions, I want to toggle supplier active status, so that I can quickly enable or disable suppliers

#### Acceptance Criteria

1. THE Supplier Frontend SHALL display a toggle or button for changing supplier status
2. WHEN a user toggles the status, THE Supplier Frontend SHALL call PATCH /api/suppliers/:id/toggle-status endpoint
3. IF toggle succeeds, THEN THE Supplier Frontend SHALL update the UI and show success message
4. IF toggle fails, THEN THE Supplier Frontend SHALL revert the UI and display an error message
5. THE Supplier Frontend SHALL only show toggle control to users with admin or purchase role

### Requirement 8

**User Story:** As a user, I want to view detailed information about a specific supplier, so that I can see all supplier data

#### Acceptance Criteria

1. WHEN a user clicks on a supplier row or view button, THE Supplier Frontend SHALL display supplier details
2. THE Supplier Frontend SHALL fetch supplier details from GET /api/suppliers/:id endpoint
3. THE Supplier Frontend SHALL display all supplier information including contact and financial details
4. THE Supplier Frontend SHALL provide options to edit or delete from the detail view

### Requirement 9

**User Story:** As a user, I want to filter suppliers by type, so that I can view only customers, suppliers, or both

#### Acceptance Criteria

1. THE Supplier Frontend SHALL provide a type filter dropdown with options: All, Customer, Supplier, Both
2. WHEN a user selects a type, THE Supplier Frontend SHALL call GET /api/suppliers/type/:type endpoint
3. THE Supplier Frontend SHALL update the table to show only suppliers of the selected type
4. THE Supplier Frontend SHALL maintain the filter selection when navigating back to the page

### Requirement 10

**User Story:** As a user, I want to search for suppliers by code, so that I can quickly find specific suppliers

#### Acceptance Criteria

1. THE Supplier Frontend SHALL provide a search input for supplier code
2. WHEN a user enters a code and searches, THE Supplier Frontend SHALL call GET /api/suppliers/code/:code endpoint
3. IF a supplier is found, THEN THE Supplier Frontend SHALL display the supplier details or highlight it in the list
4. IF no supplier is found, THEN THE Supplier Frontend SHALL display a "not found" message

### Requirement 11

**User Story:** As an administrator or accountant, I want to view supplier statistics, so that I can analyze supplier data

#### Acceptance Criteria

1. THE Supplier Frontend SHALL display a statistics section or dashboard cards
2. THE Supplier Frontend SHALL fetch statistics from GET /api/suppliers/statistics endpoint
3. THE Supplier Frontend SHALL display total suppliers, active count, inactive count, and breakdown by type
4. THE Supplier Frontend SHALL display financial summaries if available
5. THE Supplier Frontend SHALL only show statistics to users with admin or accountant role

### Requirement 12

**User Story:** As a user, I want the supplier interface to be responsive and user-friendly, so that I can work efficiently

#### Acceptance Criteria

1. THE Supplier Frontend SHALL use Angular Material components for consistent UI
2. THE Supplier Frontend SHALL be responsive and work on different screen sizes
3. THE Supplier Frontend SHALL provide clear visual feedback for all actions (loading, success, error)
4. THE Supplier Frontend SHALL follow the same design patterns as the User module
5. THE Supplier Frontend SHALL handle errors gracefully with user-friendly messages
