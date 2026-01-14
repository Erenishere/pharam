# Indus Traders API Documentation - Phase 1 & 2

## Overview

This document provides comprehensive documentation for all API endpoints in the Indus Traders application, covering both Phase 1 and Phase 2 features.

**Base URL**: `http://localhost:5000/api`

**Authentication**: Most endpoints require JWT authentication via Bearer token in the Authorization header.

```
Authorization: Bearer <your_jwt_token>
```

## Table of Contents

1. [Authentication](#authentication)
2. [Sales Invoices](#sales-invoices)
3. [Purchase Invoices](#purchase-invoices)
4. [Customers](#customers)
5. [Suppliers](#suppliers)
6. [Items](#items)
7. [Warehouses](#warehouses)
8. [Salesmen & Routes](#salesmen--routes)
9. [Schemes & Trade Offers](#schemes--trade-offers)
10. [Reports](#reports)
11. [Print Templates](#print-templates)
12. [SMS](#sms)
13. [Cash Book](#cash-book)

---

## Authentication

### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "user_id",
      "username": "john_doe",
      "email": "user@example.com",
      "role": "admin"
    }
  }
}
```

---

## Sales Invoices

### Create Sales Invoice
```http
POST /api/invoices/sales
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "customerId": "customer_id",
  "salesmanId": "salesman_id",
  "warehouseId": "warehouse_id",
  "invoiceDate": "2024-01-15T00:00:00.000Z",
  "dueDate": "2024-02-15T00:00:00.000Z",
  "items": [
    {
      "itemId": "item_id",
      "quantity": 10,
      "unitPrice": 150,
      "discount": 5,
      "warehouseId": "warehouse_id",
      "warrantyMonths": 12,
      "warrantyDetails": "Standard warranty"
    }
  ],
  "notes": "Urgent delivery required",
  "memoNo": "MEMO-001",
  "warrantyInfo": "All items covered under warranty"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "invoice_id",
    "invoiceNumber": "SI2024000001",
    "customerId": "customer_id",
    "salesmanId": "salesman_id",
    "items": [...],
    "totals": {
      "subtotal": 1425,
      "discount": 75,
      "taxAmount": 243,
      "grandTotal": 1593
    },
    "status": "draft",
    "paymentStatus": "pending"
  }
}
```

### Advanced Search
```http
POST /api/invoices/sales/search
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "searchText": "customer name",
  "searchFields": ["invoiceNo", "notes"],
  "filters": [
    {
      "field": "status",
      "operator": "equals",
      "value": "confirmed"
    },
    {
      "field": "grandTotal",
      "operator": "gte",
      "value": 1000
    }
  ],
  "sort": {
    "field": "invoiceDate",
    "order": "desc"
  },
  "page": 1,
  "limit": 20
}
```

### Get Invoice by ID
```http
GET /api/invoices/sales/:id
Authorization: Bearer <token>
```

### Update Invoice
```http
PUT /api/invoices/sales/:id
Authorization: Bearer <token>
```

### Confirm Invoice
```http
PATCH /api/invoices/sales/:id/confirm
Authorization: Bearer <token>
```

### Mark as Paid
```http
POST /api/invoices/sales/:id/mark-paid
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "paymentMethod": "cash",
  "paymentDate": "2024-01-20T00:00:00.000Z"
}
```

### Get Warranty Information
```http
GET /api/invoices/sales/:id/warranty
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "invoiceWarranty": {
      "warrantyInfo": "All items covered",
      "warrantyPaste": true
    },
    "itemWarranties": [
      {
        "itemId": "item_id",
        "itemName": "Product Name",
        "warrantyMonths": 12,
        "warrantyDetails": "Standard warranty"
      }
    ]
  }
}
```

### Update Warranty Information
```http
PUT /api/invoices/sales/:id/warranty
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "warrantyInfo": "Extended warranty coverage",
  "warrantyPaste": true,
  "itemWarranties": [
    {
      "itemId": "item_id",
      "warrantyMonths": 24,
      "warrantyDetails": "Extended 2-year warranty"
    }
  ]
}
```

---

## Purchase Invoices

### Create Purchase Invoice
```http
POST /api/invoices/purchase
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "type": "purchase",
  "supplierId": "supplier_id",
  "supplierBillNo": "SUPP-INV-001",
  "invoiceDate": "2024-01-15T00:00:00.000Z",
  "dueDate": "2024-02-15T00:00:00.000Z",
  "items": [
    {
      "itemId": "item_id",
      "quantity": 100,
      "unitPrice": 95,
      "warehouseId": "warehouse_id"
    }
  ],
  "biltyNo": "BILTY-12345",
  "biltyDate": "2024-01-14T00:00:00.000Z",
  "transportCompany": "ABC Transport",
  "transportCharges": 500,
  "cartonQty": 10,
  "dimension": "Electronics"
}
```

---

## Warehouses

### List All Warehouses
```http
GET /api/warehouses
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "warehouse_id",
      "code": "WH001",
      "name": "Main Warehouse",
      "location": "City Center",
      "isActive": true
    }
  ]
}
```

### Create Warehouse
```http
POST /api/warehouses
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "code": "WH002",
  "name": "Branch Warehouse",
  "location": "Suburb Area",
  "isActive": true
}
```

### Stock Transfer
```http
POST /api/stock-movements/transfer
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "itemId": "item_id",
  "fromWarehouseId": "warehouse1_id",
  "toWarehouseId": "warehouse2_id",
  "quantity": 50,
  "transferDate": "2024-01-15T00:00:00.000Z",
  "notes": "Stock rebalancing"
}
```

---

## Salesmen & Routes

### Create Salesman
```http
POST /api/salesmen
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "code": "SM001",
  "name": "John Doe",
  "phone": "1234567890",
  "email": "john@example.com",
  "commissionRate": 2.5,
  "commissionType": "sales",
  "isActive": true
}
```

### Assign Route to Salesman
```http
PATCH /api/salesmen/:id
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "routeId": "route_id"
}
```

### Create Route
```http
POST /api/routes
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "code": "RT001",
  "name": "City Route",
  "description": "Main city area coverage",
  "isActive": true
}
```

---

## Schemes & Trade Offers

### Create Scheme
```http
POST /api/schemes
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "code": "SCH001",
  "name": "Buy 10 Get 1 Free",
  "type": "quantity",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-12-31T00:00:00.000Z",
  "minQuantity": 10,
  "freeQuantity": 1,
  "isActive": true
}
```

### List Active Schemes
```http
GET /api/schemes/active
Authorization: Bearer <token>
```

---

## Reports

### Salesman Commission Report
```http
GET /api/reports/salesman-commission
Authorization: Bearer <token>
```

**Query Parameters:**
- `salesmanId`: Salesman ID (required)
- `startDate`: Start date (required)
- `endDate`: End date (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "salesmanId": "salesman_id",
    "salesmanName": "John Doe",
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    },
    "totalSales": 50000,
    "commissionRate": 2.5,
    "totalCommission": 1250,
    "invoices": [...]
  }
}
```

