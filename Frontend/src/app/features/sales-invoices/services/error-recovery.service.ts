/**
 * Error Recovery Service for Sales Invoices
 * 
 * This service provides error recovery mechanisms including retry logic,
 * circuit breaker pattern, and graceful degradation strategies.
 */

import { Injectable } from '@angular/core';
import { Observable, throwError, timer, of, BehaviorSubject } from 'rxjs';
import { retryWhen, mergeMap, tap, catchError, delay, switchMap } from 'rxjs/operators';

export interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    retryableErrors: number[];
}

export interface CircuitBreakerState {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failureCount: number;
    lastFailureTime: number;
    successCount: number;
}

export interface ErrorRecoveryOptions {
    enableRetry: boolean;
    enableCircuitBreaker: boolean;
    enableFallback: boolean;
    fallbackData?: any;
    customErrorHandler?: (error: any) => Observable<any>;
}

@Injectable({
    providedIn: 'root'
})
export class ErrorRecoveryService {
    private readonly defaultRetryConfig: RetryConfig = {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        retryableErrors: [0, 408, 429, 500, 502, 503, 504]
    };

    private circuitBreakers = new Map<string, BehaviorSubject<CircuitBreakerState>>();
    private readonly circuitBreakerConfig = {
        failureThreshold: 5,
        recoveryTimeout: 30000, // 30 seconds
        halfOpenMaxCalls: 3
    };

    constructor() { }

