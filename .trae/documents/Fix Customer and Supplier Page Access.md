# Analyze and Fix Customer/Supplier Page Loading Issues

## Analysis Findings

1. **Root Cause Identified**: The `app.routes.ts` file applies a strict `adminGuard` to the `customers` and `suppliers` routes.

   * **Code Path**: `frontend/src/app/app.routes.ts`

   * **Issue**: `adminGuard` only allows users with the `admin` role.

   * **Impact**: Users with `purchase`, `data_entry`, or `accountant` roles are blocked from accessing these pages, even though the backend APIs and frontend components are designed to support them (e.g., `SuppliersComponent` has specific logic for `PURCHASE` and `ACCOUNTANT` roles).

2. **Backend Verification**:

   * **Customers API** (`GET /api/v1/customers`): Protected by `authenticate` but **not** restricted to specific roles. Any authenticated user can fetch the list.

   * **Suppliers API** (`GET /api/v1/suppliers`): Protected by `authenticate` but **not** restricted to specific roles. Any authenticated user can fetch the list.

3. **Frontend Logic**:

   * `SuppliersComponent` has built-in permission checking (`checkPermissions`) to adapt the UI based on roles (e.g., hiding delete buttons for non-admins).

   * `CustomerListComponent` relies on backend protection but is safe to view for authenticated users given the backend configuration.

## Plan

I recommend relaxing the routing guards to allow authorized non-admin users to access these pages.

### Step 1: Update Frontend Routes

Modify `frontend/src/app/app.routes.ts` to replace `adminGuard` with `authGuard` (or remove it if `authGuard` is already applied at the parent level) for `customers` and `suppliers` routes.

**Proposed Change:**

```typescript
// frontend/src/app/app.routes.ts

// ...
            {
                path: 'customers',
                // Change from adminGuard to authGuard or remove if parent has authGuard
                // The parent route '' already has canActivate: [authGuard], so we can just remove adminGuard
                loadComponent: () => import('./features/customers/components/customer-list/customer-list.component').then(m => m.CustomerListComponent)
            },
            {
                path: 'suppliers',
                 // Change from adminGuard to authGuard or remove if parent has authGuard
                loadComponent: () => import('./features/suppliers/suppliers.component').then(m => m.SuppliersComponent)
            },
// ...
```

### Step 2: Verification

1. We will verify that the files are updated correctly.
2. You should verify by logging in with a non-admin role (e.g., Purchase) and checking if the pages now load.

## Recommendations for Future

* Implement a `RoleGuard` that accepts a list of allowed roles via route data (e.g., `data: { roles: ['admin', 'purchase'] }`) for more granular control without hardcoding logic in components.

