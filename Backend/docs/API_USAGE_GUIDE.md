# API Usage Guide

## Getting Started

This guide provides practical examples and common workflows for using the Indus Traders Backend API.

## Table of Contents

1. [Setup and Authentication](#setup-and-authentication)
2. [Common Workflows](#common-workflows)
3. [Code Examples](#code-examples)
4. [Best Practices](#best-practices)
5. [Troubleshooting](#troubleshooting)

## Setup and Authentication

### 1. Initial Setup

```bash
# Install dependencies (for Node.js client)
npm install axios

# Or for Python
pip install requests
```

### 2. Authentication Flow

```javascript
// JavaScript Example
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api/v1';

// Login and get token
async function login(email, password) {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password
    });
    
    const { token, user } = response.data.data;
    
    // Store token securely
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    return { token, user };
  } catch (error) {
    console.error('Login failed:', error.response.data);
    throw error;
  }
}

// Create authenticated API client
function createAPIClient(token) {
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
}

// Usage
const { token } = await login('admin@example.com', 'password123');
const api = createAPIClient(token);
```

## Common Workflows

### Workflow 1: Complete Sales Process

```javascript
/**
 * Complete sales workflow from customer creation to payment
 */

async function completeSalesWorkflow() {
  const api = createAPIClient(token);
  
  // Step 1: Create or get customer
  const customer = await api.post('/customers', {
    code: 'CUST000001',
    name: 'ABC Corporation',
    type: 'customer',
    contactInfo: {
      phone: '+92-300-1234567',
      email: 'contact@abc.com',
      city: 'Karachi'
    },
    financialInfo: {
      creditLimit: 100000,
      paymentTerms: 30,
      currency: 'PKR'
    }
  });
  
  console.log('Customer created:', customer.data.data._id);
  
  // Step 2: Check item availability
  const items = await api.get('/items', {
    params: { category: 'Electronics', isActive: true }
  });
  
  const availableItem = items.data.data.find(item => 
    item.inventory.currentStock >= 10
  );
  
  if (!availableItem) {
    throw new Error('No items available in stock');
  }
  
  // Step 3: Create sales invoice
  const invoice = await api.post('/invoices/sales', {
    customerId: customer.data.data._id,
    invoiceDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      {
        itemId: availableItem._id,
        quantity: 10,
        unitPrice: availableItem.pricing.salePrice,
        discount: 5,
        taxAmount: (availableItem.pricing.salePrice * 10 * 0.17)
      }
    ],
    notes: 'First order from customer'
  });
  
  console.log('Invoice created:', invoice.data.data.invoiceNumber);
  
  // Step 4: Confirm invoice (updates inventory and creates ledger entries)
  const confirmed = await api.post(
    `/invoices/sales/${invoice.data.data._id}/confirm`
  );
  
  console.log('Invoice confirmed, inventory updated');
  
  // Step 5: Record cash receipt
  const receipt = await api.post('/cashbook/receipts', {
    customerId: customer.data.data._id,
    amount: invoice.data.data.totals.grandTotal,
    paymentMethod: 'cash',
    description: `Payment for invoice ${invoice.data.data.invoiceNumber}`,
    receiptDate: new Date().toISOString()
  });
  
  console.log('Payment recorded:', receipt.data.data.receiptNumber);
  
  // Step 6: Mark invoice as paid
  await api.put(`/invoices/sales/${invoice.data.data._id}`, {
    paymentStatus: 'paid',
    status: 'paid'
  });
  
  console.log('Invoice marked as paid');
  
  // Step 7: Get updated account statement
  const statement = await api.get(
    `/accounts/statement/${customer.data.data._id}`,
    {
      params: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      }
    }
  );
  
  console.log('Account balance:', statement.data.data.closingBalance);
  
  return {
    customer: customer.data.data,
    invoice: invoice.data.data,
    receipt: receipt.data.data,
    statement: statement.data.data
  };
}
```

### Workflow 2: Purchase and Inventory Management

```javascript
/**
 * Purchase workflow with inventory replenishment
 */

async function purchaseWorkflow() {
  const api = createAPIClient(token);
  
  // Step 1: Check low stock items
  const lowStockItems = await api.get('/items/low-stock');
  
  console.log(`Found ${lowStockItems.data.data.length} low stock items`);
  
  if (lowStockItems.data.data.length === 0) {
    console.log('No items need reordering');
    return;
  }
  
  // Step 2: Get or create supplier
  const suppliers = await api.get('/suppliers', {
    params: { type: 'supplier', isActive: true }
  });
  
  const supplier = suppliers.data.data[0];
  
  // Step 3: Create purchase invoice
  const purchaseItems = lowStockItems.data.data.map(item => ({
    itemId: item._id,
    quantity: item.inventory.maximumStock - item.inventory.currentStock,
    unitPrice: item.pricing.costPrice,
    discount: 0,
    taxAmount: (item.pricing.costPrice * 
      (item.inventory.maximumStock - item.inventory.currentStock) * 0.17),
    batchInfo: {
      batchNumber: `BATCH${Date.now()}`,
      manufacturingDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    }
  }));
  
  const purchaseInvoice = await api.post('/invoices/purchase', {
    supplierId: supplier._id,
    invoiceDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    items: purchaseItems,
    notes: 'Inventory replenishment order'
  });
  
  console.log('Purchase invoice created:', purchaseInvoice.data.data.invoiceNumber);
  
  // Step 4: Confirm purchase (updates inventory)
  await api.post(
    `/invoices/purchase/${purchaseInvoice.data.data._id}/confirm`
  );
  
  console.log('Purchase confirmed, inventory updated');
  
  // Step 5: Verify inventory levels
  for (const item of lowStockItems.data.data) {
    const updated = await api.get(`/items/${item._id}`);
    console.log(
      `${item.name}: ${item.inventory.currentStock} → ${updated.data.data.inventory.currentStock}`
    );
  }
  
  return purchaseInvoice.data.data;
}
```

### Workflow 3: Monthly Reporting

```javascript
/**
 * Generate comprehensive monthly reports
 */

async function generateMonthlyReports(year, month) {
  const api = createAPIClient(token);
  
  // Calculate date range
  const startDate = new Date(year, month - 1, 1).toISOString();
  const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();
  
  console.log(`Generating reports for ${year}-${month}`);
  
  // 1. Sales Report
  const salesReport = await api.get('/reports/sales', {
    params: {
      startDate,
      endDate,
      groupBy: 'customer'
    }
  });
  
  console.log('Sales Summary:');
  console.log(`Total Sales: PKR ${salesReport.data.data.summary.totalSales}`);
  console.log(`Total Invoices: ${salesReport.data.data.summary.invoiceCount}`);
  console.log(`Top Customer: ${salesReport.data.data.topCustomers[0]?.name}`);
  
  // 2. Purchase Report
  const purchaseReport = await api.get('/reports/purchases', {
    params: {
      startDate,
      endDate,
      groupBy: 'supplier'
    }
  });
  
  console.log('\nPurchase Summary:');
  console.log(`Total Purchases: PKR ${purchaseReport.data.data.summary.totalPurchases}`);
  console.log(`Total Invoices: ${purchaseReport.data.data.summary.invoiceCount}`);
  
  // 3. Inventory Report
  const inventoryReport = await api.get('/reports/inventory');
  
  console.log('\nInventory Summary:');
  console.log(`Total Items: ${inventoryReport.data.data.summary.totalItems}`);
  console.log(`Total Value: PKR ${inventoryReport.data.data.summary.totalValue}`);
  console.log(`Low Stock Items: ${inventoryReport.data.data.summary.lowStockCount}`);
  
  // 4. Financial Report (Profit & Loss)
  const financialReport = await api.get('/reports/financial', {
    params: {
      type: 'profit_loss',
      startDate,
      endDate
    }
  });
  
  console.log('\nFinancial Summary:');
  console.log(`Revenue: PKR ${financialReport.data.data.revenue}`);
  console.log(`Expenses: PKR ${financialReport.data.data.expenses}`);
  console.log(`Net Profit: PKR ${financialReport.data.data.netProfit}`);
  
  // 5. Tax Report
  const taxReport = await api.get('/reports/tax', {
    params: {
      startDate,
      endDate,
      taxType: 'GST'
    }
  });
  
  console.log('\nTax Summary:');
  console.log(`GST Collected: PKR ${taxReport.data.data.gstCollected}`);
  console.log(`GST Paid: PKR ${taxReport.data.data.gstPaid}`);
  console.log(`Net GST: PKR ${taxReport.data.data.netGst}`);
  
  // 6. Export reports to PDF
  const pdfExport = await api.get('/reports/export', {
    params: {
      reportType: 'sales',
      format: 'pdf',
      startDate,
      endDate
    },
    responseType: 'blob'
  });
  
  // Save PDF file
  const fs = require('fs');
  fs.writeFileSync(
    `sales-report-${year}-${month}.pdf`,
    pdfExport.data
  );
  
  console.log('\nReports exported to PDF');
  
  return {
    sales: salesReport.data.data,
    purchases: purchaseReport.data.data,
    inventory: inventoryReport.data.data,
    financial: financialReport.data.data,
    tax: taxReport.data.data
  };
}
```

### Workflow 4: Account Reconciliation

```javascript
/**
 * Reconcile customer accounts and identify discrepancies
 */

async function reconcileCustomerAccounts() {
  const api = createAPIClient(token);
  
  // Get all active customers
  const customers = await api.get('/customers', {
    params: { type: 'customer', isActive: true }
  });
  
  const reconciliationResults = [];
  
  for (const customer of customers.data.data) {
    // Get account balance
    const balance = await api.get(`/accounts/balance/${customer._id}`);
    
    // Get receivables
    const receivables = await api.get('/accounts/receivables', {
      params: { customerId: customer._id }
    });
    
    // Get all invoices
    const invoices = await api.get('/invoices/sales', {
      params: {
        customerId: customer._id,
        status: 'confirmed'
      }
    });
    
    // Get all receipts
    const receipts = await api.get('/cashbook/receipts', {
      params: { customerId: customer._id }
    });
    
    // Calculate expected balance
    const totalInvoiced = invoices.data.data.reduce(
      (sum, inv) => sum + inv.totals.grandTotal, 0
    );
    const totalReceived = receipts.data.data.reduce(
      (sum, rec) => sum + rec.amount, 0
    );
    const expectedBalance = totalInvoiced - totalReceived;
    
    // Check for discrepancies
    const discrepancy = Math.abs(balance.data.data.balance - expectedBalance);
    
    reconciliationResults.push({
      customer: customer.name,
      code: customer.code,
      systemBalance: balance.data.data.balance,
      expectedBalance,
      discrepancy,
      hasDiscrepancy: discrepancy > 0.01, // Allow 1 paisa tolerance
      invoiceCount: invoices.data.data.length,
      receiptCount: receipts.data.data.length
    });
  }
  
  // Print reconciliation report
  console.log('\n=== Account Reconciliation Report ===\n');
  
  const withDiscrepancies = reconciliationResults.filter(r => r.hasDiscrepancy);
  
  if (withDiscrepancies.length === 0) {
    console.log('✓ All accounts reconciled successfully!');
  } else {
    console.log(`⚠ Found ${withDiscrepancies.length} accounts with discrepancies:\n`);
    
    withDiscrepancies.forEach(result => {
      console.log(`Customer: ${result.customer} (${result.code})`);
      console.log(`  System Balance: PKR ${result.systemBalance.toFixed(2)}`);
      console.log(`  Expected Balance: PKR ${result.expectedBalance.toFixed(2)}`);
      console.log(`  Discrepancy: PKR ${result.discrepancy.toFixed(2)}`);
      console.log('');
    });
  }
  
  return reconciliationResults;
}
```

### Workflow 5: Batch Expiry Management

```javascript
/**
 * Monitor and manage batch expiries
 */

async function manageBatchExpiries() {
  const api = createAPIClient(token);
  
  // Get batches expiring soon (within 30 days)
  const expiringSoon = await api.get('/batches/expiring-soon', {
    params: { days: 30 }
  });
  
  console.log(`Found ${expiringSoon.data.data.length} batches expiring soon`);
  
  // Get already expired batches
  const expired = await api.get('/batches/expired');
  
  console.log(`Found ${expired.data.data.length} expired batches`);
  
  // Generate expiry report
  const expiryReport = {
    expiringSoon: expiringSoon.data.data.map(batch => ({
      batchNumber: batch.batchNumber,
      item: batch.item.name,
      expiryDate: batch.expiryDate,
      remainingQuantity: batch.remainingQuantity,
      daysUntilExpiry: Math.ceil(
        (new Date(batch.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
      )
    })),
    expired: expired.data.data.map(batch => ({
      batchNumber: batch.batchNumber,
      item: batch.item.name,
      expiryDate: batch.expiryDate,
      remainingQuantity: batch.remainingQuantity,
      daysExpired: Math.ceil(
        (new Date() - new Date(batch.expiryDate)) / (1000 * 60 * 60 * 24)
      )
    }))
  };
  
  // Print report
  console.log('\n=== Batch Expiry Report ===\n');
  
  if (expiryReport.expiringSoon.length > 0) {
    console.log('Batches Expiring Soon:');
    expiryReport.expiringSoon.forEach(batch => {
      console.log(`  ${batch.item} (${batch.batchNumber})`);
      console.log(`    Expires in: ${batch.daysUntilExpiry} days`);
      console.log(`    Quantity: ${batch.remainingQuantity}`);
    });
    console.log('');
  }
  
  if (expiryReport.expired.length > 0) {
    console.log('Expired Batches (Action Required):');
    expiryReport.expired.forEach(batch => {
      console.log(`  ${batch.item} (${batch.batchNumber})`);
      console.log(`    Expired: ${batch.daysExpired} days ago`);
      console.log(`    Quantity: ${batch.remainingQuantity}`);
    });
  }
  
  return expiryReport;
}
```

## Code Examples

### Error Handling

```javascript
async function safeAPICall(apiFunction) {
  try {
    const result = await apiFunction();
    return { success: true, data: result.data };
  } catch (error) {
    if (error.response) {
      // Server responded with error
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          console.error('Authentication failed. Please login again.');
          // Redirect to login
          break;
        case 403:
          console.error('Access denied. Insufficient permissions.');
          break;
        case 404:
          console.error('Resource not found.');
          break;
        case 422:
          console.error('Validation error:', data.error.details);
          break;
        case 429:
          console.error('Rate limit exceeded. Please try again later.');
          break;
        default:
          console.error('API error:', data.error.message);
      }
      
      return { success: false, error: data.error };
    } else if (error.request) {
      // Request made but no response
      console.error('Network error. Please check your connection.');
      return { success: false, error: { message: 'Network error' } };
    } else {
      // Something else happened
      console.error('Error:', error.message);
      return { success: false, error: { message: error.message } };
    }
  }
}

// Usage
const result = await safeAPICall(() => 
  api.get('/items')
);

if (result.success) {
  console.log('Items:', result.data);
} else {
  console.error('Failed to fetch items:', result.error);
}
```

### Pagination Helper

```javascript
async function fetchAllPages(endpoint, params = {}) {
  const api = createAPIClient(token);
  const allData = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const response = await api.get(endpoint, {
      params: { ...params, page, limit: 100 }
    });
    
    allData.push(...response.data.data);
    
    const { pagination } = response.data;
    hasMore = page < pagination.pages;
    page++;
  }
  
  return allData;
}

// Usage
const allItems = await fetchAllPages('/items', { isActive: true });
console.log(`Fetched ${allItems.length} items`);
```

### Retry Logic

```javascript
async function retryAPICall(apiFunction, maxRetries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiFunction();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      console.log(`Attempt ${attempt} failed. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
}

// Usage
const result = await retryAPICall(() => 
  api.post('/invoices/sales', invoiceData)
);
```

## Best Practices

### 1. Token Management

```javascript
// Store token securely
function storeToken(token) {
  // For web apps, use httpOnly cookies or secure storage
  // For mobile apps, use secure storage (Keychain/Keystore)
  sessionStorage.setItem('authToken', token);
}

// Check token expiration
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

// Refresh token before expiration
async function ensureValidToken() {
  const token = sessionStorage.getItem('authToken');
  
  if (!token || isTokenExpired(token)) {
    // Refresh or re-login
    await refreshToken();
  }
  
  return sessionStorage.getItem('authToken');
}
```

### 2. Request Optimization

```javascript
// Use caching for frequently accessed data
const cache = new Map();

async function getCachedData(key, fetchFunction, ttl = 300000) {
  const cached = cache.get(key);
  
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  
  const data = await fetchFunction();
  cache.set(key, { data, timestamp: Date.now() });
  
  return data;
}

// Usage
const items = await getCachedData('items', () => 
  api.get('/items').then(r => r.data)
);
```

### 3. Batch Operations

```javascript
// Process items in batches to avoid overwhelming the server
async function processBatch(items, batchSize, processor) {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(item => processor(item))
    );
    results.push(...batchResults);
    
    // Small delay between batches
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

// Usage
const invoices = await processBatch(
  invoiceData,
  10,
  data => api.post('/invoices/sales', data)
);
```

## Troubleshooting

### Common Issues

#### 1. Authentication Errors

```
Error: 401 Unauthorized
Solution: Check if token is valid and not expired. Re-login if necessary.
```

#### 2. Validation Errors

```
Error: 422 Validation Error
Solution: Check the error.details array for specific field errors.
```

#### 3. Rate Limiting

```
Error: 429 Too Many Requests
Solution: Implement exponential backoff and respect rate limits.
```

#### 4. Network Timeouts

```
Error: ECONNABORTED
Solution: Increase timeout or check network connectivity.
```

### Debug Mode

```javascript
// Enable debug logging
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Authorization': `Bearer ${token}` }
});

api.interceptors.request.use(request => {
  console.log('Request:', request.method.toUpperCase(), request.url);
  console.log('Data:', request.data);
  return request;
});

api.interceptors.response.use(
  response => {
    console.log('Response:', response.status, response.data);
    return response;
  },
  error => {
    console.error('Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);
```

## Support

For additional help:
- API Documentation: `/docs/API_DOCUMENTATION.md`
- Email: support@industraders.com
- GitHub Issues: https://github.com/industraders/backend/issues
