/**
 * Environment Configuration Management
 * 
 * Centralized configuration management for different environments
 * with validation, type conversion, and secure defaults.
 */

const path = require('path');
const fs = require('fs');

class EnvironmentConfig {
  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.config = {};
    this.requiredVars = new Set();
    this.validators = new Map();
    
    this.loadConfiguration();
  }

  /**
   * Load configuration based on environment
   */
  loadConfiguration() {
    // Load base configuration
    this.loadBaseConfig();
    
    // Load environment-specific configuration
    this.loadEnvironmentConfig();
    
    // Validate required variables
    this.validateConfiguration();
    
    // Apply transformations
    this.transformConfiguration();
  }

  /**
   * Load base configuration common to all environments
   */
  loadBaseConfig() {
    this.config = {
      // Application settings
      app: {
        name: 'Summarize This',
        version: process.env.npm_package_version || '1.0.0',
        port: this.getNumber('PORT', 3000),
        url: process.env.APP_URL || `http://localhost:${this.getNumber('PORT', 3000)}`,
        environment: this.environment
      },

      // Security settings
      security: {
        jwtSecret: process.env.JWT_SECRET,
        encryptionKey: process.env.ENCRYPTION_KEY,
        sessionSecret: process.env.SESSION_SECRET,
        corsOrigins: this.getArray('CORS_ORIGINS', []),
        enableHelmet: this.getBoolean('ENABLE_HELMET', true),
        enableRateLimiting: this.getBoolean('ENABLE_RATE_LIMITING', true)
      },

      // Database configuration
      database: {
        url: process.env.DATABASE_URL,
        pool: {
          min: this.getNumber('DB_POOL_MIN', 2),
          max: this.getNumber('DB_POOL_MAX', 10),
          idleTimeoutMillis: this.getNumber('DB_POOL_IDLE_TIMEOUT', 30000)
        }
      },

      // Redis configuration
      redis: {
        url: process.env.REDIS_URL,
        password: process.env.REDIS_PASSWORD
      },

      // AI Services
      aiServices: {
        openai: {
          apiKey: process.env.OPENAI_API_KEY,
          orgId: process.env.OPENAI_ORG_ID,
          model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
        },
        google: {
          apiKey: process.env.GOOGLE_CLOUD_API_KEY,
          projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
        },
        azure: {
          speechKey: process.env.AZURE_SPEECH_KEY,
          region: process.env.AZURE_SPEECH_REGION || 'eastus'
        },
        assemblyai: {
          apiKey: process.env.ASSEMBLYAI_API_KEY
        },
        aws: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: process.env.AWS_REGION || 'us-east-1'
        }
      },

      // Payment processing
      stripe: {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
      },

      // Email configuration
      email: {
        smtp: {
          host: process.env.SMTP_HOST,
          port: this.getNumber('SMTP_PORT', 587),
          secure: this.getBoolean('SMTP_SECURE', false),
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        },
        from: {
          email: process.env.FROM_EMAIL,
          name: process.env.FROM_NAME || 'Summarize This'
        }
      },

      // File storage
      storage: {
        uploadDir: process.env.UPLOAD_DIR || './uploads',
        tempDir: process.env.TEMP_DIR || './temp',
        logDir: process.env.LOG_DIR || './logs',
        maxFileSize: this.getNumber('MAX_FILE_SIZE', 104857600), // 100MB
        allowedTypes: this.getArray('ALLOWED_FILE_TYPES', [
          'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a',
          'video/mp4', 'video/quicktime'
        ]),
        s3: {
          bucket: process.env.AWS_S3_BUCKET,
          region: process.env.AWS_S3_REGION || 'us-east-1',
          accessKey: process.env.AWS_S3_ACCESS_KEY,
          secretKey: process.env.AWS_S3_SECRET_KEY
        }
      },

      // Logging and monitoring
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        enableMetrics: this.getBoolean('ENABLE_METRICS', true),
        metricsPort: this.getNumber('METRICS_PORT', 9090),
        sentry: {
          dsn: process.env.SENTRY_DSN
        },
        newRelic: {
          licenseKey: process.env.NEW_RELIC_LICENSE_KEY
        }
      },

      // Rate limiting
      rateLimiting: {
        windowMs: this.getNumber('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
        maxRequests: this.getNumber('RATE_LIMIT_MAX_REQUESTS', 100)
      },

      // Feature flags
      features: {
        transcription: this.getBoolean('ENABLE_TRANSCRIPTION', true),
        summarization: this.getBoolean('ENABLE_SUMMARIZATION', true),
        realTimeProcessing: this.getBoolean('ENABLE_REAL_TIME_PROCESSING', true),
        costOptimization: this.getBoolean('ENABLE_COST_OPTIMIZATION', true),
        analytics: this.getBoolean('ENABLE_ANALYTICS', true)
      },

      // Analytics
      analytics: {
        googleAnalytics: {
          trackingId: process.env.GA_TRACKING_ID
        },
        mixpanel: {
          token: process.env.MIXPANEL_TOKEN
        },
        customEndpoint: process.env.ANALYTICS_ENDPOINT
      },

      // Third-party integrations
      integrations: {
        slack: {
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
          channel: process.env.SLACK_CHANNEL || '#alerts'
        },
        discord: {
          webhookUrl: process.env.DISCORD_WEBHOOK_URL
        },
        trello: {
          apiKey: process.env.TRELLO_API_KEY,
          apiSecret: process.env.TRELLO_API_SECRET
        }
      },

      // Performance settings
      performance: {
        nodeOptions: process.env.NODE_OPTIONS || '--max-old-space-size=2048',
        clusterWorkers: process.env.CLUSTER_WORKERS || 'auto',
        cache: {
          ttl: this.getNumber('CACHE_TTL', 3600),
          maxSize: this.getNumber('CACHE_MAX_SIZE', 1000)
        }
      },

      // Localization
      localization: {
        defaultLanguage: process.env.DEFAULT_LANGUAGE || 'en',
        supportedLanguages: this.getArray('SUPPORTED_LANGUAGES', ['en'])
      },

      // Compliance
      compliance: {
        gdprMode: this.getBoolean('ENABLE_GDPR_MODE', true),
        dataRetentionDays: this.getNumber('DATA_RETENTION_DAYS', 365),
        anonymizeLogs: this.getBoolean('ANONYMIZE_LOGS', true),
        encryptPii: this.getBoolean('ENCRYPT_PII', true)
      }
    };
  }

  /**
   * Load environment-specific configuration
   */
  loadEnvironmentConfig() {
    switch (this.environment) {
      case 'development':
        this.loadDevelopmentConfig();
        break;
      case 'staging':
        this.loadStagingConfig();
        break;
      case 'production':
        this.loadProductionConfig();
        break;
      case 'test':
        this.loadTestConfig();
        break;
      default:
        console.warn(`Unknown environment: ${this.environment}, using development defaults`);
        this.loadDevelopmentConfig();
    }
  }

  /**
   * Development environment configuration
   */
  loadDevelopmentConfig() {
    Object.assign(this.config, {
      app: {
        ...this.config.app,
        url: process.env.APP_URL || `http://localhost:${this.config.app.port}`
      },
      database: {
        ...this.config.database,
        url: process.env.DEV_DATABASE_URL || this.config.database.url
      },
      logging: {
        ...this.config.logging,
        level: 'debug',
        enableMetrics: false
      },
      security: {
        ...this.config.security,
        enableRateLimiting: false
      },
      features: {
        ...this.config.features,
        analytics: false
      }
    });

    // Development-specific required variables
    this.addRequired(['DATABASE_URL', 'JWT_SECRET']);
  }

  /**
   * Staging environment configuration
   */
  loadStagingConfig() {
    Object.assign(this.config, {
      logging: {
        ...this.config.logging,
        level: 'info'
      },
      security: {
        ...this.config.security,
        enableRateLimiting: true
      }
    });

    // Staging required variables
    this.addRequired([
      'DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'ENCRYPTION_KEY',
      'OPENAI_API_KEY', 'STRIPE_SECRET_KEY'
    ]);
  }

  /**
   * Production environment configuration
   */
  loadProductionConfig() {
    Object.assign(this.config, {
      logging: {
        ...this.config.logging,
        level: process.env.LOG_LEVEL || 'warn'
      },
      security: {
        ...this.config.security,
        enableHelmet: true,
        enableRateLimiting: true
      },
      performance: {
        ...this.config.performance,
        clusterWorkers: process.env.CLUSTER_WORKERS || 'auto'
      }
    });

    // Production required variables
    this.addRequired([
      'DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'ENCRYPTION_KEY',
      'SESSION_SECRET', 'OPENAI_API_KEY', 'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET', 'APP_URL'
    ]);

    // Add validators for production
    this.addValidator('JWT_SECRET', (value) => {
      if (!value || value.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters long in production');
      }
    });

    this.addValidator('ENCRYPTION_KEY', (value) => {
      if (!value || value.length !== 32) {
        throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
      }
    });
  }

  /**
   * Test environment configuration
   */
  loadTestConfig() {
    Object.assign(this.config, {
      database: {
        ...this.config.database,
        url: process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/summarize_this_test'
      },
      redis: {
        ...this.config.redis,
        url: process.env.TEST_REDIS_URL || 'redis://localhost:6379/1'
      },
      logging: {
        ...this.config.logging,
        level: 'error'
      },
      features: {
        ...this.config.features,
        analytics: false,
        realTimeProcessing: false
      },
      aiServices: {
        ...this.config.aiServices,
        // Disable external services in tests if flag is set
        ...(this.getBoolean('DISABLE_EXTERNAL_SERVICES', false) && {
          openai: { ...this.config.aiServices.openai, apiKey: 'test-key' },
          google: { ...this.config.aiServices.google, apiKey: 'test-key' },
          azure: { ...this.config.aiServices.azure, speechKey: 'test-key' },
          assemblyai: { ...this.config.aiServices.assemblyai, apiKey: 'test-key' },
          aws: { 
            ...this.config.aiServices.aws, 
            accessKeyId: 'test-key', 
            secretAccessKey: 'test-secret' 
          }
        })
      }
    });

    // Test environment has minimal requirements
    this.addRequired(['JWT_SECRET']);
  }

  /**
   * Add required environment variable
   */
  addRequired(vars) {
    if (Array.isArray(vars)) {
      vars.forEach(v => this.requiredVars.add(v));
    } else {
      this.requiredVars.add(vars);
    }
  }

  /**
   * Add validator for environment variable
   */
  addValidator(varName, validator) {
    this.validators.set(varName, validator);
  }

  /**
   * Validate configuration
   */
  validateConfiguration() {
    const missingVars = [];
    const validationErrors = [];

    // Check required variables
    for (const varName of this.requiredVars) {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    }

    // Run custom validators
    for (const [varName, validator] of this.validators) {
      try {
        validator(process.env[varName]);
      } catch (error) {
        validationErrors.push(`${varName}: ${error.message}`);
      }
    }

    // Report errors
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    if (validationErrors.length > 0) {
      throw new Error(`Configuration validation errors:\n${validationErrors.join('\n')}`);
    }
  }

  /**
   * Apply transformations to configuration
   */
  transformConfiguration() {
    // Ensure directories exist
    this.ensureDirectories([
      this.config.storage.uploadDir,
      this.config.storage.tempDir,
      this.config.storage.logDir
    ]);

    // Convert relative paths to absolute
    this.config.storage.uploadDir = path.resolve(this.config.storage.uploadDir);
    this.config.storage.tempDir = path.resolve(this.config.storage.tempDir);
    this.config.storage.logDir = path.resolve(this.config.storage.logDir);

    // Freeze configuration to prevent accidental modifications
    this.deepFreeze(this.config);
  }

  /**
   * Ensure directories exist
   */
  ensureDirectories(dirs) {
    dirs.forEach(dir => {
      const resolvedDir = path.resolve(dir);
      if (!fs.existsSync(resolvedDir)) {
        fs.mkdirSync(resolvedDir, { recursive: true });
      }
    });
  }

  /**
   * Deep freeze object to make it immutable
   */
  deepFreeze(obj) {
    Object.getOwnPropertyNames(obj).forEach(prop => {
      if (obj[prop] !== null && typeof obj[prop] === 'object') {
        this.deepFreeze(obj[prop]);
      }
    });
    return Object.freeze(obj);
  }

  /**
   * Get environment variable as number
   */
  getNumber(varName, defaultValue) {
    const value = process.env[varName];
    if (value === undefined) return defaultValue;
    const num = parseInt(value, 10);
    return isNaN(num) ? defaultValue : num;
  }

  /**
   * Get environment variable as boolean
   */
  getBoolean(varName, defaultValue) {
    const value = process.env[varName];
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Get environment variable as array
   */
  getArray(varName, defaultValue) {
    const value = process.env[varName];
    if (!value) return defaultValue;
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }

  /**
   * Get configuration object
   */
  getConfig() {
    return this.config;
  }

  /**
   * Get specific configuration section
   */
  get(section) {
    return this.config[section];
  }

  /**
   * Check if running in specific environment
   */
  isDevelopment() {
    return this.environment === 'development';
  }

  isProduction() {
    return this.environment === 'production';
  }

  isStaging() {
    return this.environment === 'staging';
  }

  isTest() {
    return this.environment === 'test';
  }

  /**
   * Export configuration as JSON (for debugging)
   */
  toJSON() {
    // Create a safe copy without sensitive data
    const safeCopy = JSON.parse(JSON.stringify(this.config));
    
    // Redact sensitive information
    this.redactSensitiveData(safeCopy);
    
    return safeCopy;
  }

  /**
   * Redact sensitive data from configuration
   */
  redactSensitiveData(obj, path = '') {
    const sensitiveKeys = [
      'secret', 'key', 'password', 'token', 'dsn', 'webhook'
    ];

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        this.redactSensitiveData(value, currentPath);
      } else if (typeof value === 'string') {
        const isSensitive = sensitiveKeys.some(sensitiveKey => 
          key.toLowerCase().includes(sensitiveKey)
        );
        
        if (isSensitive && value) {
          obj[key] = value.length > 8 ? 
            `${value.substring(0, 4)}...${value.substring(value.length - 4)}` : 
            '***';
        }
      }
    }
  }
}

// Create and export singleton instance
const environmentConfig = new EnvironmentConfig();

module.exports = environmentConfig;

