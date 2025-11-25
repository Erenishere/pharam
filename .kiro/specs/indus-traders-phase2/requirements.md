# Requirements Document - Phase 2 Enhancements

## Introduction

This document outlines Phase 2 enhancements for the Indus Traders Backend system. Phase 2 builds upon the existing core ERP functionality to add advanced features including sales returns, purchase returns, enhanced tax management, scheme/bonus tracking, post-dated cheque management, salesman management, and multi-warehouse support.

## Requirements

### Requirement 1: Enhanced Sales Invoice System with Returns

**User Story:** As a sales staff member, I want to create both sales and return invoices with advanced features like schemes, multiple discounts, and barcode scanning, so that I can handle complex sales scenarios efficiently.

#### Acceptance Criteria

1. WHEN creating an invoice THEN the system SHALL allow selection between "New Sales" and "Return Sales"
2. WHEN adding items THEN the system SHALL support barcode scanning for quick item entry
3. WHEN selecting items THEN the system SHALL display available quantity by warehouse
4. WHEN entering quantities THEN the system SHALL support both Box and Unit quantities with separate rates
5. WHEN applying discounts THEN the system SHALL support two discount levels (regular and claim-based)
6. WHEN applying schemes THEN the system SHALL track Scheme 1 (regular) and Scheme 2 (claim) separately
7. WHEN calculating tax THEN the system SHALL apply GST 18% and Advance Tax (0.5% or 2.5% based on account registration)
8. WHEN account is non-filer THEN the system SHALL apply additional 0.1% GST
9. WHEN creating return invoice THEN the system SHALL reverse inventory and create negative ledger entries
10. WHEN saving invoice THEN the system SHALL link to P/O number if created from purchase order
11. WHEN printing invoice THEN the system SHALL include warranty information and business logo

### Requirement 2: Enhanced Purchase Invoice System with Returns

**User Story:** As a purchase staff member, I want to create purchase and return invoices with multiple GST rates and scheme tracking, so that I can accurately record supplier transactions.

#### Acceptance Criteria

1. WHEN creating purchase invoice THEN the system SHALL allow selection between "New Purchase" and "Purchase Return"
2. WHEN entering items THEN the system SHALL support dual GST rates (18% and 4%)
3. WHEN recording purchase THEN the system SHALL capture supplier bill number
4. WHEN applying schemes THEN the system SHALL track scheme quantities separately
5. WHEN creating return THEN the system SHALL reverse inventory and payables
6. WHEN saving invoice THEN the system SHALL record dimension information
7. WHEN calculating totals THEN the system SHALL handle multiple discount levels and GST rates
8. WHEN receiving warranty THEN the system SHALL store warranty information

### Requirement 3: Multi-Warehouse Inventory Management

**User Story:** As an inventory manager, I want to track stock across multiple warehouses with batch and expiry details, so that I can manage inventory at different locations.

#### Acceptance Criteria

1. WHEN viewing item stock THEN the system SHALL display quantity by warehouse
2. WHEN creating invoice THEN the system SHALL allow warehouse selection per line item
3. WHEN transferring stock THEN the system SHALL update quantities in both warehouses
4. WHEN checking availability THEN the system SHALL show warehouse-wise stock levels
5. WHEN batch expires THEN the system SHALL flag expired items by warehouse

### Requirement 4: Scheme and Bonus Management

**User Story:** As a sales manager, I want to track promotional schemes and bonuses separately from regular discounts, so that I can manage promotional campaigns effectively.

#### Acceptance Criteria

1. WHEN applying scheme THEN the system SHALL track Scheme 1 (regular bonus) quantities
2. WHEN applying claim scheme THEN the system SHALL track Scheme 2 (claim-based) quantities
3. WHEN calculating invoice THEN the system SHALL separate scheme items from regular items
4. WHEN generating reports THEN the system SHALL show scheme-wise analysis
5. WHEN claiming schemes THEN the system SHALL link to claim account

