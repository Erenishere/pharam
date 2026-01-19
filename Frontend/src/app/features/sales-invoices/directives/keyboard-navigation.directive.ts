/**
 * Keyboard Navigation Directive
 * Provides enhanced keyboard navigation support for complex components
 */

import {
    Directive,
    ElementRef,
    HostListener,
    Input,
    Output,
    EventEmitter,
    OnInit,
    OnDestroy,
    Renderer2
} from '@angular/core';
import { AccessibilityService } from '../services/accessibility.service';

export interface KeyboardNavigationConfig {
    orientation?: 'horizontal' | 'vertical' | 'both';
    wrap?: boolean;
    itemSelector?: string;
    skipDisabled?: boolean;
    announceNavigation?: boolean;
}

@Directive({
    selector: '[appKeyboardNavigation]',
    exportAs: 'keyboardNavigation'
})
export class KeyboardNavigationDirective implements OnInit, OnDestroy {
    @Input() keyboardNavigationConfig: KeyboardNavigationConfig = {};
    @Input() keyboardNavigationItems: HTMLElement[] = [];
    @Input() keyboardNavigationCurrentIndex: number = 0;

    @Output() navigationChange = new EventEmitter<{
        previousIndex: number;
        currentIndex: number;
        item: HTMLElement;
    }>();

    @Output() itemActivated = new EventEmitter<{
        index: number;
        item: HTMLElement;
    }>();

    private items: HTMLElement[] = [];
    private currentIndex: number = 0;
    private config: Required<KeyboardNavigationConfig>;
    private mutationObserver?: MutationObserver;

    constructor(
        private elementRef: ElementRef<HTMLElement>,
        private renderer: Renderer2,
        private accessibilityService: AccessibilityService
    ) {
        // Default configuration
        this.config = {
            orientation: 'vertical',
            wrap: true,
            itemSelector: '[tabindex], button, a, input, select, textarea',
            skipDisabled: true,
            announceNavigation: false
        };
    }

    ngOnInit(): void {
        this.updateConfig();
        this.initializeItems();
        this.setupMutationObserver();
        this.setupAriaAttributes();
    }

