import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/components/login/login.component';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { batchAccessGuard } from './core/guards/batch-access.guard';
import { salesmanGuard } from './core/guards/salesman.guard';
import { dashboardGuard } from './core/guards/dashboard.guard';

export const routes: Routes = [
    { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    {
        path: '',
        canActivate: [authGuard],
        loadComponent: () => import('./layout/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
        children: [
            {
                path: 'dashboard',
                canActivate: [authGuard, dashboardGuard],
                loadComponent: () => import('./features/dashboard/components/dashboard.component').then(m => m.DashboardComponent)
            },
            {
                path: 'users',
                canActivate: [authGuard, adminGuard],
                loadComponent: () => import('./features/users/components/user-list/user-list.component').then(m => m.UserListComponent)
            },
            {
                path: 'customers',
                canActivate: [authGuard, dashboardGuard],
                loadComponent: () => import('./features/customers/components/customer-list/customer-list.component').then(m => m.CustomerListComponent)
            },
            {
                path: 'items',
                canActivate: [authGuard],
                loadComponent: () => import('./features/items/components/item-list/item-list.component').then(m => m.ItemListComponent)
            },
            {
                path: 'suppliers',
                canActivate: [authGuard, dashboardGuard],
                loadComponent: () => import('./features/suppliers/suppliers.component').then(m => m.SuppliersComponent)
            },
            {
                path: 'pos',
                canActivate: [authGuard, salesmanGuard],
                loadComponent: () => import('./features/salesman/components/pos/pos.component').then(m => m.PosComponent)
            },
            {
                path: 'salesman/dashboard',
                canActivate: [authGuard, salesmanGuard],
                loadComponent: () => import('./features/salesman/components/salesman-dashboard/salesman-dashboard.component').then(m => m.SalesmanDashboardComponent)
            },
            {
                path: 'batches',
                canActivate: [authGuard, batchAccessGuard],
                data: { title: 'Batch Management' },
                children: [
                    {
                        path: '',
                        redirectTo: 'list',
                        pathMatch: 'full'
                    },
                    {
                        path: 'list',
                        loadComponent: () => import('./features/batches/components/batch-list/batch-list.component').then(m => m.BatchListComponent),
                        data: { title: 'Batch List' }
                    },
                    {
                        path: 'create',
                        loadComponent: () => import('./features/batches/components/batch-form/batch-form.component').then(m => m.BatchFormComponent),
                        data: { title: 'Create Batch' }
                    },
                    {
                        path: 'edit/:id',
                        loadComponent: () => import('./features/batches/components/batch-form/batch-form.component').then(m => m.BatchFormComponent),
                        data: { title: 'Edit Batch' }
                    },
                    {
                        path: 'detail/:id',
                        loadComponent: () => import('./features/batches/components/batch-detail/batch-detail.component').then(m => m.BatchDetailComponent),
                        data: { title: 'Batch Details' }
                    },
                    {
                        path: 'expiring',
                        loadComponent: () => import('./features/batches/components/expiry-tracker/expiry-tracker.component').then(m => m.ExpiryTrackerComponent),
                        data: { title: 'Expiring Batches' }
                    },
                    {
                        path: 'statistics',
                        loadComponent: () => import('./features/batches/components/batch-statistics/batch-statistics.component').then(m => m.BatchStatisticsComponent),
                        data: { title: 'Batch Statistics' }
                    }
                ]
            },
            {
                path: 'sales-invoices',
                canActivate: [authGuard, adminGuard],
                loadComponent: () => import('./features/invoices/components/sales-invoice-list/sales-invoice-list.component').then(m => m.SalesInvoiceListComponent),
                data: { title: 'Sales Invoices' }
            },
            {
                path: 'purchase-invoices',
                canActivate: [authGuard, adminGuard],
                loadComponent: () => import('./features/invoices/components/purchase-invoice-list/purchase-invoice-list.component').then(m => m.PurchaseInvoiceListComponent),
                data: { title: 'Purchase Invoices' }
            },
            {
                path: 'warehouses',
                canActivate: [authGuard, adminGuard],
                loadComponent: () => import('./features/warehouses/components/warehouse-list/warehouse-list.component').then(m => m.WarehouseListComponent),
                data: { title: 'Warehouses / Branches' }
            },
            {
                path: 'reports',
                canActivate: [authGuard, adminGuard],
                data: { title: 'Reports' },
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./features/reports/components/reports-dashboard/reports-dashboard.component').then(m => m.ReportsDashboardComponent),
                        data: { title: 'Reports Dashboard' }
                    },
                    {
                        path: 'sales',
                        loadComponent: () => import('./features/reports/components/sales-reports/sales-reports.component').then(m => m.SalesReportsComponent),
                        data: { title: 'Sales Reports' }
                    },
                    {
                        path: 'purchase',
                        loadComponent: () => import('./features/reports/components/purchase-reports/purchase-reports.component').then(m => m.PurchaseReportsComponent),
                        data: { title: 'Purchase Reports' }
                    },
                    {
                        path: 'inventory',
                        loadComponent: () => import('./features/reports/components/inventory-reports/inventory-reports.component').then(m => m.InventoryReportsComponent),
                        data: { title: 'Inventory Reports' }
                    },
                    {
                        path: 'financial',
                        loadComponent: () => import('./features/reports/components/financial-reports/financial-reports.component').then(m => m.FinancialReportsComponent),
                        data: { title: 'Financial Reports' }
                    },
                    {
                        path: 'tax',
                        loadComponent: () => import('./features/reports/components/tax-reports/tax-reports.component').then(m => m.TaxReportsComponent),
                        data: { title: 'Tax Reports' }
                    },
                    {
                        path: 'accounts',
                        loadComponent: () => import('./features/reports/components/accounts-reports/accounts-reports.component').then(m => m.AccountsReportsComponent),
                        data: { title: 'Accounts Reports' }
                    },
                    {
                        path: 'salesman',
                        loadComponent: () => import('./features/reports/components/salesman-reports/salesman-reports.component').then(m => m.SalesmanReportsComponent),
                        data: { title: 'Salesman Reports' }
                    },
                    {
                        path: 'schemes',
                        loadComponent: () => import('./features/reports/components/scheme-reports/scheme-reports.component').then(m => m.SchemeReportsComponent),
                        data: { title: 'Scheme & Discount Reports' }
                    },
                    {
                        path: 'warehouse',
                        loadComponent: () => import('./features/reports/components/warehouse-reports/warehouse-reports.component').then(m => m.WarehouseReportsComponent),
                        data: { title: 'Warehouse Reports' }
                    }
                ]
            }
        ]
    }
];
