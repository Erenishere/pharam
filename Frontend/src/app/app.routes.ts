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
            }
        ]
    }
];
