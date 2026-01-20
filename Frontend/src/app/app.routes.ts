import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/components/login/login.component';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { salesmanGuard } from './core/guards/salesman.guard';

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
                loadComponent: () => import('./features/dashboard/components/dashboard.component').then(m => m.DashboardComponent)
            },
            {
                path: 'users',
                canActivate: [adminGuard],
                loadComponent: () => import('./features/users/components/user-list/user-list.component').then(m => m.UserListComponent)
            },
            {
                path: 'customers',
                loadComponent: () => import('./features/customers/components/customer-list/customer-list.component').then(m => m.CustomerListComponent)
            },
            {
                path: 'items',
                loadComponent: () => import('./features/items/components/item-list/item-list.component').then(m => m.ItemListComponent)
            },
            {
                path: 'salesman',
                canActivate: [salesmanGuard],
                children: [
                    { path: '', redirectTo: 'pos', pathMatch: 'full' },
                    {
                        path: 'pos',
                        loadComponent: () => import('./features/salesman/components/pos/pos.component').then(m => m.PosComponent)
                    },
                    {
                        path: 'sales-history',
                        loadComponent: () => import('./features/salesman/components/sales-history/sales-history.component').then(m => m.SalesHistoryComponent)
                    },
                    {
                        path: 'commission',
                        loadComponent: () => import('./features/salesman/components/commission/commission.component').then(m => m.CommissionComponent)
                    },
                    {
                        path: 'profile',
                        loadComponent: () => import('./features/salesman/components/profile/profile.component').then(m => m.SalesmanProfileComponent)
                    }
                ]
            },
            {
                path: 'suppliers',
                loadComponent: () => import('./features/suppliers/suppliers.component').then(m => m.SuppliersComponent)
            },
            {
                path: 'batches',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./features/batches/components/batch-list/batch-list.component').then(m => m.BatchListComponent)
                    },
                    {
                        path: 'list',
                        loadComponent: () => import('./features/batches/components/batch-list/batch-list.component').then(m => m.BatchListComponent)
                    },
                    {
                        path: 'create',
                        loadComponent: () => import('./features/batches/components/batch-form/batch-form.component').then(m => m.BatchFormComponent)
                    },
                    {
                        path: 'edit/:id',
                        loadComponent: () => import('./features/batches/components/batch-form/batch-form.component').then(m => m.BatchFormComponent)
                    },
                    {
                        path: 'statistics',
                        loadComponent: () => import('./features/batches/components/batch-statistics/batch-statistics.component').then(m => m.BatchStatisticsComponent)
                    },
                    {
                        path: 'expiring',
                        loadComponent: () => import('./features/batches/components/expiry-tracker/expiry-tracker.component').then(m => m.ExpiryTrackerComponent)
                    },
                    {
                        path: 'detail/:id',
                        loadComponent: () => import('./features/batches/components/batch-detail/batch-detail.component').then(m => m.BatchDetailComponent)
                    },
                    {
                        path: ':id',
                        loadComponent: () => import('./features/batches/components/batch-detail/batch-detail.component').then(m => m.BatchDetailComponent)
                    }
                ]
            },
            {
                path: 'sales-invoices',
                loadComponent: () => import('./features/invoices/components/sales-invoice-list/sales-invoice-list.component').then(m => m.SalesInvoiceListComponent)
            },
            {
                path: 'purchase-invoices',
                loadComponent: () => import('./features/invoices/components/purchase-invoice-list/purchase-invoice-list.component').then(m => m.PurchaseInvoiceListComponent)
            },
            {
                path: 'warehouses',
                loadComponent: () => import('./features/warehouses/components/warehouse-list/warehouse-list.component').then(m => m.WarehouseListComponent)
            },
            {
                path: 'reports',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./features/reports/components/reports-dashboard/reports-dashboard.component').then(m => m.ReportsDashboardComponent)
                    },
                    {
                        path: 'sales',
                        loadComponent: () => import('./features/reports/components/sales-reports/sales-reports.component').then(m => m.SalesReportsComponent)
                    },
                    {
                        path: 'purchase',
                        loadComponent: () => import('./features/reports/components/purchase-reports/purchase-reports.component').then(m => m.PurchaseReportsComponent)
                    },
                    {
                        path: 'inventory',
                        loadComponent: () => import('./features/reports/components/inventory-reports/inventory-reports.component').then(m => m.InventoryReportsComponent)
                    },
                    {
                        path: 'financial',
                        loadComponent: () => import('./features/reports/components/financial-reports/financial-reports.component').then(m => m.FinancialReportsComponent)
                    },
                    {
                        path: 'accounts',
                        loadComponent: () => import('./features/reports/components/accounts-reports/accounts-reports.component').then(m => m.AccountsReportsComponent)
                    },
                    {
                        path: 'tax',
                        loadComponent: () => import('./features/reports/components/tax-reports/tax-reports.component').then(m => m.TaxReportsComponent)
                    },
                    {
                        path: 'salesman',
                        loadComponent: () => import('./features/reports/components/salesman-reports/salesman-reports.component').then(m => m.SalesmanReportsComponent)
                    },
                    {
                        path: 'scheme',
                        loadComponent: () => import('./features/reports/components/scheme-reports/scheme-reports.component').then(m => m.SchemeReportsComponent)
                    },
                    {
                        path: 'warehouse',
                        loadComponent: () => import('./features/reports/components/warehouse-reports/warehouse-reports.component').then(m => m.WarehouseReportsComponent)
                    }
                ]
            }
        ]
    }
];
