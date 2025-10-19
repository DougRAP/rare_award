/**
 * R.A.R.E. Award Website - Carousel Module
 * Smooth carousel for displaying award winners with full accessibility
 */

(function() {
    'use strict';

    // Configuration defaults
    const CONFIG = {
        autoPlay: false,
        autoPlayInterval: 5000,
        loop: true,
        slidesToShow: 1,
        slidesToScroll: 1,
        gap: 20,
        animationDuration: 300,
        swipeThreshold: 50,
        velocityThreshold: 0.3,
        responsive: [
            { breakpoint: 768, slidesToShow: 1, slidesToScroll: 1 },
            { breakpoint: 1024, slidesToShow: 2, slidesToScroll: 1 },
            { breakpoint: 1440, slidesToShow: 3, slidesToScroll: 1 }
        ]
    };

    /**
     * Carousel class
     */
    class Carousel {
        constructor(element, options = {}) {
            if (!element) {
                console.error('Carousel: No element provided');
                return;
            }

            this.element = element;
            this.options = { ...CONFIG, ...options };
            this.currentIndex = 0;
            this.isPlaying = false;
            this.autoPlayTimer = null;
            this.touchStartX = 0;
            this.touchStartY = 0;
            this.touchStartTime = 0;
            this.isDragging = false;
            this.slideWidth = 0;
            
            this.init();
        }

        /**
         * Initialize carousel
         */
        init() {
            // Cache elements
            this.track = this.element.querySelector('.carousel-track, [data-carousel-track]');
            this.slides = Array.from(this.element.querySelectorAll('.carousel-slide, [data-carousel-slide]'));
            this.prevBtn = this.element.querySelector('.carousel-prev, [data-carousel-prev]');
            this.nextBtn = this.element.querySelector('.carousel-next, [data-carousel-next]');
            this.indicators = this.element.querySelector('.carousel-indicators, [data-carousel-indicators]');
            this.playPauseBtn = this.element.querySelector('.carousel-play-pause, [data-carousel-play-pause]');

            if (!this.track || this.slides.length === 0) {
                console.warn('Carousel: Missing required elements');
                return;
            }

            // Set up carousel
            this.setupCarousel();
            this.setupNavigation();
            this.setupIndicators();
            this.setupKeyboard();
            this.setupTouch();
            this.setupResize();
            this.setupAutoPlay();
            this.setupAccessibility();

            // Set initial position
            this.goToSlide(0, false);

            // Mark as initialized
            this.element.classList.add('carousel-initialized');
        }

        /**
         * Set up carousel structure
         */
        setupCarousel() {
            // Calculate responsive settings
            this.calculateResponsive();

            // Set track styles
            this.track.style.display = 'flex';
            this.track.style.transition = `transform ${this.options.animationDuration}ms ease-in-out`;
            this.track.style.gap = `${this.options.gap}px`;

            // Calculate and set slide widths
            this.updateSlideWidths();

            // Clone slides for infinite loop if needed
            if (this.options.loop && this.slides.length > this.options.slidesToShow) {
                this.setupInfiniteLoop();
            }
        }

        /**
         * Calculate responsive settings
         */
        calculateResponsive() {
            const width = window.innerWidth;
            const responsive = this.options.responsive;

            if (!responsive) return;

            // Sort breakpoints in ascending order
            const sorted = [...responsive].sort((a, b) => a.breakpoint - b.breakpoint);

            // Find matching breakpoint
            for (const bp of sorted) {
                if (width <= bp.breakpoint) {
                    this.options.slidesToShow = bp.slidesToShow || this.options.slidesToShow;
                    this.options.slidesToScroll = bp.slidesToScroll || this.options.slidesToScroll;
                    break;
                }
            }
        }

        /**
         * Update slide widths based on container
         */
        updateSlideWidths() {
            const containerWidth = this.element.offsetWidth;
            const totalGaps = (this.options.slidesToShow - 1) * this.options.gap;
            this.slideWidth = (containerWidth - totalGaps) / this.options.slidesToShow;

            this.slides.forEach(slide => {
                slide.style.flex = `0 0 ${this.slideWidth}px`;
                slide.style.width = `${this.slideWidth}px`;
            });
        }

        /**
         * Set up infinite loop
         */
        setupInfiniteLoop() {
            // Clone first and last slides
            const firstClones = [];
            const lastClones = [];

            for (let i = 0; i < this.options.slidesToShow; i++) {
                const firstClone = this.slides[i].cloneNode(true);
                const lastClone = this.slides[this.slides.length - 1 - i].cloneNode(true);
                
                firstClone.classList.add('carousel-clone');
                lastClone.classList.add('carousel-clone');
                
                firstClones.push(firstClone);
                lastClones.unshift(lastClone);
            }

            // Append clones
            lastClones.forEach(clone => this.track.insertBefore(clone, this.slides[0]));
            firstClones.forEach(clone => this.track.appendChild(clone));

            // Update slides array (excluding clones for main navigation)
            this.allSlides = Array.from(this.track.children);
            this.cloneOffset = lastClones.length;
        }

        /**
         * Set up navigation buttons
         */
        setupNavigation() {
            if (this.prevBtn) {
                this.prevBtn.addEventListener('click', () => this.prev());
                this.prevBtn.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.prev();
                    }
                });
            }

            if (this.nextBtn) {
                this.nextBtn.addEventListener('click', () => this.next());
                this.nextBtn.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.next();
                    }
                });
            }

            // Disable if single slide
            if (this.slides.length <= this.options.slidesToShow) {
                if (this.prevBtn) this.prevBtn.disabled = true;
                if (this.nextBtn) this.nextBtn.disabled = true;
            }
        }

        /**
         * Set up indicators
         */
        setupIndicators() {
            if (!this.indicators) return;

            // Clear existing
            this.indicators.innerHTML = '';

            // Calculate number of indicators
            const numIndicators = Math.ceil(this.slides.length / this.options.slidesToScroll);

            for (let i = 0; i < numIndicators; i++) {
                const dot = document.createElement('button');
                dot.className = 'carousel-indicator';
                dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
                dot.setAttribute('data-slide', i);
                
                if (i === 0) {
                    dot.classList.add('active');
                    dot.setAttribute('aria-current', 'true');
                }

                dot.addEventListener('click', () => this.goToSlide(i * this.options.slidesToScroll));
                
                this.indicators.appendChild(dot);
            }

            this.indicatorButtons = Array.from(this.indicators.children);
        }

        /**
         * Set up keyboard navigation
         */
        setupKeyboard() {
            this.element.addEventListener('keydown', (e) => {
                switch(e.key) {
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.prev();
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.next();
                        break;
                    case ' ':
                        if (e.target === this.playPauseBtn) {
                            e.preventDefault();
                            this.toggleAutoPlay();
                        }
                        break;
                    case 'Escape':
                        this.pause();
                        break;
                }
            });
        }

        /**
         * Set up touch/swipe support
         */
        setupTouch() {
            let touchStartX = 0;
            let touchStartY = 0;
            let touchEndX = 0;
            let touchEndY = 0;

            this.track.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                this.touchStartTime = Date.now();
                this.isDragging = true;
                this.pause();
            }, { passive: true });

            this.track.addEventListener('touchmove', (e) => {
                if (!this.isDragging) return;
                
                touchEndX = e.touches[0].clientX;
                touchEndY = e.touches[0].clientY;

                // Calculate angle to determine if horizontal swipe
                const diffX = touchEndX - touchStartX;
                const diffY = touchEndY - touchStartY;
                const angle = Math.abs(Math.atan2(diffY, diffX) * 180 / Math.PI);

                // Only track horizontal swipes
                if (angle < 30 || angle > 150) {
                    e.preventDefault();
                    
                    // Visual feedback during swipe
                    const translateX = this.getTranslateX() + diffX * 0.3;
                    this.track.style.transform = `translateX(${translateX}px)`;
                }
            }, { passive: false });

            this.track.addEventListener('touchend', (e) => {
                if (!this.isDragging) return;
                
                this.isDragging = false;
                const touchEndTime = Date.now();
                const touchDuration = touchEndTime - this.touchStartTime;
                const diffX = touchEndX - touchStartX;
                const velocity = Math.abs(diffX) / touchDuration;

                // Determine swipe direction
                if (Math.abs(diffX) > this.options.swipeThreshold || velocity > this.options.velocityThreshold) {
                    if (diffX > 0) {
                        this.prev();
                    } else {
                        this.next();
                    }
                } else {
                    // Snap back to current position
                    this.goToSlide(this.currentIndex, true);
                }

                // Resume auto-play
                if (this.options.autoPlay) {
                    this.play();
                }
            }, { passive: true });

            // Mouse drag support
            let mouseDown = false;
            let startX = 0;

            this.track.addEventListener('mousedown', (e) => {
                mouseDown = true;
                startX = e.clientX;
                this.track.style.cursor = 'grabbing';
                this.pause();
            });

            document.addEventListener('mousemove', (e) => {
                if (!mouseDown) return;
                e.preventDefault();
                
                const diffX = e.clientX - startX;
                const translateX = this.getTranslateX() + diffX * 0.3;
                this.track.style.transform = `translateX(${translateX}px)`;
            });

            document.addEventListener('mouseup', (e) => {
                if (!mouseDown) return;
                
                mouseDown = false;
                this.track.style.cursor = 'grab';
                
                const diffX = e.clientX - startX;
                if (Math.abs(diffX) > this.options.swipeThreshold) {
                    if (diffX > 0) {
                        this.prev();
                    } else {
                        this.next();
                    }
                } else {
                    this.goToSlide(this.currentIndex, true);
                }

                if (this.options.autoPlay) {
                    this.play();
                }
            });
        }

        /**
         * Get current translateX value
         */
        getTranslateX() {
            const style = window.getComputedStyle(this.track);
            const transform = style.transform;
            
            if (transform === 'none') return 0;
            
            const matrix = transform.match(/matrix.*\((.+)\)/);
            if (matrix) {
                const values = matrix[1].split(', ');
                return parseFloat(values[4]);
            }
            
            return 0;
        }

        /**
         * Set up resize handler
         */
        setupResize() {
            let resizeTimer;
            
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    this.calculateResponsive();
                    this.updateSlideWidths();
                    this.goToSlide(this.currentIndex, false);
                    this.setupIndicators();
                }, 250);
            });
        }

        /**
         * Set up auto-play
         */
        setupAutoPlay() {
            if (!this.options.autoPlay) return;

            this.play();

            // Pause on hover
            this.element.addEventListener('mouseenter', () => this.pause());
            this.element.addEventListener('mouseleave', () => {
                if (this.options.autoPlay) this.play();
            });

            // Pause on focus
            this.element.addEventListener('focusin', () => this.pause());
            this.element.addEventListener('focusout', () => {
                if (this.options.autoPlay) this.play();
            });

            // Play/pause button
            if (this.playPauseBtn) {
                this.playPauseBtn.addEventListener('click', () => this.toggleAutoPlay());
                this.updatePlayPauseButton();
            }
        }

        /**
         * Set up accessibility
         */
        setupAccessibility() {
            // Main carousel attributes
            this.element.setAttribute('role', 'region');
            this.element.setAttribute('aria-roledescription', 'carousel');
            this.element.setAttribute('aria-label', this.element.dataset.label || 'Award winners carousel');

            // Live region for announcements
            const liveRegion = document.createElement('div');
            liveRegion.className = 'sr-only';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            this.liveRegion = liveRegion;
            this.element.appendChild(liveRegion);

            // Update slide visibility
            this.updateSlideVisibility();

            // Navigation labels
            if (this.prevBtn) {
                this.prevBtn.setAttribute('aria-label', 'Previous slide');
            }
            if (this.nextBtn) {
                this.nextBtn.setAttribute('aria-label', 'Next slide');
            }
        }

        /**
         * Go to specific slide
         */
        goToSlide(index, animate = true) {
            // Handle bounds
            if (!this.options.loop) {
                index = Math.max(0, Math.min(index, this.slides.length - this.options.slidesToShow));
            } else if (this.cloneOffset) {
                // Handle infinite loop wrapping
                if (index < 0) {
                    index = this.slides.length - this.options.slidesToScroll;
                    this.jumpToSlide(index);
                    return;
                } else if (index >= this.slides.length) {
                    index = 0;
                    this.jumpToSlide(index);
                    return;
                }
            }

            this.currentIndex = index;

            // Calculate transform
            const offset = this.cloneOffset || 0;
            const translateX = -((index + offset) * (this.slideWidth + this.options.gap));
            
            // Apply transform
            if (!animate) {
                this.track.style.transition = 'none';
                setTimeout(() => {
                    this.track.style.transition = `transform ${this.options.animationDuration}ms ease-in-out`;
                }, 50);
            }
            
            this.track.style.transform = `translateX(${translateX}px)`;

            // Update UI
            this.updateButtons();
            this.updateIndicators();
            this.updateSlideVisibility();
            this.announceSlide();
        }

        /**
         * Jump to slide without animation (for infinite loop)
         */
        jumpToSlide(index) {
            this.track.style.transition = 'none';
            this.goToSlide(index, false);
            
            setTimeout(() => {
                this.track.style.transition = `transform ${this.options.animationDuration}ms ease-in-out`;
            }, 50);
        }

        /**
         * Go to next slide
         */
        next() {
            const newIndex = this.currentIndex + this.options.slidesToScroll;
            
            if (!this.options.loop && newIndex >= this.slides.length - this.options.slidesToShow + 1) {
                return;
            }

            this.goToSlide(newIndex);
            this.restartAutoPlay();
        }

        /**
         * Go to previous slide
         */
        prev() {
            const newIndex = this.currentIndex - this.options.slidesToScroll;
            
            if (!this.options.loop && newIndex < 0) {
                return;
            }

            this.goToSlide(newIndex);
            this.restartAutoPlay();
        }

        /**
         * Update navigation buttons
         */
        updateButtons() {
            if (!this.options.loop) {
                if (this.prevBtn) {
                    this.prevBtn.disabled = this.currentIndex === 0;
                    this.prevBtn.setAttribute('aria-disabled', this.currentIndex === 0);
                }
                if (this.nextBtn) {
                    const isEnd = this.currentIndex >= this.slides.length - this.options.slidesToShow;
                    this.nextBtn.disabled = isEnd;
                    this.nextBtn.setAttribute('aria-disabled', isEnd);
                }
            }
        }

        /**
         * Update indicators
         */
        updateIndicators() {
            if (!this.indicatorButtons) return;

            const activeIndex = Math.floor(this.currentIndex / this.options.slidesToScroll);
            
            this.indicatorButtons.forEach((btn, index) => {
                btn.classList.toggle('active', index === activeIndex);
                btn.setAttribute('aria-current', index === activeIndex ? 'true' : 'false');
            });
        }

        /**
         * Update slide visibility for screen readers
         */
        updateSlideVisibility() {
            this.slides.forEach((slide, index) => {
                const isVisible = index >= this.currentIndex && 
                                index < this.currentIndex + this.options.slidesToShow;
                
                slide.setAttribute('aria-hidden', !isVisible);
                slide.setAttribute('tabindex', isVisible ? '0' : '-1');
            });
        }

        /**
         * Announce slide change
         */
        announceSlide() {
            if (!this.liveRegion) return;
            
            const current = this.currentIndex + 1;
            const total = this.slides.length;
            this.liveRegion.textContent = `Slide ${current} of ${total}`;
        }

        /**
         * Start auto-play
         */
        play() {
            if (this.slides.length <= this.options.slidesToShow) return;
            
            this.isPlaying = true;
            this.autoPlayTimer = setInterval(() => {
                this.next();
            }, this.options.autoPlayInterval);
            
            this.updatePlayPauseButton();
        }

        /**
         * Pause auto-play
         */
        pause() {
            this.isPlaying = false;
            
            if (this.autoPlayTimer) {
                clearInterval(this.autoPlayTimer);
                this.autoPlayTimer = null;
            }
            
            this.updatePlayPauseButton();
        }

        /**
         * Toggle auto-play
         */
        toggleAutoPlay() {
            if (this.isPlaying) {
                this.pause();
            } else {
                this.play();
            }
        }

        /**
         * Restart auto-play timer
         */
        restartAutoPlay() {
            if (!this.options.autoPlay || !this.isPlaying) return;
            
            this.pause();
            this.play();
        }

        /**
         * Update play/pause button
         */
        updatePlayPauseButton() {
            if (!this.playPauseBtn) return;
            
            this.playPauseBtn.textContent = this.isPlaying ? 'Pause' : 'Play';
            this.playPauseBtn.setAttribute('aria-label', 
                this.isPlaying ? 'Pause carousel' : 'Play carousel');
        }

        /**
         * Destroy carousel
         */
        destroy() {
            this.pause();
            
            // Remove event listeners
            this.element.removeEventListener('keydown', this.handleKeyboard);
            window.removeEventListener('resize', this.handleResize);
            
            // Reset styles
            this.track.style = '';
            this.slides.forEach(slide => slide.style = '');
            
            // Remove clones
            if (this.cloneOffset) {
                this.element.querySelectorAll('.carousel-clone').forEach(clone => {
                    clone.remove();
                });
            }
            
            // Clear indicators
            if (this.indicators) {
                this.indicators.innerHTML = '';
            }
            
            // Remove live region
            if (this.liveRegion) {
                this.liveRegion.remove();
            }
            
            this.element.classList.remove('carousel-initialized');
        }
    }

    /**
     * Initialize all carousels on page
     */
    function initCarousel() {
        const carousels = document.querySelectorAll('.carousel, [data-carousel]');
        
        if (carousels.length === 0) {
            console.log('No carousels found on this page');
            return;
        }

        const instances = [];
        
        carousels.forEach(element => {
            // Get options from data attributes
            const options = {
                autoPlay: element.dataset.autoplay === 'true',
                autoPlayInterval: parseInt(element.dataset.interval) || CONFIG.autoPlayInterval,
                loop: element.dataset.loop !== 'false',
                slidesToShow: parseInt(element.dataset.slidesToShow) || CONFIG.slidesToShow,
                slidesToScroll: parseInt(element.dataset.slidesToScroll) || CONFIG.slidesToScroll,
                gap: parseInt(element.dataset.gap) || CONFIG.gap
            };
            
            // Create instance
            const carousel = new Carousel(element, options);
            instances.push(carousel);
            
            // Store instance reference
            element.carousel = carousel;
        });
        
        console.log(`✓ Carousel module initialized (${instances.length} instances)`);
        
        return instances;
    }

    // Expose globally
    window.initCarousel = initCarousel;
    window.Carousel = Carousel;

})();