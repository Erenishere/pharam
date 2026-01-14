# Indus Traders Backend API Documentation

## Overview

The Indus Traders Backend API is a comprehensive RESTful API for managing sales, purchases, inventory, accounts, and reporting for trading businesses. The API follows REST principles and returns JSON responses.

## Base URL

```
Development: http://localhost:3000/api/v1
Production: https://api.industraders.com/api/v1
```

## Authentication

The API uses JWT (JSON Web Token) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Getting a Token

**POST** `/auth/login`

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
      "_id": "507f1f77bcf86cd799439011",
      "username": "john_doe",
      "email": "user@example.com",
      "role": "admin"
    }
  }
}
```

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 500 | Internal Server Error |

## Pagination

List endpoints support pagination with query parameters:

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `sort` - Sort field and order (e.g., `-createdAt` for descending)

**Example:**
```
GET /items?page=2&limit=50&sort=-createdAt
```

## Filtering

Most list endpoints support filtering:

```
GET /items?category=Electronics&isActive=true
GET /invoices/sales?status=confirmed&startDate=2024-01-01&endDate=2024-12-31
```

## API Endpoints

### Authentication

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Logout
```http
POST /auth/logout
Authorization: Bearer <token>
```

#### Refresh Token
```http
POST /auth/refresh
Authorization: Bearer <token>
```

### Users

#### Get All Users
```http
GET /users?page=1&limit=20&role=admin
Authorization: Bearer <token>
```

#### Get User by ID
```http
GET /users/:id
Authorization: Bearer <token>
```

#### Create User
```http
POST /users
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "sales",
  "isActive": true
}
```

#### Update User
```http
PUT /users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "john_doe_updated",
  "role": "admin"
}
```

#### Delete User
```http
DELETE /users/:id
Authorization: Bearer <token>
```

### Customers

#### Get All Customers
```http
GET /customers?page=1&limit=20&type=customer&isActive=true
Authorization: Bearer <token>
```

#### Get Customer by ID
```http
GET /customers/:id
Authorization: Bearer <token>
```

#### Create Customer
```http
POST /customers
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "CUST000001",
  "name": "ABC Corporation",
  "type": "customer",
  "contactInfo": {
    "phone": "+92-300-1234567",
    "email": "contact@abc.com",
    "address": "123 Main Street",
    "city": "Karachi",
    "country": "Pakistan"
  },
  "financialInfo": {
    "creditLimit": 100000,
    "paymentTerms": 30,
    "taxNumber": "1234567890",
    "currency": "PKR"
  }
}
```

#### Update Customer
```http
PUT /customers/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "ABC Corporation Ltd",
  "financialInfo": {
    "creditLimit": 150000
  }
}
```

### Suppliers

Similar to Customers endpoints, replace `/customers` with `/suppliers`.

### Items

#### Get All Items
```http
GET /items?page=1&limit=20&category=Electronics&isActive=true
Authorization: Bearer <token>
```

#### Get Item by ID
```http
GET /items/:id
Authorization: Bearer <token>
```

#### Create Item
```http
POST /items
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "ITEM000001",
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
    "whtRate": 4,
    "taxCategory": "standard"
  },
  "inventory": {
    "currentStock": 100,
    "minimumStock": 10,
    "maximumStock": 1000
  }
}
```

#### Get Low Stock Items
```http
GET /items/low-stock
Authorization: Bearer <token>
```

### Sales Invoices

#### Get All Sales Invoices
```http
GET /invoices/sales?page=1&limit=20&status=confirmed&startDate=2024-01-01
Authorization: Bearer <token>
```

#### Get Sales Invoice by ID
```http
GET /invoices/sales/:id
Authorization: Bearer <token>
```

#### Create Sales Invoice
```http
POST /invoices/sales
Authorization: Bearer <token>
Content-Type: application/json

