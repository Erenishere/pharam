# Role-Based Access Control (RBAC) Implementation Guide

## Overview

This guide explains how to implement role-based access control so that:
- **Admin users**: Have access to all modules
- **Salesman users**: Only have access to salesman-related features

## Current Setup

### User Roles Defined

The system already has these roles defined in `User.js`:
- `admin` - Full access to all features
- `sales` - Sales-related access
- `purchase` - Purchase-related access
- `inventory` - Inventory management
- `accountant` - Accounting features
- `data_entry` - Data entry operations

### Authentication Middleware

Located in `src/middleware/auth.js`:
- `authenticate` - Validates JWT token
- `authorize(roles)` - Checks if user has required role
- `requireAdmin` - Admin-only access
- `requireSales` - Admin or sales role
- `requirePurchase` - Admin or purchase role

---

## Backend Implementation

### 1. Login Flow

**Endpoint**: `POST /api/auth/login`

**Request**:
```json
{
  "email": "salesman@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "user_id",
      "username": "john_salesman",
      "email": "salesman@example.com",
      "role": "sales",
      "isActive": true
    }
  }
}
```

### 2. Protected Routes for Salesman Module

#### Salesman-Specific Endpoints

```javascript
// src/routes/salesmanRoutes.js
const { authenticate, requireSales } = require('../middleware/auth');

// Salesmen can view their own data
router.get('/me', authenticate, requireSales, salesmanController.getMyProfile);

// Salesmen can view their invoices
router.get('/my-invoices', authenticate, requireSales, salesmanController.getMyInvoices);

// Salesmen can view their commission
router.get('/my-commission', authenticate, requireSales, salesmanController.getMyCommission);

// Salesmen can view their performance
router.get('/my-performance', authenticate, requireSales, salesmanController.getMyPerformance);

// Admin-only: Manage all salesmen
router.get('/', authenticate, requireAdmin, salesmanController.getAllSalesmen);
router.post('/', authenticate, requireAdmin, salesmanController.createSalesman);
router.put('/:id', authenticate, requireAdmin, salesmanController.updateSalesman);
router.delete('/:id', authenticate, requireAdmin, salesmanController.deleteSalesman);
```

### 3. Create Salesman Controller Methods

```javascript
// src/controllers/salesmanController.js

/**
 * Get logged-in salesman's profile
 */
const getMyProfile = async (req, res, next) => {
  try {
    // Find salesman linked to this user
    const salesman = await Salesman.findOne({ userId: req.user._id });
    
    if (!salesman) {
      return res.status(404).json({
        success: false,
        message: 'Salesman profile not found'
      });
    }

    res.json({
      success: true,
      data: salesman
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get logged-in salesman's invoices
 */
const getMyInvoices = async (req, res, next) => {
  try {
    const salesman = await Salesman.findOne({ userId: req.user._id });
    
    if (!salesman) {
      return res.status(404).json({
        success: false,
        message: 'Salesman profile not found'
      });
    }

    const invoices = await Invoice.find({ salesmanId: salesman._id })
      .populate('customerId', 'name code')
      .sort({ invoiceDate: -1 })
      .limit(100);

    res.json({
      success: true,
      data: invoices
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get logged-in salesman's commission
 */
const getMyCommission = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const salesman = await Salesman.findOne({ userId: req.user._id });
    
    if (!salesman) {
      return res.status(404).json({
        success: false,
        message: 'Salesman profile not found'
      });
    }

    const commission = await reportService.calculateCommission(
      salesman._id,
      { startDate, endDate }
    );

    res.json({
      success: true,
      data: commission
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyProfile,
  getMyInvoices,
  getMyCommission,
  getMyPerformance,
  // Admin methods
  getAllSalesmen,
  createSalesman,
  updateSalesman,
  deleteSalesman
};
```

### 4. Link User to Salesman

Update `Salesman` model to include `userId`:

```javascript
// src/models/Salesman.js
const salesmanSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: String,
  email: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    unique: true,
    sparse: true // Allow null for salesmen without login
  },
  commissionRate: Number,
  commissionType: {
    type: String,
    enum: ['sales', 'collection', 'both']
  },
  isActive: { type: Boolean, default: true }
});
```

---

## Frontend Implementation

### 1. Login Component

```javascript
// Login.jsx
const handleLogin = async (email, password) => {
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
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
        navigate('/dashboard'); // Full dashboard
      } else if (result.data.user.role === 'sales') {
        navigate('/salesman-dashboard'); // Salesman-only dashboard
      }
    }
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

### 2. Protected Route Component

```javascript
// ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  if (!token || !user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};

