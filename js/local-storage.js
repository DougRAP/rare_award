/**
 * R.A.R.E. Award Website - Local Storage Utilities
 * Centralized storage management with automatic JSON handling and fallbacks
 */

(function() {
    'use strict';

    // Storage availability flags
    let localStorageAvailable = false;
    let sessionStorageAvailable = false;
    
    // In-memory fallback storage
    const memoryStorage = {
        local: {},
        session: {}
    };

    /**
     * Test if storage is available and working
     */
    function testStorageAvailability(storageType) {
        try {
            const storage = window[storageType];
            const testKey = '__storage_test__';
            storage.setItem(testKey, 'test');
            storage.removeItem(testKey);
            return true;
        } catch (e) {
            // Storage unavailable (private browsing, disabled, or quota exceeded)
            return false;
        }
    }

    /**
     * Safely parse JSON with fallback
     */
    function safeParse(value) {
        if (value === null || value === undefined) {
            return null;
        }
        
        try {
            return JSON.parse(value);
        } catch (e) {
            // Return raw value if not valid JSON
            return value;
        }
    }

    /**
     * Safely stringify value
     */
    function safeStringify(value) {
        if (value === undefined) {
            return undefined;
        }
        
        if (value === null) {
            return 'null';
        }
        
        if (typeof value === 'string') {
            return value;
        }
        
        try {
            return JSON.stringify(value);
        } catch (e) {
            // Fallback for circular references or other stringify errors
            console.warn('Storage: Failed to stringify value', e);
            return String(value);
        }
    }

    /**
     * Get the appropriate storage object
     */
    function getStorage(isSession) {
        if (isSession) {
            return sessionStorageAvailable ? window.sessionStorage : null;
        }
        return localStorageAvailable ? window.localStorage : null;
    }

    /**
     * Get memory storage fallback
     */
    function getMemoryStorage(isSession) {
        return isSession ? memoryStorage.session : memoryStorage.local;
    }

    /**
     * Storage utility object
     */
    const Storage = {
        /**
         * Set a value in storage
         * @param {string} key - Storage key
         * @param {*} value - Value to store (will be JSON stringified)
         * @param {boolean} isSession - Use sessionStorage instead of localStorage
         * @returns {boolean} Success status
         */
        set(key, value, isSession = false) {
            if (!key || typeof key !== 'string') {
                console.warn('Storage.set: Invalid key provided');
                return false;
            }

            const storage = getStorage(isSession);
            const stringValue = safeStringify(value);
            
            if (stringValue === undefined) {
                return false;
            }

            // Try native storage first
            if (storage) {
                try {
                    storage.setItem(key, stringValue);
                    return true;
                } catch (e) {
                    // Quota exceeded or other storage error
                    console.warn(`Storage.set: Failed to set ${key}`, e);
                    
                    // Try to clear old items if quota exceeded
                    if (e.name === 'QuotaExceededError' || e.code === 22) {
                        try {
                            this._handleQuotaExceeded(storage, key, stringValue);
                            return true;
                        } catch (retryError) {
                            // Fall through to memory storage
                        }
                    }
                }
            }

            // Fallback to memory storage
            const memory = getMemoryStorage(isSession);
            memory[key] = stringValue;
            return true;
        },

        /**
         * Get a value from storage
         * @param {string} key - Storage key
         * @param {boolean} isSession - Use sessionStorage instead of localStorage
         * @returns {*} Parsed value or null if not found
         */
        get(key, isSession = false) {
            if (!key || typeof key !== 'string') {
                console.warn('Storage.get: Invalid key provided');
                return null;
            }

            const storage = getStorage(isSession);
            
            // Try native storage first
            if (storage) {
                try {
                    const value = storage.getItem(key);
                    return safeParse(value);
                } catch (e) {
                    console.warn(`Storage.get: Failed to get ${key}`, e);
                }
            }

            // Fallback to memory storage
            const memory = getMemoryStorage(isSession);
            const value = memory[key];
            return value !== undefined ? safeParse(value) : null;
        },

        /**
         * Remove a value from storage
         * @param {string} key - Storage key
         * @param {boolean} isSession - Use sessionStorage instead of localStorage
         * @returns {boolean} Success status
         */
        remove(key, isSession = false) {
            if (!key || typeof key !== 'string') {
                console.warn('Storage.remove: Invalid key provided');
                return false;
            }

            const storage = getStorage(isSession);
            
            // Try native storage first
            if (storage) {
                try {
                    storage.removeItem(key);
                } catch (e) {
                    console.warn(`Storage.remove: Failed to remove ${key}`, e);
                }
            }

            // Also remove from memory storage
            const memory = getMemoryStorage(isSession);
            delete memory[key];
            
            return true;
        },

        /**
         * Clear all values from storage
         * @param {boolean} isSession - Clear sessionStorage instead of localStorage
         * @returns {boolean} Success status
         */
        clear(isSession = false) {
            const storage = getStorage(isSession);
            
            // Try native storage first
            if (storage) {
                try {
                    storage.clear();
                } catch (e) {
                    console.warn('Storage.clear: Failed to clear storage', e);
                }
            }

            // Also clear memory storage
            const memory = getMemoryStorage(isSession);
            Object.keys(memory).forEach(key => delete memory[key]);
            
            return true;
        },

        /**
         * Check if a key exists in storage
         * @param {string} key - Storage key
         * @param {boolean} isSession - Check sessionStorage instead of localStorage
         * @returns {boolean} True if key exists
         */
        has(key, isSession = false) {
            if (!key || typeof key !== 'string') {
                return false;
            }

            const storage = getStorage(isSession);
            
            // Try native storage first
            if (storage) {
                try {
                    return storage.getItem(key) !== null;
                } catch (e) {
                    console.warn(`Storage.has: Failed to check ${key}`, e);
                }
            }

            // Fallback to memory storage
            const memory = getMemoryStorage(isSession);
            return key in memory;
        },

        /**
         * Get all keys from storage
         * @param {boolean} isSession - Get from sessionStorage instead of localStorage
         * @returns {string[]} Array of keys
         */
        keys(isSession = false) {
            const storage = getStorage(isSession);
            const keys = [];
            
            // Try native storage first
            if (storage) {
                try {
                    for (let i = 0; i < storage.length; i++) {
                        const key = storage.key(i);
                        if (key) keys.push(key);
                    }
                    return keys;
                } catch (e) {
                    console.warn('Storage.keys: Failed to get keys', e);
                }
            }

            // Fallback to memory storage
            const memory = getMemoryStorage(isSession);
            return Object.keys(memory);
        },

        /**
         * Get the size of stored data in bytes
         * @param {boolean} isSession - Check sessionStorage instead of localStorage
         * @returns {number} Approximate size in bytes
         */
        size(isSession = false) {
            const keys = this.keys(isSession);
            let size = 0;
            
            keys.forEach(key => {
                const value = this.get(key, isSession);
                const stringValue = safeStringify(value);
                if (stringValue) {
                    // Rough estimate: 2 bytes per character (UTF-16)
                    size += key.length * 2 + stringValue.length * 2;
                }
            });
            
            return size;
        },

        /**
         * Check if storage is available
         * @param {boolean} isSession - Check sessionStorage instead of localStorage
         * @returns {boolean} True if native storage is available
         */
        isAvailable(isSession = false) {
            return isSession ? sessionStorageAvailable : localStorageAvailable;
        },

        /**
         * Get storage info
         * @returns {object} Storage availability and usage info
         */
        getInfo() {
            return {
                localStorageAvailable,
                sessionStorageAvailable,
                localStorageSize: this.size(false),
                sessionStorageSize: this.size(true),
                localStorageKeys: this.keys(false).length,
                sessionStorageKeys: this.keys(true).length,
                memoryStorageActive: !localStorageAvailable || !sessionStorageAvailable
            };
        },

        /**
         * Handle quota exceeded errors by clearing old data
         * @private
         */
        _handleQuotaExceeded(storage, newKey, newValue) {
            // Try to clear old RARE form data first
            const keysToCheck = [
                'rare_form_draft_',
                'rare_form_autosave_',
                'rare_temp_',
                'rare_old_'
            ];
            
            for (let i = storage.length - 1; i >= 0; i--) {
                const key = storage.key(i);
                if (key && keysToCheck.some(prefix => key.startsWith(prefix))) {
                    storage.removeItem(key);
                    
                    // Try to set the new value again
                    try {
                        storage.setItem(newKey, newValue);
                        return;
                    } catch (e) {
                        // Continue clearing
                    }
                }
            }
            
            // If still failing, clear oldest timestamps
            const timestampedKeys = [];
            for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i);
                if (key && key.includes('_timestamp_')) {
                    timestampedKeys.push(key);
                }
            }
            
            if (timestampedKeys.length > 0) {
                // Remove oldest timestamped items
                timestampedKeys.slice(0, Math.ceil(timestampedKeys.length / 2)).forEach(key => {
                    storage.removeItem(key);
                });
                
                storage.setItem(newKey, newValue);
            } else {
                throw new Error('Unable to clear space for new storage item');
            }
        }
    };

    /**
     * Initialize storage utilities
     */
    function initLocalStorage() {
        // Test storage availability
        localStorageAvailable = testStorageAvailability('localStorage');
        sessionStorageAvailable = testStorageAvailability('sessionStorage');
        
        // Log storage status in development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('Storage availability:', {
                localStorage: localStorageAvailable,
                sessionStorage: sessionStorageAvailable
            });
        }
        
        // Expose Storage utilities globally
        window.Storage = Storage;
        
        // Also expose as CommonJS style for compatibility
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = Storage;
        }
        
        console.log('✓ LocalStorage module initialized');
        
        return Storage;
    }

    // Auto-initialize if DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLocalStorage);
    } else {
        initLocalStorage();
    }

    // Expose initialization function globally
    window.initLocalStorage = initLocalStorage;
    window.Storage = Storage;

})();