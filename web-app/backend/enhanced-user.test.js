/**
 * Enhanced User Service Tests
 * 
 * Comprehensive test suite for the enhanced user service
 * covering database operations, authentication, and user management.
 */

const EnhancedUserService = require('../../server/services/enhanced-user');
const { ValidationError, AuthenticationError, AuthorizationError } = require('../../server/middleware/errorHandler');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

describe('EnhancedUserService', () => {
  let service;
  let mockDb;
  let mockLogger;
  let testUser;

  beforeEach(async () => {
    // Mock database
    mockDb = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn()
    };

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    // Create service instance
    service = new EnhancedUserService(mockDb);
    service.logger = mockLogger;

    // Test user data
    testUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      password_hash: await bcrypt.hash('TestPassword123!', 10),
      credits: 100,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with database connection', () => {
      const newService = new EnhancedUserService(mockDb);
      
      expect(newService.db).toBe(mockDb);
      expect(newService.isInitialized).toBe(false);
    });

    it('should initialize successfully', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });
      
      await service.initialize();
      
      expect(service.isInitialized).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Enhanced User Service initialized');
    });

    it('should create tables if they do not exist', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });
      
      await service.initialize();
      
      expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS'));
    });
  });

  describe('user registration', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'NewPassword123!',
        name: 'New User'
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // Check if user exists
        .mockResolvedValueOnce({ rows: [{ ...testUser, ...userData }] }); // Insert user

      const result = await service.registerUser(userData);

      expect(result).toHaveRequiredProperties(['id', 'email', 'name', 'credits']);
      expect(result.email).toBe(userData.email);
      expect(result.name).toBe(userData.name);
      expect(result.credits).toBe(10); // Default credits
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('password_hash');
    });

    it('should validate email format', async () => {
      const invalidEmailData = {
        email: 'invalid-email',
        password: 'ValidPassword123!',
        name: 'Test User'
      };

      await expect(service.registerUser(invalidEmailData)).rejects.toThrow(ValidationError);
    });

    it('should validate password strength', async () => {
      const weakPasswordData = {
        email: 'test@example.com',
        password: '123',
        name: 'Test User'
      };

      await expect(service.registerUser(weakPasswordData)).rejects.toThrow(ValidationError);
    });

    it('should prevent duplicate email registration', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [testUser] }); // User already exists

      const duplicateData = {
        email: testUser.email,
        password: 'ValidPassword123!',
        name: 'Duplicate User'
      };

      await expect(service.registerUser(duplicateData)).rejects.toThrow(ValidationError);
    });

    it('should hash password before storing', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'PlainTextPassword123!',
        name: 'New User'
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [testUser] });

      await service.registerUser(userData);

      const insertCall = mockDb.query.mock.calls.find(call => 
        call[0].includes('INSERT INTO users')
      );
      
      expect(insertCall[1]).toContain(userData.email);
      expect(insertCall[1]).not.toContain(userData.password); // Plain password should not be stored
    });

    it('should generate unique user ID', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'ValidPassword123!',
        name: 'New User'
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ ...testUser, id: 'unique-id-123' }] });

      const result = await service.registerUser(userData);

      expect(result.id).toBeTruthy();
      expect(typeof result.id).toBe('string');
    });
  });

  describe('user authentication', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should authenticate user with valid credentials', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [testUser] });

      const result = await service.authenticateUser('test@example.com', 'TestPassword123!');

      expect(result).toHaveRequiredProperties(['user', 'token']);
      expect(result.user.email).toBe(testUser.email);
      expect(result.token).toBeTruthy();
      expect(typeof result.token).toBe('string');
    });

    it('should reject authentication with invalid email', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.authenticateUser('nonexistent@example.com', 'password'))
        .rejects.toThrow(AuthenticationError);
    });

    it('should reject authentication with invalid password', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [testUser] });

      await expect(service.authenticateUser('test@example.com', 'WrongPassword'))
        .rejects.toThrow(AuthenticationError);
    });

    it('should reject authentication for inactive users', async () => {
      const inactiveUser = { ...testUser, is_active: false };
      mockDb.query.mockResolvedValueOnce({ rows: [inactiveUser] });

      await expect(service.authenticateUser('test@example.com', 'TestPassword123!'))
        .rejects.toThrow(AuthenticationError);
    });

    it('should update last login timestamp', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [testUser] })
        .mockResolvedValueOnce({ rows: [] }); // Update query

      await service.authenticateUser('test@example.com', 'TestPassword123!');

      const updateCall = mockDb.query.mock.calls.find(call => 
        call[0].includes('UPDATE users SET last_login_at')
      );
      
      expect(updateCall).toBeTruthy();
    });

    it('should generate valid JWT token', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [testUser] });

      const result = await service.authenticateUser('test@example.com', 'TestPassword123!');

      const decoded = jwt.verify(result.token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(testUser.id);
      expect(decoded.email).toBe(testUser.email);
    });
  });

  describe('token validation', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should validate valid JWT token', async () => {
      const token = jwt.sign(
        { userId: testUser.id, email: testUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      mockDb.query.mockResolvedValueOnce({ rows: [testUser] });

      const result = await service.validateToken(token);

      expect(result).toHaveRequiredProperties(['id', 'email', 'name']);
      expect(result.id).toBe(testUser.id);
    });

    it('should reject expired tokens', async () => {
      const expiredToken = jwt.sign(
        { userId: testUser.id, email: testUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      await expect(service.validateToken(expiredToken)).rejects.toThrow(AuthenticationError);
    });

    it('should reject invalid tokens', async () => {
      const invalidToken = 'invalid.token.here';

      await expect(service.validateToken(invalidToken)).rejects.toThrow(AuthenticationError);
    });

    it('should reject tokens for non-existent users', async () => {
      const token = jwt.sign(
        { userId: 'non-existent-id', email: 'fake@example.com' },
        process.env.JWT_SECRET
      );

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.validateToken(token)).rejects.toThrow(AuthenticationError);
    });

    it('should reject tokens for inactive users', async () => {
      const token = jwt.sign(
        { userId: testUser.id, email: testUser.email },
        process.env.JWT_SECRET
      );

      const inactiveUser = { ...testUser, is_active: false };
      mockDb.query.mockResolvedValueOnce({ rows: [inactiveUser] });

      await expect(service.validateToken(token)).rejects.toThrow(AuthenticationError);
    });
  });

  describe('user profile management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should get user by ID', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [testUser] });

      const result = await service.getUserById(testUser.id);

      expect(result).toHaveRequiredProperties(['id', 'email', 'name', 'credits']);
      expect(result.id).toBe(testUser.id);
      expect(result).not.toHaveProperty('password_hash');
    });

    it('should return null for non-existent user', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getUserById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should update user profile', async () => {
      const updates = {
        name: 'Updated Name',
        email: 'updated@example.com'
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [testUser] }) // Get current user
        .mockResolvedValueOnce({ rows: [] }) // Check email uniqueness
        .mockResolvedValueOnce({ rows: [{ ...testUser, ...updates }] }); // Update user

      const result = await service.updateUserProfile(testUser.id, updates);

      expect(result.name).toBe(updates.name);
      expect(result.email).toBe(updates.email);
    });

    it('should validate email uniqueness when updating', async () => {
      const updates = { email: 'existing@example.com' };
      const existingUser = { ...testUser, id: 'other-user', email: 'existing@example.com' };

      mockDb.query
        .mockResolvedValueOnce({ rows: [testUser] })
        .mockResolvedValueOnce({ rows: [existingUser] }); // Email already exists

      await expect(service.updateUserProfile(testUser.id, updates))
        .rejects.toThrow(ValidationError);
    });

    it('should change user password', async () => {
      const oldPassword = 'TestPassword123!';
      const newPassword = 'NewPassword456!';

      mockDb.query
        .mockResolvedValueOnce({ rows: [testUser] })
        .mockResolvedValueOnce({ rows: [] }); // Update query

      await service.changePassword(testUser.id, oldPassword, newPassword);

      const updateCall = mockDb.query.mock.calls.find(call => 
        call[0].includes('UPDATE users SET password_hash')
      );
      
      expect(updateCall).toBeTruthy();
    });

    it('should validate old password when changing', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [testUser] });

      await expect(service.changePassword(testUser.id, 'WrongOldPassword', 'NewPassword456!'))
        .rejects.toThrow(AuthenticationError);
    });
  });

  describe('credit management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should get user credits', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [testUser] });

      const credits = await service.getUserCredits(testUser.id);

      expect(credits).toBe(testUser.credits);
    });

    it('should add credits to user account', async () => {
      const creditsToAdd = 50;
      const updatedUser = { ...testUser, credits: testUser.credits + creditsToAdd };

      mockDb.query
        .mockResolvedValueOnce({ rows: [testUser] })
        .mockResolvedValueOnce({ rows: [updatedUser] });

      const result = await service.addCredits(testUser.id, creditsToAdd);

      expect(result.credits).toBe(testUser.credits + creditsToAdd);
    });

    it('should deduct credits from user account', async () => {
      const creditsToDeduct = 25;
      const updatedUser = { ...testUser, credits: testUser.credits - creditsToDeduct };

      mockDb.query
        .mockResolvedValueOnce({ rows: [testUser] })
        .mockResolvedValueOnce({ rows: [updatedUser] });

      const result = await service.deductCredits(testUser.id, creditsToDeduct);

      expect(result.credits).toBe(testUser.credits - creditsToDeduct);
    });

    it('should prevent deducting more credits than available', async () => {
      const creditsToDeduct = testUser.credits + 50;

      mockDb.query.mockResolvedValueOnce({ rows: [testUser] });

      await expect(service.deductCredits(testUser.id, creditsToDeduct))
        .rejects.toThrow(ValidationError);
    });

    it('should check if user has sufficient credits', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [testUser] });

      const hasSufficient = await service.hasSufficientCredits(testUser.id, 50);
      const hasInsufficient = await service.hasSufficientCredits(testUser.id, 150);

      expect(hasSufficient).toBe(true);
      expect(hasInsufficient).toBe(false);
    });

    it('should record credit transactions', async () => {
      const transaction = {
        type: 'purchase',
        amount: 100,
        description: 'Credit purchase'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'txn-123', ...transaction }] });

      const result = await service.recordCreditTransaction(testUser.id, transaction);

      expect(result).toHaveRequiredProperties(['id', 'type', 'amount', 'description']);
      expect(result.type).toBe(transaction.type);
    });
  });

  describe('user activity tracking', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should record user activity', async () => {
      const activity = {
        type: 'summarization',
        details: { method: 'hybrid', credits_used: 5 }
      };

      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'activity-123', ...activity }] });

      const result = await service.recordActivity(testUser.id, activity);

      expect(result).toHaveRequiredProperties(['id', 'type', 'details']);
      expect(result.type).toBe(activity.type);
    });

    it('should get user activity history', async () => {
      const activities = [
        { id: 'act-1', type: 'summarization', created_at: new Date().toISOString() },
        { id: 'act-2', type: 'transcription', created_at: new Date().toISOString() }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: activities });

      const result = await service.getActivityHistory(testUser.id);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('summarization');
      expect(result[1].type).toBe('transcription');
    });

    it('should get activity history with pagination', async () => {
      const activities = Array(5).fill().map((_, i) => ({
        id: `act-${i}`,
        type: 'summarization',
        created_at: new Date().toISOString()
      }));

      mockDb.query.mockResolvedValueOnce({ rows: activities.slice(0, 3) });

      const result = await service.getActivityHistory(testUser.id, { limit: 3, offset: 0 });

      expect(result).toHaveLength(3);
    });

    it('should get activity statistics', async () => {
      const stats = [
        { type: 'summarization', count: '10', total_credits: '50' },
        { type: 'transcription', count: '5', total_credits: '75' }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: stats });

      const result = await service.getActivityStats(testUser.id);

      expect(result).toHaveProperty('summarization');
      expect(result).toHaveProperty('transcription');
      expect(result.summarization.count).toBe(10);
      expect(result.transcription.total_credits).toBe(75);
    });
  });

  describe('user preferences', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should get user preferences', async () => {
      const preferences = {
        theme: 'dark',
        language: 'en',
        notifications: true
      };

      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ ...testUser, preferences: JSON.stringify(preferences) }] 
      });

      const result = await service.getUserPreferences(testUser.id);

      expect(result).toEqual(preferences);
    });

    it('should update user preferences', async () => {
      const newPreferences = {
        theme: 'light',
        language: 'es',
        notifications: false
      };

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await service.updateUserPreferences(testUser.id, newPreferences);

      const updateCall = mockDb.query.mock.calls.find(call => 
        call[0].includes('UPDATE users SET preferences')
      );
      
      expect(updateCall).toBeTruthy();
      expect(updateCall[1]).toContain(JSON.stringify(newPreferences));
    });

    it('should merge partial preference updates', async () => {
      const currentPreferences = {
        theme: 'dark',
        language: 'en',
        notifications: true
      };

      const partialUpdate = { theme: 'light' };

      mockDb.query
        .mockResolvedValueOnce({ 
          rows: [{ ...testUser, preferences: JSON.stringify(currentPreferences) }] 
        })
        .mockResolvedValueOnce({ rows: [] });

      await service.updateUserPreferences(testUser.id, partialUpdate);

      const updateCall = mockDb.query.mock.calls.find(call => 
        call[0].includes('UPDATE users SET preferences')
      );
      
      const updatedPreferences = JSON.parse(updateCall[1][1]);
      expect(updatedPreferences.theme).toBe('light');
      expect(updatedPreferences.language).toBe('en'); // Preserved
      expect(updatedPreferences.notifications).toBe(true); // Preserved
    });
  });

  describe('user search and listing', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should search users by email', async () => {
      const users = [testUser];
      mockDb.query.mockResolvedValueOnce({ rows: users });

      const result = await service.searchUsers({ email: 'test@example.com' });

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('test@example.com');
    });

    it('should search users by name', async () => {
      const users = [testUser];
      mockDb.query.mockResolvedValueOnce({ rows: users });

      const result = await service.searchUsers({ name: 'Test User' });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test User');
    });

    it('should list users with pagination', async () => {
      const users = Array(10).fill().map((_, i) => ({
        ...testUser,
        id: `user-${i}`,
        email: `user${i}@example.com`
      }));

      mockDb.query.mockResolvedValueOnce({ rows: users.slice(0, 5) });

      const result = await service.listUsers({ limit: 5, offset: 0 });

      expect(result).toHaveLength(5);
    });

    it('should filter active users only', async () => {
      const activeUsers = [testUser];
      mockDb.query.mockResolvedValueOnce({ rows: activeUsers });

      const result = await service.listUsers({ active: true });

      expect(result).toHaveLength(1);
      expect(result[0].is_active).toBe(true);
    });
  });

  describe('account management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should deactivate user account', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [testUser] })
        .mockResolvedValueOnce({ rows: [] });

      await service.deactivateUser(testUser.id);

      const updateCall = mockDb.query.mock.calls.find(call => 
        call[0].includes('UPDATE users SET is_active = false')
      );
      
      expect(updateCall).toBeTruthy();
    });

    it('should reactivate user account', async () => {
      const inactiveUser = { ...testUser, is_active: false };
      
      mockDb.query
        .mockResolvedValueOnce({ rows: [inactiveUser] })
        .mockResolvedValueOnce({ rows: [] });

      await service.reactivateUser(testUser.id);

      const updateCall = mockDb.query.mock.calls.find(call => 
        call[0].includes('UPDATE users SET is_active = true')
      );
      
      expect(updateCall).toBeTruthy();
    });

    it('should delete user account', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [testUser] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await service.deleteUser(testUser.id);

      const deleteUserCall = mockDb.query.mock.calls.find(call => 
        call[0].includes('DELETE FROM users')
      );
      
      expect(deleteUserCall).toBeTruthy();
    });

    it('should cleanup user data when deleting account', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [testUser] })
        .mockResolvedValueOnce({ rows: [] }) // Delete activities
        .mockResolvedValueOnce({ rows: [] }) // Delete transactions
        .mockResolvedValueOnce({ rows: [] }); // Delete user

      await service.deleteUser(testUser.id);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM user_activities'),
        expect.any(Array)
      );
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM credit_transactions'),
        expect.any(Array)
      );
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should handle database connection errors', async () => {
      mockDb.query.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.getUserById(testUser.id)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle invalid user IDs', async () => {
      await expect(service.getUserById('')).rejects.toThrow(ValidationError);
      await expect(service.getUserById(null)).rejects.toThrow(ValidationError);
    });

    it('should handle SQL injection attempts', async () => {
      const maliciousId = "'; DROP TABLE users; --";

      // Should not execute malicious SQL
      await expect(service.getUserById(maliciousId)).rejects.toThrow(ValidationError);
    });
  });

  describe('performance and caching', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should cache frequently accessed user data', async () => {
      service.enableCaching = true;
      
      mockDb.query.mockResolvedValueOnce({ rows: [testUser] });

      // First call should hit database
      const result1 = await service.getUserById(testUser.id);
      
      // Second call should use cache
      const result2 = await service.getUserById(testUser.id);

      expect(result1).toEqual(result2);
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache on user updates', async () => {
      service.enableCaching = true;
      
      mockDb.query
        .mockResolvedValueOnce({ rows: [testUser] }) // Initial get
        .mockResolvedValueOnce({ rows: [testUser] }) // Update check
        .mockResolvedValueOnce({ rows: [] }) // Email uniqueness
        .mockResolvedValueOnce({ rows: [{ ...testUser, name: 'Updated' }] }) // Update
        .mockResolvedValueOnce({ rows: [{ ...testUser, name: 'Updated' }] }); // Get after update

      await service.getUserById(testUser.id); // Cache user
      await service.updateUserProfile(testUser.id, { name: 'Updated' }); // Should invalidate cache
      const result = await service.getUserById(testUser.id); // Should hit database again

      expect(result.name).toBe('Updated');
    });
  });

  describe('health check', () => {
    it('should return health status', async () => {
      await service.initialize();
      
      mockDb.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const health = await service.healthCheck();

      expect(health).toHaveRequiredProperties(['status', 'database', 'timestamp']);
      expect(health.status).toBe('healthy');
      expect(health.database.connected).toBe(true);
    });

    it('should detect database connection issues', async () => {
      await service.initialize();
      
      mockDb.query.mockRejectedValue(new Error('Connection failed'));

      const health = await service.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.database.connected).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources properly', async () => {
      await service.initialize();
      await service.cleanup();

      expect(mockLogger.info).toHaveBeenCalledWith('Enhanced User Service cleaned up');
    });
  });
});

