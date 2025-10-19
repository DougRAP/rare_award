/**
 * R.A.R.E. Award Website - Main JavaScript Module
 * Initializes core functionality and coordinates all site modules
 */

(function() {
    'use strict';

    // Configuration constants
    const CONFIG = {
        headerOffset: 80,
        scrollThreshold: 300,
        lazyLoadRootMargin: '50px',
        smoothScrollDuration: 800
    };

    // Cache DOM elements
    let elements = {};

    /**
     * Initialize cached DOM elements
     */
    function cacheElements() {
        elements = {
            scrollProgress: document.getElementById('scrollProgress'),
            backToTop: document.getElementById('backToTop'),
            header: document.querySelector('header'),
            announcementBar: document.querySelector('.announcement-bar'),
            announcementClose: document.querySelector('.announcement-close'),
            lazyImages: document.querySelectorAll('img[data-src]'),
            anchorLinks: document.querySelectorAll('a[href^="#"]')
        };
    }

    /**
     * Smooth scrolling for anchor links
     */
    function initSmoothScrolling() {
        if (!elements.anchorLinks.length) return;

        elements.anchorLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                
                // Skip if just '#' or external hash
                if (href === '#' || href === '#0') {
                    e.preventDefault();
                    return;
                }

                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    
                    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset;
                    const startPosition = window.pageYOffset;
                    const distance = targetPosition - startPosition - CONFIG.headerOffset;
                    const duration = CONFIG.smoothScrollDuration;
                    let start = null;

                    function animation(currentTime) {
                        if (start === null) start = currentTime;
                        const timeElapsed = currentTime - start;
                        const progress = Math.min(timeElapsed / duration, 1);
                        
                        // Easing function
                        const ease = progress < 0.5 
                            ? 2 * progress * progress 
                            : -1 + (4 - 2 * progress) * progress;
                        
                        window.scrollTo(0, startPosition + distance * ease);
                        
                        if (timeElapsed < duration) {
                            requestAnimationFrame(animation);
                        } else {
                            // Update URL without jump
                            history.pushState(null, null, href);
                        }
                    }

                    requestAnimationFrame(animation);
                }
            });
        });
    }

    /**
     * Update scroll progress bar
     */
    function updateScrollProgress() {
        if (!elements.scrollProgress) return;

        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrolled = window.pageYOffset;
        const progress = scrollHeight > 0 ? (scrolled / scrollHeight) * 100 : 0;
        
        elements.scrollProgress.style.width = `${Math.min(progress, 100)}%`;
    }

    /**
     * Back to top button functionality
     */
    function initBackToTop() {
        if (!elements.backToTop) return;

        // Show/hide on scroll
        function toggleBackToTop() {
            if (window.pageYOffset > CONFIG.scrollThreshold) {
                elements.backToTop.classList.add('visible');
                elements.backToTop.setAttribute('aria-hidden', 'false');
            } else {
                elements.backToTop.classList.remove('visible');
                elements.backToTop.setAttribute('aria-hidden', 'true');
            }
        }

        // Click handler
        elements.backToTop.addEventListener('click', function(e) {
            e.preventDefault();
            
            const startPosition = window.pageYOffset;
            const duration = 600;
            let start = null;

            function animation(currentTime) {
                if (start === null) start = currentTime;
                const timeElapsed = currentTime - start;
                const progress = Math.min(timeElapsed / duration, 1);
                
                // Ease out cubic
                const ease = 1 - Math.pow(1 - progress, 3);
                
                window.scrollTo(0, startPosition * (1 - ease));
                
                if (timeElapsed < duration) {
                    requestAnimationFrame(animation);
                }
            }

            requestAnimationFrame(animation);
        });

        // Initial check
        toggleBackToTop();
        
        // Add scroll listener
        window.addEventListener('scroll', throttle(toggleBackToTop, 100));
    }

    /**
     * Announcement bar functionality
     */
    function initAnnouncementBar() {
        if (!elements.announcementBar || !elements.announcementClose) return;

        // Check if already closed in session
        if (sessionStorage.getItem('announcementClosed') === 'true') {
            elements.announcementBar.style.display = 'none';
            return;
        }

        elements.announcementClose.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Add closing animation class
            elements.announcementBar.classList.add('closing');
            
            // Wait for animation then hide
            setTimeout(() => {
                elements.announcementBar.style.display = 'none';
                sessionStorage.setItem('announcementClosed', 'true');
            }, 300);
        });
    }

    /**
     * Header transparency on scroll
     */
    function initHeaderTransparency() {
        if (!elements.header) return;

        const isTransparent = elements.header.classList.contains('header-transparent');
        if (!isTransparent) return;

        function updateHeaderState() {
            if (window.pageYOffset > 50) {
                elements.header.classList.add('header-scrolled');
            } else {
                elements.header.classList.remove('header-scrolled');
            }
        }

        // Initial check
        updateHeaderState();
        
        // Add scroll listener
        window.addEventListener('scroll', throttle(updateHeaderState, 100));
    }

    /**
     * Lazy loading for images
     */
    function initLazyLoading() {
        if (!elements.lazyImages.length) return;

        // Check for native lazy loading support
        if ('loading' in HTMLImageElement.prototype) {
            elements.lazyImages.forEach(img => {
                if (!img.loading) {
                    img.loading = 'lazy';
                }
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                }
            });
            return;
        }

        // Fallback to IntersectionObserver
        if (!('IntersectionObserver' in window)) {
            // Load all images if no IntersectionObserver support
            elements.lazyImages.forEach(loadImage);
            return;
        }

        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    loadImage(img);
                    imageObserver.unobserve(img);
                }
            });
        }, {
            rootMargin: CONFIG.lazyLoadRootMargin
        });

        elements.lazyImages.forEach(img => imageObserver.observe(img));
    }

    /**
     * Load individual image
     */
    function loadImage(img) {
        if (img.dataset.src) {
            img.classList.add('lazy-loading');
            
            const tempImg = new Image();
            tempImg.onload = function() {
                img.src = this.src;
                img.classList.remove('lazy-loading');
                img.classList.add('lazy-loaded');
                img.removeAttribute('data-src');
            };
            tempImg.onerror = function() {
                img.classList.remove('lazy-loading');
                img.classList.add('lazy-error');
            };
            tempImg.src = img.dataset.src;
        }
    }

    /**
     * Initialize all component modules
     */
    function initModules() {
        const modules = [
            { name: 'Navigation', init: 'initNavigation' },
            { name: 'FormHandler', init: 'initFormHandler' },
            { name: 'FormValidation', init: 'initFormValidation' },
            { name: 'Accordion', init: 'initAccordion' },
            { name: 'Carousel', init: 'initCarousel' },
            { name: 'Animations', init: 'initAnimations' },
            { name: 'DarkMode', init: 'initDarkMode' },
            { name: 'LocalStorage', init: 'initLocalStorage' }
        ];

        modules.forEach(module => {
            try {
                if (typeof window[module.init] === 'function') {
                    window[module.init]();
                    console.log(`✓ ${module.name} module initialized`);
                } else {
                    console.log(`- ${module.name} module not found (skipped)`);
                }
            } catch (error) {
                console.error(`✗ Error initializing ${module.name} module:`, error);
            }
        });
    }

    /**
     * Throttle function for performance
     */
    function throttle(func, delay) {
        let timeoutId;
        let lastExecTime = 0;
        
        return function(...args) {
            const currentTime = Date.now();
            
            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    }

    /**
     * Handle scroll events
     */
    function handleScroll() {
        updateScrollProgress();
    }

    /**
     * Main initialization function
     */
    function initMain() {
        // Cache DOM elements
        cacheElements();

        // Initialize core features
        initSmoothScrolling();
        initBackToTop();
        initAnnouncementBar();
        initHeaderTransparency();
        initLazyLoading();

        // Set up scroll listener
        window.addEventListener('scroll', throttle(handleScroll, 50));

        // Initial scroll position check
        handleScroll();

        // Initialize other modules
        initModules();

        // Mark main initialization complete
        document.body.classList.add('js-loaded');
        console.log('✓ Main initialization complete');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMain);
    } else {
        initMain();
    }

    // Expose init function globally for debugging
    window.initMain = initMain;

})();