### Requirement 5: Advanced Discount Management

**User Story:** As a sales staff member, I want to apply multiple discount levels with different claim accounts, so that I can handle various discount scenarios.

#### Acceptance Criteria

1. WHEN applying discount THEN the system SHALL support Discount 1 (regular) at line level
2. WHEN applying claim discount THEN the system SHALL support Discount 2 (claim-based) at line level
3. WHEN selecting claim account THEN the system SHALL link discount to specific account
4. WHEN calculating totals THEN the system SHALL apply discounts in sequence
5. WHEN generating reports THEN the system SHALL show discount-wise breakdown

### Requirement 6: Enhanced Tax Management

**User Story:** As an accountant, I want to handle multiple tax rates and advance tax based on account registration, so that I can ensure tax compliance.

#### Acceptance Criteria

1. WHEN calculating GST THEN the system SHALL apply 18% GST on sales
2. WHEN calculating purchase GST THEN the system SHALL support both 18% and 4% rates
3. WHEN account has advance tax status THEN the system SHALL apply 0.5% or 2.5% advance tax
4. WHEN account is non-filer THEN the system SHALL apply additional 0.1% GST
5. WHEN generating tax reports THEN the system SHALL separate regular GST, advance tax, and non-filer GST

### Requirement 7: Post-Dated Cheque Management

**User Story:** As a cashier, I want to manage post-dated cheques with bank details and clearance tracking, so that I can monitor cheque payments.

#### Acceptance Criteria

1. WHEN recording cash receipt THEN the system SHALL allow post-dated cheque entry
2. WHEN entering cheque THEN the system SHALL capture bank name, cheque number, and post date
3. WHEN cheque clears THEN the system SHALL update status to "cleared"
4. WHEN cheque bounces THEN the system SHALL reverse the receipt entry
5. WHEN viewing pending cheques THEN the system SHALL show all post-dated cheques by due date

### Requirement 8: Enhanced Cash Book with Invoice Aging

**User Story:** As an accountant, I want to apply payments against specific invoices with aging details, so that I can track receivables accurately.

#### Acceptance Criteria

1. WHEN recording receipt THEN the system SHALL display all pending invoices for the account
2. WHEN viewing invoices THEN the system SHALL show days old for each invoice
3. WHEN applying payment THEN the system SHALL allow partial payment against multiple invoices
4. WHEN payment differs from invoice THEN the system SHALL track difference amount
5. WHEN generating aging report THEN the system SHALL show receivables by age buckets

### Requirement 9: Salesman Management and Assignment

**User Story:** As a sales manager, I want to assign salesmen to invoices and track their performance, so that I can manage the sales team effectively.

#### Acceptance Criteria

1. WHEN creating invoice THEN the system SHALL allow salesman selection
2. WHEN recording cash receipt THEN the system SHALL link to salesman
3. WHEN generating reports THEN the system SHALL show salesman-wise sales and collection
4. WHEN viewing salesman performance THEN the system SHALL display targets vs actuals
5. WHEN calculating commission THEN the system SHALL use salesman-specific rates

### Requirement 10: Purchase Order Integration

**User Story:** As a purchase staff member, I want to create purchase orders and convert them to invoices, so that I can manage the procurement process.

#### Acceptance Criteria

1. WHEN creating P/O THEN the system SHALL generate unique P/O number
2. WHEN P/O is approved THEN the system SHALL allow conversion to purchase invoice
3. WHEN creating invoice from P/O THEN the system SHALL auto-populate P/O details
4. WHEN receiving partial delivery THEN the system SHALL track P/O fulfillment status
5. WHEN viewing P/O THEN the system SHALL show pending quantity

### Requirement 11: Adjustment Account Management

**User Story:** As an accountant, I want to use adjustment accounts for discounts and claims, so that I can properly account for promotional expenses.

#### Acceptance Criteria

