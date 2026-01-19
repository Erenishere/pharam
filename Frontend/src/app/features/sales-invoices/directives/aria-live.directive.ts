/**
 * ARIA Live Region Directive
 * Manages dynamic content announcements for screen readers
 */

import {
    Directive,
    ElementRef,
    Input,
    OnInit,
    OnDestroy,
    Renderer2,
    OnChanges,
    SimpleChanges
} from '@angular/core';

export type AriaLivePoliteness = 'off' | 'polite' | 'assertive';
export type AriaRelevant = 'additions' | 'removals' | 'text' | 'all';

@Directive({
    selector: '[appAriaLive]',
    exportAs: 'ariaLive'
})
export class AriaLiveDirective implements OnInit, OnChanges, OnDestroy {
    @Input() appAriaLive: AriaLivePoliteness = 'polite';
    @Input() ariaAtomic: boolean = true;
    @Input() ariaRelevant: AriaRelevant | AriaRelevant[] = 'additions text';
    @Input() ariaBusy: boolean = false;
    @Input() ariaLabel: string = '';
    @Input() announceChanges: boolean = true;
    @Input() clearDelay: number = 0; // Delay in ms before clearing content
    @Input() announceEmpty: boolean = false; // Whether to announce when content becomes empty

    private previousContent: string = '';
    private clearTimeout?: number;

    constructor(
        private elementRef: ElementRef<HTMLElement>,
        private renderer: Renderer2
    ) { }

    ngOnInit(): void {
        this.setupAriaAttributes();
        this.previousContent = this.getElementContent();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['appAriaLive']) {
            this.updateAriaLive();
        }

        if (changes['ariaAtomic']) {
            this.updateAriaAtomic();
        }

        if (changes['ariaRelevant']) {
            this.updateAriaRelevant();
        }

        if (changes['ariaBusy']) {
            this.updateAriaBusy();
        }