    ngOnDestroy(): void {
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }
    }

    /**
     * Update configuration with input values
     */
    private updateConfig(): void {
        this.config = { ...this.config, ...this.keyboardNavigationConfig };
    }

    /**
     * Initialize navigation items
     */
    private initializeItems(): void {
        if (this.keyboardNavigationItems.length > 0) {
            this.items = this.keyboardNavigationItems;
        } else {
            this.findNavigationItems();
        }

        this.currentIndex = Math.max(0, Math.min(this.keyboardNavigationCurrentIndex, this.items.length - 1));
        this.updateItemAttributes();
    }

    /**
     * Find navigation items within the container
     */
    private findNavigationItems(): void {
        const container = this.elementRef.nativeElement;
        const elements = container.querySelectorAll(this.config.itemSelector);

        this.items = Array.from(elements).filter(el => {
            if (!(el instanceof HTMLElement)) return false;

            // Skip disabled items if configured
            if (this.config.skipDisabled && this.isDisabled(el)) return false;

            // Skip hidden items
            if (!this.isVisible(el)) return false;

            return true;
        }) as HTMLElement[];
    }

    /**
     * Setup mutation observer to watch for DOM changes
     */
    private setupMutationObserver(): void {
        this.mutationObserver = new MutationObserver(() => {
            this.findNavigationItems();
            this.updateItemAttributes();
        });

        this.mutationObserver.observe(this.elementRef.nativeElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['disabled', 'tabindex', 'aria-disabled']
        });
    }

    /**
     * Setup ARIA attributes for the container
     */
    private setupAriaAttributes(): void {
        const container = this.elementRef.nativeElement;

        // Set role if not already present
        if (!container.getAttribute('role')) {
            this.renderer.setAttribute(container, 'role', 'listbox');
        }

        // Set aria-orientation
        if (this.config.orientation !== 'both') {
            this.renderer.setAttribute(container, 'aria-orientation', this.config.orientation);
        }

        // Set aria-activedescendant if items have IDs
        this.updateActiveDescendant();
    }

    /**
     * Update ARIA attributes for navigation items
     */
    private updateItemAttributes(): void {
        this.items.forEach((item, index) => {
            // Set role if not present
            if (!item.getAttribute('role')) {
                this.renderer.setAttribute(item, 'role', 'option');
            }

            // Set tabindex
            const tabIndex = index === this.currentIndex ? '0' : '-1';
            this.renderer.setAttribute(item, 'tabindex', tabIndex);

            // Set aria-selected
            const selected = index === this.currentIndex ? 'true' : 'false';
            this.renderer.setAttribute(item, 'aria-selected', selected);

            // Ensure item has an ID for aria-activedescendant
            if (!item.id) {
                const id = `keyboard-nav-item-${Math.random().toString(36).substr(2, 9)}`;
                this.renderer.setAttribute(item, 'id', id);
            }
        });

        this.updateActiveDescendant();
    }

    /**
     * Update aria-activedescendant
     */
    private updateActiveDescendant(): void {
        const container = this.elementRef.nativeElement;
        const currentItem = this.items[this.currentIndex];

        if (currentItem && currentItem.id) {
            this.renderer.setAttribute(container, 'aria-activedescendant', currentItem.id);
        } else {
            this.renderer.removeAttribute(container, 'aria-activedescendant');
        }
    }

    /**
     * Handle keyboard events
     */
    @HostListener('keydown', ['$event'])
    onKeyDown(event: KeyboardEvent): void {
        if (this.items.length === 0) return;

        const previousIndex = this.currentIndex;
        let handled = false;

        switch (event.key) {
            case 'ArrowDown':
                if (this.config.orientation === 'vertical' || this.config.orientation === 'both') {
                    event.preventDefault();
                    this.navigateToNext();
                    handled = true;
                }
                break;

            case 'ArrowUp':
                if (this.config.orientation === 'vertical' || this.config.orientation === 'both') {
                    event.preventDefault();
                    this.navigateToPrevious();
                    handled = true;
                }
                break;

            case 'ArrowRight':
                if (this.config.orientation === 'horizontal' || this.config.orientation === 'both') {
                    event.preventDefault();
                    this.navigateToNext();
                    handled = true;
                }
                break;

            case 'ArrowLeft':
                if (this.config.orientation === 'horizontal' || this.config.orientation === 'both') {
                    event.preventDefault();
                    this.navigateToPrevious();
                    handled = true;
                }
                break;

            case 'Home':
                event.preventDefault();
                this.navigateToFirst();
                handled = true;
                break;

            case 'End':
                event.preventDefault();
                this.navigateToLast();
                handled = true;
                break;

            case 'Enter':
            case ' ':
                event.preventDefault();
                this.activateCurrentItem();
                handled = true;
                break;

            case 'Tab':
                // Allow normal tab behavior but update our tracking
                if (event.shiftKey) {
                    this.navigateToPrevious();
                } else {
                    this.navigateToNext();
                }
                break;
        }

        if (handled && previousIndex !== this.currentIndex) {
            this.emitNavigationChange(previousIndex);

            if (this.config.announceNavigation) {
                this.announceCurrentItem();
            }
        }
    }

    /**
     * Navigate to next item
     */
    private navigateToNext(): void {
        if (this.items.length === 0) return;

        let nextIndex = this.currentIndex + 1;

        if (nextIndex >= this.items.length) {
            nextIndex = this.config.wrap ? 0 : this.items.length - 1;
        }

        this.navigateToIndex(nextIndex);
    }

    /**
     * Navigate to previous item
     */
    private navigateToPrevious(): void {
        if (this.items.length === 0) return;

        let previousIndex = this.currentIndex - 1;

        if (previousIndex < 0) {
            previousIndex = this.config.wrap ? this.items.length - 1 : 0;
        }

        this.navigateToIndex(previousIndex);
    }

    /**
     * Navigate to first item
     */
    private navigateToFirst(): void {
        this.navigateToIndex(0);
    }

    /**
     * Navigate to last item
     */
    private navigateToLast(): void {
        this.navigateToIndex(this.items.length - 1);
    }

    /**
     * Navigate to specific index
     */
    private navigateToIndex(index: number): void {
        if (index < 0 || index >= this.items.length) return;

        const previousIndex = this.currentIndex;
        this.currentIndex = index;

        this.updateItemAttributes();
        this.focusCurrentItem();

        if (previousIndex !== this.currentIndex) {
            this.emitNavigationChange(previousIndex);
        }
    }

    /**
     * Focus current item
     */
    private focusCurrentItem(): void {
        const currentItem = this.items[this.currentIndex];
        if (currentItem) {
            currentItem.focus();
        }
    }

    /**
     * Activate current item
     */
    private activateCurrentItem(): void {
        const currentItem = this.items[this.currentIndex];
        if (currentItem) {
            // Trigger click event
            currentItem.click();

            this.itemActivated.emit({
                index: this.currentIndex,
                item: currentItem
            });
        }
    }

    /**
     * Emit navigation change event
     */
    private emitNavigationChange(previousIndex: number): void {
        const currentItem = this.items[this.currentIndex];
        if (currentItem) {
            this.navigationChange.emit({
                previousIndex,
                currentIndex: this.currentIndex,
                item: currentItem
            });
        }
    }

    /**
     * Announce current item to screen readers
     */
    private announceCurrentItem(): void {
        const currentItem = this.items[this.currentIndex];
        if (currentItem) {
            const text = this.getItemText(currentItem);
            const position = `${this.currentIndex + 1} of ${this.items.length}`;

            this.accessibilityService.announce({
                message: `${text}, ${position}`,
                priority: 'polite'
            });
        }
    }

    /**
     * Get text content of item for announcements
     */
    private getItemText(item: HTMLElement): string {
        // Try aria-label first
        const ariaLabel = item.getAttribute('aria-label');
        if (ariaLabel) return ariaLabel;

        // Try aria-labelledby
        const ariaLabelledBy = item.getAttribute('aria-labelledby');
        if (ariaLabelledBy) {
            const labelElement = document.getElementById(ariaLabelledBy);
            if (labelElement) return labelElement.textContent?.trim() || '';
        }

        // Fall back to text content
        return item.textContent?.trim() || '';
    }

    /**
     * Check if element is disabled
     */
    private isDisabled(element: HTMLElement): boolean {
        return element.hasAttribute('disabled') ||
            element.getAttribute('aria-disabled') === 'true' ||
            element.getAttribute('tabindex') === '-1';
    }

    /**
     * Check if element is visible
     */
    private isVisible(element: HTMLElement): boolean {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            element.offsetWidth > 0 &&
            element.offsetHeight > 0;
    }

    /**
     * Public API methods
     */

    /**
     * Programmatically navigate to index
     */
    public navigateTo(index: number): void {
        this.navigateToIndex(index);
    }

    /**
     * Get current navigation index
     */
    public getCurrentIndex(): number {
        return this.currentIndex;
    }

    /**
     * Get current navigation item
     */
    public getCurrentItem(): HTMLElement | null {
        return this.items[this.currentIndex] || null;
    }

    /**
     * Get all navigation items
     */
    public getItems(): HTMLElement[] {
        return [...this.items];
    }

    /**
     * Refresh navigation items
     */
    public refresh(): void {
        this.findNavigationItems();
        this.updateItemAttributes();
    }

    /**
     * Set focus to the navigation container
     */
    public focus(): void {
        this.focusCurrentItem();
    }
}