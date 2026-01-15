# Changelog - Customer & Supplier Filtering Fixes

## 📅 Date: 2026-01-12

### 🐛 Bug Fixes
- **Corrected Record Counting**: Fixed a critical bug in `customerRepository` and `supplierRepository` where the `count()` method was using raw filter objects (including invalid fields like empty strings) instead of built MongoDB queries. This caused the total count to effectively filter out all records when no type was selected.
- **Fixed Seeder Logic**: Updated `userSeeder.js` to correctly hash passwords when seeding the database. Previously, users were inserted with plain-text passwords, causing login failures.
- **Fixed Server Crash**: Resolved a crash in `smsRoutes.js` caused by an undefined `protect` middleware import (replaced with `authenticate`).

### ✨ Enhancements
- **Inclusive Filtering Logic**: Updated the filtering behavior for `customer` and `supplier` types.
  - Selecting **Type: Customer** now includes records with `type: 'customer'` AND `type: 'both'`.
  - Selecting **Type: Supplier** now includes records with `type: 'supplier'` AND `type: 'both'`.
  - This ensures "Both" accounts are visible in standard lists without needing a specific "Both" filter.

### 🛠 Technical Refactoring
- **Unified Query Building**: Extracted query construction logic into a private `_buildQuery()` method in both repositories. This ensures the `search()` (list) and `count()` (pagination) methods always use identical logic, preventing mismatched data and counts.

### ✅ Verification
- Validated "No Filter" scenario returns all records (4 records).
- Validated "Customer Filter" returns 3 records (2 Customers + 1 Both).
- Validated "Supplier Filter" returns 2 records (1 Supplier + 1 Both).
