/**
 * Main application script for Summarize This
 * 
 * Handles UI interactions, API calls, and resource monitoring
 */

// Global state
const state = {
  user: null,
  isLoggedIn: false,
  currentPage: 'welcome',
  resourceMonitorVisible: false,
  resourceUsage: {
    cpu: 0,
    memory: 0,
    storage: 0,
    apiCalls: {
      summarization: {
        ruleBased: 0,
        mlBased: 0,
        aiService: 0
      },
      transcription: {
        minutes: 0
      }
    },
    startTime: Date.now()
  }
};

// API configuration
const API_CONFIG = {
  baseUrl: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json'
  }
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  // Initialize UI
  initializeUI();
  
  // Check if user is logged in
  checkAuthStatus();
  
  // Initialize resource monitor
  initializeResourceMonitor();
  
  // Start resource usage simulation
  startResourceMonitoring();
});

/**
 * Initialize UI event listeners
 */
function initializeUI() {
  // Navigation
  document.querySelectorAll('.sidebar a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = e.target.getAttribute('data-page');
      navigateTo(page);
    });
  });
  
  // Get Started button
  document.getElementById('get-started-button').addEventListener('click', () => {
    if (state.isLoggedIn) {
      navigateTo('summarize');
    } else {
      showModal('login-modal');
    }
  });
  
  // Learn More button
  document.getElementById('learn-more-button').addEventListener('click', () => {
    window.open('https://trello.com/power-ups/summarize-this', '_blank');
  });
  
  // Login button
  document.getElementById('login-button').addEventListener('click', () => {
    showModal('login-modal');
  });
  
  // Settings button
  document.getElementById('settings-button').addEventListener('click', () => {
    showModal('settings-modal');
  });
  
  // Login form
  document.getElementById('login-submit').addEventListener('click', handleLogin);
  
  // Register link
  document.getElementById('register-link').addEventListener('click', (e) => {
    e.preventDefault();
    hideModal('login-modal');
    showModal('register-modal');
  });
  
  // Register form
  document.getElementById('register-submit').addEventListener('click', handleRegister);
  
  // Login link
  document.getElementById('login-link').addEventListener('click', (e) => {
    e.preventDefault();
    hideModal('register-modal');
    showModal('login-modal');
  });
  
  // Settings form
  document.getElementById('settings-save').addEventListener('click', handleSaveSettings);
  
  // Logout button
  document.getElementById('logout-button').addEventListener('click', handleLogout);
  
  // Modal close buttons
  document.querySelectorAll('.modal-close').forEach(button => {
    button.addEventListener('click', () => {
      const modal = button.closest('.modal-container');
      hideModal(modal.id);
    });
  });
  
  // Modal backdrops
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', () => {
      const modal = backdrop.closest('.modal-container');
      hideModal(modal.id);
    });
  });
  
  // Summarize button
  document.getElementById('summarize-button').addEventListener('click', handleSummarize);
  
  // Transcribe button
  document.getElementById('transcribe-button').addEventListener('click', handleTranscribe);
  
  // Copy transcription button
  document.getElementById('copy-transcription').addEventListener('click', () => {
    const text = document.getElementById('transcription-text').textContent;
    navigator.clipboard.writeText(text)
      .then(() => showToast('Transcription copied to clipboard'))
      .catch(err => showToast('Failed to copy: ' + err, true));
  });
  
  // Buy credits buttons
  document.querySelectorAll('.buy-credits').forEach(button => {
    button.addEventListener('click', () => {
      const packageName = button.getAttribute('data-package');
      handleBuyCredits(packageName);
    });
  });
  
  // Payment form
  document.getElementById('payment-submit').addEventListener('click', handlePayment);
  
  // Resource monitor toggle
  document.getElementById('toggle-resource-monitor').addEventListener('click', toggleResourceMonitor);
}

/**
 * Check authentication status
 */
async function checkAuthStatus() {
  // Check for API key in local storage
  const apiKey = localStorage.getItem('apiKey');
  
  if (!apiKey) {
    updateAuthUI(false);
    return;
  }
  
  try {
    // Set API key in headers
    API_CONFIG.headers['X-API-Key'] = apiKey;
    
    // Get user info
    const response = await fetch(`${API_CONFIG.baseUrl}/users/me`, {
      headers: API_CONFIG.headers
    });
    
    if (!response.ok) {
      throw new Error('Authentication failed');
    }
    
    const userData = await response.json();
    
    // Update state
    state.user = userData;
    state.isLoggedIn = true;
    
    // Update UI
    updateAuthUI(true);
    updateUserCredits(userData.credits);
    
    // Load user preferences
    loadUserPreferences(userData.preferences);
  } catch (error) {
    console.error('Auth check error:', error);
    updateAuthUI(false);
  }
}

