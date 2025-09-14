// Renderer process script for the Summarize This desktop application
// Handles UI interactions and communicates with the main process via the preload API

// Global state
let currentBoard = null;
let currentCard = null;
let userCredits = 100; // Default starting credits
let resourceMonitorEnabled = true;

// DOM elements
const elements = {
  userCredits: document.getElementById('user-credits'),
  trelloLoginStatus: document.getElementById('trello-login-status'),
  btnTrelloLogin: document.getElementById('btn-trello-login'),
  btnSettings: document.getElementById('btn-settings'),
  boardsContainer: document.getElementById('boards-container'),
  welcomeScreen: document.getElementById('welcome-screen'),
  boardView: document.getElementById('board-view'),
  boardTitle: document.getElementById('board-title'),
  listsContainer: document.getElementById('lists-container'),
  cardView: document.getElementById('card-view'),
  backToBoard: document.getElementById('back-to-board'),
  cardTitle: document.getElementById('card-title'),
  cardDescription: document.getElementById('card-description'),
  attachmentsContainer: document.getElementById('attachments-container'),
  commentsContainer: document.getElementById('comments-container'),
  btnSummarize: document.getElementById('btn-summarize'),
  btnTranscribe: document.getElementById('btn-transcribe'),
  summaryContainer: document.getElementById('summary-container'),
  keyTakeaways: document.getElementById('key-takeaways'),
  progressUpdate: document.getElementById('progress-update'),
  bottlenecks: document.getElementById('bottlenecks'),
  nextSteps: document.getElementById('next-steps'),
  summaryMethod: document.getElementById('summary-method'),
  summaryCredits: document.getElementById('summary-credits'),
  resourceMonitorContainer: document.getElementById('resource-monitor-container')
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  // Initialize UI
  updateCreditsDisplay();
  
  // Set up event listeners
  setupEventListeners();
  
  // Initialize resource monitoring UI
  initializeResourceMonitor();
  
  // Listen for resource updates from main process
  window.api.onResourceUpdate(handleResourceUpdate);
  window.api.onToggleResourceMonitor(handleToggleResourceMonitor);
  
  // Mock Trello authentication for demo
  mockTrelloAuth();
});

// Set up event listeners
function setupEventListeners() {
  // Trello login button
  elements.btnTrelloLogin.addEventListener('click', handleTrelloLogin);
  
  // Settings button
  elements.btnSettings.addEventListener('click', handleSettingsClick);
  
  // Back to board button
  elements.backToBoard.addEventListener('click', handleBackToBoard);
  
  // Summarize button
  elements.btnSummarize.addEventListener('click', handleSummarize);
  
  // Transcribe button
  elements.btnTranscribe.addEventListener('click', handleTranscribe);
}

// Initialize resource monitor UI
function initializeResourceMonitor() {
  // Create resource monitor UI
  createResourceMonitorUI();
  
  // Start updating the UI with system resource data
  startResourceMonitorUpdates();
}

