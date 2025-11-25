# Implementation Plan - Phase 2 Enhancements

This implementation plan covers all 33 requirements for Phase 2 enhancements to the Indus Traders Backend system. Tasks are organized by requirement and follow a test-driven, incremental approach.

## Requirement 1: Enhanced Sales Invoice System with Returns

- [x] 1. Extend Invoice model for sales returns and advanced features

  - [x] 1.1 Add return invoice support to Invoice schema

    - Update Invoice type enum to include 'return_sales'
    - Add originalInvoiceId field for linking returns to original invoices
    - Add returnMetadata subdocument (returnReason, returnNotes, returnDate)
    - Write unit tests for return invoice field validations
    - _Requirements: 1.1, 1.9_

  - [x] 1.2 Add sales-specific Phase 2 fields

    - Add salesmanId field (reference to Salesman model)
    - Add poNumber and poId fields for purchase order linking
    - Add adjustmentAccountId and claimAccountId fields
    - Add memoNo, creditDays fields
    - Add warrantyInfo and warrantyPaste fields

    - Write unit tests for new field validations
    - _Requirements: 1.10, 1.11_

  - [x] 1.3 Add box/unit quantity support to invoice items

    - Add boxQuantity, unitQuantity, boxRate, unitRate to invoiceItemSchema
    - Add cartonQty field to invoice schema
    - Implement automatic carton calculation from box quantity
    - Write unit tests for box/unit calculations
    - _Requirements: 1.4_

  - [x] 1.4 Add scheme and discount fields to invoice items

    - Add scheme1Quantity and scheme2Quantity fields
    - Add discount1Percent, discount1Amount, discount2Percent, discount2Amount
    - Write unit tests for scheme and discount validations
    - _Requirements: 1.5, 1.6_

  - [x] 1.5 Add tax fields to invoice items and totals

    - Add advanceTaxPercent and advanceTaxAmount to items
    - Add nonFilerGST field to invoice
    - Add gst18Total, advanceTaxTotal, nonFilerGSTTotal to totals
    - Write unit tests for tax field validations
    - _Requirements: 1.7, 1.8_

- [x] 2. Implement Sales Return Service

  - [x] 2.1 Create return quantity validation for sales

    - Implement validateSalesReturnQuantities(invoiceId, returnItems) method
    - Get original invoice and all existing returns
    - Calculate already returned quantities per item
    - Validate return quantity doesn't exceed available quantity
    - Write unit tests for validation logic
    - _Requirements: 1.9_

  - [x] 2.2 Implement getSalesReturnableItems method

    - Create getSalesReturnableItems(invoiceId) method
    - Calculate available quantity per item (original - returned)
    - Return list of items with returnable quantities
    - Write unit tests for returnable quantity calculation
    - _Requirements: 1.9_

  - [x] 2.3 Implement createSalesReturn method

    - Validate original invoice exists and is type 'sales'
    - Validate return quantities
    - Calculate return totals (negative amounts)
    - Create return invoice with type 'return_sales'
    - Link to original invoice via originalInvoiceId
    - Write unit tests for return creation logic

    - _Requirements: 1.9_

  - [x] 2.4 Implement inventory reversal for sales returns

    - Create reverseSalesInventory(returnItems) method
    - Increase inventory quantity for each returned item
    - Create stock movement records with type 'return_from_customer'

    - Write unit tests for inventory reversal

    - _Requirements: 1.9_

  - [x] 2.5 Implement ledger reversal for sales returns

    - Create reverse ledger entries for sales returns
    - Debit Sales Account (reduce revenue)
    - Credit Accounts Receivable (reduce asset)

    - Debit GST Output (reverse tax liability)
    - Write unit tests for reverse ledger entries
    - _Requirements: 1.9_

- [x] 3. Implement barcode scanning integration

  - [x] 3.1 Create barcode lookup service

    - Implement findItemByBarcode(barcode) method
    - Query Item model by barcode field

    - Return item details if found
    - Write unit tests for barcode lookup
    - _Requirements: 1.2_

  - [x] 3.2 Create barcode scanning API endpoint

    - Create POST /api/items/scan-barcode endpoint
    - Accept barcode in request body

    - Return item details with available stock

    - Handle invalid barcode errors
    - Write integration tests for barcode endpoint
    - _Requirements: 1.2_

  - [x] 3.3 Add batch selection for barcoded items

    - When item has multiple batches, return batch list

    - Include batch number, expiry date, available quantity
    - Write unit tests for batch selection logic
    - _Requirements: 1.2_

- [x] 4. Implement warehouse-wise stock display

  - [x] 4.1 Add warehouseId to invoice items

    - Add warehouseId field to invoiceItemSchema
    - Add validation for warehouse existence

    - Write unit tests for warehouse validation
    - _Requirements: 1.3_

  - [x] 4.2 Create warehouse stock query service

    - Implement getWarehouseStock(itemId, warehouseId) method

    - Query inventory by item and warehouse
    - Return available quantity
    - Write unit tests for warehouse stock queries
    - _Requirements: 1.3_

  - [x] 4.3 Add warehouse selection to invoice creation

    - Update invoice creation to accept warehouseId per item
    - Validate stock availability in selected warehouse
    - Write integration tests for warehouse-based invoicing
    - _Requirements: 1.3_

- [ ] 5. Implement dual quantity system (Box and Unit)

  - [x] 5.1 Create box/unit calculation service

    - Implement calculateTotalUnits(boxQty, unitQty, packSize) method
    - Implement calculateLineTotal(boxQty, boxRate, unitQty, unitRate) method

    - Write unit tests for quantity calculations
    - _Requirements: 1.4_

  - [x] 5.2 Update invoice calculation for box/unit

    - Modify calculateTotals to handle box and unit quantities
    - Calculate: (boxQty × boxRate) + (unitQty × unitRate)
    - Update inventory with total units

    - Write unit tests for box/unit invoice calculations
    - _Requirements: 1.4_

  - [x] 5.3 Implement automatic carton calculation

    - Add calculateCartonQty(boxQty, packSize) method
    - Auto-calculate cartonQty when boxQty changes

    - Write unit tests for carton calculation
    - _Requirements: 1.4_

- [ ] 6. Implement multi-level discount system

  - [x] 6.1 Create discount calculation service

    - Implement calculateDiscount1(amount, percent) method
    - Implement calculateDiscount2(amount, percent) method
    - Apply discounts in sequence
    - Write unit tests for discount calculations
    - _Requirements: 1.5_

  - [x] 6.2 Add claim account linking for Discount 2

    - Validate claimAccountId when discount2 is applied

    - Require claim account for discount2
    - Write unit tests for claim account validation
    - _Requirements: 1.5_

  - [x] 6.3 Update invoice totals for multi-level discounts

    - Calculate discount1 on line subtotal

    - Calculate discount2 on amount after discount1
    - Update totals calculation
    - Write unit tests for multi-discount scenarios

    - _Requirements: 1.5_

- [x] 7. Implement scheme tracking system

  - [x] 7.1 Add scheme quantity fields

    - Add scheme1Quantity (regular bonus) to items

    - Add scheme2Quantity (claim-based) to items
    - Write unit tests for scheme field validations
    - _Requirements: 1.6_

  - [x] 7.2 Create scheme tracking service

    - Implement recordSchemeQuantities(invoiceId, schemeItems) method
    - Track scheme quantities separately from regular items

    - Link schemes to claim accounts
    - Write unit tests for scheme tracking
    - _Requirements: 1.6_

  - [x] 7.3 Implement scheme reporting

    - Create getSchemeAnalysis(dateRange) method

    - Aggregate scheme quantities by type

    - Return scheme-wise breakdown

    - Write unit tests for scheme reports
    - _Requirements: 1.6_

- [x] 8. Implement advanced tax management

  - [x] 8.1 Create GST calculation service

    - Implement calculateGST18(amount) method
    - Apply 18% GST on taxable amount
    - Write unit tests for GST calculation

    - _Requirements: 1.7_

  - [x] 8.2 Implement advance tax calculation

    - Create calculateAdvanceTax(amount, rate) method
    - Support 0.5% and 2.5% rates based on account registration
    - Write unit tests for advance tax calculation
    - _Requirements: 1.7_

  - [x] 8.3 Implement non-filer GST calculation

    - Create calculateNonFilerGST(amount) method
    - Apply additional 0.1% GST for non-filer accounts
    - Write unit tests for non-filer GST
    - _Requirements: 1.8_

  - [x] 8.4 Update invoice tax calculation

    - Calculate GST, advance tax, and non-filer GST
    - Update totals with separate tax breakdowns
    - Write unit tests for complete tax calculation
    - _Requirements: 1.7, 1.8_

