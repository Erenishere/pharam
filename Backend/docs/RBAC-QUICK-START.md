# RBAC Quick Start Guide

## What You Have Now

✅ **Backend RBAC System (70% Complete)**
- User roles defined (admin, sales, purchase, etc.)
- Authentication middleware ready
- Authorization middleware ready
- Salesman model updated with `userId` field

## What You Need to Do

### Backend (30 minutes)

1. **Create Salesman-Specific Controller Methods**

Add these methods to `src/controllers/salesmanController.js`:

```javascript
// Get logged-in salesman's profile
const getMyProfile = async (req, res, next) => {
  try {
    const salesman = await Salesman.findOne({ userId: req.user._id });
    if (!salesman) {
      return res.status(404).json({
        success: false,
        message: 'Salesman profile not found'
      });
    }
    res.json({ success: true, data: salesman });
  } catch (error) {
    next(error);
  }
};

// Get logged-in salesman's invoices
const getMyInvoices = async (req, res, next) => {
  try {
    const salesman = await Salesman.findOne({ userId: req.user._id });
    if (!salesman) {
      return res.status(404).json({ success: false, message: 'Salesman profile not found' });
    }

    const invoices = await Invoice.find({ salesmanId: salesman._id })
      .populate('customerId', 'name code')
      .sort({ invoiceDate: -1 })
      .limit(100);

    res.json({ success: true, data: invoices });
  } catch (error) {
    next(error);
  }
};
```

2. **Add Salesman Routes**

Add to `src/routes/salesmanRoutes.js`:

```javascript
const { authenticate, requireSales, requireAdmin } = require('../middleware/auth');

// Salesman-specific routes
router.get('/me', authenticate, requireSales, salesmanController.getMyProfile);
router.get('/my-invoices', authenticate, requireSales, salesmanController.getMyInvoices);
router.get('/my-commission', authenticate, requireSales, salesmanController.getMyCommission);

// Admin routes (existing)
router.get('/', authenticate, requireAdmin, salesmanController.getAllSalesmen);
router.post('/', authenticate, requireAdmin, salesmanController.createSalesman);
```

### Frontend (1-2 hours)

1. **Update Login to Handle Roles**

```javascript
const handleLogin = async (email, password) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const result = await response.json();
  
  if (result.success) {
    localStorage.setItem('token', result.data.token);
    localStorage.setItem('user', JSON.stringify(result.data.user));

    // Redirect based on role
    if (result.data.user.role === 'admin') {
      navigate('/dashboard');
    } else if (result.data.user.role === 'sales') {
      navigate('/salesman-dashboard');
    }
  }
};
```

2. **Create Role-Based Navigation**

```javascript
const Navigation = () => {
  const user = JSON.parse(localStorage.getItem('user'));

  return (
    <nav>
      {user.role === 'admin' ? (
        <>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/invoices">Invoices</Link>
          <Link to="/customers">Customers</Link>
          <Link to="/salesmen">Salesmen</Link>
        </>
      ) : (
        <>
          <Link to="/salesman-dashboard">My Dashboard</Link>
          <Link to="/my-invoices">My Invoices</Link>
          <Link to="/my-commission">My Commission</Link>
        </>
      )}
    </nav>
  );
};
```

## Testing

### 1. Create Test Users

```bash
# Create admin
POST /api/auth/register
{
  "username": "admin",
  "email": "admin@test.com",
  "password": "admin123",
  "role": "admin"
}

# Create salesman user
POST /api/auth/register
{
  "username": "john_sales",
  "email": "john@test.com",
  "password": "sales123",
  "role": "sales"
}
```

### 2. Link Salesman to User

```bash
# Update salesman record
PUT /api/salesmen/:salesmanId
{
  "userId": "<user_id_from_registration>"
}
```

### 3. Test Login

```bash
# Login as salesman
POST /api/auth/login
{
  "email": "john@test.com",
  "password": "sales123"
}

# Use returned token to access salesman endpoints
GET /api/salesmen/me
Headers: Authorization: Bearer <token>
```

## Summary

**What's Done:**
- ✅ User model with roles
- ✅ Authentication middleware
- ✅ Authorization middleware  
- ✅ Salesman model with userId

**What You Need:**
- ➕ Add 3 controller methods (15 min)
- ➕ Add 3 routes (5 min)
- ➕ Update frontend login (30 min)
- ➕ Create role-based navigation (30 min)

**Total Time: ~1.5 hours to complete RBAC system!**

See `RBAC-IMPLEMENTATION-GUIDE.md` for full details.
