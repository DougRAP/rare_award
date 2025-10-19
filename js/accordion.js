/**
 * R.A.R.E. Award Website - Accordion Module
 * Handles accordion interactions for FAQ section and policy page
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        animationDuration: 300,
        sessionKey: 'rare_accordion_state',
        defaultOpen: false,
        focusDelay: 50
    };

    // State management
    const state = {
        accordions: new Map(),
        openPanels: new Set()
    };

    // Cache DOM elements
    let elements = {};

    /**
     * Cache DOM elements
     */
    function cacheElements() {
        elements = {
            accordions: document.querySelectorAll('.accordion, [data-accordion]'),
            toggleAllButtons: document.querySelectorAll('.accordion-toggle-all, [data-toggle-all]')
        };
    }

    /**
     * Initialize all accordions on page
     */
    function initAccordions() {
        if (!elements.accordions.length) {
            console.log('No accordions found on this page');
            return;
        }

        elements.accordions.forEach((accordion, index) => {
            const accordionId = accordion.id || `accordion-${index}`;
            if (!accordion.id) accordion.id = accordionId;

            // Get accordion settings
            const settings = {
                multiOpen: accordion.dataset.multi === 'true',
                autoOpen: accordion.dataset.autoOpen === 'true',
                rememberState: accordion.dataset.remember !== 'false'
            };

            // Store accordion state
            state.accordions.set(accordionId, {
                element: accordion,
                settings: settings,
                panels: []
            });

            // Initialize panels
            initAccordionPanels(accordion, accordionId);
        });

        // Initialize toggle all buttons
        initToggleAllButtons();

        // Handle deep linking
        handleDeepLink();

        // Restore saved state
        restoreSavedState();
    }

    /**
     * Initialize panels within an accordion
     */
    function initAccordionPanels(accordion, accordionId) {
        const headers = accordion.querySelectorAll('.accordion-header, [data-accordion-header]');
        const accordionState = state.accordions.get(accordionId);

        headers.forEach((header, index) => {
            const panel = header.nextElementSibling;
            if (!panel || !panel.classList.contains('accordion-content')) {
                console.warn('No matching content panel for header:', header);
                return;
            }

            // Generate IDs if not present
            const headerId = header.id || `${accordionId}-header-${index}`;
            const panelId = panel.id || `${accordionId}-panel-${index}`;
            
            if (!header.id) header.id = headerId;
            if (!panel.id) panel.id = panelId;

            // Set up ARIA attributes
            header.setAttribute('role', 'button');
            header.setAttribute('aria-controls', panelId);
            header.setAttribute('aria-expanded', 'false');
            header.setAttribute('tabindex', '0');

            panel.setAttribute('role', 'region');
            panel.setAttribute('aria-labelledby', headerId);
            panel.setAttribute('aria-hidden', 'true');

            // Store initial height for animations
            panel.style.maxHeight = '0';
            panel.style.overflow = 'hidden';
            panel.style.transition = `max-height ${CONFIG.animationDuration}ms ease-in-out`;

            // Store panel info
            accordionState.panels.push({
                header: header,
                panel: panel,
                headerId: headerId,
                panelId: panelId,
                isOpen: false
            });

            // Add event listeners
            header.addEventListener('click', handleHeaderClick);
            header.addEventListener('keydown', handleHeaderKeydown);

            // Add icon if not present
            if (!header.querySelector('.accordion-icon')) {
                const icon = document.createElement('span');
                icon.className = 'accordion-icon';
                icon.setAttribute('aria-hidden', 'true');
                header.appendChild(icon);
            }
        });
    }

    /**
     * Handle header click
     */
    function handleHeaderClick(e) {
        e.preventDefault();
        const header = e.currentTarget;
        togglePanel(header);
    }

    /**
     * Handle header keyboard events
     */
    function handleHeaderKeydown(e) {
        const header = e.currentTarget;
        const accordion = header.closest('.accordion, [data-accordion]');
        
        switch(e.key) {
            case 'Enter':
            case ' ':
                e.preventDefault();
                togglePanel(header);
                break;
            
            case 'ArrowDown':
                e.preventDefault();
                focusNextHeader(accordion, header);
                break;
            
            case 'ArrowUp':
                e.preventDefault();
                focusPreviousHeader(accordion, header);
                break;
            
            case 'Home':
                e.preventDefault();
                focusFirstHeader(accordion);
                break;
            
            case 'End':
                e.preventDefault();
                focusLastHeader(accordion);
                break;
        }
    }

    /**
     * Toggle panel open/closed
     */
    function togglePanel(header) {
        const accordion = header.closest('.accordion, [data-accordion]');
        const accordionId = accordion.id;
        const accordionState = state.accordions.get(accordionId);
        
        if (!accordionState) return;

        const panelInfo = accordionState.panels.find(p => p.header === header);
        if (!panelInfo) return;

        if (panelInfo.isOpen) {
            closePanel(panelInfo);
        } else {
            // Close other panels if not multi-open
            if (!accordionState.settings.multiOpen) {
                accordionState.panels.forEach(p => {
                    if (p.isOpen && p !== panelInfo) {
                        closePanel(p);
                    }
                });
            }
            openPanel(panelInfo);
        }

        // Save state
        saveAccordionState();
    }

    /**
     * Open panel
     */
    function openPanel(panelInfo) {
        if (panelInfo.isOpen) return;

        const { header, panel, panelId } = panelInfo;

        // Update state
        panelInfo.isOpen = true;
        state.openPanels.add(panelId);

        // Update ARIA
        header.setAttribute('aria-expanded', 'true');
        panel.setAttribute('aria-hidden', 'false');

        // Add active classes
        header.classList.add('active', 'open');
        panel.classList.add('active', 'open');

        // Animate open
        const scrollHeight = panel.scrollHeight;
        panel.style.maxHeight = `${scrollHeight}px`;

        // Announce to screen readers
        announceToScreenReader(`${header.textContent} expanded`);
    }

    /**
     * Close panel
     */
    function closePanel(panelInfo) {
        if (!panelInfo.isOpen) return;

        const { header, panel, panelId } = panelInfo;

        // Update state
        panelInfo.isOpen = false;
        state.openPanels.delete(panelId);

        // Update ARIA
        header.setAttribute('aria-expanded', 'false');
        panel.setAttribute('aria-hidden', 'true');

        // Remove active classes
        header.classList.remove('active', 'open');
        panel.classList.remove('active', 'open');

        // Animate closed
        panel.style.maxHeight = '0';

        // Announce to screen readers
        announceToScreenReader(`${header.textContent} collapsed`);
    }

    /**
     * Focus next header
     */
    function focusNextHeader(accordion, currentHeader) {
        const headers = Array.from(accordion.querySelectorAll('.accordion-header, [data-accordion-header]'));
        const currentIndex = headers.indexOf(currentHeader);
        const nextIndex = (currentIndex + 1) % headers.length;
        
        headers[nextIndex]?.focus();
    }

    /**
     * Focus previous header
     */
    function focusPreviousHeader(accordion, currentHeader) {
        const headers = Array.from(accordion.querySelectorAll('.accordion-header, [data-accordion-header]'));
        const currentIndex = headers.indexOf(currentHeader);
        const prevIndex = currentIndex === 0 ? headers.length - 1 : currentIndex - 1;
        
        headers[prevIndex]?.focus();
    }

    /**
     * Focus first header
     */
    function focusFirstHeader(accordion) {
        const firstHeader = accordion.querySelector('.accordion-header, [data-accordion-header]');
        firstHeader?.focus();
    }

    /**
     * Focus last header
     */
    function focusLastHeader(accordion) {
        const headers = accordion.querySelectorAll('.accordion-header, [data-accordion-header]');
        const lastHeader = headers[headers.length - 1];
        lastHeader?.focus();
    }

    /**
     * Initialize toggle all buttons
     */
    function initToggleAllButtons() {
        elements.toggleAllButtons.forEach(button => {
            button.addEventListener('click', handleToggleAll);
            
            // Set initial text
            updateToggleAllButton(button);
        });
    }

    /**
     * Handle toggle all button click
     */
    function handleToggleAll(e) {
        e.preventDefault();
        const button = e.currentTarget;
        const targetId = button.dataset.target || button.closest('.accordion, [data-accordion]')?.id;
        
        if (!targetId) {
            console.warn('No accordion target found for toggle all button');
            return;
        }

        const accordionState = state.accordions.get(targetId);
        if (!accordionState) return;

        const allOpen = accordionState.panels.every(p => p.isOpen);
        
        accordionState.panels.forEach(panelInfo => {
            if (allOpen) {
                closePanel(panelInfo);
            } else {
                openPanel(panelInfo);
            }
        });

        // Update button text
        updateToggleAllButton(button);
        
        // Save state
        saveAccordionState();
    }

    /**
     * Update toggle all button text
     */
    function updateToggleAllButton(button) {
        const targetId = button.dataset.target || button.closest('.accordion, [data-accordion]')?.id;
        if (!targetId) return;

        const accordionState = state.accordions.get(targetId);
        if (!accordionState) return;

        const allOpen = accordionState.panels.every(p => p.isOpen);
        button.textContent = allOpen ? 'Close All' : 'Open All';
        button.setAttribute('aria-label', allOpen ? 'Close all accordion panels' : 'Open all accordion panels');
    }

    /**
     * Handle deep linking
     */
    function handleDeepLink() {
        const hash = window.location.hash;
        if (!hash) return;

        // Try to find matching panel or header
        const targetElement = document.querySelector(hash);
        if (!targetElement) return;

        let panelInfo = null;
        let accordion = null;

        // Check if target is a header or panel
        state.accordions.forEach(accordionState => {
            const match = accordionState.panels.find(p => 
                p.headerId === targetElement.id || 
                p.panelId === targetElement.id ||
                p.header.contains(targetElement) ||
                p.panel.contains(targetElement)
            );
            
            if (match) {
                panelInfo = match;
                accordion = accordionState.element;
            }
        });

        if (panelInfo && !panelInfo.isOpen) {
            // Close other panels if needed
            const accordionState = state.accordions.get(accordion.id);
            if (accordionState && !accordionState.settings.multiOpen) {
                accordionState.panels.forEach(p => {
                    if (p !== panelInfo) closePanel(p);
                });
            }
            
            openPanel(panelInfo);
            
            // Scroll to element after animation
            setTimeout(() => {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                panelInfo.header.focus();
            }, CONFIG.animationDuration);
        }
    }

    /**
     * Save accordion state to sessionStorage
     */
    function saveAccordionState() {
        if (typeof window.Storage === 'undefined') return;

        const stateData = {};
        
        state.accordions.forEach((accordionState, accordionId) => {
            if (!accordionState.settings.rememberState) return;
            
            stateData[accordionId] = accordionState.panels
                .filter(p => p.isOpen)
                .map(p => p.panelId);
        });

        try {
            sessionStorage.setItem(CONFIG.sessionKey, JSON.stringify(stateData));
        } catch (e) {
            console.warn('Failed to save accordion state:', e);
        }
    }

    /**
     * Restore saved accordion state
     */
    function restoreSavedState() {
        if (typeof window.Storage === 'undefined') return;

        try {
            const savedState = sessionStorage.getItem(CONFIG.sessionKey);
            if (!savedState) return;

            const stateData = JSON.parse(savedState);
            
            Object.keys(stateData).forEach(accordionId => {
                const accordionState = state.accordions.get(accordionId);
                if (!accordionState || !accordionState.settings.rememberState) return;

                const openPanelIds = stateData[accordionId];
                
                accordionState.panels.forEach(panelInfo => {
                    if (openPanelIds.includes(panelInfo.panelId)) {
                        openPanel(panelInfo);
                    }
                });
            });

            // Update toggle all buttons
            elements.toggleAllButtons.forEach(button => {
                updateToggleAllButton(button);
            });
        } catch (e) {
            console.warn('Failed to restore accordion state:', e);
        }
    }

    /**
     * Open specific accordion by ID
     */
    function openAccordion(panelId) {
        let panelInfo = null;
        
        state.accordions.forEach(accordionState => {
            const match = accordionState.panels.find(p => p.panelId === panelId);
            if (match) panelInfo = match;
        });

        if (panelInfo) {
            openPanel(panelInfo);
        }
    }

    /**
     * Close specific accordion by ID
     */
    function closeAccordion(panelId) {
        let panelInfo = null;
        
        state.accordions.forEach(accordionState => {
            const match = accordionState.panels.find(p => p.panelId === panelId);
            if (match) panelInfo = match;
        });

        if (panelInfo) {
            closePanel(panelInfo);
        }
    }

    /**
     * Announce to screen readers
     */
    function announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.className = 'sr-only';
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            announcement.remove();
        }, 1000);
    }

    /**
     * Accordion public API
     */
    const Accordion = {
        open: openAccordion,
        close: closeAccordion,
        openAll: (accordionId) => {
            const accordionState = state.accordions.get(accordionId);
            if (accordionState) {
                accordionState.panels.forEach(p => openPanel(p));
            }
        },
        closeAll: (accordionId) => {
            const accordionState = state.accordions.get(accordionId);
            if (accordionState) {
                accordionState.panels.forEach(p => closePanel(p));
            }
        },
        toggle: (panelId) => {
            state.accordions.forEach(accordionState => {
                const panel = accordionState.panels.find(p => p.panelId === panelId);
                if (panel) {
                    togglePanel(panel.header);
                }
            });
        },
        refresh: () => {
            cacheElements();
            initAccordions();
        }
    };

    /**
     * Main initialization function
     */
    function initAccordion() {
        // Cache elements
        cacheElements();
        
        // Initialize accordions
        initAccordions();
        
        // Handle hash changes
        window.addEventListener('hashchange', handleDeepLink);
        
        // Expose API globally
        window.Accordion = Accordion;
        
        console.log('✓ Accordion module initialized');
    }

    // Auto-initialize if DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAccordion);
    } else {
        initAccordion();
    }

    // Expose initialization function globally
    window.initAccordion = initAccordion;
    window.Accordion = Accordion;

})();