- [ ] 9. Add purchase order linking

  - [x] 9.1 Add PO fields to invoice

    - Add poNumber and poId fields to invoice schema
    - Add validation for PO reference
    - Write unit tests for PO field validations
    - _Requirements: 1.10_

  - [x] 9.2 Implement PO linking in invoice creation

    - Accept poId in invoice creation request

    - Auto-populate PO details when creating from PO
    - Write unit tests for PO linking
    - _Requirements: 1.10_

- [x] 10. Implement invoice printing with warranty and logo

  - [x] 10.1 Add print-related fields

    - Add printFormat field with enum values
    - Add warrantyInfo and warrantyPaste fields
    - Add businessLogo field (URL or base64)
    - Write unit tests for print field validations

    - _Requirements: 1.11_

  - [x] 10.2 Create print data preparation service

    - Implement preparePrintData(invoiceId, format) method
    - Include warranty information if warrantyPaste is true
    - Include business logo based on format
    - Write unit tests for print data preparation
    - _Requirements: 1.11_

## Requirement 2: Enhanced Purchase Invoice System with Returns

- [x] 11. Extend Invoice model for purchase enhancements

  - [ ] 11.1 Add purchase-specific fields to Invoice schema

    - Add supplierBillNo field with validation (required for purchase/return_purchase)
    - Add dimension field for cost center/project tracking
    - Add biltyNo, biltyDate, transportCompany, transportCharges fields
    - Write unit tests for purchase field validations
    - _Requirements: 2.1, 2.3, 2.6_

  - [x] 11.2 Add dual GST rate support to invoice items

    - Add gstRate field to invoiceItemSchema with enum [4, 18]
    - Add gstAmount field to store calculated GST per item
    - Update item validation to ensure gstRate is provided
    - Write unit tests for GST rate validation
    - _Requirements: 2.2_

  - [x] 11.3 Enhance invoice totals for dual GST tracking

    - Add gst18Total and gst4Total fields to totals subdocument
    - Update calculateTotals method to separate GST by rate
    - Write unit tests for dual GST calculation
    - _Requirements: 2.2, 2.7_

  - [x] 11.4 Add database indexes for purchase invoice queries

    - Create compound index on (supplierBillNo, supplierId) for duplicate checking
    - Create index on dimension for reporting
    - Test index performance with sample data

    - _Requirements: 2.3, 2.6_

- [ ] 12. Implement Tax Calculation Service for dual GST rates

  - [x] 12.1 Create GST calculation methods for purchase invoices

    - Implement calculatePurchaseGST(amount, gstRate) method
    - Add validation for GST rate (must be 4 or 18)
    - Implement calculateInvoiceTaxTotals(items) to group by GST rate
    - Return breakdown: { gst18: {...}, gst4: {...}, total: ... }
    - Write unit tests for both 4% and 18% GST calculations
    - _Requirements: 2.2, 2.7_

  - [x] 12.2 Test mixed GST rate scenarios

    - Write unit tests for invoices with only 18% items
    - Write unit tests for invoices with only 4% items
    - Write unit tests for invoices with mixed GST rates
    - Verify correct tax totals in all scenarios
    - _Requirements: 2.2, 2.7_

- [x] 13. Create Purchase Return Service

  - [x] 13.1 Implement return quantity validation

    - Create validateReturnQuantities(invoiceId, returnItems) method
    - Get original invoice and all existing returns
    - Calculate already returned quantities per item
    - Validate return quantity doesn't exceed available quantity
    - Return validation result with detailed error messages
    - Write unit tests for validation logic
    - _Requirements: 2.5_

  - [x] 13.2 Implement getReturnableItems method

    - Create getReturnableItems(invoiceId) method
    - Fetch original invoice and all return invoices
    - Calculate available quantity per item (original - returned)
    - Return list of items with returnable quantities
    - Write unit tests for returnable quantity calculation
    - _Requirements: 2.5_

  - [x] 13.3 Implement createPurchaseReturn method

    - Validate original invoice exists and is type 'purchase'
    - Validate return quantities using validateReturnQuantities
    - Calculate return totals (negative amounts)
    - Create return invoice with type 'return_purchase'
    - Link to original invoice via originalInvoiceId
    - Write unit tests for return creation logic

    - _Requirements: 2.1, 2.5_

  - [x] 13.4 Implement inventory reversal for returns

    - Create reverseInventory(returnItems) method
    - Decrease inventory quantity for each returned item
    - Create stock movement records with type 'return_to_supplier'
    - Handle batch quantities if applicable

    - Write unit tests for inventory reversal
    - _Requirements: 2.5_

  - [x] 13.5 Implement ledger reversal for returns

    - Create createReverseLedgerEntries(returnInvoice) method
    - Credit Inventory Account (reduce asset)
    - Debit Accounts Payable (reduce liability)
    - Credit GST Input (reverse tax credit)
    - Write unit tests for reverse ledger entries

    - _Requirements: 2.5_

- [ ] 14. Enhance Purchase Invoice Service

  - [x] 14.1 Update createPurchaseInvoice for dual GST support

    - Modify createPurchaseInvoice to accept gstRate per item
    - Implement dual GST calculation using Tax Calculation Service
    - Update totals to include gst18Total and gst4Total

    - Validate supplierBillNo is unique per supplier
    - Write unit tests for purchase invoice creation with dual GST
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 14.2 Add scheme quantity tracking

    - Implement recordSchemeQuantities(invoiceId, schemeItems) method

    - Store scheme quantities separately from regular quantities
    - Link scheme quantities to invoice items
    - Write unit tests for scheme tracking
    - _Requirements: 2.4_

  - [x] 14.3 Add dimension tracking support

    - Validate dimension value if provided
    - Store dimension at invoice and item level

    - Write unit tests for dimension validation

    - _Requirements: 2.6_

  - [x] 14.4 Add warranty information handling

    - Store warranty information at invoice level

    - Store warranty details at item level (warrantyMonths, warrantyDetails)
    - Write unit tests for warranty data storage
    - _Requirements: 2.8_

- [ ] 15. Update Purchase Invoice Controller

  - [x] 15.1 Add createPurchaseReturn endpoint

    - Create POST /api/purchase-invoices/return endpoint
    - Validate request data (originalInvoiceId, returnItems, returnReason)
    - Call PurchaseReturnService.createPurchaseReturn
    - Return created return invoice with 201 status
    - Write integration tests for return creation endpoint
    - _Requirements: 2.1, 2.5_

  - [x] 15.2 Add getReturnableItems endpoint

    - Create GET /api/purchase-invoices/:id/returnable endpoint
    - Call PurchaseReturnService.getReturnableItems
    - Return list of returnable items with available quantities
    - Write integration tests for returnable items endpoint
    - _Requirements: 2.5_

  - [x] 15.3 Add validateReturn endpoint

    - Create POST /api/purchase-invoices/:id/validate-return endpoint
    - Call PurchaseReturnService.validateReturnQuantities
    - Return validation result with errors if any
    - Write integration tests for validation endpoint

    - _Requirements: 2.5_

  - [x] 15.4 Update existing purchase invoice endpoints

    - Update POST /api/purchase-invoices to support new fields

    - Add support for gstRate per item in request
    - Add support for supplierBillNo, dimension, warrantyInfo
    - Write integration tests for enhanced purchase invoice creation
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 2.8_

- [x] 16. Implement complete purchase return workflow tests

  - [x] 16.1 Create end-to-end purchase return integration test

    - Create a purchase invoice with multiple items
    - Verify inventory increase and ledger entries
    - Create a return invoice for some items
    - Verify inventory decrease and reverse ledger entries
    - Verify supplier balance adjustment
    - Verify original invoice link is maintained
    - _Requirements: 2.1, 2.5_

  - [x] 16.2 Test partial return scenarios

    - Create purchase invoice with 3 items
    - Return 2 items in first return
    - Verify remaining returnable quantity
    - Return 1 more item in second return
    - Verify all quantities are tracked correctly
    - _Requirements: 2.5_

  - [x] 16.3 Test full return scenario

    - Create purchase invoice
    - Return all items from invoice
    - Verify complete reversal of inventory and ledger
    - Verify supplier balance is fully adjusted
    - _Requirements: 2.5_

  - [x] 16.4 Test return validation edge cases

    - Test return quantity exceeding original quantity (should fail)

    - Test return of non-existent item (should fail)
    - Test return from non-existent invoice (should fail)
    - Test return from sales invoice (should fail)
    - Verify appropriate error messages
    - _Requirements: 2.5_