1. WHEN applying discount THEN the system SHALL allow adjustment account selection
2. WHEN posting invoice THEN the system SHALL create entries in adjustment account
3. WHEN generating reports THEN the system SHALL show adjustment account balances
4. WHEN reconciling THEN the system SHALL match discounts to adjustment accounts

### Requirement 12: Dual Unit System (Box and Unit)

**User Story:** As a sales staff member, I want to sell items in both boxes and units with different rates, so that I can handle wholesale and retail sales.

#### Acceptance Criteria

1. WHEN adding item THEN the system SHALL allow entry of box quantity and unit quantity
2. WHEN setting rates THEN the system SHALL support separate box rate and unit rate
3. WHEN calculating total THEN the system SHALL compute (box qty × box rate) + (unit qty × unit rate)
4. WHEN updating inventory THEN the system SHALL convert boxes to units based on pack size
5. WHEN generating reports THEN the system SHALL show both box and unit quantities

### Requirement 13: Barcode Integration

**User Story:** As a sales staff member, I want to scan barcodes to quickly add items to invoices, so that I can speed up the billing process.

#### Acceptance Criteria

1. WHEN scanning barcode THEN the system SHALL identify the item
2. WHEN item is found THEN the system SHALL auto-populate item details
3. WHEN item has multiple batches THEN the system SHALL show batch selection
4. WHEN barcode is invalid THEN the system SHALL show error message
5. WHEN scanning multiple items THEN the system SHALL accumulate quantities

### Requirement 14: Enhanced Reporting with New Dimensions

**User Story:** As management, I want comprehensive reports including salesman performance, scheme analysis, and warehouse-wise stock, so that I can make informed decisions.

#### Acceptance Criteria

1. WHEN generating sales report THEN the system SHALL include salesman dimension
2. WHEN viewing scheme report THEN the system SHALL show scheme-wise quantities and amounts
3. WHEN checking inventory THEN the system SHALL display warehouse-wise stock levels
4. WHEN analyzing discounts THEN the system SHALL show discount type and claim account
5. WHEN reviewing tax THEN the system SHALL separate GST, advance tax, and non-filer tax

## Business Rules

### Invoice Business Rules

1. Return invoices must reference original invoice
2. Return quantity cannot exceed original invoice quantity
3. Box quantity must be converted to units for inventory updates
4. Scheme quantities are tracked separately and don't affect regular inventory
5. Discount 2 (claim) requires claim account selection

### Tax Business Rules

1. Advance tax rate (0.5% or 2.5%) is determined by account registration
2. Non-filer GST (0.1%) is additional to regular GST
3. Purchase invoices can have items with different GST rates (18% or 4%)
4. Tax is calculated after all discounts

### Cheque Business Rules

1. Post-dated cheques don't update cash balance until post date
2. Bounced cheques reverse the original receipt entry
3. Cheques can only be cleared on or after post date

### Warehouse Business Rules

1. Each line item can be from a different warehouse
2. Stock transfers require both source and destination warehouse
3. Warehouse-wise stock cannot go negative

### Salesman Business Rules

1. Each invoice must have an assigned salesman
2. Cash receipts are linked to salesman for commission calculation
3. Salesman performance is measured by sales and collections

## Data Requirements

### New Fields for Invoice

- invoiceType: "sales" | "return_sales" | "purchase" | "return_purchase"
- salesmanId: Reference to Salesman
- poNumber: Reference to Purchase Order
- supplierBillNo: String (for purchase invoices)
- adjustmentAccountId: Reference to Account
- claimAccountId: Reference to Account
- memoNo: String
- creditDays: Number
- warrantyInfo: String
- businessLogo: String (URL or base64)
- nonFilerGST: Number (0.1%)
- dimension: String

### New Fields for Invoice Items

- warehouseId: Reference to Warehouse
- boxQuantity: Number
- unitQuantity: Number
- boxRate: Number
- unitRate: Number
- scheme1Quantity: Number
- scheme2Quantity: Number (claim)
- discount1Percent: Number
- discount1Amount: Number
- discount2Percent: Number (claim)
- discount2Amount: Number (claim)
- gst18Percent: Boolean
- gst4Percent: Boolean (for purchase)
- advanceTaxPercent: Number (0.5 or 2.5)
- advanceTaxAmount: Number

