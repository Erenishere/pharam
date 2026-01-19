/**
 * Sales Invoice Module - Accessibility Exports
 * Centralized exports for all accessibility-related components, services, and directives
 */

// Services
export * from '../services/accessibility.service';

// Directives
export * from '../directives/keyboard-navigation.directive';
export * from '../directives/focus-trap.directive';
export * from '../directives/aria-live.directive';

// Types and Interfaces
export interface AccessibilityConfig {
    enableKeyboardNavigation?: boolean;
    enableFocusTrapping?: boolean;
    enableAriaAnnouncements?: boolean;
    enableHighContrastMode?: boolean;
    enableReducedMotion?: boolean;
    announcePageChanges?: boolean;
    announceFormErrors?: boolean;
    announceLoadingStates?: boolean;
}

export interface KeyboardShortcut {
    key: string;
    ctrlKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    metaKey?: boolean;
    description: string;
    action: () => void;
    disabled?: boolean;
}

export interface ScreenReaderText {
    loading: string;
    error: string;
    success: string;
    noResults: string;
    resultsFound: string;
    pageNavigation: string;
    formValidation: string;
    actionCompleted: string;
}

// Default configurations
export const DEFAULT_ACCESSIBILITY_CONFIG: AccessibilityConfig = {
    enableKeyboardNavigation: true,
    enableFocusTrapping: true,
    enableAriaAnnouncements: true,
    enableHighContrastMode: true,
    enableReducedMotion: true,
    announcePageChanges: true,
    announceFormErrors: true,
    announceLoadingStates: true
};

export const DEFAULT_SCREEN_READER_TEXT: ScreenReaderText = {
    loading: 'Loading content, please wait...',
    error: 'An error occurred. Please try again.',
    success: 'Action completed successfully.',
    noResults: 'No results found.',
    resultsFound: 'results found',
    pageNavigation: 'Navigated to',
    formValidation: 'Form validation error',
    actionCompleted: 'Action completed'
};

// Accessibility utility functions
export class AccessibilityUtils {
    /**
     * Check if user prefers reduced motion
     */
    static prefersReducedMotion(): boolean {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * Check if user prefers high contrast
     */
    static prefersHighContrast(): boolean {
        return window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches;
    }

    /**
     * Check if user is using keyboard navigation
     */
    static isKeyboardUser(): boolean {
        return document.body.classList.contains('keyboard-navigation');
    }

    /**
     * Generate unique ID for ARIA relationships
     */
    static generateId(prefix: string = 'aria'): string {
        return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get accessible name for element
     */
    static getAccessibleName(element: HTMLElement): string {
        // Check aria-label
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel) return ariaLabel;

        // Check aria-labelledby
        const ariaLabelledBy = element.getAttribute('aria-labelledby');
        if (ariaLabelledBy) {
            const labelElement = document.getElementById(ariaLabelledBy);
            if (labelElement) return labelElement.textContent?.trim() || '';
        }

        // Check associated label
        if (element.id) {
            const label = document.querySelector(`label[for="${element.id}"]`);
            if (label) return label.textContent?.trim() || '';
        }

        // Check parent label
        const parentLabel = element.closest('label');
        if (parentLabel) return parentLabel.textContent?.trim() || '';

        // Fall back to text content
        return element.textContent?.trim() || '';
    }

    /**
     * Check if element is focusable
     */
    static isFocusable(element: HTMLElement): boolean {
        const focusableSelectors = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
            '[contenteditable="true"]'
        ];

        return focusableSelectors.some(selector => element.matches(selector)) &&
            this.isVisible(element) &&
            !this.isDisabled(element);
    }

    /**
     * Check if element is visible
     */
    static isVisible(element: HTMLElement): boolean {
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
    static isDisabled(element: HTMLElement): boolean {
        return element.hasAttribute('disabled') ||
            element.getAttribute('aria-disabled') === 'true' ||
            element.getAttribute('tabindex') === '-1';
    }

    /**
     * Calculate color contrast ratio
     */
    static calculateContrastRatio(foreground: string, background: string): number {
        const getLuminance = (color: string): number => {
            const rgb = this.hexToRgb(color);
            if (!rgb) return 0;

            const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
                c = c / 255;
                return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            });

            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };

        const luminance1 = getLuminance(foreground);
        const luminance2 = getLuminance(background);

        const lighter = Math.max(luminance1, luminance2);
        const darker = Math.min(luminance1, luminance2);

        return (lighter + 0.05) / (darker + 0.05);
    }

    /**
     * Convert hex color to RGB
     */
    private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    /**
     * Check WCAG compliance level
     */
    static checkWCAGCompliance(
        foreground: string,
        background: string,
        level: 'AA' | 'AAA' = 'AA',
        size: 'normal' | 'large' = 'normal'
    ): boolean {
        const ratio = this.calculateContrastRatio(foreground, background);

        if (level === 'AAA') {
            return size === 'large' ? ratio >= 4.5 : ratio >= 7;
        } else {
            return size === 'large' ? ratio >= 3 : ratio >= 4.5;
        }
    }

    /**
     * Create skip link
     */
    static createSkipLink(targetId: string, text: string = 'Skip to main content'): HTMLAnchorElement {
        const skipLink = document.createElement('a');
        skipLink.href = `#${targetId}`;
        skipLink.textContent = text;
        skipLink.className = 'skip-link';
        skipLink.setAttribute('aria-label', text);

        return skipLink;
    }

    /**
     * Announce to screen readers
     */
    static announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
        const liveRegion = document.getElementById(`live-region-${priority}`);
        if (liveRegion) {
            liveRegion.textContent = '';
            setTimeout(() => {
                liveRegion.textContent = message;
            }, 100);
        }
    }

    /**
     * Set up keyboard shortcuts
     */
    static setupKeyboardShortcuts(shortcuts: KeyboardShortcut[]): () => void {
        const handleKeydown = (event: KeyboardEvent) => {
            shortcuts.forEach(shortcut => {
                if (shortcut.disabled) return;

                const matches = event.key === shortcut.key &&
                    !!event.ctrlKey === !!shortcut.ctrlKey &&
                    !!event.altKey === !!shortcut.altKey &&
                    !!event.shiftKey === !!shortcut.shiftKey &&
                    !!event.metaKey === !!shortcut.metaKey;

                if (matches) {
                    event.preventDefault();
                    shortcut.action();
                }
            });
        };

        document.addEventListener('keydown', handleKeydown);

        // Return cleanup function
        return () => {
            document.removeEventListener('keydown', handleKeydown);
        };
    }
}

