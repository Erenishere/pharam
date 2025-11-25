# Indus Traders - Complete Frontend Developer Guide

## 📚 Table of Contents

1. [Project Overview](#project-overview)
2. [Getting Started](#getting-started)
3. [Architecture Overview](#architecture-overview)
4. [Authentication Flow](#authentication-flow)
5. [API Integration Guide](#api-integration-guide)
6. [Core Modules](#core-modules)
7. [Phase 2 Features](#phase-2-features)
8. [Common Workflows](#common-workflows)
9. [Best Practices](#best-practices)
10. [Using Kiro AI](#using-kiro-ai)
11. [Troubleshooting](#troubleshooting)

---

## 🎯 Project Overview

### What is Indus Traders?

Indus Traders is a comprehensive ERP (Enterprise Resource Planning) system designed for Pakistani businesses. It handles:

- **Sales Management**: Create invoices, track sales, manage customers
- **Purchase Management**: Record purchases, manage suppliers, track inventory
- **Inventory Control**: Multi-warehouse stock tracking, batch management, expiry tracking
- **Financial Management**: Accounts, ledgers, cash book, tax calculations
- **Advanced Features**: Post-dated cheques, schemes, discounts, salesman tracking

### Technology Stack

**Backend:**
- Node.js + Express.js
- MongoDB (Database)
- JWT Authentication
- RESTful API

**Frontend (Your Responsibility):**
- Angular (Recommended)
- TypeScript
- RxJS for reactive programming
- Angular Material or Bootstrap for UI

---

## 🚀 Getting Started

### Prerequisites

Before you start, make sure you have:

```bash
# Node.js (v16 or higher)
node --version

# npm or yarn
npm --version

# Angular CLI
ng version
```

### Backend Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd Backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env with your settings
```

4. **Start the backend**
```bash
npm run dev
```

The backend will run on `http://localhost:3000`

### Frontend Setup (Your Project)

1. **Create Angular project**
```bash
ng new indus-traders-frontend
cd indus-traders-frontend
```

2. **Install required packages**
```bash
# HTTP Client (already included)
# Angular Material
ng add @angular/material

# For forms
npm install @angular/forms

# For date handling
npm install date-fns
```

3. **Configure API base URL**
```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1'
};
```

---


## 🏗️ Architecture Overview

### System Architecture

```
┌─────────────────┐
│  Angular App    │
│  (Frontend)     │
└────────┬────────┘
         │ HTTP/REST
         │ JSON
┌────────▼────────┐
│  Express API    │
│  (Backend)      │
└────────┬────────┘
         │
┌────────▼────────┐
│    MongoDB      │
│   (Database)    │
└─────────────────┘
```

### API Communication Pattern

```typescript
// All API calls follow this pattern:

// 1. Request
POST /api/v1/auth/login
Headers: { Content-Type: application/json }
Body: { identifier: "user@email.com", password: "pass123" }

// 2. Response (Success)
{
  "success": true,
  "data": { token: "...", user: {...} },
  "message": "Login successful"
}

// 3. Response (Error)
{
  "success": false,
  "error": "Invalid credentials",
  "message": "Authentication failed"
}
```

### Key Concepts

1. **JWT Authentication**: All protected endpoints require a Bearer token
2. **Role-Based Access**: Different user roles have different permissions
3. **Pagination**: List endpoints support page/limit parameters
4. **Filtering**: Most endpoints support query parameters for filtering
5. **Validation**: Backend validates all inputs and returns detailed errors

---

## 🔐 Authentication Flow

### Step-by-Step Authentication

#### 1. Create Auth Service

```typescript
// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    refreshToken: string;
    user: User;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;

  constructor(private http: HttpClient) {
    const storedUser = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<User | null>(
      storedUser ? JSON.parse(storedUser) : null
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  login(identifier: string, password: string): Observable<User> {
    return this.http.post<AuthResponse>(
      `${environment.apiUrl}/auth/login`,
      { identifier, password }
    ).pipe(
      map(response => {
        if (response.success && response.data) {
          // Store user details and token
          localStorage.setItem('currentUser', JSON.stringify(response.data.user));
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('refreshToken', response.data.refreshToken);
          this.currentUserSubject.next(response.data.user);
          return response.data.user;
        }
        throw new Error('Login failed');
      })
    );
  }

  logout(): void {
    // Remove user from local storage
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
```

#### 2. Create HTTP Interceptor

```typescript
// src/app/interceptors/auth.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Add authorization header with jwt token
    const token = this.authService.getToken();
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Auto logout if 401 response
          this.authService.logout();
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }
}
```

#### 3. Create Login Component

```typescript
// src/app/components/login/login.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  error = '';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Redirect if already logged in
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }

    this.loginForm = this.formBuilder.group({
      identifier: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';

    const { identifier, password } = this.loginForm.value;

    this.authService.login(identifier, password).subscribe({
      next: (user) => {
        console.log('Login successful', user);
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        console.error('Login error', error);
        this.error = error.error?.message || 'Login failed. Please try again.';
        this.loading = false;
      }
    });
  }
}
```

```html
<!-- src/app/components/login/login.component.html -->
<div class="login-container">
  <div class="login-card">
    <h2>Indus Traders Login</h2>
    
    <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
      <div class="form-group">
        <label for="identifier">Username or Email</label>
        <input 
          type="text" 
          id="identifier"
          formControlName="identifier"
          class="form-control"
          [class.is-invalid]="loginForm.get('identifier')?.invalid && loginForm.get('identifier')?.touched"
        />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input 
          type="password" 
          id="password"
          formControlName="password"
          class="form-control"
          [class.is-invalid]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
        />
      </div>

      <div class="error-message" *ngIf="error">
        {{ error }}
      </div>

      <button 
        type="submit" 
        class="btn btn-primary"
        [disabled]="loading || loginForm.invalid"
      >
        <span *ngIf="loading">Logging in...</span>
        <span *ngIf="!loading">Login</span>
      </button>
    </form>

    <div class="test-credentials">
      <p><strong>Test Credentials:</strong></p>
      <p>Email: admin@industraders.com</p>
      <p>Password: admin123</p>
    </div>
  </div>
</div>
```

---


## 📡 API Integration Guide

### Creating a Generic API Service

```typescript
// src/app/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // GET request
  get<T>(endpoint: string, params?: any): Observable<ApiResponse<T>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}/${endpoint}`, { params: httpParams });
  }

  // POST request
  post<T>(endpoint: string, data: any): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}/${endpoint}`, data);
  }

  // PUT request
  put<T>(endpoint: string, data: any): Observable<ApiResponse<T>> {
    return this.http.put<ApiResponse<T>>(`${this.baseUrl}/${endpoint}`, data);
  }

  // PATCH request
  patch<T>(endpoint: string, data?: any): Observable<ApiResponse<T>> {
    return this.http.patch<ApiResponse<T>>(`${this.baseUrl}/${endpoint}`, data || {});
  }

  // DELETE request
  delete<T>(endpoint: string): Observable<ApiResponse<T>> {
    return this.http.delete<ApiResponse<T>>(`${this.baseUrl}/${endpoint}`);
  }

  // GET with pagination
  getPaginated<T>(endpoint: string, params?: any): Observable<PaginatedResponse<T>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    return this.http.get<PaginatedResponse<T>>(`${this.baseUrl}/${endpoint}`, { params: httpParams });
  }
}
```

### Example: Customer Service

```typescript
// src/app/services/customer.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse, PaginatedResponse } from './api.service';

export interface Customer {
  _id: string;
  code: string;
  name: string;
  type: 'customer' | 'supplier' | 'both';
  contactInfo: {
    phone: string;
    email?: string;
    address?: string;
    city?: string;
    country?: string;
  };
  financialInfo: {
    creditLimit: number;
    paymentTerms: number;
    currency: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  constructor(private api: ApiService) {}

  // Get all customers with pagination
  getCustomers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    isActive?: boolean;
  }): Observable<PaginatedResponse<Customer>> {
    return this.api.getPaginated<Customer>('customers', params);
  }

  // Get customer by ID
  getCustomerById(id: string): Observable<ApiResponse<{ customer: Customer }>> {
    return this.api.get<{ customer: Customer }>(`customers/${id}`);
  }

  // Get customer by code
  getCustomerByCode(code: string): Observable<ApiResponse<{ customer: Customer }>> {
    return this.api.get<{ customer: Customer }>(`customers/code/${code}`);
  }

  // Create customer
  createCustomer(customer: Partial<Customer>): Observable<ApiResponse<{ customer: Customer }>> {
    return this.api.post<{ customer: Customer }>('customers', customer);
  }

  // Update customer
  updateCustomer(id: string, customer: Partial<Customer>): Observable<ApiResponse<{ customer: Customer }>> {
    return this.api.put<{ customer: Customer }>(`customers/${id}`, customer);
  }

  // Delete customer
  deleteCustomer(id: string): Observable<ApiResponse<any>> {
    return this.api.delete(`customers/${id}`);
  }

  // Toggle customer status
  toggleStatus(id: string): Observable<ApiResponse<{ customer: Customer }>> {
    return this.api.patch<{ customer: Customer }>(`customers/${id}/toggle-status`);
  }
}
```

### Example: Using Customer Service in Component

```typescript
// src/app/components/customers/customer-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CustomerService, Customer } from '../../services/customer.service';

@Component({
  selector: 'app-customer-list',
  templateUrl: './customer-list.component.html'
})
export class CustomerListComponent implements OnInit {
  customers: Customer[] = [];
  loading = false;
  error = '';
  
  // Pagination
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  itemsPerPage = 10;

  // Filters
  searchTerm = '';
  filterType = '';
  filterActive = true;

  constructor(private customerService: CustomerService) {}

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.loading = true;
    this.error = '';

    const params = {
      page: this.currentPage,
      limit: this.itemsPerPage,
      search: this.searchTerm || undefined,
      type: this.filterType || undefined,
      isActive: this.filterActive
    };

    this.customerService.getCustomers(params).subscribe({
      next: (response) => {
        if (response.success) {
          this.customers = response.data;
          this.totalPages = response.pagination.totalPages;
          this.totalItems = response.pagination.totalItems;
          this.currentPage = response.pagination.currentPage;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading customers', error);
        this.error = 'Failed to load customers. Please try again.';
        this.loading = false;
      }
    });
  }

  onSearch(): void {
    this.currentPage = 1; // Reset to first page
    this.loadCustomers();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadCustomers();
  }

  onDelete(customer: Customer): void {
    if (confirm(`Are you sure you want to delete ${customer.name}?`)) {
      this.customerService.deleteCustomer(customer._id).subscribe({
        next: () => {
          this.loadCustomers(); // Reload list
        },
        error: (error) => {
          console.error('Error deleting customer', error);
          alert('Failed to delete customer');
        }
      });
    }
  }

  onToggleStatus(customer: Customer): void {
    this.customerService.toggleStatus(customer._id).subscribe({
      next: () => {
        this.loadCustomers(); // Reload list
      },
      error: (error) => {
        console.error('Error toggling status', error);
        alert('Failed to update status');
      }
    });
  }
}
```

---

