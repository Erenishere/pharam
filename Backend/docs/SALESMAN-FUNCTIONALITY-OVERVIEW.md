# Salesman Functionality - Complete Overview

## What is a Salesman in the System?

A **Salesman** is a user who sells products to customers and earns commission on sales. The system tracks their performance, calculates commissions, and manages their assigned routes and customers.

---

## Core Salesman Features

### 1. Salesman Profile Management

**Fields Tracked:**
- **Code**: Unique identifier (e.g., SM0001)
- **Name**: Salesman's full name
- **Contact**: Phone and email
- **Commission Rate**: Percentage earned on sales (e.g., 2.5%)
- **Route Assignment**: Geographic area they cover
- **User Account**: Link to login credentials (for self-service access)
- **Status**: Active/Inactive

**Example:**
```json
{
  "code": "SM0001",
  "name": "John Doe",
  "phone": "1234567890",
  "email": "john@example.com",
  "commissionRate": 2.5,
  "routeId": "route_id",
  "userId": "user_id",
  "isActive": true
}
```

---

### 2. Invoice Assignment

**How it Works:**
- When creating a sales invoice, you assign a salesman
- The invoice is linked to that salesman's ID
- This tracks who made the sale

**Example Invoice:**
```json
{
  "invoiceNumber": "SI2024000001",
  "customerId": "customer_id",
  "salesmanId": "salesman_id",  // ← Links to salesman
  "items": [...],
  "totals": { "grandTotal": 15000 },
  "status": "confirmed"
}
```

**Benefits:**
- Track which salesman made which sales
- Calculate individual performance
- Determine commission earnings

---

### 3. Commission Calculation

**Two Types:**

#### A. Sales-Based Commission
- Commission calculated on total sales amount
- Formula: `Total Sales × Commission Rate`

**Example:**
```
Total Sales: ₹500,000
Commission Rate: 2.5%
Commission Earned: ₹12,500
```

#### B. Collection-Based Commission
- Commission calculated on payments collected
- Formula: `Total Collections × Commission Rate`

**Example:**
```
Total Collections: ₹400,000
Commission Rate: 2%
Commission Earned: ₹8,000
```

**API Endpoint:**
```http
GET /api/reports/salesman-commission?salesmanId=xxx&startDate=2024-01-01&endDate=2024-01-31
```

---

### 4. Route Management

**What is a Route?**
- A geographic area assigned to a salesman
- Contains multiple customers
- Helps organize sales territories

**Example Route:**
```json
{
  "code": "RT001",
  "name": "City Center Route",
  "description": "Downtown and central business district",
  "salesmanId": "salesman_id"
}
```

**Benefits:**
- Organize customers by location
- Assign territories to salesmen
- Track route-wise performance

---

### 5. Performance Tracking

**Metrics Tracked:**

1. **Sales Volume**
   - Total number of invoices
   - Total sales amount
   - Average invoice value

2. **Collection Efficiency**
   - Paid invoices vs total invoices
   - Pending payment amount
   - Collection rate percentage

3. **Customer Coverage**
   - Number of customers served
   - New customers acquired
   - Repeat customer rate

**Performance Report Example:**
```json
{
  "salesmanName": "John Doe",
  "period": "January 2024",
  "stats": {
    "totalInvoices": 150,
    "confirmedInvoices": 140,
    "totalSales": 500000,
    "paidInvoices": 120,
    "pendingAmount": 50000,
    "averageInvoiceValue": 3571.43,
    "commission": 12500
  }
}
```

---

## Salesman Self-Service Features

When a salesman logs in with their credentials:

### 1. View Own Profile
```http
GET /api/v1/salesmen/me
```
- See their code, name, contact info
- View assigned route
- Check commission rate

### 2. View Own Invoices
```http
GET /api/v1/salesmen/my-invoices?page=1&limit=20
```
- See all invoices they created
- Filter by date, status, customer
- Paginated list with details

### 3. Calculate Own Commission
```http
GET /api/v1/salesmen/my-commission?startDate=2024-01-01&endDate=2024-01-31
```
- Calculate earnings for any period
- See breakdown by invoice
- View total commission

### 4. View Own Performance
```http
GET /api/v1/salesmen/my-performance?startDate=2024-01-01&endDate=2024-01-31
```
- See sales statistics
- Track pending collections
- Monitor performance metrics

---

## Admin Functions for Salesmen

Admins can manage all salesmen:

### 1. Create Salesman
```http
POST /api/v1/salesmen
{
  "code": "SM0002",
  "name": "Jane Smith",
  "phone": "9876543210",
  "email": "jane@example.com",
  "commissionRate": 3.0,
  "routeId": "route_id"
}
```

### 2. Update Salesman
```http
PUT /api/v1/salesmen/:id
{
  "commissionRate": 3.5,
  "routeId": "new_route_id"
}
```