// ARIA role constants
export const ARIA_ROLES = {
    ALERT: 'alert',
    ALERTDIALOG: 'alertdialog',
    APPLICATION: 'application',
    ARTICLE: 'article',
    BANNER: 'banner',
    BUTTON: 'button',
    CELL: 'cell',
    CHECKBOX: 'checkbox',
    COLUMNHEADER: 'columnheader',
    COMBOBOX: 'combobox',
    COMPLEMENTARY: 'complementary',
    CONTENTINFO: 'contentinfo',
    DIALOG: 'dialog',
    DOCUMENT: 'document',
    FEED: 'feed',
    FIGURE: 'figure',
    FORM: 'form',
    GRID: 'grid',
    GRIDCELL: 'gridcell',
    GROUP: 'group',
    HEADING: 'heading',
    IMG: 'img',
    LINK: 'link',
    LIST: 'list',
    LISTBOX: 'listbox',
    LISTITEM: 'listitem',
    LOG: 'log',
    MAIN: 'main',
    MARQUEE: 'marquee',
    MATH: 'math',
    MENU: 'menu',
    MENUBAR: 'menubar',
    MENUITEM: 'menuitem',
    MENUITEMCHECKBOX: 'menuitemcheckbox',
    MENUITEMRADIO: 'menuitemradio',
    NAVIGATION: 'navigation',
    NONE: 'none',
    NOTE: 'note',
    OPTION: 'option',
    PRESENTATION: 'presentation',
    PROGRESSBAR: 'progressbar',
    RADIO: 'radio',
    RADIOGROUP: 'radiogroup',
    REGION: 'region',
    ROW: 'row',
    ROWGROUP: 'rowgroup',
    ROWHEADER: 'rowheader',
    SCROLLBAR: 'scrollbar',
    SEARCH: 'search',
    SEARCHBOX: 'searchbox',
    SEPARATOR: 'separator',
    SLIDER: 'slider',
    SPINBUTTON: 'spinbutton',
    STATUS: 'status',
    SWITCH: 'switch',
    TAB: 'tab',
    TABLE: 'table',
    TABLIST: 'tablist',
    TABPANEL: 'tabpanel',
    TERM: 'term',
    TEXTBOX: 'textbox',
    TIMER: 'timer',
    TOOLBAR: 'toolbar',
    TOOLTIP: 'tooltip',
    TREE: 'tree',
    TREEGRID: 'treegrid',
    TREEITEM: 'treeitem'
} as const;

// ARIA property constants
export const ARIA_PROPERTIES = {
    ACTIVEDESCENDANT: 'aria-activedescendant',
    ATOMIC: 'aria-atomic',
    AUTOCOMPLETE: 'aria-autocomplete',
    BUSY: 'aria-busy',
    CHECKED: 'aria-checked',
    COLCOUNT: 'aria-colcount',
    COLINDEX: 'aria-colindex',
    COLSPAN: 'aria-colspan',
    CONTROLS: 'aria-controls',
    CURRENT: 'aria-current',
    DESCRIBEDBY: 'aria-describedby',
    DETAILS: 'aria-details',
    DISABLED: 'aria-disabled',
    DROPEFFECT: 'aria-dropeffect',
    ERRORMESSAGE: 'aria-errormessage',
    EXPANDED: 'aria-expanded',
    FLOWTO: 'aria-flowto',
    GRABBED: 'aria-grabbed',
    HASPOPUP: 'aria-haspopup',
    HIDDEN: 'aria-hidden',
    INVALID: 'aria-invalid',
    KEYSHORTCUTS: 'aria-keyshortcuts',
    LABEL: 'aria-label',
    LABELLEDBY: 'aria-labelledby',
    LEVEL: 'aria-level',
    LIVE: 'aria-live',
    MODAL: 'aria-modal',
    MULTILINE: 'aria-multiline',
    MULTISELECTABLE: 'aria-multiselectable',
    ORIENTATION: 'aria-orientation',
    OWNS: 'aria-owns',
    PLACEHOLDER: 'aria-placeholder',
    POSINSET: 'aria-posinset',
    PRESSED: 'aria-pressed',
    READONLY: 'aria-readonly',
    RELEVANT: 'aria-relevant',
    REQUIRED: 'aria-required',
    ROLEDESCRIPTION: 'aria-roledescription',
    ROWCOUNT: 'aria-rowcount',
    ROWINDEX: 'aria-rowindex',
    ROWSPAN: 'aria-rowspan',
    SELECTED: 'aria-selected',
    SETSIZE: 'aria-setsize',
    SORT: 'aria-sort',
    VALUEMAX: 'aria-valuemax',
    VALUEMIN: 'aria-valuemin',
    VALUENOW: 'aria-valuenow',
    VALUETEXT: 'aria-valuetext'
} as const;