// Create resource monitor UI
function createResourceMonitorUI() {
  const container = elements.resourceMonitorContainer;
  
  // Set container styles
  container.style.position = 'fixed';
  container.style.bottom = '10px';
  container.style.right = '10px';
  container.style.width = '200px';
  container.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
  container.style.border = '1px solid #ccc';
  container.style.borderRadius = '5px';
  container.style.padding = '10px';
  container.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)';
  container.style.zIndex = '9999';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.fontSize = '12px';
  
  // Create header
  const header = document.createElement('div');
  header.style.fontWeight = 'bold';
  header.style.marginBottom = '5px';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.innerHTML = '<span>Resource Monitor</span>';
  
  // Create toggle button
  const toggleButton = document.createElement('button');
  toggleButton.textContent = '-';
  toggleButton.style.border = 'none';
  toggleButton.style.background = 'none';
  toggleButton.style.cursor = 'pointer';
  toggleButton.style.padding = '0 5px';
  toggleButton.onclick = toggleResourceMonitorDetails;
  
  header.appendChild(toggleButton);
  
  // Create cost counter
  const costCounter = document.createElement('div');
  costCounter.id = 'cost-counter';
  costCounter.style.fontWeight = 'bold';
  costCounter.style.fontSize = '16px';
  costCounter.style.textAlign = 'center';
  costCounter.style.margin = '5px 0';
  costCounter.textContent = '$0.00';
  
  // Create details panel
  const detailsPanel = document.createElement('div');
  detailsPanel.id = 'resource-details';
  
  // Create CPU usage section
  const cpuSection = document.createElement('div');
  cpuSection.style.marginBottom = '5px';
  
  const cpuLabel = document.createElement('div');
  cpuLabel.style.display = 'flex';
  cpuLabel.style.justifyContent = 'space-between';
  cpuLabel.innerHTML = '<span>CPU:</span><span id="cpu-value">0%</span>';
  
  const cpuBar = document.createElement('div');
  cpuBar.style.height = '5px';
  cpuBar.style.backgroundColor = '#eee';
  cpuBar.style.borderRadius = '2px';
  cpuBar.style.overflow = 'hidden';
  
  const cpuFill = document.createElement('div');
  cpuFill.id = 'cpu-bar';
  cpuFill.style.width = '0%';
  cpuFill.style.height = '100%';
  cpuFill.style.backgroundColor = '#4CAF50';
  cpuBar.appendChild(cpuFill);
  
  cpuSection.appendChild(cpuLabel);
  cpuSection.appendChild(cpuBar);
  
  // Create memory usage section
  const memorySection = document.createElement('div');
  memorySection.style.marginBottom = '5px';
  
  const memoryLabel = document.createElement('div');
  memoryLabel.style.display = 'flex';
  memoryLabel.style.justifyContent = 'space-between';
  memoryLabel.innerHTML = '<span>Memory:</span><span id="memory-value">0 MB</span>';
  
  const memoryBar = document.createElement('div');
  memoryBar.style.height = '5px';
  memoryBar.style.backgroundColor = '#eee';
  memoryBar.style.borderRadius = '2px';
  memoryBar.style.overflow = 'hidden';
  
  const memoryFill = document.createElement('div');
  memoryFill.id = 'memory-bar';
  memoryFill.style.width = '0%';
  memoryFill.style.height = '100%';
  memoryFill.style.backgroundColor = '#2196F3';
  memoryBar.appendChild(memoryFill);
  
  memorySection.appendChild(memoryLabel);
  memorySection.appendChild(memoryBar);
  
  // Create API calls section
  const apiSection = document.createElement('div');
  apiSection.style.marginBottom = '5px';
  apiSection.innerHTML = '<div>API Calls:</div>';
  
  const apiList = document.createElement('ul');
  apiList.id = 'api-list';
  apiList.style.margin = '5px 0';
  apiList.style.paddingLeft = '20px';
  apiList.innerHTML = `
    <li>Rule-based: 0</li>
    <li>ML-based: 0</li>
    <li>AI-based: 0</li>
    <li>Transcription: 0s</li>
  `;
  
  apiSection.appendChild(apiList);
  
  // Create cost breakdown section
  const costSection = document.createElement('div');
  costSection.innerHTML = '<div>Cost Breakdown:</div>';
  
  const costList = document.createElement('ul');
  costList.id = 'cost-list';
  costList.style.margin = '5px 0';
  costList.style.paddingLeft = '20px';
  costList.innerHTML = `
    <li>CPU: $0.00</li>
    <li>Memory: $0.00</li>
    <li>API: $0.00</li>
    <li>Storage: $0.00</li>
  `;
  
  costSection.appendChild(costList);
  
  // Create reset button
  const resetButton = document.createElement('button');
  resetButton.textContent = 'Reset Tracking';
  resetButton.style.width = '100%';
  resetButton.style.padding = '5px';
  resetButton.style.marginTop = '5px';
  resetButton.style.border = '1px solid #ccc';
  resetButton.style.borderRadius = '3px';
  resetButton.style.backgroundColor = '#f5f5f5';
  resetButton.style.cursor = 'pointer';
  resetButton.onclick = resetResourceTracking;
  
  // Assemble details panel
  detailsPanel.appendChild(cpuSection);
  detailsPanel.appendChild(memorySection);
  detailsPanel.appendChild(apiSection);
  detailsPanel.appendChild(costSection);
  detailsPanel.appendChild(resetButton);
  
  // Assemble container
  container.innerHTML = '';
  container.appendChild(header);
  container.appendChild(costCounter);
  container.appendChild(detailsPanel);
}

