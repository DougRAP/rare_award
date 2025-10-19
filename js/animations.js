/**
 * R.A.R.E. Award Website - Animations Module
 * Controls scroll-triggered effects, parallax, counters, particles, and confetti
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        intersectionThreshold: 0.1,
        intersectionRootMargin: '0px 0px -50px 0px',
        fadeInDuration: 600,
        slideInDuration: 800,
        scaleInDuration: 500,
        counterDuration: 2000,
        parallaxSpeed: 0.5,
        particleCount: 30,
        confettiCount: 150,
        confettiDuration: 6000
    };

    // State
    const state = {
        reducedMotion: false,
        animatedElements: new WeakSet(),
        counters: new Map(),
        parallaxElements: [],
        particles: [],
        confettiParticles: [],
        rafId: null,
        confettiRafId: null
    };

    /**
     * Check for reduced motion preference
     */
    function checkReducedMotion() {
        state.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        // Listen for changes
        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
            state.reducedMotion = e.matches;
            if (e.matches) {
                // Stop all animations
                stopAllAnimations();
            }
        });
    }

    /**
     * Initialize scroll-triggered animations
     */
    function initScrollAnimations() {
        if (state.reducedMotion) return;
        
        // Check for IntersectionObserver support
        if (!('IntersectionObserver' in window)) {
            // Fallback: show all elements immediately
            showAllAnimatedElements();
            return;
        }

        const elements = document.querySelectorAll('[data-animate], .animate-on-scroll');
        if (elements.length === 0) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !state.animatedElements.has(entry.target)) {
                    animateElement(entry.target);
                    
                    // Mark as animated (unless repeat is enabled)
                    if (entry.target.dataset.repeat !== 'true') {
                        state.animatedElements.add(entry.target);
                        observer.unobserve(entry.target);
                    }
                }
            });
        }, {
            threshold: CONFIG.intersectionThreshold,
            rootMargin: CONFIG.intersectionRootMargin
        });

        elements.forEach(element => {
            // Set initial state
            element.style.opacity = '0';
            observer.observe(element);
        });
    }

    /**
     * Animate individual element
     */
    function animateElement(element) {
        const animationType = element.dataset.animate || 'fade';
        const delay = parseInt(element.dataset.delay) || 0;
        const duration = parseInt(element.dataset.duration) || CONFIG.fadeInDuration;

        setTimeout(() => {
            element.style.transition = `all ${duration}ms ease-out`;
            
            switch (animationType) {
                case 'fade':
                case 'fadeIn':
                    fadeIn(element);
                    break;
                case 'slideLeft':
                    slideIn(element, 'left');
                    break;
                case 'slideRight':
                    slideIn(element, 'right');
                    break;
                case 'slideUp':
                    slideIn(element, 'up');
                    break;
                case 'slideDown':
                    slideIn(element, 'down');
                    break;
                case 'scale':
                case 'scaleUp':
                    scaleUp(element);
                    break;
                case 'rotate':
                    rotateIn(element);
                    break;
                default:
                    fadeIn(element);
            }

            element.classList.add('animated');
        }, delay);
    }

    /**
     * Fade in animation
     */
    function fadeIn(element) {
        element.style.opacity = '1';
    }

    /**
     * Slide in animation
     */
    function slideIn(element, direction) {
        const distance = 30;
        
        switch (direction) {
            case 'left':
                element.style.transform = 'translateX(0)';
                break;
            case 'right':
                element.style.transform = 'translateX(0)';
                break;
            case 'up':
                element.style.transform = 'translateY(0)';
                break;
            case 'down':
                element.style.transform = 'translateY(0)';
                break;
        }
        element.style.opacity = '1';
    }

    /**
     * Scale up animation
     */
    function scaleUp(element) {
        element.style.transform = 'scale(1)';
        element.style.opacity = '1';
    }

    /**
     * Rotate in animation
     */
    function rotateIn(element) {
        element.style.transform = 'rotate(0deg)';
        element.style.opacity = '1';
    }

    /**
     * Initialize counter animations
     */
    function initCounters() {
        if (state.reducedMotion) return;

        const counters = document.querySelectorAll('[data-counter]');
        if (counters.length === 0) return;

        if (!('IntersectionObserver' in window)) {
            // Fallback: show final values immediately
            counters.forEach(counter => {
                counter.textContent = counter.dataset.counter;
            });
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !state.counters.has(entry.target)) {
                    startCounter(entry.target);
                    state.counters.set(entry.target, true);
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.5
        });

        counters.forEach(counter => {
            counter.textContent = '0';
            observer.observe(counter);
        });
    }

    /**
     * Start counter animation
     */
    function startCounter(element) {
        const target = parseFloat(element.dataset.counter);
        const duration = parseInt(element.dataset.duration) || CONFIG.counterDuration;
        const prefix = element.dataset.prefix || '';
        const suffix = element.dataset.suffix || '';
        const decimals = parseInt(element.dataset.decimals) || 0;
        
        const startTime = performance.now();
        const start = 0;

        function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out-cubic)
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const current = start + (target - start) * easeProgress;
            
            element.textContent = prefix + current.toFixed(decimals) + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        }

        requestAnimationFrame(updateCounter);
    }

    /**
     * Initialize parallax effects
     */
    function initParallax() {
        if (state.reducedMotion) return;

        const elements = document.querySelectorAll('[data-parallax]');
        if (elements.length === 0) return;

        elements.forEach(element => {
            const speed = parseFloat(element.dataset.parallax) || CONFIG.parallaxSpeed;
            state.parallaxElements.push({ element, speed });
        });

        // Start parallax animation
        if (state.parallaxElements.length > 0) {
            window.addEventListener('scroll', handleParallax, { passive: true });
            handleParallax(); // Initial position
        }
    }

    /**
     * Handle parallax scrolling
     */
    function handleParallax() {
        if (state.reducedMotion) return;

        const scrollY = window.pageYOffset;

        state.parallaxElements.forEach(({ element, speed }) => {
            const rect = element.getBoundingClientRect();
            const centerY = rect.top + rect.height / 2;
            const windowCenter = window.innerHeight / 2;
            const distance = centerY - windowCenter;
            const translateY = distance * speed * -1;
            
            element.style.transform = `translateY(${translateY}px)`;
        });
    }

    /**
     * Initialize particle system for hero
     */
    function initParticleSystem() {
        if (state.reducedMotion) return;

        const particleContainer = document.querySelector('.particle-container, .hero-particles, [data-particles]');
        if (!particleContainer) return;

        // Create particles
        for (let i = 0; i < CONFIG.particleCount; i++) {
            createParticle(particleContainer);
        }

        // Start animation
        animateParticles();
    }

    /**
     * Create a particle
     */
    function createParticle(container) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Random properties
        const size = Math.random() * 4 + 2;
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const duration = Math.random() * 20 + 10;
        const delay = Math.random() * 5;
        
        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: radial-gradient(circle, #D4AF37 0%, transparent 70%);
            border-radius: 50%;
            left: ${x}%;
            top: ${y}%;
            opacity: 0.6;
            pointer-events: none;
            animation: float ${duration}s ease-in-out ${delay}s infinite;
        `;
        
        container.appendChild(particle);
        state.particles.push(particle);
        
        // Add floating animation
        if (!document.querySelector('#particle-keyframes')) {
            const style = document.createElement('style');
            style.id = 'particle-keyframes';
            style.textContent = `
                @keyframes float {
                    0%, 100% { transform: translateY(0) translateX(0); }
                    25% { transform: translateY(-20px) translateX(10px); }
                    50% { transform: translateY(10px) translateX(-10px); }
                    75% { transform: translateY(-10px) translateX(20px); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Animate particles
     */
    function animateParticles() {
        if (state.reducedMotion || state.particles.length === 0) return;

        state.particles.forEach((particle, index) => {
            const time = Date.now() * 0.001;
            const offsetX = Math.sin(time * 0.5 + index) * 20;
            const offsetY = Math.cos(time * 0.3 + index) * 20;
            
            particle.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        });

        state.rafId = requestAnimationFrame(animateParticles);
    }

    /**
     * Trigger confetti animation
     */
    function triggerConfetti() {
        if (state.reducedMotion) {
            console.log('Confetti skipped due to reduced motion preference');
            return;
        }

        // Clean up existing confetti
        cleanupConfetti();

        // Create container
        const container = document.createElement('div');
        container.className = 'confetti-container';
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
            overflow: hidden;
        `;
        document.body.appendChild(container);

        // Create confetti particles
        for (let i = 0; i < CONFIG.confettiCount; i++) {
            createConfettiParticle(container);
        }

        // Start animation
        animateConfetti();

        // Auto cleanup after duration
        setTimeout(() => {
            cleanupConfetti();
        }, CONFIG.confettiDuration);
    }

    /**
     * Create confetti particle
     */
    function createConfettiParticle(container) {
        const particle = document.createElement('div');
        const colors = ['#D4AF37', '#1e3a5f', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = Math.random() * 10 + 5;
        const shape = Math.random() > 0.5 ? 'square' : 'circle';
        
        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background-color: ${color};
            border-radius: ${shape === 'circle' ? '50%' : '0'};
            left: ${Math.random() * 100}%;
            top: -20px;
            pointer-events: none;
        `;
        
        container.appendChild(particle);
        
        // Store particle data
        state.confettiParticles.push({
            element: particle,
            x: Math.random() * 100,
            y: -20,
            vx: (Math.random() - 0.5) * 2,
            vy: Math.random() * 3 + 2,
            gravity: 0.1,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 10
        });
    }

    /**
     * Animate confetti particles
     */
    function animateConfetti() {
        if (state.confettiParticles.length === 0) return;

        let allOffScreen = true;

        state.confettiParticles.forEach(particle => {
            // Update physics
            particle.vy += particle.gravity;
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.rotation += particle.rotationSpeed;
            
            // Apply wind effect
            particle.vx += (Math.random() - 0.5) * 0.1;
            
            // Update position
            particle.element.style.transform = 
                `translate(${particle.x}px, ${particle.y}px) rotate(${particle.rotation}deg)`;
            
            // Check if still on screen
            if (particle.y < window.innerHeight + 20) {
                allOffScreen = false;
            }
        });

        if (!allOffScreen) {
            state.confettiRafId = requestAnimationFrame(animateConfetti);
        } else {
            cleanupConfetti();
        }
    }

    /**
     * Clean up confetti
     */
    function cleanupConfetti() {
        if (state.confettiRafId) {
            cancelAnimationFrame(state.confettiRafId);
            state.confettiRafId = null;
        }

        const container = document.querySelector('.confetti-container');
        if (container) {
            container.remove();
        }

        state.confettiParticles = [];
    }

    /**
     * Show all animated elements (fallback)
     */
    function showAllAnimatedElements() {
        const elements = document.querySelectorAll('[data-animate], .animate-on-scroll');
        elements.forEach(element => {
            element.style.opacity = '1';
            element.style.transform = 'none';
        });
    }

    /**
     * Stop all animations
     */
    function stopAllAnimations() {
        // Stop particle animation
        if (state.rafId) {
            cancelAnimationFrame(state.rafId);
            state.rafId = null;
        }

        // Stop confetti
        cleanupConfetti();

        // Remove parallax listener
        window.removeEventListener('scroll', handleParallax);

        // Show all elements without animation
        showAllAnimatedElements();

        // Set final counter values
        document.querySelectorAll('[data-counter]').forEach(counter => {
            counter.textContent = counter.dataset.counter;
        });
    }

    /**
     * Initialize stagger animations
     */
    function initStaggerAnimations() {
        if (state.reducedMotion) return;

        const staggerGroups = document.querySelectorAll('[data-stagger]');
        if (staggerGroups.length === 0) return;

        staggerGroups.forEach(group => {
            const children = group.children;
            const staggerDelay = parseInt(group.dataset.stagger) || 100;

            Array.from(children).forEach((child, index) => {
                child.dataset.delay = index * staggerDelay;
                child.dataset.animate = child.dataset.animate || 'fade';
            });
        });
    }

    /**
     * Main initialization function
     */
    function initAnimations() {
        // Check for reduced motion preference
        checkReducedMotion();

        if (state.reducedMotion) {
            console.log('Animations disabled due to reduced motion preference');
            showAllAnimatedElements();
            return;
        }

        // Initialize all animation types
        initStaggerAnimations();
        initScrollAnimations();
        initCounters();
        initParallax();
        initParticleSystem();

        // Set up resize handler for parallax recalculation
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                handleParallax();
            }, 250);
        });

        console.log('✓ Animations module initialized');
    }

    // Expose globally
    window.initAnimations = initAnimations;
    window.triggerConfetti = triggerConfetti;

    // Auto-initialize if DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAnimations);
    } else {
        initAnimations();
    }

})();