- [x] 17. Implement dual GST rate reporting

  - [x] 17.1 Create GST breakdown report

    - Implement getPurchaseGSTBreakdown(dateRange) method
    - Group purchases by GST rate (4% and 18%)
    - Calculate taxable amount and GST amount per rate
    - Return breakdown with totals
    - Write unit tests for GST breakdown calculation
    - _Requirements: 2.2, 2.7_

  - [x] 17.2 Add GST breakdown to existing reports

    - Update purchase summary report to include GST breakdown
    - Update supplier-wise report to show GST by rate
    - Write integration tests for enhanced reports
    - _Requirements: 2.7_

- [x] 18. Add supplier bill number validation

  - [x] 18.1 Implement duplicate supplier bill check

    - Create checkDuplicateSupplierBill(supplierId, billNo) method

    - Query for existing invoices with same supplier and bill number
    - Return validation result
    - Write unit tests for duplicate checking
    - _Requirements: 2.3_

  - [x] 18.2 Add pre-save validation for supplier bill number

    - Add pre-save hook to Invoice model
    - Check for duplicate supplier bill number before saving
    - Throw error if duplicate found
    - Write unit tests for pre-save validation
    - _Requirements: 2.3_

## Requirement 3: Multi-Warehouse Inventory Management

- [x] 19. Create Warehouse model and service

  - [x] 19.1 Create Warehouse model

    - Define Warehouse schema with name, code, location, isActive fields
    - Add validation for unique warehouse code
    - Add indexes on code and isActive
    - Write unit tests for Warehouse model
    - _Requirements: 3.1, 3.2_

  - [x] 19.2 Create Warehouse service

    - Implement createWarehouse(data) method
    - Implement getWarehouses() method
    - Implement getWarehouseById(id) method
    - Implement updateWarehouse(id, data) method
    - Write unit tests for warehouse service methods
    - _Requirements: 3.1_

  - [x] 19.3 Create Warehouse API endpoints
    - Create POST /api/warehouses endpoint
    - Create GET /api/warehouses endpoint
    - Create GET /api/warehouses/:id endpoint
    - Create PUT /api/warehouses/:id endpoint
    - Write integration tests for warehouse endpoints
    - _Requirements: 3.1_

- [x] 20. Implement warehouse-wise inventory tracking

  - [x] 20.1 Extend Inventory model for warehouse tracking

    - Add warehouseId field to Inventory schema
    - Create compound index on (itemId, warehouseId)
    - Update inventory queries to include warehouse filter
    - Write unit tests for warehouse-based inventory
    - _Requirements: 3.1, 3.2_

  - [x] 20.2 Update inventory service for warehouse support

    - Modify getItemStock to accept warehouseId parameter
    - Implement getWarehouseStock(itemId, warehouseId) method
    - Implement getAllWarehouseStock(itemId) method

    - Write unit tests for warehouse stock queries
    - _Requirements: 3.1, 3.4_

  - [x] 20.3 Update stock movement for warehouse tracking

    - Add warehouseId to StockMovement model
    - Update stock movement creation to include warehouse
    - Write unit tests for warehouse stock movements
    - _Requirements: 3.2_

- [x] 21. Implement stock transfer between warehouses

  - [x] 21.1 Create stock transfer service

    - Implement transferStock(itemId, fromWarehouse, toWarehouse, quantity) method
    - Validate sufficient stock in source warehouse
    - Decrease stock in source warehouse
    - Increase stock in destination warehouse
    - Create stock movement records for both warehouses
    - Write unit tests for stock transfer
    - _Requirements: 3.3_

  - [x] 21.2 Create stock transfer API endpoints

    - Create POST /api/inventory/transfer endpoint
    - Validate transfer request data
    - Call stock transfer service

    - Return transfer confirmation
    - Write integration tests for stock transfer
    - _Requirements: 3.3_

  - [x] 21.3 Add stock transfer validation
    - Validate source and destination warehouses exist
    - Validate source warehouse has sufficient stock
    - Prevent negative stock in source warehouse
    - Write unit tests for transfer validation
    - _Requirements: 3.3, 3.4_

- [x] 22. Implement warehouse-wise batch and expiry tracking

  - [x] 22.1 Add warehouse to batch tracking

    - Add warehouseId to Batch model
    - Update batch queries to include warehouse filter

    - Write unit tests for warehouse-based batch tracking
    - _Requirements: 3.5_

  - [x] 22.2 Implement expired item flagging by warehouse

    - Create getExpiredItemsByWarehouse(warehouseId) method
    - Query batches with expiry date < current date
    - Group by warehouse
    - Write unit tests for expired item queries

    - _Requirements: 3.5_

- [x] 23. Create warehouse-wise stock reports

  - [x] 23.1 Implement warehouse stock level report

    - Create getWarehouseStockLevels(warehouseId) method
    - Return all items with quantities in specified warehouse
    - Include low stock indicators
    - Write unit tests for warehouse stock report

    - _Requirements: 3.1, 3.4_

  - [x] 23.2 Implement warehouse comparison report

    - Create compareWarehouseStock(itemId) method
    - Return stock levels across all warehouses for an item

    - Write unit tests for warehouse comparison

    - _Requirements: 3.4_

  - [x] 23.3 Create warehouse stock report API endpoints

    - Create GET /api/reports/warehouse-stock endpoint

    - Create GET /api/reports/warehouse-comparison/:itemId endpoint

    - Write integration tests for warehouse reports
    - _Requirements: 3.4_

## Requirement 4: Scheme and Bonus Management

- [x] 24. Create Scheme model and service

  - [x] 24.1 Create SchemeDefinition model

    - Define schema with name, type (scheme1/scheme2), company, group fields
    - Add schemeFormat field (e.g., "12+1" for buy 12 get 1 free)
    - Add discountPercent, claimAccountId, isActive fields
    - Add validation for scheme format
    - Write unit tests for SchemeDefinition model
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 24.2 Create Scheme service

    - Implement createScheme(data) method
    - Implement getActiveSchemes() method

    - Implement getSchemesByCompany(companyId) method
    - Implement calculateSchemeBonus(quantity, schemeFormat) method
    - Write unit tests for scheme service methods
    - _Requirements: 4.1, 4.2_

  - [x] 24.3 Create Scheme API endpoints

    - Create POST /api/schemes endpoint
    - Create GET /api/schemes endpoint
    - Create GET /api/schemes/company/:companyId endpoint
    - Create PUT /api/schemes/:id endpoint
    - Write integration tests for scheme endpoints
    - _Requirements: 4.1_

- [x] 25. Implement scheme application in invoices

  - [x] 25.1 Add scheme calculation to invoice service

    - Implement applyScheme(item, schemeDefinition) method
    - Calculate scheme1Quantity based on regular quantity
    - Calculate scheme2Quantity for claim-based schemes
    - Update invoice item with scheme quantities
    - Write unit tests for scheme application
    - _Requirements: 4.2, 4.3_

  - [x] 25.2 Link schemes to claim accounts

    - Validate claimAccountId when scheme2 is applied
    - Create ledger entries for scheme claims
    - Write unit tests for scheme claim accounting
    - _Requirements: 4.3, 4.5_

  - [x] 25.3 Separate scheme items from regular items

    - Track scheme quantities separately in invoice

    - Don't affect regular inventory for scheme items

    - Write unit tests for scheme item separation
    - _Requirements: 4.3_

- [ ] 26. Implement scheme reporting

  - [x] 26.1 Create scheme analysis report

    - Implement getSchemeAnalysis(dateRange) method
    - Aggregate scheme quantities by type (scheme1/scheme2)
    - Calculate total scheme value

    - Group by company and item
    - Write unit tests for scheme analysis
    - _Requirements: 4.4_

  - [x] 26.2 Create scheme-wise invoice report

    - Implement getSchemeInvoices(schemeId, dateRange) method

    - List all invoices using specific scheme

    - Show scheme quantities and values
    - Write unit tests for scheme invoice report
    - _Requirements: 4.4_

  - [x] 26.3 Create scheme report API endpoints

    - Create GET /api/reports/scheme-analysis endpoint
    - Create GET /api/reports/scheme-invoices/:schemeId endpoint

    - Write integration tests for scheme reports
    - _Requirements: 4.4_

## Requirement 5: Advanced Discount Management

- [ ] 27. Implement multi-level discount system

  - [x] 27.1 Create discount calculation service

    - Implement calculateDiscount1(amount, percent) method
    - Implement calculateDiscount2(amount, percent, claimAccountId) method
    - Apply discounts in sequence (discount1 first, then discount2)
    - Write unit tests for discount calculations

    - _Requirements: 5.1, 5.2, 5.4_

  - [x] 27.2 Add claim account validation for Discount 2

    - Validate claimAccountId is provided when discount2 is applied

    - Validate claim account exists and is active
    - Write unit tests for claim account validation

    - _Requirements: 5.2, 5.3_

  - [x] 27.3 Update invoice calculation for multi-level discounts

    - Calculate discount1 on line subtotal
    - Calculate discount2 on amount after discount1
    - Update line total calculation
    - Write unit tests for multi-discount scenarios

    - _Requirements: 5.4_