### 3. View All Salesmen
```http
GET /api/v1/salesmen
```

### 4. View Salesman by ID
```http
GET /api/v1/salesmen/:id
```

### 5. Delete Salesman
```http
DELETE /api/v1/salesmen/:id
```

---

## Reporting Features

### 1. Salesman Performance Report
```http
GET /api/reports/salesman-performance?salesmanId=xxx&startDate=xxx&endDate=xxx
```

**Shows:**
- Total sales
- Number of invoices
- Collection efficiency
- Commission earned
- Customer coverage

### 2. Salesman Commission Report
```http
GET /api/reports/salesman-commission?salesmanId=xxx&startDate=xxx&endDate=xxx
```

**Shows:**
- Detailed commission breakdown
- Invoice-wise commission
- Total earnings
- Payment status

### 3. Route-Wise Sales Report
```http
GET /api/reports/route-sales?routeId=xxx&startDate=xxx&endDate=xxx
```

**Shows:**
- Sales by route
- Salesman performance on route
- Customer coverage
- Pending collections

---

## Business Workflows

### Workflow 1: New Salesman Onboarding

1. **Admin creates salesman record**
   ```
   POST /api/v1/salesmen
   ```

2. **Admin creates user account for salesman**
   ```
   POST /api/auth/register
   { "role": "sales" }
   ```

3. **Admin links user to salesman**
   ```
   PUT /api/v1/salesmen/:id
   { "userId": "user_id" }
   ```

4. **Salesman can now log in and access their data**

### Workflow 2: Creating Sales Invoice

1. **Salesman (or admin) creates invoice**
   ```
   POST /api/invoices/sales
   {
     "customerId": "customer_id",
     "salesmanId": "salesman_id",  // ← Assign salesman
     "items": [...]
   }
   ```

2. **Invoice is linked to salesman**
3. **Salesman can view it in their invoice list**
4. **Counts toward their performance metrics**

### Workflow 3: Commission Calculation

1. **At month end, admin runs commission report**
   ```
   GET /api/reports/salesman-commission?salesmanId=xxx&startDate=2024-01-01&endDate=2024-01-31
   ```

2. **System calculates:**
   - Total sales for the period
   - Applies commission rate
   - Shows breakdown by invoice

3. **Admin reviews and processes payment**

---

## Key Benefits

### For Business Owners
✅ Track individual salesman performance
✅ Calculate accurate commissions
✅ Monitor sales territories
✅ Identify top performers
✅ Manage sales team efficiently

### For Salesmen
✅ View their own sales data
✅ Track their earnings
✅ Monitor their performance
✅ Access data anytime via login
✅ See pending collections

### For Customers
✅ Consistent point of contact
✅ Personalized service
✅ Route-based coverage

---

## Example Use Cases

### Use Case 1: Monthly Commission Payment
```
1. Admin logs in
2. Goes to Reports → Salesman Commission
3. Selects salesman and date range (e.g., January 2024)
4. System shows: Total Sales: ₹500,000, Commission: ₹12,500
5. Admin processes payment
```

### Use Case 2: Salesman Checking Performance
```
1. Salesman logs in with their credentials
2. Dashboard shows:
   - Total sales this month: ₹150,000
   - Invoices created: 45
   - Pending collections: ₹20,000
   - Estimated commission: ₹3,750
3. Salesman can drill down to see individual invoices
```

### Use Case 3: Route Assignment
```
1. Admin creates route "North Zone"
2. Assigns customers in north area to this route
3. Assigns salesman "John" to this route
4. John now handles all north zone customers
5. Reports can show north zone performance
```

---

## Database Schema

### Salesman Model
```javascript
{
  code: String (unique),
  name: String,
  phone: String,
  email: String,
  userId: ObjectId (ref: User),
  commissionRate: Number,
  routeId: ObjectId (ref: Route),
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Invoice Model (Salesman Fields)
```javascript
{
  invoiceNumber: String,
  salesmanId: ObjectId (ref: Salesman),  // ← Links to salesman
  customerId: ObjectId,
  items: [...],
  totals: {...},
  status: String,
  paymentStatus: String
}
```

---

## Summary

**Salesman functionality enables:**

1. **Sales Team Management** - Create, update, manage salesmen
2. **Performance Tracking** - Monitor individual and team performance
3. **Commission Calculation** - Automatic calculation based on sales/collections
4. **Route Management** - Organize territories and customer coverage
5. **Self-Service Access** - Salesmen can view their own data
6. **Reporting** - Comprehensive reports for analysis

**It's a complete sales force automation system within your pharma management application!**

---

**Status**: ✅ Fully Implemented
**Total Endpoints**: 12+ (admin + self-service)
**Reports**: 3+ salesman-specific reports
**Self-Service**: 4 endpoints for salesmen
