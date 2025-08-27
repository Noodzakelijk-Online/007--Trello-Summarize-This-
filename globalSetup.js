/**
 * Global Test Setup for Summarize This
 * 
 * Sets up the testing environment before all tests run.
 * Initializes databases, mocks, and global configurations.
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const Redis = require('ioredis-mock');

module.exports = async () => {
  console.log('🚀 Setting up test environment...');

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  process.env.STRIPE_SECRET_KEY = 'sk_test_123456789';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123456789';
  process.env.OPENAI_API_KEY = 'sk-test-openai-key';
  process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters';
  
  // Database configuration
  process.env.DB_HOST = 'localhost';
  process.env.DB_PORT = '5432';
  process.env.DB_NAME = 'summarize_this_test';
  process.env.DB_USER = 'test_user';
  process.env.DB_PASSWORD = 'test_password';
  
  // Redis configuration
  process.env.REDIS_HOST = 'localhost';
  process.env.REDIS_PORT = '6379';
  process.env.REDIS_DB = '1';
  
  // API configuration
  process.env.API_BASE_URL = 'http://localhost:3000';
  process.env.FRONTEND_URL = 'http://localhost:3001';
  
  // File upload configuration
  process.env.UPLOAD_DIR = '/tmp/test-uploads';
  process.env.MAX_FILE_SIZE = '104857600'; // 100MB
  
  // Rate limiting configuration
  process.env.RATE_LIMIT_WINDOW = '900000'; // 15 minutes
  process.env.RATE_LIMIT_MAX = '100';
  
  // Logging configuration
  process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
  
  try {
    // Start in-memory MongoDB for testing (if using MongoDB)
    if (process.env.USE_MONGODB === 'true') {
      const mongod = await MongoMemoryServer.create({
        instance: {
          port: 27017,
          dbName: 'summarize_this_test'
        }
      });
      
      const uri = mongod.getUri();
      process.env.MONGODB_URI = uri;
      global.__MONGOD__ = mongod;
      
      console.log('✅ In-memory MongoDB started');
    }
    
    // Set up Redis mock
    global.__REDIS_MOCK__ = new Redis();
    
    // Create test upload directory
    const fs = require('fs').promises;
    const path = require('path');
    const uploadDir = process.env.UPLOAD_DIR;
    
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }
    
    console.log('✅ Test upload directory created');
    
    // Set up global test utilities
    global.testUtils = {
      // Helper to create test users
      createTestUser: (overrides = {}) => ({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        credits: 100,
        ...overrides
      }),
      
      // Helper to create test files
      createTestFile: async (filename = 'test.txt', content = 'test content') => {
        const filePath = path.join(uploadDir, filename);
        await fs.writeFile(filePath, content);
        return filePath;
      },
      
      // Helper to clean up test files
      cleanupTestFiles: async () => {
        try {
          const files = await fs.readdir(uploadDir);
          await Promise.all(
            files.map(file => fs.unlink(path.join(uploadDir, file)))
          );
        } catch (error) {
          // Ignore cleanup errors
        }
      },
      
      // Helper to wait for async operations
      wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
      
      // Helper to generate random strings
      randomString: (length = 10) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      },
      
      // Helper to generate test API responses
      mockApiResponse: (data, status = 200) => ({
        status,
        data,
        headers: { 'content-type': 'application/json' }
      }),
      
      // Helper to create mock Express request
      mockRequest: (overrides = {}) => ({
        body: {},
        params: {},
        query: {},
        headers: {},
        user: null,
        ...overrides
      }),
      
      // Helper to create mock Express response
      mockResponse: () => {
        const res = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        res.send = jest.fn().mockReturnValue(res);
        res.end = jest.fn().mockReturnValue(res);
        res.cookie = jest.fn().mockReturnValue(res);
        res.clearCookie = jest.fn().mockReturnValue(res);
        res.redirect = jest.fn().mockReturnValue(res);
        res.render = jest.fn().mockReturnValue(res);
        res.locals = {};
        return res;
      },
      
      // Helper to create mock next function
      mockNext: () => jest.fn()
    };
    
    // Set up global mocks
    global.mockStripe = {
      paymentIntents: {
        create: jest.fn(),
        retrieve: jest.fn(),
        confirm: jest.fn()
      },
      webhooks: {
        constructEvent: jest.fn()
      },
      charges: {
        retrieve: jest.fn()
      }
    };
    
    global.mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    };
    
    // Mock external services
    jest.mock('stripe', () => () => global.mockStripe);
    jest.mock('openai', () => ({
      OpenAI: jest.fn(() => global.mockOpenAI)
    }));
    
    // Mock file system operations for safety
    jest.mock('fs', () => ({
      ...jest.requireActual('fs'),
      unlinkSync: jest.fn(),
      unlink: jest.fn((path, callback) => callback && callback())
    }));
    
    // Mock email service
    global.mockEmailService = {
      sendEmail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
      sendWelcomeEmail: jest.fn().mockResolvedValue(true),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
      sendCreditPurchaseConfirmation: jest.fn().mockResolvedValue(true)
    };
    
    // Mock transcription services
    global.mockTranscriptionServices = {
      whisper: {
        transcribe: jest.fn().mockResolvedValue({
          text: 'Mock transcription result',
          confidence: 0.95,
          duration: 120,
          service: 'whisper'
        })
      },
      assemblyai: {
        transcribe: jest.fn().mockResolvedValue({
          text: 'Mock transcription result',
          confidence: 0.92,
          duration: 120,
          service: 'assemblyai'
        })
      }
    };
    
    // Set up test database connection pool
    global.testDbPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn()
    };
    
    console.log('✅ Global test setup completed');
    
  } catch (error) {
    console.error('❌ Global test setup failed:', error);
    throw error;
  }
};