- [ ] 28. Implement discount reporting

  - [x] 28.1 Create discount breakdown report

    - Implement getDiscountBreakdown(dateRange) method

    - Separate discount1 and discount2 amounts
    - Group by claim account for discount2

    - Write unit tests for discount breakdown
    - _Requirements: 5.5_

  - [x] 28.2 Create discount report API endpoint

    - Create GET /api/reports/discount-breakdown endpoint

    - Accept date range and discount type filters
    - Return discount analysis
    - Write integration tests for discount reports

    - _Requirements: 5.5_

## Requirement 6: Enhanced Tax Management

- [ ] 29. Implement comprehensive tax calculation

  - [x] 29.1 Create tax calculation service

    - Implement calculateGST(amount, rate) method for 18% GST
    - Implement calculatePurchaseGST(amount, rate) for 4% and 18%
    - Implement calculateAdvanceTax(amount, accountType) for 0.5% or 2.5%

    - Implement calculateNonFilerGST(amount) for 0.1%
    - Write unit tests for all tax calculations

    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 29.2 Add account-based tax determination

    - Add advanceTaxRate field to Customer/Supplier models
    - Add isNonFiler field to Customer/Supplier models
    - Determine tax rates based on account registration

    - Write unit tests for account-based tax logic
    - _Requirements: 6.3, 6.4_

  - [x] 29.3 Update invoice tax calculation

    - Calculate all applicable taxes (GST, advance tax, non-filer GST)
    - Store separate tax amounts in invoice totals
    - Write unit tests for complete tax calculation
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 30. Implement tax reporting

  - [x] 30.1 Create comprehensive tax report

    - Implement getTaxReport(dateRange) method
    - Separate regular GST, advance tax, and non-filer GST
    - Group by tax type and rate
    - Write unit tests for tax report
    - _Requirements: 6.5_

  - [x] 30.2 Create tax report API endpoint

    - Create GET /api/reports/tax-summary endpoint
    - Accept date range filter
    - Return tax breakdown by type
    - Write integration tests for tax reports
    - _Requirements: 6.5_

## Requirement 7: Post-Dated Cheque Management

- [x] 31. Extend CashReceipt model for cheque management

  - [x] 31.1 Add cheque fields to CashReceipt model

    - Add postDatedCheque boolean field
    - Add chequeDate, bankName, chequeNumber fields
    - Add chequeStatus enum (pending, cleared, bounced)
    - Add clearedDate field
    - Write unit tests for cheque field validations

    - _Requirements: 7.1, 7.2_

  - [x] 31.2 Add cheque validation

    - Validate cheque fields are provided when postDatedCheque is true
    - Validate chequeDate is not in the past
    - Validate cheque number is unique per bank
    - Write unit tests for cheque validation
    - _Requirements: 7.1, 7.2_

- [x] 32. Implement cheque management service

  - [x] 32.1 Create cheque recording method

    - Implement recordPostDatedCheque(receiptData) method
    - Create cash receipt with pending status
    - Don't update cash balance until post date
    - Write unit tests for cheque recording
    - _Requirements: 7.1, 7.2_

  - [x] 32.2 Implement cheque clearance

    - Create clearCheque(receiptId) method
    - Update cheque status to 'cleared'
    - Update cash balance on clearance
    - Set clearedDate
    - Write unit tests for cheque clearance
    - _Requirements: 7.3_

  - [ ] 32.3 Implement cheque bounce handling
    - Create bounceCheque(receiptId, reason) method
    - Update cheque status to 'bounced'
    - Reverse the receipt entry
    - Restore customer balance
    - Write unit tests for cheque bounce
    - _Requirements: 7.4_

- [x] 33. Create cheque management API endpoints

  - [x] 33.1 Add cheque endpoints

    - Update POST /api/cash-receipts to support cheque data
    - Create POST /api/cash-receipts/:id/clear endpoint
    - Create POST /api/cash-receipts/:id/bounce endpoint
    - Create GET /api/cash-receipts/pending-cheques endpoint
    - Write integration tests for cheque endpoints
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 33.2 Implement pending cheques report

    - Create getPendingCheques(dueDate) method
    - List all post-dated cheques by due date
    - Include bank details and amounts
    - Write unit tests for pending cheques query
    - _Requirements: 7.5_

  - [x] 33.3 Create pending cheques API endpoint

    - Create GET /api/reports/pending-cheques endpoint
    - Accept date filter
    - Return cheques sorted by due date
    - Write integration tests for pending cheques report
    - _Requirements: 7.5_

## Requirement 8: Enhanced Cash Book with Invoice Aging

- [x] 34. Implement invoice aging calculation

  - [x] 34.1 Add aging calculation method

    - Implement calculateInvoiceAge(invoiceDate) method
    - Return days old from invoice date to current date
    - Write unit tests for age calculation
    - _Requirements: 8.2_

  - [x] 34.2 Create pending invoices query

    - Implement getPendingInvoices(accountId) method
    - Get all unpaid/partially paid invoices
    - Calculate days old for each invoice

    - Sort by invoice date
    - Write unit tests for pending invoices query
    - _Requirements: 8.1, 8.2_

- [x] 35. Implement payment application against invoices

  - [x] 35.1 Create invoice payment tracking

    - Add invoicePayments array to CashReceipt model
    - Store: invoiceId, daysOld, dueAmount, paidAmount, difference
    - Write unit tests for invoice payment structure
    - _Requirements: 8.1, 8.3, 8.4_

  - [x] 35.2 Implement payment application service

    - Create applyPaymentToInvoices(receiptData) method
    - Allow partial payment against multiple invoices
    - Calculate and store difference amounts
    - Update invoice payment status
    - Write unit tests for payment application
    - _Requirements: 8.3, 8.4_

  - [x] 35.3 Update cash receipt creation

    - Modify cash receipt creation to accept invoice payments
    - Apply payments to specified invoices
    - Update invoice balances
    - Write integration tests for invoice payment application
    - _Requirements: 8.1, 8.3_

- [x] 36. Implement aging report

  - [x] 36.1 Create aging report service

    - Implement getAgingReport(accountId) method
    - Group receivables by age buckets (0-30, 31-60, 61-90, 90+)
    - Calculate total receivables per bucket
    - Write unit tests for aging calculation
    - _Requirements: 8.5_

  - [x] 36.2 Create aging report API endpoint

    - Create GET /api/reports/aging endpoint
    - Accept account filter
    - Return aging analysis
    - Write integration tests for aging report
    - _Requirements: 8.5_

## Requirement 9: Salesman Management and Assignment

- [x] 37. Create Salesman model and service

  - [x] 37.1 Create Salesman model

    - Define schema with name, code, phone, email, isActive fields
    - Add commissionRate field
    - Add routeId field (reference to Route)
    - Add validation for unique salesman code
    - Write unit tests for Salesman model
    - _Requirements: 9.1, 9.5_

  - [x] 37.2 Create Salesman service

    - Implement createSalesman(data) method
    - Implement getSalesmen() method
    - Implement getSalesmanById(id) method
    - Implement updateSalesman(id, data) method
    - Write unit tests for salesman service methods
    - _Requirements: 9.1_

  - [x] 37.3 Create Salesman API endpoints

    - Create POST /api/salesmen endpoint
    - Create GET /api/salesmen endpoint
    - Create GET /api/salesmen/:id endpoint
    - Create PUT /api/salesmen/:id endpoint
    - Write integration tests for salesman endpoints
    - _Requirements: 9.1_

- [x] 38. Implement salesman assignment in invoices

  - [x] 38.1 Add salesman to invoice creation

    - Update invoice creation to accept salesmanId
    - Validate salesman exists and is active
    - Store salesmanId in invoice
    - Write unit tests for salesman assignment

    - _Requirements: 9.1_

  - [x] 38.2 Add salesman to cash receipts

    - Update cash receipt creation to accept salesmanId
    - Link receipts to salesman for commission tracking
    - Write unit tests for salesman-receipt linking
    - _Requirements: 9.2_