// Start resource monitor updates
function startResourceMonitorUpdates() {
  // Get initial resource data
  updateResourceMonitorUI();
  
  // Update every 2 seconds
  setInterval(updateResourceMonitorUI, 2000);
}

// Update resource monitor UI with latest data
function updateResourceMonitorUI() {
  if (!resourceMonitorEnabled) return;
  
  // Get resource data from main process
  const { resourceData, costCoefficients } = window.api.getResourceData();
  
  // Calculate costs
  const costs = calculateCosts(resourceData, costCoefficients);
  
  // Update UI elements
  document.getElementById('cpu-value').textContent = `${resourceData.cpu.toFixed(1)}%`;
  document.getElementById('cpu-bar').style.width = `${resourceData.cpu}%`;
  
  document.getElementById('memory-value').textContent = `${resourceData.memory.toFixed(1)} MB`;
  const memoryPercentage = Math.min(100, (resourceData.memory / 1000) * 100);
  document.getElementById('memory-bar').style.width = `${memoryPercentage}%`;
  
  document.getElementById('api-list').innerHTML = `
    <li>Rule-based: ${resourceData.apiCalls.summarization.rule}</li>
    <li>ML-based: ${resourceData.apiCalls.summarization.ml}</li>
    <li>AI-based: ${resourceData.apiCalls.summarization.ai}</li>
    <li>Transcription: ${resourceData.apiCalls.transcription.seconds}s</li>
  `;
  
  document.getElementById('cost-list').innerHTML = `
    <li>CPU: $${costs.breakdown.cpu.toFixed(5)}</li>
    <li>Memory: $${costs.breakdown.memory.toFixed(5)}</li>
    <li>API: $${(costs.breakdown.summarization + costs.breakdown.transcription).toFixed(5)}</li>
    <li>Storage: $${costs.breakdown.storage.toFixed(5)}</li>
  `;
  
  const costCounter = document.getElementById('cost-counter');
  costCounter.textContent = `$${costs.total.toFixed(5)}`;
  
  // Change color based on cost
  if (costs.total < 0.01) {
    costCounter.style.color = '#4CAF50'; // Green
  } else if (costs.total < 0.1) {
    costCounter.style.color = '#FF9800'; // Orange
  } else {
    costCounter.style.color = '#F44336'; // Red
  }
}

// Calculate costs based on resource usage
function calculateCosts(resourceData, costCoefficients) {
  const uptime = (Date.now() - resourceData.startTime) / 1000; // in seconds
  
  // Calculate CPU cost
  const cpuCost = resourceData.cpu * costCoefficients.cpu * uptime;
  
  // Calculate memory cost
  const memoryCost = resourceData.memory * costCoefficients.memory * uptime;
  
  // Calculate API call costs
  const summarizationCost = 
    resourceData.apiCalls.summarization.rule * costCoefficients.summarization.rule +
    resourceData.apiCalls.summarization.ml * costCoefficients.summarization.ml +
    resourceData.apiCalls.summarization.ai * costCoefficients.summarization.ai;
  
  // Calculate transcription cost
  const transcriptionCost = resourceData.apiCalls.transcription.seconds * costCoefficients.transcription;
  
  // Calculate storage cost
  const storageCost = resourceData.apiCalls.storage.bytes * costCoefficients.storage * (uptime / 3600); // convert to hours
  
  // Total cost
  const totalCost = cpuCost + memoryCost + summarizationCost + transcriptionCost + storageCost;
  
  return {
    total: totalCost,
    breakdown: {
      cpu: cpuCost,
      memory: memoryCost,
      summarization: summarizationCost,
      transcription: transcriptionCost,
      storage: storageCost
    }
  };
}

// Toggle resource monitor details visibility
function toggleResourceMonitorDetails() {
  const detailsPanel = document.getElementById('resource-details');
  const toggleButton = detailsPanel.previousElementSibling.previousElementSibling.querySelector('button');
  
  if (detailsPanel.style.display === 'none') {
    detailsPanel.style.display = 'block';
    toggleButton.textContent = '-';
  } else {
    detailsPanel.style.display = 'none';
    toggleButton.textContent = '+';
  }
}

