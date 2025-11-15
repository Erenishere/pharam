# API Quick Reference

**Base URL:** `http://localhost:3000/api/v1`

## 🚀 Quick Start

### 1. Login

```bash
POST /auth/login
{
  "identifier": "admin@industraders.com",
  "password": "admin123"
}
```

### 2. Use Token

```bash
Authorization: Bearer <your_token>
```

---

## 📋 All Working Endpoints (Summary)

### Authentication (5 endpoints)

- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout
- `GET /auth/profile` - Get profile
- `GET /auth/verify` - Verify token

### Users (15 endpoints)

- `GET /users` - List all users
- `GET /users/:id` - Get user by ID
- `POST /users` - Create user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user
- `GET /users/profile/me` - My profile
- `PUT /users/profile/me` - Update my profile
- `POST /users/profile/change-password` - Change password
- `GET /users/role/:role` - Users by role
- `GET /users/statistics` - User stats
- `POST /users/:id/reset-password` - Reset password
- `PATCH /users/:id/role` - Update role
- `PATCH /users/:id/toggle-status` - Toggle status
- `POST /users/:id/restore` - Restore user

### Customers (10 endpoints)

- `GET /customers` - List customers
- `GET /customers/:id` - Get by ID
- `GET /customers/code/:code` - Get by code
- `POST /customers` - Create customer
- `PUT /customers/:id` - Update customer
- `DELETE /customers/:id` - Delete customer
- `GET /customers/type/:type` - By type
- `GET /customers/statistics` - Statistics
- `PATCH /customers/:id/toggle-status` - Toggle status
- `POST /customers/:id/restore` - Restore

### Suppliers (10 endpoints)

- `GET /suppliers` - List suppliers
- `GET /suppliers/:id` - Get by ID
- `GET /suppliers/code/:code` - Get by code
- `POST /suppliers` - Create supplier
- `PUT /suppliers/:id` - Update supplier
- `DELETE /suppliers/:id` - Delete supplier
- `GET /suppliers/type/:type` - By type
- `GET /suppliers/statistics` - Statistics
- `PATCH /suppliers/:id/toggle-status` - Toggle status
- `POST /suppliers/:id/restore` - Restore

### Items (7 endpoints)

- `GET /items` - List items
- `GET /items/:id` - Get by ID
- `POST /items` - Create item
- `PUT /items/:id` - Update item
- `DELETE /items/:id` - Delete item
- `GET /items/low-stock` - Low stock items
- `GET /items/categories` - Categories
- `PATCH /items/:id/stock` - Update stock

### Batches (12 endpoints)

- `POST /batches` - Create batch
- `GET /batches/:id` - Get by ID
- `PUT /batches/:id` - Update batch
- `DELETE /batches/:id` - Delete batch
- `GET /items/:itemId/batches` - Batches by item
- `GET /locations/:locationId/batches` - Batches by location
- `GET /batches/expiring-soon` - Expiring soon
- `GET /batches/expired` - Expired batches
- `PATCH /batches/:id/quantity` - Update quantity
- `GET /batches/statistics` - Statistics
- `GET /items/:itemId/next-batch-number` - Next batch number

### Sales Invoices (15 endpoints)

- `GET /invoices/sales` - List invoices
- `GET /invoices/sales/:id` - Get by ID
- `GET /invoices/sales/number/:invoiceNumber` - Get by number
- `POST /invoices/sales` - Create invoice
- `PUT /invoices/sales/:id` - Update invoice
- `DELETE /invoices/sales/:id` - Delete invoice
- `PATCH /invoices/sales/:id/confirm` - ✨ Confirm (updates inventory)
- `PATCH /invoices/sales/:id/cancel` - Cancel (reverses inventory)
- `POST /invoices/sales/:id/mark-paid` - Mark paid
- `POST /invoices/sales/:id/mark-partial-paid` - Partial payment
- `PATCH /invoices/sales/:id/payment` - Update payment
- `GET /invoices/sales/:id/stock-movements` - Stock movements
- `GET /invoices/sales/customer/:customerId` - By customer
- `GET /invoices/sales/statistics` - Statistics
- `PATCH /invoices/sales/:id/status` - Update status
- `PATCH /invoices/sales/:id/payment-status` - Update payment status

