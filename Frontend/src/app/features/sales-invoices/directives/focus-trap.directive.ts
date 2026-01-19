/**
 * Focus Trap Directive
 * Traps focus within a container for modal dialogs and dropdowns
 */

import {
    Directive,
    ElementRef,
    Input,
    OnInit,
    OnDestroy,
    Renderer2,
    AfterViewInit
} from '@angular/core';
import { AccessibilityService } from '../services/accessibility.service';

@Directive({
    selector: '[appFocusTrap]',
    exportAs: 'focusTrap'
})
export class FocusTrapDirective implements OnInit, AfterViewInit, OnDestroy {
    @Input() appFocusTrap: boolean = true;
    @Input() focusTrapAutoFocus: boolean = true;
    @Input() focusTrapRestoreFocus: boolean = true;
    @Input() focusTrapInitialFocus: string | HTMLElement | null = null;

    private focusableElements: HTMLElement[] = [];
    private firstFocusableElement: HTMLElement | null = null;
    private lastFocusableElement: HTMLElement | null = null;
    private previouslyFocusedElement: HTMLElement | null = null;
    private keydownListener?: () => void;
    private isActive: boolean = false;

    private readonly focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]',
        'audio[controls]',
        'video[controls]',
        'summary',
        'iframe'
    ].join(', ');

    constructor(
        private elementRef: ElementRef<HTMLElement>,
        private renderer: Renderer2,
        private accessibilityService: AccessibilityService
    ) { }

    ngOnInit(): void {
        if (this.focusTrapRestoreFocus && document.activeElement instanceof HTMLElement) {
            this.previouslyFocusedElement = document.activeElement;
        }
    }

    ngAfterViewInit(): void {
        if (this.appFocusTrap) {
            this.activate();
        }
    }

    ngOnDestroy(): void {
        this.deactivate();
    }

    /**
     * Activate focus trap
     */
    public activate(): void {
        if (this.isActive) return;

        this.updateFocusableElements();
        this.setupEventListeners();
        this.setInitialFocus();
        this.isActive = true;

        // Announce to screen readers that a modal/dialog is open
        this.accessibilityService.announce({
            message: 'Dialog opened',
            priority: 'polite'
        });
    }

    /**
     * Deactivate focus trap
     */
    public deactivate(): void {
        if (!this.isActive) return;

        this.removeEventListeners();
        this.restoreFocus();
        this.isActive = false;

        // Announce to screen readers that the modal/dialog is closed
        this.accessibilityService.announce({
            message: 'Dialog closed',
            priority: 'polite'
        });
    }

    /**
     * Update the list of focusable elements
     */
    private updateFocusableElements(): void {
        const container = this.elementRef.nativeElement;
        const elements = container.querySelectorAll(this.focusableSelectors);

        this.focusableElements = Array.from(elements).filter(el => {
            return el instanceof HTMLElement && this.isVisible(el) && !this.isDisabled(el);
        }) as HTMLElement[];

        this.firstFocusableElement = this.focusableElements[0] || null;
        this.lastFocusableElement = this.focusableElements[this.focusableElements.length - 1] || null;
    }

    /**
     * Setup event listeners for focus trapping
     */
    private setupEventListeners(): void {
        this.keydownListener = this.renderer.listen(
            this.elementRef.nativeElement,
            'keydown',
            (event: KeyboardEvent) => this.handleKeydown(event)
        );

        // Listen for DOM changes to update focusable elements
        const observer = new MutationObserver(() => {
            this.updateFocusableElements();
        });

        observer.observe(this.elementRef.nativeElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['disabled', 'tabindex', 'aria-disabled', 'hidden']
        });

        // Store observer for cleanup
        (this.elementRef.nativeElement as any)._focusTrapObserver = observer;
    }

    /**
     * Remove event listeners
     */
    private removeEventListeners(): void {
        if (this.keydownListener) {
            this.keydownListener();
            this.keydownListener = undefined;
        }

        const observer = (this.elementRef.nativeElement as any)._focusTrapObserver;
        if (observer) {
            observer.disconnect();
            delete (this.elementRef.nativeElement as any)._focusTrapObserver;
        }
    }

    /**
     * Handle keydown events for focus trapping
     */
    private handleKeydown(event: KeyboardEvent): void {
        if (event.key !== 'Tab') return;

        // If no focusable elements, prevent tabbing
        if (this.focusableElements.length === 0) {
            event.preventDefault();
            return;
        }

        // If only one focusable element, keep focus on it
        if (this.focusableElements.length === 1) {
            event.preventDefault();
            this.firstFocusableElement?.focus();
            return;
        }

        const activeElement = document.activeElement as HTMLElement;
        const currentIndex = this.focusableElements.indexOf(activeElement);

        if (event.shiftKey) {
            // Shift + Tab (backward)
            if (currentIndex <= 0) {
                event.preventDefault();
                this.lastFocusableElement?.focus();
            }
        } else {
            // Tab (forward)
            if (currentIndex >= this.focusableElements.length - 1) {
                event.preventDefault();
                this.firstFocusableElement?.focus();
            }
        }
    }

    /**
     * Set initial focus when trap is activated
     */
    private setInitialFocus(): void {
        if (!this.focusTrapAutoFocus) return;

        let elementToFocus: HTMLElement | null = null;

        // Try to focus the specified initial focus element
        if (this.focusTrapInitialFocus) {
            if (typeof this.focusTrapInitialFocus === 'string') {
                elementToFocus = this.elementRef.nativeElement.querySelector(this.focusTrapInitialFocus);
            } else {
                elementToFocus = this.focusTrapInitialFocus;
            }
        }

        // Fall back to first focusable element
        if (!elementToFocus || !this.isVisible(elementToFocus) || this.isDisabled(elementToFocus)) {
            elementToFocus = this.firstFocusableElement;
        }

        // Fall back to the container itself
        if (!elementToFocus) {
            elementToFocus = this.elementRef.nativeElement;
            this.renderer.setAttribute(elementToFocus, 'tabindex', '-1');
        }

        if (elementToFocus) {
            // Use setTimeout to ensure the element is ready for focus
            setTimeout(() => {
                elementToFocus?.focus();
            }, 0);
        }
    }

    /**
     * Restore focus to previously focused element
     */
    private restoreFocus(): void {
        if (this.focusTrapRestoreFocus && this.previouslyFocusedElement) {
            // Use setTimeout to ensure the element is ready for focus
            setTimeout(() => {
                this.previouslyFocusedElement?.focus();
            }, 0);
        }
    }

    /**
     * Check if element is visible
     */
    private isVisible(element: HTMLElement): boolean {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            !element.hidden &&
            element.offsetWidth > 0 &&
            element.offsetHeight > 0;
    }

    /**
     * Check if element is disabled
     */
    private isDisabled(element: HTMLElement): boolean {
        if (element.hasAttribute('disabled')) return true;
        if (element.getAttribute('aria-disabled') === 'true') return true;
        if (element.getAttribute('tabindex') === '-1') return true;

        // Check if element is inside a disabled fieldset
        let parent = element.parentElement;
        while (parent) {
            if (parent.tagName === 'FIELDSET' && parent.hasAttribute('disabled')) {
                return true;
            }
            parent = parent.parentElement;
        }

        return false;
    }

    /**
     * Public API methods
     */

    /**
     * Focus the first focusable element
     */
    public focusFirst(): void {
        this.firstFocusableElement?.focus();
    }

    /**
     * Focus the last focusable element
     */
    public focusLast(): void {
        this.lastFocusableElement?.focus();
    }

    /**
     * Get all focusable elements
     */
    public getFocusableElements(): HTMLElement[] {
        return [...this.focusableElements];
    }

    /**
     * Check if focus trap is active
     */
    public isActivated(): boolean {
        return this.isActive;
    }

    /**
     * Manually update focusable elements
     */
    public updateElements(): void {
        this.updateFocusableElements();
    }

    /**
     * Focus a specific element within the trap
     */
    public focusElement(selector: string | HTMLElement): boolean {
        let element: HTMLElement | null = null;

        if (typeof selector === 'string') {
            element = this.elementRef.nativeElement.querySelector(selector);
        } else {
            element = selector;
        }

        if (element && this.focusableElements.includes(element)) {
            element.focus();
            return true;
        }

        return false;
    }

    /**
     * Add an element to the focusable elements list
     */
    public addFocusableElement(element: HTMLElement): void {
        if (!this.focusableElements.includes(element)) {
            this.focusableElements.push(element);
            this.updateFocusableElements();
        }
    }

    /**
     * Remove an element from the focusable elements list
     */
    public removeFocusableElement(element: HTMLElement): void {
        const index = this.focusableElements.indexOf(element);
        if (index > -1) {
            this.focusableElements.splice(index, 1);
            this.updateFocusableElements();
        }
    }
}