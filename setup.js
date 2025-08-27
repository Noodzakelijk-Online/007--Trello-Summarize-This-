/**
 * Test Setup for Summarize This
 * 
 * Sets up Jest testing environment with custom matchers,
 * utilities, and common test configurations.
 */

// Extend Jest matchers
expect.extend({
  /**
   * Custom matcher to check if a value is a valid UUID
   */
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = typeof received === 'string' && uuidRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false
      };
    }
  },

  /**
   * Custom matcher to check if a response has the correct API structure
   */
  toBeValidApiResponse(received, expectedStatus = 200) {
    const hasStatus = typeof received.status === 'number';
    const hasCorrectStatus = received.status === expectedStatus;
    const hasData = received.data !== undefined;
    
    const pass = hasStatus && hasCorrectStatus && hasData;
    
    if (pass) {
      return {
        message: () => `expected response not to be a valid API response with status ${expectedStatus}`,
        pass: true
      };
    } else {
      return {
        message: () => `expected response to be a valid API response with status ${expectedStatus}, got ${JSON.stringify(received)}`,
        pass: false
      };
    }
  },

  /**
   * Custom matcher to check if an error has the expected structure
   */
  toBeValidError(received, expectedType = 'Error') {
    const isError = received instanceof Error;
    const hasCorrectType = received.constructor.name === expectedType;
    const hasMessage = typeof received.message === 'string' && received.message.length > 0;
    
    const pass = isError && hasCorrectType && hasMessage;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ${expectedType}`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid ${expectedType}`,
        pass: false
      };
    }
  },

  /**
   * Custom matcher to check if a date is recent (within last minute)
   */
  toBeRecentDate(received) {
    const date = new Date(received);
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    const pass = date >= oneMinuteAgo && date <= now;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a recent date`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a recent date (within last minute)`,
        pass: false
      };
    }
  },

  /**
   * Custom matcher to check if an object has required properties
   */
  toHaveRequiredProperties(received, requiredProps) {
    const missingProps = requiredProps.filter(prop => !(prop in received));
    const pass = missingProps.length === 0;
    
    if (pass) {
      return {
        message: () => `expected object not to have all required properties ${requiredProps.join(', ')}`,
        pass: true
      };
    } else {
      return {
        message: () => `expected object to have required properties ${requiredProps.join(', ')}, missing: ${missingProps.join(', ')}`,
        pass: false
      };
    }
  },

  /**
   * Custom matcher to check if a string is a valid email
   */
  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = typeof received === 'string' && emailRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false
      };
    }
  },

  /**
   * Custom matcher to check if a number is within a range
   */
  toBeWithinRange(received, min, max) {
    const pass = typeof received === 'number' && received >= min && received <= max;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${min}-${max}`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${min}-${max}`,
        pass: false
      };
    }
  }
});