- [x] 39. Implement salesman performance reporting

  - [x] 39.1 Create salesman sales report

    - Implement getSalesmanSales(salesmanId, dateRange) method
    - Aggregate sales by salesman
    - Calculate total sales amount
    - Write unit tests for salesman sales report
    - _Requirements: 9.3_

  - [x] 39.2 Create salesman collection report

    - Implement getSalesmanCollections(salesmanId, dateRange) method
    - Aggregate cash receipts by salesman
    - Calculate total collections
    - Write unit tests for salesman collection report
    - _Requirements: 9.3_

  - [x] 39.3 Create salesman performance report

    - Implement getSalesmanPerformance(salesmanId, dateRange) method
    - Compare sales and collections against targets
    - Calculate achievement percentage
    - Write unit tests for performance calculation

    - _Requirements: 9.4_

  - [x] 39.4 Create salesman report API endpoints

    - Create GET /api/reports/salesman-sales endpoint
    - Create GET /api/reports/salesman-collections endpoint
    - Create GET /api/reports/salesman-performance endpoint
    - Write integration tests for salesman reports
    - _Requirements: 9.3, 9.4_

- [x] 40. Implement commission calculation

  - [x] 40.1 Create commission calculation service

    - Implement calculateCommission(salesmanId, dateRange) method
    - Use salesman-specific commission rates
    - Calculate commission on sales and/or collections
    - Write unit tests for commission calculation
    - _Requirements: 9.5_

  - [ ] 40.2 Create commission report API endpoint
    - Create GET /api/reports/salesman-commission endpoint
    - Accept salesman and date range filters
    - Return commission breakdown
    - Write integration tests for commission report
    - _Requirements: 9.5_

## Requirement 10: Purchase Order Integration

- [x] 41. Create PurchaseOrder model and service

  - [x] 41.1 Create PurchaseOrder model

    - Define schema with poNumber, supplierId, poDate, status fields
    - Add items array with itemId, quantity, unitPrice
    - Add fulfillmentStatus field (pending, partial, fulfilled)
    - Add validation for PO number uniqueness
    - Write unit tests for PurchaseOrder model
    - _Requirements: 10.1_

  - [x] 41.2 Create PurchaseOrder service

    - Implement createPurchaseOrder(data) method
    - Implement getPurchaseOrders() method
    - Implement getPurchaseOrderById(id) method
    - Implement approvePurchaseOrder(id) method
    - Write unit tests for PO service methods

    - _Requirements: 10.1, 10.2_

  - [x] 41.3 Create PurchaseOrder API endpoints
    - Create POST /api/purchase-orders endpoint
    - Create GET /api/purchase-orders endpoint
    - Create GET /api/purchase-orders/:id endpoint
    - Create POST /api/purchase-orders/:id/approve endpoint
    - Write integration tests for PO endpoints
    - _Requirements: 10.1, 10.2_

- [x] 42. Implement PO to invoice conversion

  - [x] 42.1 Create PO conversion service

    - Implement convertPOToInvoice(poId) method
    - Validate PO is approved
    - Auto-populate invoice with PO details
    - Link invoice to PO via poId field
    - Write unit tests for PO conversion
    - _Requirements: 10.2, 10.3_

  - [x] 42.2 Create PO conversion API endpoint

    - Create POST /api/purchase-orders/:id/convert-to-invoice endpoint
    - Call conversion service
    - Return created invoice
    - Write integration tests for PO conversion
    - _Requirements: 10.2, 10.3_

- [x] 43. Implement PO fulfillment tracking

  - [x] 43.1 Create fulfillment tracking service

    - Implement updatePOFulfillment(poId, invoiceItems) method
    - Calculate fulfilled quantities per item
    - Update PO fulfillment status (pending/partial/fulfilled)
    - Write unit tests for fulfillment tracking
    - _Requirements: 10.4_

  - [x] 43.2 Create pending quantity query

    - Implement getPOPendingQuantities(poId) method
    - Calculate pending quantity per item (ordered - received)
    - Write unit tests for pending quantity calculation
    - _Requirements: 10.5_

  - [x] 43.3 Create PO fulfillment report
    - Implement getPOFulfillmentReport(dateRange) method
    - List all POs with fulfillment status
    - Show pending quantities
    - Write unit tests for fulfillment report
    - _Requirements: 10.4, 10.5_

## Requirement 11: Adjustment Account Management

- [x] 44. Implement adjustment account system

  - [x] 44.1 Add adjustment account fields

    - Add adjustmentAccountId to Invoice model
    - Add claimAccountId to Invoice model
    - Add validation for adjustment accounts
    - Write unit tests for adjustment account fields
    - _Requirements: 11.1_

  - [ ] 44.2 Create adjustment ledger entries

    - Implement createAdjustmentEntries(invoice) method
    - Create entries in adjustment account for discounts
    - Create entries in claim account for schemes
    - Write unit tests for adjustment entries

    - _Requirements: 11.2_

  - [ ] 44.3 Create adjustment account report

    - Implement getAdjustmentAccountReport(accountId, dateRange) method
    - Show all adjustment entries
    - Calculate adjustment account balance

    - Write unit tests for adjustment report
    - _Requirements: 11.3_

  - [ ] 44.4 Create adjustment reconciliation
    - Implement reconcileAdjustments(accountId, dateRange) method
    - Match discounts to adjustment accounts
    - Identify unmatched adjustments
    - Write unit tests for reconciliation
    - _Requirements: 11.4_

## Requirement 12: Dual Unit System (Box and Unit)

- [x] 45. Implement box/unit calculation system

  - [x] 45.1 Add pack size to Item model

    - Add packSize field to Item model (units per box)
    - Add validation for pack size > 0
    - Write unit tests for pack size validation
    - _Requirements: 12.4_

  - [x] 45.2 Create box/unit conversion service

    - Implement convertBoxToUnits(boxQty, packSize) method
    - Implement calculateTotalUnits(boxQty, unitQty, packSize) method
    - Write unit tests for conversion calculations
    - _Requirements: 12.1, 12.4_

  - [x] 45.3 Implement dual rate calculation

    - Create calculateLineTotal(boxQty, boxRate, unitQty, unitRate) method
    - Calculate: (boxQty × boxRate) + (unitQty × unitRate)
    - Write unit tests for dual rate calculation
    - _Requirements: 12.3_

  - [x] 45.4 Update inventory for box/unit

    - Modify inventory updates to convert boxes to units
    - Use packSize for conversion
    - Update stock in units only
    - Write unit tests for inventory conversion
    - _Requirements: 12.4_

  - [x] 45.5 Create box/unit reports

    - Implement reports showing both box and unit quantities
    - Display conversions clearly
    - Write unit tests for box/unit reporting
    - _Requirements: 12.5_

## Requirement 13: Barcode Integration

- [x] 46. Implement barcode scanning system

  - [x] 46.1 Add barcode field to Item model

    - Add barcode field to Item schema
    - Add unique index on barcode
    - Add validation for barcode format
    - Write unit tests for barcode validation
    - _Requirements: 13.1_

  - [x] 46.2 Create barcode lookup service

    - Implement findItemByBarcode(barcode) method
    - Query Item by barcode
    - Return item details with stock information
    - Write unit tests for barcode lookup
    - _Requirements: 13.1, 13.2_

  - [x] 46.3 Create barcode scanning API endpoint

    - Create POST /api/items/scan-barcode endpoint
    - Accept barcode in request body
    - Return item details if found
    - Return error if barcode invalid
    - Write integration tests for barcode endpoint
    - _Requirements: 13.1, 13.4_

  - [x] 46.4 Implement batch selection for barcoded items

    - When item has multiple batches, return batch list
    - Include batch number, expiry date, available quantity
    - Allow batch selection in response
    - Write unit tests for batch selection
    - _Requirements: 13.3_

  - [x] 46.5 Implement quantity accumulation

    - Support scanning same barcode multiple times
    - Accumulate quantities for repeated scans
    - Write unit tests for quantity accumulation
    - _Requirements: 13.5_

## Requirement 14: Enhanced Reporting with New Dimensions

- [x] 47. Implement salesman dimension reporting

  - [x] 47.1 Add salesman to sales reports

    - Update sales report to include salesman dimension
    - Group sales by salesman
    - Show salesman-wise totals
    - Write unit tests for salesman reporting
    - _Requirements: 14.1_

  - [x] 47.2 Create salesman performance dashboard
    - Implement getSalesmanDashboard(salesmanId) method
    - Show sales, collections, targets, achievements
    - Write unit tests for dashboard data
    - _Requirements: 14.1_

- [x] 48. Implement scheme dimension reporting

  - [x] 48.1 Create scheme analysis report

    - Implement getSchemeReport(dateRange) method
    - Show scheme-wise quantities and amounts
    - Group by scheme type (scheme1/scheme2)
    - Write unit tests for scheme reporting
    - _Requirements: 14.2_

  - [x] 48.2 Create scheme comparison report
    - Compare scheme performance across periods
    - Show trends and patterns
    - Write unit tests for scheme comparison
    - _Requirements: 14.2_

