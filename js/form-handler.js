/**
 * R.A.R.E. Award Website - Form Handler Module
 * Manages multi-step form navigation, submission, and draft functionality
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        apiEndpoint: '/api/nominations/submit',
        autoSaveDelay: 500,
        autoSaveKey: 'rare_form_autosave',
        draftsKey: 'rare_form_drafts',
        maxDrafts: 5,
        successRedirect: 'success.html',
        steps: 4,
        submitTimeout: 30000
    };

    // State management
    const state = {
        currentStep: 1,
        totalSteps: CONFIG.steps,
        formData: {},
        isSubmitting: false,
        autoSaveTimer: null,
        currentDraftId: null
    };

    // Cache DOM elements
    let elements = {};

    /**
     * Cache DOM elements
     */
    function cacheElements() {
        elements = {
            form: document.querySelector('#nominationForm, .nomination-form'),
            steps: document.querySelectorAll('.form-step, [data-step]'),
            stepIndicators: document.querySelectorAll('.step-indicator, .progress-step'),
            progressBar: document.querySelector('.form-progress, #formProgress'),
            progressText: document.querySelector('.progress-text, #progressText'),
            nextBtn: document.querySelector('#nextStep, .btn-next'),
            prevBtn: document.querySelector('#prevStep, .btn-prev'),
            submitBtn: document.querySelector('#submitForm, .btn-submit'),
            saveDraftBtn: document.querySelector('#saveDraft, .btn-save-draft'),
            loadDraftBtn: document.querySelector('#loadDraft, .btn-load-draft'),
            draftsList: document.querySelector('#draftsList, .drafts-list'),
            errorContainer: document.querySelector('#formError, .form-error'),
            successContainer: document.querySelector('#formSuccess, .form-success'),
            loadingIndicator: document.querySelector('#formLoading, .form-loading'),
            autoSaveIndicator: document.querySelector('#autoSaveIndicator, .auto-save-indicator')
        };
    }

    /**
     * Initialize multi-step form
     */
    function initMultiStepForm() {
        if (!elements.form || !elements.steps.length) {
            console.log('No multi-step form found on this page');
            return;
        }

        // Set initial state
        state.totalSteps = elements.steps.length || CONFIG.steps;
        
        // Show first step
        showStep(1);
        
        // Bind navigation events
        if (elements.nextBtn) {
            elements.nextBtn.addEventListener('click', handleNext);
        }
        
        if (elements.prevBtn) {
            elements.prevBtn.addEventListener('click', handlePrev);
        }
        
        // Bind step indicator clicks
        elements.stepIndicators.forEach((indicator, index) => {
            indicator.addEventListener('click', (e) => {
                e.preventDefault();
                if (indicator.classList.contains('completed')) {
                    goToStep(index + 1);
                }
            });
        });

        // Keyboard navigation
        document.addEventListener('keydown', handleKeyboardNavigation);
    }

    /**
     * Show specific step
     */
    function showStep(stepNumber) {
        if (stepNumber < 1 || stepNumber > state.totalSteps) return;
        
        state.currentStep = stepNumber;
        
        // Hide all steps
        elements.steps.forEach(step => {
            step.classList.remove('active', 'current');
            step.setAttribute('aria-hidden', 'true');
        });
        
        // Show current step
        const currentStepElement = elements.steps[stepNumber - 1];
        if (currentStepElement) {
            currentStepElement.classList.add('active', 'current');
            currentStepElement.setAttribute('aria-hidden', 'false');
            
            // Focus first input
            const firstInput = currentStepElement.querySelector('input, textarea, select');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
        
        // Update navigation buttons
        updateNavigationButtons();
        
        // Update progress
        updateProgress();
        
        // Update step indicators
        updateStepIndicators();
        
        // Announce to screen readers
        announceStep();
    }

    /**
     * Handle next button click
     */
    async function handleNext(e) {
        e?.preventDefault();
        
        // Validate current step
        if (!await validateCurrentStep()) {
            showStepError('Please correct the errors before proceeding');
            return;
        }
        
        // Save current step data
        saveStepData();
        
        // Move to next step
        if (state.currentStep < state.totalSteps) {
            showStep(state.currentStep + 1);
        } else {
            // Last step - submit form
            handleSubmit();
        }
    }

    /**
     * Handle previous button click
     */
    function handlePrev(e) {
        e?.preventDefault();
        
        // Save current step data
        saveStepData();
        
        if (state.currentStep > 1) {
            showStep(state.currentStep - 1);
        }
    }

    /**
     * Go to specific step
     */
    function goToStep(stepNumber) {
        if (stepNumber >= 1 && stepNumber <= state.totalSteps) {
            saveStepData();
            showStep(stepNumber);
        }
    }

    /**
     * Validate current step
     */
    async function validateCurrentStep() {
        if (typeof window.FormValidator === 'undefined') {
            console.warn('FormValidator not found, skipping validation');
            return true;
        }
        
        const currentStepElement = elements.steps[state.currentStep - 1];
        if (!currentStepElement) return true;
        
        // Find all fields in current step
        const fields = currentStepElement.querySelectorAll('input, textarea, select');
        let isValid = true;
        
        fields.forEach(field => {
            if (window.FormValidator.validateField) {
                const fieldValid = window.FormValidator.validateField(field);
                if (!fieldValid) isValid = false;
            }
        });
        
        return isValid;
    }

    /**
     * Update navigation buttons
     */
    function updateNavigationButtons() {
        // Previous button
        if (elements.prevBtn) {
            elements.prevBtn.disabled = state.currentStep === 1;
            elements.prevBtn.setAttribute('aria-disabled', state.currentStep === 1);
        }
        
        // Next button
        if (elements.nextBtn) {
            const isLastStep = state.currentStep === state.totalSteps;
            elements.nextBtn.textContent = isLastStep ? 'Submit' : 'Next';
            elements.nextBtn.classList.toggle('btn-submit', isLastStep);
        }
        
        // Submit button (if separate)
        if (elements.submitBtn) {
            elements.submitBtn.style.display = 
                state.currentStep === state.totalSteps ? 'block' : 'none';
        }
    }

    /**
     * Update progress bar and text
     */
    function updateProgress() {
        const progress = (state.currentStep / state.totalSteps) * 100;
        
        if (elements.progressBar) {
            elements.progressBar.style.width = `${progress}%`;
            elements.progressBar.setAttribute('aria-valuenow', progress);
            elements.progressBar.setAttribute('aria-valuemin', '0');
            elements.progressBar.setAttribute('aria-valuemax', '100');
        }
        
        if (elements.progressText) {
            elements.progressText.textContent = `Step ${state.currentStep} of ${state.totalSteps}`;
        }
    }

    /**
     * Update step indicators
     */
    function updateStepIndicators() {
        elements.stepIndicators.forEach((indicator, index) => {
            const stepNum = index + 1;
            
            indicator.classList.toggle('active', stepNum === state.currentStep);
            indicator.classList.toggle('completed', stepNum < state.currentStep);
            indicator.setAttribute('aria-current', stepNum === state.currentStep ? 'step' : 'false');
            
            // Update accessibility
            const label = `Step ${stepNum}${stepNum < state.currentStep ? ' (completed)' : ''}`;
            indicator.setAttribute('aria-label', label);
        });
    }

    /**
     * Save current step data
     */
    function saveStepData() {
        const currentStepElement = elements.steps[state.currentStep - 1];
        if (!currentStepElement) return;
        
        const fields = currentStepElement.querySelectorAll('input, textarea, select');
        
        fields.forEach(field => {
            const name = field.name || field.id;
            if (!name) return;
            
            if (field.type === 'checkbox') {
                if (!state.formData[name]) state.formData[name] = [];
                if (field.checked && !state.formData[name].includes(field.value)) {
                    state.formData[name].push(field.value);
                } else if (!field.checked) {
                    state.formData[name] = state.formData[name].filter(v => v !== field.value);
                }
            } else if (field.type === 'radio') {
                if (field.checked) {
                    state.formData[name] = field.value;
                }
            } else if (field.type === 'file') {
                // Store file reference (actual upload happens on submit)
                if (field.files.length > 0) {
                    state.formData[name] = field.files[0];
                }
            } else {
                state.formData[name] = field.value;
            }
        });
        
        // Trigger auto-save
        scheduleAutoSave();
    }

    /**
     * Initialize form submission
     */
    function initFormSubmission() {
        if (!elements.form) return;
        
        // Prevent default form submission
        elements.form.addEventListener('submit', handleSubmit);
        
        // Submit button click (if separate)
        if (elements.submitBtn) {
            elements.submitBtn.addEventListener('click', handleSubmit);
        }
    }

    /**
     * Handle form submission
     */
    async function handleSubmit(e) {
        e?.preventDefault();
        
        if (state.isSubmitting) return;
        
        // Final validation
        if (!await validateAllSteps()) {
            showFormError('Please complete all required fields');
            return;
        }
        
        state.isSubmitting = true;
        showLoadingState(true);
        clearErrors();
        
        // Prepare form data
        const submitData = prepareSubmitData();
        
        try {
            // Submit to API
            const response = await submitForm(submitData);
            
            if (response.success) {
                handleSubmitSuccess(response);
            } else {
                handleSubmitError(response.error || 'Submission failed');
            }
        } catch (error) {
            handleSubmitError(error.message || 'Network error occurred');
        } finally {
            state.isSubmitting = false;
            showLoadingState(false);
        }
    }

    /**
     * Validate all steps
     */
    async function validateAllSteps() {
        if (typeof window.FormValidator === 'undefined') return true;
        
        let allValid = true;
        
        for (let i = 0; i < elements.steps.length; i++) {
            const step = elements.steps[i];
            const fields = step.querySelectorAll('input, textarea, select');
            
            fields.forEach(field => {
                if (window.FormValidator.validateField) {
                    const valid = window.FormValidator.validateField(field);
                    if (!valid) allValid = false;
                }
            });
        }
        
        return allValid;
    }

    /**
     * Prepare data for submission
     */
    function prepareSubmitData() {
        const formData = new FormData();
        
        // Add all form data
        Object.keys(state.formData).forEach(key => {
            const value = state.formData[key];
            
            if (Array.isArray(value)) {
                value.forEach(v => formData.append(key, v));
            } else if (value instanceof File) {
                formData.append(key, value);
            } else {
                formData.append(key, value);
            }
        });
        
        // Add metadata
        formData.append('submittedAt', new Date().toISOString());
        formData.append('formVersion', '1.0');
        
        return formData;
    }

    /**
     * Submit form to API
     */
    async function submitForm(formData) {
        // Mock API call - replace with actual endpoint
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.submitTimeout);
        
        try {
            const response = await fetch(CONFIG.apiEndpoint, {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            
            // For demo purposes, simulate success after delay
            if (error.name === 'TypeError' || error.message.includes('fetch')) {
                return await simulateSubmission();
            }
            
            throw error;
        }
    }

    /**
     * Simulate form submission for demo
     */
    function simulateSubmission() {
        return new Promise((resolve) => {
            setTimeout(() => {
                const success = Math.random() > 0.1; // 90% success rate
                
                if (success) {
                    resolve({
                        success: true,
                        referenceNumber: generateReferenceNumber(),
                        message: 'Nomination submitted successfully'
                    });
                } else {
                    resolve({
                        success: false,
                        error: 'Simulated error for testing'
                    });
                }
            }, 2000);
        });
    }

    /**
     * Handle successful submission
     */
    function handleSubmitSuccess(response) {
        // Clear saved data
        clearAutoSave();
        clearFormData();
        
        // Show success message
        showFormSuccess(response.message || 'Form submitted successfully');
        
        // Store reference number
        if (response.referenceNumber) {
            sessionStorage.setItem('rare_submission_ref', response.referenceNumber);
        }
        
        // Trigger confetti if available
        if (typeof window.triggerConfetti === 'function') {
            window.triggerConfetti();
        }
        
        // Redirect after delay
        setTimeout(() => {
            window.location.href = CONFIG.successRedirect;
        }, 2000);
    }

    /**
     * Handle submission error
     */
    function handleSubmitError(error) {
        showFormError(error);
        
        // Enable retry
        if (elements.submitBtn) {
            elements.submitBtn.textContent = 'Retry Submission';
        }
        
        // Log error for debugging
        console.error('Form submission error:', error);
    }

    /**
     * Initialize auto-save functionality
     */
    function initAutoSave() {
        if (typeof window.Storage === 'undefined') {
            console.warn('Storage not available, auto-save disabled');
            return;
        }
        
        // Load saved data on init
        loadAutoSave();
        
        // Save on input change
        if (elements.form) {
            elements.form.addEventListener('input', debounce(handleAutoSave, CONFIG.autoSaveDelay));
            elements.form.addEventListener('change', handleAutoSave);
        }
    }

    /**
     * Handle auto-save
     */
    function handleAutoSave() {
        saveStepData();
        scheduleAutoSave();
    }

    /**
     * Schedule auto-save
     */
    function scheduleAutoSave() {
        clearTimeout(state.autoSaveTimer);
        
        state.autoSaveTimer = setTimeout(() => {
            performAutoSave();
        }, CONFIG.autoSaveDelay);
    }

    /**
     * Perform auto-save
     */
    function performAutoSave() {
        if (typeof window.Storage === 'undefined') return;
        
        const saveData = {
            formData: state.formData,
            currentStep: state.currentStep,
            timestamp: new Date().toISOString(),
            draftId: state.currentDraftId || generateDraftId()
        };
        
        try {
            window.Storage.set(`${CONFIG.autoSaveKey}_current`, saveData);
            showAutoSaveIndicator();
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }

    /**
     * Load auto-saved data
     */
    function loadAutoSave() {
        if (typeof window.Storage === 'undefined') return;
        
        try {
            const savedData = window.Storage.get(`${CONFIG.autoSaveKey}_current`);
            
            if (savedData && savedData.formData) {
                state.formData = savedData.formData;
                state.currentDraftId = savedData.draftId;
                
                // Restore form fields
                restoreFormData();
                
                // Go to saved step
                if (savedData.currentStep) {
                    showStep(savedData.currentStep);
                }
                
                // Show notification
                showAutoSaveRestored(savedData.timestamp);
            }
        } catch (error) {
            console.error('Failed to load auto-save:', error);
        }
    }

    /**
     * Clear auto-save
     */
    function clearAutoSave() {
        if (typeof window.Storage === 'undefined') return;
        
        try {
            window.Storage.remove(`${CONFIG.autoSaveKey}_current`);
            state.currentDraftId = null;
        } catch (error) {
            console.error('Failed to clear auto-save:', error);
        }
    }

    /**
     * Restore form data to fields
     */
    function restoreFormData() {
        Object.keys(state.formData).forEach(name => {
            const value = state.formData[name];
            const fields = document.querySelectorAll(`[name="${name}"], #${name}`);
            
            fields.forEach(field => {
                if (field.type === 'checkbox') {
                    field.checked = Array.isArray(value) ? 
                        value.includes(field.value) : value === field.value;
                } else if (field.type === 'radio') {
                    field.checked = value === field.value;
                } else if (field.type !== 'file') {
                    field.value = value;
                }
            });
        });
    }

    /**
     * Initialize draft management
     */
    function initDraftManagement() {
        if (typeof window.Storage === 'undefined') return;
        
        // Save draft button
        if (elements.saveDraftBtn) {
            elements.saveDraftBtn.addEventListener('click', saveDraft);
        }
        
        // Load draft button
        if (elements.loadDraftBtn) {
            elements.loadDraftBtn.addEventListener('click', showDraftsList);
        }
        
        // Load drafts list
        loadDraftsList();
    }

    /**
     * Save current form as draft
     */
    function saveDraft(e) {
        e?.preventDefault();
        
        if (typeof window.Storage === 'undefined') return;
        
        const draftName = prompt('Enter a name for this draft:') || `Draft ${new Date().toLocaleDateString()}`;
        
        const draft = {
            id: generateDraftId(),
            name: draftName,
            formData: state.formData,
            currentStep: state.currentStep,
            createdAt: new Date().toISOString()
        };
        
        try {
            // Get existing drafts
            const drafts = window.Storage.get(CONFIG.draftsKey) || [];
            
            // Add new draft (limit to max drafts)
            drafts.unshift(draft);
            if (drafts.length > CONFIG.maxDrafts) {
                drafts.pop();
            }
            
            // Save drafts
            window.Storage.set(CONFIG.draftsKey, drafts);
            
            // Show success
            showFormSuccess(`Draft "${draftName}" saved successfully`);
            
            // Refresh drafts list
            loadDraftsList();
        } catch (error) {
            console.error('Failed to save draft:', error);
            showFormError('Failed to save draft');
        }
    }

    /**
     * Load drafts list
     */
    function loadDraftsList() {
        if (!elements.draftsList || typeof window.Storage === 'undefined') return;
        
        try {
            const drafts = window.Storage.get(CONFIG.draftsKey) || [];
            
            if (drafts.length === 0) {
                elements.draftsList.innerHTML = '<p>No saved drafts</p>';
                return;
            }
            
            const html = drafts.map(draft => `
                <div class="draft-item">
                    <span class="draft-name">${draft.name}</span>
                    <span class="draft-date">${new Date(draft.createdAt).toLocaleDateString()}</span>
                    <button class="btn-load-draft" data-draft-id="${draft.id}">Load</button>
                    <button class="btn-delete-draft" data-draft-id="${draft.id}">Delete</button>
                </div>
            `).join('');
            
            elements.draftsList.innerHTML = html;
            
            // Bind events
            elements.draftsList.querySelectorAll('.btn-load-draft').forEach(btn => {
                btn.addEventListener('click', () => loadDraft(btn.dataset.draftId));
            });
            
            elements.draftsList.querySelectorAll('.btn-delete-draft').forEach(btn => {
                btn.addEventListener('click', () => deleteDraft(btn.dataset.draftId));
            });
        } catch (error) {
            console.error('Failed to load drafts:', error);
        }
    }

    /**
     * Load specific draft
     */
    function loadDraft(draftId) {
        if (typeof window.Storage === 'undefined') return;
        
        try {
            const drafts = window.Storage.get(CONFIG.draftsKey) || [];
            const draft = drafts.find(d => d.id === draftId);
            
            if (draft) {
                state.formData = draft.formData;
                state.currentDraftId = draft.id;
                
                restoreFormData();
                showStep(draft.currentStep || 1);
                
                showFormSuccess(`Draft "${draft.name}" loaded`);
            }
        } catch (error) {
            console.error('Failed to load draft:', error);
            showFormError('Failed to load draft');
        }
    }

    /**
     * Delete draft
     */
    function deleteDraft(draftId) {
        if (typeof window.Storage === 'undefined') return;
        
        if (!confirm('Are you sure you want to delete this draft?')) return;
        
        try {
            const drafts = window.Storage.get(CONFIG.draftsKey) || [];
            const filtered = drafts.filter(d => d.id !== draftId);
            
            window.Storage.set(CONFIG.draftsKey, filtered);
            loadDraftsList();
            
            showFormSuccess('Draft deleted');
        } catch (error) {
            console.error('Failed to delete draft:', error);
            showFormError('Failed to delete draft');
        }
    }

    /**
     * Show drafts list modal
     */
    function showDraftsList() {
        loadDraftsList();
        
        if (elements.draftsList) {
            elements.draftsList.parentElement.classList.add('show');
        }
    }

    /**
     * Handle keyboard navigation
     */
    function handleKeyboardNavigation(e) {
        if (!elements.form) return;
        
        // Alt + Arrow keys for step navigation
        if (e.altKey) {
            if (e.key === 'ArrowRight' && state.currentStep < state.totalSteps) {
                handleNext();
            } else if (e.key === 'ArrowLeft' && state.currentStep > 1) {
                handlePrev();
            }
        }
    }

    /**
     * Show loading state
     */
    function showLoadingState(show) {
        if (elements.loadingIndicator) {
            elements.loadingIndicator.style.display = show ? 'block' : 'none';
            elements.loadingIndicator.setAttribute('aria-hidden', !show);
        }
        
        if (elements.submitBtn) {
            elements.submitBtn.disabled = show;
            elements.submitBtn.textContent = show ? 'Submitting...' : 'Submit';
        }
        
        if (elements.form) {
            elements.form.classList.toggle('submitting', show);
        }
    }

    /**
     * Show auto-save indicator
     */
    function showAutoSaveIndicator() {
        if (!elements.autoSaveIndicator) {
            elements.autoSaveIndicator = document.createElement('div');
            elements.autoSaveIndicator.className = 'auto-save-indicator';
            document.body.appendChild(elements.autoSaveIndicator);
        }
        
        elements.autoSaveIndicator.textContent = 'Draft saved';
        elements.autoSaveIndicator.classList.add('show');
        
        setTimeout(() => {
            elements.autoSaveIndicator.classList.remove('show');
        }, 2000);
    }

    /**
     * Show auto-save restored notification
     */
    function showAutoSaveRestored(timestamp) {
        const time = new Date(timestamp).toLocaleString();
        const message = `Form data restored from ${time}`;
        
        showFormInfo(message);
    }

    /**
     * Show form error
     */
    function showFormError(message) {
        if (elements.errorContainer) {
            elements.errorContainer.textContent = message;
            elements.errorContainer.style.display = 'block';
            elements.errorContainer.setAttribute('role', 'alert');
        }
        
        announceToScreenReader(message);
    }

    /**
     * Show step error
     */
    function showStepError(message) {
        const currentStepElement = elements.steps[state.currentStep - 1];
        if (!currentStepElement) return;
        
        let errorDiv = currentStepElement.querySelector('.step-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'step-error';
            errorDiv.setAttribute('role', 'alert');
            currentStepElement.insertBefore(errorDiv, currentStepElement.firstChild);
        }
        
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        // Auto-hide after delay
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    /**
     * Show form success
     */
    function showFormSuccess(message) {
        if (elements.successContainer) {
            elements.successContainer.textContent = message;
            elements.successContainer.style.display = 'block';
            elements.successContainer.setAttribute('role', 'status');
        }
        
        announceToScreenReader(message);
        
        // Auto-hide after delay
        setTimeout(() => {
            if (elements.successContainer) {
                elements.successContainer.style.display = 'none';
            }
        }, 5000);
    }

    /**
     * Show form info
     */
    function showFormInfo(message) {
        const infoDiv = document.createElement('div');
        infoDiv.className = 'form-info';
        infoDiv.textContent = message;
        infoDiv.setAttribute('role', 'status');
        
        if (elements.form) {
            elements.form.insertBefore(infoDiv, elements.form.firstChild);
        }
        
        setTimeout(() => {
            infoDiv.remove();
        }, 5000);
    }

    /**
     * Clear errors
     */
    function clearErrors() {
        if (elements.errorContainer) {
            elements.errorContainer.style.display = 'none';
            elements.errorContainer.textContent = '';
        }
        
        document.querySelectorAll('.step-error').forEach(error => {
            error.style.display = 'none';
        });
    }

    /**
     * Clear form data
     */
    function clearFormData() {
        state.formData = {};
        state.currentStep = 1;
        state.currentDraftId = null;
    }

    /**
     * Announce step to screen readers
     */
    function announceStep() {
        const message = `Step ${state.currentStep} of ${state.totalSteps}`;
        announceToScreenReader(message);
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
     * Generate reference number
     */
    function generateReferenceNumber() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        
        return `RARE-${year}${month}-${random}`;
    }

    /**
     * Generate draft ID
     */
    function generateDraftId() {
        return `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
     * FormHandler public API
     */
    const FormHandler = {
        getCurrentStep: () => state.currentStep,
        getTotalSteps: () => state.totalSteps,
        getFormData: () => state.formData,
        goToStep: goToStep,
        nextStep: handleNext,
        previousStep: handlePrev,
        submit: handleSubmit,
        saveDraft: saveDraft,
        loadDraft: loadDraft,
        clearForm: clearFormData,
        validateStep: validateCurrentStep,
        validateAll: validateAllSteps
    };

    /**
     * Main initialization function
     */
    function initFormHandler() {
        // Cache elements
        cacheElements();
        
        // Initialize components
        initMultiStepForm();
        initFormSubmission();
        initAutoSave();
        initDraftManagement();
        
        // Expose API globally
        window.FormHandler = FormHandler;
        
        console.log('✓ FormHandler module initialized');
    }

    // Auto-initialize if DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFormHandler);
    } else {
        initFormHandler();
    }

    // Expose initialization function globally
    window.initFormHandler = initFormHandler;
    window.FormHandler = FormHandler;

})();