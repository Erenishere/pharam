# Keyboard Shortcuts Reference

## Overview

This document lists all keyboard shortcuts available in the Indus Traders application for faster data entry and navigation.

## Invoice Entry Screen

### Function Keys

| Shortcut | Action | Description |
|----------|--------|-------------|
| **F2** | Item Quotation History | View quotation history for the selected item |
| **F3** | All Quotation Rates | View all quotation rates across items |
| **F4** | PO Rate & Quantity | View purchase order rate and quantity for item |
| **F5** | Refresh | Refresh current data/screen |

### Control Keys

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Ctrl+F** | Search | Open search dialog |
| **Ctrl+S** | Save | Save current invoice (draft) |
| **Ctrl+Enter** | Confirm | Confirm current invoice |
| **Ctrl+P** | Print | Open print dialog |
| **Ctrl+N** | New | Create new invoice |

### Navigation Keys

| Shortcut | Action | Description |
|----------|--------|-------------|
| **Esc** | Cancel/Close | Close current dialog or cancel operation |
| **Tab** | Next Field | Move to next input field |
| **Shift+Tab** | Previous Field | Move to previous input field |
| **Enter** | Confirm/Next | Confirm current entry or move to next line |

## Detailed Shortcut Usage

### F2 - Item Quotation History

**When to use**: During invoice entry, when you need to see previous quotation rates for an item.

**How it works**:
1. Place cursor on item field
2. Press F2
3. View list of previous quotations with dates and rates
4. Select desired rate to auto-fill

**API Endpoint**: `GET /api/quotation-history/item/:itemId`

### F3 - All Quotation Rates

**When to use**: When you want to see all quotation rates across all items.

**How it works**:
1. Press F3 from invoice entry screen
2. View comprehensive list of all quotations
3. Filter by date range if needed
4. Select item and rate to add to invoice

**API Endpoint**: `GET /api/quotation-history`

### F4 - PO Rate & Quantity

**When to use**: When you need to reference purchase order data for pricing.

**How it works**:
1. Place cursor on item field
2. Press F4
3. View PO rates and quantities
4. Select to auto-fill rate

**API Endpoint**: `GET /api/purchase-orders/rate-lookup`

### F5 - Refresh

**When to use**: To reload current data from server.

**How it works**:
1. Press F5 from any screen
2. Current data is refreshed from database
3. Useful after another user makes changes

## Quick Reference Card

Print this section for desk reference:

```
┌─────────────────────────────────────────┐
│     INDUS TRADERS SHORTCUTS             │
├─────────────────────────────────────────┤
│ F2  - Item Quotation History            │
│ F3  - All Quotation Rates               │
│ F4  - PO Rate & Quantity                │
│ F5  - Refresh                           │
│                                         │
│ Ctrl+F - Search                         │
│ Ctrl+S - Save                           │
│ Ctrl+P - Print                          │
│ Ctrl+N - New Invoice                    │
│                                         │
│ Esc - Cancel/Close                      │
│ Enter - Confirm/Next                    │
└─────────────────────────────────────────┘
```
