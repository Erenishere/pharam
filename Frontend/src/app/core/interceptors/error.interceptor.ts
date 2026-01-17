import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, retry, timer } from 'rxjs';
import { Router } from '@angular/router';
import { ToastService } from '../../shared/services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);
    const toastService = inject(ToastService);

    return next(req).pipe(
        // Retry logic for transient failures
        retry({
            count: 2,
            delay: (error: HttpErrorResponse, retryCount: number) => {
                // Only retry for specific error codes and non-destructive methods
                const retryableErrors = [0, 408, 429, 500, 502, 503, 504];
                const retryableMethods = ['GET', 'HEAD', 'OPTIONS'];

                if (retryableErrors.includes(error.status) &&
                    retryableMethods.includes(req.method.toUpperCase())) {
                    // Exponential backoff: 1s, 2s, 4s...
                    const delayMs = Math.pow(2, retryCount) * 1000;
                    return timer(delayMs);
                }

                // Don't retry for other errors
                return throwError(() => error);
            }
        }),
        catchError((error: HttpErrorResponse) => {
            let errorMessage = 'An unexpected error occurred';
            let shouldShowToast = true;

            if (error.error instanceof ErrorEvent) {
                // Client-side error
                errorMessage = `Network error: ${error.error.message}`;
            } else {
                // Server-side error
                switch (error.status) {
                    case 0:
                        errorMessage = 'Network connection failed. Please check your internet connection.';
                        break;
                    case 400:
                        errorMessage = error.error?.message || 'Invalid request data';
                        break;
                    case 401:
                        errorMessage = 'Your session has expired. Please login again.';
                        shouldShowToast = false; // Don't show toast for auth errors as redirect handles it
                        router.navigate(['/login']);
                        break;
                    case 403:
                        errorMessage = 'You do not have permission to perform this action';
                        break;
                    case 404:
                        errorMessage = 'The requested resource was not found';
                        break;
                    case 408:
                        errorMessage = 'Request timeout. Please try again.';
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
                    case 429:
                        errorMessage = 'Too many requests. Please wait a moment and try again.';
                        break;
                    case 500:
                        errorMessage = 'Internal server error. Please try again later.';
                        break;
                    case 502:
                        errorMessage = 'Service temporarily unavailable. Please try again.';
                        break;
                    case 503:
                        errorMessage = 'Service unavailable. Please try again later.';
                        break;
                    case 504:
                        errorMessage = 'Request timeout. Please try again.';
                        break;
                    default:
                        errorMessage = error.error?.message || `Unexpected error (${error.status})`;
                }
            }

            // Show toast notification for user-facing errors
            if (shouldShowToast && !req.url.includes('/auth/')) {
                // Don't show toast for auth-related requests to avoid spam
                toastService.error(errorMessage);
            }

            // Return error with user-friendly message
            return throwError(() => ({
                ...error,
                userMessage: errorMessage
            }));
        })
    );
};