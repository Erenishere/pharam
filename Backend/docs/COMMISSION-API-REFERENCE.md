# Salesman Commission Report API - Quick Reference

## Endpoint
```
GET /api/v1/reports/salesman-commission
```

## Authentication
Required - Bearer Token

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `startDate` | Date (YYYY-MM-DD) | Yes | - | Start date for commission calculation |
| `endDate` | Date (YYYY-MM-DD) | Yes | - | End date for commission calculation |
| `salesmanId` | ObjectId | No | null | Specific salesman ID (if omitted, calculates for all active salesmen) |
| `commissionBasis` | String | No | 'both' | Commission basis: 'sales', 'collections', or 'both' |
| `salesCommissionRate` | Number | No | Salesman's rate | Override sales commission rate (percentage) |
| `collectionsCommissionRate` | Number | No | Salesman's rate | Override collections commission rate (percentage) |
| `format` | String | No | 'json' | Export format: 'csv', 'excel', or 'pdf' |

## Request Examples

### 1. Get commission for specific salesman
```bash
curl -X GET "http://localhost:3000/api/v1/reports/salesman-commission?salesmanId=507f1f77bcf86cd799439011&startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Get commission for all salesmen
```bash
curl -X GET "http://localhost:3000/api/v1/reports/salesman-commission?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Get sales commission only
```bash
curl -X GET "http://localhost:3000/api/v1/reports/salesman-commission?salesmanId=507f1f77bcf86cd799439011&startDate=2024-01-01&endDate=2024-01-31&commissionBasis=sales" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Get collections commission only
```bash
curl -X GET "http://localhost:3000/api/v1/reports/salesman-commission?salesmanId=507f1f77bcf86cd799439011&startDate=2024-01-01&endDate=2024-01-31&commissionBasis=collections" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Override commission rates
```bash
curl -X GET "http://localhost:3000/api/v1/reports/salesman-commission?salesmanId=507f1f77bcf86cd799439011&startDate=2024-01-01&endDate=2024-01-31&salesCommissionRate=10&collectionsCommissionRate=7" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6. Export as Excel
```bash
curl -X GET "http://localhost:3000/api/v1/reports/salesman-commission?startDate=2024-01-01&endDate=2024-01-31&format=excel" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output commission_report.xlsx
```

## Response Format

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "reportType": "salesman_commission",
    "salesmanId": "507f1f77bcf86cd799439011",
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    },
    "commissionBasis": "both",
    "summary": {
      "totalSalesmen": 1,
      "totalSalesCommission": 75.00,
      "totalCollectionsCommission": 100.00,
      "totalCommission": 175.00
    },
    "commissionDetails": [
      {
        "salesmanId": "507f1f77bcf86cd799439011",
        "salesmanCode": "SM001",
        "salesmanName": "John Doe",
        "commissionRate": 5,
        "sales": {
          "totalSales": 1500.00,
          "invoiceCount": 1,
          "commissionRate": 5,
          "commission": 75.00
        },
        "collections": {
          "totalCollections": 2000.00,
          "receiptCount": 1,
          "commissionRate": 5,
          "commission": 100.00
        },
        "totalCommission": 175.00
      }
    ],
    "generatedAt": "2024-01-20T12:30:45.123Z"
  }
}
```

### Error Responses

#### 400 Bad Request - Missing Parameters
```json
{
  "success": false,
  "message": "Start date and end date are required"
}
```

#### 400 Bad Request - Invalid Commission Basis
```json
{
  "success": false,
  "message": "Commission basis must be one of: sales, collections, both"
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

#### 404 Not Found - Salesman Not Found
```json
{
  "success": false,
  "message": "Salesman not found"
}
```

## Commission Calculation Formula

### Sales Commission
```
salesCommission = (totalSales × salesCommissionRate) / 100
```

### Collections Commission
```
collectionsCommission = (totalCollections × collectionsCommissionRate) / 100
```

### Total Commission
```
totalCommission = salesCommission + collectionsCommission
```

## Notes

1. **Commission Rates**: If custom rates are not provided, the system uses the commission rate stored in the Salesman model.

2. **Date Range**: Both sales invoices and cash receipts are filtered by the specified date range.

3. **Multiple Salesmen**: When `salesmanId` is omitted, the report includes all active salesmen, sorted by total commission (descending).

4. **Rounding**: All monetary amounts are rounded to 2 decimal places.

5. **Invoice/Receipt Counts**: The response includes counts of invoices and receipts used in the calculation for verification purposes.

6. **Export Formats**: When using export formats (csv, excel, pdf), the response will be a file download instead of JSON.

7. **Performance**: For large date ranges or many salesmen, the query may take longer. Consider using specific salesman IDs or shorter date ranges for faster responses.

## Use Cases

1. **Monthly Commission Calculation**: Calculate commissions at the end of each month
2. **Performance Review**: Compare salesman performance based on commission earned
3. **Commission Reconciliation**: Verify commission amounts before payment
4. **What-If Analysis**: Test different commission rates using overrides
5. **Audit Trail**: Generate detailed commission reports for accounting

## Related Endpoints

- `GET /api/v1/reports/salesman-sales` - Get salesman sales report
- `GET /api/v1/reports/salesman-collections` - Get salesman collections report
- `GET /api/v1/reports/salesman-performance` - Get salesman performance report
- `GET /api/v1/salesmen` - Get list of salesmen
- `GET /api/v1/salesmen/:id` - Get specific salesman details