/**
 * Update authentication UI
 * 
 * @param {boolean} isLoggedIn - Whether user is logged in
 */
function updateAuthUI(isLoggedIn) {
  state.isLoggedIn = isLoggedIn;
  
  // Update buttons
  document.getElementById('login-button').classList.toggle('hidden', isLoggedIn);
  document.getElementById('settings-button').classList.toggle('hidden', !isLoggedIn);
  
  // Update navigation
  document.querySelector('.sidebar a[data-page="summarize"]').classList.toggle('hidden', !isLoggedIn);
  document.querySelector('.sidebar a[data-page="transcribe"]').classList.toggle('hidden', !isLoggedIn);
  document.querySelector('.sidebar a[data-page="history"]').classList.toggle('hidden', !isLoggedIn);
  document.querySelector('.sidebar a[data-page="credits"]').classList.toggle('hidden', !isLoggedIn);
  
  // If logged in, navigate to summarize page
  if (isLoggedIn && state.currentPage === 'welcome') {
    navigateTo('summarize');
  }
}

/**
 * Update user credits display
 * 
 * @param {number} credits - User credits
 */
function updateUserCredits(credits) {
  const creditsElement = document.querySelector('#user-credits span');
  creditsElement.textContent = credits;
}

/**
 * Load user preferences
 * 
 * @param {Object} preferences - User preferences
 */
function loadUserPreferences(preferences) {
  if (!preferences) return;
  
  // Set default summarization method
  const methodSelect = document.getElementById('summarize-method');
  if (methodSelect && preferences.defaultSummarizationMethod) {
    methodSelect.value = preferences.defaultSummarizationMethod;
  }
  
  // Set default language
  const languageSelect = document.getElementById('summarize-language');
  if (languageSelect && preferences.defaultLanguage) {
    languageSelect.value = preferences.defaultLanguage;
  }
  
  // Set theme
  if (preferences.theme === 'dark') {
    document.body.classList.add('dark-theme');
  }
  
  // Update settings form
  const settingsMethodSelect = document.getElementById('settings-default-method');
  if (settingsMethodSelect && preferences.defaultSummarizationMethod) {
    settingsMethodSelect.value = preferences.defaultSummarizationMethod;
  }
  
  const settingsLanguageSelect = document.getElementById('settings-default-language');
  if (settingsLanguageSelect && preferences.defaultLanguage) {
    settingsLanguageSelect.value = preferences.defaultLanguage;
  }
  
  const settingsThemeSelect = document.getElementById('settings-theme');
  if (settingsThemeSelect && preferences.theme) {
    settingsThemeSelect.value = preferences.theme;
  }
}

/**
 * Navigate to a page
 * 
 * @param {string} page - Page name
 */
function navigateTo(page) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => {
    p.classList.add('hidden');
    p.classList.remove('active');
  });
  
  // Show selected page
  const selectedPage = document.getElementById(`${page}-page`);
  if (selectedPage) {
    selectedPage.classList.remove('hidden');
    selectedPage.classList.add('active');
  }
  
  // Update navigation
  document.querySelectorAll('.sidebar a').forEach(link => {
    link.classList.remove('active');
  });
  
  const activeLink = document.querySelector(`.sidebar a[data-page="${page}"]`);
  if (activeLink) {
    activeLink.classList.add('active');
  }
  
  // Update state
  state.currentPage = page;
  
  // Special page handling
  if (page === 'history' && state.isLoggedIn) {
    loadHistory();
  }
}

/**
 * Show a modal
 * 
 * @param {string} modalId - Modal ID
 */
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
  }
}

/**
 * Hide a modal
 * 
 * @param {string} modalId - Modal ID
 */
function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
  }
}

/**
 * Show a toast notification
 * 
 * @param {string} message - Toast message
 * @param {boolean} isError - Whether it's an error message
 */
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.remove('hidden', 'fade-out');
  
  // Hide toast after 3 seconds
  setTimeout(() => {
    toast.classList.add('fade-out');
    
    // Remove fade-out class after animation
    setTimeout(() => {
      toast.classList.add('hidden');
      toast.classList.remove('fade-out');
    }, 300);
  }, 3000);
}

/**
 * Handle login form submission
 */
