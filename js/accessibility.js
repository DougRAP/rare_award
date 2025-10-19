/**
 * R.A.R.E. Award Website - Accessibility Module
 * Provides site-wide accessibility enhancements and utilities
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        headerOffset: 80,
        focusTrapSelector: '.focus-trap',
        skipLinkTarget: '#main, [data-main], main, .main-content',
        focusableElements: 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable], details, summary',
        interactiveRoles: '[role="button"], [data-button]'
    };

    // State
    const state = {
        isTabbing: false,
        currentFocusTrap: null,
        previousFocus: null,
        reducedMotion: false,
        liveRegions: {}
    };

    /**
     * Check reduced motion preference
     */
    function checkReducedMotion() {
        state.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
            state.reducedMotion = e.matches;
        });
    }

    /**
     * Initialize skip link functionality
     */
    function initSkipLink() {
        const skipLinks = document.querySelectorAll('a[href^="#"]:not([href="#"])');
        
        skipLinks.forEach(link => {
            const text = link.textContent.toLowerCase();
            if (text.includes('skip') || text.includes('jump')) {
                link.addEventListener('click', handleSkipLink);
            }
        });
    }

    /**
     * Handle skip link activation
     */
    function handleSkipLink(e) {
        const href = e.currentTarget.getAttribute('href');
        const target = document.querySelector(href) || document.querySelector(CONFIG.skipLinkTarget);
        
        if (target) {
            e.preventDefault();
            
            // Make focusable if not already
            if (!target.hasAttribute('tabindex')) {
                target.setAttribute('tabindex', '-1');
            }
            
            // Scroll and focus
            const top = target.getBoundingClientRect().top + window.pageYOffset - CONFIG.headerOffset;
            
            if (!state.reducedMotion) {
                window.scrollTo({
                    top: top,
                    behavior: 'smooth'
                });
                setTimeout(() => target.focus(), 300);
            } else {
                window.scrollTo(0, top);
                target.focus();
            }
        }
    }

    /**
     * Initialize keyboard detection
     */
    function initKeyboardDetection() {
        // Detect Tab key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' && !state.isTabbing) {
                state.isTabbing = true;
                document.body.classList.add('user-is-tabbing');
            }
        });

        // Remove on mouse interaction
        document.addEventListener('mousedown', () => {
            if (state.isTabbing) {
                state.isTabbing = false;
                document.body.classList.remove('user-is-tabbing');
            }
        });
    }

    /**
     * Initialize focus management
     */
    function initFocusManagement() {
        // Handle hash changes
        window.addEventListener('hashchange', handleHashChange);
        
        // Initial check for hash
        if (window.location.hash) {
            setTimeout(() => handleHashChange(), 100);
        }

        // Monitor modal/overlay changes
        observeFocusTraps();
    }

    /**
     * Handle hash change for focus management
     */
    function handleHashChange() {
        const hash = window.location.hash;
        if (!hash || hash === '#') return;

        const target = document.querySelector(hash);
        if (target) {
            // Make focusable if needed
            if (!target.hasAttribute('tabindex')) {
                target.setAttribute('tabindex', '-1');
            }

            // Focus after scroll completes
            setTimeout(() => {
                target.focus();
                
                // Announce to screen reader
                const heading = target.querySelector('h1, h2, h3, h4, h5, h6') || target;
                const text = heading.textContent || 'Section';
                A11y.announce(`Navigated to ${text}`);
            }, 100);
        }
    }

    /**
     * Observe focus trap elements
     */
    function observeFocusTraps() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const element = mutation.target;
                    
                    if (element.matches(CONFIG.focusTrapSelector)) {
                        const isActive = element.classList.contains('open') || 
                                       element.classList.contains('active') ||
                                       element.classList.contains('visible');
                        
                        if (isActive && !state.currentFocusTrap) {
                            activateFocusTrap(element);
                        } else if (!isActive && state.currentFocusTrap === element) {
                            deactivateFocusTrap();
                        }
                    }
                }
            });
        });

        // Observe all potential focus traps
        document.querySelectorAll(CONFIG.focusTrapSelector).forEach(element => {
            observer.observe(element, { attributes: true });
        });

        // Also check modals
        document.querySelectorAll('.modal, [role="dialog"]').forEach(element => {
            observer.observe(element, { attributes: true });
            
            // Check initial state
            if (element.classList.contains('open') || element.classList.contains('active')) {
                activateFocusTrap(element);
            }
        });
    }

    /**
     * Activate focus trap
     */
    function activateFocusTrap(element) {
        state.previousFocus = document.activeElement;
        state.currentFocusTrap = element;

        // Find first focusable element
        const focusable = element.querySelectorAll(CONFIG.focusableElements);
        if (focusable.length > 0) {
            focusable[0].focus();
        }

        // Add trap listener
        element._trapHandler = createFocusTrapHandler(element);
        element.addEventListener('keydown', element._trapHandler);
    }

    /**
     * Deactivate focus trap
     */
    function deactivateFocusTrap() {
        if (state.currentFocusTrap && state.currentFocusTrap._trapHandler) {
            state.currentFocusTrap.removeEventListener('keydown', state.currentFocusTrap._trapHandler);
            delete state.currentFocusTrap._trapHandler;
        }

        // Restore focus
        if (state.previousFocus && state.previousFocus.focus) {
            state.previousFocus.focus();
        }

        state.currentFocusTrap = null;
        state.previousFocus = null;
    }

    /**
     * Create focus trap handler
     */
    function createFocusTrapHandler(container) {
        return function(e) {
            if (e.key !== 'Tab') return;

            const focusable = Array.from(container.querySelectorAll(CONFIG.focusableElements))
                .filter(el => !el.disabled && el.offsetParent !== null);

            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
    }

    /**
     * Initialize live regions
     */
    function initLiveRegions() {
        // Create polite region
        let politeRegion = document.getElementById('sr-live-polite');
        if (!politeRegion) {
            politeRegion = document.createElement('div');
            politeRegion.id = 'sr-live-polite';
            politeRegion.className = 'sr-only';
            politeRegion.setAttribute('aria-live', 'polite');
            politeRegion.setAttribute('aria-atomic', 'true');
            document.body.appendChild(politeRegion);
        }
        state.liveRegions.polite = politeRegion;

        // Create assertive region
        let assertiveRegion = document.getElementById('sr-live-assertive');
        if (!assertiveRegion) {
            assertiveRegion = document.createElement('div');
            assertiveRegion.id = 'sr-live-assertive';
            assertiveRegion.className = 'sr-only';
            assertiveRegion.setAttribute('aria-live', 'assertive');
            assertiveRegion.setAttribute('aria-atomic', 'true');
            document.body.appendChild(assertiveRegion);
        }
        state.liveRegions.assertive = assertiveRegion;

        // Add styles if needed
        if (!document.getElementById('a11y-live-region-styles')) {
            const style = document.createElement('style');
            style.id = 'a11y-live-region-styles';
            style.textContent = `
                .sr-only {
                    position: absolute !important;
                    width: 1px !important;
                    height: 1px !important;
                    margin: -1px !important;
                    padding: 0 !important;
                    overflow: hidden !important;
                    clip: rect(0, 0, 0, 0) !important;
                    white-space: nowrap !important;
                    border: 0 !important;
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Initialize button role support
     */
    function initButtonRoles() {
        document.addEventListener('click', handleButtonClick);
        document.addEventListener('keydown', handleButtonKeydown);
    }

    /**
     * Handle button role clicks
     */
    function handleButtonClick(e) {
        const button = e.target.closest(CONFIG.interactiveRoles);
        if (button && button.getAttribute('role') === 'button') {
            // Already handled by native click
        }
    }

    /**
     * Handle button role keyboard
     */
    function handleButtonKeydown(e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;

        const button = e.target;
        if (button.matches(CONFIG.interactiveRoles)) {
            if (e.key === ' ') {
                e.preventDefault();
            }
            button.click();
        }
    }

    /**
     * Initialize ESC key handling
     */
    function initEscapeKey() {
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;

            // Find all elements with data-esc-close
            const closeables = document.querySelectorAll('[data-esc-close]');
            
            closeables.forEach(element => {
                const isVisible = element.classList.contains('open') || 
                                element.classList.contains('active') ||
                                element.classList.contains('visible') ||
                                element.offsetParent !== null;
                
                if (isVisible) {
                    // Remove active classes
                    element.classList.remove('open', 'active', 'visible');
                    
                    // Trigger close event
                    element.dispatchEvent(new CustomEvent('esc-close'));
                    
                    // Find close button and click it
                    const closeBtn = element.querySelector('[data-close], .close, [aria-label*="close"]');
                    if (closeBtn) closeBtn.click();
                }
            });
        });
    }

    /**
     * Initialize ARIA attribute management
     */
    function initAriaManagement() {
        // Monitor elements with aria-controls
        const toggles = document.querySelectorAll('[aria-controls]');
        
        toggles.forEach(toggle => {
            const targetId = toggle.getAttribute('aria-controls');
            const target = document.getElementById(targetId);
            
            if (!target) return;

            // Set initial state
            const isExpanded = toggle.classList.contains('active') || 
                             target.classList.contains('open') ||
                             target.classList.contains('active');
            toggle.setAttribute('aria-expanded', isExpanded);

            // Monitor changes
            const observer = new MutationObserver(() => {
                const expanded = toggle.classList.contains('active') || 
                                target.classList.contains('open') ||
                                target.classList.contains('active');
                toggle.setAttribute('aria-expanded', expanded);
            });

            observer.observe(toggle, { attributes: true, attributeFilter: ['class'] });
            observer.observe(target, { attributes: true, attributeFilter: ['class'] });
        });
    }

    /**
     * A11y utility namespace
     */
    const A11y = {
        /**
         * Announce message to screen readers
         */
        announce(message, options = {}) {
            const polite = options.polite !== false;
            const region = polite ? state.liveRegions.polite : state.liveRegions.assertive;
            
            if (!region) return;

            // Clear and set new message
            region.textContent = '';
            setTimeout(() => {
                region.textContent = message;
                
                // Auto-clear after delay
                setTimeout(() => {
                    region.textContent = '';
                }, 1000);
            }, 100);
        },

        /**
         * Check if reduced motion is preferred
         */
        prefersReducedMotion() {
            return state.reducedMotion;
        },

        /**
         * Trap focus within element
         */
        trapFocus(element) {
            activateFocusTrap(element);
        },

        /**
         * Release focus trap
         */
        releaseFocus() {
            deactivateFocusTrap();
        },

        /**
         * Move focus to element
         */
        focusElement(selector) {
            const element = typeof selector === 'string' ? 
                document.querySelector(selector) : selector;
            
            if (element && element.focus) {
                if (!element.hasAttribute('tabindex')) {
                    element.setAttribute('tabindex', '-1');
                }
                element.focus();
            }
        }
    };

    /**
     * Main initialization
     */
    function initAccessibility() {
        checkReducedMotion();
        initSkipLink();
        initKeyboardDetection();
        initFocusManagement();
        initLiveRegions();
        initButtonRoles();
        initEscapeKey();
        initAriaManagement();

        console.log('✓ Accessibility module initialized');
    }

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAccessibility);
    } else {
        initAccessibility();
    }

    // Export globally
    window.initAccessibility = initAccessibility;
    window.A11y = A11y;

})();