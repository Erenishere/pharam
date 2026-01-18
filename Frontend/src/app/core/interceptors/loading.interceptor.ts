import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../../shared/services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
    const loadingService = inject(LoadingService);

    // Set loading state for the request
    loadingService.setLoading(true, req.url);

    return next(req).pipe(
        finalize(() => {
            // Clear loading state when request completes (success or error)
            loadingService.setLoading(false, req.url);
        })
    );
};