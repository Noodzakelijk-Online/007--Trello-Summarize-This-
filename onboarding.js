/**
 * Onboarding Interface JavaScript
 * 
 * Handles the multi-step onboarding process for the Summarize This application,
 * including form validation, service configuration, and user preferences.
 */

class OnboardingManager {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 5;
    this.userData = {
      personal: {},
      services: {},
      preferences: {}
    };
    this.validationRules = {};
    
    this.init();
  }

  /**
   * Initialize the onboarding manager
   */
  init() {
    this.setupValidationRules();
    this.setupEventListeners();
    this.updateProgressBar();
    this.loadSavedData();
  }

  /**
   * Setup form validation rules
   */
  setupValidationRules() {
    this.validationRules = {
      firstName: {
        required: true,
        minLength: 2,
        pattern: /^[a-zA-Z\s]+$/,
        message: 'First name must be at least 2 characters and contain only letters'
      },
      lastName: {
        required: true,
        minLength: 2,
        pattern: /^[a-zA-Z\s]+$/,
        message: 'Last name must be at least 2 characters and contain only letters'
      },
      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'Please enter a valid email address'
      },
      useCase: {
        required: true,
        message: 'Please select your primary use case'
      },
      volume: {
        required: true,
        message: 'Please select your expected monthly volume'
      }
    };
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Form input validation
    document.querySelectorAll('input, select').forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('input', () => this.clearFieldError(input));
    });

    // Service toggle handlers
    document.querySelectorAll('.service-toggle input').forEach(toggle => {
      toggle.addEventListener('change', (e) => this.handleServiceToggle(e));
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e));

    // Auto-save functionality
    document.querySelectorAll('input, select').forEach(input => {
      input.addEventListener('change', () => this.autoSave());
    });

    // Service configuration visibility
    document.querySelectorAll('.service-toggle input').forEach(toggle => {
      toggle.addEventListener('change', (e) => this.toggleServiceConfig(e));
    });

    // Quality slider update
    const qualitySlider = document.getElementById('quality-preference');
    if (qualitySlider) {
      qualitySlider.addEventListener('input', (e) => this.updateQualityDisplay(e));
    }

    // Budget input formatting
    const budgetInput = document.getElementById('monthly-budget');
    if (budgetInput) {
      budgetInput.addEventListener('input', (e) => this.formatBudgetInput(e));
    }
  }

  /**
   * Navigate to next step
   */
  nextStep() {
    if (this.validateCurrentStep()) {
      this.saveCurrentStepData();
      
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
        this.showStep(this.currentStep);
        this.updateProgressBar();
        this.trackStepCompletion();
      }
    }
  }

  /**
   * Navigate to previous step
   */
  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.showStep(this.currentStep);
      this.updateProgressBar();
    }
  }

  /**
   * Show specific step
   */
  showStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.onboarding-step').forEach(step => {
      step.classList.remove('active');
    });

    // Show current step
    const currentStepElement = document.getElementById(`step-${stepNumber}`);
    if (currentStepElement) {
      currentStepElement.classList.add('active');
      
      // Focus first input in step
      const firstInput = currentStepElement.querySelector('input, select');
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 300);
      }
    }

    // Update step indicators
    document.querySelectorAll('.step').forEach((step, index) => {
      step.classList.remove('active', 'completed');
      
      if (index + 1 === stepNumber) {
        step.classList.add('active');
      } else if (index + 1 < stepNumber) {
        step.classList.add('completed');
      }
    });

    // Load step-specific data
    this.loadStepData(stepNumber);
  }

  /**
   * Update progress bar
   */
  updateProgressBar() {
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
      const progressPercentage = ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
      progressFill.style.width = `${progressPercentage}%`;
    }
  }

  /**
   * Validate current step
   */
  validateCurrentStep() {
    let isValid = true;
    const currentStepElement = document.getElementById(`step-${this.currentStep}`);
    
    if (!currentStepElement) return true;

    // Get all required fields in current step
    const requiredFields = currentStepElement.querySelectorAll('input[required], select[required]');
    
    requiredFields.forEach(field => {
      if (!this.validateField(field)) {
        isValid = false;
      }
    });

    // Step-specific validation
    switch (this.currentStep) {
      case 2:
        isValid = this.validatePersonalInfo() && isValid;
        break;
      case 3:
        isValid = this.validateServiceConfig() && isValid;
        break;
      case 4:
        isValid = this.validatePreferences() && isValid;
        break;
    }

    if (!isValid) {
      this.showValidationError('Please correct the errors above before continuing.');
    }

    return isValid;
  }

  /**
   * Validate individual field
   */
  validateField(field) {
    const fieldName = field.id;
    const value = field.value.trim();
    const rules = this.validationRules[fieldName];

    if (!rules) return true;

    let isValid = true;
    let errorMessage = '';

    // Required validation
    if (rules.required && !value) {
      isValid = false;
      errorMessage = `${this.getFieldLabel(field)} is required`;
    }

    // Pattern validation
    if (isValid && rules.pattern && value && !rules.pattern.test(value)) {
      isValid = false;
      errorMessage = rules.message;
    }

    // Length validation
    if (isValid && rules.minLength && value.length < rules.minLength) {
      isValid = false;
      errorMessage = rules.message;
    }

    // Custom validation
    if (isValid && fieldName === 'email') {
      isValid = this.validateEmail(value);
      if (!isValid) {
        errorMessage = 'Please enter a valid email address';
      }
    }

    // Show/hide error
    if (isValid) {
      this.clearFieldError(field);
    } else {
      this.showFieldError(field, errorMessage);
    }

    return isValid;
  }

  /**
   * Validate personal information
   */
  validatePersonalInfo() {
    const firstName = document.getElementById('firstName')?.value.trim();
    const lastName = document.getElementById('lastName')?.value.trim();
    const email = document.getElementById('email')?.value.trim();
    const useCase = document.getElementById('useCase')?.value;
    const volume = document.getElementById('volume')?.value;

    return firstName && lastName && email && useCase && volume;
  }

  /**
   * Validate service configuration
   */
  validateServiceConfig() {
    const enabledServices = document.querySelectorAll('.service-toggle input:checked');
    
    if (enabledServices.length === 0) {
      this.showValidationError('Please enable at least one transcription service.');
      return false;
    }

    // Validate API keys for enabled services
    let hasValidConfig = false;
    enabledServices.forEach(toggle => {
      const serviceCard = toggle.closest('.service-card');
      const apiKeyInput = serviceCard.querySelector('input[type="password"]');
      
      if (apiKeyInput && apiKeyInput.value.trim()) {
        hasValidConfig = true;
      }
    });

    if (!hasValidConfig) {
      this.showValidationError('Please provide API keys for at least one enabled service.');
      return false;
    }

    return true;
  }

  /**
   * Validate preferences
   */
  validatePreferences() {
    // All preferences are optional, so always valid
    return true;
  }

  /**
   * Validate email format
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Show field error
   */
  showFieldError(field, message) {
    this.clearFieldError(field);
    
    field.classList.add('error');
    
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.textContent = message;
    
    field.parentNode.appendChild(errorElement);
  }

  /**
   * Clear field error
   */
  clearFieldError(field) {
    field.classList.remove('error');
    
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
      existingError.remove();
    }
  }

  /**
   * Show validation error message
   */
  showValidationError(message) {
    // Remove existing error
    const existingError = document.querySelector('.validation-error');
    if (existingError) {
      existingError.remove();
    }

    // Create error element
    const errorElement = document.createElement('div');
    errorElement.className = 'validation-error';
    errorElement.innerHTML = `
      <div class="error-content">
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        <span>${message}</span>
      </div>
    `;

    // Insert before step actions
    const stepActions = document.querySelector('.step-actions');
    if (stepActions) {
      stepActions.parentNode.insertBefore(errorElement, stepActions);
    }

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (errorElement.parentNode) {
        errorElement.remove();
      }
    }, 5000);
  }

  /**
   * Get field label
   */
  getFieldLabel(field) {
    const label = field.parentNode.querySelector('label');
    return label ? label.textContent : field.id;
  }

  /**
   * Handle service toggle
   */
  handleServiceToggle(event) {
    const toggle = event.target;
    const serviceCard = toggle.closest('.service-card');
    const serviceName = serviceCard.querySelector('.service-info h3').textContent;
    
    if (toggle.checked) {
      this.enableService(serviceName, serviceCard);
    } else {
      this.disableService(serviceName, serviceCard);
    }
    
    this.updateServiceRecommendations();
  }

  /**
   * Enable service
   */
  enableService(serviceName, serviceCard) {
    serviceCard.classList.add('enabled');
    
    // Show configuration section
    const configSection = serviceCard.querySelector('.service-config');
    if (configSection) {
      configSection.style.display = 'block';
    }
    
    // Focus on API key input
    const apiKeyInput = serviceCard.querySelector('input[type="password"]');
    if (apiKeyInput) {
      setTimeout(() => apiKeyInput.focus(), 300);
    }
  }

  /**
   * Disable service
   */
  disableService(serviceName, serviceCard) {
    serviceCard.classList.remove('enabled');
    
    // Hide configuration section
    const configSection = serviceCard.querySelector('.service-config');
    if (configSection) {
      configSection.style.display = 'none';
    }
  }

  /**
   * Toggle service configuration visibility
   */
  toggleServiceConfig(event) {
    const toggle = event.target;
    const serviceCard = toggle.closest('.service-card');
    const configSection = serviceCard.querySelector('.service-config');
    
    if (configSection) {
      configSection.style.display = toggle.checked ? 'block' : 'none';
    }
  }

  /**
   * Update service recommendations
   */
  updateServiceRecommendations() {
    const enabledServices = document.querySelectorAll('.service-toggle input:checked');
    const recommendationText = document.querySelector('.recommendation-text');
    
    if (recommendationText) {
      const count = enabledServices.length;
      let message = '';
      
      if (count === 0) {
        message = 'Enable at least one service to get started';
      } else if (count === 1) {
        message = 'Consider enabling multiple services for better reliability';
      } else if (count <= 3) {
        message = 'Good balance of services for optimal performance';
      } else {
        message = 'Many services enabled - great for maximum reliability';
      }
      
      recommendationText.textContent = message;
    }
  }

  /**
   * Update quality display
   */
  updateQualityDisplay(event) {
    const slider = event.target;
    const value = parseInt(slider.value);
    
    // Update visual feedback
    const percentage = value;
    slider.style.background = `linear-gradient(to right, var(--primary-color) 0%, var(--primary-color) ${percentage}%, var(--border-color) ${percentage}%, var(--border-color) 100%)`;
    
    // Update description
    let description = '';
    if (value < 30) {
      description = 'Prioritize speed over quality';
    } else if (value < 70) {
      description = 'Balanced speed and quality';
    } else {
      description = 'Prioritize quality over speed';
    }
    
    const descriptionElement = slider.parentNode.querySelector('small');
    if (descriptionElement) {
      descriptionElement.textContent = description;
    }
  }

  /**
   * Format budget input
   */
  formatBudgetInput(event) {
    const input = event.target;
    let value = input.value.replace(/[^\d]/g, '');
    
    if (value) {
      value = parseInt(value);
      if (value > 10000) value = 10000; // Max budget limit
      input.value = value;
    }
  }

  /**
   * Handle keyboard navigation
   */
  handleKeyboardNavigation(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      const activeElement = document.activeElement;
      
      // If in a form field, move to next field or next step
      if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'SELECT') {
        event.preventDefault();
        
        const currentStepElement = document.getElementById(`step-${this.currentStep}`);
        const formElements = currentStepElement.querySelectorAll('input, select, button');
        const currentIndex = Array.from(formElements).indexOf(activeElement);
        
        if (currentIndex < formElements.length - 1) {
          formElements[currentIndex + 1].focus();
        } else {
          this.nextStep();
        }
      }
    }
    
    // Escape key to go back
    if (event.key === 'Escape') {
      this.previousStep();
    }
  }

  /**
   * Save current step data
   */
  saveCurrentStepData() {
    const currentStepElement = document.getElementById(`step-${this.currentStep}`);
    if (!currentStepElement) return;

    const formData = new FormData();
    const inputs = currentStepElement.querySelectorAll('input, select');
    
    inputs.forEach(input => {
      if (input.type === 'checkbox') {
        formData.append(input.id, input.checked);
      } else {
        formData.append(input.id, input.value);
      }
    });

    // Store in userData object
    switch (this.currentStep) {
      case 2:
        this.userData.personal = Object.fromEntries(formData);
        break;
      case 3:
        this.userData.services = this.collectServiceData();
        break;
      case 4:
        this.userData.preferences = Object.fromEntries(formData);
        break;
    }

    // Auto-save to localStorage
    this.autoSave();
  }

  /**
   * Collect service configuration data
   */
  collectServiceData() {
    const services = {};
    
    document.querySelectorAll('.service-card').forEach(card => {
      const serviceName = card.querySelector('.service-info h3').textContent;
      const toggle = card.querySelector('.service-toggle input');
      const apiKeyInput = card.querySelector('input[type="password"]');
      const regionSelect = card.querySelector('select');
      
      services[serviceName] = {
        enabled: toggle.checked,
        apiKey: apiKeyInput ? apiKeyInput.value : '',
        region: regionSelect ? regionSelect.value : ''
      };
    });
    
    return services;
  }

  /**
   * Load step-specific data
   */
  loadStepData(stepNumber) {
    switch (stepNumber) {
      case 3:
        this.updateServiceRecommendations();
        break;
      case 5:
        this.updateCompletionSummary();
        break;
    }
  }

  /**
   * Update completion summary
   */
  updateCompletionSummary() {
    // Update email
    const emailSummary = document.getElementById('user-email-summary');
    if (emailSummary && this.userData.personal.email) {
      emailSummary.textContent = this.userData.personal.email;
    }

    // Update services count
    const servicesCountSummary = document.getElementById('services-count-summary');
    if (servicesCountSummary && this.userData.services) {
      const enabledCount = Object.values(this.userData.services).filter(s => s.enabled).length;
      servicesCountSummary.textContent = `${enabledCount} service${enabledCount !== 1 ? 's' : ''} enabled`;
    }
  }

  /**
   * Auto-save functionality
   */
  autoSave() {
    try {
      localStorage.setItem('onboarding-data', JSON.stringify(this.userData));
      localStorage.setItem('onboarding-step', this.currentStep.toString());
    } catch (error) {
      console.warn('Failed to auto-save onboarding data:', error);
    }
  }

  /**
   * Load saved data
   */
  loadSavedData() {
    try {
      const savedData = localStorage.getItem('onboarding-data');
      const savedStep = localStorage.getItem('onboarding-step');
      
      if (savedData) {
        this.userData = JSON.parse(savedData);
        this.populateFormFields();
      }
      
      if (savedStep) {
        const step = parseInt(savedStep);
        if (step > 1 && step <= this.totalSteps) {
          this.currentStep = step;
          this.showStep(this.currentStep);
          this.updateProgressBar();
        }
      }
    } catch (error) {
      console.warn('Failed to load saved onboarding data:', error);
    }
  }

  /**
   * Populate form fields with saved data
   */
  populateFormFields() {
    // Personal information
    if (this.userData.personal) {
      Object.entries(this.userData.personal).forEach(([key, value]) => {
        const field = document.getElementById(key);
        if (field) {
          if (field.type === 'checkbox') {
            field.checked = value === 'true';
          } else {
            field.value = value;
          }
        }
      });
    }

    // Services
    if (this.userData.services) {
      Object.entries(this.userData.services).forEach(([serviceName, config]) => {
        const serviceCard = Array.from(document.querySelectorAll('.service-card')).find(card => 
          card.querySelector('.service-info h3').textContent === serviceName
        );
        
        if (serviceCard) {
          const toggle = serviceCard.querySelector('.service-toggle input');
          const apiKeyInput = serviceCard.querySelector('input[type="password"]');
          const regionSelect = serviceCard.querySelector('select');
          
          if (toggle) toggle.checked = config.enabled;
          if (apiKeyInput) apiKeyInput.value = config.apiKey;
          if (regionSelect) regionSelect.value = config.region;
        }
      });
    }

    // Preferences
    if (this.userData.preferences) {
      Object.entries(this.userData.preferences).forEach(([key, value]) => {
        const field = document.getElementById(key);
        if (field) {
          if (field.type === 'checkbox') {
            field.checked = value === 'true';
          } else {
            field.value = value;
          }
        }
      });
    }
  }

  /**
   * Track step completion for analytics
   */
  trackStepCompletion() {
    // In a real application, this would send analytics data
    console.log(`Onboarding step ${this.currentStep - 1} completed`);
  }

  /**
   * Complete onboarding process
   */
  completeOnboarding() {
    this.saveCurrentStepData();
    
    // Send data to server
    this.submitOnboardingData()
      .then(() => {
        // Clear saved data
        localStorage.removeItem('onboarding-data');
        localStorage.removeItem('onboarding-step');
        
        // Redirect to main application
        this.redirectToApp();
      })
      .catch(error => {
        console.error('Failed to complete onboarding:', error);
        this.showValidationError('Failed to save your settings. Please try again.');
      });
  }

  /**
   * Submit onboarding data to server
   */
  async submitOnboardingData() {
    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.userData)
      });

      if (!response.ok) {
        throw new Error('Failed to submit onboarding data');
      }

      return await response.json();
    } catch (error) {
      console.error('Error submitting onboarding data:', error);
      throw error;
    }
  }

  /**
   * Redirect to main application
   */
  redirectToApp() {
    // Show success message
    this.showSuccessMessage('Welcome to Summarize This! Redirecting to the application...');
    
    // Redirect after delay
    setTimeout(() => {
      if (window.electronAPI) {
        // Electron app
        window.electronAPI.completeOnboarding();
      } else {
        // Web app
        window.location.href = '/app';
      }
    }, 2000);
  }

  /**
   * Show success message
   */
  showSuccessMessage(message) {
    const successElement = document.createElement('div');
    successElement.className = 'success-message';
    successElement.innerHTML = `
      <div class="success-content">
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
        </svg>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(successElement);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (successElement.parentNode) {
        successElement.remove();
      }
    }, 3000);
  }

  /**
   * Start application tour
   */
  startTour() {
    // In a real application, this would start an interactive tour
    console.log('Starting application tour...');
    this.completeOnboarding();
  }

  /**
   * Upload file action
   */
  uploadFile() {
    // In a real application, this would open file upload dialog
    console.log('Opening file upload...');
    this.completeOnboarding();
  }

  /**
   * View dashboard action
   */
  viewDashboard() {
    // In a real application, this would navigate to dashboard
    console.log('Opening dashboard...');
    this.completeOnboarding();
  }
}

// Global functions for button clicks
function nextStep() {
  window.onboardingManager.nextStep();
}

function previousStep() {
  window.onboardingManager.previousStep();
}

function completeOnboarding() {
  window.onboardingManager.completeOnboarding();
}

function startTour() {
  window.onboardingManager.startTour();
}

function uploadFile() {
  window.onboardingManager.uploadFile();
}

function viewDashboard() {
  window.onboardingManager.viewDashboard();
}

// Initialize onboarding when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.onboardingManager = new OnboardingManager();
});

// Add error and success message styles
const messageStyles = document.createElement('style');
messageStyles.textContent = `
  .field-error {
    color: var(--error-color);
    font-size: 0.75rem;
    margin-top: var(--spacing-xs);
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }
  
  .field-error::before {
    content: '⚠';
    font-size: 0.875rem;
  }
  
  .validation-error {
    background: rgba(245, 101, 101, 0.1);
    border: 1px solid var(--error-color);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
    animation: slideInDown 0.3s ease-out;
  }
  
  .error-content {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    color: var(--error-color);
    font-size: 0.875rem;
  }
  
  .success-message {
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(72, 187, 120, 0.1);
    border: 1px solid var(--success-color);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    z-index: 1000;
    animation: slideInRight 0.3s ease-out;
  }
  
  .success-content {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    color: var(--success-color);
    font-size: 0.875rem;
  }
  
  input.error,
  select.error {
    border-color: var(--error-color) !important;
    box-shadow: 0 0 0 3px rgba(245, 101, 101, 0.1) !important;
  }
  
  @keyframes slideInDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

document.head.appendChild(messageStyles);

