# Salesman Login Flow - Complete Guide

## What Happens When a Salesman Logs In

### Step 1: Login Request

```javascript
POST /api/auth/login
{
  "email": "salesman@example.com",
  "password": "password123"
}
```

### Step 2: Backend Response

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "673d8a1b2c3d4e5f6a7b8c9d",
      "username": "john_salesman",
      "email": "salesman@example.com",
      "role": "sales",  // ← Important: This determines access
      "isActive": true
    }
  }
}
```

### Step 3: Frontend Redirect Based on Role

```javascript
// Frontend login handler
const handleLogin = async (email, password) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const result = await response.json();
  
  if (result.success) {
    // Store token and user info
    localStorage.setItem('token', result.data.token);
    localStorage.setItem('user', JSON.stringify(result.data.user));

    // Redirect based on role
    if (result.data.user.role === 'admin') {
      navigate('/dashboard'); // Full admin dashboard
    } else if (result.data.user.role === 'sales') {
      navigate('/salesman-dashboard'); // Salesman-only dashboard
    }
  }
};
```

---

## Available Endpoints for Salesmen

### ✅ Salesman Self-Service Endpoints (NOW IMPLEMENTED)

All these endpoints require:
- Authentication (Bearer token)
- Role: `sales` or `admin`

#### 1. Get My Profile
```http
GET /api/v1/salesmen/me
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "salesman_id",
    "code": "SM0001",
    "name": "John Doe",
    "phone": "1234567890",
    "email": "john@example.com",
    "userId": "user_id",
    "commissionRate": 2.5,
    "routeId": {
      "code": "RT001",
      "name": "City Route"
    },
    "isActive": true
  },
  "message": "Profile retrieved successfully"
}
```

#### 2. Get My Invoices
```http
GET /api/v1/salesmen/my-invoices?page=1&limit=20&status=confirmed
Authorization: Bearer <token>
```

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by status (draft, confirmed, cancelled)
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter to date

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "invoice_id",
      "invoiceNumber": "SI2024000001",
      "invoiceDate": "2024-01-15",
      "customerId": {
        "name": "Customer Name",
        "code": "CUST001",
        "phone": "1234567890"
      },
      "totals": {
        "grandTotal": 15000
      },
      "status": "confirmed",
      "paymentStatus": "pending"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 100,
    "itemsPerPage": 20
  },
  "message": "Invoices retrieved successfully"
}
```

#### 3. Get My Commission
```http
GET /api/v1/salesmen/my-commission?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

**Query Parameters** (both required):
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)

**Response**:
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
    "totalSales": 500000,
    "commissionRate": 2.5,
    "totalCommission": 12500,
    "invoices": [...]
  },
  "message": "Commission calculated successfully"
}
```

#### 4. Get My Performance
```http
GET /api/v1/salesmen/my-performance?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "salesmanName": "John Doe",
    "salesmanCode": "SM0001",
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    },
    "stats": {
      "totalInvoices": 150,
      "confirmedInvoices": 140,
      "totalSales": 500000,
      "paidInvoices": 120,
      "pendingAmount": 50000,
      "averageInvoiceValue": 3571.43
    }
  },
  "message": "Performance stats retrieved successfully"
}
```

---

## Frontend Implementation

### Salesman Dashboard Component

```javascript
// SalesmanDashboard.jsx
import { useState, useEffect } from 'react';

const SalesmanDashboard = () => {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchProfile();
    fetchPerformance();
    fetchRecentInvoices();
  }, []);

  const fetchProfile = async () => {
    const response = await fetch('http://localhost:5000/api/v1/salesmen/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await response.json();
    if (result.success) {
      setProfile(result.data);
    }
  };

  const fetchPerformance = async () => {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    const response = await fetch(
      `http://localhost:5000/api/v1/salesmen/my-performance?startDate=${startDate}&endDate=${endDate}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const result = await response.json();
    if (result.success) {
      setStats(result.data.stats);
    }
  };

  const fetchRecentInvoices = async () => {
    const response = await fetch(
      'http://localhost:5000/api/v1/salesmen/my-invoices?page=1&limit=10',
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const result = await response.json();
    if (result.success) {
      setInvoices(result.data);
    }
  };

  return (
    <div className="salesman-dashboard">
      <h1>Welcome, {profile?.name}</h1>
      <p>Code: {profile?.code} | Route: {profile?.routeId?.name}</p>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Sales (30 days)</h3>
          <p className="amount">₹{stats?.totalSales?.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h3>Total Invoices</h3>
          <p className="count">{stats?.totalInvoices}</p>
        </div>
        <div className="stat-card">
          <h3>Pending Amount</h3>
          <p className="amount">₹{stats?.pendingAmount?.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h3>Average Invoice</h3>
          <p className="amount">₹{stats?.averageInvoiceValue?.toFixed(2)}</p>
        </div>
      </div>

      <div className="recent-invoices">
        <h2>Recent Invoices</h2>
        <table>
          <thead>
            <tr>
              <th>Invoice No</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(invoice => (
              <tr key={invoice._id}>
                <td>{invoice.invoiceNumber}</td>
                <td>{new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                <td>{invoice.customerId.name}</td>
                <td>₹{invoice.totals.grandTotal.toLocaleString()}</td>
                <td>{invoice.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesmanDashboard;
```

---

## Setup Instructions

### 1. Link Salesman to User Account

Before a salesman can log in, you need to:

```bash
# Step 1: Create user account for salesman
POST /api/auth/register
{
  "username": "john_salesman",
  "email": "john@example.com",
  "password": "sales123",
  "role": "sales"
}

# Response: { "data": { "user": { "_id": "user_id_here" } } }

# Step 2: Update salesman record to link to user
PUT /api/v1/salesmen/:salesmanId
{
  "userId": "user_id_here"
}
```

### 2. Test the Flow

```bash
# 1. Login as salesman
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "sales123"
}

# 2. Use returned token to access salesman endpoints
GET /api/v1/salesmen/me
Headers: Authorization: Bearer <token_from_login>

# 3. Get invoices
GET /api/v1/salesmen/my-invoices?page=1&limit=20
Headers: Authorization: Bearer <token>

# 4. Get commission
GET /api/v1/salesmen/my-commission?startDate=2024-01-01&endDate=2024-01-31
Headers: Authorization: Bearer <token>
```

---

## Summary

**When a salesman logs in, they now have access to:**

✅ **Their Profile** - View their salesman details
✅ **Their Invoices** - See all invoices assigned to them
✅ **Their Commission** - Calculate earnings for any period
✅ **Their Performance** - View sales statistics

**They CANNOT access:**
❌ Other salesmen's data
❌ Admin functions (create/delete salesmen)
❌ Full customer/supplier lists
❌ System settings

**The backend automatically enforces these restrictions through:**
- JWT token validation
- Role-based authorization (`requireSales` middleware)
- User ID matching (only shows data for logged-in salesman)

**Files Created:**
1. `src/controllers/salesmanSelfServiceController.js` - Controller methods
2. `src/routes/salesmanSelfServiceRoutes.js` - Route definitions (merged into salesmanRoutes.js)
3. Updated `src/routes/salesmanRoutes.js` - Added self-service routes

**Status**: ✅ **READY TO USE**
