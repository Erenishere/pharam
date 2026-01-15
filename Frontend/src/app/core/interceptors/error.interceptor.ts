import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            let errorMessage = 'An unexpected error occurred';

            if (error.error instanceof ErrorEvent) {
                // Client-side error
                errorMessage = `Error: ${error.error.message}`;
            } else {
                // Server-side error
                switch (error.status) {
                    case 400:
                        errorMessage = error.error?.message || 'Bad request';
                        break;
                    case 401:
                        errorMessage = 'Unauthorized. Please login again.';
                        router.navigate(['/login']);
                        break;
                    case 403:
                        errorMessage = 'You do not have permission to perform this action';
                        break;
                    case 404:
                        errorMessage = 'Resource not found';
                        break;
                    case 409:
                        errorMessage = error.error?.message || 'Conflict: Resource already exists';
                        break;
                    case 422:
                        errorMessage = error.error?.message || 'Validation failed';
                        if (error.error?.errors) {
                            // Format validation errors
                            const validationErrors = Object.values(error.error.errors).join(', ');
                            errorMessage = `Validation failed: ${validationErrors}`;
                        }
                        break;
                    case 500:
                        errorMessage = 'Internal server error. Please try again later.';
                        break;
                    default:
                        errorMessage = error.error?.message || `Error: ${error.status}`;
                }
            }

            // Return error with user-friendly message
            return throwError(() => ({
                ...error,
                userMessage: errorMessage
            }));
        })
    );
};
