/**
 * Enhanced Summarization Service
 * 
 * Advanced text summarization service with asynchronous processing,
 * multiple AI providers, caching, and comprehensive resource tracking.
 */

const EventEmitter = require('events');
const crypto = require('crypto');
const winston = require('winston');
const Queue = require('bull');
const Redis = require('redis');
const { OpenAI } = require('openai');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/summarization-service.log' })
  ]
});

class EnhancedSummarizationService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      enableCaching: options.enableCaching !== false,
      cacheExpiry: options.cacheExpiry || 3600, // 1 hour
      maxConcurrentJobs: options.maxConcurrentJobs || 5,
      jobTimeout: options.jobTimeout || 300000, // 5 minutes
      retryAttempts: options.retryAttempts || 3,
      ...options
    };
    
    // Initialize Redis client for caching
    this.redisClient = null;
    if (this.options.enableCaching) {
      this.initializeRedis();
    }
    
    // Initialize job queue
    this.summarizationQueue = new Queue('summarization', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      },
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: this.options.retryAttempts,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    });
    
    // Initialize AI providers
    this.aiProviders = {
      openai: new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_API_BASE
      }),
      // Add other providers as needed
    };
    
    // Summarization methods configuration
    this.methods = {
      ruleBased: {
        cost: 1,
        processingTime: 'fast',
        quality: 'basic',
        description: 'Rule-based extraction using keyword frequency and sentence scoring'
      },
      mlBased: {
        cost: 3,
        processingTime: 'medium',
        quality: 'good',
        description: 'Machine learning-based summarization using TF-IDF and clustering'
      },
      aiPowered: {
        cost: 10,
        processingTime: 'slow',
        quality: 'excellent',
        description: 'AI-powered summarization using large language models'
      },
      hybrid: {
        cost: 6,
        processingTime: 'medium',
        quality: 'very good',
        description: 'Hybrid approach combining multiple methods for optimal results'
      }
    };
    
    // Resource tracking
    this.resourceUsage = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalProcessingTime: 0,
      totalCost: 0,
      averageProcessingTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      queuedJobs: 0,
      activeJobs: 0,
      completedJobs: 0,
      failedJobs: 0
    };
    
    // Performance metrics
    this.performanceMetrics = {
      requestsPerMinute: 0,
      averageResponseTime: 0,
      errorRate: 0,
      cacheHitRate: 0,
      queueLength: 0
    };
    
    this.setupQueueProcessors();
    this.startMetricsCollection();
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

  setupQueueProcessors() {
    // Process summarization jobs
    this.summarizationQueue.process('summarize', this.options.maxConcurrentJobs, async (job) => {
      const { text, method, options, requestId } = job.data;
      
      try {
        this.resourceUsage.activeJobs++;
        this.emit('job-started', { requestId, method });
        
        const startTime = Date.now();
        const result = await this.performSummarization(text, method, options);
        const processingTime = Date.now() - startTime;
        
        // Update metrics
        this.resourceUsage.totalProcessingTime += processingTime;
        this.resourceUsage.successfulRequests++;
        this.resourceUsage.completedJobs++;
        this.resourceUsage.activeJobs--;
        
        this.emit('job-completed', { requestId, method, processingTime, result });
        
        return {
          ...result,
          processingTime,
          requestId
        };
        
      } catch (error) {
        this.resourceUsage.failedRequests++;
        this.resourceUsage.failedJobs++;
        this.resourceUsage.activeJobs--;
        
        this.emit('job-failed', { requestId, method, error: error.message });
        throw error;
      }
    });
    
    // Queue event handlers
    this.summarizationQueue.on('completed', (job, result) => {
      logger.info('Summarization job completed', {
        jobId: job.id,
        requestId: result.requestId,
        processingTime: result.processingTime
      });
    });
    
    this.summarizationQueue.on('failed', (job, error) => {
      logger.error('Summarization job failed', {
        jobId: job.id,
        error: error.message,
        data: job.data
      });
    });
    
    this.summarizationQueue.on('stalled', (job) => {
      logger.warn('Summarization job stalled', {
        jobId: job.id,
        data: job.data
      });
    });
  }

  async summarize(text, method = 'ruleBased', options = {}) {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    
    try {
      // Validate input
      if (!text || typeof text !== 'string') {
        throw new Error('Invalid text input');
      }
      
      if (text.length < 10) {
        throw new Error('Text too short for summarization');
      }
      
      if (text.length > 100000) {
        throw new Error('Text too long for summarization');
      }
      
      if (!this.methods[method]) {
        throw new Error(`Invalid summarization method: ${method}`);
      }
      
      this.resourceUsage.totalRequests++;
      
      // Check cache first
      let cacheKey = null;
      if (this.options.enableCaching) {
        cacheKey = this.generateCacheKey(text, method, options);
        const cachedResult = await this.getCachedResult(cacheKey);
        
        if (cachedResult) {
          this.resourceUsage.cacheHits++;
          this.emit('cache-hit', { requestId, method });
          
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
      
      // For synchronous processing (fast methods)
      if (method === 'ruleBased' || options.sync) {
        const result = await this.performSummarization(text, method, options);
        const processingTime = Date.now() - startTime;
        
        // Cache the result
        if (this.options.enableCaching && cacheKey) {
          await this.cacheResult(cacheKey, result);
        }
        
        // Update metrics
        this.resourceUsage.successfulRequests++;
        this.resourceUsage.totalProcessingTime += processingTime;
        
        return {
          ...result,
          requestId,
          processingTime,
          cached: false
        };
      }
      
      // For asynchronous processing (slow methods)
      const job = await this.summarizationQueue.add('summarize', {
        text,
        method,
        options,
        requestId,
        cacheKey
      }, {
        priority: this.getJobPriority(method),
        delay: options.delay || 0
      });
      
      this.resourceUsage.queuedJobs++;
      
      // Return job information for tracking
      return {
        requestId,
        jobId: job.id,
        status: 'queued',
        method,
        estimatedProcessingTime: this.getEstimatedProcessingTime(text.length, method),
        queuePosition: await job.getPosition()
      };
      
    } catch (error) {
      this.resourceUsage.failedRequests++;
      logger.error('Summarization request failed', {
        requestId,
        method,
        error: error.message,
        textLength: text?.length
      });
      throw error;
    }
  }

  async performSummarization(text, method, options = {}) {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (method) {
        case 'ruleBased':
          result = await this.ruleBasedSummarization(text, options);
          break;
        case 'mlBased':
          result = await this.mlBasedSummarization(text, options);
          break;
        case 'aiPowered':
          result = await this.aiPoweredSummarization(text, options);
          break;
        case 'hybrid':
          result = await this.hybridSummarization(text, options);
          break;
        default:
          throw new Error(`Unsupported summarization method: ${method}`);
      }
      
      const processingTime = Date.now() - startTime;
      
      // Add metadata
      result.metadata = {
        method,
        processingTime,
        inputLength: text.length,
        outputLength: result.summary.length,
        compressionRatio: result.summary.length / text.length,
        timestamp: new Date().toISOString(),
        ...result.metadata
      };
      
      return result;
      
    } catch (error) {
      logger.error(`${method} summarization failed`, {
        error: error.message,
        textLength: text.length,
        options
      });
      throw error;
    }
  }

  async ruleBasedSummarization(text, options = {}) {
    const {
      maxLength = 200,
      sentenceCount = 3,
      keywordWeight = 1.0,
      positionWeight = 0.5
    } = options;
    
    // Tokenize into sentences
    const sentences = this.tokenizeSentences(text);
    
    if (sentences.length <= sentenceCount) {
      return {
        summary: text,
        keyTakeaways: this.extractKeyTakeaways(text),
        confidence: 1.0,
        method: 'ruleBased'
      };
    }
    
    // Calculate sentence scores
    const wordFreq = this.calculateWordFrequency(text);
    const sentenceScores = sentences.map((sentence, index) => {
      const words = sentence.toLowerCase().split(/\s+/);
      const keywordScore = words.reduce((score, word) => {
        return score + (wordFreq[word] || 0);
      }, 0) / words.length;
      
      const positionScore = 1 - (index / sentences.length);
      const lengthScore = Math.min(sentence.length / 100, 1);
      
      return {
        sentence,
        score: (keywordScore * keywordWeight) + (positionScore * positionWeight) + lengthScore,
        index
      };
    });
    
    // Select top sentences
    const topSentences = sentenceScores
      .sort((a, b) => b.score - a.score)
      .slice(0, sentenceCount)
      .sort((a, b) => a.index - b.index);
    
    const summary = topSentences.map(s => s.sentence).join(' ');
    
    return {
      summary: this.truncateToLength(summary, maxLength),
      keyTakeaways: this.extractKeyTakeaways(text),
      confidence: 0.7,
      method: 'ruleBased',
      metadata: {
        sentencesAnalyzed: sentences.length,
        sentencesSelected: topSentences.length,
        topKeywords: Object.entries(wordFreq)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([word]) => word)
      }
    };
  }

  async mlBasedSummarization(text, options = {}) {
    const {
      maxLength = 300,
      algorithm = 'textrank',
      damping = 0.85,
      iterations = 100
    } = options;
    
    // Implement TextRank algorithm
    const sentences = this.tokenizeSentences(text);
    const similarity = this.calculateSentenceSimilarity(sentences);
    const scores = this.textRankAlgorithm(similarity, damping, iterations);
    
    // Select sentences based on scores
    const rankedSentences = sentences
      .map((sentence, index) => ({ sentence, score: scores[index], index }))
      .sort((a, b) => b.score - a.score);
    
    let summary = '';
    let selectedSentences = [];
    
    for (const item of rankedSentences) {
      if (summary.length + item.sentence.length <= maxLength) {
        selectedSentences.push(item);
        summary += (summary ? ' ' : '') + item.sentence;
      }
    }
    
    // Sort selected sentences by original order
    selectedSentences.sort((a, b) => a.index - b.index);
    summary = selectedSentences.map(s => s.sentence).join(' ');
    
    return {
      summary,
      keyTakeaways: this.extractKeyTakeaways(text, 'ml'),
      confidence: 0.85,
      method: 'mlBased',
      metadata: {
        algorithm,
        sentencesAnalyzed: sentences.length,
        sentencesSelected: selectedSentences.length,
        averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length
      }
    };
  }

  async aiPoweredSummarization(text, options = {}) {
    const {
      maxLength = 400,
      style = 'concise',
      focusAreas = [],
      provider = 'openai',
      model = 'gpt-3.5-turbo'
    } = options;
    
    try {
      const aiProvider = this.aiProviders[provider];
      if (!aiProvider) {
        throw new Error(`AI provider '${provider}' not available`);
      }
      
      // Construct prompt
      let prompt = `Please summarize the following text in a ${style} manner`;
      
      if (focusAreas.length > 0) {
        prompt += `, focusing on: ${focusAreas.join(', ')}`;
      }
      
      prompt += `.\n\nText to summarize:\n${text}\n\nSummary:`;
      
      const response = await aiProvider.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional text summarization assistant. Provide clear, concise summaries that capture the key points and main ideas.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: Math.min(Math.floor(maxLength / 2), 1000),
        temperature: 0.3,
        top_p: 0.9
      });
      
      const summary = response.choices[0]?.message?.content?.trim();
      
      if (!summary) {
        throw new Error('No summary generated by AI provider');
      }
      
      // Track API usage for cost calculation
      this.emit('api-call', {
        provider,
        model,
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0
      });
      
      return {
        summary: this.truncateToLength(summary, maxLength),
        keyTakeaways: await this.extractKeyTakeawaysAI(text, provider, model),
        confidence: 0.95,
        method: 'aiPowered',
        metadata: {
          provider,
          model,
          style,
          focusAreas,
          tokensUsed: response.usage?.total_tokens || 0,
          cost: this.calculateAICost(response.usage?.total_tokens || 0, model)
        }
      };
      
    } catch (error) {
      logger.error('AI-powered summarization failed', {
        provider,
        model,
        error: error.message
      });
      
      // Fallback to ML-based summarization
      logger.info('Falling back to ML-based summarization');
      return await this.mlBasedSummarization(text, options);
    }
  }

  async hybridSummarization(text, options = {}) {
    const { maxLength = 350, weights = { rule: 0.3, ml: 0.4, ai: 0.3 } } = options;
    
    try {
      // Get summaries from different methods
      const [ruleBased, mlBased, aiPowered] = await Promise.allSettled([
        this.ruleBasedSummarization(text, { maxLength: Math.floor(maxLength * 0.4) }),
        this.mlBasedSummarization(text, { maxLength: Math.floor(maxLength * 0.4) }),
        this.aiPoweredSummarization(text, { maxLength: Math.floor(maxLength * 0.4) })
      ]);
      
      const summaries = [];
      const metadata = { methods: [], errors: [] };
      
      if (ruleBased.status === 'fulfilled') {
        summaries.push({ content: ruleBased.value.summary, weight: weights.rule, method: 'rule' });
        metadata.methods.push('ruleBased');
      } else {
        metadata.errors.push({ method: 'ruleBased', error: ruleBased.reason?.message });
      }
      
      if (mlBased.status === 'fulfilled') {
        summaries.push({ content: mlBased.value.summary, weight: weights.ml, method: 'ml' });
        metadata.methods.push('mlBased');
      } else {
        metadata.errors.push({ method: 'mlBased', error: mlBased.reason?.message });
      }
      
      if (aiPowered.status === 'fulfilled') {
        summaries.push({ content: aiPowered.value.summary, weight: weights.ai, method: 'ai' });
        metadata.methods.push('aiPowered');
      } else {
        metadata.errors.push({ method: 'aiPowered', error: aiPowered.reason?.message });
      }
      
      if (summaries.length === 0) {
        throw new Error('All summarization methods failed');
      }
      
      // Combine summaries using weighted approach
      const combinedSummary = this.combineSummaries(summaries, maxLength);
      
      return {
        summary: combinedSummary,
        keyTakeaways: this.extractKeyTakeaways(text, 'hybrid'),
        confidence: 0.9,
        method: 'hybrid',
        metadata: {
          ...metadata,
          weights,
          summariesGenerated: summaries.length
        }
      };
      
    } catch (error) {
      logger.error('Hybrid summarization failed', { error: error.message });
      
      // Fallback to the most reliable method
      return await this.mlBasedSummarization(text, options);
    }
  }

  // Utility methods
  tokenizeSentences(text) {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10);
  }

  calculateWordFrequency(text) {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    
    // Normalize frequencies
    const maxFreq = Math.max(...Object.values(frequency));
    Object.keys(frequency).forEach(word => {
      frequency[word] = frequency[word] / maxFreq;
    });
    
    return frequency;
  }

  calculateSentenceSimilarity(sentences) {
    const n = sentences.length;
    const similarity = Array(n).fill().map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          similarity[i][j] = this.cosineSimilarity(sentences[i], sentences[j]);
        }
      }
    }
    
    return similarity;
  }

  cosineSimilarity(text1, text2) {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const allWords = [...new Set([...words1, ...words2])];
    const vector1 = allWords.map(word => words1.filter(w => w === word).length);
    const vector2 = allWords.map(word => words2.filter(w => w === word).length);
    
    const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
    const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));
    
    return magnitude1 && magnitude2 ? dotProduct / (magnitude1 * magnitude2) : 0;
  }

  textRankAlgorithm(similarity, damping = 0.85, iterations = 100) {
    const n = similarity.length;
    let scores = Array(n).fill(1.0);
    
    for (let iter = 0; iter < iterations; iter++) {
      const newScores = Array(n).fill(0);
      
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i !== j && similarity[j][i] > 0) {
            const outgoingSum = similarity[j].reduce((sum, val) => sum + val, 0);
            newScores[i] += damping * (similarity[j][i] / outgoingSum) * scores[j];
          }
        }
        newScores[i] += (1 - damping);
      }
      
      scores = newScores;
    }
    
    return scores;
  }

  extractKeyTakeaways(text, method = 'rule') {
    const sentences = this.tokenizeSentences(text);
    const wordFreq = this.calculateWordFrequency(text);
    
    // Extract key phrases and concepts
    const keyPhrases = this.extractKeyPhrases(text, wordFreq);
    
    return {
      mainPoints: sentences.slice(0, 3),
      keyPhrases: keyPhrases.slice(0, 5),
      topics: this.extractTopics(text, wordFreq),
      sentiment: this.analyzeSentiment(text)
    };
  }

  async extractKeyTakeawaysAI(text, provider, model) {
    try {
      const aiProvider = this.aiProviders[provider];
      const response = await aiProvider.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'Extract key takeaways from the text in a structured format.'
          },
          {
            role: 'user',
            content: `Extract the main points, key phrases, and topics from this text:\n\n${text}`
          }
        ],
        max_tokens: 200,
        temperature: 0.2
      });
      
      const content = response.choices[0]?.message?.content;
      return this.parseAIKeyTakeaways(content);
      
    } catch (error) {
      logger.warn('AI key takeaway extraction failed, using fallback', { error: error.message });
      return this.extractKeyTakeaways(text);
    }
  }

  parseAIKeyTakeaways(content) {
    // Parse AI response into structured format
    const lines = content.split('\n').filter(line => line.trim());
    
    return {
      mainPoints: lines.filter(line => line.includes('•') || line.includes('-')).slice(0, 3),
      keyPhrases: lines.filter(line => line.toLowerCase().includes('key')).slice(0, 5),
      topics: lines.filter(line => line.toLowerCase().includes('topic')).slice(0, 3),
      sentiment: 'neutral' // Simplified for now
    };
  }

  extractKeyPhrases(text, wordFreq) {
    const words = Object.keys(wordFreq).sort((a, b) => wordFreq[b] - wordFreq[a]);
    return words.slice(0, 10);
  }

  extractTopics(text, wordFreq) {
    // Simple topic extraction based on high-frequency words
    const topWords = Object.keys(wordFreq)
      .sort((a, b) => wordFreq[b] - wordFreq[a])
      .slice(0, 5);
    
    return topWords;
  }

  analyzeSentiment(text) {
    // Simplified sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'positive', 'success', 'benefit'];
    const negativeWords = ['bad', 'poor', 'negative', 'problem', 'issue', 'failure'];
    
    const words = text.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  combineSummaries(summaries, maxLength) {
    // Combine multiple summaries using weighted selection
    const sentences = [];
    
    summaries.forEach(({ content, weight, method }) => {
      const sentenceList = this.tokenizeSentences(content);
      sentenceList.forEach(sentence => {
        sentences.push({ sentence, weight, method });
      });
    });
    
    // Sort by weight and select sentences
    sentences.sort((a, b) => b.weight - a.weight);
    
    let combined = '';
    const used = new Set();
    
    for (const { sentence } of sentences) {
      const normalized = sentence.toLowerCase().trim();
      if (!used.has(normalized) && combined.length + sentence.length <= maxLength) {
        combined += (combined ? ' ' : '') + sentence;
        used.add(normalized);
      }
    }
    
    return combined;
  }

  truncateToLength(text, maxLength) {
    if (text.length <= maxLength) return text;
    
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return lastSpace > maxLength * 0.8 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
  }

  generateCacheKey(text, method, options) {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify({ text, method, options }));
    return `summary:${hash.digest('hex')}`;
  }

  async getCachedResult(cacheKey) {
    if (!this.redisClient) return null;
    
    try {
      const cached = await this.redisClient.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.warn('Cache retrieval failed', { error: error.message });
      return null;
    }
  }

  async cacheResult(cacheKey, result) {
    if (!this.redisClient) return;
    
    try {
      await this.redisClient.setEx(cacheKey, this.options.cacheExpiry, JSON.stringify(result));
    } catch (error) {
      logger.warn('Cache storage failed', { error: error.message });
    }
  }

  getJobPriority(method) {
    const priorities = {
      ruleBased: 10,
      mlBased: 5,
      aiPowered: 1,
      hybrid: 3
    };
    return priorities[method] || 5;
  }

  getEstimatedProcessingTime(textLength, method) {
    const baseTimes = {
      ruleBased: 100,
      mlBased: 500,
      aiPowered: 2000,
      hybrid: 1500
    };
    
    const baseTime = baseTimes[method] || 500;
    const lengthFactor = Math.log(textLength / 1000 + 1);
    
    return Math.round(baseTime * lengthFactor);
  }

  calculateAICost(tokens, model) {
    const costs = {
      'gpt-3.5-turbo': 0.002 / 1000,
      'gpt-4': 0.03 / 1000,
      'gpt-4-turbo': 0.01 / 1000
    };
    
    return (costs[model] || costs['gpt-3.5-turbo']) * tokens;
  }

  getCreditCost(method, textLength = 1000) {
    const baseCost = this.methods[method]?.cost || 1;
    const lengthMultiplier = Math.max(1, Math.ceil(textLength / 1000));
    return baseCost * lengthMultiplier;
  }

  startMetricsCollection() {
    setInterval(() => {
      this.updatePerformanceMetrics();
    }, 60000); // Update every minute
  }

  updatePerformanceMetrics() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
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
    this.summarizationQueue.getWaiting().then(jobs => {
      this.performanceMetrics.queueLength = jobs.length;
    });
  }

  async getJobStatus(requestId) {
    try {
      const jobs = await this.summarizationQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
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
      }
    };
  }

  async healthCheck() {
    try {
      const queueHealth = await this.summarizationQueue.isReady();
      const redisHealth = this.redisClient ? await this.redisClient.ping() === 'PONG' : false;
      
      return {
        status: 'healthy',
        queue: queueHealth ? 'connected' : 'disconnected',
        cache: redisHealth ? 'connected' : 'disconnected',
        methods: Object.keys(this.methods),
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
      await this.summarizationQueue.close();
      if (this.redisClient) {
        await this.redisClient.quit();
      }
      logger.info('Summarization service cleaned up successfully');
    } catch (error) {
      logger.error('Cleanup failed', { error: error.message });
    }
  }
}

module.exports = EnhancedSummarizationService;

