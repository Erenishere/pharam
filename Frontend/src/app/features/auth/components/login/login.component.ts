import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { LoginResponse } from '../../../../core/models/user.model';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent {
    loginForm: FormGroup;
    errorMessage: string = '';
    isLoading: boolean = false;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router
    ) {
        this.loginForm = this.fb.group({
            identifier: ['', [Validators.required, Validators.minLength(3)]],
            password: ['', [Validators.required, Validators.minLength(6)]]
        });
    }

    onSubmit(): void {
        if (this.loginForm.valid) {
            this.isLoading = true;
            this.errorMessage = '';

            console.log('[LoginComponent] Submitting login form');
            this.authService.login(this.loginForm.value).subscribe({
                next: (response: LoginResponse) => {
                    console.log('[LoginComponent] Login response received:', response);
                    this.isLoading = false;
                    if (response.success) {
                        const userRole = response.data.user.role?.toLowerCase();
                        console.log('[LoginComponent] Login successful, user role:', userRole);
                        
                        if (userRole === 'sales') {
                            this.router.navigate(['/salesman/dashboard']);
                        } else {
                            this.router.navigate(['/dashboard']);
                        }
                    } else {
                        console.error('[LoginComponent] Login response success=false');
                        this.errorMessage = 'Login failed. Please check your credentials.';
                    }
                },
                error: (error: any) => {
                    console.error('[LoginComponent] Login error:', error);
                    this.isLoading = false;
                    this.errorMessage = error.error?.message || 'Login failed. Please try again.';
                }
            });
        } else {
            console.warn('[LoginComponent] Form is invalid');
        }
    }
}