### New Fields for Cash Receipt/Payment

- postDatedCheque: Boolean
- chequeDate: Date
- bankName: String
- chequeNumber: String
- chequeStatus: "pending" | "cleared" | "bounced"
- clearedDate: Date
- invoicePayments: Array of {invoiceId, daysOld, dueAmount, paidAmount, difference}

### New Models Required

- Salesman
- PurchaseOrder
- Warehouse
- SchemeDefinition
- AdjustmentAccount (extends Account)

## Integration Points

1. **Barcode Scanner Integration**: API endpoint to receive barcode scans
2. **Warehouse Management**: Integration with warehouse module
3. **Salesman Module**: Integration with salesman management
4. **Purchase Order System**: Link between P/O and invoices
5. **Cheque Clearing**: Integration with bank reconciliation

## Compliance Requirements

### Pakistani Tax Compliance

1. Support for multiple GST rates (18%, 4%)
2. Advance tax calculation based on registration status
3. Non-filer additional GST (0.1%)
4. Proper tax reporting for SRB/FBR

### Audit Requirements

1. Track all return invoices with original invoice reference
2. Maintain scheme and discount audit trail
3. Record all cheque status changes
4. Log warehouse transfers

## Performance Requirements

1. Barcode scanning should respond within 500ms
2. Invoice creation with 50 line items should complete within 3 seconds
3. Warehouse-wise stock query should return within 1 second
4. Salesman performance report should generate within 5 seconds

## Security Requirements

1. Only authorized users can create return invoices
2. Scheme and discount limits based on user role
3. Warehouse transfers require approval
4. Cheque management restricted to finance role

### Requirement 15: Cash Recovery Summary System

**User Story:** As a sales manager, I want to track cash recovery by salesman and town, so that I can monitor collection performance.

#### Acceptance Criteria

1. WHEN creating recovery summary THEN the system SHALL allow date and salesman selection
2. WHEN selecting town THEN the system SHALL show all accounts in that town
3. WHEN viewing summary THEN the system SHALL display total invoice amount, balance, and recovery amount
4. WHEN adding sub-accounts THEN the system SHALL allow multiple account entries
5. WHEN saving summary THEN the system SHALL create recovery records
6. WHEN viewing list THEN the system SHALL show date, salesman, town, and total summary
7. WHEN printing THEN the system SHALL generate recovery summary report

### Requirement 16: Enhanced Account Registration with Tax Details

**User Story:** As an accountant, I want to store complete tax registration details for accounts, so that I can ensure proper tax compliance.

#### Acceptance Criteria

1. WHEN registering account THEN the system SHALL capture License No, SRB No, NTN, STRN
2. WHEN entering details THEN the system SHALL store WHT%, NIC#, Route information
3. WHEN setting credit THEN the system SHALL record credit limit and credit days
4. WHEN viewing account THEN the system SHALL display all tax registration details
5. WHEN creating invoice THEN the system SHALL auto-populate tax details from account

### Requirement 17: Route Management for Salesmen

**User Story:** As a sales manager, I want to assign routes to salesmen and track route-wise performance, so that I can optimize territory coverage.

#### Acceptance Criteria

1. WHEN creating salesman THEN the system SHALL allow route assignment
2. WHEN viewing route THEN the system SHALL show all accounts on that route
3. WHEN generating reports THEN the system SHALL provide route-wise sales analysis
4. WHEN planning visits THEN the system SHALL show due invoices by route
5. WHEN tracking performance THEN the system SHALL compare route targets vs actuals

### Requirement 18: Quotation Rate History and PO Rate Lookup

**User Story:** As a sales staff member, I want to quickly view previous quotation rates and PO rates for items, so that I can offer consistent pricing.