        if (changes['ariaLabel']) {
            this.updateAriaLabel();
        }
    }

    ngOnDestroy(): void {
        if (this.clearTimeout) {
            clearTimeout(this.clearTimeout);
        }
    }

    /**
     * Setup initial ARIA attributes
     */
    private setupAriaAttributes(): void {
        this.updateAriaLive();
        this.updateAriaAtomic();
        this.updateAriaRelevant();
        this.updateAriaBusy();
        this.updateAriaLabel();

        // Set up mutation observer to detect content changes
        this.setupContentObserver();
    }

    /**
     * Update aria-live attribute
     */
    private updateAriaLive(): void {
        this.renderer.setAttribute(
            this.elementRef.nativeElement,
            'aria-live',
            this.appAriaLive
        );
    }

    /**
     * Update aria-atomic attribute
     */
    private updateAriaAtomic(): void {
        this.renderer.setAttribute(
            this.elementRef.nativeElement,
            'aria-atomic',
            this.ariaAtomic.toString()
        );
    }

    /**
     * Update aria-relevant attribute
     */
    private updateAriaRelevant(): void {
        const relevant = Array.isArray(this.ariaRelevant)
            ? this.ariaRelevant.join(' ')
            : this.ariaRelevant;

        this.renderer.setAttribute(
            this.elementRef.nativeElement,
            'aria-relevant',
            relevant
        );
    }

    /**
     * Update aria-busy attribute
     */
    private updateAriaBusy(): void {
        if (this.ariaBusy) {
            this.renderer.setAttribute(
                this.elementRef.nativeElement,
                'aria-busy',
                'true'
            );
        } else {
            this.renderer.removeAttribute(
                this.elementRef.nativeElement,
                'aria-busy'
            );
        }
    }

    /**
     * Update aria-label attribute
     */
    private updateAriaLabel(): void {
        if (this.ariaLabel) {
            this.renderer.setAttribute(
                this.elementRef.nativeElement,
                'aria-label',
                this.ariaLabel
            );
        } else {
            this.renderer.removeAttribute(
                this.elementRef.nativeElement,
                'aria-label'
            );
        }
    }

    /**
     * Setup content observer to detect changes
     */
    private setupContentObserver(): void {
        if (!this.announceChanges) return;

        const observer = new MutationObserver((mutations) => {
            let contentChanged = false;

            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' ||
                    mutation.type === 'characterData' ||
                    (mutation.type === 'attributes' && mutation.attributeName === 'textContent')) {
                    contentChanged = true;
                }
            });

            if (contentChanged) {
                this.handleContentChange();
            }
        });

        observer.observe(this.elementRef.nativeElement, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: false
        });

        // Store observer for cleanup
        (this.elementRef.nativeElement as any)._ariaLiveObserver = observer;
    }

    /**
     * Handle content changes
     */
    private handleContentChange(): void {
        const currentContent = this.getElementContent();

        // Only process if content actually changed
        if (currentContent !== this.previousContent) {
            this.previousContent = currentContent;

            // Handle empty content announcement
            if (!currentContent && this.announceEmpty) {
                this.announceContent('Content cleared');
            }

            // Set up auto-clear if specified
            if (this.clearDelay > 0 && currentContent) {
                this.scheduleContentClear();
            }
        }
    }

    /**
     * Get current element content
     */
    private getElementContent(): string {
        return this.elementRef.nativeElement.textContent?.trim() || '';
    }

    /**
     * Schedule content clearing
     */
    private scheduleContentClear(): void {
        if (this.clearTimeout) {
            clearTimeout(this.clearTimeout);
        }

        this.clearTimeout = window.setTimeout(() => {
            this.clearContent();
        }, this.clearDelay);
    }

    /**
     * Public API methods
     */

    /**
     * Announce content to screen readers
     */
    public announceContent(content: string, temporary: boolean = false): void {
        // Clear any existing timeout
        if (this.clearTimeout) {
            clearTimeout(this.clearTimeout);
        }

        // Set the content
        this.renderer.setProperty(
            this.elementRef.nativeElement,
            'textContent',
            content
        );

        // Update previous content
        this.previousContent = content;

        // Clear content after delay if temporary
        if (temporary && this.clearDelay > 0) {
            this.scheduleContentClear();
        }
    }

    /**
     * Announce HTML content to screen readers
     */
    public announceHtml(html: string, temporary: boolean = false): void {
        // Clear any existing timeout
        if (this.clearTimeout) {
            clearTimeout(this.clearTimeout);
        }

        // Set the HTML content
        this.renderer.setProperty(
            this.elementRef.nativeElement,
            'innerHTML',
            html
        );

        // Update previous content
        this.previousContent = this.getElementContent();

        // Clear content after delay if temporary
        if (temporary && this.clearDelay > 0) {
            this.scheduleContentClear();
        }
    }

    /**
     * Clear the live region content
     */
    public clearContent(): void {
        if (this.clearTimeout) {
            clearTimeout(this.clearTimeout);
            this.clearTimeout = undefined;
        }

        this.renderer.setProperty(
            this.elementRef.nativeElement,
            'textContent',
            ''
        );

        this.previousContent = '';
    }

    /**
     * Set busy state
     */
    public setBusy(busy: boolean): void {
        this.ariaBusy = busy;
        this.updateAriaBusy();
    }

    /**
     * Set politeness level
     */
    public setPoliteness(politeness: AriaLivePoliteness): void {
        this.appAriaLive = politeness;
        this.updateAriaLive();
    }

    /**
     * Announce loading state
     */
    public announceLoading(message: string = 'Loading...'): void {
        this.setBusy(true);
        this.announceContent(message);
    }

    /**
     * Announce completion
     */
    public announceComplete(message: string): void {
        this.setBusy(false);
        this.announceContent(message, true);
    }

    /**
     * Announce error
     */
    public announceError(message: string): void {
        this.setBusy(false);
        this.setPoliteness('assertive');
        this.announceContent(`Error: ${message}`, false);

        // Reset to polite after announcement
        setTimeout(() => {
            this.setPoliteness('polite');
        }, 1000);
    }

    /**
     * Announce success
     */
    public announceSuccess(message: string): void {
        this.setBusy(false);
        this.announceContent(message, true);
    }

    /**
     * Announce status change
     */
    public announceStatus(status: string, details?: string): void {
        const message = details ? `${status}: ${details}` : status;
        this.announceContent(message, true);
    }

    /**
     * Announce count or results
     */
    public announceCount(count: number, itemType: string = 'items', action?: string): void {
        let message = `${count} ${itemType}`;
        if (action) {
            message += ` ${action}`;
        }
        this.announceContent(message, true);
    }

    /**
     * Announce navigation
     */
    public announceNavigation(location: string, position?: string): void {
        let message = `Navigated to ${location}`;
        if (position) {
            message += `, ${position}`;
        }
        this.announceContent(message, true);
    }

    /**
     * Get current politeness level
     */
    public getPoliteness(): AriaLivePoliteness {
        return this.appAriaLive;
    }

    /**
     * Get current content
     */
    public getCurrentContent(): string {
        return this.getElementContent();
    }

    /**
     * Check if busy
     */
    public isBusy(): boolean {
        return this.ariaBusy;
    }

    /**
     * Cleanup method
     */
    public destroy(): void {
        const observer = (this.elementRef.nativeElement as any)._ariaLiveObserver;
        if (observer) {
            observer.disconnect();
            delete (this.elementRef.nativeElement as any)._ariaLiveObserver;
        }

        if (this.clearTimeout) {
            clearTimeout(this.clearTimeout);
        }
    }
}