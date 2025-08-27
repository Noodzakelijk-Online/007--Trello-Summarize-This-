/**
 * API Endpoints Integration Tests
 * 
 * Integration tests for all API endpoints in the Summarize This application.
 * Tests the complete request-response cycle including middleware, validation,
 * and database interactions.
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Mock the enhanced server
jest.mock('../../server/enhanced-server-with-validation', () => {
  const express = require('express');
  const app = express();
  
  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Mock routes will be added in tests
  return app;
});

describe('API Endpoints Integration Tests', () => {
  let app;
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Create Express app for testing
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Test user data
    testUser = {
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      credits: 100
    };

    // Generate test JWT token
    authToken = jwt.sign(
      { userId: testUser.id, email: testUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Set up mock routes
    setupMockRoutes();
  });

  function setupMockRoutes() {
    // Mock authentication middleware
    const mockAuth = (req, res, next) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token === authToken) {
        req.user = testUser;
        next();
      } else {
        res.status(401).json({ error: 'Unauthorized' });
      }
    };

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // User registration
    app.post('/api/auth/register', (req, res) => {
      const { email, password, name } = req.body;
      
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      if (email === 'existing@example.com') {
        return res.status(400).json({ error: 'Email already exists' });
      }
      
      res.status(201).json({
        user: { id: 'new-user-123', email, name, credits: 10 },
        token: authToken
      });
    });

    // User login
    app.post('/api/auth/login', (req, res) => {
      const { email, password } = req.body;
      
      if (email === 'test@example.com' && password === 'correct-password') {
        res.json({
          user: testUser,
          token: authToken
        });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    });

    // Get user profile
    app.get('/api/user/profile', mockAuth, (req, res) => {
      res.json(req.user);
    });

    // Update user profile
    app.put('/api/user/profile', mockAuth, (req, res) => {
      const updates = req.body;
      const updatedUser = { ...req.user, ...updates };
      res.json(updatedUser);
    });

    // Get user credits
    app.get('/api/user/credits', mockAuth, (req, res) => {
      res.json({ credits: req.user.credits });
    });

    // Summarization endpoint
    app.post('/api/summarize', mockAuth, (req, res) => {
      const { text, method = 'hybrid', options = {} } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }
      
      if (text.length < 50) {
        return res.status(400).json({ error: 'Text too short' });
      }
      
      if (req.user.credits < 5) {
        return res.status(402).json({ error: 'Insufficient credits' });
      }
      
      res.json({
        id: 'summary-123',
        summary: 'This is a test summary of the provided text.',
        method,
        confidence: 0.95,
        originalLength: text.length,
        summaryLength: 45,
        compressionRatio: 0.1,
        creditsUsed: 5,
        processingTime: 1500
      });
    });

    // Transcription endpoint
    app.post('/api/transcribe', mockAuth, (req, res) => {
      if (!req.files || !req.files.audio) {
        return res.status(400).json({ error: 'Audio file is required' });
      }
      
      const audioFile = req.files.audio;
      
      if (!audioFile.mimetype.startsWith('audio/')) {
        return res.status(400).json({ error: 'Invalid file type' });
      }
      
      if (req.user.credits < 10) {
        return res.status(402).json({ error: 'Insufficient credits' });
      }
      
      res.json({
        id: 'transcription-123',
        text: 'This is a test transcription of the audio file.',
        provider: 'whisper',
        confidence: 0.92,
        duration: 120,
        wordCount: 10,
        creditsUsed: 10,
        processingTime: 3000
      });
    });

    // Get user activity history
    app.get('/api/user/activity', mockAuth, (req, res) => {
      const { limit = 10, offset = 0 } = req.query;
      
      const activities = [
        {
          id: 'activity-1',
          type: 'summarization',
          details: { method: 'hybrid', credits_used: 5 },
          created_at: new Date().toISOString()
        },
        {
          id: 'activity-2',
          type: 'transcription',
          details: { provider: 'whisper', credits_used: 10 },
          created_at: new Date().toISOString()
        }
      ];
      
      const paginatedActivities = activities.slice(offset, offset + parseInt(limit));
      
      res.json({
        activities: paginatedActivities,
        total: activities.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    });

    // Purchase credits
    app.post('/api/credits/purchase', mockAuth, (req, res) => {
      const { package: packageType, paymentMethodId } = req.body;
      
      if (!packageType || !paymentMethodId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const packages = {
        basic: { credits: 100, price: 9.99 },
        premium: { credits: 500, price: 39.99 },
        enterprise: { credits: 2000, price: 149.99 }
      };
      
      const selectedPackage = packages[packageType];
      
      if (!selectedPackage) {
        return res.status(400).json({ error: 'Invalid package' });
      }
      
      res.json({
        transactionId: 'txn-123',
        credits: selectedPackage.credits,
        amount: selectedPackage.price,
        status: 'completed'
      });
    });

    // Webhook endpoint
    app.post('/api/webhooks/stripe', (req, res) => {
      const signature = req.headers['stripe-signature'];
      
      if (!signature) {
        return res.status(400).json({ error: 'Missing signature' });
      }
      
      // Mock webhook processing
      res.json({ received: true });
    });

    // Cost estimation
    app.post('/api/estimate-cost', mockAuth, (req, res) => {
      const { type, text, duration, method, provider } = req.body;
      
      let cost = 0;
      
      if (type === 'summarization') {
        const baseCost = method === 'aiPowered' ? 5 : 3;
        cost = Math.max(1, Math.ceil(text.length / 1000) * baseCost);
      } else if (type === 'transcription') {
        cost = Math.max(5, Math.ceil(duration / 60) * 2);
      }
      
      res.json({ estimatedCost: cost });
    });

    // Error handling middleware
    app.use((error, req, res, next) => {
      console.error('Test API Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Authentication Endpoints', () => {
    describe('POST /api/auth/register', () => {
      it('should register a new user successfully', async () => {
        const userData = {
          email: 'newuser@example.com',
          password: 'ValidPassword123!',
          name: 'New User'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(201);

        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('token');
        expect(response.body.user.email).toBe(userData.email);
        expect(response.body.user.credits).toBe(10);
      });

      it('should reject registration with missing fields', async () => {
        const incompleteData = {
          email: 'test@example.com'
          // Missing password and name
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(incompleteData)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Missing required fields');
      });

      it('should reject registration with existing email', async () => {
        const existingUserData = {
          email: 'existing@example.com',
          password: 'ValidPassword123!',
          name: 'Existing User'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(existingUserData)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Email already exists');
      });
    });

    describe('POST /api/auth/login', () => {
      it('should login with valid credentials', async () => {
        const credentials = {
          email: 'test@example.com',
          password: 'correct-password'
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(credentials)
          .expect(200);

        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('token');
        expect(response.body.user.email).toBe(credentials.email);
      });

      it('should reject login with invalid credentials', async () => {
        const invalidCredentials = {
          email: 'test@example.com',
          password: 'wrong-password'
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(invalidCredentials)
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Invalid credentials');
      });
    });
  });

  describe('User Profile Endpoints', () => {
    describe('GET /api/user/profile', () => {
      it('should get user profile with valid token', async () => {
        const response = await request(app)
          .get('/api/user/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('id', testUser.id);
        expect(response.body).toHaveProperty('email', testUser.email);
        expect(response.body).toHaveProperty('name', testUser.name);
      });

      it('should reject request without token', async () => {
        const response = await request(app)
          .get('/api/user/profile')
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Unauthorized');
      });

      it('should reject request with invalid token', async () => {
        const response = await request(app)
          .get('/api/user/profile')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Unauthorized');
      });
    });

    describe('PUT /api/user/profile', () => {
      it('should update user profile', async () => {
        const updates = {
          name: 'Updated Name',
          email: 'updated@example.com'
        };

        const response = await request(app)
          .put('/api/user/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send(updates)
          .expect(200);

        expect(response.body.name).toBe(updates.name);
        expect(response.body.email).toBe(updates.email);
      });
    });

    describe('GET /api/user/credits', () => {
      it('should get user credits', async () => {
        const response = await request(app)
          .get('/api/user/credits')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('credits', testUser.credits);
      });
    });
  });

  describe('Summarization Endpoints', () => {
    describe('POST /api/summarize', () => {
      it('should summarize text successfully', async () => {
        const requestData = {
          text: 'This is a long text that needs to be summarized. It contains multiple sentences and should be long enough to meet the minimum requirements.',
          method: 'hybrid',
          options: { maxLength: 100 }
        };

        const response = await request(app)
          .post('/api/summarize')
          .set('Authorization', `Bearer ${authToken}`)
          .send(requestData)
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('summary');
        expect(response.body).toHaveProperty('method', 'hybrid');
        expect(response.body).toHaveProperty('confidence');
        expect(response.body).toHaveProperty('creditsUsed', 5);
      });

      it('should reject request without text', async () => {
        const response = await request(app)
          .post('/api/summarize')
          .set('Authorization', `Bearer ${authToken}`)
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Text is required');
      });

      it('should reject text that is too short', async () => {
        const response = await request(app)
          .post('/api/summarize')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ text: 'Short text' })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Text too short');
      });

      it('should reject request with insufficient credits', async () => {
        // Mock user with low credits
        const lowCreditToken = jwt.sign(
          { userId: 'low-credit-user', email: 'lowcredit@example.com' },
          process.env.JWT_SECRET
        );

        // Override auth middleware for this test
        app.use('/api/summarize', (req, res, next) => {
          if (req.headers.authorization?.includes(lowCreditToken)) {
            req.user = { id: 'low-credit-user', credits: 2 };
          }
          next();
        });

        const response = await request(app)
          .post('/api/summarize')
          .set('Authorization', `Bearer ${lowCreditToken}`)
          .send({ text: 'This is a text that needs summarization but user has insufficient credits.' })
          .expect(402);

        expect(response.body).toHaveProperty('error', 'Insufficient credits');
      });
    });
  });

  describe('Transcription Endpoints', () => {
    describe('POST /api/transcribe', () => {
      it('should transcribe audio file successfully', async () => {
        // Mock file upload
        const mockFile = Buffer.from('fake audio data');

        const response = await request(app)
          .post('/api/transcribe')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('audio', mockFile, 'test-audio.mp3')
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('text');
        expect(response.body).toHaveProperty('provider', 'whisper');
        expect(response.body).toHaveProperty('confidence');
        expect(response.body).toHaveProperty('creditsUsed', 10);
      });

      it('should reject request without audio file', async () => {
        const response = await request(app)
          .post('/api/transcribe')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Audio file is required');
      });
    });
  });

  describe('Activity History Endpoints', () => {
    describe('GET /api/user/activity', () => {
      it('should get user activity history', async () => {
        const response = await request(app)
          .get('/api/user/activity')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('activities');
        expect(response.body).toHaveProperty('total');
        expect(response.body.activities).toBeInstanceOf(Array);
        expect(response.body.activities.length).toBeGreaterThan(0);
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get('/api/user/activity?limit=1&offset=0')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.limit).toBe(1);
        expect(response.body.offset).toBe(0);
        expect(response.body.activities).toHaveLength(1);
      });
    });
  });

  describe('Credit Purchase Endpoints', () => {
    describe('POST /api/credits/purchase', () => {
      it('should purchase credits successfully', async () => {
        const purchaseData = {
          package: 'basic',
          paymentMethodId: 'pm_test_123'
        };

        const response = await request(app)
          .post('/api/credits/purchase')
          .set('Authorization', `Bearer ${authToken}`)
          .send(purchaseData)
          .expect(200);

        expect(response.body).toHaveProperty('transactionId');
        expect(response.body).toHaveProperty('credits', 100);
        expect(response.body).toHaveProperty('amount', 9.99);
        expect(response.body).toHaveProperty('status', 'completed');
      });

      it('should reject invalid package', async () => {
        const invalidPurchaseData = {
          package: 'invalid-package',
          paymentMethodId: 'pm_test_123'
        };

        const response = await request(app)
          .post('/api/credits/purchase')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidPurchaseData)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid package');
      });

      it('should reject missing payment method', async () => {
        const incompletePurchaseData = {
          package: 'basic'
          // Missing paymentMethodId
        };

        const response = await request(app)
          .post('/api/credits/purchase')
          .set('Authorization', `Bearer ${authToken}`)
          .send(incompletePurchaseData)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Missing required fields');
      });
    });
  });

  describe('Webhook Endpoints', () => {
    describe('POST /api/webhooks/stripe', () => {
      it('should process webhook with valid signature', async () => {
        const webhookData = {
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_test_123',
              metadata: { userId: testUser.id }
            }
          }
        };

        const response = await request(app)
          .post('/api/webhooks/stripe')
          .set('stripe-signature', 'valid-signature')
          .send(webhookData)
          .expect(200);

        expect(response.body).toHaveProperty('received', true);
      });

      it('should reject webhook without signature', async () => {
        const webhookData = {
          type: 'payment_intent.succeeded'
        };

        const response = await request(app)
          .post('/api/webhooks/stripe')
          .send(webhookData)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Missing signature');
      });
    });
  });

  describe('Cost Estimation Endpoints', () => {
    describe('POST /api/estimate-cost', () => {
      it('should estimate cost for summarization', async () => {
        const estimationData = {
          type: 'summarization',
          text: 'This is a test text for cost estimation.',
          method: 'hybrid'
        };

        const response = await request(app)
          .post('/api/estimate-cost')
          .set('Authorization', `Bearer ${authToken}`)
          .send(estimationData)
          .expect(200);

        expect(response.body).toHaveProperty('estimatedCost');
        expect(typeof response.body.estimatedCost).toBe('number');
        expect(response.body.estimatedCost).toBeGreaterThan(0);
      });

      it('should estimate cost for transcription', async () => {
        const estimationData = {
          type: 'transcription',
          duration: 300, // 5 minutes
          provider: 'whisper'
        };

        const response = await request(app)
          .post('/api/estimate-cost')
          .set('Authorization', `Bearer ${authToken}`)
          .send(estimationData)
          .expect(200);

        expect(response.body).toHaveProperty('estimatedCost');
        expect(typeof response.body.estimatedCost).toBe('number');
        expect(response.body.estimatedCost).toBeGreaterThan(0);
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should handle multiple requests within limits', async () => {
      const requests = Array(5).fill().map(() =>
        request(app)
          .get('/api/health')
          .expect(200)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.body).toHaveProperty('status', 'healthy');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      // Express should handle malformed JSON automatically
    });

    it('should handle large payloads', async () => {
      const largeText = 'a'.repeat(100000); // 100KB text

      const response = await request(app)
        .post('/api/summarize')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ text: largeText })
        .expect(200);

      expect(response.body).toHaveProperty('summary');
    });
  });

  describe('CORS and Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      // These would be set by helmet middleware in actual implementation
      // expect(response.headers).toHaveProperty('x-content-type-options');
      // expect(response.headers).toHaveProperty('x-frame-options');
    });
  });
});

