# Indus Traders ERP - Quick Reference Guide

**Quick access to common operations and endpoints**

---

## 🚀 Quick Start

### 1. Login
```bash
POST /api/v1/auth/login
{
  "identifier": "admin@industraders.com",
  "password": "admin123"
}
```

### 2. Get Token
```javascript
const token = response.data.data.token;
// Use in all subsequent requests:
// Authorization: Bearer <token>
```

---

## 📌 Most Used Endpoints

### Sales Operations

```bash
# Create Sales Invoice
POST /api/v1/invoices/sales
{
  "customerId": "...",
  "invoiceDate": "2025-11-25",
  "items": [{ "itemId": "...", "quantity": 10, "unitPrice": 150 }]
}

# Confirm Invoice (Updates Stock)
PATCH /api/v1/invoices/sales/:id/confirm

# Get All Sales Invoices
GET /api/v1/invoices/sales?page=1&limit=20

# Get Invoice by Number
GET /api/v1/invoices/sales/number/SI2025000001

# Mark as Paid
POST /api/v1/invoices/sales/:id/mark-paid
{
  "paymentMethod": "cash",
  "paymentReference": "TXN123"
}
```

### Purchase Operations

```bash
# Create Purchase Invoice
POST /api/v1/invoices/purchase
{
  "supplierId": "...",
  "invoiceDate": "2025-11-25",
  "items": [{ "itemId": "...", "quantity": 50, "unitPrice": 100 }]
}

# Confirm Invoice (Updates Stock + Creates Batches)
PATCH /api/v1/invoices/purchase/:id/confirm

# Get All Purchase Invoices
GET /api/v1/invoices/purchase?page=1&limit=20
```

### Customer Management

```bash
# Get All Customers
GET /api/v1/customers?page=1&limit=20&search=ABC

# Create Customer
POST /api/v1/customers
{
  "name": "ABC Company",
  "code": "CUST001",
  "contactInfo": { "phone": "1234567890", "email": "abc@example.com" },
  "financialInfo": { "creditLimit": 100000 }
}

# Get Customer by Code
GET /api/v1/customers/code/CUST001
```

### Item Management

```bash
# Get All Items
GET /api/v1/items?page=1&limit=20

# Create Item
POST /api/v1/items
{
  "code": "ITEM001",
  "name": "Product Name",
  "category": "Electronics",
  "pricing": { "costPrice": 100, "salePrice": 150 },
  "inventory": { "currentStock": 100, "minimumStock": 10 }
}

# Get Low Stock Items
GET /api/v1/items/low-stock
```

### Reports

```bash
# Sales Summary
GET /api/v1/reports/sales-summary?dateFrom=2025-01-01&dateTo=2025-01-31

# Sales by Customer
GET /api/v1/reports/sales-by-customer?customerId=...&dateFrom=...&dateTo=...

# Inventory Summary
GET /api/v1/reports/inventory-summary

# Profit & Loss
GET /api/v1/reports/profit-loss?dateFrom=2025-01-01&dateTo=2025-12-31

# Customer Aging
GET /api/v1/reports/customer-aging
```

---

## 🔑 Common Query Parameters

```bash
# Pagination
?page=1&limit=20

# Date Range
?dateFrom=2025-01-01&dateTo=2025-01-31

# Search
?search=keyword

# Filters
?status=confirmed&paymentStatus=pending

# Sorting
?sort=-createdAt  # Descending
?sort=name        # Ascending
```

---

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

---

## 🔐 User Roles & Permissions

| Role | Access |
|------|--------|
| **admin** | Full access to everything |
| **sales** | Sales invoices, customers, reports |
| **purchase** | Purchase invoices, suppliers, items |
| **inventory** | Items, stock, warehouses |
| **accountant** | Financial reports, ledgers, cash book |
| **data_entry** | Create/edit invoices, customers, items |
| **salesman** | Self-service portal, limited sales access |

---

## 💰 Tax Calculations

### GST (17% Standard)
```
Subtotal:     10,000
GST (17%):     1,700
Total:        11,700
```

### With WHT (4%)
```
Subtotal:     10,000
GST (17%):     1,700
Gross:        11,700
WHT (4%):       -400
Net Total:    11,300
```

---

## 📦 Invoice Workflow

### Sales Invoice
```
1. Create (Draft)
   ↓
2. Confirm (Stock Reduced, Status: Confirmed)
   ↓
3. Mark as Paid (Payment Recorded)
   ↓
4. Complete
```

### Purchase Invoice
```
1. Create (Draft)
   ↓
2. Confirm (Stock Increased, Batches Created)
   ↓
3. Mark as Paid (Payment Recorded)
   ↓
4. Complete
```

---

## 🏷️ Invoice Numbering

- **Sales**: SI2025000001, SI2025000002, ...
- **Purchase**: PI2025000001, PI2025000002, ...
- **Format**: [Type][Year][Sequential Number]

---

## 📱 Common Status Values

### Invoice Status
- `draft` - Not confirmed
- `confirmed` - Confirmed, stock updated
- `cancelled` - Cancelled

### Payment Status
- `pending` - Not paid
- `partial` - Partially paid
- `paid` - Fully paid

### Stock Movement Type
- `in` - Stock received
- `out` - Stock issued
- `transfer` - Inter-warehouse transfer
- `adjustment` - Stock adjustment

---

## 🛠️ Useful Commands

```bash
# Start server
npm start

# Development mode
npm run dev

# Run tests
npm test

# Seed database
npm run seed

# Clear database
npm run seed:clear

# Check health
curl http://localhost:3000/api/v1/monitoring/health
```

---

## 🔍 Search & Filter Examples

### Search Customers
```bash
GET /api/v1/customers?search=ABC&type=customer&isActive=true
```

### Filter Invoices
```bash
GET /api/v1/invoices/sales?status=confirmed&paymentStatus=pending&dateFrom=2025-01-01
```

### Low Stock Items
```bash
GET /api/v1/items?lowStock=true&category=Electronics
```

---

## 📈 Export Options

All reports support export:
```bash
# PDF
GET /api/v1/reports/sales-summary?format=pdf

# Excel
GET /api/v1/reports/sales-summary?format=excel

# CSV
GET /api/v1/reports/sales-summary?format=csv
```

---

## 🚨 Common Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid/missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate entry |
| 422 | Validation Error |
| 500 | Server Error |

---

## 💡 Tips & Best Practices

1. **Always confirm invoices** to update stock
2. **Use pagination** for large datasets
3. **Cache frequently accessed data** (items, customers)
4. **Validate credit limits** before sales
5. **Track batches** for expiry management
6. **Regular backups** of database
7. **Monitor performance** metrics
8. **Use appropriate roles** for users

---

## 📞 Support

- **Documentation**: `/docs/COMPREHENSIVE-PROJECT-DOCUMENTATION.md`
- **API Docs**: `http://localhost:3000/api-docs`
- **Health Check**: `http://localhost:3000/api/v1/monitoring/health`

---

**Last Updated**: November 25, 2025  
**Version**: 1.0.0