### Sales by Dimension Report
```http
GET /api/reports/sales-by-dimension
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate`: Start date
- `endDate`: End date
- `dimension`: Specific dimension (optional)

### Aging Report
```http
GET /api/reports/aging
Authorization: Bearer <token>
```

**Query Parameters:**
- `customerId`: Customer ID (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "customerId": "customer_id",
    "customerName": "Customer Name",
    "agingBuckets": {
      "0-30": 5000,
      "31-60": 3000,
      "61-90": 2000,
      "90+": 1000
    },
    "totalOverdue": 11000
  }
}
```

### Warehouse Stock Report
```http
GET /api/reports/warehouse-stock
Authorization: Bearer <token>
```

**Query Parameters:**
- `warehouseId`: Warehouse ID (optional)
- `itemId`: Item ID (optional)

---

## Print Templates

### Generate Print Data
```http
GET /api/print/invoice/:id
Authorization: Bearer <token>
```

**Query Parameters:**
- `format`: Print format (standard, logo, thermal, warranty_bill, tax_invoice, store_copy, estimate)

**Response:**
```json
{
  "success": true,
  "data": {
    "format": "logo",
    "invoice": {
      "invoiceNumber": "SI2024000001",
      "invoiceDate": "2024-01-15",
      "notes": "Delivery instructions",
      "memoNo": "MEMO-001",
      "warrantyInfo": "All items covered"
    },
    "party": {
      "name": "Customer Name",
      "address": "123 Street",
      "phone": "1234567890"
    },
    "items": [...],
    "totals": {...},
    "metadata": {
      "includeLogo": true,
      "hasNotes": true,
      "hasMemoNo": true,
      "showNotesProminent": true,
      "includeWarranty": false
    }
  }
}
```

---

## SMS

### Send SMS
```http
POST /api/sms/send
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "phoneNumber": "1234567890",
  "message": "Your invoice is ready",
  "recipientType": "customer",
  "recipientId": "customer_id"
}
```

### Get SMS Templates
```http
GET /api/sms/templates
Authorization: Bearer <token>
```

---

## Cash Book

### Record Cash Receipt
```http
POST /api/cashbook/receipt
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "customerId": "customer_id",
  "amount": 5000,
  "paymentMethod": "cheque",
  "chequeNo": "CHQ-123456",
  "chequeDate": "2024-02-01T00:00:00.000Z",
  "bankName": "Test Bank",
  "receiptDate": "2024-01-15T00:00:00.000Z",
  "invoiceAllocations": [
    {
      "invoiceId": "invoice1_id",
      "amount": 3000
    },
    {
      "invoiceId": "invoice2_id",
      "amount": 2000
    }
  ]
}
```

### Clear Cheque
```http
PATCH /api/cashbook/receipt/:id/clear-cheque
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "clearanceDate": "2024-02-01T00:00:00.000Z"
}
```

### Bounce Cheque
```http
PATCH /api/cashbook/receipt/:id/bounce-cheque
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "bounceDate": "2024-02-01T00:00:00.000Z",
  "bounceReason": "Insufficient funds",
  "bounceCharges": 500
}
```

---

## Common Response Codes

- `200 OK`: Successful GET/PUT/PATCH request
- `201 Created`: Successful POST request
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation error message"
    }
  ]
}
```

---

## Pagination

Most list endpoints support pagination:

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 100,
    "itemsPerPage": 20
  }
}
```

---

## Next Steps

- See [API Usage Guide](./API-USAGE-GUIDE.md) for common workflows
- See [Swagger Documentation](./swagger.json) for interactive API testing
- See [Keyboard Shortcuts](./KEYBOARD-SHORTCUTS.md) for UI shortcuts
