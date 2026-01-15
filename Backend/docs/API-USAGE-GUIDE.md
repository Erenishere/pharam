# Indus Traders API Usage Guide

## Overview

This guide provides practical examples and common workflows for using the Indus Traders API effectively.

## Table of Contents

1. [Complete Sales Workflow](#complete-sales-workflow)
2. [Complete Purchase Workflow](#complete-purchase-workflow)
3. [Multi-Warehouse Operations](#multi-warehouse-operations)
4. [Cash Book Management](#cash-book-management)
5. [Salesman Commission Tracking](#salesman-commission-tracking)
6. [Print Formats](#print-formats)
7. [Keyboard Shortcuts](#keyboard-shortcuts)

---

## Complete Sales Workflow

### Step 1: Create Sales Invoice

```javascript
const response = await fetch('http://localhost:5000/api/invoices/sales', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    customerId: 'customer_id',
    salesmanId: 'salesman_id',
    warehouseId: 'warehouse_id',
    invoiceDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    items: [
      {
        itemId: 'item_id',
        quantity: 10,
        unitPrice: 150,
        discount: 5,
        warehouseId: 'warehouse_id',
        warrantyMonths: 12
      }
    ],
    notes: 'Urgent delivery required',
    memoNo: 'MEMO-001'
  })
});

const { data: invoice } = await response.json();
console.log('Invoice created:', invoice.invoiceNumber);
```

### Step 2: Confirm Invoice

```javascript
await fetch(`http://localhost:5000/api/invoices/sales/${invoice._id}/confirm`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Step 3: Record Payment

```javascript
await fetch(`http://localhost:5000/api/invoices/sales/${invoice._id}/mark-paid`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    paymentMethod: 'cash',
    paymentDate: new Date()
  })
});
```

### Step 4: Print Invoice

```javascript
const printResponse = await fetch(
  `http://localhost:5000/api/print/invoice/${invoice._id}?format=logo`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const printData = await printResponse.json();
// Use printData to render invoice
```

---

## Complete Purchase Workflow

### Step 1: Create Purchase Order

```javascript
const poResponse = await fetch('http://localhost:5000/api/purchase-orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    supplierId: 'supplier_id',
    orderDate: new Date(),
    expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    items: [
      {
        itemId: 'item_id',
        quantity: 100,
        unitPrice: 95
      }
    ]
  })
});

const { data: purchaseOrder } = await poResponse.json();
```

### Step 2: Convert PO to Purchase Invoice

```javascript
const invoiceResponse = await fetch('http://localhost:5000/api/invoices/purchase', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    type: 'purchase',
    supplierId: 'supplier_id',
    purchaseOrderId: purchaseOrder._id,
    supplierBillNo: 'SUPP-INV-001',
    items: purchaseOrder.items.map(item => ({
      ...item,
      warehouseId: 'warehouse_id'
    })),
    biltyNo: 'BILTY-12345',
    biltyDate: new Date(),
    transportCompany: 'ABC Transport',
    transportCharges: 500,
    dimension: 'Electronics'
  })
});
```

---

## Multi-Warehouse Operations

### Create Invoice with Different Warehouses per Item

```javascript
await fetch('http://localhost:5000/api/invoices/sales', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    customerId: 'customer_id',
    items: [
      {
        itemId: 'item1_id',
        quantity: 10,
        unitPrice: 150,
        warehouseId: 'warehouse1_id'  // From Warehouse 1
      },
      {
        itemId: 'item2_id',
        quantity: 5,
        unitPrice: 200,
        warehouseId: 'warehouse2_id'  // From Warehouse 2
      }
    ]
  })
});
```

### Transfer Stock Between Warehouses

```javascript
await fetch('http://localhost:5000/api/stock-movements/transfer', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    itemId: 'item_id',
    fromWarehouseId: 'warehouse1_id',
    toWarehouseId: 'warehouse2_id',
    quantity: 50,
    transferDate: new Date(),
    notes: 'Stock rebalancing'
  })
});
```

---

## Cash Book Management

### Record Post-Dated Cheque

```javascript
const receiptResponse = await fetch('http://localhost:5000/api/cashbook/receipt', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    customerId: 'customer_id',
    amount: 5000,
    paymentMethod: 'cheque',
    chequeNo: 'CHQ-123456',
    chequeDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days future
    bankName: 'Test Bank',
    receiptDate: new Date(),
    invoiceAllocations: [
      { invoiceId: 'invoice1_id', amount: 3000 },
      { invoiceId: 'invoice2_id', amount: 2000 }
    ]
  })
});