    /**
     * Create retry operator with exponential backoff
     */
    createRetryOperator<T>(config: Partial<RetryConfig> = {}) {
        const retryConfig = { ...this.defaultRetryConfig, ...config };

        return retryWhen<T>(errors =>
            errors.pipe(
                mergeMap((error, index) => {
                    const retryAttempt = index + 1;

                    // Check if error is retryable
                    if (!this.isRetryableError(error, retryConfig.retryableErrors)) {
                        return throwError(() => error);
                    }

                    // Check if max retries exceeded
                    if (retryAttempt > retryConfig.maxRetries) {
                        return throwError(() => error);
                    }

                    // Calculate delay with exponential backoff
                    const delay = Math.min(
                        retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, index),
                        retryConfig.maxDelay
                    );

                    console.log(`Retry attempt ${retryAttempt}/${retryConfig.maxRetries} after ${delay}ms`);

                    return timer(delay);
                })
            )
        );
    }

    /**
     * Create circuit breaker for a specific endpoint
     */
    createCircuitBreaker(endpointKey: string): {
        execute: <T>(operation: () => Observable<T>) => Observable<T>;
        getState: () => Observable<CircuitBreakerState>;
        reset: () => void;
    } {
        if (!this.circuitBreakers.has(endpointKey)) {
            this.circuitBreakers.set(endpointKey, new BehaviorSubject<CircuitBreakerState>({
                state: 'CLOSED',
                failureCount: 0,
                lastFailureTime: 0,
                successCount: 0
            }));
        }

        const stateSubject = this.circuitBreakers.get(endpointKey)!;

        return {
            execute: <T>(operation: () => Observable<T>): Observable<T> => {
                return this.executeWithCircuitBreaker(endpointKey, operation, stateSubject);
            },
            getState: () => stateSubject.asObservable(),
            reset: () => {
                stateSubject.next({
                    state: 'CLOSED',
                    failureCount: 0,
                    lastFailureTime: 0,
                    successCount: 0
                });
            }
        };
    }

    /**
     * Create comprehensive error recovery wrapper
     */
    withErrorRecovery<T>(
        operation: () => Observable<T>,
        options: ErrorRecoveryOptions = {
            enableRetry: true,
            enableCircuitBreaker: false,
            enableFallback: false
        }
    ): Observable<T> {
        let stream = operation();

        // Apply retry logic
        if (options.enableRetry) {
            stream = stream.pipe(this.createRetryOperator());
        }

        // Apply circuit breaker (if enabled and endpoint key provided)
        if (options.enableCircuitBreaker) {
            // Circuit breaker would be applied here if endpoint key was provided
        }

        // Apply fallback and custom error handling
        stream = stream.pipe(
            catchError(error => {
                console.error('Operation failed after all recovery attempts:', error);

                // Try custom error handler first
                if (options.customErrorHandler) {
                    return options.customErrorHandler(error);
                }

                // Try fallback data
                if (options.enableFallback && options.fallbackData !== undefined) {
                    console.log('Using fallback data due to error');
                    return of(options.fallbackData);
                }

                // If no recovery options work, throw the error
                return throwError(() => this.enhanceError(error));
            })
        );

        return stream;
    }

    /**
     * Create smart retry with adaptive delays
     */
    createAdaptiveRetry(endpointKey: string) {
        const failureHistory = this.getFailureHistory(endpointKey);

        return retryWhen(errors =>
            errors.pipe(
                mergeMap((error, index) => {
                    const retryAttempt = index + 1;

                    if (!this.isRetryableError(error)) {
                        return throwError(() => error);
                    }

                    if (retryAttempt > this.getAdaptiveMaxRetries(failureHistory)) {
                        return throwError(() => error);
                    }

                    const delay = this.calculateAdaptiveDelay(failureHistory, retryAttempt);

                    console.log(`Adaptive retry ${retryAttempt} for ${endpointKey} after ${delay}ms`);

                    return timer(delay);
                })
            )
        );
    }

    /**
     * Handle network connectivity issues
     */
    handleNetworkError<T>(
        operation: () => Observable<T>,
        fallbackData?: T
    ): Observable<T> {
        return operation().pipe(
            catchError(error => {
                if (this.isNetworkError(error)) {
                    console.warn('Network error detected, checking connectivity...');

                    return this.waitForConnectivity().pipe(
                        switchMap(() => {
                            console.log('Connectivity restored, retrying operation...');
                            return operation();
                        }),
                        catchError(retryError => {
                            if (fallbackData !== undefined) {
                                console.log('Using fallback data due to persistent network issues');
                                return of(fallbackData);
                            }
                            return throwError(() => retryError);
                        })
                    );
                }

                return throwError(() => error);
            })
        );
    }

    /**
     * Create graceful degradation handler
     */
    createGracefulDegradation<T>(
        primaryOperation: () => Observable<T>,
        fallbackOperation: () => Observable<T>,
        condition: (error: any) => boolean = () => true
    ): Observable<T> {
        return primaryOperation().pipe(
            catchError(error => {
                if (condition(error)) {
                    console.log('Primary operation failed, falling back to degraded service');
                    return fallbackOperation().pipe(
                        catchError(fallbackError => {
                            console.error('Both primary and fallback operations failed');
                            return throwError(() => fallbackError);
                        })
                    );
                }
                return throwError(() => error);
            })
        );
    }

    /**
     * Execute operation with circuit breaker
     */
    private executeWithCircuitBreaker<T>(
        endpointKey: string,
        operation: () => Observable<T>,
        stateSubject: BehaviorSubject<CircuitBreakerState>
    ): Observable<T> {
        const currentState = stateSubject.value;

        // Check circuit breaker state
        if (currentState.state === 'OPEN') {
            if (Date.now() - currentState.lastFailureTime > this.circuitBreakerConfig.recoveryTimeout) {
                // Transition to HALF_OPEN
                stateSubject.next({ ...currentState, state: 'HALF_OPEN', successCount: 0 });
            } else {
                return throwError(() => new Error('Circuit breaker is OPEN'));
            }
        }

        if (currentState.state === 'HALF_OPEN' &&
            currentState.successCount >= this.circuitBreakerConfig.halfOpenMaxCalls) {
            return throwError(() => new Error('Circuit breaker HALF_OPEN call limit exceeded'));
        }

        return operation().pipe(
            tap(() => {
                // Success - update state
                const state = stateSubject.value;
                if (state.state === 'HALF_OPEN') {
                    const newSuccessCount = state.successCount + 1;
                    if (newSuccessCount >= this.circuitBreakerConfig.halfOpenMaxCalls) {
                        // Transition back to CLOSED
                        stateSubject.next({
                            state: 'CLOSED',
                            failureCount: 0,
                            lastFailureTime: 0,
                            successCount: 0
                        });
                    } else {
                        stateSubject.next({ ...state, successCount: newSuccessCount });
                    }
                } else {
                    // Reset failure count on success
                    stateSubject.next({ ...state, failureCount: 0 });
                }
            }),
            catchError(error => {
                // Failure - update state
                const state = stateSubject.value;
                const newFailureCount = state.failureCount + 1;

                if (newFailureCount >= this.circuitBreakerConfig.failureThreshold) {
                    // Open the circuit
                    stateSubject.next({
                        state: 'OPEN',
                        failureCount: newFailureCount,
                        lastFailureTime: Date.now(),
                        successCount: 0
                    });
                } else {
                    stateSubject.next({ ...state, failureCount: newFailureCount });
                }

                return throwError(() => error);
            })
        );
    }

    /**
     * Check if error is retryable
     */
    private isRetryableError(error: any, retryableErrors: number[] = this.defaultRetryConfig.retryableErrors): boolean {
        if (!error.status) {
            return true; // Network errors
        }
        return retryableErrors.includes(error.status);
    }

    /**
     * Check if error is network-related
     */
    private isNetworkError(error: any): boolean {
        return !error.status || error.status === 0 || !navigator.onLine;
    }

    /**
     * Wait for network connectivity
     */
    private waitForConnectivity(): Observable<boolean> {
        if (navigator.onLine) {
            return of(true);
        }

        return new Observable(observer => {
            const handleOnline = () => {
                observer.next(true);
                observer.complete();
                window.removeEventListener('online', handleOnline);
            };

            window.addEventListener('online', handleOnline);

            // Timeout after 30 seconds
            const timeout = setTimeout(() => {
                window.removeEventListener('online', handleOnline);
                observer.error(new Error('Connectivity timeout'));
            }, 30000);

            return () => {
                clearTimeout(timeout);
                window.removeEventListener('online', handleOnline);
            };
        });
    }

    /**
     * Enhance error with additional context
     */
    private enhanceError(error: any): any {
        return {
            ...error,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            online: navigator.onLine,
            enhanced: true
        };
    }

    /**
     * Get failure history for adaptive retry
     */
    private getFailureHistory(endpointKey: string): number[] {
        // This would typically be stored in a more persistent way
        // For now, return a simple array
        return [];
    }

    /**
     * Calculate adaptive max retries based on history
     */
    private getAdaptiveMaxRetries(failureHistory: number[]): number {
        if (failureHistory.length === 0) {
            return this.defaultRetryConfig.maxRetries;
        }

        // Reduce retries if there have been many recent failures
        const recentFailures = failureHistory.filter(time =>
            Date.now() - time < 300000 // 5 minutes
        ).length;

        return Math.max(1, this.defaultRetryConfig.maxRetries - Math.floor(recentFailures / 2));
    }

    /**
     * Calculate adaptive delay based on failure history
     */
    private calculateAdaptiveDelay(failureHistory: number[], retryAttempt: number): number {
        const baseDelay = this.defaultRetryConfig.baseDelay;
        const exponentialDelay = baseDelay * Math.pow(2, retryAttempt - 1);

        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 1000;

        return Math.min(exponentialDelay + jitter, this.defaultRetryConfig.maxDelay);
    }
}