// Global test utilities
global.testHelpers = {
  /**
   * Create a mock database transaction
   */
  mockTransaction: (callback) => {
    const mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: jest.fn()
    };
    
    return callback(mockClient);
  },

  /**
   * Create a mock HTTP request
   */
  createMockRequest: (overrides = {}) => ({
    method: 'GET',
    url: '/',
    headers: {},
    body: {},
    params: {},
    query: {},
    user: null,
    ip: '127.0.0.1',
    get: jest.fn(),
    ...overrides
  }),

  /**
   * Create a mock HTTP response
   */
  createMockResponse: () => {
    const res = {
      statusCode: 200,
      headers: {},
      locals: {}
    };
    
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.end = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    res.render = jest.fn().mockReturnValue(res);
    res.set = jest.fn().mockReturnValue(res);
    res.header = jest.fn().mockReturnValue(res);
    res.type = jest.fn().mockReturnValue(res);
    
    return res;
  },

  /**
   * Create a mock next function
   */
  createMockNext: () => jest.fn(),

  /**
   * Create test user data
   */
  createTestUser: (overrides = {}) => ({
    id: 'test-user-' + Math.random().toString(36).substr(2, 9),
    email: 'test@example.com',
    name: 'Test User',
    credits: 100,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_active: true,
    ...overrides
  }),

  /**
   * Create test summarization request data
   */
  createTestSummarizationRequest: (overrides = {}) => ({
    id: 'req-' + Math.random().toString(36).substr(2, 9),
    user_id: 'test-user-id',
    original_text: 'This is a test text that needs to be summarized.',
    summary_text: 'Test summary.',
    method: 'hybrid',
    credits_used: 5,
    status: 'completed',
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    ...overrides
  }),

  /**
   * Create test transcription request data
   */
  createTestTranscriptionRequest: (overrides = {}) => ({
    id: 'trans-' + Math.random().toString(36).substr(2, 9),
    user_id: 'test-user-id',
    file_name: 'test-audio.mp3',
    file_size: 1024000,
    transcription_text: 'This is a test transcription.',
    service: 'whisper',
    credits_used: 10,
    status: 'completed',
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    ...overrides
  }),

  /**
   * Create test transaction data
   */
  createTestTransaction: (overrides = {}) => ({
    id: 'txn-' + Math.random().toString(36).substr(2, 9),
    user_id: 'test-user-id',
    type: 'credit_purchase',
    amount: 9.99,
    currency: 'USD',
    credits: 100,
    status: 'completed',
    created_at: new Date().toISOString(),
    ...overrides
  }),

  /**
   * Create test file buffer
   */
  createTestFileBuffer: (content = 'test file content') => {
    return Buffer.from(content, 'utf8');
  },

  /**
   * Create test audio file data
   */
  createTestAudioFile: () => ({
    fieldname: 'audio',
    originalname: 'test-audio.mp3',
    encoding: '7bit',
    mimetype: 'audio/mpeg',
    buffer: Buffer.from('fake audio data'),
    size: 1024000
  }),

  /**
   * Wait for a specified amount of time
   */
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Generate random string
   */
  randomString: (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Generate random email
   */
  randomEmail: () => {
    const username = global.testHelpers.randomString(8);
    const domain = global.testHelpers.randomString(6);
    return `${username}@${domain}.com`;
  },

  /**
   * Mock Stripe payment intent
   */
  mockPaymentIntent: (overrides = {}) => ({
    id: 'pi_' + global.testHelpers.randomString(24),
    object: 'payment_intent',
    amount: 999,
    currency: 'usd',
    status: 'succeeded',
    metadata: {},
    created: Math.floor(Date.now() / 1000),
    ...overrides
  }),

  /**
   * Mock OpenAI response
   */
  mockOpenAIResponse: (content = 'Test AI response') => ({
    choices: [{
      message: {
        content,
        role: 'assistant'
      },
      finish_reason: 'stop'
    }],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30
    }
  }),

  /**
   * Mock transcription service response
   */
  mockTranscriptionResponse: (overrides = {}) => ({
    text: 'This is a mock transcription result.',
    confidence: 0.95,
    duration: 120,
    service: 'whisper',
    processing_time: 5000,
    ...overrides
  }),

  /**
   * Assert that a function throws a specific error
   */
  expectToThrow: async (fn, errorType, errorMessage) => {
    let error;
    try {
      await fn();
    } catch (e) {
      error = e;
    }
    
    expect(error).toBeDefined();
    if (errorType) {
      expect(error).toBeInstanceOf(errorType);
    }
    if (errorMessage) {
      expect(error.message).toContain(errorMessage);
    }
  },

  /**
   * Mock database query result
   */
  mockQueryResult: (rows = [], rowCount = null) => ({
    rows,
    rowCount: rowCount !== null ? rowCount : rows.length,
    command: 'SELECT',
    fields: []
  }),

  /**
   * Create test JWT token
   */
  createTestJWT: (payload = {}) => {
    const jwt = require('jsonwebtoken');
    const defaultPayload = {
      userId: 'test-user-id',
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    
    return jwt.sign({ ...defaultPayload, ...payload }, process.env.JWT_SECRET);
  }
};

// Console override to reduce noise during tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error // Keep error logs for debugging
};

// Set up global error handling for tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Mock timers for consistent testing
jest.useFakeTimers('legacy');

// Set default timeout for async operations
jest.setTimeout(30000);

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset fake timers
  jest.clearAllTimers();
  
  // Clean up any test files
  if (global.testUtils && global.testUtils.cleanupTestFiles) {
    global.testUtils.cleanupTestFiles().catch(() => {
      // Ignore cleanup errors
    });
  }
});

// Set up common test data
global.testData = {
  validUser: {
    email: 'test@example.com',
    password: 'TestPassword123!',
    name: 'Test User'
  },
  
  validSummarizationRequest: {
    text: 'This is a long text that needs to be summarized. It contains multiple sentences and paragraphs to test the summarization functionality.',
    method: 'hybrid',
    maxLength: 200,
    style: 'balanced'
  },
  
  validTranscriptionFile: {
    fieldname: 'audio',
    originalname: 'test-audio.mp3',
    encoding: '7bit',
    mimetype: 'audio/mpeg',
    size: 1024000
  },
  
  validCreditPackage: {
    name: 'Test Package',
    credits: 100,
    price: 9.99,
    currency: 'USD'
  }
};

console.log('✅ Test setup completed');

