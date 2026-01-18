import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface LoadingState {
    isLoading: boolean;
    activeRequests: number;
    requestUrls: string[];
}

@Injectable({
    providedIn: 'root'
})
export class LoadingService {
    private loadingSubject = new BehaviorSubject<boolean>(false);
    public loading$: Observable<boolean> = this.loadingSubject.asObservable();

    private loadingStateSubject = new BehaviorSubject<LoadingState>({
        isLoading: false,
        activeRequests: 0,
        requestUrls: []
    });
    public loadingState$: Observable<LoadingState> = this.loadingStateSubject.asObservable();

    private loadingMap: Map<string, boolean> = new Map<string, boolean>();

    setLoading(loading: boolean, url?: string): void {
        if (!url) {
            this.loadingSubject.next(loading);
            this.updateLoadingState();
            return;
        }

        if (loading) {
            this.loadingMap.set(url, loading);
        } else {
            this.loadingMap.delete(url);
        }

        const isLoading = this.loadingMap.size > 0;
        this.loadingSubject.next(isLoading);
        this.updateLoadingState();
    }

    private updateLoadingState(): void {
        const currentState = this.loadingStateSubject.value;
        const newState: LoadingState = {
            isLoading: this.loadingMap.size > 0,
            activeRequests: this.loadingMap.size,
            requestUrls: Array.from(this.loadingMap.keys())
        };

        this.loadingStateSubject.next(newState);
    }

    isLoading(): boolean {
        return this.loadingSubject.value;
    }

    getActiveRequestCount(): number {
        return this.loadingMap.size;
    }

    isRequestLoading(url: string): boolean {
        return this.loadingMap.has(url);
    }

    clearAllLoading(): void {
        this.loadingMap.clear();
        this.loadingSubject.next(false);
        this.updateLoadingState();
    }
}