#### Acceptance Criteria

1. WHEN adding item to invoice THEN the system SHALL provide shortcut to view quotation history
2. WHEN viewing history THEN the system SHALL show previous selling/purchase rates with party
3. WHEN checking PO THEN the system SHALL display PO rate and quantity via shortcut
4. WHEN selecting rate THEN the system SHALL allow copying rate to current invoice
5. WHEN viewing item history THEN the system SHALL show last 10 transactions with the party

### Requirement 19: Multiple Print Formats and Templates

**User Story:** As a user, I want multiple print format options for invoices, so that I can meet different business needs.

#### Acceptance Criteria

1. WHEN printing invoice THEN the system SHALL offer multiple format options
2. WHEN selecting "Print With Logo" THEN the system SHALL include business logo
3. WHEN selecting "Letter Head Print" THEN the system SHALL use letterhead template
4. WHEN selecting "Thermal Print" THEN the system SHALL use thermal printer format
5. WHEN selecting "Estimate Print" THEN the system SHALL print as estimate/quotation
6. WHEN selecting "Voucher Print" THEN the system SHALL print payment voucher format
7. WHEN selecting "Store Copy" THEN the system SHALL print store copy
8. WHEN selecting "Sale Tax Invoice Print" THEN the system SHALL print tax invoice format
9. WHEN selecting "Warranty Bill Print" THEN the system SHALL include warranty details

### Requirement 20: Trade Offer (TO) Management System

**User Story:** As a sales manager, I want to manage trade offers with percentage or amount discounts, so that I can run promotional campaigns.

#### Acceptance Criteria

1. WHEN applying TO THEN the system SHALL support TO1 and TO2 (two trade offer levels)
2. WHEN configuring TO THEN the system SHALL allow percentage or fixed amount
3. WHEN calculating TO THEN the system SHALL apply on invoice total or line item
4. WHEN selecting TO THEN the system SHALL link to adjustment account
5. WHEN generating reports THEN the system SHALL show TO-wise analysis

### Requirement 21: Scheme and Discount Claim System

**User Story:** As a sales manager, I want to configure company-specific schemes and discounts with claim accounts, so that I can manage promotional programs.

#### Acceptance Criteria

1. WHEN creating scheme THEN the system SHALL allow company and group selection
2. WHEN defining scheme THEN the system SHALL support formats like "12+1" (buy 12 get 1 free)
3. WHEN setting discount THEN the system SHALL configure Discount 2 with percentage (e.g., 7.69%)
4. WHEN configuring TO THEN the system SHALL set TO2 with claim account
5. WHEN applying scheme THEN the system SHALL auto-calculate based on quantity
6. WHEN claiming THEN the system SHALL link to sub-account for claim processing
7. WHEN viewing list THEN the system SHALL show all active schemes by company

### Requirement 22: Bilty (Transport) Management System

**User Story:** As a logistics coordinator, I want to manage bilty (transport receipts) for goods sent/received, so that I can track shipments.

#### Acceptance Criteria

1. WHEN creating purchase invoice THEN the system SHALL allow Bilty No entry
2. WHEN recording bilty THEN the system SHALL capture transport company, date, and charges
3. WHEN tracking shipment THEN the system SHALL show bilty status
4. WHEN receiving goods THEN the system SHALL link bilty to purchase invoice
5. WHEN generating reports THEN the system SHALL show pending bilties

### Requirement 23: Income Tax Calculation (5.5%)

**User Story:** As an accountant, I want to calculate income tax at 5.5% on applicable transactions, so that I can ensure tax compliance.

#### Acceptance Criteria

1. WHEN applicable THEN the system SHALL calculate 5.5% income tax
2. WHEN generating tax report THEN the system SHALL separate income tax from other taxes
3. WHEN posting invoice THEN the system SHALL create income tax ledger entries
4. WHEN viewing account THEN the system SHALL show income tax deducted

### Requirement 24: Dimension Tracking for Purchase Invoices

