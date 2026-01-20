import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { SalesmanService, Salesman } from '../../../../core/services/salesman.service';

@Component({
    selector: 'app-salesman-profile',
    standalone: true,
    imports: [CommonModule, MatCardModule, MatIconModule],
    template: `
    <div class="p-4">
      <mat-card class="pos-card max-w-2xl mx-auto">
        <mat-card-header>
          <div mat-card-avatar class="profile-avatar">
             <mat-icon>person</mat-icon>
          </div>
          <mat-card-title>{{salesman?.name}}</mat-card-title>
          <mat-card-subtitle>{{salesman?.code}}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content class="pt-4">
          <div class="info-list space-y-4">
            <div class="flex items-center gap-3">
              <mat-icon color="primary">phone</mat-icon>
              <span>{{salesman?.phone || 'Not set'}}</span>
            </div>
            <div class="flex items-center gap-3">
              <mat-icon color="primary">email</mat-icon>
              <span>{{salesman?.email || 'Not set'}}</span>
            </div>
            <div class="flex items-center gap-3">
              <mat-icon color="primary">route</mat-icon>
              <span>Route: {{salesman?.routeId?.name || 'Assigned Route'}} ({{salesman?.routeId?.code || 'N/A'}})</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
    styles: [`
    .profile-avatar { width: 40px; height: 40px; background: #867cf0; color: white; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
    .max-w-2xl { max-width: 42rem; }
    .mx-auto { margin-left: auto; margin-right: auto; }
    .gap-3 { gap: 0.75rem; }
    .flex { display: flex; }
    .items-center { align-items: center; }
  `]
})
export class SalesmanProfileComponent implements OnInit {
    salesman: Salesman | null = null;
    constructor(private salesmanService: SalesmanService) { }
    ngOnInit(): void {
        this.salesmanService.getMyProfile().subscribe(res => this.salesman = res.data);
    }
}