// Reset resource tracking
function resetResourceTracking() {
  window.api.resetTracking();
  updateResourceMonitorUI();
}

// Handle resource update from main process
function handleResourceUpdate(data) {
  if (!resourceMonitorEnabled) return;
  
  if (data.type === 'cpu') {
    document.getElementById('cpu-value').textContent = `${data.value.toFixed(1)}%`;
    document.getElementById('cpu-bar').style.width = `${data.value}%`;
  } else if (data.type === 'memory') {
    document.getElementById('memory-value').textContent = `${data.value.toFixed(1)} MB`;
    const memoryPercentage = Math.min(100, (data.value / 1000) * 100);
    document.getElementById('memory-bar').style.width = `${memoryPercentage}%`;
  }
  
  // Update the full UI to recalculate costs
  updateResourceMonitorUI();
}

// Handle toggle resource monitor from main process
function handleToggleResourceMonitor(enabled) {
  resourceMonitorEnabled = enabled;
  elements.resourceMonitorContainer.style.display = enabled ? 'block' : 'none';
}

// Update credits display
function updateCreditsDisplay() {
  elements.userCredits.textContent = `Credits: ${userCredits}`;
}

// Mock Trello authentication for demo
function mockTrelloAuth() {
  // Simulate successful authentication
  setTimeout(() => {
    elements.trelloLoginStatus.textContent = 'Logged in as Demo User';
    elements.trelloLoginStatus.style.color = '#4CAF50';
    elements.btnTrelloLogin.textContent = 'Disconnect';
    
    // Load mock boards
    loadMockBoards();
  }, 1000);
}

// Load mock Trello boards
function loadMockBoards() {
  const mockBoards = [
    { id: 'board1', name: 'Project Alpha' },
    { id: 'board2', name: 'Marketing Campaign' },
    { id: 'board3', name: 'Development Roadmap' }
  ];
  
  elements.boardsContainer.innerHTML = '';
  
  mockBoards.forEach(board => {
    const boardElement = document.createElement('div');
    boardElement.className = 'board-item';
    boardElement.textContent = board.name;
    boardElement.dataset.boardId = board.id;
    boardElement.addEventListener('click', () => handleBoardClick(board));
    
    elements.boardsContainer.appendChild(boardElement);
  });
}

// Handle Trello login button click
function handleTrelloLogin() {
  if (elements.btnTrelloLogin.textContent === 'Connect to Trello') {
    // Simulate login process
    elements.trelloLoginStatus.textContent = 'Logging in...';
    elements.btnTrelloLogin.disabled = true;
    
    setTimeout(() => {
      elements.trelloLoginStatus.textContent = 'Logged in as Demo User';
      elements.trelloLoginStatus.style.color = '#4CAF50';
      elements.btnTrelloLogin.textContent = 'Disconnect';
      elements.btnTrelloLogin.disabled = false;
      
      // Load mock boards
      loadMockBoards();
    }, 1000);
  } else {
    // Simulate logout
    elements.trelloLoginStatus.textContent = 'Not logged in';
    elements.trelloLoginStatus.style.color = '';
    elements.btnTrelloLogin.textContent = 'Connect to Trello';
    
    // Clear boards
    elements.boardsContainer.innerHTML = '<div class="loading">Please log in to view boards</div>';
    
    // Return to welcome screen
    showWelcomeScreen();
  }
}

// Handle settings button click
function handleSettingsClick() {
  // In a real app, this would open the settings window
  alert('Settings would open here. In this demo, you can use the Resource Monitor in the bottom right corner to track usage and costs.');
}

// Handle board click
function handleBoardClick(board) {
  currentBoard = board;
  
  // Update UI
  elements.boardTitle.textContent = board.name;
  
  // Show board view
  showBoardView();
  
  // Load mock lists and cards
  loadMockLists(board.id);
  
  // Track API call
  window.api.trackApiCall('storage', null, 500); // 500 bytes for board data
}

