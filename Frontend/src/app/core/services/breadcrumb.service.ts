import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, map } from 'rxjs/operators';

export interface BreadcrumbItem {
    label: string;
    url: string;
    active: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class BreadcrumbService {
    private breadcrumbsSubject = new BehaviorSubject<BreadcrumbItem[]>([]);
    public breadcrumbs$: Observable<BreadcrumbItem[]> = this.breadcrumbsSubject.asObservable();

    constructor(
        private router: Router,
        private activatedRoute: ActivatedRoute
    ) {
        this.router.events
            .pipe(
                filter(event => event instanceof NavigationEnd),
                map(() => this.buildBreadcrumbs(this.activatedRoute.root))
            )
            .subscribe(breadcrumbs => {
                this.breadcrumbsSubject.next(breadcrumbs);
            });
    }

    private buildBreadcrumbs(route: ActivatedRoute, url: string = '', breadcrumbs: BreadcrumbItem[] = []): BreadcrumbItem[] {
        // Get the children of the current route
        const children: ActivatedRoute[] = route.children;

        // Return if there are no more children
        if (children.length === 0) {
            return breadcrumbs;
        }

        // Iterate over each child
        for (const child of children) {
            // Verify the child has a path
            if (child.snapshot.url.length > 0) {
                // Get the path from the child
                const routeURL: string = child.snapshot.url.map(segment => segment.path).join('/');

                // Append route URL to URL
                url += `/${routeURL}`;

                // Get the route's title from data
                const title = child.snapshot.data['title'];

                if (title) {
                    // Add breadcrumb
                    const breadcrumb: BreadcrumbItem = {
                        label: title,
                        url: url,
                        active: false
                    };
                    breadcrumbs.push(breadcrumb);
                }
            }

            // Recursive call
            return this.buildBreadcrumbs(child, url, breadcrumbs);
        }

        // Mark the last breadcrumb as active
        if (breadcrumbs.length > 0) {
            breadcrumbs[breadcrumbs.length - 1].active = true;
        }

        return breadcrumbs;
    }

    setBreadcrumbs(breadcrumbs: BreadcrumbItem[]): void {
        this.breadcrumbsSubject.next(breadcrumbs);
    }

    addBreadcrumb(breadcrumb: BreadcrumbItem): void {
        const currentBreadcrumbs = this.breadcrumbsSubject.value;
        // Mark all existing breadcrumbs as inactive
        currentBreadcrumbs.forEach(b => b.active = false);
        // Add new breadcrumb as active
        breadcrumb.active = true;
        this.breadcrumbsSubject.next([...currentBreadcrumbs, breadcrumb]);
    }
}