/**
 * Enhanced Transcription Service
 * 
 * Advanced audio/video transcription service with asynchronous processing,
 * multiple provider support, file format conversion, and comprehensive monitoring.
 */

const EventEmitter = require('events');
const crypto = require('crypto');
const winston = require('winston');
const Queue = require('bull');
const Redis = require('redis');
const fs = require('fs').promises;
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const FormData = require('form-data');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/transcription-service.log' })
  ]
});

class EnhancedTranscriptionService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      enableCaching: options.enableCaching !== false,
      cacheExpiry: options.cacheExpiry || 7200, // 2 hours
      maxConcurrentJobs: options.maxConcurrentJobs || 3,
      jobTimeout: options.jobTimeout || 1800000, // 30 minutes
      retryAttempts: options.retryAttempts || 2,
      tempDir: options.tempDir || path.join(__dirname, '../../temp'),
      maxFileSize: options.maxFileSize || 100 * 1024 * 1024, // 100MB
      ...options
    };
    
    // Initialize Redis client for caching
    this.redisClient = null;
    if (this.options.enableCaching) {
      this.initializeRedis();
    }
    
    // Initialize job queue
    this.transcriptionQueue = new Queue('transcription', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      },
      defaultJobOptions: {
        removeOnComplete: 5,
        removeOnFail: 3,
        attempts: this.options.retryAttempts,
        backoff: {
          type: 'exponential',
          delay: 5000
        }
      }
    });
    
    // Transcription service providers
    this.providers = {
      whisper: {
        name: 'OpenAI Whisper',
        cost: 0.006, // $0.006 per minute
        maxFileSize: 25 * 1024 * 1024, // 25MB
        supportedFormats: ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm'],
        features: ['timestamps', 'language_detection', 'translation'],
        quality: 'excellent'
      },
      speechmatics: {
        name: 'Speechmatics',
        cost: 0.005, // $0.005 per minute
        maxFileSize: 100 * 1024 * 1024, // 100MB
        supportedFormats: ['mp3', 'wav', 'm4a', 'flac', 'ogg'],
        features: ['timestamps', 'speaker_diarization', 'punctuation'],
        quality: 'very good'
      },
      assemblyai: {
        name: 'AssemblyAI',
        cost: 0.007, // $0.007 per minute
        maxFileSize: 50 * 1024 * 1024, // 50MB
        supportedFormats: ['mp3', 'wav', 'm4a', 'flac'],
        features: ['timestamps', 'speaker_labels', 'sentiment_analysis'],
        quality: 'excellent'
      },
      deepgram: {
        name: 'Deepgram',
        cost: 0.004, // $0.004 per minute
        maxFileSize: 200 * 1024 * 1024, // 200MB
        supportedFormats: ['mp3', 'wav', 'm4a', 'flac', 'ogg', 'webm'],
        features: ['timestamps', 'diarization', 'keywords'],
        quality: 'very good'
      },
      rev: {
        name: 'Rev.ai',
        cost: 0.008, // $0.008 per minute
        maxFileSize: 100 * 1024 * 1024, // 100MB
        supportedFormats: ['mp3', 'wav', 'm4a', 'flac'],
        features: ['timestamps', 'speaker_names', 'custom_vocabulary'],
        quality: 'excellent'
      }
    };
    
    // Resource tracking
    this.resourceUsage = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalProcessingTime: 0,
      totalAudioDuration: 0,
      totalCost: 0,
      averageProcessingTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      queuedJobs: 0,
      activeJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      filesProcessed: 0,
      totalFileSize: 0
    };
    
    // Performance metrics
    this.performanceMetrics = {
      requestsPerMinute: 0,
      averageResponseTime: 0,
      errorRate: 0,
      cacheHitRate: 0,
      queueLength: 0,
      averageAccuracy: 0,
      providerPerformance: {}
    };
    
    this.setupQueueProcessors();
    this.startMetricsCollection();
    this.ensureTempDirectory();
  }

  async initializeRedis() {
    try {
      this.redisClient = Redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      });
      
      await this.redisClient.connect();
      logger.info('Redis client connected successfully');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.options.enableCaching = false;
    }
  }

  async ensureTempDirectory() {
    try {
      await fs.mkdir(this.options.tempDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create temp directory:', error);
    }
  }

  setupQueueProcessors() {
    // Process transcription jobs
    this.transcriptionQueue.process('transcribe', this.options.maxConcurrentJobs, async (job) => {
      const { filePath, service, options, requestId } = job.data;
      
      try {
        this.resourceUsage.activeJobs++;
        this.emit('job-started', { requestId, service });
        
        const startTime = Date.now();
        const result = await this.performTranscription(filePath, service, options, job);
        const processingTime = Date.now() - startTime;
        
        // Update metrics
        this.resourceUsage.totalProcessingTime += processingTime;
        this.resourceUsage.successfulRequests++;
        this.resourceUsage.completedJobs++;
        this.resourceUsage.activeJobs--;
        this.resourceUsage.filesProcessed++;
        
        this.emit('job-completed', { requestId, service, processingTime, result });
        
        return {
          ...result,
          processingTime,
          requestId
        };
        
      } catch (error) {
        this.resourceUsage.failedRequests++;
        this.resourceUsage.failedJobs++;
        this.resourceUsage.activeJobs--;
        
        this.emit('job-failed', { requestId, service, error: error.message });
        throw error;
      }
    });
    
    // Queue event handlers
    this.transcriptionQueue.on('completed', (job, result) => {
      logger.info('Transcription job completed', {
        jobId: job.id,
        requestId: result.requestId,
        service: result.service,
        duration: result.audioDuration,
        processingTime: result.processingTime
      });
    });
    
    this.transcriptionQueue.on('failed', (job, error) => {
      logger.error('Transcription job failed', {
        jobId: job.id,
        error: error.message,
        data: job.data
      });
    });
    
    this.transcriptionQueue.on('progress', (job, progress) => {
      this.emit('job-progress', {
        requestId: job.data.requestId,
        progress,
        service: job.data.service
      });
    });
  }

  async transcribe(filePath, service = 'auto', options = {}) {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    
    try {
      // Validate input
      if (!filePath) {
        throw new Error('File path is required');
      }
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (error) {
        throw new Error('File not found or not accessible');
      }
      
      // Get file info
      const fileStats = await fs.stat(filePath);
      const fileSize = fileStats.size;
      
      if (fileSize > this.options.maxFileSize) {
        throw new Error(`File size (${this.formatBytes(fileSize)}) exceeds maximum allowed size (${this.formatBytes(this.options.maxFileSize)})`);
      }
      
      // Auto-select service if needed
      if (service === 'auto') {
        service = await this.selectBestService(filePath, fileSize, options);
      }
      
      // Validate service
      if (!this.providers[service]) {
        throw new Error(`Invalid transcription service: ${service}`);
      }
      
      this.resourceUsage.totalRequests++;
      this.resourceUsage.totalFileSize += fileSize;
      
      // Check cache first
      let cacheKey = null;
      if (this.options.enableCaching) {
        cacheKey = await this.generateCacheKey(filePath, service, options);
        const cachedResult = await this.getCachedResult(cacheKey);
        
        if (cachedResult) {
          this.resourceUsage.cacheHits++;
          this.emit('cache-hit', { requestId, service });
          
          return {
            ...cachedResult,
            cached: true,
            requestId,
            processingTime: Date.now() - startTime
          };
        } else {
          this.resourceUsage.cacheMisses++;
        }
      }
      
      // Add to queue for asynchronous processing
      const job = await this.transcriptionQueue.add('transcribe', {
        filePath,
        service,
        options,
        requestId,
        cacheKey,
        fileSize
      }, {
        priority: this.getJobPriority(service, fileSize),
        delay: options.delay || 0
      });
      
      this.resourceUsage.queuedJobs++;
      
      // Return job information for tracking
      return {
        requestId,
        jobId: job.id,
        status: 'queued',
        service,
        fileSize,
        estimatedProcessingTime: await this.getEstimatedProcessingTime(filePath, service),
        queuePosition: await job.getPosition()
      };
      
    } catch (error) {
      this.resourceUsage.failedRequests++;
      logger.error('Transcription request failed', {
        requestId,
        service,
        error: error.message,
        filePath
      });
      throw error;
    }
  }

  async performTranscription(filePath, service, options = {}, job = null) {
    const startTime = Date.now();
    
    try {
      // Get audio duration and format info
      const audioInfo = await this.getAudioInfo(filePath);
      this.resourceUsage.totalAudioDuration += audioInfo.duration;
      
      // Update job progress
      if (job) job.progress(10);
      
      // Convert file if necessary
      const processedFilePath = await this.preprocessAudio(filePath, service, audioInfo);
      
      if (job) job.progress(30);
      
      // Perform transcription based on service
      let result;
      switch (service) {
        case 'whisper':
          result = await this.transcribeWithWhisper(processedFilePath, options, job);
          break;
        case 'speechmatics':
          result = await this.transcribeWithSpeechmatics(processedFilePath, options, job);
          break;
        case 'assemblyai':
          result = await this.transcribeWithAssemblyAI(processedFilePath, options, job);
          break;
        case 'deepgram':
          result = await this.transcribeWithDeepgram(processedFilePath, options, job);
          break;
        case 'rev':
          result = await this.transcribeWithRev(processedFilePath, options, job);
          break;
        default:
          throw new Error(`Unsupported transcription service: ${service}`);
      }
      
      if (job) job.progress(90);
      
      // Clean up processed file if different from original
      if (processedFilePath !== filePath) {
        try {
          await fs.unlink(processedFilePath);
        } catch (error) {
          logger.warn('Failed to clean up processed file:', error);
        }
      }
      
      const processingTime = Date.now() - startTime;
      const cost = this.calculateCost(audioInfo.duration, service);
      
      // Add metadata
      result.metadata = {
        service,
        processingTime,
        audioDuration: audioInfo.duration,
        audioFormat: audioInfo.format,
        fileSize: audioInfo.fileSize,
        cost,
        timestamp: new Date().toISOString(),
        ...result.metadata
      };
      
      // Update cost tracking
      this.resourceUsage.totalCost += cost;
      
      if (job) job.progress(100);
      
      return result;
      
    } catch (error) {
      logger.error(`${service} transcription failed`, {
        error: error.message,
        filePath,
        options
      });
      throw error;
    }
  }

  async getAudioInfo(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(new Error(`Failed to analyze audio file: ${err.message}`));
          return;
        }
        
        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
        if (!audioStream) {
          reject(new Error('No audio stream found in file'));
          return;
        }
        
        resolve({
          duration: parseFloat(metadata.format.duration) || 0,
          format: metadata.format.format_name,
          codec: audioStream.codec_name,
          sampleRate: audioStream.sample_rate,
          channels: audioStream.channels,
          bitrate: metadata.format.bit_rate,
          fileSize: metadata.format.size
        });
      });
    });
  }

  async preprocessAudio(filePath, service, audioInfo) {
    const provider = this.providers[service];
    const fileExt = path.extname(filePath).toLowerCase().substring(1);
    
    // Check if format is supported
    if (provider.supportedFormats.includes(fileExt)) {
      return filePath;
    }
    
    // Convert to supported format
    const outputPath = path.join(
      this.options.tempDir,
      `${crypto.randomUUID()}.${provider.supportedFormats[0]}`
    );
    
    return new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .audioCodec('libmp3lame')
        .audioBitrate(128)
        .audioChannels(1)
        .audioFrequency(16000)
        .format(provider.supportedFormats[0])
        .on('end', () => resolve(outputPath))
        .on('error', (err) => reject(new Error(`Audio conversion failed: ${err.message}`)))
        .save(outputPath);
    });
  }

  async transcribeWithWhisper(filePath, options = {}, job = null) {
    try {
      const {
        language = 'auto',
        model = 'whisper-1',
        response_format = 'verbose_json',
        temperature = 0,
        timestamp_granularities = ['segment']
      } = options;
      
      const formData = new FormData();
      formData.append('file', await fs.readFile(filePath), path.basename(filePath));
      formData.append('model', model);
      formData.append('response_format', response_format);
      formData.append('temperature', temperature.toString());
      
      if (language !== 'auto') {
        formData.append('language', language);
      }
      
      if (timestamp_granularities) {
        timestamp_granularities.forEach(granularity => {
          formData.append('timestamp_granularities[]', granularity);
        });
      }
      
      const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders()
        },
        timeout: 300000 // 5 minutes
      });
      
      const result = response.data;
      
      // Track API usage
      this.emit('api-call', {
        provider: 'whisper',
        model,
        duration: result.duration || 0,
        cost: this.calculateCost(result.duration || 0, 'whisper')
      });
      
      return {
        text: result.text,
        language: result.language,
        duration: result.duration,
        segments: result.segments || [],
        words: result.words || [],
        service: 'whisper',
        confidence: this.calculateAverageConfidence(result.segments),
        metadata: {
          model,
          temperature,
          response_format
        }
      };
      
    } catch (error) {
      logger.error('Whisper transcription failed', { error: error.message });
      throw new Error(`Whisper transcription failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async transcribeWithSpeechmatics(filePath, options = {}, job = null) {
    try {
      // Speechmatics implementation would go here
      // For now, return a mock response
      const audioInfo = await this.getAudioInfo(filePath);
      
      return {
        text: 'Mock transcription from Speechmatics',
        language: 'en',
        duration: audioInfo.duration,
        segments: [],
        service: 'speechmatics',
        confidence: 0.85,
        metadata: {
          provider: 'speechmatics'
        }
      };
    } catch (error) {
      throw new Error(`Speechmatics transcription failed: ${error.message}`);
    }
  }

  async transcribeWithAssemblyAI(filePath, options = {}, job = null) {
    try {
      // AssemblyAI implementation would go here
      // For now, return a mock response
      const audioInfo = await this.getAudioInfo(filePath);
      
      return {
        text: 'Mock transcription from AssemblyAI',
        language: 'en',
        duration: audioInfo.duration,
        segments: [],
        service: 'assemblyai',
        confidence: 0.90,
        metadata: {
          provider: 'assemblyai'
        }
      };
    } catch (error) {
      throw new Error(`AssemblyAI transcription failed: ${error.message}`);
    }
  }

  async transcribeWithDeepgram(filePath, options = {}, job = null) {
    try {
      // Deepgram implementation would go here
      // For now, return a mock response
      const audioInfo = await this.getAudioInfo(filePath);
      
      return {
        text: 'Mock transcription from Deepgram',
        language: 'en',
        duration: audioInfo.duration,
        segments: [],
        service: 'deepgram',
        confidence: 0.88,
        metadata: {
          provider: 'deepgram'
        }
      };
    } catch (error) {
      throw new Error(`Deepgram transcription failed: ${error.message}`);
    }
  }

  async transcribeWithRev(filePath, options = {}, job = null) {
    try {
      // Rev.ai implementation would go here
      // For now, return a mock response
      const audioInfo = await this.getAudioInfo(filePath);
      
      return {
        text: 'Mock transcription from Rev.ai',
        language: 'en',
        duration: audioInfo.duration,
        segments: [],
        service: 'rev',
        confidence: 0.92,
        metadata: {
          provider: 'rev'
        }
      };
    } catch (error) {
      throw new Error(`Rev.ai transcription failed: ${error.message}`);
    }
  }

  async selectBestService(filePath, fileSize, options = {}) {
    // Simple service selection logic
    // In production, this would be more sophisticated
    
    const fileExt = path.extname(filePath).toLowerCase().substring(1);
    const audioInfo = await this.getAudioInfo(filePath);
    
    // Filter services by file size and format support
    const suitableServices = Object.entries(this.providers).filter(([service, provider]) => {
      return fileSize <= provider.maxFileSize && provider.supportedFormats.includes(fileExt);
    });
    
    if (suitableServices.length === 0) {
      throw new Error('No suitable transcription service found for this file');
    }
    
    // Select based on cost and quality
    if (audioInfo.duration > 600) { // > 10 minutes, prioritize cost
      return suitableServices.sort(([,a], [,b]) => a.cost - b.cost)[0][0];
    } else { // Short audio, prioritize quality
      const qualityOrder = { excellent: 3, 'very good': 2, good: 1, basic: 0 };
      return suitableServices.sort(([,a], [,b]) => 
        qualityOrder[b.quality] - qualityOrder[a.quality]
      )[0][0];
    }
  }

  calculateCost(durationInSeconds, service) {
    const provider = this.providers[service];
    if (!provider) return 0;
    
    const durationInMinutes = Math.ceil(durationInSeconds / 60);
    return durationInMinutes * provider.cost;
  }

  calculateAverageConfidence(segments) {
    if (!segments || segments.length === 0) return 0.8; // Default confidence
    
    const confidences = segments
      .map(segment => segment.confidence || segment.avg_logprob || 0.8)
      .filter(conf => conf > 0);
    
    return confidences.length > 0 
      ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
      : 0.8;
  }

  async generateCacheKey(filePath, service, options) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      const optionsHash = crypto.createHash('sha256').update(JSON.stringify({ service, options })).digest('hex');
      return `transcription:${fileHash}:${optionsHash}`;
    } catch (error) {
      logger.warn('Failed to generate cache key', { error: error.message });
      return null;
    }
  }

  async getCachedResult(cacheKey) {
    if (!this.redisClient || !cacheKey) return null;
    
    try {
      const cached = await this.redisClient.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.warn('Cache retrieval failed', { error: error.message });
      return null;
    }
  }

  async cacheResult(cacheKey, result) {
    if (!this.redisClient || !cacheKey) return;
    
    try {
      await this.redisClient.setEx(cacheKey, this.options.cacheExpiry, JSON.stringify(result));
    } catch (error) {
      logger.warn('Cache storage failed', { error: error.message });
    }
  }

  getJobPriority(service, fileSize) {
    // Higher priority for smaller files and premium services
    const servicePriority = {
      whisper: 10,
      assemblyai: 9,
      rev: 8,
      speechmatics: 7,
      deepgram: 6
    };
    
    const sizePriority = fileSize < 10 * 1024 * 1024 ? 5 : 0; // Boost for files < 10MB
    
    return (servicePriority[service] || 5) + sizePriority;
  }

  async getEstimatedProcessingTime(filePath, service) {
    try {
      const audioInfo = await this.getAudioInfo(filePath);
      const baseTimes = {
        whisper: 0.3, // 30% of audio duration
        speechmatics: 0.4,
        assemblyai: 0.5,
        deepgram: 0.2,
        rev: 0.6
      };
      
      const baseTime = baseTimes[service] || 0.4;
      return Math.round(audioInfo.duration * baseTime * 1000); // Return in milliseconds
    } catch (error) {
      return 60000; // Default 1 minute
    }
  }

  getCreditCost(service, durationInMinutes = 1) {
    const provider = this.providers[service];
    if (!provider) return 5; // Default cost
    
    // Convert dollar cost to credits (assuming $0.001 per credit)
    const dollarCost = durationInMinutes * provider.cost;
    return Math.ceil(dollarCost * 1000);
  }

  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  startMetricsCollection() {
    setInterval(() => {
      this.updatePerformanceMetrics();
    }, 60000); // Update every minute
  }

  updatePerformanceMetrics() {
    // Calculate requests per minute (simplified)
    this.performanceMetrics.requestsPerMinute = this.resourceUsage.totalRequests;
    
    // Calculate average response time
    if (this.resourceUsage.successfulRequests > 0) {
      this.performanceMetrics.averageResponseTime = 
        this.resourceUsage.totalProcessingTime / this.resourceUsage.successfulRequests;
    }
    
    // Calculate error rate
    if (this.resourceUsage.totalRequests > 0) {
      this.performanceMetrics.errorRate = 
        this.resourceUsage.failedRequests / this.resourceUsage.totalRequests;
    }
    
    // Calculate cache hit rate
    const totalCacheRequests = this.resourceUsage.cacheHits + this.resourceUsage.cacheMisses;
    if (totalCacheRequests > 0) {
      this.performanceMetrics.cacheHitRate = this.resourceUsage.cacheHits / totalCacheRequests;
    }
    
    // Get queue length
    this.transcriptionQueue.getWaiting().then(jobs => {
      this.performanceMetrics.queueLength = jobs.length;
    });
  }

  async getJobStatus(requestId) {
    try {
      const jobs = await this.transcriptionQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
      const job = jobs.find(j => j.data.requestId === requestId);
      
      if (!job) {
        return { status: 'not_found' };
      }
      
      const status = await job.getState();
      const progress = job.progress();
      
      return {
        status,
        progress,
        data: job.returnvalue,
        error: job.failedReason,
        createdAt: job.timestamp,
        processedAt: job.processedOn,
        finishedAt: job.finishedOn
      };
    } catch (error) {
      logger.error('Failed to get job status', { requestId, error: error.message });
      return { status: 'error', error: error.message };
    }
  }

  getResourceUsage() {
    return {
      ...this.resourceUsage,
      performanceMetrics: this.performanceMetrics,
      queueStats: {
        waiting: this.resourceUsage.queuedJobs,
        active: this.resourceUsage.activeJobs,
        completed: this.resourceUsage.completedJobs,
        failed: this.resourceUsage.failedJobs
      },
      providers: Object.keys(this.providers)
    };
  }

  async healthCheck() {
    try {
      const queueHealth = await this.transcriptionQueue.isReady();
      const redisHealth = this.redisClient ? await this.redisClient.ping() === 'PONG' : false;
      
      return {
        status: 'healthy',
        queue: queueHealth ? 'connected' : 'disconnected',
        cache: redisHealth ? 'connected' : 'disconnected',
        providers: Object.keys(this.providers),
        resourceUsage: this.resourceUsage
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  async cleanup() {
    try {
      await this.transcriptionQueue.close();
      if (this.redisClient) {
        await this.redisClient.quit();
      }
      
      // Clean up temp files
      try {
        const tempFiles = await fs.readdir(this.options.tempDir);
        await Promise.all(
          tempFiles.map(file => 
            fs.unlink(path.join(this.options.tempDir, file)).catch(() => {})
          )
        );
      } catch (error) {
        logger.warn('Failed to clean up temp files', { error: error.message });
      }
      
      logger.info('Transcription service cleaned up successfully');
    } catch (error) {
      logger.error('Cleanup failed', { error: error.message });
    }
  }
}

module.exports = EnhancedTranscriptionService;