**User Story:** As a purchase manager, I want to track dimensions (like project, department, or cost center) for purchases, so that I can analyze costs by dimension.

#### Acceptance Criteria

1. WHEN creating purchase invoice THEN the system SHALL allow dimension selection
2. WHEN generating reports THEN the system SHALL provide dimension-wise analysis
3. WHEN viewing expenses THEN the system SHALL filter by dimension
4. WHEN budgeting THEN the system SHALL compare actuals vs budget by dimension

### Requirement 25: SMS Messaging Integration

**User Story:** As a user, I want to send SMS messages to customers/suppliers directly from the system, so that I can communicate quickly.

#### Acceptance Criteria

1. WHEN viewing invoice list THEN the system SHALL provide "Send Message" option
2. WHEN sending SMS THEN the system SHALL use stored phone numbers
3. WHEN composing message THEN the system SHALL allow custom text or templates
4. WHEN message sent THEN the system SHALL log SMS history
5. WHEN viewing account THEN the system SHALL show SMS communication history

### Requirement 26: Enhanced Search and Filtering

**User Story:** As a user, I want advanced search and filtering across all columns, so that I can quickly find specific records.

#### Acceptance Criteria

1. WHEN viewing any list THEN the system SHALL provide search boxes for all columns
2. WHEN entering search text THEN the system SHALL filter results in real-time
3. WHEN applying multiple filters THEN the system SHALL combine filter criteria
4. WHEN sorting THEN the system SHALL allow multi-column sorting
5. WHEN exporting THEN the system SHALL export filtered results

### Requirement 27: Keyboard Shortcuts for Quick Operations

**User Story:** As a data entry operator, I want keyboard shortcuts for common operations, so that I can work faster.

#### Acceptance Criteria

1. WHEN creating invoice THEN the system SHALL support shortcut keys for common actions
2. WHEN adding items THEN the system SHALL provide shortcut for item search
3. WHEN viewing history THEN the system SHALL provide shortcut for price history popup
4. WHEN checking quotation THEN the system SHALL provide shortcut for quotation rate lookup
5. WHEN checking PO THEN the system SHALL provide shortcut for PO rate and quantity
6. WHEN saving THEN the system SHALL support Ctrl+S or F9 for save
7. WHEN printing THEN the system SHALL support Ctrl+P for print

### Requirement 28: Automatic Carton Quantity Calculation

**User Story:** As a sales staff member, I want the system to automatically calculate carton quantity from box quantity, so that I can track packaging.

#### Acceptance Criteria

1. WHEN entering box quantity THEN the system SHALL auto-calculate carton quantity
2. WHEN item has pack size THEN the system SHALL use pack size for conversion
3. WHEN viewing invoice THEN the system SHALL display carton, box, and unit quantities
4. WHEN generating reports THEN the system SHALL show quantities in all units

### Requirement 29: Previous Balance Display on Invoices

**User Story:** As a sales staff member, I want to see the customer's previous balance when creating an invoice, so that I can make informed credit decisions.

#### Acceptance Criteria

1. WHEN selecting customer THEN the system SHALL display previous balance
2. WHEN viewing balance THEN the system SHALL show current bill amount separately
3. WHEN checking credit THEN the system SHALL show available credit limit
4. WHEN balance exceeds limit THEN the system SHALL show warning
5. WHEN printing invoice THEN the system SHALL include previous balance on printout

### Requirement 30: Due Invoice Quantity Tracking

**User Story:** As a sales manager, I want to track the number of due invoices per customer, so that I can prioritize collections.

#### Acceptance Criteria

1. WHEN viewing customer THEN the system SHALL display due invoice quantity
2. WHEN invoice becomes overdue THEN the system SHALL increment due count
3. WHEN payment received THEN the system SHALL update due invoice count
4. WHEN generating reports THEN the system SHALL show customers with most due invoices
5. WHEN filtering THEN the system SHALL allow filtering by due invoice count

### Requirement 31: Estimate/Quotation Printing

