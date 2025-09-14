/**
 * Enhanced Server with Comprehensive Input Validation and Rate Limiting
 * 
 * Implements robust input validation, sanitization, and rate limiting
 * for all API endpoints to prevent abuse and security vulnerabilities.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Import middleware
const { errorHandler, asyncHandler, logger } = require('./middleware/errorHandler');
const { 
  rateLimitConfigs, 
  speedLimitConfigs, 
  createValidationMiddleware, 
  validateFile, 
  createIPWhitelist, 
  limitRequestSize 
} = require('./middleware/validation');

// Import services
const SummarizationService = require('./services/enhanced-summarization');
const TranscriptionService = require('./services/enhanced-transcription');
const UserService = require('./services/enhanced-user');

class EnhancedServer {
  constructor(options = {}) {
    this.app = express();
    this.port = options.port || process.env.PORT || 3000;
    this.environment = process.env.NODE_ENV || 'development';
    
    // Initialize services
    this.summarizationService = new SummarizationService();
    this.transcriptionService = new TranscriptionService();
    this.userService = new UserService();
    
    // Configure multer for file uploads
    this.configureMulter();
    
    // Setup middleware and routes
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  configureMulter() {
    // Configure storage
    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        try {
          await fs.mkdir(uploadDir, { recursive: true });
          cb(null, uploadDir);
        } catch (error) {
          cb(error);
        }
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '');
        cb(null, `${uniqueSuffix}-${sanitizedName}`);
      }
    });

    // File filter
    const fileFilter = (req, file, cb) => {
      const allowedMimes = [
        'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a', 'audio/ogg', 'audio/flac',
        'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/mkv', 'video/webm'
      ];
      
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
      }
    };

    this.upload = multer({
      storage: storage,
      fileFilter: fileFilter,
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
        files: 1
      }
    });
  }

  setupMiddleware() {
    // Trust proxy for accurate IP addresses
    this.app.set('trust proxy', 1);

    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          scriptSrc: ["'self'", "https://js.stripe.com"],
          connectSrc: ["'self'", "https://api.stripe.com"],
          frameSrc: ["https://js.stripe.com", "https://hooks.stripe.com"]
        }
      },
      crossOriginEmbedderPolicy: false
    }));

    // Compression
    this.app.use(compression());

    // Request size limiting
    this.app.use(limitRequestSize('10mb'));

    // CORS configuration
    this.app.use(cors({
      origin: this.getAllowedOrigins(),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Body parsing with size limits
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req, res, buf) => {
        // Store raw body for webhook verification
        req.rawBody = buf;
      }
    }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info('Request received', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        contentLength: req.get('Content-Length')
      });
      next();
    });

    // General rate limiting
    this.app.use(rateLimitConfigs.general);
    this.app.use(speedLimitConfigs.general);

    // Serve static files
    this.app.use(express.static(path.join(__dirname, '../public')));
  }

  getAllowedOrigins() {
    const origins = ['http://localhost:3000'];
    
    if (this.environment === 'production') {
      origins.push(
        'https://yourdomain.com',
        'https://trello.com',
        'https://*.trello.com'
      );
    } else {
      origins.push(
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:8080'
      );
    }
    
    return origins;
  }

  setupRoutes() {
    // Health check endpoint (no rate limiting)
    this.app.get('/health', asyncHandler(async (req, res) => {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: this.environment,
        services: {
          summarization: await this.summarizationService.healthCheck(),
          transcription: await this.transcriptionService.healthCheck(),
          user: await this.userService.healthCheck()
        }
      };
      res.json(health);
    }));

    // API routes with validation and rate limiting
    this.setupSummarizationRoutes();
    this.setupTranscriptionRoutes();
    this.setupUserRoutes();
    this.setupPaymentRoutes();
    this.setupUtilityRoutes();

    // Catch-all route for SPA
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });
  }

  setupSummarizationRoutes() {
    // Text summarization with intensive rate limiting
    this.app.post('/api/summarize',
      rateLimitConfigs.intensive,
      speedLimitConfigs.intensive,
      createValidationMiddleware('summarize', {
        sanitizers: {
          text: (text) => text.trim().replace(/\s+/g, ' ')
        }
      }),
      asyncHandler(async (req, res) => {
        const { text, method, options } = req.body;
        
        // Check user credits
        const userId = req.user?.id || req.ip; // Use IP as fallback for anonymous users
        const estimatedCost = await this.summarizationService.estimateCost(text, method);
        
        const hasCredits = await this.userService.checkCredits(userId, estimatedCost);
        if (!hasCredits) {
          return res.status(402).json({
            success: false,
            error: {
              message: 'Insufficient credits',
              code: 'INSUFFICIENT_CREDITS',
              required: estimatedCost,
              available: await this.userService.getCredits(userId)
            }
          });
        }

        // Process summarization
        const result = await this.summarizationService.summarize(text, method, options);
        
        // Deduct credits
        await this.userService.deductCredits(userId, result.creditsUsed || estimatedCost);
        
        // Log usage
        await this.userService.logUsage(userId, 'summarization', {
          method,
          textLength: text.length,
          creditsUsed: result.creditsUsed || estimatedCost
        });

        res.json({
          success: true,
          data: result,
          remainingCredits: await this.userService.getCredits(userId)
        });
      })
    );

    // Cost estimation
    this.app.post('/api/estimate-cost',
      rateLimitConfigs.general,
      createValidationMiddleware('estimateCost'),
      asyncHandler(async (req, res) => {
        const { text, method, type } = req.body;
        
        let estimatedCredits;
        if (type === 'summarization') {
          estimatedCredits = await this.summarizationService.estimateCost(text, method);
        } else {
          estimatedCredits = await this.transcriptionService.estimateCost(req.body);
        }

        res.json({
          success: true,
          estimatedCredits,
          estimatedCost: estimatedCredits * 0.01 // $0.01 per credit
        });
      })
    );
  }

  setupTranscriptionRoutes() {
    // Audio/video transcription
    this.app.post('/api/transcribe',
      rateLimitConfigs.intensive,
      speedLimitConfigs.intensive,
      this.upload.single('file'),
      validateFile({ checkMagicNumbers: true }),
      createValidationMiddleware('transcribe', { validateBody: false }),
      asyncHandler(async (req, res) => {
        const file = req.file;
        const { service, options } = req.body;
        
        // Parse options if it's a string (from form data)
        const parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;
        
        // Check user credits
        const userId = req.user?.id || req.ip;
        const estimatedCost = await this.transcriptionService.estimateCost({
          fileSize: file.size,
          service: service || 'auto'
        });
        
        const hasCredits = await this.userService.checkCredits(userId, estimatedCost);
        if (!hasCredits) {
          // Clean up uploaded file
          await fs.unlink(file.path).catch(() => {});
          
          return res.status(402).json({
            success: false,
            error: {
              message: 'Insufficient credits',
              code: 'INSUFFICIENT_CREDITS',
              required: estimatedCost,
              available: await this.userService.getCredits(userId)
            }
          });
        }

        // Process transcription
        const result = await this.transcriptionService.transcribe(file.path, service, parsedOptions);
        
        // Clean up uploaded file
        await fs.unlink(file.path).catch(() => {});
        
        // Deduct credits
        await this.userService.deductCredits(userId, result.creditsUsed || estimatedCost);
        
        // Log usage
        await this.userService.logUsage(userId, 'transcription', {
          service: result.service,
          fileSize: file.size,
          duration: result.duration,
          creditsUsed: result.creditsUsed || estimatedCost
        });

        res.json({
          success: true,
          data: result,
          remainingCredits: await this.userService.getCredits(userId)
        });
      })
    );

    // Transcription status check
    this.app.get('/api/transcribe/:requestId',
      rateLimitConfigs.general,
      asyncHandler(async (req, res) => {
        const { requestId } = req.params;
        const status = await this.transcriptionService.getStatus(requestId);
        
        res.json({
          success: true,
          data: status
        });
      })
    );
  }

  setupUserRoutes() {
    // User settings
    this.app.get('/api/user/settings',
      rateLimitConfigs.general,
      asyncHandler(async (req, res) => {
        const userId = req.user?.id || req.ip;
        const settings = await this.userService.getSettings(userId);
        
        res.json({
          success: true,
          settings
        });
      })
    );

    this.app.put('/api/user/settings',
      rateLimitConfigs.general,
      createValidationMiddleware('userSettings'),
      asyncHandler(async (req, res) => {
        const userId = req.user?.id || req.ip;
        const settings = await this.userService.updateSettings(userId, req.body);
        
        res.json({
          success: true,
          settings,
          user: await this.userService.getUser(userId)
        });
      })
    );

    // Reset settings
    this.app.post('/api/user/settings/reset',
      rateLimitConfigs.general,
      asyncHandler(async (req, res) => {
        const userId = req.user?.id || req.ip;
        const settings = await this.userService.resetSettings(userId);
        
        res.json({
          success: true,
          settings
        });
      })
    );

    // Test API connection
    this.app.post('/api/user/test-connection',
      rateLimitConfigs.general,
      createValidationMiddleware('userSettings', { 
        validateBody: true,
        sanitizers: {
          apiKey: (key) => key.trim()
        }
      }),
      asyncHandler(async (req, res) => {
        const { apiKey } = req.body;
        const isValid = await this.summarizationService.testApiKey(apiKey);
        
        res.json({
          success: isValid,
          message: isValid ? 'API connection successful' : 'API connection failed'
        });
      })
    );

    // Export user data
    this.app.get('/api/user/export',
      rateLimitConfigs.general,
      asyncHandler(async (req, res) => {
        const userId = req.user?.id || req.ip;
        const data = await this.userService.exportUserData(userId);
        
        res.json({
          success: true,
          data
        });
      })
    );

    // User statistics
    this.app.get('/api/user/stats',
      rateLimitConfigs.general,
      asyncHandler(async (req, res) => {
        const userId = req.user?.id || req.ip;
        const stats = await this.userService.getUserStats(userId);
        
        res.json({
          success: true,
          stats
        });
      })
    );
  }

  setupPaymentRoutes() {
    // Get credit packages
    this.app.get('/api/credit-packages',
      rateLimitConfigs.general,
      asyncHandler(async (req, res) => {
        const packages = await this.userService.getCreditPackages();
        
        res.json({
          success: true,
          packages
        });
      })
    );

    // Create payment intent
    this.app.post('/api/payments/create-intent',
      rateLimitConfigs.payment,
      createValidationMiddleware('createPaymentIntent'),
      asyncHandler(async (req, res) => {
        const userId = req.user?.id || req.ip;
        const { packageId, paymentMethod, billingDetails } = req.body;
        
        const paymentIntent = await this.userService.createPaymentIntent(
          userId, 
          packageId, 
          paymentMethod, 
          billingDetails
        );
        
        res.json({
          success: true,
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id
        });
      })
    );

    // Verify payment
    this.app.post('/api/payments/verify',
      rateLimitConfigs.payment,
      asyncHandler(async (req, res) => {
        const { paymentIntentId } = req.body;
        const userId = req.user?.id || req.ip;
        
        const verification = await this.userService.verifyPayment(userId, paymentIntentId);
        
        res.json({
          success: true,
          ...verification
        });
      })
    );

    // Stripe configuration
    this.app.get('/api/stripe/config',
      rateLimitConfigs.general,
      asyncHandler(async (req, res) => {
        res.json({
          publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
        });
      })
    );
  }

  setupUtilityRoutes() {
    // System information
    this.app.get('/api/system/info',
      rateLimitConfigs.general,
      asyncHandler(async (req, res) => {
        const info = {
          version: process.env.npm_package_version || '1.0.0',
          environment: this.environment,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          platform: process.platform,
          nodeVersion: process.version
        };
        
        res.json({
          success: true,
          info
        });
      })
    );

    // Available methods and services
    this.app.get('/api/capabilities',
      rateLimitConfigs.general,
      asyncHandler(async (req, res) => {
        const capabilities = {
          summarizationMethods: ['ruleBased', 'mlBased', 'aiPowered', 'hybrid'],
          transcriptionServices: ['whisper', 'speechmatics', 'assemblyai', 'deepgram', 'rev'],
          supportedFileTypes: [
            'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a', 'audio/ogg', 'audio/flac',
            'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/mkv', 'video/webm'
          ],
          maxFileSize: '100MB',
          maxTextLength: 50000
        };
        
        res.json({
          success: true,
          capabilities
        });
      })
    );
  }

  setupErrorHandling() {
    // 404 handler for API routes
    this.app.use('/api/*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          message: 'API endpoint not found',
          code: 'ENDPOINT_NOT_FOUND'
        }
      });
    });

    // Global error handler
    this.app.use(errorHandler);
  }

  async start() {
    try {
      // Initialize services
      await this.summarizationService.initialize();
      await this.transcriptionService.initialize();
      await this.userService.initialize();

      // Start server
      this.server = this.app.listen(this.port, () => {
        logger.info(`Enhanced server started on port ${this.port} in ${this.environment} mode`);
      });

      // Graceful shutdown handling
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      // Stop accepting new connections
      this.server.close(async () => {
        try {
          // Cleanup services
          await this.summarizationService.cleanup();
          await this.transcriptionService.cleanup();
          await this.userService.cleanup();
          
          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(resolve);
      });
    }
  }
}

// Create and export server instance
const server = new EnhancedServer();

// Start server if this file is run directly
if (require.main === module) {
  server.start().catch(error => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = server;