{
  "customerId": "507f1f77bcf86cd799439011",
  "invoiceDate": "2024-01-01T00:00:00Z",
  "dueDate": "2024-01-31T00:00:00Z",
  "items": [
    {
      "itemId": "507f1f77bcf86cd799439012",
      "quantity": 10,
      "unitPrice": 150,
      "discount": 5,
      "taxAmount": 25.5
    }
  ],
  "notes": "Special instructions"
}
```

#### Confirm Sales Invoice
```http
POST /invoices/sales/:id/confirm
Authorization: Bearer <token>
```

#### Get Overdue Invoices
```http
GET /invoices/sales/overdue
Authorization: Bearer <token>
```

### Purchase Invoices

Similar to Sales Invoices, replace `/invoices/sales` with `/invoices/purchase`.

### Accounts & Ledger

#### Get Account Statement
```http
GET /accounts/statement/:accountId?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>
```

#### Get Account Balance
```http
GET /accounts/balance/:accountId
Authorization: Bearer <token>
```

#### Get Ledger Entries
```http
GET /accounts/ledger?accountId=507f1f77bcf86cd799439011&page=1&limit=50
Authorization: Bearer <token>
```

#### Get Receivables
```http
GET /accounts/receivables?customerId=507f1f77bcf86cd799439011
Authorization: Bearer <token>
```

#### Get Payables
```http
GET /accounts/payables?supplierId=507f1f77bcf86cd799439011
Authorization: Bearer <token>
```

### Cash Book

#### Get Cash Receipts
```http
GET /cashbook/receipts?page=1&limit=20&status=pending
Authorization: Bearer <token>
```

#### Create Cash Receipt
```http
POST /cashbook/receipts
Authorization: Bearer <token>
Content-Type: application/json

{
  "customerId": "507f1f77bcf86cd799439011",
  "amount": 5000,
  "paymentMethod": "cash",
  "description": "Payment received",
  "receiptDate": "2024-01-01T00:00:00Z"
}
```

#### Get Cash Payments
```http
GET /cashbook/payments?page=1&limit=20
Authorization: Bearer <token>
```

#### Create Cash Payment
```http
POST /cashbook/payments
Authorization: Bearer <token>
Content-Type: application/json

{
  "supplierId": "507f1f77bcf86cd799439011",
  "amount": 10000,
  "paymentMethod": "bank_transfer",
  "referenceNumber": "TXN123456",
  "description": "Payment to supplier",
  "paymentDate": "2024-01-01T00:00:00Z"
}
```

#### Bank Reconciliation
```http
GET /cashbook/reconciliation?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

### Reports

#### Sales Report
```http
GET /reports/sales?startDate=2024-01-01&endDate=2024-12-31&groupBy=customer
Authorization: Bearer <token>
```

#### Purchase Report
```http
GET /reports/purchases?startDate=2024-01-01&endDate=2024-12-31&groupBy=supplier
Authorization: Bearer <token>
```

#### Inventory Report
```http
GET /reports/inventory?category=Electronics
Authorization: Bearer <token>
```

#### Financial Report
```http
GET /reports/financial?type=profit_loss&startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>
```

#### Tax Report
```http
GET /reports/tax?startDate=2024-01-01&endDate=2024-12-31&taxType=GST
Authorization: Bearer <token>
```

#### Export Report
```http
GET /reports/export?reportType=sales&format=pdf&startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>
```

### Stock Movements

#### Get Stock Movements
```http
GET /stock-movements?itemId=507f1f77bcf86cd799439011&page=1&limit=50
Authorization: Bearer <token>
```

#### Get Stock History
```http
GET /stock-movements/history/:itemId?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>
```

### Monitoring

#### Health Check
```http
GET /monitoring/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 3600,
    "timestamp": "2024-01-01T00:00:00Z",
    "memory": {
      "rss": "50.25 MB",
      "heapTotal": "30.50 MB",
      "heapUsed": "25.75 MB"
    },
    "performance": {
      "avgResponseTime": "45.50ms",
      "errorRate": "0.50%",
      "totalRequests": 1000
    }
  }
}
```

#### Performance Metrics
```http
GET /monitoring/metrics
Authorization: Bearer <token>
```

#### Dashboard Data
```http
GET /monitoring/metrics/dashboard
Authorization: Bearer <token>
```

#### Cache Statistics
```http
GET /monitoring/metrics/cache
Authorization: Bearer <token>
```

#### Clear Cache
```http
POST /monitoring/cache/clear
Authorization: Bearer <token>
Content-Type: application/json

{
  "duration": "short"
}
```

