import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Observable } from 'rxjs';
import { BreadcrumbService, BreadcrumbItem } from '../../../core/services/breadcrumb.service';

@Component({
    selector: 'app-breadcrumb',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        MatIconModule
    ],
    template: `
    <nav class="breadcrumb-nav" *ngIf="(breadcrumbs$ | async)?.length">
      <ol class="breadcrumb">
        <li class="breadcrumb-item">
          <a routerLink="/dashboard" class="breadcrumb-link">
            <mat-icon>home</mat-icon>
            <span>Home</span>
          </a>
        </li>
        <li 
          *ngFor="let breadcrumb of breadcrumbs$ | async; let last = last" 
          class="breadcrumb-item"
          [class.active]="breadcrumb.active"
        >
          <mat-icon class="breadcrumb-separator">chevron_right</mat-icon>
          <a 
            *ngIf="!breadcrumb.active" 
            [routerLink]="breadcrumb.url" 
            class="breadcrumb-link"
          >
            {{ breadcrumb.label }}
          </a>
          <span *ngIf="breadcrumb.active" class="breadcrumb-current">
            {{ breadcrumb.label }}
          </span>
        </li>
      </ol>
    </nav>
  `,
    styleUrl: './breadcrumb.component.scss'
})
export class BreadcrumbComponent implements OnInit {
    breadcrumbs$: Observable<BreadcrumbItem[]>;

    constructor(private breadcrumbService: BreadcrumbService) {
        this.breadcrumbs$ = this.breadcrumbService.breadcrumbs$;
    }

    ngOnInit(): void {
        // Component initialization handled by service
    }
}