- [x] 49. Implement warehouse dimension reporting


  - [x] 49.1 Create warehouse stock report

    - Implement getWarehouseStockReport() method
    - Display warehouse-wise stock levels for all items
    - Include low stock indicators per warehouse
    - Write unit tests for warehouse stock reporting
    - _Requirements: 14.3_

  - [x] 49.2 Create warehouse movement report
    - Implement getWarehouseMovementReport(warehouseId, dateRange) method
    - Show all stock movements for a warehouse
    - Include transfers in and out
    - Write unit tests for warehouse movement reporting
    - _Requirements: 14.3_

- [x] 52. Create RecoverySummary model and service

  - [x] 52.1 Create RecoverySummary model

    - Define schema with date, salesmanId, town fields
    - Add accounts array with accountId, invoiceAmount, balance, recoveryAmount
    - Add totalInvoiceAmount, totalBalance, totalRecovery fields
    - Write unit tests for RecoverySummary model
    - _Requirements: 15.1, 15.4_

  - [x] 52.2 Create RecoverySummary service

    - Implement createRecoverySummary(data) method
    - Validate salesman and town
    - Calculate totals automatically
    - Write unit tests for recovery summary service
    - _Requirements: 15.1, 15.5_

  - [x] 52.3 Create recovery summary API endpoints
    - Create POST /api/recovery-summaries endpoint
    - Create GET /api/recovery-summaries endpoint
    - Create GET /api/recovery-summaries/:id endpoint
    - Write integration tests for recovery summary endpoints
    - _Requirements: 15.1, 15.6_

- [x] 53. Implement town-based account filtering

  - [x] 53.1 Add town field to Customer model

    - Add town field to Customer schema
    - Add index on town for filtering
    - Write unit tests for town field
    - _Requirements: 15.2_

  - [x] 53.2 Create town-based account query
    - Implement getAccountsByTown(town) method
    - Return all accounts in specified town
    - Include balance information
    - Write unit tests for town filtering
    - _Requirements: 15.2_

- [x] 54. Implement recovery summary reporting

  - [x] 54.1 Create recovery summary display

    - Implement getRecoverySummaryDetails(summaryId) method
    - Show total invoice amount, balance, recovery
    - List all sub-accounts with details
    - Write unit tests for summary display
    - _Requirements: 15.3_

  - [x] 54.2 Create recovery summary list

    - Implement getRecoverySummaries(filters) method
    - Filter by date, salesman, town
    - Show summary totals
    - Write unit tests for summary list
    - _Requirements: 15.6_

  - [x] 54.3 Create recovery summary print
    - Implement generateRecoverySummaryPrint(summaryId) method
    - Format for printing
    - Include all required details
    - Write unit tests for print generation
    - _Requirements: 15.7_

## Requirement 16: Enhanced Account Registration with Tax Details

- [x] 55. Extend Customer and Supplier models for tax details

  - [x] 55.1 Add tax registration fields

    - Add licenseNo, srbNo, ntn, strn fields
    - Add whtPercent field for withholding tax
    - Add nicNumber field
    - Add validation for tax registration numbers
    - Write unit tests for tax field validations
    - _Requirements: 16.1, 16.2_

  - [x] 55.2 Add credit and route fields

    - Add creditLimit and creditDays fields
    - Add route field
    - Add validation for credit fields
    - Write unit tests for credit validations
    - _Requirements: 16.3_

  - [x] 55.3 Update account creation and display

    - Update account creation to accept new fields
    - Display all tax registration details
    - Write integration tests for enhanced account management
    - _Requirements: 16.4_

  - [x] 55.4 Auto-populate tax details in invoices
    - When creating invoice, fetch account tax details
    - Auto-populate WHT%, advance tax rate, etc.
    - Write unit tests for tax detail population
    - _Requirements: 16.5_

## Requirement 17: Route Management for Salesmen

- [x] 56. Create Route model and service

  - [x] 56.1 Create Route model

    - Define schema with name, code, description fields
    - Add salesmanId field (assigned salesman)
    - Add isActive field
    - Write unit tests for Route model
    - _Requirements: 17.1_

  - [x] 56.2 Create Route service

    - Implement createRoute(data) method
    - Implement getRoutes() method
    - Implement assignSalesmanToRoute(routeId, salesmanId) method
    - Write unit tests for route service methods
    - _Requirements: 17.1_

  - [x] 56.3 Create Route API endpoints
    - Create POST /api/routes endpoint
    - Create GET /api/routes endpoint
    - Create PUT /api/routes/:id/assign-salesman endpoint
    - Write integration tests for route endpoints
    - _Requirements: 17.1_

- [x] 57. Implement route-based account management

  - [x] 57.1 Add route to Customer model

    - Add routeId field to Customer schema
    - Add validation for route existence
    - Write unit tests for route assignment
    - _Requirements: 17.2_

  - [x] 57.2 Create route-based account query
    - Implement getAccountsByRoute(routeId) method
    - Return all accounts on specified route
    - Write unit tests for route filtering
    - _Requirements: 17.2_

- [x] 58. Implement route-wise reporting

  - [x] 58.1 Create route-wise sales report

    - Implement getRouteSalesReport(routeId, dateRange) method
    - Aggregate sales by route
    - Show route-wise totals
    - Write unit tests for route sales reporting
    - _Requirements: 17.3_

  - [x] 58.2 Create route visit planning report

    - Implement getRouteDueInvoices(routeId) method
    - Show all due invoices on a route
    - Sort by priority
    - Write unit tests for visit planning
    - _Requirements: 17.4_

  - [x] 58.3 Create route performance report
    - Implement getRoutePerformance(routeId, dateRange) method
    - Compare route targets vs actuals
    - Show achievement percentage
    - Write unit tests for route performance
    - _Requirements: 17.5_

## Requirement 18: Quotation Rate History and PO Rate Lookup

- [x] 59. Create QuotationHistory model and service

  - [x] 59.1 Create QuotationHistory model

    - Define schema with itemId, partyId (customer/supplier), rate, date fields
    - Add transactionType field (sales/purchase)
    - Add quantity field
    - Write unit tests for QuotationHistory model
    - _Requirements: 18.1, 18.2_

  - [x] 59.2 Create quotation history tracking

    - Implement recordQuotationRate(invoice) method
    - Store rate history when invoice is created
    - Link to party and item
    - Write unit tests for history recording
    - _Requirements: 18.1, 18.2_

  - [x] 59.3 Create quotation history query service

    - Implement getQuotationHistory(itemId, partyId, limit) method
    - Return last N transactions with the party
    - Show rate, quantity, date
    - Write unit tests for history queries
    - _Requirements: 18.2_

  - [x] 59.4 Create quotation history API endpoint
    - Create GET /api/quotation-history endpoint
    - Accept itemId and partyId filters
    - Return rate history
    - Write integration tests for quotation history
    - _Requirements: 18.1, 18.2_

- [x] 60. Implement PO rate lookup

  - [x] 60.1 Create PO rate query service

    - Implement getPORate(itemId, supplierId) method
    - Find latest PO with the item and supplier
    - Return PO rate and quantity
    - Write unit tests for PO rate lookup
    - _Requirements: 18.3_

  - [x] 60.2 Create PO rate lookup API endpoint
    - Create GET /api/purchase-orders/rate-lookup endpoint
    - Accept itemId and supplierId parameters
    - Return PO rate and quantity
    - Write integration tests for PO rate lookup
    - _Requirements: 18.3_

- [x] 61. Implement rate copying functionality

  - [x] 61.1 Add rate suggestion to invoice creation

    - When adding item, suggest previous rates
    - Show quotation history rates
    - Show PO rates for purchases
    - Write unit tests for rate suggestion
    - _Requirements: 18.4_

  - [x] 61.2 Create item transaction history
    - Implement getItemTransactionHistory(itemId, partyId) method
    - Show last 10 transactions with party
    - Include rates, quantities, dates
    - Write unit tests for transaction history
    - _Requirements: 18.5_

## Requirement 19: Multiple Print Formats and Templates

