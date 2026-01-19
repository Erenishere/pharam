/**
 * Accessibility Service for Sales Invoice Module
 * Provides WCAG 2.1 AA compliance utilities and ARIA management
 */

import { Injectable, ElementRef, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AriaAnnouncement {
    message: string;
    priority: 'polite' | 'assertive';
    timeout?: number;
}

export interface FocusTarget {
    element: HTMLElement;
    options?: FocusOptions;
}

@Injectable({
    providedIn: 'root'
})
export class AccessibilityService {
    private renderer: Renderer2;
    private liveRegionPolite: HTMLElement | null = null;
    private liveRegionAssertive: HTMLElement | null = null;

    // Keyboard navigation state
    private keyboardNavigationActive = new BehaviorSubject<boolean>(false);
    public keyboardNavigationActive$ = this.keyboardNavigationActive.asObservable();

    // Focus management
    private focusHistory: HTMLElement[] = [];
    private trapFocusElements: HTMLElement[] = [];

    // High contrast mode detection
    private highContrastMode = new BehaviorSubject<boolean>(false);
    public highContrastMode$ = this.highContrastMode.asObservable();

    // Reduced motion preference
    private reducedMotion = new BehaviorSubject<boolean>(false);
    public reducedMotion$ = this.reducedMotion.asObservable();

    constructor(private rendererFactory: RendererFactory2) {
        this.renderer = this.rendererFactory.createRenderer(null, null);
        this.initializeAccessibilityFeatures();
    }

    /**
     * Initialize accessibility features and event listeners
     */
    private initializeAccessibilityFeatures(): void {
        this.createLiveRegions();
        this.detectKeyboardNavigation();
        this.detectHighContrastMode();
        this.detectReducedMotion();
        this.setupGlobalKeyboardHandlers();
    }

    /**
     * Create ARIA live regions for announcements
     */
    private createLiveRegions(): void {
        // Polite live region for non-urgent announcements
        this.liveRegionPolite = this.renderer.createElement('div');
        this.renderer.setAttribute(this.liveRegionPolite, 'aria-live', 'polite');
        this.renderer.setAttribute(this.liveRegionPolite, 'aria-atomic', 'true');
        this.renderer.addClass(this.liveRegionPolite, 'sr-only');
        this.renderer.setAttribute(this.liveRegionPolite, 'id', 'live-region-polite');
        this.renderer.appendChild(document.body, this.liveRegionPolite);

        // Assertive live region for urgent announcements
        this.liveRegionAssertive = this.renderer.createElement('div');
        this.renderer.setAttribute(this.liveRegionAssertive, 'aria-live', 'assertive');
        this.renderer.setAttribute(this.liveRegionAssertive, 'aria-atomic', 'true');
        this.renderer.addClass(this.liveRegionAssertive, 'sr-only');
        this.renderer.setAttribute(this.liveRegionAssertive, 'id', 'live-region-assertive');
        this.renderer.appendChild(document.body, this.liveRegionAssertive);
    }

    /**
     * Announce message to screen readers
     */
    announce(announcement: AriaAnnouncement): void {
        const liveRegion = announcement.priority === 'assertive'
            ? this.liveRegionAssertive
            : this.liveRegionPolite;

        if (!liveRegion) return;

        // Clear previous announcement
        this.renderer.setProperty(liveRegion, 'textContent', '');

        // Add new announcement after a brief delay to ensure it's announced
        setTimeout(() => {
            this.renderer.setProperty(liveRegion, 'textContent', announcement.message);

            // Clear announcement after timeout if specified
            if (announcement.timeout) {
                setTimeout(() => {
                    this.renderer.setProperty(liveRegion, 'textContent', '');
                }, announcement.timeout);
            }
        }, 100);
    }

    /**
     * Announce loading state
     */
    announceLoading(message: string = 'Loading...'): void {
        this.announce({
            message,
            priority: 'polite'
        });
    }

    /**
     * Announce completion of action
     */
    announceCompletion(message: string): void {
        this.announce({
            message,
            priority: 'polite',
            timeout: 5000
        });
    }

    /**
     * Announce error
     */
    announceError(message: string): void {
        this.announce({
            message: `Error: ${message}`,
            priority: 'assertive',
            timeout: 10000
        });
    }

    /**
     * Announce navigation change
     */
    announceNavigation(pageName: string, additionalInfo?: string): void {
        const message = additionalInfo
            ? `Navigated to ${pageName}. ${additionalInfo}`
            : `Navigated to ${pageName}`;

        this.announce({
            message,
            priority: 'polite'
        });
    }

    /**
     * Announce filter or search results
     */
    announceResults(count: number, itemType: string = 'items', filterInfo?: string): void {
        let message = `${count} ${itemType} found`;
        if (filterInfo) {
            message += ` ${filterInfo}`;
        }

        this.announce({
            message,
            priority: 'polite'
        });
    }

    /**
     * Detect keyboard navigation usage
     */
    private detectKeyboardNavigation(): void {
        // Listen for Tab key usage
        this.renderer.listen('document', 'keydown', (event: KeyboardEvent) => {
            if (event.key === 'Tab') {
                this.keyboardNavigationActive.next(true);
                this.renderer.addClass(document.body, 'keyboard-navigation');
            }
        });

        // Listen for mouse usage to disable keyboard navigation indicators
        this.renderer.listen('document', 'mousedown', () => {
            this.keyboardNavigationActive.next(false);
            this.renderer.removeClass(document.body, 'keyboard-navigation');
        });
    }

    /**
     * Detect high contrast mode
     */
    private detectHighContrastMode(): void {
        if (window.matchMedia) {
            const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
            this.highContrastMode.next(highContrastQuery.matches);

            highContrastQuery.addEventListener('change', (e) => {
                this.highContrastMode.next(e.matches);
                if (e.matches) {
                    this.renderer.addClass(document.body, 'high-contrast-mode');
                } else {
                    this.renderer.removeClass(document.body, 'high-contrast-mode');
                }
            });
        }
    }

    /**
     * Detect reduced motion preference
     */
    private detectReducedMotion(): void {
        if (window.matchMedia) {
            const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            this.reducedMotion.next(reducedMotionQuery.matches);

            reducedMotionQuery.addEventListener('change', (e) => {
                this.reducedMotion.next(e.matches);
                if (e.matches) {
                    this.renderer.addClass(document.body, 'reduced-motion');
                } else {
                    this.renderer.removeClass(document.body, 'reduced-motion');
                }
            });
        }
    }

    /**
     * Setup global keyboard handlers for accessibility
     */
    private setupGlobalKeyboardHandlers(): void {
        this.renderer.listen('document', 'keydown', (event: KeyboardEvent) => {
            // Escape key handling for modals and dropdowns
            if (event.key === 'Escape') {
                this.handleEscapeKey();
            }

            // Skip link activation
            if (event.key === 'Enter' && event.target instanceof HTMLAnchorElement) {
                const target = event.target as HTMLAnchorElement;
                if (target.classList.contains('skip-link')) {
                    event.preventDefault();
                    this.activateSkipLink(target);
                }
            }
        });
    }

    /**
     * Handle Escape key press
     */
    private handleEscapeKey(): void {
        // Close any open dropdowns or modals
        const openDropdowns = document.querySelectorAll('[aria-expanded="true"]');
        openDropdowns.forEach(dropdown => {
            if (dropdown instanceof HTMLElement) {
                dropdown.click(); // Trigger close
            }
        });

        // Return focus to previous element if focus was trapped
        if (this.focusHistory.length > 0) {
            const previousFocus = this.focusHistory.pop();
            if (previousFocus) {
                previousFocus.focus();
            }
        }
    }

    /**
     * Activate skip link
     */
    private activateSkipLink(skipLink: HTMLAnchorElement): void {
        const targetId = skipLink.getAttribute('href')?.substring(1);
        if (targetId) {
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.focus();
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }

    /**
     * Focus management utilities
     */

    /**
     * Set focus to element with options
     */
    setFocus(target: HTMLElement | string, options?: FocusOptions): void {
        let element: HTMLElement | null = null;

        if (typeof target === 'string') {
            element = document.getElementById(target) || document.querySelector(target);
        } else {
            element = target;
        }

        if (element) {
            // Store current focus for history
            if (document.activeElement instanceof HTMLElement) {
                this.focusHistory.push(document.activeElement);
            }

            element.focus(options);

            // Scroll into view if needed
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest'
            });
        }
    }

    /**
     * Return focus to previous element
     */
    returnFocus(): void {
        if (this.focusHistory.length > 0) {
            const previousElement = this.focusHistory.pop();
            if (previousElement) {
                previousElement.focus();
            }
        }
    }

    /**
     * Trap focus within container
     */
    trapFocus(container: HTMLElement): void {
        const focusableElements = this.getFocusableElements(container);
        this.trapFocusElements = focusableElements;

        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }

        // Add event listener for Tab key
        const trapListener = (event: KeyboardEvent) => {
            if (event.key === 'Tab') {
                this.handleFocusTrap(event, focusableElements);
            }
        };

        container.addEventListener('keydown', trapListener);

        // Store listener for cleanup
        (container as any)._focusTrapListener = trapListener;
    }

    /**
     * Release focus trap
     */
    releaseFocusTrap(container: HTMLElement): void {
        const listener = (container as any)._focusTrapListener;
        if (listener) {
            container.removeEventListener('keydown', listener);
            delete (container as any)._focusTrapListener;
        }

        this.trapFocusElements = [];
        this.returnFocus();
    }

    /**
     * Handle focus trap navigation
     */
    private handleFocusTrap(event: KeyboardEvent, focusableElements: HTMLElement[]): void {
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            }
        } else {
            // Tab
            if (document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        }
    }

    /**
     * Get all focusable elements within container
     */
    private getFocusableElements(container: HTMLElement): HTMLElement[] {
        const focusableSelectors = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
            '[contenteditable="true"]'
        ].join(', ');

        const elements = container.querySelectorAll(focusableSelectors);
        return Array.from(elements).filter(el => {
            return el instanceof HTMLElement && this.isVisible(el);
        }) as HTMLElement[];
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
     * ARIA attribute management
     */

    /**
     * Set ARIA attributes on element
     */
    setAriaAttributes(element: HTMLElement, attributes: { [key: string]: string }): void {
        Object.keys(attributes).forEach(key => {
            const ariaKey = key.startsWith('aria-') ? key : `aria-${key}`;
            this.renderer.setAttribute(element, ariaKey, attributes[key]);
        });
    }

    /**
     * Remove ARIA attributes from element
     */
    removeAriaAttributes(element: HTMLElement, attributes: string[]): void {
        attributes.forEach(attr => {
            const ariaKey = attr.startsWith('aria-') ? attr : `aria-${attr}`;
            this.renderer.removeAttribute(element, ariaKey);
        });
    }

    /**
     * Update ARIA expanded state
     */
    updateAriaExpanded(element: HTMLElement, expanded: boolean): void {
        this.renderer.setAttribute(element, 'aria-expanded', expanded.toString());
    }

    /**
     * Update ARIA selected state
     */
    updateAriaSelected(element: HTMLElement, selected: boolean): void {
        this.renderer.setAttribute(element, 'aria-selected', selected.toString());
    }

    /**
     * Update ARIA pressed state
     */
    updateAriaPressed(element: HTMLElement, pressed: boolean): void {
        this.renderer.setAttribute(element, 'aria-pressed', pressed.toString());
    }

    /**
     * Color contrast utilities
     */

    /**
     * Check if color combination meets WCAG contrast requirements
     */
    checkColorContrast(foreground: string, background: string, level: 'AA' | 'AAA' = 'AA'): boolean {
        const ratio = this.calculateContrastRatio(foreground, background);
        const requiredRatio = level === 'AAA' ? 7 : 4.5;
        return ratio >= requiredRatio;
    }

    /**
     * Calculate contrast ratio between two colors
     */
    private calculateContrastRatio(color1: string, color2: string): number {
        const luminance1 = this.getLuminance(color1);
        const luminance2 = this.getLuminance(color2);

        const lighter = Math.max(luminance1, luminance2);
        const darker = Math.min(luminance1, luminance2);

        return (lighter + 0.05) / (darker + 0.05);
    }

    /**
     * Get relative luminance of a color
     */
    private getLuminance(color: string): number {
        // This is a simplified implementation
        // In a real application, you'd want a more robust color parsing library
        const rgb = this.hexToRgb(color);
        if (!rgb) return 0;

        const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });

        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    /**
     * Convert hex color to RGB
     */
    private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    /**
     * Keyboard navigation utilities
     */

    /**
     * Handle arrow key navigation in a list
     */
    handleArrowKeyNavigation(
        event: KeyboardEvent,
        items: HTMLElement[],
        currentIndex: number,
        orientation: 'horizontal' | 'vertical' = 'vertical'
    ): number {
        let newIndex = currentIndex;

        switch (event.key) {
            case 'ArrowDown':
                if (orientation === 'vertical') {
                    event.preventDefault();
                    newIndex = (currentIndex + 1) % items.length;
                }
                break;
            case 'ArrowUp':
                if (orientation === 'vertical') {
                    event.preventDefault();
                    newIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
                }
                break;
            case 'ArrowRight':
                if (orientation === 'horizontal') {
                    event.preventDefault();
                    newIndex = (currentIndex + 1) % items.length;
                }
                break;
            case 'ArrowLeft':
                if (orientation === 'horizontal') {
                    event.preventDefault();
                    newIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
                }
                break;
            case 'Home':
                event.preventDefault();
                newIndex = 0;
                break;
            case 'End':
                event.preventDefault();
                newIndex = items.length - 1;
                break;
        }

        if (newIndex !== currentIndex && items[newIndex]) {
            items[newIndex].focus();
            return newIndex;
        }

        return currentIndex;
    }

    /**
     * Cleanup method
     */
    destroy(): void {
        // Remove live regions
        if (this.liveRegionPolite) {
            this.renderer.removeChild(document.body, this.liveRegionPolite);
        }
        if (this.liveRegionAssertive) {
            this.renderer.removeChild(document.body, this.liveRegionAssertive);
        }

        // Clear focus history
        this.focusHistory = [];
        this.trapFocusElements = [];

        // Complete observables
        this.keyboardNavigationActive.complete();
        this.highContrastMode.complete();
        this.reducedMotion.complete();
    }
}