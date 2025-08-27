/**
 * Real-time Transcription Client
 * 
 * Client-side JavaScript for handling real-time transcription updates
 * via WebSocket connection with automatic reconnection and progress tracking.
 */

class RealtimeTranscriptionClient {
  constructor(options = {}) {
    this.options = {
      wsUrl: this.getWebSocketUrl(),
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      debug: false,
      ...options
    };
    
    this.ws = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.token = null;
    
    this.eventHandlers = new Map();
    this.activeJobs = new Map();
    this.subscribedJobs = new Set();
    
    this.log = this.options.debug ? console.log.bind(console, '[RT-Transcription]') : () => {};
    this.error = console.error.bind(console, '[RT-Transcription Error]');
  }

  /**
   * Get WebSocket URL
   */
  getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws/transcription`;
  }

  /**
   * Set authentication token
   */
  setToken(token) {
    this.token = token;
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    if (this.isConnected || this.isConnecting) {
      this.log('Already connected or connecting');
      return Promise.resolve();
    }

    if (!this.token) {
      return Promise.reject(new Error('Authentication token required'));
    }

    return new Promise((resolve, reject) => {
      this.isConnecting = true;
      
      const wsUrl = `${this.options.wsUrl}?token=${encodeURIComponent(this.token)}`;
      this.log('Connecting to:', wsUrl);
      
      try {
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          this.log('WebSocket connected');
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          
          this.startHeartbeat();
          this.emit('connected');
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };
        
        this.ws.onclose = (event) => {
          this.handleDisconnection(event);
        };
        
        this.ws.onerror = (error) => {
          this.error('WebSocket error:', error);
          this.isConnecting = false;
          
          if (!this.isConnected) {
            reject(error);
          }
          
          this.emit('error', error);
        };
        
        // Connection timeout
        setTimeout(() => {
          if (this.isConnecting) {
            this.isConnecting = false;
            this.ws.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000);
        
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    this.log('Disconnecting...');
    
    this.stopHeartbeat();
    this.stopReconnect();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.isConnecting = false;
    this.emit('disconnected');
  }

  /**
   * Handle incoming messages
   */
  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      this.log('Received message:', message);
      
      switch (message.type) {
        case 'connection_established':
          this.handleConnectionEstablished(message);
          break;
          
        case 'job_started':
          this.handleJobStarted(message);
          break;
          
        case 'job_progress':
          this.handleJobProgress(message);
          break;
          
        case 'job_completed':
          this.handleJobCompleted(message);
          break;
          
        case 'job_failed':
          this.handleJobFailed(message);
          break;
          
        case 'current_jobs':
          this.handleCurrentJobs(message);
          break;
          
        case 'job_status':
          this.handleJobStatus(message);
          break;
          
        case 'pong':
          this.log('Received pong');
          break;
          
        case 'error':
          this.error('Server error:', message.message);
          this.emit('server_error', message);
          break;
          
        case 'disconnect':
          this.log('Server requested disconnect:', message.reason);
          this.disconnect();
          break;
          
        case 'server_shutdown':
          this.log('Server shutting down');
          this.emit('server_shutdown', message);
          break;
          
        default:
          this.log('Unknown message type:', message.type);
      }
      
    } catch (error) {
      this.error('Error parsing message:', error);
    }
  }

  /**
   * Handle connection established
   */
  handleConnectionEstablished(message) {
    this.log('Connection established:', message.connectionId);
    this.emit('connection_established', message);
    
    // Request current jobs
    this.send({ type: 'get_active_jobs' });
  }

  /**
   * Handle job started
   */
  handleJobStarted(message) {
    const { jobId, job } = message;
    this.activeJobs.set(jobId, job);
    
    this.log(`Job started: ${jobId}`);
    this.emit('job_started', { jobId, job });
    
    // Update UI
    this.updateJobUI(jobId, {
      status: 'started',
      progress: 0,
      ...job
    });
  }

  /**
   * Handle job progress
   */
  handleJobProgress(message) {
    const { jobId, progress, status, details } = message;
    
    if (this.activeJobs.has(jobId)) {
      const job = this.activeJobs.get(jobId);
      job.progress = progress;
      job.status = status;
      Object.assign(job, details);
    }
    
    this.log(`Job progress: ${jobId} - ${progress}% (${status})`);
    this.emit('job_progress', { jobId, progress, status, details });
    
    // Update UI
    this.updateJobUI(jobId, {
      status,
      progress,
      ...details
    });
  }

  /**
   * Handle job completed
   */
  handleJobCompleted(message) {
    const { jobId, result, duration } = message;
    
    if (this.activeJobs.has(jobId)) {
      const job = this.activeJobs.get(jobId);
      job.status = 'completed';
      job.progress = 100;
      job.result = result;
      job.duration = duration;
    }
    
    this.log(`Job completed: ${jobId} in ${duration}ms`);
    this.emit('job_completed', { jobId, result, duration });
    
    // Update UI
    this.updateJobUI(jobId, {
      status: 'completed',
      progress: 100,
      result,
      duration
    });
    
    // Show completion notification
    this.showNotification(`Transcription completed in ${Math.round(duration / 1000)}s`, 'success');
  }

  /**
   * Handle job failed
   */
  handleJobFailed(message) {
    const { jobId, error, duration } = message;
    
    if (this.activeJobs.has(jobId)) {
      const job = this.activeJobs.get(jobId);
      job.status = 'failed';
      job.error = error;
      job.duration = duration;
    }
    
    this.error(`Job failed: ${jobId} - ${error.message}`);
    this.emit('job_failed', { jobId, error, duration });
    
    // Update UI
    this.updateJobUI(jobId, {
      status: 'failed',
      error,
      duration
    });
    
    // Show error notification
    this.showNotification(`Transcription failed: ${error.message}`, 'error');
  }

  /**
   * Handle current jobs
   */
  handleCurrentJobs(message) {
    const { jobs } = message;
    
    this.log(`Received ${jobs.length} current jobs`);
    
    jobs.forEach(job => {
      this.activeJobs.set(job.id, job);
      this.updateJobUI(job.id, job);
    });
    
    this.emit('current_jobs', { jobs });
  }

  /**
   * Handle job status
   */
  handleJobStatus(message) {
    const { jobId, status, progress, startTime, lastUpdate } = message;
    
    if (this.activeJobs.has(jobId)) {
      const job = this.activeJobs.get(jobId);
      job.status = status;
      job.progress = progress;
      job.startTime = startTime;
      job.lastUpdate = lastUpdate;
    }
    
    this.emit('job_status', { jobId, status, progress, startTime, lastUpdate });
    
    // Update UI
    this.updateJobUI(jobId, {
      status,
      progress,
      startTime,
      lastUpdate
    });
  }

  /**
   * Handle disconnection
   */
  handleDisconnection(event) {
    this.log('WebSocket disconnected:', event.code, event.reason);
    
    this.isConnected = false;
    this.isConnecting = false;
    this.stopHeartbeat();
    
    this.emit('disconnected', { code: event.code, reason: event.reason });
    
    // Attempt reconnection if not intentional
    if (event.code !== 1000 && this.reconnectAttempts < this.options.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectTimer) {
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.options.reconnectInterval * Math.min(this.reconnectAttempts, 5);
    
    this.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.log(`Reconnect attempt ${this.reconnectAttempts}`);
      
      this.connect().catch(error => {
        this.error('Reconnect failed:', error);
        
        if (this.reconnectAttempts < this.options.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else {
          this.error('Max reconnect attempts reached');
          this.emit('reconnect_failed');
        }
      });
    }, delay);
  }

  /**
   * Stop reconnection attempts
   */
  stopReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
  }

  /**
   * Start heartbeat
   */
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping' });
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Send message to server
   */
  send(message) {
    if (!this.isConnected || !this.ws) {
      this.error('Cannot send message: not connected');
      return false;
    }
    
    try {
      this.ws.send(JSON.stringify(message));
      this.log('Sent message:', message);
      return true;
    } catch (error) {
      this.error('Error sending message:', error);
      return false;
    }
  }

  /**
   * Subscribe to job updates
   */
  subscribeToJob(jobId) {
    this.subscribedJobs.add(jobId);
    return this.send({ type: 'subscribe_job', jobId });
  }

  /**
   * Unsubscribe from job updates
   */
  unsubscribeFromJob(jobId) {
    this.subscribedJobs.delete(jobId);
    return this.send({ type: 'unsubscribe_job', jobId });
  }

  /**
   * Get job status
   */
  getJobStatus(jobId) {
    return this.send({ type: 'get_job_status', jobId });
  }

  /**
   * Get active jobs
   */
  getActiveJobs() {
    return this.send({ type: 'get_active_jobs' });
  }

  /**
   * Update job UI
   */
  updateJobUI(jobId, jobData) {
    // Update progress bar
    const progressBar = document.querySelector(`[data-job-id="${jobId}"] .progress-bar`);
    if (progressBar) {
      progressBar.style.width = `${jobData.progress || 0}%`;
      progressBar.setAttribute('aria-valuenow', jobData.progress || 0);
    }

    // Update status text
    const statusElement = document.querySelector(`[data-job-id="${jobId}"] .job-status`);
    if (statusElement) {
      statusElement.textContent = this.formatStatus(jobData.status);
      statusElement.className = `job-status status-${jobData.status}`;
    }

    // Update progress text
    const progressText = document.querySelector(`[data-job-id="${jobId}"] .progress-text`);
    if (progressText) {
      progressText.textContent = `${jobData.progress || 0}%`;
    }

    // Update result if completed
    if (jobData.status === 'completed' && jobData.result) {
      const resultElement = document.querySelector(`[data-job-id="${jobId}"] .transcription-result`);
      if (resultElement) {
        resultElement.textContent = jobData.result.text;
        resultElement.style.display = 'block';
      }
    }

    // Update error if failed
    if (jobData.status === 'failed' && jobData.error) {
      const errorElement = document.querySelector(`[data-job-id="${jobId}"] .transcription-error`);
      if (errorElement) {
        errorElement.textContent = jobData.error.message;
        errorElement.style.display = 'block';
      }
    }

    // Update duration
    if (jobData.duration) {
      const durationElement = document.querySelector(`[data-job-id="${jobId}"] .job-duration`);
      if (durationElement) {
        durationElement.textContent = `${Math.round(jobData.duration / 1000)}s`;
      }
    }
  }

  /**
   * Format status for display
   */
  formatStatus(status) {
    const statusMap = {
      'queued': 'Queued',
      'processing': 'Processing',
      'completed': 'Completed',
      'failed': 'Failed',
      'started': 'Started'
    };
    
    return statusMap[status] || status;
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    // Try to use existing notification system
    if (window.showNotification) {
      window.showNotification(message, type);
      return;
    }

    // Fallback to browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Summarize This', {
        body: message,
        icon: '/favicon.ico'
      });
    }

    // Fallback to console
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  /**
   * Event handling
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event).add(handler);
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).delete(handler);
    }
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          this.error('Error in event handler:', error);
        }
      });
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      activeJobs: this.activeJobs.size,
      subscribedJobs: this.subscribedJobs.size
    };
  }

  /**
   * Get active jobs
   */
  getActiveJobsList() {
    return Array.from(this.activeJobs.values());
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RealtimeTranscriptionClient;
} else {
  window.RealtimeTranscriptionClient = RealtimeTranscriptionClient;
}

