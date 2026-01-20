import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
    {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full'
    },
    {
        path: 'list',
        loadComponent: () => import('./components/batch-list/batch-list.component').then(m => m.BatchListComponent),
        data: { title: 'Batch List' }
    },
    {
        path: 'create',
        loadComponent: () => import('./components/batch-form/batch-form.component').then(m => m.BatchFormComponent),
        data: { title: 'Create Batch' }
    },
    {
        path: 'edit/:id',
        loadComponent: () => import('./components/batch-form/batch-form.component').then(m => m.BatchFormComponent),
        data: { title: 'Edit Batch' }
    },
    {
        path: 'detail/:id',
        loadComponent: () => import('./components/batch-detail/batch-detail.component').then(m => m.BatchDetailComponent),
        data: { title: 'Batch Details' }
    },
    {
        path: 'expiring',
        loadComponent: () => import('./components/expiry-tracker/expiry-tracker.component').then(m => m.ExpiryTrackerComponent),
        data: { title: 'Expiring Batches' }
    },
    {
        path: 'statistics',
        loadComponent: () => import('./components/batch-statistics/batch-statistics.component').then(m => m.BatchStatisticsComponent),
        data: { title: 'Batch Statistics' }
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class BatchManagementRoutingModule { }