// Load mock lists for a board
function loadMockLists(boardId) {
  const mockLists = [
    { id: 'list1', name: 'To Do', cards: [
      { id: 'card1', name: 'Research competitors', description: 'Analyze top 5 competitors in the market.' },
      { id: 'card2', name: 'Create project plan', description: 'Develop comprehensive project plan with milestones.' }
    ]},
    { id: 'list2', name: 'In Progress', cards: [
      { id: 'card3', name: 'Design user interface', description: 'Create wireframes and mockups for the new dashboard.' },
      { id: 'card4', name: 'Implement authentication', description: 'Set up OAuth2 authentication flow.' }
    ]},
    { id: 'list3', name: 'Done', cards: [
      { id: 'card5', name: 'Project kickoff meeting', description: 'Initial meeting with stakeholders to align on goals.' },
      { id: 'card6', name: 'Requirements gathering', description: 'Collect and document all project requirements.' }
    ]}
  ];
  
  elements.listsContainer.innerHTML = '';
  
  mockLists.forEach(list => {
    const listElement = document.createElement('div');
    listElement.className = 'list';
    
    const listHeader = document.createElement('div');
    listHeader.className = 'list-header';
    listHeader.textContent = list.name;
    
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'cards-container';
    
    list.cards.forEach(card => {
      const cardElement = document.createElement('div');
      cardElement.className = 'card';
      cardElement.textContent = card.name;
      cardElement.dataset.cardId = card.id;
      cardElement.addEventListener('click', () => handleCardClick(card));
      
      cardsContainer.appendChild(cardElement);
    });
    
    listElement.appendChild(listHeader);
    listElement.appendChild(cardsContainer);
    
    elements.listsContainer.appendChild(listElement);
  });
  
  // Track API call
  window.api.trackApiCall('storage', null, 1000); // 1000 bytes for lists and cards data
}

// Handle card click
function handleCardClick(card) {
  currentCard = card;
  
  // Update UI
  elements.cardTitle.textContent = card.name;
  elements.cardDescription.textContent = card.description || 'No description';
  
  // Load mock attachments and comments
  loadMockAttachments(card.id);
  loadMockComments(card.id);
  
  // Hide summary if previously shown
  elements.summaryContainer.classList.add('hidden');
  
  // Show card view
  showCardView();
  
  // Track API call
  window.api.trackApiCall('storage', null, 200); // 200 bytes for card data
}

// Load mock attachments for a card
function loadMockAttachments(cardId) {
  const mockAttachments = [
    { id: 'att1', name: 'project-brief.pdf', type: 'application/pdf' },
    { id: 'att2', name: 'meeting-recording.mp3', type: 'audio/mpeg' }
  ];
  
  elements.attachmentsContainer.innerHTML = '';
  
  if (mockAttachments.length === 0) {
    elements.attachmentsContainer.textContent = 'No attachments';
    return;
  }
  
  mockAttachments.forEach(attachment => {
    const attachmentElement = document.createElement('div');
    attachmentElement.className = 'attachment';
    
    const icon = document.createElement('span');
    icon.className = 'attachment-icon';
    icon.textContent = attachment.type.includes('audio') ? '🔊' : 
                      attachment.type.includes('video') ? '🎬' : 
                      attachment.type.includes('pdf') ? '📄' : '📎';
    
    const name = document.createElement('span');
    name.className = 'attachment-name';
    name.textContent = attachment.name;
    
    attachmentElement.appendChild(icon);
    attachmentElement.appendChild(name);
    
    elements.attachmentsContainer.appendChild(attachmentElement);
  });
  
  // Track API call
  window.api.trackApiCall('storage', null, 300); // 300 bytes for attachments data
}

// Load mock comments for a card
function loadMockComments(cardId) {
  const mockComments = [
    { id: 'com1', text: 'I\'ve started working on this. Will update progress tomorrow.', author: 'John Doe', date: '2 days ago' },
    { id: 'com2', text: 'Found some interesting insights during research. We should focus on the top 3 competitors.', author: 'Jane Smith', date: '1 day ago' },
    { id: 'com3', text: 'The main bottleneck is getting access to competitor pricing data. Working on a solution.', author: 'John Doe', date: '5 hours ago' }
  ];
  
  elements.commentsContainer.innerHTML = '';
  
  if (mockComments.length === 0) {
    elements.commentsContainer.textContent = 'No comments';
    return;
  }
  
  mockComments.forEach(comment => {
    const commentElement = document.createElement('div');
    commentElement.className = 'comment';
    
    const header = document.createElement('div');
    header.className = 'comment-header';
    
    const author = document.createElement('span');
    author.className = 'comment-author';
    author.textContent = comment.author;
    
    const date = document.createElement('span');
    date.className = 'comment-date';
    date.textContent = comment.date;
    
    header.appendChild(author);
    header.appendChild(date);
    
    const text = document.createElement('div');
    text.className = 'comment-text';
    text.textContent = comment.text;
    
    commentElement.appendChild(header);
    commentElement.appendChild(text);
    
    elements.commentsContainer.appendChild(commentElement);
  });
  
  // Track API call
  window.api.trackApiCall('storage', null, 500); // 500 bytes for comments data
}

