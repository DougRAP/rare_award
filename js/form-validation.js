/**
 * R.A.R.E. Award Website - Form Validation Module
 * Comprehensive form validation with real-time feedback and accessibility support
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        debounceDelay: 300,
        minStoryLength: 200,
        errorSummaryId: 'form-error-summary',
        scrollOffset: 100,
        validationMessages: {
            required: 'This field is required',
            email: 'Please enter a valid email address',
            phone: 'Please enter a valid phone number',
            minLength: 'Must be at least {min} characters',
            maxLength: 'Must be no more than {max} characters',
            pattern: 'Please match the required format',
            storyLength: 'Your story must be at least 200 characters to properly describe the nominee\'s exceptional qualities',
            checkboxRequired: 'Please select at least one quality that describes the nominee',
            department: 'Please select a valid department',
            relationship: 'Please describe your relationship to the nominee',
            customPattern: 'Please enter a valid value'
        }
    };

    // State management
    const state = {
        forms: new Map(),
        fields: new Map(),
        errors: new Map(),
        touched: new Set(),
        completionPercentage: 0
    };

    // Cache DOM elements
    let elements = {};

    /**
     * Base validators
     */
    const validators = {
        required: (value) => {
            if (typeof value === 'string') {
                return value.trim() !== '';
            }
            if (Array.isArray(value)) {
                return value.length > 0;
            }
            return value !== null && value !== undefined;
        },

        email: (value) => {
            if (!value) return true; // Empty is valid for non-required fields
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(value.trim());
        },

        phone: (value) => {
            if (!value) return true;
            const phoneRegex = /^\+?[\d\s\-()]+$/;
            const cleaned = value.replace(/\D/g, '');
            return phoneRegex.test(value) && cleaned.length >= 10 && cleaned.length <= 15;
        },

        minLength: (value, length) => {
            if (!value) return true;
            return value.trim().length >= length;
        },

        maxLength: (value, length) => {
            if (!value) return true;
            return value.trim().length <= length;
        },

        pattern: (value, pattern) => {
            if (!value) return true;
            try {
                const regex = new RegExp(pattern);
                return regex.test(value);
            } catch (e) {
                console.error('Invalid pattern:', pattern);
                return false;
            }
        }
    };

    /**
     * Custom validators for R.A.R.E. form
     */
    const customValidators = {
        storyMinimum: (value) => {
            if (!value) return false;
            return value.trim().length >= CONFIG.minStoryLength;
        },

        checkboxGroup: (fieldName) => {
            const checkboxes = document.querySelectorAll(`input[name="${fieldName}"]:checked`);
            return checkboxes.length > 0;
        },

        department: (value) => {
            if (!value) return false;
            const validDepartments = [
                'engineering', 'sales', 'marketing', 'hr', 'finance', 
                'operations', 'customer-service', 'product', 'design', 'other'
            ];
            return validDepartments.includes(value.toLowerCase());
        },

        relationship: (value) => {
            if (!value) return false;
            const minWords = 2;
            const words = value.trim().split(/\s+/);
            return words.length >= minWords && value.trim().length >= 10;
        }
    };

    /**
     * Cache form elements
     */
    function cacheElements() {
        elements = {
            forms: document.querySelectorAll('form[data-validate], .nomination-form, #nominationForm'),
            errorSummary: document.getElementById(CONFIG.errorSummaryId),
            submitButtons: document.querySelectorAll('[type="submit"], .submit-btn'),
            progressBar: document.querySelector('.form-progress-bar, #formProgress'),
            completionText: document.querySelector('.form-completion, #formCompletion')
        };
    }

    /**
     * Initialize form validation
     */
    function initForms() {
        elements.forms.forEach(form => {
            if (!form.id) form.id = `form-${Date.now()}`;
            
            state.forms.set(form.id, {
                fields: new Map(),
                isValid: false,
                completion: 0
            });

            // Prevent default submission
            form.addEventListener('submit', handleFormSubmit);

            // Find and initialize all form fields
            const fields = form.querySelectorAll('input, textarea, select');
            fields.forEach(field => initField(field, form.id));

            // Add form-level validation attributes
            form.setAttribute('novalidate', 'true');
            form.setAttribute('data-validation-initialized', 'true');
        });
    }

    /**
     * Initialize individual field
     */
    function initField(field, formId) {
        if (!field.name && !field.id) return;

        const fieldId = field.id || `field-${field.name}-${Date.now()}`;
        if (!field.id) field.id = fieldId;

        // Extract validation rules
        const rules = extractValidationRules(field);
        
        // Store field state
        state.fields.set(fieldId, {
            element: field,
            formId: formId,
            rules: rules,
            isValid: !hasRequiredRule(rules),
            isDirty: false,
            value: getFieldValue(field)
        });

        // Create error container
        createErrorContainer(field);

        // Add event listeners
        field.addEventListener('blur', handleFieldBlur);
        field.addEventListener('input', debounce(handleFieldInput, CONFIG.debounceDelay));
        field.addEventListener('change', handleFieldChange);

        // Special handling for checkbox groups
        if (field.type === 'checkbox' && field.name) {
            const group = form.querySelectorAll(`input[name="${field.name}"]`);
            group.forEach(checkbox => {
                checkbox.addEventListener('change', () => validateField(field));
            });
        }
    }

    /**
     * Extract validation rules from field attributes
     */
    function extractValidationRules(field) {
        const rules = [];

        // Required
        if (field.hasAttribute('required') || field.hasAttribute('data-required')) {
            rules.push({ type: 'required' });
        }

        // Email
        if (field.type === 'email' || field.hasAttribute('data-email')) {
            rules.push({ type: 'email' });
        }

        // Phone
        if (field.type === 'tel' || field.hasAttribute('data-phone')) {
            rules.push({ type: 'phone' });
        }

        // Min length
        const minLength = field.getAttribute('minlength') || field.getAttribute('data-min-length');
        if (minLength) {
            rules.push({ type: 'minLength', value: parseInt(minLength) });
        }

        // Max length
        const maxLength = field.getAttribute('maxlength') || field.getAttribute('data-max-length');
        if (maxLength) {
            rules.push({ type: 'maxLength', value: parseInt(maxLength) });
        }

        // Pattern
        const pattern = field.getAttribute('pattern') || field.getAttribute('data-pattern');
        if (pattern) {
            rules.push({ type: 'pattern', value: pattern });
        }

        // Custom validators based on field name/class
        if (field.name === 'story' || field.classList.contains('nominee-story')) {
            rules.push({ type: 'custom', validator: 'storyMinimum' });
        }

        if (field.name === 'qualities' || field.classList.contains('quality-checkbox')) {
            rules.push({ type: 'custom', validator: 'checkboxGroup', param: field.name });
        }

        if (field.name === 'department' || field.classList.contains('department-select')) {
            rules.push({ type: 'custom', validator: 'department' });
        }

        if (field.name === 'relationship' || field.classList.contains('relationship-field')) {
            rules.push({ type: 'custom', validator: 'relationship' });
        }

        return rules;
    }

    /**
     * Check if field has required rule
     */
    function hasRequiredRule(rules) {
        return rules.some(rule => rule.type === 'required');
    }

    /**
     * Create error container for field
     */
    function createErrorContainer(field) {
        let errorContainer = field.parentElement.querySelector('.field-error');
        
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.className = 'field-error';
            errorContainer.setAttribute('role', 'alert');
            errorContainer.setAttribute('aria-live', 'polite');
            errorContainer.setAttribute('aria-atomic', 'true');
            errorContainer.id = `${field.id}-error`;
            
            // Insert after field
            field.parentNode.insertBefore(errorContainer, field.nextSibling);
        }

        // Set ARIA relationship
        field.setAttribute('aria-describedby', errorContainer.id);
        
        return errorContainer;
    }

    /**
     * Get field value
     */
    function getFieldValue(field) {
        if (field.type === 'checkbox') {
            if (field.name) {
                const checked = document.querySelectorAll(`input[name="${field.name}"]:checked`);
                return Array.from(checked).map(cb => cb.value);
            }
            return field.checked;
        }
        
        if (field.type === 'radio') {
            const checked = document.querySelector(`input[name="${field.name}"]:checked`);
            return checked ? checked.value : '';
        }
        
        return field.value;
    }

    /**
     * Validate field
     */
    function validateField(field) {
        const fieldState = state.fields.get(field.id);
        if (!fieldState) return true;

        const value = getFieldValue(field);
        const errors = [];
        let isValid = true;

        // Run through validation rules
        fieldState.rules.forEach(rule => {
            let passed = true;

            if (rule.type === 'custom') {
                // Custom validator
                const validator = customValidators[rule.validator];
                if (validator) {
                    passed = rule.param ? validator(rule.param) : validator(value);
                    if (!passed) {
                        errors.push(CONFIG.validationMessages[rule.validator] || 'Invalid value');
                    }
                }
            } else {
                // Standard validator
                const validator = validators[rule.type];
                if (validator) {
                    passed = rule.value !== undefined ? validator(value, rule.value) : validator(value);
                    if (!passed) {
                        let message = CONFIG.validationMessages[rule.type];
                        if (rule.type === 'minLength') {
                            message = message.replace('{min}', rule.value);
                        } else if (rule.type === 'maxLength') {
                            message = message.replace('{max}', rule.value);
                        }
                        errors.push(message);
                    }
                }
            }

            if (!passed) isValid = false;
        });

        // Update field state
        fieldState.isValid = isValid;
        fieldState.value = value;
        state.fields.set(field.id, fieldState);

        // Update UI
        updateFieldUI(field, isValid, errors);
        
        // Update form completion
        updateFormCompletion(fieldState.formId);

        return isValid;
    }

    /**
     * Update field UI based on validation state
     */
    function updateFieldUI(field, isValid, errors) {
        const errorContainer = document.getElementById(`${field.id}-error`);
        
        if (!state.touched.has(field.id)) {
            // Don't show errors until field is touched
            return;
        }

        if (isValid) {
            // Clear errors
            field.classList.remove('error', 'invalid');
            field.classList.add('valid');
            field.setAttribute('aria-invalid', 'false');
            
            if (errorContainer) {
                errorContainer.textContent = '';
                errorContainer.style.display = 'none';
            }
            
            // Clear from error map
            state.errors.delete(field.id);
        } else {
            // Show errors
            field.classList.remove('valid');
            field.classList.add('error', 'invalid');
            field.setAttribute('aria-invalid', 'true');
            
            if (errorContainer && errors.length > 0) {
                errorContainer.textContent = errors[0]; // Show first error
                errorContainer.style.display = 'block';
            }
            
            // Store in error map
            state.errors.set(field.id, errors);
        }

        // Update error summary
        updateErrorSummary();
    }

    /**
     * Update form completion percentage
     */
    function updateFormCompletion(formId) {
        const formState = state.forms.get(formId);
        if (!formState) return;

        const fields = Array.from(state.fields.values()).filter(f => f.formId === formId);
        const requiredFields = fields.filter(f => hasRequiredRule(f.rules));
        const validFields = requiredFields.filter(f => f.isValid);
        
        const completion = requiredFields.length > 0 
            ? Math.round((validFields.length / requiredFields.length) * 100)
            : 100;

        formState.completion = completion;
        formState.isValid = requiredFields.every(f => f.isValid);
        
        // Update progress bar if exists
        if (elements.progressBar) {
            elements.progressBar.style.width = `${completion}%`;
            elements.progressBar.setAttribute('aria-valuenow', completion);
        }

        // Update completion text if exists
        if (elements.completionText) {
            elements.completionText.textContent = `${completion}% Complete`;
        }

        // Enable/disable submit buttons
        const form = document.getElementById(formId);
        const submitBtn = form?.querySelector('[type="submit"], .submit-btn');
        if (submitBtn) {
            submitBtn.disabled = !formState.isValid;
            submitBtn.setAttribute('aria-disabled', !formState.isValid);
        }

        state.completionPercentage = completion;
    }

    /**
     * Update error summary
     */
    function updateErrorSummary() {
        if (!elements.errorSummary) {
            // Create error summary if doesn't exist
            const firstForm = elements.forms[0];
            if (firstForm) {
                elements.errorSummary = document.createElement('div');
                elements.errorSummary.id = CONFIG.errorSummaryId;
                elements.errorSummary.className = 'form-error-summary';
                elements.errorSummary.setAttribute('role', 'alert');
                elements.errorSummary.setAttribute('aria-live', 'assertive');
                firstForm.parentNode.insertBefore(elements.errorSummary, firstForm);
            }
        }

        if (!elements.errorSummary) return;

        if (state.errors.size === 0) {
            elements.errorSummary.style.display = 'none';
            elements.errorSummary.innerHTML = '';
            return;
        }

        // Build error list
        let html = '<h3>Please correct the following errors:</h3><ul>';
        state.errors.forEach((errors, fieldId) => {
            const field = document.getElementById(fieldId);
            const label = field ? (getFieldLabel(field) || field.name || fieldId) : fieldId;
            html += `<li><a href="#${fieldId}">${label}: ${errors[0]}</a></li>`;
        });
        html += '</ul>';

        elements.errorSummary.innerHTML = html;
        elements.errorSummary.style.display = 'block';

        // Add click handlers to scroll to fields
        elements.errorSummary.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const fieldId = link.getAttribute('href').substring(1);
                const field = document.getElementById(fieldId);
                if (field) {
                    scrollToField(field);
                    field.focus();
                }
            });
        });
    }

    /**
     * Get field label text
     */
    function getFieldLabel(field) {
        const label = document.querySelector(`label[for="${field.id}"]`);
        if (label) return label.textContent.trim();
        
        const placeholder = field.getAttribute('placeholder');
        if (placeholder) return placeholder;
        
        const ariaLabel = field.getAttribute('aria-label');
        if (ariaLabel) return ariaLabel;
        
        return null;
    }

    /**
     * Scroll to field with offset
     */
    function scrollToField(field) {
        const rect = field.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const targetY = rect.top + scrollTop - CONFIG.scrollOffset;
        
        window.scrollTo({
            top: targetY,
            behavior: 'smooth'
        });
    }

    /**
     * Handle field blur event
     */
    function handleFieldBlur(e) {
        const field = e.target;
        state.touched.add(field.id);
        validateField(field);
        
        // Save to storage
        saveFieldToStorage(field);
    }

    /**
     * Handle field input event
     */
    function handleFieldInput(e) {
        const field = e.target;
        const fieldState = state.fields.get(field.id);
        if (fieldState) {
            fieldState.isDirty = true;
        }
        
        // Only validate if already touched
        if (state.touched.has(field.id)) {
            validateField(field);
        }
        
        // Update character counter if exists
        updateCharacterCounter(field);
        
        // Save to storage (debounced)
        saveFieldToStorage(field);
    }

    /**
     * Handle field change event
     */
    function handleFieldChange(e) {
        const field = e.target;
        validateField(field);
        saveFieldToStorage(field);
    }

    /**
     * Update character counter
     */
    function updateCharacterCounter(field) {
        const counter = document.querySelector(`[data-counter-for="${field.id}"], #${field.id}-counter`);
        if (!counter) return;

        const current = field.value.length;
        const max = field.getAttribute('maxlength') || field.getAttribute('data-max-length');
        const min = field.getAttribute('minlength') || field.getAttribute('data-min-length');

        if (max) {
            counter.textContent = `${current}/${max} characters`;
            counter.classList.toggle('warning', current > max * 0.9);
        } else if (min) {
            counter.textContent = `${current} characters (minimum ${min})`;
            counter.classList.toggle('error', current < min);
        } else {
            counter.textContent = `${current} characters`;
        }
    }

    /**
     * Save field value to storage
     */
    function saveFieldToStorage(field) {
        if (typeof window.Storage === 'undefined') return;
        
        try {
            const formId = state.fields.get(field.id)?.formId;
            if (!formId) return;
            
            const formData = collectFormData(formId);
            window.Storage.set(`rare_form_autosave_${formId}`, formData);
            
            // Show save indicator
            showSaveIndicator();
        } catch (e) {
            console.warn('Failed to save form data:', e);
        }
    }

    /**
     * Collect form data
     */
    function collectFormData(formId) {
        const data = {};
        state.fields.forEach((fieldState, fieldId) => {
            if (fieldState.formId === formId) {
                data[fieldId] = fieldState.value;
            }
        });
        return data;
    }

    /**
     * Load saved form data
     */
    function loadSavedFormData() {
        if (typeof window.Storage === 'undefined') return;
        
        elements.forms.forEach(form => {
            try {
                const savedData = window.Storage.get(`rare_form_autosave_${form.id}`);
                if (savedData) {
                    restoreFormData(form, savedData);
                }
            } catch (e) {
                console.warn('Failed to load saved form data:', e);
            }
        });
    }

    /**
     * Restore form data
     */
    function restoreFormData(form, data) {
        Object.keys(data).forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                const value = data[fieldId];
                if (field.type === 'checkbox' || field.type === 'radio') {
                    field.checked = value === true || value === field.value;
                } else {
                    field.value = value;
                }
                
                // Update field state
                const fieldState = state.fields.get(fieldId);
                if (fieldState) {
                    fieldState.value = value;
                }
            }
        });
        
        // Show restore notification
        announceToScreenReader('Form data has been restored from your previous session');
    }

    /**
     * Show save indicator
     */
    function showSaveIndicator() {
        let indicator = document.getElementById('save-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'save-indicator';
            indicator.className = 'save-indicator';
            indicator.textContent = 'Saved';
            document.body.appendChild(indicator);
        }
        
        indicator.classList.add('show');
        setTimeout(() => {
            indicator.classList.remove('show');
        }, 2000);
    }

    /**
     * Handle form submit
     */
    function handleFormSubmit(e) {
        const form = e.target;
        const formState = state.forms.get(form.id);
        
        // Validate all fields
        let allValid = true;
        state.fields.forEach((fieldState, fieldId) => {
            if (fieldState.formId === form.id) {
                state.touched.add(fieldId);
                const field = document.getElementById(fieldId);
                if (field && !validateField(field)) {
                    allValid = false;
                }
            }
        });
        
        if (!allValid) {
            e.preventDefault();
            
            // Scroll to first error
            const firstError = Array.from(state.errors.keys())[0];
            if (firstError) {
                const field = document.getElementById(firstError);
                if (field) {
                    scrollToField(field);
                    field.focus();
                }
            }
            
            // Announce error to screen readers
            announceToScreenReader('Form contains errors. Please review and correct them.');
            
            return false;
        }
        
        // Clear saved data on successful submit
        if (typeof window.Storage !== 'undefined') {
            window.Storage.remove(`rare_form_autosave_${form.id}`);
        }
        
        return true;
    }

    /**
     * Validate entire form
     */
    function validateForm(formId) {
        const formState = state.forms.get(formId);
        if (!formState) return false;
        
        let isValid = true;
        state.fields.forEach((fieldState, fieldId) => {
            if (fieldState.formId === formId) {
                const field = document.getElementById(fieldId);
                if (field && !validateField(field)) {
                    isValid = false;
                }
            }
        });
        
        return isValid;
    }

    /**
     * Reset form validation
     */
    function resetFormValidation(formId) {
        state.fields.forEach((fieldState, fieldId) => {
            if (fieldState.formId === formId) {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.classList.remove('valid', 'invalid', 'error');
                    field.removeAttribute('aria-invalid');
                    
                    const errorContainer = document.getElementById(`${field.id}-error`);
                    if (errorContainer) {
                        errorContainer.textContent = '';
                        errorContainer.style.display = 'none';
                    }
                }
            }
        });
        
        state.errors.clear();
        state.touched.clear();
        updateErrorSummary();
        updateFormCompletion(formId);
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
     * Debounce utility
     */
    function debounce(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * FormValidator public API
     */
    const FormValidator = {
        validate: validateForm,
        validateField: validateField,
        reset: resetFormValidation,
        getCompletion: () => state.completionPercentage,
        getErrors: () => Array.from(state.errors.entries()),
        isFormValid: (formId) => state.forms.get(formId)?.isValid || false,
        addCustomValidator: (name, validator) => {
            customValidators[name] = validator;
        }
    };

    /**
     * Main initialization function
     */
    function initFormValidation() {
        // Cache elements
        cacheElements();
        
        if (elements.forms.length === 0) {
            console.log('No forms found for validation');
            return;
        }
        
        // Initialize forms
        initForms();
        
        // Load saved data
        loadSavedFormData();
        
        // Expose API globally
        window.FormValidator = FormValidator;
        
        console.log('✓ FormValidation module initialized');
    }

    // Auto-initialize if DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFormValidation);
    } else {
        initFormValidation();
    }

    // Expose initialization function globally
    window.initFormValidation = initFormValidation;
    window.FormValidator = FormValidator;

})();