/**
 * Sales Invoices Routing Module
 * 
 * This module defines all routes for the sales invoices feature with lazy loading,
 * permission-based guards, data resolvers, and breadcrumb navigation.
 */

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SalesInvoiceAccessGuard } from './guards/sales-invoice-access.guard';
import { InvoiceDetailResolver } from './resolvers/invoice-detail.resolver';

const routes: Routes = [
    {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full'
    },
    {
        path: 'list',
        loadComponent: () => import('./components/invoice-list/invoice-list.component').then(m => m.InvoiceListComponent),
        canActivate: [SalesInvoiceAccessGuard],
        data: {
            title: 'Sales Invoices',
            breadcrumb: 'Invoice List',
            requiredPermissions: ['sales_invoice_view']
        }
    },
    {
        path: 'create',
        loadComponent: () => import('./components/invoice-form/invoice-form.component').then(m => m.InvoiceFormComponent),
        canActivate: [SalesInvoiceAccessGuard],
        data: {
            title: 'Create Sales Invoice',
            breadcrumb: 'Create Invoice',
            requiredPermissions: ['sales_invoice_create']
        }
    },
    {
        path: 'edit/:id',
        loadComponent: () => import('./components/invoice-form/invoice-form.component').then(m => m.InvoiceFormComponent),
        canActivate: [SalesInvoiceAccessGuard],
        resolve: {
            invoice: InvoiceDetailResolver
        },
        data: {
            title: 'Edit Sales Invoice',
            breadcrumb: 'Edit Invoice',
            requiredPermissions: ['sales_invoice_edit']
        }
    },
    {
        path: 'detail/:id',
        loadComponent: () => import('./components/invoice-detail/invoice-detail.component').then(m => m.InvoiceDetailComponent),
        canActivate: [SalesInvoiceAccessGuard],
        resolve: {
            invoice: InvoiceDetailResolver
        },
        data: {
            title: 'Invoice Details',
            breadcrumb: 'Invoice Details',
            requiredPermissions: ['sales_invoice_view']
        }
    },
    {
        path: 'statistics',
        loadComponent: () => import('./components/invoice-statistics/invoice-statistics.component').then(m => m.InvoiceStatisticsComponent),
        canActivate: [SalesInvoiceAccessGuard],
        data: {
            title: 'Sales Statistics',
            breadcrumb: 'Statistics',
            requiredPermissions: ['sales_invoice_statistics']
        }
    },
    {
        path: 'estimates',
        loadComponent: () => import('./components/estimate-conversion/estimate-conversion.component').then(m => m.EstimateConversionComponent),
        canActivate: [SalesInvoiceAccessGuard],
        data: {
            title: 'Convert Estimates',
            breadcrumb: 'Convert Estimates',
            requiredPermissions: ['sales_invoice_create', 'estimate_view']
        }
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class SalesInvoicesRoutingModule { }