async function handleLogin() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  if (!email || !password) {
    showToast('Please enter email and password', true);
    return;
  }
  
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/users/login`, {
      method: 'POST',
      headers: API_CONFIG.headers,
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      throw new Error('Login failed');
    }
    
    const userData = await response.json();
    
    // Save API key
    localStorage.setItem('apiKey', userData.apiKey);
    
    // Update state
    state.user = userData;
    state.isLoggedIn = true;
    
    // Update API headers
    API_CONFIG.headers['X-API-Key'] = userData.apiKey;
    
    // Update UI
    updateAuthUI(true);
    updateUserCredits(userData.credits);
    
    // Load user preferences
    loadUserPreferences(userData.preferences);
    
    // Hide login modal
    hideModal('login-modal');
    
    // Show success message
    showToast('Login successful');
  } catch (error) {
    console.error('Login error:', error);
    showToast('Login failed: ' + error.message, true);
  }
}

/**
 * Handle register form submission
 */
async function handleRegister() {
  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirm-password').value;
  
  if (!name || !email || !password) {
    showToast('Please fill all required fields', true);
    return;
  }
  
  if (password !== confirmPassword) {
    showToast('Passwords do not match', true);
    return;
  }
  
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/users/register`, {
      method: 'POST',
      headers: API_CONFIG.headers,
      body: JSON.stringify({ name, email, password })
    });
    
    if (!response.ok) {
      throw new Error('Registration failed');
    }
    
    const userData = await response.json();
    
    // Save API key
    localStorage.setItem('apiKey', userData.apiKey);
    
    // Update state
    state.user = userData;
    state.isLoggedIn = true;
    
    // Update API headers
    API_CONFIG.headers['X-API-Key'] = userData.apiKey;
    
    // Update UI
    updateAuthUI(true);
    updateUserCredits(userData.credits);
    
    // Hide register modal
    hideModal('register-modal');
    
    // Show success message
    showToast('Registration successful');
  } catch (error) {
    console.error('Registration error:', error);
    showToast('Registration failed: ' + error.message, true);
  }
}

/**
 * Handle save settings form submission
 */