- [x] 62. Implement print format system

  - [x] 62.1 Add print format field to Invoice

    - Add printFormat enum field (already added in model)
    - Add validation for print format values
    - Write unit tests for print format validation
    - _Requirements: 19.1_

  - [x] 62.2 Create print template service

    - Implement generatePrintData(invoiceId, format) method
    - Prepare data based on selected format
    - Include/exclude elements based on format
    - Write unit tests for print data generation
    - _Requirements: 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 19.9_

  - [x] 62.3 Implement logo inclusion logic

    - Include business logo for 'logo' and 'warranty_bill' formats
    - Exclude logo for 'letterhead' format
    - Write unit tests for logo inclusion
    - _Requirements: 19.2_

  - [x] 62.4 Implement thermal print format

    - Create compact format for thermal printers
    - Optimize layout for narrow paper
    - Write unit tests for thermal format
    - _Requirements: 19.4_

  - [x] 62.5 Implement estimate/quotation format

    - Mark invoice as "ESTIMATE" or "QUOTATION"
    - Exclude certain details for estimates
    - Write unit tests for estimate format
    - _Requirements: 19.5_

  - [x] 62.6 Implement voucher format

    - Create payment voucher layout
    - Include payment details
    - Write unit tests for voucher format
    - _Requirements: 19.6_

  - [x] 62.7 Implement store copy format

    - Create internal store copy layout
    - Include warehouse and batch details
    - Write unit tests for store copy format
    - _Requirements: 19.7_

  - [x] 62.8 Implement tax invoice format

    - Include all tax details prominently
    - Show tax registration numbers
    - Write unit tests for tax invoice format
    - _Requirements: 19.8_

  - [x] 62.9 Implement warranty bill format
    - Include warranty information
    - Include business logo
    - Write unit tests for warranty bill format
    - _Requirements: 19.9_

- [x] 63. Create print API endpoints

  - [x] 63.1 Create print endpoint

    - Create GET /api/invoices/:id/print endpoint
    - Accept format parameter
    - Return formatted print data
    - Write integration tests for print endpoint
    - _Requirements: 19.1_

  - [x] 63.2 Create PDF generation endpoint
    - Create GET /api/invoices/:id/pdf endpoint
    - Generate PDF based on format
    - Return PDF file
    - Write integration tests for PDF generation
    - _Requirements: 19.1_

## Requirement 20: Trade Offer (TO) Management System

- [x] 64. Implement trade offer system

  - [x] 64.1 Add TO fields to Invoice

    - Add to1Percent and to1Amount fields (already added)
    - Add to2Percent and to2Amount fields (already added)
    - Add validation for TO fields
    - Write unit tests for TO field validations
    - _Requirements: 20.1_

  - [x] 64.2 Create TO calculation service

    - Implement calculateTO1(amount, percent) method
    - Implement calculateTO2(amount, percent) method
    - Support both percentage and fixed amount
    - Write unit tests for TO calculations
    - _Requirements: 20.2, 20.3_

  - [x] 64.3 Update invoice calculation for TOs

    - Apply TO1 and TO2 to invoice total or line items
    - Update grand total calculation
    - Write unit tests for TO application
    - _Requirements: 20.3_

  - [x] 64.4 Link TOs to adjustment accounts

    - Validate adjustment account when TO is applied
    - Create ledger entries for TO amounts
    - Write unit tests for TO accounting
    - _Requirements: 20.4_

  - [x] 64.5 Create TO analysis report
    - Implement getTOAnalysis(dateRange) method
    - Show TO-wise breakdown
    - Calculate total TO amounts
    - Write unit tests for TO reporting
    - _Requirements: 20.5_

## Requirement 21: Scheme and Discount Claim System

- [x] 65. Create comprehensive scheme configuration

  - [x] 65.1 Extend SchemeDefinition model

    - Add companyId and groupId fields
    - Add schemeFormat field (e.g., "12+1")
    - Add discount2Percent field (e.g., 7.69%)
    - Add to2Percent and claimAccountId fields
    - Write unit tests for scheme configuration
    - _Requirements: 21.1, 21.2, 21.3, 21.4_

  - [x] 65.2 Create scheme auto-calculation service

    - Implement calculateSchemeBonus(quantity, schemeFormat) method
    - Parse scheme format (e.g., "12+1" means buy 12 get 1 free)
    - Calculate bonus quantity automatically
    - Write unit tests for scheme calculation
    - _Requirements: 21.2, 21.5_

  - [x] 65.3 Implement scheme application in invoices

    - Auto-apply scheme when quantity threshold is met
    - Calculate discount2 based on scheme configuration
    - Calculate TO2 if configured
    - Write unit tests for scheme application
    - _Requirements: 21.3, 21.4, 21.5_

  - [x] 65.4 Link schemes to claim accounts

    - Validate claimAccountId when scheme is applied
    - Create ledger entries in claim account
    - Write unit tests for scheme claim accounting
    - _Requirements: 21.6_

  - [x] 65.5 Create active schemes list
    - Implement getActiveSchemes(companyId) method
    - Filter by company and active status
    - Show all scheme details
    - Write unit tests for scheme listing
    - _Requirements: 21.7_

## Requirement 22: Bilty (Transport) Management System

- [x] 66. Implement bilty management

  - [x] 66.1 Add bilty fields to Invoice (already added)

    - Verify biltyNo, biltyDate, transportCompany, transportCharges fields
    - Add validation for bilty fields
    - Write unit tests for bilty field validations
    - _Requirements: 22.1_

  - [x] 66.2 Create bilty tracking service

    - Implement recordBilty(invoiceId, biltyData) method
    - Store transport details
    - Link bilty to purchase invoice
    - Write unit tests for bilty recording
    - _Requirements: 22.1, 22.2_

  - [x] 66.3 Create bilty status tracking

    - Add biltyStatus field (pending, in_transit, received)
    - Implement updateBiltyStatus(invoiceId, status) method
    - Write unit tests for status tracking
    - _Requirements: 22.3_

  - [x] 66.4 Link bilty to goods receipt

    - Update bilty status when goods are received
    - Link bilty to purchase invoice
    - Write unit tests for bilty-invoice linking
    - _Requirements: 22.4_

  - [x] 66.5 Create pending bilties report
    - Implement getPendingBilties() method
    - Show all bilties not yet received
    - Include transport details
    - Write unit tests for pending bilties
    - _Requirements: 22.5_

## Requirement 23: Income Tax Calculation (5.5%)

- [x] 67. Implement income tax calculation

  - [x] 67.1 Add income tax field to Invoice

    - Add incomeTax field to totals (already added)
    - Add validation for income tax
    - Write unit tests for income tax field
    - _Requirements: 23.1_

  - [x] 67.2 Create income tax calculation service

    - Implement calculateIncomeTax(amount) method
    - Apply 5.5% income tax rate
    - Write unit tests for income tax calculation
    - _Requirements: 23.1_

  - [x] 67.3 Update invoice calculation for income tax

    - Calculate income tax on applicable transactions
    - Add to invoice totals
    - Write unit tests for income tax application
    - _Requirements: 23.1_

  - [x] 67.4 Create income tax ledger entries

    - Create ledger entries for income tax
    - Debit income tax account
    - Write unit tests for income tax accounting
    - _Requirements: 23.3_

  - [x] 67.5 Create income tax report
    - Implement getIncomeTaxReport(dateRange) method
    - Separate income tax from other taxes
    - Show income tax deducted per account
    - Write unit tests for income tax reporting
    - _Requirements: 23.2, 23.4_

## Requirement 24: Dimension Tracking for Purchase Invoices

- [x] 68. Implement dimension tracking

  - [x] 68.1 Add dimension field (already added)

    - Verify dimension field in Invoice and InvoiceItem schemas
    - Add validation for dimension values
    - Write unit tests for dimension validation
    - _Requirements: 24.1_

  - [x] 68.2 Create dimension-wise reporting

    - Implement getDimensionReport(dimension, dateRange) method
    - Aggregate purchases by dimension
    - Show dimension-wise totals
    - Write unit tests for dimension reporting
    - _Requirements: 24.2_

  - [x] 68.3 Create dimension expense analysis

    - Implement getDimensionExpenses(dateRange) method
    - Filter expenses by dimension
    - Compare across dimensions
    - Write unit tests for expense analysis
    - _Requirements: 24.3_

  - [x] 68.4 Create dimension budget comparison
    - Implement compareDimensionBudget(dimension, dateRange) method
    - Compare actuals vs budget by dimension
    - Show variance
    - Write unit tests for budget comparison
    - _Requirements: 24.4_

## Requirement 25: SMS Messaging Integration

- [x] 69. Implement SMS integration

  - [x] 69.1 Create SMSLog model

    - Define schema with recipientId, phoneNumber, message, status fields
    - Add sentDate and deliveryStatus fields
    - Write unit tests for SMSLog model
    - _Requirements: 25.4_

  - [x] 69.2 Create SMS service

    - Implement sendSMS(phoneNumber, message) method
    - Integrate with SMS gateway API
    - Log SMS in database
    - Write unit tests for SMS sending
    - _Requirements: 25.2_

  - [x] 69.3 Create SMS template service

    - Implement getSMSTemplates() method
    - Create predefined message templates
    - Support template variables (name, amount, etc.)
    - Write unit tests for template service
    - _Requirements: 25.3_

  - [x] 69.4 Create send SMS API endpoint

    - Create POST /api/sms/send endpoint
    - Accept recipient, message, template parameters
    - Send SMS and return status
    - Write integration tests for SMS endpoint
    - _Requirements: 25.1, 25.2_

  - [x] 69.5 Add SMS to invoice list

    - Add "Send Message" option in invoice list
    - Use customer/supplier phone number
    - Allow custom or template message
    - Write integration tests for invoice SMS
    - _Requirements: 25.1_

  - [x] 69.6 Create SMS history view
    - Implement getSMSHistory(accountId) method
    - Show all SMS sent to account
    - Include message content and status
    - Write unit tests for SMS history
    - _Requirements: 25.5_