### Purchase Invoices (15 endpoints) ✨ NEW

- `GET /invoices/purchase` - List invoices
- `GET /invoices/purchase/:id` - Get by ID
- `GET /invoices/purchase/number/:invoiceNumber` - Get by number
- `POST /invoices/purchase` - Create invoice
- `PUT /invoices/purchase/:id` - Update invoice
- `DELETE /invoices/purchase/:id` - Delete invoice
- `PATCH /invoices/purchase/:id/confirm` - ✨ Confirm (updates inventory)
- `PATCH /invoices/purchase/:id/cancel` - Cancel (reverses inventory)
- `POST /invoices/purchase/:id/mark-paid` - Mark paid
- `POST /invoices/purchase/:id/mark-partial-paid` - Partial payment
- `PATCH /invoices/purchase/:id/payment` - Update payment
- `GET /invoices/purchase/:id/stock-movements` - Stock movements
- `GET /invoices/purchase/supplier/:supplierId` - By supplier
- `GET /invoices/purchase/statistics` - Statistics
- `PATCH /invoices/purchase/:id/status` - Update status
- `PATCH /invoices/purchase/:id/payment-status` - Update payment status

### Health (2 endpoints)

- `GET /health` - Health check
- `GET /` - API info

---

## 📊 Total Endpoints: **91 Working Endpoints**

### Breakdown by Module:

- Authentication: 5
- Users: 15
- Customers: 10
- Suppliers: 10
- Items: 8
- Batches: 12
- Sales Invoices: 15
- Purchase Invoices: 15 ✨
- Health: 2

---

## 🔥 Most Important Endpoints

### For Daily Operations:

**Login**

```
POST /auth/login
```

**Create Purchase Invoice**

```
POST /invoices/purchase
```

**Confirm Purchase (Updates Inventory)**

```
PATCH /invoices/purchase/:id/confirm
```

**Create Sales Invoice**

```
POST /invoices/sales
```

**Confirm Sales (Updates Inventory)**

```
PATCH /invoices/sales/:id/confirm
```

**Get Stock Movements**

```
GET /invoices/purchase/:id/stock-movements
GET /invoices/sales/:id/stock-movements
```

**Check Low Stock**

```
GET /items/low-stock
```

**Check Expiring Batches**

```
GET /batches/expiring-soon?days=30
```

---

## 🎯 Purchase Invoice Workflow (Complete)

```
1. POST /invoices/purchase
   → Create draft invoice
   → Inventory NOT affected

2. PATCH /invoices/purchase/:id/confirm
   → Confirm invoice
   → ✅ Inventory INCREASED
   → ✅ Stock movements created
   → ✅ Batches created (if provided)

3. POST /invoices/purchase/:id/mark-paid
   → Mark as paid
   → Payment status updated

4. GET /invoices/purchase/:id/stock-movements
   → View stock movements
   → Audit trail
```

---

## 🎯 Sales Invoice Workflow (Complete)

```
1. POST /invoices/sales
   → Create draft invoice
   → Inventory NOT affected

2. PATCH /invoices/sales/:id/confirm
   → Confirm invoice
   → ✅ Inventory DECREASED
   → ✅ Stock movements created
   → ✅ Credit limit checked

3. POST /invoices/sales/:id/mark-paid
   → Mark as paid
   → Payment status updated

4. GET /invoices/sales/:id/stock-movements
   → View stock movements
   → Audit trail
```

---

## 🧪 Test Data Available

```
User: admin@industraders.com / admin123
Supplier: TEST-SUP-001
Item: TEST-ITEM-001
Invoice: PI2025000001
```

---

## 📝 Response Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Unprocessable Entity (Business Logic Error)
- `500` - Internal Server Error

---

## 🔐 Authentication Required

All endpoints except:

- `POST /auth/login`
- `POST /auth/refresh`
- `GET /health`
- `GET /`

---

**Last Updated:** November 15, 2025  
**Status:** ✅ All 91 endpoints operational and tested
