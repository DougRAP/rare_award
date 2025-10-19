/**
 * R.A.R.E. Award Website - Print Generator Module
 * Handles print preparation, execution, and cleanup for all pages
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        printClass: 'print-mode',
        printCloneId: 'print-clone',
        printOnlyClass: 'print-only-section',
        hideOnPrintClass: 'hide-for-print',
        accordionSelector: '.accordion, .accordion-content, [data-accordion]',
        lazyImageSelector: 'img[data-src]',
        printTriggers: '[data-print], #printPage, [rel="print"], .print-button'
    };

    // State
    const state = {
        isPrinting: false,
        originalTitle: '',
        expandedAccordions: [],
        printClone: null,
        savedStates: new Map()
    };

    /**
     * Initialize print triggers
     */
    function initPrintTriggers() {
        // Bind to print triggers
        document.addEventListener('click', (e) => {
            const trigger = e.target.closest(CONFIG.printTriggers);
            if (!trigger) return;

            e.preventDefault();
            
            // Check for specific target
            const targetSelector = trigger.dataset.printTarget;
            if (targetSelector) {
                printSection(targetSelector);
            } else {
                Print.prepare();
            }
        });

        // Listen for browser print events
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('print');
            mediaQuery.addListener((mql) => {
                if (mql.matches) {
                    beforePrint();
                } else {
                    afterPrint();
                }
            });
        }

        // Legacy browser support
        window.addEventListener('beforeprint', beforePrint);
        window.addEventListener('afterprint', afterPrint);
    }

    /**
     * Prepare page for printing
     */
    function beforePrint() {
        if (state.isPrinting) return;
        state.isPrinting = true;

        // Add print mode class
        document.body.classList.add(CONFIG.printClass);

        // Fill dynamic content
        fillPrintPlaceholders();

        // Prepare images
        Print.inlineImages();

        // Expand accordions
        Print.expandAllAccordions();
    }

    /**
     * Clean up after printing
     */
    function afterPrint() {
        if (!state.isPrinting) return;
        state.isPrinting = false;

        // Remove print mode class
        document.body.classList.remove(CONFIG.printClass, CONFIG.printOnlyClass);

        // Restore accordions
        Print.restoreAccordions();

        // Clean up print clone if exists
        if (state.printClone) {
            state.printClone.remove();
            state.printClone = null;
        }

        // Restore original title if changed
        if (state.originalTitle) {
            document.title = state.originalTitle;
            state.originalTitle = '';
        }

        // Clear saved states
        state.savedStates.clear();
    }

    /**
     * Fill print placeholders with dynamic data
     */
    function fillPrintPlaceholders() {
        // Fill datetime
        const dateElements = document.querySelectorAll('[data-print-datetime]');
        if (dateElements.length > 0) {
            const now = new Date();
            const formatted = now.toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            dateElements.forEach(el => {
                if (!el.dataset.originalContent) {
                    el.dataset.originalContent = el.textContent;
                }
                el.textContent = formatted;
            });
        }

        // Fill reference number
        const refElements = document.querySelectorAll('[data-print-ref]');
        if (refElements.length > 0) {
            const ref = sessionStorage.getItem('rare_submission_ref') || 'N/A';
            
            refElements.forEach(el => {
                if (!el.dataset.originalContent) {
                    el.dataset.originalContent = el.textContent;
                }
                el.textContent = ref;
            });
        }

        // Fill page URL
        const urlElements = document.querySelectorAll('[data-print-url]');
        if (urlElements.length > 0) {
            urlElements.forEach(el => {
                if (!el.dataset.originalContent) {
                    el.dataset.originalContent = el.textContent;
                }
                el.textContent = window.location.href;
            });
        }
    }

    /**
     * Print specific section only
     */
    function printSection(selector) {
        const section = document.querySelector(selector);
        if (!section) {
            console.warn('Print target not found:', selector);
            Print.prepare();
            return;
        }

        // Create clone container
        state.printClone = document.createElement('div');
        state.printClone.id = CONFIG.printCloneId;
        state.printClone.className = 'print-section-container';
        
        // Clone the section
        const clone = section.cloneNode(true);
        state.printClone.appendChild(clone);
        
        // Add to body
        document.body.appendChild(state.printClone);
        
        // Add special class to hide other content
        document.body.classList.add(CONFIG.printOnlyClass);
        
        // Add styles for section printing
        if (!document.getElementById('print-section-styles')) {
            const style = document.createElement('style');
            style.id = 'print-section-styles';
            style.textContent = `
                @media print {
                    body.${CONFIG.printOnlyClass} > *:not(#${CONFIG.printCloneId}) {
                        display: none !important;
                    }
                    #${CONFIG.printCloneId} {
                        display: block !important;
                        position: static !important;
                        width: 100% !important;
                        height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Trigger print
        Print.prepare();
    }

    /**
     * Public Print API
     */
    const Print = {
        /**
         * Prepare and trigger print
         */
        prepare(config = {}) {
            // Apply config
            if (config.title) {
                this.setTitle(config.title);
            }

            // Trigger print preparation
            beforePrint();

            // Delay print slightly to ensure DOM updates
            setTimeout(() => {
                window.print();
                
                // Ensure cleanup runs
                setTimeout(() => {
                    afterPrint();
                }, 100);
            }, 100);
        },

        /**
         * Clean up after print
         */
        cleanup() {
            afterPrint();
        },

        /**
         * Set temporary print title
         */
        setTitle(title) {
            if (!state.originalTitle) {
                state.originalTitle = document.title;
            }
            document.title = title;
        },

        /**
         * Ensure lazy images are loaded
         */
        inlineImages() {
            const lazyImages = document.querySelectorAll(CONFIG.lazyImageSelector);
            
            lazyImages.forEach(img => {
                if (img.dataset.src && !img.src) {
                    img.src = img.dataset.src;
                    
                    // Save state for restoration
                    state.savedStates.set(img, {
                        src: img.src,
                        dataSrc: img.dataset.src
                    });
                }
            });

            // Also handle background images
            const bgElements = document.querySelectorAll('[data-bg-src]');
            bgElements.forEach(el => {
                if (el.dataset.bgSrc && !el.style.backgroundImage) {
                    el.style.backgroundImage = `url(${el.dataset.bgSrc})`;
                    
                    state.savedStates.set(el, {
                        backgroundImage: el.style.backgroundImage
                    });
                }
            });
        },

        /**
         * Expand all accordions for printing
         */
        expandAllAccordions() {
            // Find all accordions
            const accordions = document.querySelectorAll(CONFIG.accordionSelector);
            
            accordions.forEach(accordion => {
                // Check if it's collapsed
                const isCollapsed = !accordion.classList.contains('active') && 
                                  !accordion.classList.contains('open') &&
                                  !accordion.classList.contains('expanded');
                
                if (isCollapsed) {
                    // Save original state
                    state.expandedAccordions.push(accordion);
                    
                    // Expand for print
                    accordion.classList.add('print-expanded');
                    
                    // Handle accordion content
                    let content = accordion.nextElementSibling;
                    if (content && content.classList.contains('accordion-content')) {
                        content.style.maxHeight = 'none';
                        content.style.display = 'block';
                        content.setAttribute('aria-hidden', 'false');
                        
                        state.savedStates.set(content, {
                            maxHeight: content.style.maxHeight,
                            display: content.style.display
                        });
                    }
                    
                    // Handle nested content
                    const nestedContent = accordion.querySelector('.accordion-content, .accordion-body');
                    if (nestedContent) {
                        nestedContent.style.maxHeight = 'none';
                        nestedContent.style.display = 'block';
                        
                        state.savedStates.set(nestedContent, {
                            maxHeight: nestedContent.style.maxHeight,
                            display: nestedContent.style.display
                        });
                    }
                }
            });

            // Also expand details elements
            const details = document.querySelectorAll('details:not([open])');
            details.forEach(detail => {
                detail.setAttribute('open', '');
                state.expandedAccordions.push(detail);
            });
        },

        /**
         * Restore accordions to original state
         */
        restoreAccordions() {
            // Restore expanded accordions
            state.expandedAccordions.forEach(accordion => {
                accordion.classList.remove('print-expanded');
                
                // Restore details elements
                if (accordion.tagName === 'DETAILS') {
                    accordion.removeAttribute('open');
                }
            });

            // Restore saved styles
            state.savedStates.forEach((savedState, element) => {
                Object.keys(savedState).forEach(prop => {
                    if (prop === 'maxHeight' || prop === 'display') {
                        element.style[prop] = savedState[prop] || '';
                    }
                });
            });

            // Clear expanded list
            state.expandedAccordions = [];
        },

        /**
         * Before print hook (internal)
         */
        beforePrint() {
            beforePrint();
        },

        /**
         * After print hook (internal)
         */
        afterPrint() {
            afterPrint();
        },

        /**
         * Print current page
         */
        printPage() {
            this.prepare();
        },

        /**
         * Print certificate with custom data
         */
        printCertificate(data = {}) {
            // Fill certificate fields
            if (data.recipientName) {
                const nameEl = document.querySelector('[data-certificate-name]');
                if (nameEl) nameEl.textContent = data.recipientName;
            }
            
            if (data.awardAmount) {
                const amountEl = document.querySelector('[data-certificate-amount]');
                if (amountEl) amountEl.textContent = data.awardAmount;
            }
            
            if (data.date) {
                const dateEl = document.querySelector('[data-certificate-date]');
                if (dateEl) dateEl.textContent = data.date;
            }

            // Set title
            this.setTitle(`R.A.R.E. Award Certificate - ${data.recipientName || 'Employee'}`);

            // Print
            this.prepare();
        }
    };

    /**
     * Add print helper styles
     */
    function addPrintStyles() {
        if (document.getElementById('print-generator-styles')) return;

        const style = document.createElement('style');
        style.id = 'print-generator-styles';
        style.textContent = `
            @media print {
                .print-expanded,
                .print-expanded + .accordion-content {
                    display: block !important;
                    max-height: none !important;
                    overflow: visible !important;
                }
                
                [data-print-datetime]:empty::before {
                    content: "Print Date/Time";
                    opacity: 0.5;
                }
                
                [data-print-ref]:empty::before {
                    content: "Reference Number";
                    opacity: 0.5;
                }
                
                .print-section-container {
                    width: 100%;
                    max-width: 100%;
                }
            }
            
            @media screen {
                #${CONFIG.printCloneId} {
                    position: absolute;
                    left: -9999px;
                    top: -9999px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Main initialization
     */
    function initPrintGenerator() {
        initPrintTriggers();
        addPrintStyles();
        
        console.log('✓ Print generator module initialized');
    }

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPrintGenerator);
    } else {
        initPrintGenerator();
    }

    // Export globally
    window.initPrintGenerator = initPrintGenerator;
    window.Print = Print;

})();