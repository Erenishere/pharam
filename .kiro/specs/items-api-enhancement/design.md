# Design Document

## Overview

The Items API Enhancement builds upon the existing item management infrastructure to provide a comprehensive set of RESTful endpoints for pharmaceutical item management. The design leverages the current MVC architecture with controllers, services, repositories, and models while ensuring all 10+ required endpoints are properly implemented and optimized.

## Architecture

### Current Architecture Analysis
The system already implements a robust 3-layer architecture:
- **Controller Layer**: Handles HTTP requests and responses (`itemController.js`)
- **Service Layer**: Contains business logic (`itemService.js`)
- **Repository Layer**: Data access abstraction (`itemRepository.js`)
- **Model Layer**: Data structure and validation (`Item.js`)

### Enhanced Architecture Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │────│  Item Controller │────│  Item Service   │
│  (Express.js)   │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                       ┌─────────────────┐    ┌─────────────────┐
                       │ Batch Service   │────│ Item Repository │
                       │                 │    │                 │
                       └─────────────────┘    └─────────────────┘
                                                        │
                                              ┌─────────────────┐
                                              │   MongoDB       │
                                              │   (Item Model)  │
                                              └─────────────────┘
```

## Components and Interfaces

### 1. Enhanced Item Controller
**Purpose**: Handle all HTTP requests for item operations
**Key Methods**:
- `getAllItems()` - Enhanced with advanced filtering
- `getItemById()` - Retrieve single item
- `createItem()` - Create new item with validation
- `updateItem()` - Update existing item
- `deleteItem()` - Soft delete item
- `updateItemStock()` - Stock level management
- `getLowStockItems()` - Low stock reporting
- `getItemCategories()` - Category listing
- `scanBarcode()` - Barcode scanning
- `getItemBatches()` - Batch information retrieval

### 2. Item Service Enhancements
**Purpose**: Business logic and data processing
**Key Enhancements**:
- Advanced filtering with multiple criteria
- Optimized pagination with performance considerations
- Stock level calculations and validations
- Category aggregation and caching
- Barcode lookup with batch integration

### 3. Route Configuration
**Base Path**: `/api/v1/items`
**Endpoint Mapping**:
```
GET    /api/v1/items                # Get all items (enhanced filtering)
GET    /api/v1/items/:id            # Get item by ID
POST   /api/v1/items                # Create item
PUT    /api/v1/items/:id            # Update item
DELETE /api/v1/items/:id            # Delete item (soft)
GET    /api/v1/items/low-stock      # Low stock items
GET    /api/v1/items/categories     # Get categories
PATCH  /api/v1/items/:id/stock      # Update stock
GET    /api/v1/items/:id/batches    # Get item batches
POST   /api/v1/items/scan-barcode   # Scan barcode
```

## Data Models

### Item Model Structure
```javascript
{
  code: String,           // Unique identifier
  name: String,           // Item name
  description: String,    // Item description
  category: String,       // Product category
  unit: String,          // Measurement unit
  pricing: {
    costPrice: Number,
    salePrice: Number,
    currency: String
  },
  tax: {
    gstRate: Number,
    whtRate: Number,
    taxCategory: String
  },
  inventory: {
    currentStock: Number,
    minimumStock: Number,
    maximumStock: Number
  },
  isActive: Boolean,
  timestamps: true
}
```

### Response Data Models

#### Standard Item Response
```javascript
{
  success: Boolean,
  data: Item | Item[],
  pagination?: {
    totalItems: Number,
    totalPages: Number,
    currentPage: Number,
    itemsPerPage: Number,
    hasNextPage: Boolean,
    hasPreviousPage: Boolean
  },
  message: String,
  timestamp: String
}
```

#### Low Stock Response
```javascript
{
  success: Boolean,
  data: [{
    _id: String,
    code: String,
    name: String,
    category: String,
    inventory: {
      currentStock: Number,
      minimumStock: Number
    },
    stockStatus: String
  }],
  message: String,
  timestamp: String
}
```

## Error Handling

### Error Response Structure
```javascript
{
  success: false,
  error: {
    code: String,        // Error code (e.g., 'ITEM_NOT_FOUND')
    message: String      // Human-readable error message
  },
  timestamp: String
}
```

### Error Categories
1. **Validation Errors** (400)
   - Missing required fields
   - Invalid data formats
   - Business rule violations

2. **Not Found Errors** (404)
   - Item not found
   - Invalid item ID

3. **Authorization Errors** (401/403)
   - Authentication required
   - Insufficient permissions

4. **Server Errors** (500)
   - Database connection issues
   - Unexpected system errors

## Testing Strategy

### Unit Testing
- **Controller Tests**: HTTP request/response handling
- **Service Tests**: Business logic validation
- **Model Tests**: Data validation and methods
- **Repository Tests**: Database operations

### Integration Testing
- **API Endpoint Tests**: Full request-response cycle
- **Database Integration**: CRUD operations with MongoDB
- **Authentication Flow**: Protected endpoint access

### Performance Testing
- **Load Testing**: High-volume item retrieval
- **Pagination Performance**: Large dataset handling
- **Search Performance**: Complex filtering operations

### Test Coverage Goals
- Minimum 80% code coverage
- All critical paths tested
- Error scenarios covered
- Edge cases validated

## Performance Optimizations

### Database Indexing
```javascript
// Existing indexes to verify/enhance
{ code: 1 }                    // Unique item lookup
{ name: 1 }                    // Name-based searches
{ category: 1 }                // Category filtering
{ isActive: 1 }                // Active item filtering
{ 'inventory.currentStock': 1 } // Stock level queries
{ 'pricing.salePrice': 1 }     // Price range filtering
```

### Caching Strategy
- **Category Cache**: Cache category list for 1 hour
- **Low Stock Cache**: Cache low stock results for 15 minutes
- **Item Details Cache**: Cache individual items for 30 minutes
- **Search Results Cache**: Cache filtered results for 5 minutes

### Query Optimization
- Use projection to limit returned fields
- Implement compound indexes for complex filters
- Optimize aggregation pipelines for category listing
- Use lean queries for list operations

## Security Considerations

### Authentication & Authorization
- All endpoints require valid JWT token
- Role-based access control:
  - `admin`: Full access to all operations
  - `inventory_manager`: CRUD operations on items
  - `user`: Read-only access to items

### Input Validation
- Sanitize all input parameters
- Validate data types and ranges
- Prevent NoSQL injection attacks
- Implement rate limiting for API calls

### Data Protection
- Mask sensitive pricing information based on user role
- Audit trail for all item modifications
- Secure handling of barcode data

## Integration Points

### Batch Management Integration
- Seamless integration with existing batch system
- Batch information included in item responses
- Cross-reference validation between items and batches

### Inventory Management Integration
- Real-time stock level updates
- Integration with stock movement tracking
- Warehouse-specific inventory handling

### Invoice System Integration
- Item validation for invoice creation
- Price and tax information retrieval
- Stock availability checking

## Monitoring and Logging

### Performance Metrics
- API response times per endpoint
- Database query performance
- Cache hit/miss ratios
- Error rates by endpoint

### Business Metrics
- Most accessed items
- Popular search terms
- Low stock alert frequency
- Category distribution

### Logging Strategy
- Request/response logging for audit
- Error logging with stack traces
- Performance logging for slow queries
- Security event logging