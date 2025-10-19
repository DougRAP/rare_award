/**
 * R.A.R.E. Award Website - Navigation Module
 * Handles all navigation interactions including mobile menu, active states, and accessibility
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        mobileBreakpoint: 768,
        stickyOffset: 100,
        scrollThreshold: 5,
        observerThreshold: 0.5,
        observerRootMargin: '-100px 0px -70% 0px',
        focusTrapQuerySelector: 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    };

    // State management
    const state = {
        mobileMenuOpen: false,
        searchOpen: false,
        lastScrollY: 0,
        scrollDirection: null,
        isScrolling: false,
        activeSection: null,
        dropdownOpen: null
    };

    // Cache DOM elements
    let elements = {};

    /**
     * Cache DOM elements for performance
     */
    function cacheElements() {
        elements = {
            header: document.querySelector('header'),
            mobileToggle: document.getElementById('mobileToggle'),
            mainNav: document.getElementById('mainNav'),
            mobileOverlay: document.getElementById('mobileOverlay'),
            navLinks: document.querySelectorAll('.nav-link, nav a'),
            sections: document.querySelectorAll('section[id], .section[id]'),
            breadcrumbs: document.querySelector('.breadcrumbs'),
            breadcrumbItems: document.querySelectorAll('.breadcrumb-item'),
            dropdowns: document.querySelectorAll('.dropdown, .nav-dropdown'),
            searchTrigger: document.querySelector('.search-trigger, #searchTrigger'),
            searchModal: document.querySelector('.search-modal, #searchModal'),
            searchInput: document.querySelector('.search-input, #searchInput'),
            searchClose: document.querySelector('.search-close')
        };
    }

    /**
     * Initialize mobile menu functionality
     */
    function initMobileMenu() {
        if (!elements.mobileToggle || !elements.mainNav) return;

        // Toggle button click
        elements.mobileToggle.addEventListener('click', toggleMobileMenu);

        // Overlay click
        if (elements.mobileOverlay) {
            elements.mobileOverlay.addEventListener('click', closeMobileMenu);
        }

        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && state.mobileMenuOpen) {
                closeMobileMenu();
                elements.mobileToggle.focus();
            }
        });

        // Close on window resize if needed
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (window.innerWidth > CONFIG.mobileBreakpoint && state.mobileMenuOpen) {
                    closeMobileMenu();
                }
            }, 250);
        });

        // Handle nav link clicks on mobile
        elements.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                // Close mobile menu on anchor link click
                if (state.mobileMenuOpen && link.getAttribute('href')?.startsWith('#')) {
                    setTimeout(closeMobileMenu, 100);
                }
            });
        });
    }

    /**
     * Toggle mobile menu state
     */
    function toggleMobileMenu() {
        state.mobileMenuOpen ? closeMobileMenu() : openMobileMenu();
    }

    /**
     * Open mobile menu
     */
    function openMobileMenu() {
        if (!elements.mainNav || !elements.mobileToggle) return;

        state.mobileMenuOpen = true;
        
        // Update classes
        document.body.classList.add('mobile-menu-open', 'no-scroll');
        elements.mainNav.classList.add('active');
        elements.mobileToggle.classList.add('active');
        
        if (elements.mobileOverlay) {
            elements.mobileOverlay.classList.add('active');
        }

        // Update ARIA
        elements.mobileToggle.setAttribute('aria-expanded', 'true');
        elements.mainNav.setAttribute('aria-hidden', 'false');

        // Announce to screen readers
        announceToScreenReader('Navigation menu opened');

        // Set up focus trap
        setupFocusTrap(elements.mainNav);

        // Animate hamburger to X
        animateHamburger(true);
    }

    /**
     * Close mobile menu
     */
    function closeMobileMenu() {
        if (!elements.mainNav || !elements.mobileToggle) return;

        state.mobileMenuOpen = false;
        
        // Update classes
        document.body.classList.remove('mobile-menu-open', 'no-scroll');
        elements.mainNav.classList.remove('active');
        elements.mobileToggle.classList.remove('active');
        
        if (elements.mobileOverlay) {
            elements.mobileOverlay.classList.remove('active');
        }

        // Update ARIA
        elements.mobileToggle.setAttribute('aria-expanded', 'false');
        elements.mainNav.setAttribute('aria-hidden', 'true');

        // Announce to screen readers
        announceToScreenReader('Navigation menu closed');

        // Remove focus trap
        removeFocusTrap();

        // Animate hamburger from X
        animateHamburger(false);
    }

    /**
     * Animate hamburger icon
     */
    function animateHamburger(toX) {
        const bars = elements.mobileToggle?.querySelectorAll('.bar, .hamburger-bar');
        if (!bars || bars.length === 0) return;

        if (toX) {
            bars[0]?.classList.add('rotate-45');
            bars[1]?.classList.add('opacity-0');
            bars[2]?.classList.add('rotate-minus-45');
        } else {
            bars[0]?.classList.remove('rotate-45');
            bars[1]?.classList.remove('opacity-0');
            bars[2]?.classList.remove('rotate-minus-45');
        }
    }

    /**
     * Initialize active navigation states
     */
    function initActiveStates() {
        // Highlight current page
        highlightCurrentPage();

        // Set up scroll spy for sections
        if (elements.sections.length > 0) {
            setupScrollSpy();
        }
    }

    /**
     * Highlight current page in navigation
     */
    function highlightCurrentPage() {
        const currentPath = window.location.pathname;
        const currentPage = currentPath.split('/').pop() || 'index.html';

        elements.navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;

            // Remove existing active class
            link.classList.remove('active', 'current-page');
            link.removeAttribute('aria-current');

            // Check if this is the current page
            if (href === currentPage || href === `./${currentPage}` || 
                (currentPage === 'index.html' && (href === '/' || href === './' || href === 'index.html'))) {
                link.classList.add('active', 'current-page');
                link.setAttribute('aria-current', 'page');
            }
        });
    }

    /**
     * Set up scroll spy for sections
     */
    function setupScrollSpy() {
        if (!('IntersectionObserver' in window)) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const sectionId = entry.target.id;
                    updateActiveSection(sectionId);
                }
            });
        }, {
            threshold: CONFIG.observerThreshold,
            rootMargin: CONFIG.observerRootMargin
        });

        elements.sections.forEach(section => {
            observer.observe(section);
        });
    }

    /**
     * Update active section in navigation
     */
    function updateActiveSection(sectionId) {
        if (!sectionId || state.activeSection === sectionId) return;

        state.activeSection = sectionId;

        elements.navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === `#${sectionId}`) {
                link.classList.add('active-section');
                link.setAttribute('aria-describedby', 'current-section');
            } else {
                link.classList.remove('active-section');
                link.removeAttribute('aria-describedby');
            }
        });

        // Update breadcrumbs if present
        updateBreadcrumbs(sectionId);
    }

    /**
     * Initialize dropdown navigation
     */
    function initDropdowns() {
        if (!elements.dropdowns.length) return;

        elements.dropdowns.forEach(dropdown => {
            const trigger = dropdown.querySelector('.dropdown-trigger, .dropdown-toggle');
            const menu = dropdown.querySelector('.dropdown-menu, .dropdown-content');
            
            if (!trigger || !menu) return;

            // Mouse events
            dropdown.addEventListener('mouseenter', () => openDropdown(dropdown));
            dropdown.addEventListener('mouseleave', () => closeDropdown(dropdown));

            // Keyboard events
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                toggleDropdown(dropdown);
            });

            trigger.addEventListener('keydown', (e) => {
                handleDropdownKeyboard(e, dropdown);
            });

            // Touch support
            if ('ontouchstart' in window) {
                trigger.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    toggleDropdown(dropdown);
                });
            }
        });

        // Close dropdowns on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown, .nav-dropdown')) {
                closeAllDropdowns();
            }
        });
    }

    /**
     * Handle dropdown keyboard navigation
     */
    function handleDropdownKeyboard(e, dropdown) {
        const menu = dropdown.querySelector('.dropdown-menu, .dropdown-content');
        const items = menu?.querySelectorAll('a, button');
        
        switch(e.key) {
            case 'Enter':
            case ' ':
                e.preventDefault();
                toggleDropdown(dropdown);
                break;
            case 'Escape':
                closeDropdown(dropdown);
                dropdown.querySelector('.dropdown-trigger, .dropdown-toggle')?.focus();
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (state.dropdownOpen === dropdown) {
                    items[0]?.focus();
                } else {
                    openDropdown(dropdown);
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (state.dropdownOpen === dropdown) {
                    items[items.length - 1]?.focus();
                }
                break;
        }
    }

    /**
     * Toggle dropdown state
     */
    function toggleDropdown(dropdown) {
        if (state.dropdownOpen === dropdown) {
            closeDropdown(dropdown);
        } else {
            closeAllDropdowns();
            openDropdown(dropdown);
        }
    }

    /**
     * Open dropdown
     */
    function openDropdown(dropdown) {
        const trigger = dropdown.querySelector('.dropdown-trigger, .dropdown-toggle');
        const menu = dropdown.querySelector('.dropdown-menu, .dropdown-content');
        
        if (!trigger || !menu) return;

        dropdown.classList.add('active');
        trigger.setAttribute('aria-expanded', 'true');
        menu.setAttribute('aria-hidden', 'false');
        state.dropdownOpen = dropdown;
    }

    /**
     * Close dropdown
     */
    function closeDropdown(dropdown) {
        const trigger = dropdown.querySelector('.dropdown-trigger, .dropdown-toggle');
        const menu = dropdown.querySelector('.dropdown-menu, .dropdown-content');
        
        if (!trigger || !menu) return;

        dropdown.classList.remove('active');
        trigger.setAttribute('aria-expanded', 'false');
        menu.setAttribute('aria-hidden', 'true');
        
        if (state.dropdownOpen === dropdown) {
            state.dropdownOpen = null;
        }
    }

    /**
     * Close all dropdowns
     */
    function closeAllDropdowns() {
        elements.dropdowns.forEach(dropdown => closeDropdown(dropdown));
    }

    /**
     * Initialize search functionality
     */
    function initSearch() {
        // Keyboard shortcut (Ctrl+K or Cmd+K)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                toggleSearch();
            }
        });

        // Search trigger button
        if (elements.searchTrigger) {
            elements.searchTrigger.addEventListener('click', (e) => {
                e.preventDefault();
                toggleSearch();
            });
        }

        // Close button
        if (elements.searchClose) {
            elements.searchClose.addEventListener('click', closeSearch);
        }

        // Close on ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && state.searchOpen) {
                closeSearch();
            }
        });

        // Initialize search filtering if modal exists
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', debounce(handleSearch, 300));
        }
    }

    /**
     * Toggle search modal
     */
    function toggleSearch() {
        state.searchOpen ? closeSearch() : openSearch();
    }

    /**
     * Open search
     */
    function openSearch() {
        if (!elements.searchModal && !elements.searchInput) {
            console.log('Search functionality not available on this page');
            return;
        }

        state.searchOpen = true;
        document.body.classList.add('search-open');
        
        if (elements.searchModal) {
            elements.searchModal.classList.add('active');
            elements.searchModal.setAttribute('aria-hidden', 'false');
        }

        if (elements.searchInput) {
            elements.searchInput.focus();
        }

        announceToScreenReader('Search opened');
    }

    /**
     * Close search
     */
    function closeSearch() {
        state.searchOpen = false;
        document.body.classList.remove('search-open');
        
        if (elements.searchModal) {
            elements.searchModal.classList.remove('active');
            elements.searchModal.setAttribute('aria-hidden', 'true');
        }

        if (elements.searchInput) {
            elements.searchInput.value = '';
            elements.searchInput.blur();
        }

        announceToScreenReader('Search closed');
    }

    /**
     * Handle search input
     */
    function handleSearch(e) {
        const query = e.target.value.toLowerCase();
        
        // Filter navigation items
        elements.navLinks.forEach(link => {
            const text = link.textContent.toLowerCase();
            const parent = link.closest('li, .nav-item');
            
            if (text.includes(query) || !query) {
                link.classList.remove('hidden');
                if (parent) parent.classList.remove('hidden');
            } else {
                link.classList.add('hidden');
                if (parent) parent.classList.add('hidden');
            }
        });
    }

    /**
     * Initialize sticky header
     */
    function initStickyHeader() {
        if (!elements.header) return;

        let scrollTimer;
        
        window.addEventListener('scroll', () => {
            state.isScrolling = true;
            
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => {
                state.isScrolling = false;
            }, 100);
            
            handleStickyHeader();
        }, { passive: true });
    }

    /**
     * Handle sticky header behavior
     */
    function handleStickyHeader() {
        const currentScrollY = window.pageYOffset;
        const difference = currentScrollY - state.lastScrollY;
        
        // Determine scroll direction
        if (Math.abs(difference) < CONFIG.scrollThreshold) return;
        
        if (currentScrollY > state.lastScrollY && currentScrollY > CONFIG.stickyOffset) {
            // Scrolling down & past offset
            state.scrollDirection = 'down';
            elements.header.classList.add('header-hidden');
            elements.header.classList.remove('header-sticky');
        } else if (currentScrollY < state.lastScrollY) {
            // Scrolling up
            state.scrollDirection = 'up';
            elements.header.classList.remove('header-hidden');
            
            if (currentScrollY > CONFIG.stickyOffset) {
                elements.header.classList.add('header-sticky');
            }
        }
        
        // Remove sticky class at top
        if (currentScrollY <= 0) {
            elements.header.classList.remove('header-sticky', 'header-hidden');
        }
        
        state.lastScrollY = currentScrollY;
    }

    /**
     * Update breadcrumbs based on section
     */
    function updateBreadcrumbs(sectionId) {
        if (!elements.breadcrumbs || !sectionId) return;

        const section = document.getElementById(sectionId);
        if (!section) return;

        const sectionTitle = section.querySelector('h2, h3, .section-title')?.textContent || 
                           section.getAttribute('data-breadcrumb') || 
                           sectionId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        // Find or create current section breadcrumb
        let currentCrumb = elements.breadcrumbs.querySelector('.breadcrumb-current');
        
        if (!currentCrumb) {
            currentCrumb = document.createElement('span');
            currentCrumb.className = 'breadcrumb-item breadcrumb-current';
            elements.breadcrumbs.appendChild(currentCrumb);
        }

        currentCrumb.textContent = sectionTitle;
        currentCrumb.setAttribute('aria-current', 'location');
    }

    /**
     * Set up focus trap for modal elements
     */
    function setupFocusTrap(container) {
        if (!container) return;

        const focusableElements = container.querySelectorAll(CONFIG.focusTrapQuerySelector);
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        // Store current focus
        state.previousFocus = document.activeElement;

        // Focus first element
        firstFocusable?.focus();

        // Trap focus
        container.addEventListener('keydown', trapFocus);

        function trapFocus(e) {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable?.focus();
                }
            } else {
                if (document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable?.focus();
                }
            }
        }

        container._trapFocus = trapFocus;
    }

    /**
     * Remove focus trap
     */
    function removeFocusTrap() {
        const container = elements.mainNav;
        if (!container || !container._trapFocus) return;

        container.removeEventListener('keydown', container._trapFocus);
        delete container._trapFocus;

        // Restore focus
        if (state.previousFocus) {
            state.previousFocus.focus();
            state.previousFocus = null;
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
            document.body.removeChild(announcement);
        }, 1000);
    }

    /**
     * Debounce utility function
     */
    function debounce(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Main initialization function
     */
    function initNavigation() {
        // Cache elements
        cacheElements();

        // Initialize components
        initMobileMenu();
        initActiveStates();
        initDropdowns();
        initSearch();
        initStickyHeader();

        // Set initial ARIA attributes
        if (elements.mobileToggle) {
            elements.mobileToggle.setAttribute('aria-label', 'Toggle navigation menu');
            elements.mobileToggle.setAttribute('aria-expanded', 'false');
        }

        if (elements.mainNav) {
            elements.mainNav.setAttribute('aria-label', 'Main navigation');
            elements.mainNav.setAttribute('aria-hidden', 'true');
        }

        // Mark navigation as initialized
        document.body.classList.add('navigation-initialized');
        console.log('✓ Navigation module initialized');
    }

    // Expose initialization function globally
    window.initNavigation = initNavigation;

})();