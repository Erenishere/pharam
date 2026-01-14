# Salesman Functionality - Quick Reference

## What is a Salesman?

A **Salesman** is a sales representative who:
- Sells products to customers
- Earns commission on sales
- Has an assigned route/territory
- Can log in to view their own data

---

## Core Features

### 1. Profile Management
```
Code: SM0001
Name: John Doe
Commission Rate: 2.5%
Route: City Center
Status: Active
```

### 2. Invoice Assignment
Every sales invoice is linked to a salesman:
```
Invoice SI2024000001
Customer: ABC Pharmacy
Salesman: John Doe (SM0001)
Amount: ₹15,000
```

### 3. Commission Calculation
```
Total Sales: ₹500,000
Commission Rate: 2.5%
Commission Earned: ₹12,500
```

### 4. Performance Tracking
```
Invoices Created: 150
Total Sales: ₹500,000
Paid Invoices: 120
Pending Amount: ₹50,000
Average Invoice: ₹3,571
```

---

## What Salesmen Can Do

When logged in, salesmen can:

| Feature | Endpoint | What They See |
|---------|----------|---------------|
| **View Profile** | `GET /api/v1/salesmen/me` | Their code, name, route, commission rate |
| **View Invoices** | `GET /api/v1/salesmen/my-invoices` | All invoices they created |
| **Check Commission** | `GET /api/v1/salesmen/my-commission` | Earnings for any period |
| **See Performance** | `GET /api/v1/salesmen/my-performance` | Sales stats and metrics |

---

## What Admins Can Do

Admins can manage all salesmen:

| Feature | Endpoint | Purpose |
|---------|----------|---------|
| **Create Salesman** | `POST /api/v1/salesmen` | Add new salesman |
| **Update Salesman** | `PUT /api/v1/salesmen/:id` | Change details, commission rate |
| **View All** | `GET /api/v1/salesmen` | List all salesmen |
| **Delete** | `DELETE /api/v1/salesmen/:id` | Remove salesman |
| **Commission Report** | `GET /api/reports/salesman-commission` | Calculate earnings |
| **Performance Report** | `GET /api/reports/salesman-performance` | View sales stats |

---

## Business Workflows

### Creating a Sale
```
1. Create invoice
2. Assign salesman (salesmanId)
3. Salesman sees it in their list
4. Counts toward their commission
```

### Monthly Commission
```
1. Run commission report for month
2. System calculates: Sales × Rate
3. Pay salesman
```

### Salesman Login
```
1. Salesman logs in
2. Sees dashboard with:
   - Total sales
   - Invoices count
   - Commission earned
   - Pending collections
```

---

## Key Benefits

**For Business:**
- Track individual performance
- Calculate accurate commissions
- Manage sales territories
- Identify top performers

**For Salesmen:**
- View their own data
- Track earnings
- Monitor performance
- Access anytime

---

## Example Dashboard

```
╔════════════════════════════════════════╗
║  Welcome, John Doe (SM0001)            ║
║  Route: City Center                    ║
╠════════════════════════════════════════╣
║  This Month (January 2024)             ║
║  ─────────────────────────────────     ║
║  Total Sales:        ₹150,000          ║
║  Invoices:           45                ║
║  Pending:            ₹20,000           ║
║  Commission:         ₹3,750            ║
╠════════════════════════════════════════╣
║  Recent Invoices                       ║
║  SI2024000045  ABC Pharmacy  ₹5,000    ║
║  SI2024000044  XYZ Medical   ₹3,500    ║
║  SI2024000043  City Clinic   ₹7,200    ║
╚════════════════════════════════════════╝
```

---

## Summary

**Salesman functionality = Sales Force Automation**

It tracks:
- Who sold what
- How much they earned
- Their performance metrics
- Customer coverage

**Status**: ✅ Fully Implemented
**Endpoints**: 12+ available
**Reports**: 3+ salesman-specific