**User Story:** As a sales staff member, I want to print invoices as estimates or quotations before finalizing, so that I can provide price quotes to customers.

#### Acceptance Criteria

1. WHEN invoice is in draft THEN the system SHALL allow printing as estimate
2. WHEN printing estimate THEN the system SHALL mark as "ESTIMATE" or "QUOTATION"
3. WHEN estimate is approved THEN the system SHALL convert to final invoice
4. WHEN viewing estimates THEN the system SHALL show all pending estimates
5. WHEN estimate expires THEN the system SHALL flag expired estimates

### Requirement 32: Warranty Information Management

**User Story:** As a sales staff member, I want to attach warranty information to invoices, so that customers have warranty details.

#### Acceptance Criteria

1. WHEN creating invoice THEN the system SHALL allow warranty info entry (paste or not paste)
2. WHEN printing invoice THEN the system SHALL include warranty details if selected
3. WHEN printing warranty bill THEN the system SHALL use warranty bill format with logo
4. WHEN viewing invoice THEN the system SHALL display warranty information
5. WHEN item has default warranty THEN the system SHALL auto-populate warranty text

### Requirement 33: Note/Memo Field for Invoices

**User Story:** As a user, I want to add notes or memos to invoices, so that I can record special instructions or comments.

#### Acceptance Criteria

1. WHEN creating invoice THEN the system SHALL provide note/memo field
2. WHEN entering note THEN the system SHALL allow multi-line text
3. WHEN printing invoice THEN the system SHALL include notes on printout
4. WHEN searching THEN the system SHALL allow searching by note content
5. WHEN viewing invoice THEN the system SHALL display notes prominently

## Additional Data Requirements

### Enhanced Account Fields

- licenseNo: String
- srbNo: String (SRB registration)
- ntn: String (National Tax Number)
- strn: String (Sales Tax Registration Number)
- whtPercent: Number (Withholding Tax %)
- nicNumber: String (National Identity Card)
- route: String
- dueInvoiceQty: Number (count of due invoices)

### Enhanced Invoice Fields

- biltyNo: String (for purchase invoices)
- dimension: String (for cost center/project tracking)
- supplierBillNo: String
- to1Percent: Number (Trade Offer 1 %)
- to1Amount: Number
- to2Percent: Number (Trade Offer 2 %)
- to2Amount: Number
- incomeTax: Number (5.5%)
- cartonQty: Number (auto-calculated)
- warrantyInfo: String
- warrantyPaste: Boolean
- estimatePrint: Boolean
- printFormat: String (logo, letterhead, thermal, etc.)

### New Models Required

- RecoverySummary
- Route
- SchemeDefinition
- TradeOffer
- Bilty
- SMSLog
- QuotationHistory

## Keyboard Shortcuts

| Shortcut    | Action                  |
| ----------- | ----------------------- |
| Ctrl+S / F9 | Save Invoice            |
| Ctrl+P      | Print Invoice           |
| F2          | View Item History       |
| F3          | View Quotation Rate     |
| F4          | View PO Rate & Quantity |
| F5          | Refresh List            |
| Ctrl+F      | Search/Filter           |
| Esc         | Cancel/Close            |

## Print Format Options

1. **Print With Logo** - Standard invoice with business logo
2. **Letter Head Print** - Uses company letterhead
3. **Thermal Print** - Compact format for thermal printers
4. **Estimate Print** - Quotation/estimate format
5. **Voucher Print** - Payment voucher format
6. **Store Copy** - Internal store copy
7. **Sale Tax Invoice Print** - Tax invoice format
8. **Warranty Bill Print With Logo** - Invoice with warranty details

## Integration Requirements

1. **SMS Gateway Integration** - For sending SMS messages
2. **Barcode Scanner Integration** - For item scanning
3. **Thermal Printer Integration** - For thermal printing
4. **Transport System Integration** - For bilty management
5. **Quotation System Integration** - For rate history lookup