// Handle back to board button click
function handleBackToBoard() {
  showBoardView();
}

// Handle summarize button click
function handleSummarize() {
  // Check if user has enough credits
  if (userCredits < 1) {
    alert('Not enough credits. Please purchase more credits to use this feature.');
    return;
  }
  
  // Show loading state
  elements.btnSummarize.textContent = 'Summarizing...';
  elements.btnSummarize.disabled = true;
  
  // Simulate API call
  setTimeout(() => {
    // Generate mock summary
    const summary = generateMockSummary(currentCard);
    
    // Update UI
    elements.keyTakeaways.textContent = summary.keyTakeaways;
    elements.progressUpdate.textContent = summary.progressUpdate;
    elements.bottlenecks.textContent = summary.bottlenecks;
    elements.nextSteps.textContent = summary.nextSteps;
    
    // Set summary method and credits used
    elements.summaryMethod.textContent = 'Method: Rule-based';
    elements.summaryCredits.textContent = 'Credits used: 1';
    
    // Show summary container
    elements.summaryContainer.classList.remove('hidden');
    
    // Reset button
    elements.btnSummarize.textContent = 'Summarize Card';
    elements.btnSummarize.disabled = false;
    
    // Deduct credits
    userCredits -= 1;
    updateCreditsDisplay();
    
    // Track API call
    window.api.trackApiCall('summarization', 'rule');
  }, 1500);
}

// Handle transcribe button click
function handleTranscribe() {
  // Check if user has enough credits
  if (userCredits < 3) {
    alert('Not enough credits. Please purchase more credits to use this feature.');
    return;
  }
  
  // Show loading state
  elements.btnTranscribe.textContent = 'Transcribing...';
  elements.btnTranscribe.disabled = true;
  
  // Simulate API call
  setTimeout(() => {
    // Generate mock transcription
    alert('Transcription complete! Audio file has been transcribed and added to the card.');
    
    // Reset button
    elements.btnTranscribe.textContent = 'Transcribe Media';
    elements.btnTranscribe.disabled = false;
    
    // Deduct credits
    userCredits -= 3;
    updateCreditsDisplay();
    
    // Track API call
    window.api.trackApiCall('transcription', null, 180); // 3 minutes of audio
  }, 2000);
}

// Generate mock summary for a card
function generateMockSummary(card) {
  // In a real app, this would call the summarization service
  return {
    keyTakeaways: 'Need to analyze top 5 competitors in the market. Focus on pricing strategies, feature sets, and market positioning. Important to identify competitive advantages and weaknesses.',
    progressUpdate: 'Research has begun with initial data collection. About 30% complete. Found some interesting insights during the preliminary analysis.',
    bottlenecks: 'Access to competitor pricing data is limited. May need to purchase market research reports or find alternative data sources.',
    nextSteps: 'Complete data collection by end of week. Prepare comparative analysis report. Schedule meeting to present findings to the team.'
  };
}

// Show welcome screen
function showWelcomeScreen() {
  elements.welcomeScreen.classList.remove('hidden');
  elements.boardView.classList.add('hidden');
  elements.cardView.classList.add('hidden');
}

// Show board view
function showBoardView() {
  elements.welcomeScreen.classList.add('hidden');
  elements.boardView.classList.remove('hidden');
  elements.cardView.classList.add('hidden');
}

// Show card view
function showCardView() {
  elements.welcomeScreen.classList.add('hidden');
  elements.boardView.classList.add('hidden');
  elements.cardView.classList.remove('hidden');
}
