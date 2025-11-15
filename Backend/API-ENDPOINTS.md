# Indus Traders Backend - Complete API Documentation

**Base URL:** `http://localhost:3000/api/v1`

**Authentication:** Most endpoints require Bearer token authentication
```
Authorization: Bearer <your_jwt_token>
```

---

## 📋 Table of Contents
1. [Authentication](#authentication)
2. [Users](#users)
3. [Customers](#customers)
4. [Suppliers](#suppliers)
5. [Items](#items)
6. [Batches](#batches)
7. [Sales Invoices](#sales-invoices)
8. [Purchase Invoices](#purchase-invoices)
9. [Health Check](#health-check)

---

## 🔐 Authentication

### Login
```http
POST /api/v1/auth/login
```
**Body:**
```json
{
  "identifier": "admin@industraders.com",  // username or email
  "password": "admin123"
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "...",
      "username": "admin",
      "email": "admin@industraders.com",
      "role": "admin"
    }
  }
}
```

### Refresh Token
```http
POST /api/v1/auth/refresh
```
**Body:**
```json
{
  "refreshToken": "your_refresh_token"
}
```

### Logout
```http
POST /api/v1/auth/logout
```
**Auth:** Required

### Get Profile
```http
GET /api/v1/auth/profile
```
**Auth:** Required

### Verify Token
```http
GET /api/v1/auth/verify
```
**Auth:** Required

---

## 👥 Users

### Get All Users
```http
GET /api/v1/users?page=1&limit=10&role=admin&isActive=true&search=john
```
**Auth:** Admin only
**Query Params:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `role` (optional): Filter by role
- `isActive` (optional): Filter by active status
- `search` (optional): Search keyword

### Get User by ID
```http
GET /api/v1/users/:id
```
**Auth:** Admin only

### Create User
```http
POST /api/v1/users
```
**Auth:** Admin only
**Body:**
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123",
  "role": "sales",
  "isActive": true
}
```
**Roles:** `admin`, `sales`, `purchase`, `inventory`, `accountant`, `data_entry`

### Update User
```http
PUT /api/v1/users/:id
```
**Auth:** Admin only

### Delete User
```http
DELETE /api/v1/users/:id
```
**Auth:** Admin only (soft delete)

### Get My Profile
```http
GET /api/v1/users/profile/me
```
**Auth:** Required

### Update My Profile
```http
PUT /api/v1/users/profile/me
```
**Auth:** Required

### Change Password
```http
POST /api/v1/users/profile/change-password
```
**Auth:** Required
**Body:**
```json
{
  "currentPassword": "oldpass",
  "newPassword": "newpass123"
}
```

### Get Users by Role
```http
GET /api/v1/users/role/:role
```
**Auth:** Admin only

### Get User Statistics
```http
GET /api/v1/users/statistics
```
**Auth:** Admin only

### Reset User Password
```http
POST /api/v1/users/:id/reset-password
```
**Auth:** Admin only

### Update User Role
```http
PATCH /api/v1/users/:id/role
```
**Auth:** Admin only

### Toggle User Status
```http
PATCH /api/v1/users/:id/toggle-status
```
**Auth:** Admin only

### Restore User
```http
POST /api/v1/users/:id/restore
```
**Auth:** Admin only

---

## 👤 Customers

### Get All Customers
```http
GET /api/v1/customers?page=1&limit=10&type=customer&isActive=true&search=abc
```
**Auth:** Required
**Query Params:**
- `page`, `limit`, `type`, `isActive`, `search`

### Get Customer by ID
```http
GET /api/v1/customers/:id
```
**Auth:** Required

### Get Customer by Code
```http
GET /api/v1/customers/code/:code
```
**Auth:** Required

### Create Customer
```http
POST /api/v1/customers
```
**Auth:** Admin, Sales, Data Entry
**Body:**
```json
{
  "name": "ABC Company",
  "code": "CUST001",
  "type": "customer",
  "contactInfo": {
    "phone": "1234567890",
    "email": "contact@abc.com",
    "address": "123 Street",
    "city": "Karachi",
    "country": "Pakistan"
  },
  "financialInfo": {
    "creditLimit": 100000,
    "paymentTerms": 30,
    "currency": "PKR"
  },
  "isActive": true
}
```

### Update Customer
```http
PUT /api/v1/customers/:id
```
**Auth:** Admin, Sales, Data Entry

### Delete Customer
```http
DELETE /api/v1/customers/:id
```
**Auth:** Admin only

### Get Customers by Type
```http
GET /api/v1/customers/type/:type
```
**Auth:** Required
**Types:** `customer`, `supplier`, `both`

### Get Customer Statistics
```http
GET /api/v1/customers/statistics
```
**Auth:** Admin, Accountant

### Toggle Customer Status
```http
PATCH /api/v1/customers/:id/toggle-status
```
**Auth:** Admin, Sales

### Restore Customer
```http
POST /api/v1/customers/:id/restore
```
**Auth:** Admin only

---

## 🏢 Suppliers

### Get All Suppliers
```http
GET /api/v1/suppliers?page=1&limit=10&type=supplier&isActive=true&search=xyz
```
**Auth:** Required

### Get Supplier by ID
```http
GET /api/v1/suppliers/:id
```
**Auth:** Required

### Get Supplier by Code
```http
GET /api/v1/suppliers/code/:code
```
**Auth:** Required

### Create Supplier
```http
POST /api/v1/suppliers
```
**Auth:** Admin, Purchase, Data Entry
**Body:**
```json
{
  "name": "XYZ Suppliers",
  "code": "SUP001",
  "type": "supplier",
  "contactInfo": {
    "phone": "9876543210",
    "email": "contact@xyz.com",
    "address": "456 Avenue",
    "city": "Lahore",
    "country": "Pakistan"
  },
  "financialInfo": {
    "creditLimit": 0,
    "paymentTerms": 30,
    "currency": "PKR"
  },
  "isActive": true
}
```

### Update Supplier
```http
PUT /api/v1/suppliers/:id
```
**Auth:** Admin, Purchase, Data Entry

### Delete Supplier
```http
DELETE /api/v1/suppliers/:id
```
**Auth:** Admin only

### Get Suppliers by Type
```http
GET /api/v1/suppliers/type/:type
```
**Auth:** Required

### Get Supplier Statistics
```http
GET /api/v1/suppliers/statistics
```
**Auth:** Admin, Accountant

### Toggle Supplier Status
```http
PATCH /api/v1/suppliers/:id/toggle-status
```
**Auth:** Admin, Purchase

### Restore Supplier
```http
POST /api/v1/suppliers/:id/restore
```
**Auth:** Admin only

---

## 📦 Items

### Get All Items
```http
GET /api/v1/items?page=1&limit=10&category=Electronics&minPrice=100&maxPrice=1000&lowStock=true
```
**Auth:** Required
**Query Params:**
- `page`, `limit`, `sort`, `keyword`, `category`, `minPrice`, `maxPrice`, `lowStock`

### Get Item by ID
```http
GET /api/v1/items/:id
```
**Auth:** Required

### Create Item
```http
POST /api/v1/items
```
**Auth:** Admin, Inventory Manager
**Body:**
```json
{
  "code": "ITEM001",
  "name": "Product Name",
  "description": "Product description",
  "category": "Electronics",
  "unit": "piece",
  "pricing": {
    "costPrice": 100,
    "salePrice": 150,
    "currency": "PKR"
  },
  "tax": {
    "gstRate": 17,
    "whtRate": 0,
    "taxCategory": "standard"
  },
  "inventory": {
    "currentStock": 100,
    "minimumStock": 10,
    "maximumStock": 500
  },
  "isActive": true
}
```

### Update Item
```http
PUT /api/v1/items/:id
```
**Auth:** Admin, Inventory Manager

### Delete Item
```http
DELETE /api/v1/items/:id
```
**Auth:** Admin, Inventory Manager

### Get Low Stock Items
```http
GET /api/v1/items/low-stock
```
**Auth:** Required

### Get Item Categories
```http
GET /api/v1/items/categories
```
**Auth:** Required

### Update Item Stock
```http
PATCH /api/v1/items/:id/stock
```
**Auth:** Admin, Inventory Manager
**Body:**
```json
{
  "quantity": 50,
  "operation": "add"  // or "subtract"
}
```

---

## 🏷️ Batches

### Create Batch
```http
POST /api/v1/batches
```
**Auth:** Admin, Inventory Manager
**Body:**
```json
{
  "itemId": "item_id_here",
  "batchNumber": "BATCH001",
  "quantity": 100,
  "unitCost": 50,
  "manufacturingDate": "2024-01-01",
  "expiryDate": "2025-12-31",
  "supplierId": "supplier_id_here",
  "notes": "Optional notes"
}
```

### Get Batch by ID
```http
GET /api/v1/batches/:id
```
**Auth:** Required

### Update Batch
```http
PUT /api/v1/batches/:id
```
**Auth:** Admin, Inventory Manager

### Delete Batch
```http
DELETE /api/v1/batches/:id
```
**Auth:** Admin, Inventory Manager

### Get Batches by Item
```http
GET /api/v1/items/:itemId/batches?status=active&includeExpired=false
```
**Auth:** Required

### Get Batches by Location
```http
GET /api/v1/locations/:locationId/batches
```
**Auth:** Required

### Get Expiring Batches
```http
GET /api/v1/batches/expiring-soon?days=30
```
**Auth:** Required

### Get Expired Batches
```http
GET /api/v1/batches/expired
```
**Auth:** Required

### Update Batch Quantity
```http
PATCH /api/v1/batches/:id/quantity
```
**Auth:** Admin, Inventory Manager
**Body:**
```json
{
  "quantity": 10,  // positive to add, negative to remove
  "notes": "Adjustment reason"
}
```

### Get Batch Statistics
```http
GET /api/v1/batches/statistics?itemId=...&status=active
```
**Auth:** Required

### Get Next Batch Number
```http
GET /api/v1/items/:itemId/next-batch-number
```
**Auth:** Required

---

## 🧾 Sales Invoices

### Get All Sales Invoices
```http
GET /api/v1/invoices/sales?page=1&limit=10&status=confirmed&paymentStatus=pending
```
**Auth:** Required
**Query Params:**
- `page`, `limit`, `status`, `paymentStatus`, `dateFrom`, `dateTo`

### Get Sales Invoice by ID
```http
GET /api/v1/invoices/sales/:id
```
**Auth:** Required

### Get Sales Invoice by Number
```http
GET /api/v1/invoices/sales/number/:invoiceNumber
```
**Auth:** Required
**Example:** `/api/v1/invoices/sales/number/SI2025000001`

### Create Sales Invoice
```http
POST /api/v1/invoices/sales
```
**Auth:** Admin, Sales, Data Entry
**Body:**
```json
{
  "customerId": "customer_id_here",
  "invoiceDate": "2025-11-15",
  "dueDate": "2025-12-15",
  "items": [
    {
      "itemId": "item_id_here",
      "quantity": 10,
      "unitPrice": 150,
      "discount": 5,
      "batchInfo": {
        "batchNumber": "BATCH001",
        "expiryDate": "2025-12-31"
      }
    }
  ],
  "notes": "Optional notes"
}
```

### Update Sales Invoice
```http
PUT /api/v1/invoices/sales/:id
```
**Auth:** Admin, Sales, Data Entry

### Delete Sales Invoice
```http
DELETE /api/v1/invoices/sales/:id
```
**Auth:** Admin only (only draft invoices)

### Confirm Sales Invoice
```http
PATCH /api/v1/invoices/sales/:id/confirm
```
**Auth:** Admin, Sales, Accountant
**Effect:** Updates inventory (decreases stock), creates stock movements

### Cancel Sales Invoice
```http
PATCH /api/v1/invoices/sales/:id/cancel
```
**Auth:** Admin only
**Body:**
```json
{
  "reason": "Cancellation reason"
}
```
**Effect:** Reverses inventory if confirmed

### Mark as Paid
```http
POST /api/v1/invoices/sales/:id/mark-paid
```
**Auth:** Admin, Accountant
**Body:**
```json
{
  "paymentMethod": "bank_transfer",
  "paymentReference": "TXN123456",
  "notes": "Payment notes"
}
```

### Mark as Partially Paid
```http
POST /api/v1/invoices/sales/:id/mark-partial-paid
```
**Auth:** Admin, Accountant
**Body:**
```json
{
  "amount": 500,
  "notes": "Partial payment"
}
```

### Update Payment Status
```http
PATCH /api/v1/invoices/sales/:id/payment
```
**Auth:** Admin, Accountant
**Body:**
```json
{
  "paymentStatus": "paid",
  "amount": 1000,
  "paymentMethod": "cash"
}
```

### Get Invoice Stock Movements
```http
GET /api/v1/invoices/sales/:id/stock-movements
```
**Auth:** Required

### Get Sales by Customer
```http
GET /api/v1/invoices/sales/customer/:customerId
```
**Auth:** Required

### Get Sales Statistics
```http
GET /api/v1/invoices/sales/statistics
```
**Auth:** Admin, Sales, Accountant

---

## 📥 Purchase Invoices

### Get All Purchase Invoices
```http
GET /api/v1/invoices/purchase?page=1&limit=10&status=confirmed&paymentStatus=pending
```
**Auth:** Required
**Query Params:**
- `page`, `limit`, `status`, `paymentStatus`, `dateFrom`, `dateTo`

### Get Purchase Invoice by ID
```http
GET /api/v1/invoices/purchase/:id
```
**Auth:** Required

### Get Purchase Invoice by Number
```http
GET /api/v1/invoices/purchase/number/:invoiceNumber
```
**Auth:** Required
**Example:** `/api/v1/invoices/purchase/number/PI2025000001`

### Create Purchase Invoice
```http
POST /api/v1/invoices/purchase
```
**Auth:** Admin, Purchase, Data Entry
**Body:**
```json
{
  "supplierId": "supplier_id_here",
  "invoiceDate": "2025-11-15",
  "dueDate": "2025-12-15",
  "items": [
    {
      "itemId": "item_id_here",
      "quantity": 50,
      "unitPrice": 100,
      "discount": 5,
      "batchInfo": {
        "batchNumber": "BATCH001",
        "manufacturingDate": "2024-01-01",
        "expiryDate": "2025-12-31"
      }
    }
  ],
  "notes": "Optional notes"
}
```

### Update Purchase Invoice
```http
PUT /api/v1/invoices/purchase/:id
```
**Auth:** Admin, Purchase, Data Entry

### Delete Purchase Invoice
```http
DELETE /api/v1/invoices/purchase/:id
```
**Auth:** Admin only (only draft invoices)

### Confirm Purchase Invoice ✨
```http
PATCH /api/v1/invoices/purchase/:id/confirm
```
**Auth:** Admin, Purchase, Accountant
**Effect:** 
- Updates inventory (increases stock)
- Creates stock movements
- Creates batches if batch info provided
- Changes status to 'confirmed'

### Cancel Purchase Invoice
```http
PATCH /api/v1/invoices/purchase/:id/cancel
```
**Auth:** Admin only
**Body:**
```json
{
  "reason": "Cancellation reason"
}
```
**Effect:** Reverses inventory if confirmed

### Mark as Paid
```http
POST /api/v1/invoices/purchase/:id/mark-paid
```
**Auth:** Admin, Accountant
**Body:**
```json
{
  "paymentMethod": "bank_transfer",
  "paymentReference": "TXN123456",
  "notes": "Payment notes"
}
```

### Mark as Partially Paid
```http
POST /api/v1/invoices/purchase/:id/mark-partial-paid
```
**Auth:** Admin, Accountant
**Body:**
```json
{
  "amount": 1000,
  "notes": "Partial payment"
}
```

### Update Payment Status
```http
PATCH /api/v1/invoices/purchase/:id/payment
```
**Auth:** Admin, Accountant
**Body:**
```json
{
  "paymentStatus": "paid",
  "amount": 2000,
  "paymentMethod": "cash"
}
```

### Get Invoice Stock Movements
```http
GET /api/v1/invoices/purchase/:id/stock-movements
```
**Auth:** Required

### Get Purchases by Supplier
```http
GET /api/v1/invoices/purchase/supplier/:supplierId
```
**Auth:** Required

### Get Purchase Statistics
```http
GET /api/v1/invoices/purchase/statistics
```
**Auth:** Admin, Purchase, Accountant

---

## ❤️ Health Check

### API Health
```http
GET /api/v1/health
```
**Auth:** Not required
**Response:**
```json
{
  "status": "healthy",
  "service": "API",
  "timestamp": "2025-11-15T...",
  "uptime": 12345.67
}
```

### API Info
```http
GET /api/v1/
```
**Auth:** Not required
**Response:**
```json
{
  "name": "Indus Traders Backend API",
  "version": "1.0.0",
  "message": "API is running successfully",
  "endpoints": {
    "auth": "/api/auth",
    "users": "/api/users",
    ...
  }
}
```

---

## 📝 Common Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "timestamp": "2025-11-15T..."
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  },
  "timestamp": "2025-11-15T..."
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "totalItems": 100,
    "totalPages": 10,
    "currentPage": 1,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPreviousPage": false,
    "nextPage": 2,
    "previousPage": null
  }
}
```

---

## 🔑 User Roles & Permissions

| Role | Description | Access Level |
|------|-------------|--------------|
| `admin` | Full system access | All endpoints |
| `sales` | Sales operations | Customers, Sales Invoices, Items (read) |
| `purchase` | Purchase operations | Suppliers, Purchase Invoices, Items (read) |
| `inventory` | Inventory management | Items, Batches, Stock Movements |
| `accountant` | Financial operations | All invoices, Payments, Reports |
| `data_entry` | Data entry operations | Create/Update basic records |

---

## 📊 Invoice Status Flow

### Sales Invoice
```
draft → confirmed → paid
  ↓         ↓
cancelled cancelled
```

### Purchase Invoice
```
draft → confirmed → paid
  ↓         ↓
cancelled cancelled
```

**Rules:**
- Draft invoices don't affect inventory
- Confirmed invoices update inventory
- Cannot modify confirmed invoices
- Cannot cancel paid invoices
- Cancelling confirmed invoices reverses inventory

---

## 🧪 Testing

### Test Credentials
```
Email: admin@industraders.com
Password: admin123
```

### Test with cURL
```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@industraders.com","password":"admin123"}'

# Get items (with token)
curl -X GET http://localhost:3000/api/v1/items \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test with Postman
1. Import the endpoints
2. Set base URL: `http://localhost:3000/api/v1`
3. Add Authorization header with Bearer token
4. Test endpoints

---

## 📚 Additional Resources

- **Database:** MongoDB Atlas
- **Authentication:** JWT (JSON Web Tokens)
- **Validation:** express-validator
- **Documentation:** This file + Swagger (if configured)

---

**Last Updated:** November 15, 2025  
**API Version:** 1.0.0  
**Status:** ✅ All endpoints operational