async function handleSaveSettings() {
  if (!state.isLoggedIn) {
    showToast('Please login first', true);
    return;
  }
  
  const defaultSummarizationMethod = document.getElementById('settings-default-method').value;
  const defaultLanguage = document.getElementById('settings-default-language').value;
  const theme = document.getElementById('settings-theme').value;
  
  const preferences = {
    defaultSummarizationMethod,
    defaultLanguage,
    theme
  };
  
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/users/preferences`, {
      method: 'PUT',
      headers: API_CONFIG.headers,
      body: JSON.stringify({ preferences })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save settings');
    }
    
    // Update state
    state.user.preferences = preferences;
    
    // Apply theme
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
    
    // Hide settings modal
    hideModal('settings-modal');
    
    // Show success message
    showToast('Settings saved successfully');
  } catch (error) {
    console.error('Save settings error:', error);
    showToast('Failed to save settings: ' + error.message, true);
  }
}

/**
 * Handle logout
 */
function handleLogout() {
  // Clear state
  state.user = null;
  state.isLoggedIn = false;
  
  // Clear API key
  localStorage.removeItem('apiKey');
  delete API_CONFIG.headers['X-API-Key'];
  
  // Update UI
  updateAuthUI(false);
  
  // Navigate to welcome page
  navigateTo('welcome');
  
  // Hide settings modal
  hideModal('settings-modal');
  
  // Show success message
  showToast('Logout successful');
}

/**
 * Handle summarize form submission
 */
async function handleSummarize() {
  if (!state.isLoggedIn) {
    showToast('Please login first', true);
    return;
  }
  
  const text = document.getElementById('summarize-text').value;
  const method = document.getElementById('summarize-method').value;
  const language = document.getElementById('summarize-language').value;
  
  if (!text) {
    showToast('Please enter text to summarize', true);
    return;
  }
  
  try {
    // Show loading state
    document.getElementById('summarize-button').disabled = true;
    document.getElementById('summarize-button').textContent = 'Summarizing...';
    
    // Track resource usage
    trackApiCall('summarization', method);
    
    const response = await fetch(`${API_CONFIG.baseUrl}/summarize`, {
      method: 'POST',
      headers: API_CONFIG.headers,
      body: JSON.stringify({ text, method, language })
    });
    
    if (!response.ok) {
      throw new Error('Summarization failed');
    }
    
    const result = await response.json();
    
    // Update user credits
    if (state.user) {
      state.user.credits = result.credits || state.user.credits;
      updateUserCredits(state.user.credits);
    }
    
    // Display summary
    document.getElementById('summary-key-takeaways').textContent = result.keyTakeaways;
    document.getElementById('summary-progress').textContent = result.progress;
    document.getElementById('summary-bottlenecks').textContent = result.bottlenecks;
    document.getElementById('summary-next-steps').textContent = result.nextSteps;
    
    // Display metadata
    document.getElementById('summary-method').textContent = `Method: ${result.method}`;
    document.getElementById('summary-time').textContent = `Processing time: ${Math.round(result.processingTime)}ms`;
    
    // Show summary result
    document.getElementById('summary-result').classList.remove('hidden');
  } catch (error) {
    console.error('Summarization error:', error);
    showToast('Summarization failed: ' + error.message, true);
  } finally {
    // Reset button
    document.getElementById('summarize-button').disabled = false;
    document.getElementById('summarize-button').textContent = 'Summarize';
  }
}

/**
 * Handle transcribe form submission
 */
async function handleTranscribe() {
  if (!state.isLoggedIn) {
    showToast('Please login first', true);
    return;
  }
  
  const fileInput = document.getElementById('transcribe-file');
  const urlInput = document.getElementById('transcribe-url').value;
  const service = document.getElementById('transcribe-service').value;
  const language = document.getElementById('transcribe-language').value;
  
  if (!fileInput.files[0] && !urlInput) {
    showToast('Please upload a file or enter a URL', true);
    return;
  }
  
  try {
    // Show loading state
    document.getElementById('transcribe-button').disabled = true;
    document.getElementById('transcribe-button').textContent = 'Transcribing...';
    document.getElementById('transcribe-progress').classList.remove('hidden');
    
    // Track resource usage (estimate 1 minute for now)
    trackApiCall('transcription', null, 1);
    
    let response;
    
    if (fileInput.files[0]) {
      // Upload file
      const formData = new FormData();
      formData.append('file', fileInput.files[0]);
      formData.append('service', service);
      formData.append('language', language);
      
      response = await fetch(`${API_CONFIG.baseUrl}/transcribe`, {
        method: 'POST',
        headers: {
          'X-API-Key': API_CONFIG.headers['X-API-Key']
        },
        body: formData
      });
    } else {
      // Use URL
      response = await fetch(`${API_CONFIG.baseUrl}/transcribe`, {
        method: 'POST',
        headers: API_CONFIG.headers,
        body: JSON.stringify({
          fileUrl: urlInput,
          service,
          language
        })
      });
    }
    
    if (!response.ok) {
      throw new Error('Transcription failed');
    }
    
    const result = await response.json();
    
    // Update user credits
    if (state.user) {
      state.user.credits = result.credits || state.user.credits;
      updateUserCredits(state.user.credits);
    }
    
    // Display transcription
    document.getElementById('transcription-text').textContent = result.text;
    
    // Display metadata
    document.getElementById('transcription-service').textContent = `Service: ${result.service}`;
    document.getElementById('transcription-time').textContent = `Duration: ${Math.round(result.durationSeconds)}s`;
    
    // Show transcription result
    document.getElementById('transcription-result').classList.remove('hidden');
    
    // Track actual resource usage (update with actual duration)
    if (result.durationMinutes) {
      // Adjust the tracking to actual duration
      trackApiCall('transcription', null, result.durationMinutes - 1); // Subtract the initial estimate
    }
  } catch (error) {
    console.error('Transcription error:', error);
    showToast('Transcription failed: ' + error.message, true);
  } finally {
    // Reset UI
    document.getElementById('transcribe-button').disabled = false;
    document.getElementById('transcribe-button').textContent = 'Transcribe';
    document.getElementById('transcribe-progress').classList.add('hidden');
  }
}

/**
 * Load user history
 */
async function loadHistory() {
  if (!state.isLoggedIn) {
    return;
  }
  
  try {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '<div class="loading">Loading history...</div>';
    
    const response = await fetch(`${API_CONFIG.baseUrl}/resources/usage`, {
      headers: API_CONFIG.headers
    });
    
    if (!response.ok) {
      throw new Error('Failed to load history');
    }
    
    const usage = await response.json();
    
    // Display history
    if (usage.history && usage.history.length > 0) {
      historyList.innerHTML = '';
      
      usage.history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        let itemContent = '';
        
        if (item.type === 'summarization') {
          itemContent = `
            <div class="history-icon icon-summary"></div>
            <div class="history-details">
              <h4>Summarization (${item.subtype})</h4>
              <p>Date: ${new Date(item.timestamp).toLocaleString()}</p>
            </div>
          `;
        } else if (item.type === 'transcription') {
          itemContent = `
            <div class="history-icon icon-transcription"></div>
            <div class="history-details">
              <h4>Transcription (${item.quantity} minutes)</h4>
              <p>Date: ${new Date(item.timestamp).toLocaleString()}</p>
            </div>
          `;
        } else if (item.type === 'purchase') {
          itemContent = `
            <div class="history-icon">💰</div>
            <div class="history-details">
              <h4>Purchase: ${item.packageName} Package</h4>
              <p>Credits: ${item.credits} | Price: $${item.price}</p>
              <p>Date: ${new Date(item.timestamp).toLocaleString()}</p>
            </div>
          `;
        }
        
        historyItem.innerHTML = itemContent;
        historyList.appendChild(historyItem);
      });
    } else {
      historyList.innerHTML = '<div class="empty">No history found</div>';
    }
  } catch (error) {
    console.error('Load history error:', error);
    document.getElementById('history-list').innerHTML = '<div class="error">Failed to load history</div>';
  }
}

/**
 * Handle buy credits
 * 
 * @param {string} packageName - Package name
 */
function handleBuyCredits(packageName) {
  if (!state.isLoggedIn) {
    showToast('Please login first', true);
    return;
  }
  
  // Get package details
  let packageDetails;
  
  switch (packageName) {
    case 'basic':
      packageDetails = {
        name: 'Basic',
        price: 4.99,
        credits: 100
      };
      break;
    case 'standard':
      packageDetails = {
        name: 'Standard',
        price: 19.99,
        credits: 500
      };
      break;
    case 'premium':
      packageDetails = {
        name: 'Premium',
        price: 49.99,
        credits: 2000
      };
      break;
    default:
      showToast('Invalid package', true);
      return;
  }
  
  // Update payment modal
  document.getElementById('package-name').textContent = packageDetails.name;
  document.getElementById('package-price').textContent = packageDetails.price;
  document.getElementById('package-credits').textContent = packageDetails.credits;
  
  // Store package name in state
  state.selectedPackage = packageName;
  
  // Show payment modal
  showModal('payment-modal');
  
  // Initialize Stripe Elements
  initializeStripe();
}

/**
 * Initialize Stripe Elements
 */
function initializeStripe() {
  // In a real implementation, this would initialize Stripe Elements
  // For this example, we'll simulate the payment process
  console.log('Initializing Stripe Elements (simulated)');
}

/**
 * Handle payment form submission
 */
async function handlePayment() {
  if (!state.isLoggedIn || !state.selectedPackage) {
    showToast('Payment failed: Invalid state', true);
    return;
  }
  
  try {
    // Show loading state
    document.getElementById('payment-submit').disabled = true;
    document.getElementById('payment-submit').textContent = 'Processing...';
    
    // Simulate payment token generation
    const paymentToken = 'tok_' + Math.random().toString(36).substring(2, 15);
    
    // Process payment
    const response = await fetch(`${API_CONFIG.baseUrl}/credits/purchase`, {
      method: 'POST',
      headers: API_CONFIG.headers,
      body: JSON.stringify({
        packageName: state.selectedPackage,
        paymentToken
      })
    });
    
    if (!response.ok) {
      throw new Error('Payment failed');
    }
    
    const result = await response.json();
    
    // Update user credits
    if (state.user && result.credits) {
      state.user.credits = result.credits;
      updateUserCredits(result.credits);
    }
    
    // Hide payment modal
    hideModal('payment-modal');
    
    // Show success message
    showToast(`Successfully purchased ${result.package} package`);
  } catch (error) {
    console.error('Payment error:', error);
    showToast('Payment failed: ' + error.message, true);
  } finally {
    // Reset button
    document.getElementById('payment-submit').disabled = false;
    document.getElementById('payment-submit').textContent = 'Complete Purchase';
  }
}

/**
 * Initialize resource monitor
 */
function initializeResourceMonitor() {
  // Create resource monitor container
  const container = document.createElement('div');
  container.id = 'resource-monitor';
  container.className = 'resource-monitor';
  
  // Create resource monitor header
  const header = document.createElement('div');
  header.className = 'resource-monitor-header';
  
  const title = document.createElement('h3');
  title.textContent = 'Resource Monitor';
  
  const toggleButton = document.createElement('button');
  toggleButton.className = 'resource-monitor-toggle';
  toggleButton.textContent = '−';
  toggleButton.addEventListener('click', () => {
    const body = document.getElementById('resource-monitor-body');
    if (body.style.display === 'none') {
      body.style.display = 'block';
      toggleButton.textContent = '−';
    } else {
      body.style.display = 'none';
      toggleButton.textContent = '+';
    }
  });
  
  header.appendChild(title);
  header.appendChild(toggleButton);
  
  // Create resource monitor body
  const body = document.createElement('div');
  body.id = 'resource-monitor-body';
  body.className = 'resource-monitor-body';
  
  // Add CPU section
  const cpuSection = createResourceSection('CPU Usage', 'cpu-usage');
  body.appendChild(cpuSection);
  
  // Add memory section
  const memorySection = createResourceSection('Memory Usage', 'memory-usage');
  body.appendChild(memorySection);
  
  // Add storage section
  const storageSection = createResourceSection('Storage Usage', 'storage-usage');
  body.appendChild(storageSection);
  
  // Add API calls section
  const apiCallsSection = document.createElement('div');
  apiCallsSection.className = 'resource-section';
  
  const apiCallsTitle = document.createElement('h4');
  apiCallsTitle.textContent = 'API Calls';
  
  const apiCallsList = document.createElement('div');
  apiCallsList.id = 'api-calls-list';
  
  apiCallsSection.appendChild(apiCallsTitle);
  apiCallsSection.appendChild(apiCallsList);
  
  body.appendChild(apiCallsSection);
  
  // Add cost section
  const costSection = document.createElement('div');
  costSection.className = 'resource-section resource-cost';
  
  const costTitle = document.createElement('h4');
  costTitle.textContent = 'Estimated Costs';
  
  const costList = document.createElement('div');
  costList.id = 'cost-list';
  
  costSection.appendChild(costTitle);
  costSection.appendChild(costList);
  
  body.appendChild(costSection);
  
  // Assemble resource monitor
  container.appendChild(header);
  container.appendChild(body);
  
  // Add to document
  document.body.appendChild(container);
  
  // Hide resource monitor by default
  container.style.display = 'none';
}

/**
 * Create a resource section with a bar
 * 
 * @param {string} title - Section title
 * @param {string} id - Section ID
 * @returns {HTMLElement} Resource section element
 */
function createResourceSection(title, id) {
  const section = document.createElement('div');
  section.className = 'resource-section';
  
  const sectionTitle = document.createElement('h4');
  sectionTitle.textContent = title;
  
  const bar = document.createElement('div');
  bar.className = 'resource-bar';
  
  const barFill = document.createElement('div');
  barFill.className = 'resource-bar-fill';
  barFill.id = `${id}-bar`;
  barFill.style.width = '0%';
  
  bar.appendChild(barFill);
  
  const label = document.createElement('div');
  label.className = 'resource-label';
  
  const valueLabel = document.createElement('span');
  valueLabel.id = `${id}-value`;
  valueLabel.textContent = '0%';
  
  const usageLabel = document.createElement('span');
  usageLabel.id = `${id}-usage`;
  usageLabel.textContent = '0 / 0';
  
  label.appendChild(valueLabel);
  label.appendChild(usageLabel);
  
  section.appendChild(sectionTitle);
  section.appendChild(bar);
  section.appendChild(label);
  
  return section;
}

/**
 * Toggle resource monitor visibility
 */
function toggleResourceMonitor() {
  const resourceMonitor = document.getElementById('resource-monitor');
  const toggleButton = document.getElementById('toggle-resource-monitor');
  
  if (resourceMonitor.style.display === 'none') {
    resourceMonitor.style.display = 'block';
    toggleButton.textContent = 'Hide Resource Monitor';
    state.resourceMonitorVisible = true;
  } else {
    resourceMonitor.style.display = 'none';
    toggleButton.textContent = 'Show Resource Monitor';
    state.resourceMonitorVisible = false;
  }
}

/**
 * Start resource monitoring
 */
function startResourceMonitoring() {
  // Update resource monitor every 5 seconds
  setInterval(updateResourceMonitor, 5000);
}

/**
 * Update resource monitor
 */
function updateResourceMonitor() {
  // Simulate resource usage
  simulateResourceUsage();
  
  // Update UI
  updateResourceMonitorUI();
}

/**
 * Simulate resource usage
 */
function simulateResourceUsage() {
  // Simulate CPU usage (random fluctuation between 5-15%)
  state.resourceUsage.cpu = Math.max(0, Math.min(100, state.resourceUsage.cpu + (Math.random() * 20 - 10)));
  
  // Simulate memory usage (slow increase)
  state.resourceUsage.memory = Math.min(8 * 1024, state.resourceUsage.memory + Math.random() * 5);
  
  // Simulate storage usage (very slow increase)
  state.resourceUsage.storage = Math.min(1024 * 1024, state.resourceUsage.storage + Math.random() * 0.5);
}

/**
 * Update resource monitor UI
 */
function updateResourceMonitorUI() {
  // Only update if resource monitor is visible
  if (!state.resourceMonitorVisible) {
    return;
  }
  
  // Update CPU usage
  updateResourceBar('cpu-usage', state.resourceUsage.cpu, 100, '%');
  
  // Update memory usage (MB)
  updateResourceBar('memory-usage', state.resourceUsage.memory, 8 * 1024, 'MB'); // Assuming 8GB total memory
  
  // Update storage usage (MB)
  updateResourceBar('storage-usage', state.resourceUsage.storage, 1024 * 1024, 'MB'); // Assuming 1TB total storage
  
  // Update API calls list
  updateApiCallsList();
  
  // Update cost list
  updateCostList();
}

/**
 * Update a resource bar with new value
 * 
 * @param {string} id - Resource bar ID
 * @param {number} value - Current value
 * @param {number} total - Total value
 * @param {string} unit - Unit of measurement
 */
function updateResourceBar(id, value, total, unit) {
  const bar = document.getElementById(`${id}-bar`);
  const valueLabel = document.getElementById(`${id}-value`);
  const usageLabel = document.getElementById(`${id}-usage`);
  
  if (!bar || !valueLabel || !usageLabel) {
    return;
  }
  
  // Calculate percentage
  const percentage = Math.min(100, Math.max(0, (value / total) * 100));
  
  // Update bar width
  bar.style.width = `${percentage}%`;
  
  // Update bar color based on thresholds
  if (percentage >= 80) {
    bar.className = 'resource-bar-fill high';
  } else if (percentage >= 60) {
    bar.className = 'resource-bar-fill medium';
  } else if (percentage >= 30) {
    bar.className = 'resource-bar-fill low';
  } else {
    bar.className = 'resource-bar-fill';
  }
  
  // Update labels
  valueLabel.textContent = `${percentage.toFixed(1)}%`;
  usageLabel.textContent = `${value.toFixed(1)} ${unit} / ${total} ${unit}`;
}

/**
 * Update API calls list
 */
function updateApiCallsList() {
  const apiCallsList = document.getElementById('api-calls-list');
  
  if (!apiCallsList) {
    return;
  }
  
  // Clear list
  apiCallsList.innerHTML = '';
  
  // Add summarization calls
  const summarizationCalls = document.createElement('div');
  summarizationCalls.className = 'api-call-item';
  summarizationCalls.innerHTML = `
    <strong>Summarization:</strong>
    <ul>
      <li>Rule-based: ${state.resourceUsage.apiCalls.summarization.ruleBased}</li>
      <li>ML-based: ${state.resourceUsage.apiCalls.summarization.mlBased}</li>
      <li>AI Service: ${state.resourceUsage.apiCalls.summarization.aiService}</li>
    </ul>
  `;
  
  // Add transcription calls
  const transcriptionCalls = document.createElement('div');
  transcriptionCalls.className = 'api-call-item';
  transcriptionCalls.innerHTML = `
    <strong>Transcription:</strong>
    <ul>
      <li>Minutes: ${state.resourceUsage.apiCalls.transcription.minutes}</li>
    </ul>
  `;
  
  apiCallsList.appendChild(summarizationCalls);
  apiCallsList.appendChild(transcriptionCalls);
}

/**
 * Update cost list
 */
function updateCostList() {
  const costList = document.getElementById('cost-list');
  
  if (!costList) {
    return;
  }
  
  // Calculate costs
  const costs = calculateResourceCosts();
  
  // Clear list
  costList.innerHTML = '';
  
  // Add infrastructure costs
  const infrastructureCost = document.createElement('div');
  infrastructureCost.className = 'cost-item';
  infrastructureCost.innerHTML = `
    <span>Infrastructure:</span>
    <span>$${(costs.cpu + costs.memory + costs.storage).toFixed(4)}</span>
  `;
  
  // Add API call costs
  const apiCallCost = document.createElement('div');
  apiCallCost.className = 'cost-item';
  
  const totalApiCallCost = 
    costs.apiCalls.summarization.ruleBased +
    costs.apiCalls.summarization.mlBased +
    costs.apiCalls.summarization.aiService +
    costs.apiCalls.transcription.minutes;
  
  apiCallCost.innerHTML = `
    <span>API Calls:</span>
    <span>$${totalApiCallCost.toFixed(4)}</span>
  `;
  
  // Add total cost
  const totalCost = document.createElement('div');
  totalCost.className = 'cost-total';
  totalCost.innerHTML = `
    <span>Total:</span>
    <span>$${costs.total.toFixed(4)}</span>
  `;
  
  // Add runtime
  const runtime = document.createElement('div');
  runtime.className = 'cost-item';
  runtime.innerHTML = `
    <span>Runtime:</span>
    <span>${costs.hoursElapsed.toFixed(2)} hours</span>
  `;
  
  costList.appendChild(infrastructureCost);
  costList.appendChild(apiCallCost);
  costList.appendChild(runtime);
  costList.appendChild(totalCost);
}

/**
 * Calculate resource costs
 * 
 * @returns {Object} Cost breakdown
 */
function calculateResourceCosts() {
  // Cost coefficients
  const costCoefficients = {
    // CPU cost per hour at 100% usage
    cpuPerHour: 0.06,
    
    // Memory cost per GB-hour
    memoryPerGBHour: 0.01,
    
    // Storage cost per GB-hour
    storagePerGBHour: 0.0001,
    
    // API call costs
    apiCalls: {
      summarization: {
        ruleBased: 0.01,
        mlBased: 0.03,
        aiService: 0.05
      },
      transcription: {
        perMinute: 0.01
      }
    }
  };
  
  // Calculate time in hours
  const startTime = state.resourceUsage.startTime || Date.now();
  const currentTime = Date.now();
  const hoursElapsed = (currentTime - startTime) / (1000 * 60 * 60);
  
  // Calculate CPU cost
  const cpuCost = (state.resourceUsage.cpu / 100) * costCoefficients.cpuPerHour * hoursElapsed;
  
  // Calculate memory cost (convert MB to GB)
  const memoryGB = state.resourceUsage.memory / 1024;
  const memoryCost = memoryGB * costCoefficients.memoryPerGBHour * hoursElapsed;
  
  // Calculate storage cost (convert MB to GB)
  const storageGB = state.resourceUsage.storage / 1024;
  const storageCost = storageGB * costCoefficients.storagePerGBHour * hoursElapsed;
  
  // Calculate API call costs
  const apiCallCosts = {
    summarization: {
      ruleBased: state.resourceUsage.apiCalls.summarization.ruleBased * costCoefficients.apiCalls.summarization.ruleBased,
      mlBased: state.resourceUsage.apiCalls.summarization.mlBased * costCoefficients.apiCalls.summarization.mlBased,
      aiService: state.resourceUsage.apiCalls.summarization.aiService * costCoefficients.apiCalls.summarization.aiService
    },
    transcription: {
      minutes: state.resourceUsage.apiCalls.transcription.minutes * costCoefficients.apiCalls.transcription.perMinute
    }
  };
  
  // Calculate total API call costs
  const totalApiCallCost = 
    apiCallCosts.summarization.ruleBased +
    apiCallCosts.summarization.mlBased +
    apiCallCosts.summarization.aiService +
    apiCallCosts.transcription.minutes;
  
  // Calculate total cost
  const totalCost = cpuCost + memoryCost + storageCost + totalApiCallCost;
  
  return {
    cpu: cpuCost,
    memory: memoryCost,
    storage: storageCost,
    apiCalls: apiCallCosts,
    total: totalCost,
    hoursElapsed: hoursElapsed
  };
}

/**
 * Track API call for resource monitoring
 * 
 * @param {string} type - API call type (summarization, transcription)
 * @param {string} subtype - API call subtype (ruleBased, mlBased, aiService)
 * @param {number} value - Value (1 for summarization, minutes for transcription)
 */
function trackApiCall(type, subtype, value = 1) {
  if (type === 'summarization') {
    if (subtype === 'ruleBased') {
      state.resourceUsage.apiCalls.summarization.ruleBased += value;
    } else if (subtype === 'mlBased') {
      state.resourceUsage.apiCalls.summarization.mlBased += value;
    } else if (subtype === 'aiService') {
      state.resourceUsage.apiCalls.summarization.aiService += value;
    }
  } else if (type === 'transcription') {
    state.resourceUsage.apiCalls.transcription.minutes += value;
  }
  
  // Update UI if resource monitor is visible
  if (state.resourceMonitorVisible) {
    updateResourceMonitorUI();
  }
}
