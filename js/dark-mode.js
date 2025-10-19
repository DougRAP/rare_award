/**
 * R.A.R.E. Award Website - Dark Mode Module
 * Handles theme switching with system preference support and localStorage persistence
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        storageKey: 'theme',
        darkValue: 'dark',
        lightValue: 'light',
        transitionDuration: 300
    };

    // State
    const state = {
        currentTheme: null,
        systemPreference: null,
        mediaQuery: null,
        isTransitioning: false
    };

    // Cache DOM elements
    let elements = {};

    /**
     * Cache DOM elements
     */
    function cacheElements() {
        elements = {
            body: document.body,
            themeToggle: document.getElementById('themeToggle'),
            themeToggleAll: document.querySelectorAll('[data-theme-toggle]')
        };
    }

    /**
     * Detect system preference
     */
    function detectSystemPreference() {
        if (!window.matchMedia) {
            return CONFIG.lightValue;
        }

        state.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        return state.mediaQuery.matches ? CONFIG.darkValue : CONFIG.lightValue;
    }

    /**
     * Get saved theme from localStorage
     */
    function getSavedTheme() {
        try {
            return localStorage.getItem(CONFIG.storageKey);
        } catch (e) {
            console.warn('Failed to access localStorage:', e);
            return null;
        }
    }

    /**
     * Save theme to localStorage
     */
    function saveTheme(theme) {
        try {
            localStorage.setItem(CONFIG.storageKey, theme);
        } catch (e) {
            console.warn('Failed to save theme:', e);
        }
    }

    /**
     * Apply theme to DOM
     */
    function applyTheme(theme, skipTransition = false) {
        if (!elements.body) return;

        // Prevent multiple transitions
        if (state.isTransitioning && !skipTransition) return;

        state.currentTheme = theme;

        // Add transition class if not skipping
        if (!skipTransition && !elements.body.classList.contains('theme-transition')) {
            elements.body.classList.add('theme-transition');
            state.isTransitioning = true;

            // Remove transition class after duration
            setTimeout(() => {
                elements.body.classList.remove('theme-transition');
                state.isTransitioning = false;
            }, CONFIG.transitionDuration);
        }

        // Apply theme
        if (theme === CONFIG.darkValue) {
            elements.body.setAttribute('data-theme', CONFIG.darkValue);
            elements.body.classList.add('dark-mode');
            elements.body.classList.remove('light-mode');
        } else {
            elements.body.removeAttribute('data-theme');
            elements.body.classList.remove('dark-mode');
            elements.body.classList.add('light-mode');
        }

        // Update toggle button(s)
        updateToggleButtons();

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('themechange', {
            detail: { theme: theme }
        }));
    }

    /**
     * Update toggle button state
     */
    function updateToggleButtons() {
        const isDark = state.currentTheme === CONFIG.darkValue;

        // Update main toggle
        if (elements.themeToggle) {
            elements.themeToggle.setAttribute('aria-pressed', isDark);
            elements.themeToggle.setAttribute('aria-label', 
                isDark ? 'Switch to light mode' : 'Switch to dark mode');
            elements.themeToggle.classList.toggle('active', isDark);
            
            // Update icon or text if present
            const icon = elements.themeToggle.querySelector('.theme-icon, [data-theme-icon]');
            if (icon) {
                icon.textContent = isDark ? '☀️' : '🌙';
            }
            
            const text = elements.themeToggle.querySelector('.theme-text, [data-theme-text]');
            if (text) {
                text.textContent = isDark ? 'Light' : 'Dark';
            }
        }

        // Update any additional toggles
        elements.themeToggleAll.forEach(toggle => {
            toggle.setAttribute('aria-pressed', isDark);
            toggle.classList.toggle('active', isDark);
        });
    }

    /**
     * Toggle theme
     */
    function toggleTheme() {
        const newTheme = state.currentTheme === CONFIG.darkValue 
            ? CONFIG.lightValue 
            : CONFIG.darkValue;
        
        applyTheme(newTheme);
        saveTheme(newTheme);
    }

    /**
     * Handle system preference change
     */
    function handleSystemPreferenceChange(e) {
        // Only apply if no saved preference
        if (!getSavedTheme()) {
            const newTheme = e.matches ? CONFIG.darkValue : CONFIG.lightValue;
            applyTheme(newTheme);
        }
    }

    /**
     * Initialize theme on page load (before paint)
     */
    function initializeThemeEarly() {
        // Try to apply theme as early as possible to prevent flash
        const savedTheme = getSavedTheme();
        const systemTheme = detectSystemPreference();
        const theme = savedTheme || systemTheme;

        // Apply immediately without transition
        if (document.body) {
            if (theme === CONFIG.darkValue) {
                document.body.setAttribute('data-theme', CONFIG.darkValue);
                document.body.classList.add('dark-mode');
            }
        }
    }

    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        // Main toggle button
        if (elements.themeToggle) {
            elements.themeToggle.addEventListener('click', (e) => {
                e.preventDefault();
                toggleTheme();
            });

            // Keyboard support
            elements.themeToggle.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleTheme();
                }
            });
        }

        // Additional toggle buttons
        elements.themeToggleAll.forEach(toggle => {
            if (toggle === elements.themeToggle) return;
            
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                toggleTheme();
            });
        });

        // Listen for system preference changes
        if (state.mediaQuery) {
            // Modern browsers
            if (state.mediaQuery.addEventListener) {
                state.mediaQuery.addEventListener('change', handleSystemPreferenceChange);
            } 
            // Older browsers
            else if (state.mediaQuery.addListener) {
                state.mediaQuery.addListener(handleSystemPreferenceChange);
            }
        }

        // Keyboard shortcut (Alt + T)
        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.key === 't') {
                e.preventDefault();
                toggleTheme();
            }
        });
    }

    /**
     * Add CSS for smooth transitions
     */
    function injectTransitionStyles() {
        if (document.getElementById('dark-mode-transitions')) return;

        const style = document.createElement('style');
        style.id = 'dark-mode-transitions';
        style.textContent = `
            .theme-transition,
            .theme-transition *,
            .theme-transition *::before,
            .theme-transition *::after {
                transition: background-color ${CONFIG.transitionDuration}ms ease,
                           color ${CONFIG.transitionDuration}ms ease,
                           border-color ${CONFIG.transitionDuration}ms ease,
                           box-shadow ${CONFIG.transitionDuration}ms ease !important;
            }
            
            /* Prevent transition on page load */
            body:not(.theme-transition) * {
                transition: none !important;
            }
        `;
        document.head.appendChild(style);

        // Allow transitions after initial load
        setTimeout(() => {
            style.textContent = style.textContent.replace(
                'body:not(.theme-transition) * { transition: none !important; }',
                ''
            );
        }, 100);
    }

    /**
     * Main initialization function
     */
    function initDarkMode() {
        // Cache elements
        cacheElements();

        // Detect preferences
        state.systemPreference = detectSystemPreference();

        // Get saved or system theme
        const savedTheme = getSavedTheme();
        const initialTheme = savedTheme || state.systemPreference;

        // Apply initial theme without transition
        applyTheme(initialTheme, true);

        // Set up event listeners
        setupEventListeners();

        // Inject transition styles
        injectTransitionStyles();

        // Add data attribute for CSS
        elements.body.setAttribute('data-theme-initialized', 'true');

        console.log('✓ Dark mode module initialized');
    }

    /**
     * Public API
     */
    const DarkMode = {
        toggle: toggleTheme,
        setTheme: (theme) => {
            if (theme === CONFIG.darkValue || theme === CONFIG.lightValue) {
                applyTheme(theme);
                saveTheme(theme);
            }
        },
        getTheme: () => state.currentTheme,
        isDark: () => state.currentTheme === CONFIG.darkValue,
        reset: () => {
            try {
                localStorage.removeItem(CONFIG.storageKey);
                applyTheme(state.systemPreference);
            } catch (e) {
                console.warn('Failed to reset theme:', e);
            }
        }
    };

    // Try to set theme early (before full DOM load)
    if (document.body) {
        initializeThemeEarly();
    } else {
        // If body doesn't exist yet, try to catch it as soon as it does
        const bodyObserver = new MutationObserver(() => {
            if (document.body) {
                initializeThemeEarly();
                bodyObserver.disconnect();
            }
        });
        bodyObserver.observe(document.documentElement, { childList: true });
    }

    // Full initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDarkMode);
    } else {
        initDarkMode();
    }

    // Expose globally
    window.initDarkMode = initDarkMode;
    window.DarkMode = DarkMode;

})();