export default ProtectedRoute;
```

### 3. App Routes

```javascript
// App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Admin routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/invoices" element={
          <ProtectedRoute allowedRoles={['admin', 'sales']}>
            <Invoices />
          </ProtectedRoute>
        } />
        
        {/* Salesman routes */}
        <Route path="/salesman-dashboard" element={
          <ProtectedRoute allowedRoles={['sales']}>
            <SalesmanDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/my-invoices" element={
          <ProtectedRoute allowedRoles={['sales']}>
            <MyInvoices />
          </ProtectedRoute>
        } />
        
        <Route path="/my-commission" element={
          <ProtectedRoute allowedRoles={['sales']}>
            <MyCommission />
          </ProtectedRoute>
        } />
        
        <Route path="/unauthorized" element={<Unauthorized />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### 4. Conditional Navigation Menu

```javascript
// Navigation.jsx
const Navigation = () => {
  const user = JSON.parse(localStorage.getItem('user'));

  return (
    <nav>
      {user.role === 'admin' && (
        <>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/invoices">All Invoices</Link>
          <Link to="/customers">Customers</Link>
          <Link to="/items">Items</Link>
          <Link to="/salesmen">Salesmen</Link>
          <Link to="/reports">Reports</Link>
          <Link to="/settings">Settings</Link>
        </>
      )}

      {user.role === 'sales' && (
        <>
          <Link to="/salesman-dashboard">My Dashboard</Link>
          <Link to="/my-invoices">My Invoices</Link>
          <Link to="/my-commission">My Commission</Link>
          <Link to="/my-performance">My Performance</Link>
        </>
      )}
    </nav>
  );
};
```

### 5. Salesman Dashboard Component

```javascript
// SalesmanDashboard.jsx
import { useState, useEffect } from 'react';

const SalesmanDashboard = () => {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, []);

  const fetchProfile = async () => {
    const response = await fetch('http://localhost:5000/api/salesmen/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await response.json();
    if (result.success) {
      setProfile(result.data);
    }
  };

  const fetchStats = async () => {
    const response = await fetch('http://localhost:5000/api/salesmen/my-performance', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await response.json();
    if (result.success) {
      setStats(result.data);
    }
  };

  return (
    <div className="salesman-dashboard">
      <h1>Welcome, {profile?.name}</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Sales</h3>
          <p>${stats?.totalSales || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Commission Earned</h3>
          <p>${stats?.totalCommission || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Invoices This Month</h3>
          <p>{stats?.invoiceCount || 0}</p>
        </div>
      </div>

      <div className="recent-invoices">
        <h2>Recent Invoices</h2>
        {/* Invoice list */}
      </div>
    </div>
  );
};
```

---

## Testing the Implementation

### 1. Create Test Users

```javascript
// Create admin user
POST /api/auth/register
{
  "username": "admin",
  "email": "admin@example.com",
  "password": "admin123",
  "role": "admin"
}

// Create salesman user
POST /api/auth/register
{
  "username": "john_salesman",
  "email": "john@example.com",
  "password": "sales123",
  "role": "sales"
}
```

### 2. Link Salesman to User

```javascript
// Update salesman record to link to user
PUT /api/salesmen/:salesmanId
{
  "userId": "user_id_from_registration"
}
```

### 3. Test Login

```bash
# Login as admin
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Login as salesman
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"sales123"}'
```

### 4. Test Access Control

```bash
# Salesman trying to access admin endpoint (should fail)
curl -X GET http://localhost:5000/api/salesmen \
  -H "Authorization: Bearer <salesman_token>"
# Expected: 403 Forbidden

# Salesman accessing own data (should succeed)
curl -X GET http://localhost:5000/api/salesmen/me \
  -H "Authorization: Bearer <salesman_token>"
# Expected: 200 OK with salesman data

# Admin accessing all salesmen (should succeed)
curl -X GET http://localhost:5000/api/salesmen \
  -H "Authorization: Bearer <admin_token>"
# Expected: 200 OK with all salesmen
```

---

## Summary

**Backend**:
1. ✅ User roles already defined
2. ✅ Authentication middleware ready
3. ✅ Authorization middleware ready
4. ➕ Add `userId` field to Salesman model
5. ➕ Create salesman-specific controller methods
6. ➕ Add salesman-specific routes

**Frontend**:
1. ➕ Implement login with role-based redirect
2. ➕ Create protected route component
3. ➕ Build role-based navigation menu
4. ➕ Create salesman dashboard
5. ➕ Implement salesman-specific views

**The RBAC system is already 70% implemented in the backend. You just need to add the salesman-specific endpoints and build the frontend UI!**