## Requirement 26: Enhanced Search and Filtering

- [x] 70. Implement advanced search and filtering

  - [x] 70.1 Create generic search service

    - Implement searchRecords(model, filters) method
    - Support multi-column filtering
    - Support text search across fields
    - Write unit tests for search service
    - _Requirements: 26.1, 26.2_

  - [x] 70.2 Add real-time filtering

    - Implement debounced search for performance
    - Filter results as user types
    - Write unit tests for real-time filtering
    - _Requirements: 26.2_

  - [x] 70.3 Implement multi-column filtering

    - Support filtering on multiple columns simultaneously
    - Combine filter criteria with AND logic
    - Write unit tests for multi-column filtering
    - _Requirements: 26.3_

  - [x] 70.4 Implement multi-column sorting

    - Support sorting by multiple columns
    - Allow ascending/descending per column
    - Write unit tests for multi-column sorting
    - _Requirements: 26.4_

  - [x] 70.5 Implement filtered export
    - Export only filtered results
    - Support CSV, Excel, PDF formats
    - Write unit tests for filtered export
    - _Requirements: 26.5_

## Requirement 27: Keyboard Shortcuts for Quick Operations

- [x] 71. Document keyboard shortcuts

  - [x] 71.1 Define keyboard shortcut mappings

    - Document Ctrl+S / F9 for Save
    - Document Ctrl+P for Print
    - Document F2 for Item History
    - Document F3 for Quotation Rate
    - Document F4 for PO Rate & Quantity
    - Document F5 for Refresh
    - Document Ctrl+F for Search
    - Document Esc for Cancel/Close
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 27.7_

  - [x] 71.2 Create API endpoints for shortcut actions
    - Create GET /api/quotation-history/item/:itemId endpoint (F2)
    - Create GET /api/quotation-history endpoint (F3)
    - Create GET /api/purchase-orders/rate-lookup endpoint (F4)
    - Ensure endpoints return data quickly for shortcuts
    - Write integration tests for shortcut endpoints
    - _Requirements: 27.2, 27.3, 27.4, 27.5_

## Requirement 28: Automatic Carton Quantity Calculation

- [x] 72. Implement carton calculation

  - [x] 72.1 Add carton calculation logic

    - Implement calculateCartonQty(boxQty, packSize) method
    - Auto-calculate when boxQty changes
    - Store in cartonQty field (already added)
    - Write unit tests for carton calculation
    - _Requirements: 28.1, 28.2_

  - [x] 72.2 Display carton, box, and unit quantities

    - Show all three quantities in invoice display
    - Update calculations when any quantity changes
    - Write unit tests for quantity display
    - _Requirements: 28.3_

  - [x] 72.3 Include carton quantity in reports
    - Show carton, box, and unit quantities in reports
    - Support filtering by carton quantity
    - Write unit tests for carton reporting
    - _Requirements: 28.4_

## Requirement 29: Previous Balance Display on Invoices

- [x] 73. Implement previous balance display

  - [x] 73.1 Add previous balance calculation

    - Implement calculatePreviousBalance(accountId, invoiceDate) method
    - Calculate balance before current invoice
    - Store in previousBalance field (already added)
    - Write unit tests for balance calculation
    - _Requirements: 29.1_

  - [x] 73.2 Display previous and current balance

    - _Requirements: 29.5_

## Requirement 30: Due Invoice Quantity Tracking

- [x] 74. Implement due invoice tracking

  - [x] 74.1 Add due invoice count to Customer model

    - Add dueInvoiceQty field (already added in requirements)
    - Update count when invoice becomes due
    - Update count when payment received
    - Write unit tests for due invoice counting
    - _Requirements: 30.1, 30.2, 30.3_

  - [x] 74.2 Create due invoice update service

    - Implement updateDueInvoiceCount(customerId) method
    - Recalculate due invoice count
    - Update customer record
    - Write unit tests for count updates
    - _Requirements: 30.2, 30.3_

  - [x] 74.3 Create customers with most due invoices report

    - Implement getCustomersByDueInvoices() method
    - Sort customers by due invoice count
    - Show top customers with most dues
    - Write unit tests for due invoice reporting
    - _Requirements: 30.4_

  - [x] 74.4 Add due invoice count filtering
    - Support filtering customers by due invoice count
    - Allow range filtering (e.g., 5-10 due invoices)
    - Write unit tests for due invoice filtering
    - _Requirements: 30.5_

## Requirement 31: Estimate/Quotation Printing

- [x] 75. Implement estimate printing

  - [x] 75.1 Add estimate flag to Invoice

    - Add estimatePrint field (already added)
    - Mark invoice as draft when estimate
    - Write unit tests for estimate flag
    - _Requirements: 31.1_

  - [x] 75.2 Create estimate print format

    - Mark printout as "ESTIMATE" or "QUOTATION"
    - Exclude certain details for estimates
    - Write unit tests for estimate format
    - _Requirements: 31.2_

  - [x] 75.3 Implement estimate to invoice conversion

    - Create convertEstimateToInvoice(estimateId) method
    - Change status from draft to confirmed
    - Generate final invoice number
    - Write unit tests for conversion
    - _Requirements: 31.3_

  - [x] 75.4 Create pending estimates list

    - Implement getPendingEstimates() method
    - Show all draft/estimate invoices
    - Write unit tests for estimate listing
    - _Requirements: 31.4_

  - [x] 75.5 Implement estimate expiry
    - Add expiryDate field for estimates
    - Flag expired estimates
    - Write unit tests for expiry checking
    - _Requirements: 31.5_

## Requirement 32: Warranty Information Management

- [x] 76. Implement warranty management

  - [x] 76.1 Add warranty fields (already added)

    - Verify warrantyInfo and warrantyPaste fields in Invoice
    - Verify warrantyMonths and warrantyDetails in InvoiceItem
    - Write unit tests for warranty fields
    - _Requirements: 32.1_

  - [x] 76.2 Create warranty entry interface

    - Support paste or manual entry of warranty info
    - Store warranty text at invoice level
    - Store warranty details at item level
    - Write unit tests for warranty entry
    - _Requirements: 32.1_

  - [x] 76.3 Include warranty on invoice print

    - Add warranty details to print if warrantyPaste is true
    - Use warranty bill format with logo
    - Write unit tests for warranty print
    - _Requirements: 32.2, 32.3_

  - [x] 76.4 Display warranty information

    - Show warranty info in invoice display
    - Show warranty months per item
    - Write unit tests for warranty display
    - _Requirements: 32.4_

  - [x] 76.5 Auto-populate default warranty
    - If item has default warranty, auto-populate
    - Allow override of default warranty
    - Write unit tests for default warranty
    - _Requirements: 32.5_


## Requirement 33: Note/Memo Field for Invoices

- [x] 77. Implement notes/memo functionality

  - [x] 77.1 Add memo field (already added as memoNo)

    - Verify notes and memoNo fields in Invoice
    - Support multi-line text for notes
    - Write unit tests for notes field
    - _Requirements: 33.1, 33.2_

  - [x] 77.2 Include notes on printout

    - Add notes section to invoice print
    - Display prominently on printout
    - Write unit tests for notes printing
    - _Requirements: 33.3_

  - [x] 77.3 Implement notes search

    - Support searching invoices by note content
    - Add full-text search on notes field
    - Write unit tests for notes search
    - _Requirements: 33.4_

  - [x] 77.4 Display notes in invoice view
    - Show notes prominently in invoice display
    - Support editing notes
    - Write unit tests for notes display

- 

- [x] 80. Update API documentation

  - [x] 80.1 Document all  endpoints

    - Document warehouse endpoints
    - Document salesman and route endpoints
    - Document scheme and TO endpoints
    - Document recovery summary endpoints
    - Include request/response examples
    - _Requirements: All requirements_

  - [x] 80.2 Create Phase 1 and 2 API usage guide

    - Document common Phase 1 and 2 workflows
    - Provide code examples
    - Document keyboard shortcuts
    - Document print formats
    - _Requirements: All requirements_

  - [x] 80.3 Update Swagger documentation
    - Add all Phase 2 endpoints to Swagger
    - Document new request/response schemas
    - Add examples for complex operations
    - _Requirements: All requirements_