const { data: receipt } = await receiptResponse.json();
```

### Clear Cheque

```javascript
await fetch(`http://localhost:5000/api/cashbook/receipt/${receipt._id}/clear-cheque`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    clearanceDate: new Date()
  })
});
```

---

## Salesman Commission Tracking

### Calculate Commission for Period

```javascript
const commissionResponse = await fetch(
  `http://localhost:5000/api/reports/salesman-commission?` +
  `salesmanId=salesman_id&` +
  `startDate=2024-01-01&` +
  `endDate=2024-01-31`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const { data: commission } = await commissionResponse.json();
console.log(`Total Commission: ${commission.totalCommission}`);
```

---

## Print Formats

### Available Print Formats

1. **standard** - Basic invoice format
2. **logo** - Invoice with company logo
3. **thermal** - Compact format for thermal printers
4. **warranty_bill** - Includes warranty information
5. **tax_invoice** - Detailed tax invoice format
6. **store_copy** - Store copy format
7. **estimate** - Quotation/estimate format

### Example: Print Warranty Bill

```javascript
const printResponse = await fetch(
  `http://localhost:5000/api/print/invoice/${invoiceId}?format=warranty_bill`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const { data: printData } = await printResponse.json();

// Print data includes:
// - invoice.warrantyInfo
// - items[].warrantyMonths
// - items[].warrantyDetails
// - metadata.includeWarranty = true
```

---

## Keyboard Shortcuts

### Invoice Entry Screen

| Shortcut | Action |
|----------|--------|
| **F2** | View item quotation history |
| **F3** | View all quotation rates |
| **F4** | View PO rate and quantity |
| **F5** | Refresh data |
| **Ctrl+F** | Search |
| **Esc** | Cancel/Close |

### Usage Example

When entering an invoice item, press **F2** to quickly view the quotation history for that item and select the appropriate rate.

---

## Advanced Search Examples

### Search by Multiple Criteria

```javascript
const searchResponse = await fetch('http://localhost:5000/api/invoices/sales/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    searchText: 'customer name',
    searchFields: ['invoiceNo', 'notes'],
    filters: [
      {
        field: 'status',
        operator: 'equals',
        value: 'confirmed'
      },
      {
        field: 'grandTotal',
        operator: 'gte',
        value: 1000
      },
      {
        field: 'invoiceDate',
        operator: 'between',
        value: ['2024-01-01', '2024-01-31']
      }
    ],
    sort: {
      field: 'invoiceDate',
      order: 'desc'
    },
    page: 1,
    limit: 20
  })
});
```

### Available Filter Operators

- `equals`: Exact match
- `notEquals`: Not equal to
- `contains`: Contains text (case-insensitive)
- `startsWith`: Starts with text
- `endsWith`: Ends with text
- `gt`: Greater than
- `gte`: Greater than or equal to
- `lt`: Less than
- `lte`: Less than or equal to
- `between`: Between two values
- `in`: In array of values

---

## Error Handling

### Best Practices

```javascript
async function createInvoice(invoiceData) {
  try {
    const response = await fetch('http://localhost:5000/api/invoices/sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(invoiceData)
    });

    const result = await response.json();

    if (!response.ok) {
      // Handle validation errors
      if (result.errors) {
        result.errors.forEach(error => {
          console.error(`${error.field}: ${error.message}`);
        });
      }
      throw new Error(result.message);
    }

    return result.data;
  } catch (error) {
    console.error('Failed to create invoice:', error.message);
    throw error;
  }
}
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General endpoints**: 100 requests per 15 minutes
- **Search endpoints**: 50 requests per 15 minutes
- **Report endpoints**: 30 requests per 15 minutes

If you exceed the rate limit, you'll receive a `429 Too Many Requests` response.

---

## Webhooks (Future Feature)

Webhooks will be available in a future release to notify your application of events such as:

- Invoice created
- Payment received
- Stock level low
- Cheque bounced

---

## Support

For API support, please contact:
- Email: support@industraders.com
- Documentation: https://docs.industraders.com
- GitHub Issues: https://github.com/industraders/api/issues

---

## Changelog

### Phase 2 (Current)
- Added warehouse management endpoints
- Added salesman and route management
- Added scheme and trade offer endpoints
- Added advanced search and filtering
- Added warranty management
- Added notes/memo functionality
- Added cash book with PDC support

### Phase 1
- Basic invoice management
- Customer and supplier management
- Item management
- Basic reporting
