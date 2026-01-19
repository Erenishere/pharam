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
            }
        ]
    }
];
