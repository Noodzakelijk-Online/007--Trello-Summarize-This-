/**
 * Summarize This - Enhanced Server
 * 
 * Express server with comprehensive error handling, input validation, and security features
 * for the Summarize This Trello extension.
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const winston = require('winston');

// Import services
const SummarizationService = require('./services/summarization');
const TranscriptionService = require('./services/transcription');
const UserService = require('./services/user');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'summarize-this-server' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(compression());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enhanced rate limiting with different tiers
const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { error: message },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent')
    });
    res.status(429).json({ error: message });
  }
});

// Apply different rate limits to different endpoints
app.use('/api/summarize', createRateLimit(15 * 60 * 1000, 20, 'Too many summarization requests'));
app.use('/api/transcribe', createRateLimit(15 * 60 * 1000, 10, 'Too many transcription requests'));
app.use('/api/credits/purchase', createRateLimit(60 * 60 * 1000, 5, 'Too many purchase attempts'));
app.use('/api/', createRateLimit(15 * 60 * 1000, 100, 'Too many API requests'));

// Configure enhanced file uploads with validation
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../temp/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, file.fieldname + '-' + uniqueSuffix + '-' + sanitizedName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/ogg',
    'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 1
  },
  fileFilter
});

// Initialize services
const summarizationService = new SummarizationService();
const transcriptionService = new TranscriptionService();
const userService = new UserService();

// Input validation middleware
const validateInput = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Input validation failed', {
      errors: errors.array(),
      body: req.body,
      params: req.params,
      query: req.query
    });
    return res.status(400).json({
      error: 'Invalid input',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// Enhanced authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    
    if (!apiKey) {
      logger.warn('Authentication failed: No API key provided', {
        ip: req.ip,
        path: req.path
      });
      return res.status(401).json({
        error: 'Authentication required',
        message: 'API key must be provided in X-API-Key header or apiKey query parameter'
      });
    }
    
    if (typeof apiKey !== 'string' || apiKey.length < 10) {
      logger.warn('Authentication failed: Invalid API key format', {
        ip: req.ip,
        apiKeyLength: apiKey.length
      });
      return res.status(401).json({
        error: 'Invalid API key format',
        message: 'API key must be a string with at least 10 characters'
      });
    }
    
    // In production, validate against database
    req.userId = apiKey;
    req.userInfo = await userService.getUserInfo(apiKey);
    
    logger.info('User authenticated successfully', {
      userId: req.userId,
      ip: req.ip,
      path: req.path
    });
    
    next();
  } catch (error) {
    logger.error('Authentication error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });
    res.status(401).json({
      error: 'Authentication failed',
      message: 'Unable to verify API key'
    });
  }
};

// Enhanced credit check middleware
const checkCredits = (requiredCredits) => {
  return async (req, res, next) => {
    try {
      const userCredits = await userService.getCredits(req.userId);
      
      if (userCredits < requiredCredits) {
        logger.warn('Insufficient credits', {
          userId: req.userId,
          requiredCredits,
          userCredits,
          operation: req.path
        });
        return res.status(402).json({
          error: 'Insufficient credits',
          message: `This operation requires ${requiredCredits} credits, but you only have ${userCredits}`,
          required: requiredCredits,
          available: userCredits,
          shortfall: requiredCredits - userCredits
        });
      }
      
      req.requiredCredits = requiredCredits;
      req.userCredits = userCredits;
      next();
    } catch (error) {
      logger.error('Credit check error', {
        error: error.message,
        stack: error.stack,
        userId: req.userId
      });
      res.status(500).json({
        error: 'Credit verification failed',
        message: 'Unable to verify your credit balance'
      });
    }
  };
};

// Error handling utility
const handleServiceError = (error, operation, req, res) => {
  logger.error(`${operation} error`, {
    error: error.message,
    stack: error.stack,
    userId: req.userId,
    operation,
    requestBody: req.body
  });

  // Determine error type and appropriate response
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Invalid input',
      message: error.message,
      operation
    });
  }
  
  if (error.name === 'NetworkError' || error.code === 'ECONNREFUSED') {
    return res.status(503).json({
      error: 'Service temporarily unavailable',
      message: 'External service is currently unavailable. Please try again later.',
      operation
    });
  }
  
  if (error.name === 'TimeoutError') {
    return res.status(504).json({
      error: 'Operation timeout',
      message: 'The operation took too long to complete. Please try again.',
      operation
    });
  }
  
  // Generic server error
  res.status(500).json({
    error: 'Operation failed',
    message: 'An unexpected error occurred while processing your request.',
    operation
  });
};

// API Routes with enhanced validation and error handling

// Health check with detailed status
app.get('/api/health', async (req, res) => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        summarization: await summarizationService.healthCheck(),
        transcription: await transcriptionService.healthCheck(),
        user: await userService.healthCheck()
      }
    };
    
    res.json(health);
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'error',
      message: 'Service health check failed'
    });
  }
});

// Get user credits with detailed information
app.get('/api/credits', authenticate, async (req, res) => {
  try {
    const credits = await userService.getCredits(req.userId);
    const usage = await userService.getUsageStats(req.userId);
    
    res.json({
      credits,
      usage,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handleServiceError(error, 'get_credits', req, res);
  }
});

// Purchase credits with comprehensive validation
app.post('/api/credits/purchase', [
  authenticate,
  body('packageType').isIn(['basic', 'standard', 'premium']).withMessage('Invalid package type'),
  body('paymentToken').isString().isLength({ min: 1 }).withMessage('Payment token is required'),
  body('amount').optional().isNumeric().withMessage('Amount must be numeric'),
  validateInput
], async (req, res) => {
  try {
    const { packageType, paymentToken, amount } = req.body;
    
    logger.info('Credit purchase initiated', {
      userId: req.userId,
      packageType,
      amount,
      ip: req.ip
    });
    
    const result = await userService.purchaseCredits(req.userId, packageType, paymentToken, amount);
    
    if (!result.success) {
      logger.warn('Credit purchase failed', {
        userId: req.userId,
        error: result.error,
        packageType
      });
      return res.status(400).json({
        error: 'Purchase failed',
        message: result.error,
        details: result.details
      });
    }
    
    logger.info('Credit purchase successful', {
      userId: req.userId,
      packageType,
      creditsAdded: result.creditsAdded,
      newBalance: result.newBalance
    });
    
    res.json({
      success: true,
      message: 'Credits purchased successfully',
      ...result
    });
  } catch (error) {
    handleServiceError(error, 'purchase_credits', req, res);
  }
});

// Get transaction history with pagination
app.get('/api/transactions', [
  authenticate,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('type').optional().isIn(['purchase', 'usage', 'all']).withMessage('Invalid transaction type'),
  validateInput
], async (req, res) => {
  try {
    const { page = 1, limit = 20, type = 'all' } = req.query;
    
    const transactions = await userService.getTransactionHistory(req.userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      type
    });
    
    res.json({
      transactions: transactions.data,
      pagination: transactions.pagination,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handleServiceError(error, 'get_transactions', req, res);
  }
});

// Summarize text with comprehensive validation
app.post('/api/summarize', [
  authenticate,
  body('text').isString().isLength({ min: 10, max: 50000 }).withMessage('Text must be between 10 and 50,000 characters'),
  body('method').optional().isIn(['ruleBased', 'mlBased', 'aiPowered']).withMessage('Invalid summarization method'),
  body('options.maxLength').optional().isInt({ min: 50, max: 1000 }).withMessage('Max length must be between 50 and 1000'),
  body('options.focusAreas').optional().isArray().withMessage('Focus areas must be an array'),
  validateInput
], async (req, res) => {
  try {
    const { text, method = 'ruleBased', options = {} } = req.body;
    
    // Get credit cost for the selected method
    const creditCost = summarizationService.getCreditCost(method, text.length);
    
    // Check credits
    const hasEnoughCredits = await userService.checkCredits(req.userId, creditCost);
    if (!hasEnoughCredits) {
      const userCredits = await userService.getCredits(req.userId);
      return res.status(402).json({
        error: 'Insufficient credits',
        message: `This summarization requires ${creditCost} credits, but you only have ${userCredits}`,
        required: creditCost,
        available: userCredits
      });
    }
    
    logger.info('Summarization started', {
      userId: req.userId,
      method,
      textLength: text.length,
      creditCost
    });
    
    // Perform summarization
    const startTime = Date.now();
    const summary = await summarizationService.summarize(text, method, options);
    const processingTime = Date.now() - startTime;
    
    // Deduct credits
    await userService.deductCredits(req.userId, creditCost, `summarization_${method}`, {
      textLength: text.length,
      processingTime,
      method
    });
    
    logger.info('Summarization completed', {
      userId: req.userId,
      method,
      processingTime,
      creditCost
    });
    
    res.json({
      ...summary,
      metadata: {
        method,
        processingTime,
        creditsUsed: creditCost,
        creditsRemaining: await userService.getCredits(req.userId),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    handleServiceError(error, 'summarization', req, res);
  }
});

// Transcribe audio/video with enhanced validation
app.post('/api/transcribe', [
  authenticate,
  body('service').optional().isIn(['auto', 'whisper', 'speechmatics', 'assemblyai', 'deepgram', 'rev']).withMessage('Invalid transcription service'),
  body('language').optional().isString().isLength({ min: 2, max: 5 }).withMessage('Invalid language code'),
  body('options.timestamps').optional().isBoolean().withMessage('Timestamps option must be boolean'),
], (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'File too large',
          message: 'File size must be less than 100MB'
        });
      }
      return res.status(400).json({
        error: 'File upload error',
        message: err.message
      });
    } else if (err) {
      return res.status(400).json({
        error: 'Invalid file',
        message: err.message
      });
    }
    next();
  });
}, validateInput, async (req, res) => {
  let filePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'File required',
        message: 'Please upload an audio or video file'
      });
    }
    
    filePath = req.file.path;
    const { service = 'auto', language = 'en', options = {} } = req.body;
    
    // Get file info
    const fileStats = fs.statSync(filePath);
    const fileSizeMB = fileStats.size / (1024 * 1024);
    
    // Get credit cost
    const creditCost = transcriptionService.getCreditCost(service, fileSizeMB);
    
    // Check credits
    const hasEnoughCredits = await userService.checkCredits(req.userId, creditCost);
    if (!hasEnoughCredits) {
      const userCredits = await userService.getCredits(req.userId);
      return res.status(402).json({
        error: 'Insufficient credits',
        message: `This transcription requires ${creditCost} credits, but you only have ${userCredits}`,
        required: creditCost,
        available: userCredits
      });
    }
    
    logger.info('Transcription started', {
      userId: req.userId,
      service,
      fileName: req.file.originalname,
      fileSize: fileSizeMB,
      creditCost
    });
    
    // Perform transcription
    const startTime = Date.now();
    const transcription = await transcriptionService.transcribe(filePath, service, { language, ...options });
    const processingTime = Date.now() - startTime;
    
    // Deduct credits
    await userService.deductCredits(req.userId, creditCost, `transcription_${transcription.service}`, {
      fileName: req.file.originalname,
      fileSize: fileSizeMB,
      processingTime,
      service: transcription.service
    });
    
    logger.info('Transcription completed', {
      userId: req.userId,
      service: transcription.service,
      processingTime,
      creditCost
    });
    
    res.json({
      ...transcription,
      metadata: {
        fileName: req.file.originalname,
        fileSize: fileSizeMB,
        processingTime,
        creditsUsed: creditCost,
        creditsRemaining: await userService.getCredits(req.userId),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    handleServiceError(error, 'transcription', req, res);
  } finally {
    // Clean up uploaded file
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        logger.error('File cleanup failed', {
          filePath,
          error: cleanupError.message
        });
      }
    }
  }
});

// Get resource usage with detailed metrics
app.get('/api/resources', authenticate, async (req, res) => {
  try {
    const [summaryResources, transcriptionResources, userStats] = await Promise.all([
      summarizationService.getResourceUsage(),
      transcriptionService.getResourceUsage(),
      userService.getUserStats(req.userId)
    ]);
    
    res.json({
      summary: summaryResources,
      transcription: transcriptionResources,
      user: userStats,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handleServiceError(error, 'get_resources', req, res);
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Catch-all route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The endpoint ${req.method} ${req.path} does not exist`,
    availableEndpoints: [
      'GET /api/health',
      'GET /api/credits',
      'POST /api/credits/purchase',
      'GET /api/transactions',
      'POST /api/summarize',
      'POST /api/transcribe',
      'GET /api/resources'
    ]
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Handle server errors
server.on('error', (error) => {
  logger.error('Server error', {
    error: error.message,
    stack: error.stack
  });
});

module.exports = app;