## Common Workflows

### 1. Create and Process Sales Invoice

```javascript
// Step 1: Create draft invoice
POST /invoices/sales
{
  "customerId": "...",
  "invoiceDate": "2024-01-01",
  "dueDate": "2024-01-31",
  "items": [...]
}

// Step 2: Confirm invoice (updates inventory)
POST /invoices/sales/:id/confirm

// Step 3: Record payment
POST /cashbook/receipts
{
  "customerId": "...",
  "amount": 1500,
  "paymentMethod": "cash"
}

// Step 4: Mark invoice as paid
PUT /invoices/sales/:id
{
  "paymentStatus": "paid",
  "status": "paid"
}
```

### 2. Check Inventory and Reorder

```javascript
// Step 1: Get low stock items
GET /items/low-stock

// Step 2: Create purchase invoice
POST /invoices/purchase
{
  "supplierId": "...",
  "items": [...]
}

// Step 3: Confirm purchase (updates inventory)
POST /invoices/purchase/:id/confirm
```

### 3. Generate Monthly Reports

```javascript
// Sales report
GET /reports/sales?startDate=2024-01-01&endDate=2024-01-31

// Purchase report
GET /reports/purchases?startDate=2024-01-01&endDate=2024-01-31

// Financial report
GET /reports/financial?type=profit_loss&startDate=2024-01-01&endDate=2024-01-31

// Export to PDF
GET /reports/export?reportType=sales&format=pdf&startDate=2024-01-01&endDate=2024-01-31
```

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Window**: 15 minutes
- **Max Requests**: 100 per window per IP

When rate limit is exceeded, you'll receive a 429 status code:

```json
{
  "error": "Too many requests from this IP, please try again later."
}
```

## Error Codes

| Code | Description |
|------|-------------|
| VALIDATION_ERROR | Input validation failed |
| AUTHENTICATION_ERROR | Invalid credentials |
| AUTHORIZATION_ERROR | Insufficient permissions |
| NOT_FOUND | Resource not found |
| DUPLICATE_ERROR | Resource already exists |
| BUSINESS_RULE_ERROR | Business rule violation |
| INTERNAL_ERROR | Internal server error |

## Best Practices

1. **Always use HTTPS** in production
2. **Store tokens securely** (never in localStorage for sensitive apps)
3. **Handle token expiration** and refresh tokens
4. **Use pagination** for large datasets
5. **Implement retry logic** for failed requests
6. **Cache responses** when appropriate
7. **Validate input** on client side before sending
8. **Handle errors gracefully** with user-friendly messages

## SDK Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Login
const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  localStorage.setItem('token', response.data.data.token);
  return response.data;
};

// Get items
const getItems = async (page = 1, limit = 20) => {
  const response = await api.get('/items', { params: { page, limit } });
  return response.data;
};

// Create invoice
const createInvoice = async (invoiceData) => {
  const response = await api.post('/invoices/sales', invoiceData);
  return response.data;
};
```

### Python

```python
import requests

class IndusAPI:
    def __init__(self, base_url='http://localhost:3000/api/v1'):
        self.base_url = base_url
        self.token = None
    
    def login(self, email, password):
        response = requests.post(
            f'{self.base_url}/auth/login',
            json={'email': email, 'password': password}
        )
        data = response.json()
        self.token = data['data']['token']
        return data
    
    def get_headers(self):
        return {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
    
    def get_items(self, page=1, limit=20):
        response = requests.get(
            f'{self.base_url}/items',
            headers=self.get_headers(),
            params={'page': page, 'limit': limit}
        )
        return response.json()
    
    def create_invoice(self, invoice_data):
        response = requests.post(
            f'{self.base_url}/invoices/sales',
            headers=self.get_headers(),
            json=invoice_data
        )
        return response.json()
```

## Support

For API support, contact:
- Email: support@industraders.com
- Documentation: https://docs.industraders.com
- GitHub: https://github.com/industraders/backend

## Changelog

### Version 1.0.0 (2024-01-01)
- Initial release
- Complete CRUD operations for all entities
- Invoice management with inventory integration
- Accounts and ledger system
- Cash book operations
- Comprehensive reporting
- Performance monitoring
