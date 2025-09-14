/**
 * Enhanced Summarize This Application
 * 
 * Modern, interactive JavaScript application with comprehensive UI/UX features,
 * real-time updates, and seamless integration with backend services.
 */

class SummarizeThisApp {
    constructor() {
        this.currentTab = 'summarize';
        this.isProcessing = false;
        this.resourceMonitorVisible = false;
        this.jobQueue = new Map();
        this.results = [];
        this.creditBalance = 150;
        
        // Configuration
        this.config = {
            maxFileSize: 100 * 1024 * 1024, // 100MB
            supportedAudioFormats: ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac'],
            supportedVideoFormats: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'],
            supportedTextFormats: ['txt', 'md', 'rtf', 'doc', 'docx', 'pdf'],
            pollingInterval: 2000, // 2 seconds
            resourceUpdateInterval: 5000 // 5 seconds
        };
        
        // Resource monitoring data
        this.resourceData = {
            cpu: 0,
            memory: 0,
            costPerHour: 0,
            totalCost: 0,
            requestsToday: 0
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeTooltips();
        this.startResourceMonitoring();
        this.loadUserPreferences();
        this.updateCreditBalance();
        
        // Initialize drag and drop
        this.initializeDragAndDrop();
        
        // Start periodic updates
        this.startPeriodicUpdates();
        
        console.log('Summarize This App initialized successfully');
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.dataset.target;
                this.switchTab(target);
            });
        });

        // Navigation links
        document.querySelectorAll('.nav-link[data-tab]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = e.currentTarget.dataset.tab;
                this.handleNavigation(tab);
            });
        });

        // Text summarization form
        const summarizeForm = document.getElementById('summarize-form');
        if (summarizeForm) {
            summarizeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleTextSummarization();
            });
        }

        // Transcription form
        const transcribeForm = document.getElementById('transcribe-form');
        if (transcribeForm) {
            transcribeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleTranscription();
            });
        }

        // File input
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelection(e.target.files[0]);
            });
        }

        // Text input character counter
        const textInput = document.getElementById('text-input');
        if (textInput) {
            textInput.addEventListener('input', (e) => {
                this.updateCharacterCount(e.target.value.length);
            });
            
            // Auto-resize textarea
            textInput.addEventListener('input', (e) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
            });
        }

        // Clear buttons
        document.getElementById('clear-text-btn')?.addEventListener('click', () => {
            this.clearTextInput();
        });

        document.getElementById('clear-file-btn')?.addEventListener('click', () => {
            this.clearFileInput();
        });

        document.getElementById('remove-file-btn')?.addEventListener('click', () => {
            this.clearFileInput();
        });

        // Resource monitor
        document.getElementById('resource-monitor-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleResourceWidget();
        });

        document.getElementById('close-widget-btn')?.addEventListener('click', () => {
            this.hideResourceWidget();
        });

        document.getElementById('full-dashboard-btn')?.addEventListener('click', () => {
            this.openResourceDashboard();
        });

        // Results management
        document.getElementById('export-results-btn')?.addEventListener('click', () => {
            this.exportResults();
        });

        document.getElementById('clear-results-btn')?.addEventListener('click', () => {
            this.clearResults();
        });

        // Method selection change
        const summaryMethod = document.getElementById('summary-method');
        if (summaryMethod) {
            summaryMethod.addEventListener('change', (e) => {
                this.updateCostEstimate('text', e.target.value);
            });
        }

        const transcriptionService = document.getElementById('transcription-service');
        if (transcriptionService) {
            transcriptionService.addEventListener('change', (e) => {
                this.updateTranscriptionCostEstimate();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Window events
        window.addEventListener('beforeunload', (e) => {
            if (this.isProcessing) {
                e.preventDefault();
                e.returnValue = 'Processing is in progress. Are you sure you want to leave?';
            }
        });

        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });
    }

    initializeTooltips() {
        // Initialize Bootstrap tooltips
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    initializeDragAndDrop() {
        const uploadArea = document.getElementById('file-upload-area');
        const textInput = document.getElementById('text-input');

        if (uploadArea) {
            // File upload area drag and drop
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });

            uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFileSelection(files[0]);
                }
            });

            uploadArea.addEventListener('click', () => {
                document.getElementById('file-input').click();
            });
        }

        if (textInput) {
            // Text input drag and drop for text files
            textInput.addEventListener('dragover', (e) => {
                e.preventDefault();
                textInput.classList.add('dragover');
            });

            textInput.addEventListener('dragleave', (e) => {
                e.preventDefault();
                textInput.classList.remove('dragover');
            });

            textInput.addEventListener('drop', (e) => {
                e.preventDefault();
                textInput.classList.remove('dragover');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleTextFileUpload(files[0]);
                }
            });
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-target="${tabName}"]`).classList.add('active');

        // Update content sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        this.currentTab = tabName;
        
        // Trigger animations
        this.animateTabSwitch(tabName);
        
        // Update URL without page reload
        history.pushState({ tab: tabName }, '', `#${tabName}`);
    }

    animateTabSwitch(tabName) {
        const activeSection = document.getElementById(tabName);
        activeSection.style.opacity = '0';
        activeSection.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            activeSection.style.transition = 'all 0.3s ease';
            activeSection.style.opacity = '1';
            activeSection.style.transform = 'translateY(0)';
        }, 50);
    }

    handleNavigation(tab) {
        // Update nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

        // Handle different navigation actions
        switch (tab) {
            case 'home':
                this.switchTab('summarize');
                break;
            case 'history':
                this.showHistory();
                break;
            case 'settings':
                this.showSettings();
                break;
        }
    }

    async handleTextSummarization() {
        const textInput = document.getElementById('text-input');
        const method = document.getElementById('summary-method').value;
        const length = document.getElementById('summary-length').value;
        
        const text = textInput.value.trim();
        
        if (!text) {
            this.showNotification('Please enter text to summarize', 'warning');
            return;
        }

        if (text.length < 50) {
            this.showNotification('Text is too short for meaningful summarization', 'warning');
            return;
        }

        // Get focus areas
        const focusAreas = [];
        document.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
            focusAreas.push(checkbox.value);
        });

        // Check credit balance
        const creditCost = this.getCreditCost(method, text.length);
        if (this.creditBalance < creditCost) {
            this.showNotification('Insufficient credits. Please purchase more credits.', 'error');
            return;
        }

        this.isProcessing = true;
        this.updateProcessingState(true, 'Analyzing text...');

        try {
            const requestData = {
                text,
                method,
                options: {
                    maxLength: this.getLengthLimit(length),
                    focusAreas,
                    style: 'professional'
                }
            };

            const response = await this.makeAPIRequest('/api/summarize', 'POST', requestData);
            
            if (response.status === 'queued') {
                // Handle asynchronous processing
                this.trackJob(response.requestId, 'summarization', requestData);
                this.showNotification('Summarization started. You will be notified when complete.', 'info');
            } else {
                // Handle synchronous response
                this.handleSummarizationResult(response);
            }

            // Deduct credits
            this.creditBalance -= creditCost;
            this.updateCreditBalance();

        } catch (error) {
            console.error('Summarization error:', error);
            this.showNotification('Summarization failed: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
            this.updateProcessingState(false);
        }
    }

    async handleTranscription() {
        const fileInput = document.getElementById('file-input');
        const service = document.getElementById('transcription-service').value;
        const language = document.getElementById('transcription-language').value;
        
        if (!fileInput.files[0]) {
            this.showNotification('Please select an audio or video file', 'warning');
            return;
        }

        const file = fileInput.files[0];
        
        // Validate file
        if (!this.validateFile(file)) {
            return;
        }

        // Get additional options
        const options = {
            language: language !== 'auto' ? language : undefined,
            timestamps: document.getElementById('timestamps').checked,
            speakerLabels: document.getElementById('speaker-labels').checked,
            punctuation: document.getElementById('punctuation').checked,
            profanityFilter: document.getElementById('profanity-filter').checked
        };

        this.isProcessing = true;
        this.updateProcessingState(true, 'Uploading file...');

        try {
            // Upload file first
            const formData = new FormData();
            formData.append('file', file);
            formData.append('service', service);
            formData.append('options', JSON.stringify(options));

            const response = await this.makeAPIRequest('/api/transcribe', 'POST', formData, true);
            
            if (response.status === 'queued') {
                // Handle asynchronous processing
                this.trackJob(response.requestId, 'transcription', { file: file.name, service, options });
                this.showNotification('Transcription started. Processing may take several minutes.', 'info');
            } else {
                // Handle synchronous response
                this.handleTranscriptionResult(response);
            }

        } catch (error) {
            console.error('Transcription error:', error);
            this.showNotification('Transcription failed: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
            this.updateProcessingState(false);
        }
    }

    async handleFileSelection(file) {
        if (!file) return;

        if (file.size > this.config.maxFileSize) {
            this.showNotification(`File size (${this.formatBytes(file.size)}) exceeds maximum allowed size (${this.formatBytes(this.config.maxFileSize)})`, 'error');
            return;
        }

        // Show file info
        this.displayFileInfo(file);
        
        // Enable transcription button
        const transcribeBtn = document.getElementById('transcribe-btn');
        if (transcribeBtn) {
            transcribeBtn.disabled = false;
        }

        // Update cost estimate
        this.updateTranscriptionCostEstimate(file);

        // Auto-select best service
        this.autoSelectTranscriptionService(file);
    }

    async handleTextFileUpload(file) {
        if (!this.config.supportedTextFormats.includes(this.getFileExtension(file.name))) {
            this.showNotification('Unsupported text file format', 'warning');
            return;
        }

        try {
            const text = await this.readTextFile(file);
            document.getElementById('text-input').value = text;
            this.updateCharacterCount(text.length);
            this.showNotification('Text file loaded successfully', 'success');
        } catch (error) {
            this.showNotification('Failed to read text file: ' + error.message, 'error');
        }
    }

    displayFileInfo(file) {
        const fileInfo = document.getElementById('file-info');
        const fileName = document.getElementById('file-name');
        const fileSize = document.getElementById('file-size');

        if (fileInfo && fileName && fileSize) {
            fileName.textContent = file.name;
            fileSize.textContent = this.formatBytes(file.size);
            fileInfo.style.display = 'block';
        }
    }

    validateFile(file) {
        const extension = this.getFileExtension(file.name);
        const isAudio = this.config.supportedAudioFormats.includes(extension);
        const isVideo = this.config.supportedVideoFormats.includes(extension);

        if (!isAudio && !isVideo) {
            this.showNotification('Unsupported file format. Please use MP3, WAV, MP4, or other supported formats.', 'error');
            return false;
        }

        if (file.size > this.config.maxFileSize) {
            this.showNotification(`File size exceeds maximum limit of ${this.formatBytes(this.config.maxFileSize)}`, 'error');
            return false;
        }

        return true;
    }

    autoSelectTranscriptionService(file) {
        const extension = this.getFileExtension(file.name);
        const duration = this.estimateAudioDuration(file);
        
        let recommendedService = 'whisper'; // Default
        
        // Simple logic for service selection
        if (file.size < 10 * 1024 * 1024) { // < 10MB
            recommendedService = 'deepgram'; // Fastest for small files
        } else if (duration > 3600) { // > 1 hour
            recommendedService = 'deepgram'; // Most cost-effective for long audio
        } else {
            recommendedService = 'whisper'; // Best quality for medium files
        }

        const serviceSelect = document.getElementById('transcription-service');
        if (serviceSelect) {
            serviceSelect.value = recommendedService;
        }
    }

    updateCharacterCount(count) {
        const charCount = document.getElementById('char-count');
        if (charCount) {
            charCount.textContent = count.toLocaleString();
            
            // Color coding based on usage
            if (count > 45000) {
                charCount.style.color = 'var(--error-color)';
            } else if (count > 35000) {
                charCount.style.color = 'var(--warning-color)';
            } else {
                charCount.style.color = 'var(--text-secondary)';
            }
        }
    }

    updateCostEstimate(type, method, fileOrText = null) {
        if (type === 'text') {
            const textInput = document.getElementById('text-input');
            const text = textInput ? textInput.value : '';
            const cost = this.getCreditCost(method, text.length);
            
            // Update UI with cost estimate
            this.showCostEstimate(cost, 'credits');
        }
    }

    updateTranscriptionCostEstimate(file = null) {
        const costEstimateDiv = document.getElementById('cost-estimate');
        if (!costEstimateDiv) return;

        if (!file) {
            const fileInput = document.getElementById('file-input');
            file = fileInput?.files[0];
        }

        if (!file) {
            costEstimateDiv.innerHTML = `
                <div class="text-center text-muted">
                    <i class="fas fa-upload fa-2x mb-2"></i>
                    <p>Upload a file to see cost estimate</p>
                </div>
            `;
            return;
        }

        const service = document.getElementById('transcription-service').value;
        const duration = this.estimateAudioDuration(file);
        const cost = this.getTranscriptionCost(service, duration);

        costEstimateDiv.innerHTML = `
            <div class="text-center">
                <div class="mb-2">
                    <i class="fas fa-clock text-primary"></i>
                    <span class="ms-2">~${this.formatDuration(duration)}</span>
                </div>
                <div class="mb-2">
                    <i class="fas fa-dollar-sign text-success"></i>
                    <span class="ms-2">~$${cost.toFixed(3)}</span>
                </div>
                <small class="text-muted">Estimated cost</small>
            </div>
        `;
    }

    trackJob(requestId, type, data) {
        this.jobQueue.set(requestId, {
            id: requestId,
            type,
            data,
            status: 'queued',
            startTime: Date.now(),
            progress: 0
        });

        this.startJobPolling(requestId);
    }

    async startJobPolling(requestId) {
        const pollJob = async () => {
            try {
                const response = await this.makeAPIRequest(`/api/job-status/${requestId}`, 'GET');
                const job = this.jobQueue.get(requestId);
                
                if (!job) return; // Job was removed
                
                job.status = response.status;
                job.progress = response.progress || 0;
                
                this.updateJobProgress(requestId, job);
                
                if (response.status === 'completed') {
                    this.handleJobCompletion(requestId, response.data);
                    this.jobQueue.delete(requestId);
                } else if (response.status === 'failed') {
                    this.handleJobFailure(requestId, response.error);
                    this.jobQueue.delete(requestId);
                } else {
                    // Continue polling
                    setTimeout(pollJob, this.config.pollingInterval);
                }
                
            } catch (error) {
                console.error('Job polling error:', error);
                setTimeout(pollJob, this.config.pollingInterval * 2); // Backoff
            }
        };

        pollJob();
    }

    updateJobProgress(requestId, job) {
        // Update UI with job progress
        this.showJobProgress(job);
    }

    showJobProgress(job) {
        const progressHtml = `
            <div class="job-progress mb-3 p-3 bg-dark rounded" data-job-id="${job.id}">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="fw-medium">${job.type === 'summarization' ? 'Text Summarization' : 'Audio Transcription'}</span>
                    <span class="status-badge ${job.status}">${job.status}</span>
                </div>
                <div class="progress mb-2">
                    <div class="progress-bar" style="width: ${job.progress}%"></div>
                </div>
                <small class="text-muted">Started ${this.formatTimeAgo(job.startTime)}</small>
            </div>
        `;

        // Add or update progress display
        let progressContainer = document.getElementById('job-progress-container');
        if (!progressContainer) {
            progressContainer = document.createElement('div');
            progressContainer.id = 'job-progress-container';
            progressContainer.className = 'mt-4';
            
            const resultsContainer = document.getElementById('results-container');
            if (resultsContainer) {
                resultsContainer.parentNode.insertBefore(progressContainer, resultsContainer);
            }
        }

        const existingProgress = progressContainer.querySelector(`[data-job-id="${job.id}"]`);
        if (existingProgress) {
            existingProgress.outerHTML = progressHtml;
        } else {
            progressContainer.innerHTML += progressHtml;
        }

        progressContainer.style.display = 'block';
    }

    handleJobCompletion(requestId, result) {
        const job = this.jobQueue.get(requestId);
        if (!job) return;

        // Remove progress indicator
        const progressElement = document.querySelector(`[data-job-id="${requestId}"]`);
        if (progressElement) {
            progressElement.remove();
        }

        // Handle result based on job type
        if (job.type === 'summarization') {
            this.handleSummarizationResult(result);
        } else if (job.type === 'transcription') {
            this.handleTranscriptionResult(result);
        }

        this.showNotification(`${job.type} completed successfully!`, 'success');
    }

    handleJobFailure(requestId, error) {
        const job = this.jobQueue.get(requestId);
        if (!job) return;

        // Remove progress indicator
        const progressElement = document.querySelector(`[data-job-id="${requestId}"]`);
        if (progressElement) {
            progressElement.remove();
        }

        this.showNotification(`${job.type} failed: ${error}`, 'error');
    }

    handleSummarizationResult(result) {
        this.addResult({
            type: 'summarization',
            timestamp: new Date(),
            input: result.metadata?.inputLength ? `${result.metadata.inputLength} characters` : 'Text input',
            output: result.summary,
            method: result.method,
            confidence: result.confidence,
            keyTakeaways: result.keyTakeaways,
            metadata: result.metadata
        });

        this.showResults();
    }

    handleTranscriptionResult(result) {
        this.addResult({
            type: 'transcription',
            timestamp: new Date(),
            input: result.metadata?.fileSize ? `Audio file (${this.formatBytes(result.metadata.fileSize)})` : 'Audio file',
            output: result.text,
            service: result.service,
            confidence: result.confidence,
            language: result.language,
            duration: result.duration,
            segments: result.segments,
            metadata: result.metadata
        });

        this.showResults();
    }

    addResult(result) {
        result.id = Date.now() + Math.random();
        this.results.unshift(result);
        
        // Limit results to prevent memory issues
        if (this.results.length > 50) {
            this.results = this.results.slice(0, 50);
        }
    }

    showResults() {
        const resultsContainer = document.getElementById('results-container');
        const resultsContent = document.getElementById('results-content');
        
        if (!resultsContainer || !resultsContent) return;

        resultsContent.innerHTML = '';
        
        this.results.forEach(result => {
            const resultElement = this.createResultElement(result);
            resultsContent.appendChild(resultElement);
        });

        resultsContainer.style.display = 'block';
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }

    createResultElement(result) {
        const div = document.createElement('div');
        div.className = 'result-item fade-in';
        
        const typeIcon = result.type === 'summarization' ? 'fa-file-text' : 'fa-microphone';
        const typeLabel = result.type === 'summarization' ? 'Text Summarization' : 'Audio Transcription';
        
        div.innerHTML = `
            <div class="d-flex justify-content-between align-items-start mb-3">
                <div class="d-flex align-items-center">
                    <i class="fas ${typeIcon} text-primary me-2"></i>
                    <div>
                        <h6 class="mb-1">${typeLabel}</h6>
                        <small class="text-muted">${this.formatTimeAgo(result.timestamp)}</small>
                    </div>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-outline-primary copy-btn" data-text="${result.output}">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary export-btn" data-result-id="${result.id}">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </div>
            
            <div class="mb-3">
                <div class="row">
                    <div class="col-md-6">
                        <small class="text-muted">Input:</small>
                        <div class="small">${result.input}</div>
                    </div>
                    <div class="col-md-6">
                        <small class="text-muted">Method/Service:</small>
                        <div class="small">${result.method || result.service}</div>
                    </div>
                </div>
            </div>
            
            <div class="result-output">
                <small class="text-muted">Output:</small>
                <div class="mt-1 p-3 bg-dark rounded">
                    ${this.formatResultOutput(result)}
                </div>
            </div>
            
            ${this.createResultMetadata(result)}
        `;

        // Add event listeners
        div.querySelector('.copy-btn')?.addEventListener('click', (e) => {
            this.copyToClipboard(e.target.dataset.text);
        });

        div.querySelector('.export-btn')?.addEventListener('click', (e) => {
            this.exportSingleResult(result);
        });

        return div;
    }

    formatResultOutput(result) {
        let output = result.output;
        
        // Truncate long outputs
        if (output.length > 500) {
            output = output.substring(0, 500) + '...';
        }
        
        // Add line breaks for better readability
        output = output.replace(/\n/g, '<br>');
        
        return output;
    }

    createResultMetadata(result) {
        if (result.type === 'summarization' && result.keyTakeaways) {
            return `
                <div class="mt-3">
                    <small class="text-muted">Key Takeaways:</small>
                    <div class="mt-1">
                        ${result.keyTakeaways.mainPoints?.slice(0, 3).map(point => 
                            `<span class="badge bg-secondary me-1 mb-1">${point.substring(0, 50)}...</span>`
                        ).join('') || ''}
                    </div>
                </div>
            `;
        } else if (result.type === 'transcription') {
            return `
                <div class="mt-3">
                    <div class="row">
                        <div class="col-md-4">
                            <small class="text-muted">Language:</small>
                            <div class="small">${result.language || 'Auto-detected'}</div>
                        </div>
                        <div class="col-md-4">
                            <small class="text-muted">Duration:</small>
                            <div class="small">${this.formatDuration(result.duration || 0)}</div>
                        </div>
                        <div class="col-md-4">
                            <small class="text-muted">Confidence:</small>
                            <div class="small">${((result.confidence || 0) * 100).toFixed(1)}%</div>
                        </div>
                    </div>
                </div>
            `;
        }
        return '';
    }

    // Resource monitoring
    startResourceMonitoring() {
        if (window.electronAPI) {
            // Electron environment
            window.electronAPI.onResourceMetricsUpdated((data) => {
                this.updateResourceData(data);
            });

            window.electronAPI.startResourceMonitoring();
        } else {
            // Web environment - simulate resource monitoring
            this.simulateResourceMonitoring();
        }
    }

    simulateResourceMonitoring() {
        setInterval(() => {
            this.resourceData = {
                cpu: Math.random() * 100,
                memory: Math.random() * 100,
                costPerHour: Math.random() * 0.1,
                totalCost: this.resourceData.totalCost + (Math.random() * 0.001),
                requestsToday: this.resourceData.requestsToday
            };
            
            this.updateResourceWidget();
        }, this.config.resourceUpdateInterval);
    }

    updateResourceData(data) {
        this.resourceData = { ...this.resourceData, ...data };
        this.updateResourceWidget();
    }

    updateResourceWidget() {
        const cpuUsage = document.getElementById('cpu-usage');
        const memoryUsage = document.getElementById('memory-usage');
        const costPerHour = document.getElementById('cost-per-hour');

        if (cpuUsage) cpuUsage.textContent = `${this.resourceData.cpu.toFixed(1)}%`;
        if (memoryUsage) memoryUsage.textContent = `${this.resourceData.memory.toFixed(1)}%`;
        if (costPerHour) costPerHour.textContent = `$${this.resourceData.costPerHour.toFixed(4)}`;
    }

    toggleResourceWidget() {
        this.resourceMonitorVisible = !this.resourceMonitorVisible;
        const widget = document.getElementById('resource-widget');
        
        if (widget) {
            if (this.resourceMonitorVisible) {
                widget.classList.add('visible');
            } else {
                widget.classList.remove('visible');
            }
        }
    }

    hideResourceWidget() {
        this.resourceMonitorVisible = false;
        const widget = document.getElementById('resource-widget');
        if (widget) {
            widget.classList.remove('visible');
        }
    }

    openResourceDashboard() {
        if (window.electronAPI) {
            window.electronAPI.showResourceDashboard();
        } else {
            window.open('/resource-dashboard.html', '_blank');
        }
    }

    // Utility functions
    updateProcessingState(isProcessing, message = '') {
        const submitBtns = document.querySelectorAll('button[type="submit"]');
        
        submitBtns.forEach(btn => {
            if (isProcessing) {
                btn.disabled = true;
                btn.innerHTML = `
                    <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                    ${message || 'Processing...'}
                `;
            } else {
                btn.disabled = false;
                // Restore original button text
                if (btn.id === 'transcribe-btn') {
                    btn.innerHTML = '<i class="fas fa-play me-2"></i>Start Transcription';
                } else {
                    btn.innerHTML = '<i class="fas fa-magic me-2"></i>Summarize Text';
                }
            }
        });
    }

    updateCreditBalance() {
        const creditBalanceEl = document.getElementById('credit-balance');
        if (creditBalanceEl) {
            creditBalanceEl.textContent = this.creditBalance;
        }
        
        // Update progress bar
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) {
            const percentage = Math.min((this.creditBalance / 200) * 100, 100);
            progressBar.style.width = `${percentage}%`;
        }
    }

    getCreditCost(method, textLength = 1000) {
        const baseCosts = {
            ruleBased: 1,
            mlBased: 3,
            aiPowered: 10,
            hybrid: 6
        };
        
        const baseCost = baseCosts[method] || 1;
        const lengthMultiplier = Math.max(1, Math.ceil(textLength / 1000));
        
        return baseCost * lengthMultiplier;
    }

    getTranscriptionCost(service, durationInSeconds) {
        const costs = {
            whisper: 0.006,
            speechmatics: 0.005,
            assemblyai: 0.007,
            deepgram: 0.004,
            rev: 0.008
        };
        
        const costPerMinute = costs[service] || 0.006;
        const durationInMinutes = Math.ceil(durationInSeconds / 60);
        
        return durationInMinutes * costPerMinute;
    }

    getLengthLimit(lengthSetting) {
        const limits = {
            short: 200,
            medium: 400,
            long: 600
        };
        
        return limits[lengthSetting] || 400;
    }

    estimateAudioDuration(file) {
        // Rough estimation based on file size and format
        // This is a simplified calculation
        const avgBitrate = 128; // kbps
        const durationInSeconds = (file.size * 8) / (avgBitrate * 1000);
        
        return Math.max(60, durationInSeconds); // Minimum 1 minute
    }

    getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    formatTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInSeconds = Math.floor((now - time) / 1000);
        
        if (diffInSeconds < 60) return 'just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        return time.toLocaleDateString();
    }

    async readTextFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    async makeAPIRequest(url, method, data = null, isFormData = false) {
        const options = {
            method,
            headers: {}
        };

        if (data) {
            if (isFormData) {
                options.body = data;
            } else {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(data);
            }
        }

        const response = await fetch(url, options);
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        return response.json();
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = `
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            max-width: 500px;
        `;
        
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Copied to clipboard!', 'success');
        } catch (error) {
            console.error('Copy failed:', error);
            this.showNotification('Failed to copy to clipboard', 'error');
        }
    }

    clearTextInput() {
        const textInput = document.getElementById('text-input');
        if (textInput) {
            textInput.value = '';
            this.updateCharacterCount(0);
        }
    }

    clearFileInput() {
        const fileInput = document.getElementById('file-input');
        const fileInfo = document.getElementById('file-info');
        const transcribeBtn = document.getElementById('transcribe-btn');
        
        if (fileInput) fileInput.value = '';
        if (fileInfo) fileInfo.style.display = 'none';
        if (transcribeBtn) transcribeBtn.disabled = true;
        
        this.updateTranscriptionCostEstimate();
    }

    clearResults() {
        this.results = [];
        const resultsContainer = document.getElementById('results-container');
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }
    }

    exportResults() {
        if (this.results.length === 0) {
            this.showNotification('No results to export', 'warning');
            return;
        }

        const exportData = {
            exportDate: new Date().toISOString(),
            results: this.results
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `summarize-this-results-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        
        this.showNotification('Results exported successfully!', 'success');
    }

    exportSingleResult(result) {
        const blob = new Blob([result.output], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${result.type}-result-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + Enter to submit forms
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            if (this.currentTab === 'summarize') {
                document.getElementById('summarize-form')?.dispatchEvent(new Event('submit'));
            } else if (this.currentTab === 'transcribe') {
                document.getElementById('transcribe-form')?.dispatchEvent(new Event('submit'));
            }
        }
        
        // Escape to clear inputs
        if (e.key === 'Escape') {
            this.clearTextInput();
            this.clearFileInput();
        }
    }

    handleWindowResize() {
        // Handle responsive adjustments
        const resourceWidget = document.getElementById('resource-widget');
        if (resourceWidget && window.innerWidth < 768) {
            resourceWidget.style.width = 'calc(100% - 2rem)';
        } else if (resourceWidget) {
            resourceWidget.style.width = '300px';
        }
    }

    loadUserPreferences() {
        // Load preferences from localStorage
        const preferences = localStorage.getItem('summarize-this-preferences');
        if (preferences) {
            try {
                const prefs = JSON.parse(preferences);
                // Apply preferences
                if (prefs.theme) {
                    document.body.setAttribute('data-theme', prefs.theme);
                }
            } catch (error) {
                console.warn('Failed to load preferences:', error);
            }
        }
    }

    saveUserPreferences() {
        const preferences = {
            theme: document.body.getAttribute('data-theme') || 'dark',
            creditBalance: this.creditBalance
        };
        
        localStorage.setItem('summarize-this-preferences', JSON.stringify(preferences));
    }

    startPeriodicUpdates() {
        // Save preferences periodically
        setInterval(() => {
            this.saveUserPreferences();
        }, 30000); // Every 30 seconds
        
        // Update resource monitoring
        setInterval(() => {
            if (this.resourceMonitorVisible) {
                this.updateResourceWidget();
            }
        }, this.config.resourceUpdateInterval);
    }

    showHistory() {
        // Implementation for history view
        this.showNotification('History feature coming soon!', 'info');
    }

    showSettings() {
        // Implementation for settings view
        this.showNotification('Settings feature coming soon!', 'info');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.summarizeThisApp = new SummarizeThisApp();
});

// Handle browser back/forward navigation
window.addEventListener('popstate', (e) => {
    if (e.state && e.state.tab) {
        window.summarizeThisApp.switchTab(e.state.tab);
    }
});

