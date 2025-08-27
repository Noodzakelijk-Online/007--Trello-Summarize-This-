/**
 * Database-backed User Service
 * 
 * Replaces the in-memory user service with a persistent database implementation
 * using PostgreSQL for robust user data management, credit tracking, and usage logging.
 */

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../database/connection');
const { logger } = require('../middleware/errorHandler');
const { DatabaseError, ValidationError, NotFoundError, ConflictError } = require('../middleware/errorHandler');

class DatabaseUserService {
  constructor() {
    this.saltRounds = 12;
    this.encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
  }

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      await db.initialize();
      logger.info('Database User Service initialized');
    } catch (error) {
      logger.error('Failed to initialize Database User Service:', error);
      throw error;
    }
  }

  /**
   * Create a new user
   */
  async createUser(userData) {
    try {
      const { email, password, name, trelloUserId, trelloToken } = userData;

      // Check if user already exists
      const existingUser = await this.findUserByEmail(email);
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // Hash password if provided
      let passwordHash = null;
      if (password) {
        passwordHash = await bcrypt.hash(password, this.saltRounds);
      }

      // Create user in transaction
      const user = await db.transaction(async (client) => {
        // Insert user
        const userResult = await client.query(`
          INSERT INTO users (email, password_hash, name, trello_user_id, trello_token, credits)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, email, name, trello_user_id, credits, created_at
        `, [email, passwordHash, name, trelloUserId, trelloToken, 10]); // 10 free credits

        const newUser = userResult.rows[0];

        // Create default settings
        await client.query(`
          INSERT INTO user_settings (user_id)
          VALUES ($1)
        `, [newUser.id]);

        // Log user creation
        await this.logAuditEvent(client, newUser.id, 'user_created', 'user', newUser.id, null, {
          email: newUser.email,
          name: newUser.name
        });

        return newUser;
      });

      logger.info('User created successfully', {
        userId: user.id,
        email: user.email
      });

      return user;

    } catch (error) {
      logger.error('Failed to create user:', error);
      if (error.code === '23505') { // PostgreSQL unique violation
        throw new ConflictError('User with this email already exists');
      }
      throw new DatabaseError('user creation', error);
    }
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email) {
    try {
      const result = await db.query(`
        SELECT u.*, us.* 
        FROM users u
        LEFT JOIN user_settings us ON u.id = us.user_id
        WHERE u.email = $1 AND u.is_active = true
      `, [email]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to find user by email:', error);
      throw new DatabaseError('user lookup', error);
    }
  }

  /**
   * Find user by ID
   */
  async findUserById(userId) {
    try {
      const result = await db.query(`
        SELECT u.*, us.* 
        FROM users u
        LEFT JOIN user_settings us ON u.id = us.user_id
        WHERE u.id = $1 AND u.is_active = true
      `, [userId]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to find user by ID:', error);
      throw new DatabaseError('user lookup', error);
    }
  }

  /**
   * Authenticate user
   */
  async authenticateUser(email, password) {
    try {
      const user = await this.findUserByEmail(email);
      if (!user || !user.password_hash) {
        return null;
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return null;
      }

      // Update last login
      await db.query(`
        UPDATE users 
        SET last_login = CURRENT_TIMESTAMP 
        WHERE id = $1
      `, [user.id]);

      // Remove sensitive data
      delete user.password_hash;
      
      return user;
    } catch (error) {
      logger.error('Failed to authenticate user:', error);
      throw new DatabaseError('user authentication', error);
    }
  }

  /**
   * Get user credits
   */
  async getCredits(userId) {
    try {
      const result = await db.query(`
        SELECT credits FROM users WHERE id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        throw new NotFoundError('User');
      }

      return result.rows[0].credits;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Failed to get user credits:', error);
      throw new DatabaseError('credit lookup', error);
    }
  }

  /**
   * Check if user has sufficient credits
   */
  async checkCredits(userId, requiredCredits) {
    try {
      const currentCredits = await this.getCredits(userId);
      return currentCredits >= requiredCredits;
    } catch (error) {
      logger.error('Failed to check user credits:', error);
      return false;
    }
  }

  /**
   * Add credits to user account
   */
  async addCredits(userId, credits, reason = 'purchase') {
    try {
      const result = await db.transaction(async (client) => {
        // Update user credits
        const updateResult = await client.query(`
          UPDATE users 
          SET credits = credits + $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING credits
        `, [credits, userId]);

        if (updateResult.rows.length === 0) {
          throw new NotFoundError('User');
        }

        const newBalance = updateResult.rows[0].credits;

        // Log transaction
        await client.query(`
          INSERT INTO transactions (user_id, type, credits, description, status)
          VALUES ($1, 'credit_bonus', $2, $3, 'completed')
        `, [userId, credits, `Credits added: ${reason}`]);

        // Log audit event
        await this.logAuditEvent(client, userId, 'credits_added', 'user', userId, 
          { credits: newBalance - credits }, 
          { credits: newBalance }
        );

        return newBalance;
      });

      logger.info('Credits added to user account', {
        userId,
        creditsAdded: credits,
        newBalance: result,
        reason
      });

      return result;

    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Failed to add credits:', error);
      throw new DatabaseError('credit addition', error);
    }
  }

  /**
   * Deduct credits from user account
   */
  async deductCredits(userId, credits, reason = 'usage') {
    try {
      const result = await db.transaction(async (client) => {
        // Check current balance
        const balanceResult = await client.query(`
          SELECT credits FROM users WHERE id = $1 FOR UPDATE
        `, [userId]);

        if (balanceResult.rows.length === 0) {
          throw new NotFoundError('User');
        }

        const currentCredits = balanceResult.rows[0].credits;
        if (currentCredits < credits) {
          throw new ValidationError(`Insufficient credits. Required: ${credits}, Available: ${currentCredits}`);
        }

        // Update user credits
        const updateResult = await client.query(`
          UPDATE users 
          SET credits = credits - $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING credits
        `, [credits, userId]);

        const newBalance = updateResult.rows[0].credits;

        // Log transaction
        await client.query(`
          INSERT INTO transactions (user_id, type, credits, description, status)
          VALUES ($1, 'credit_deduction', $2, $3, 'completed')
        `, [userId, -credits, `Credits used: ${reason}`]);

        // Log audit event
        await this.logAuditEvent(client, userId, 'credits_deducted', 'user', userId,
          { credits: currentCredits },
          { credits: newBalance }
        );

        return newBalance;
      });

      logger.info('Credits deducted from user account', {
        userId,
        creditsDeducted: credits,
        newBalance: result,
        reason
      });

      return result;

    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) throw error;
      logger.error('Failed to deduct credits:', error);
      throw new DatabaseError('credit deduction', error);
    }
  }

  /**
   * Get user settings
   */
  async getSettings(userId) {
    try {
      const result = await db.query(`
        SELECT * FROM user_settings WHERE user_id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        // Create default settings if they don't exist
        return await this.createDefaultSettings(userId);
      }

      const settings = result.rows[0];
      
      // Decrypt sensitive fields
      if (settings.openai_api_key) {
        settings.openai_api_key = this.decrypt(settings.openai_api_key);
      }

      return settings;
    } catch (error) {
      logger.error('Failed to get user settings:', error);
      throw new DatabaseError('settings lookup', error);
    }
  }

  /**
   * Update user settings
   */
  async updateSettings(userId, settings) {
    try {
      const result = await db.transaction(async (client) => {
        // Get current settings for audit log
        const currentResult = await client.query(`
          SELECT * FROM user_settings WHERE user_id = $1
        `, [userId]);

        const currentSettings = currentResult.rows[0];

        // Encrypt sensitive fields
        const updatedSettings = { ...settings };
        if (updatedSettings.openai_api_key) {
          updatedSettings.openai_api_key = this.encrypt(updatedSettings.openai_api_key);
        }

        // Build dynamic update query
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(updatedSettings)) {
          if (key !== 'user_id' && key !== 'id' && key !== 'created_at') {
            updateFields.push(`${key} = $${paramIndex}`);
            updateValues.push(value);
            paramIndex++;
          }
        }

        updateValues.push(userId); // for WHERE clause

        const updateQuery = `
          UPDATE user_settings 
          SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $${paramIndex}
          RETURNING *
        `;

        const updateResult = await client.query(updateQuery, updateValues);

        if (updateResult.rows.length === 0) {
          throw new NotFoundError('User settings');
        }

        const newSettings = updateResult.rows[0];

        // Log audit event
        await this.logAuditEvent(client, userId, 'settings_updated', 'user_settings', newSettings.id,
          currentSettings,
          newSettings
        );

        return newSettings;
      });

      logger.info('User settings updated', {
        userId,
        updatedFields: Object.keys(settings)
      });

      return result;

    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Failed to update user settings:', error);
      throw new DatabaseError('settings update', error);
    }
  }

  /**
   * Create default settings for user
   */
  async createDefaultSettings(userId) {
    try {
      const result = await db.query(`
        INSERT INTO user_settings (user_id)
        VALUES ($1)
        RETURNING *
      `, [userId]);

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create default settings:', error);
      throw new DatabaseError('settings creation', error);
    }
  }

  /**
   * Reset user settings to defaults
   */
  async resetSettings(userId) {
    try {
      const result = await db.transaction(async (client) => {
        // Get current settings for audit
        const currentResult = await client.query(`
          SELECT * FROM user_settings WHERE user_id = $1
        `, [userId]);

        const currentSettings = currentResult.rows[0];

        // Reset to defaults
        const resetResult = await client.query(`
          UPDATE user_settings 
          SET 
            openai_api_key = NULL,
            default_method = 'hybrid',
            default_max_length = 200,
            email_notifications = false,
            notification_email = NULL,
            data_retention = 30,
            analytics_enabled = true,
            theme = 'auto',
            language = 'en',
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $1
          RETURNING *
        `, [userId]);

        if (resetResult.rows.length === 0) {
          throw new NotFoundError('User settings');
        }

        const newSettings = resetResult.rows[0];

        // Log audit event
        await this.logAuditEvent(client, userId, 'settings_reset', 'user_settings', newSettings.id,
          currentSettings,
          newSettings
        );

        return newSettings;
      });

      logger.info('User settings reset to defaults', { userId });
      return result;

    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Failed to reset user settings:', error);
      throw new DatabaseError('settings reset', error);
    }
  }

  /**
   * Log usage activity
   */
  async logUsage(userId, operationType, details) {
    try {
      const result = await db.query(`
        INSERT INTO usage_logs (
          user_id, operation_type, method, service, input_size, 
          output_size, credits_used, processing_time, success, 
          error_message, metadata, ip_address, user_agent
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
      `, [
        userId,
        operationType,
        details.method || null,
        details.service || null,
        details.inputSize || null,
        details.outputSize || null,
        details.creditsUsed || 0,
        details.processingTime || null,
        details.success !== false,
        details.errorMessage || null,
        JSON.stringify(details.metadata || {}),
        details.ipAddress || null,
        details.userAgent || null
      ]);

      return result.rows[0].id;

    } catch (error) {
      logger.error('Failed to log usage:', error);
      throw new DatabaseError('usage logging', error);
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId) {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(CASE WHEN operation_type = 'summarization' THEN 1 END) as total_summarizations,
          COUNT(CASE WHEN operation_type = 'transcription' THEN 1 END) as total_transcriptions,
          SUM(credits_used) as total_credits_used,
          AVG(processing_time) as avg_processing_time,
          COUNT(CASE WHEN success = false THEN 1 END) as failed_operations,
          MIN(created_at) as first_usage,
          MAX(created_at) as last_usage
        FROM usage_logs 
        WHERE user_id = $1
      `, [userId]);

      const usageStats = result.rows[0];

      // Get transaction stats
      const transactionResult = await db.query(`
        SELECT 
          SUM(CASE WHEN type = 'credit_purchase' AND status = 'completed' THEN amount ELSE 0 END) as total_spent,
          COUNT(CASE WHEN type = 'credit_purchase' AND status = 'completed' THEN 1 END) as total_purchases
        FROM transactions 
        WHERE user_id = $1
      `, [userId]);

      const transactionStats = transactionResult.rows[0];

      return {
        ...usageStats,
        ...transactionStats,
        total_summarizations: parseInt(usageStats.total_summarizations) || 0,
        total_transcriptions: parseInt(usageStats.total_transcriptions) || 0,
        total_credits_used: parseInt(usageStats.total_credits_used) || 0,
        failed_operations: parseInt(usageStats.failed_operations) || 0,
        total_purchases: parseInt(transactionStats.total_purchases) || 0,
        total_spent: parseFloat(transactionStats.total_spent) || 0
      };

    } catch (error) {
      logger.error('Failed to get user stats:', error);
      throw new DatabaseError('stats lookup', error);
    }
  }

  /**
   * Export user data
   */
  async exportUserData(userId) {
    try {
      const userData = {};

      // Get user info
      const userResult = await db.query(`
        SELECT id, email, name, credits, created_at, last_login
        FROM users WHERE id = $1
      `, [userId]);
      userData.user = userResult.rows[0];

      // Get settings
      userData.settings = await this.getSettings(userId);

      // Get usage logs
      const usageResult = await db.query(`
        SELECT * FROM usage_logs WHERE user_id = $1 ORDER BY created_at DESC
      `, [userId]);
      userData.usageLogs = usageResult.rows;

      // Get transactions
      const transactionResult = await db.query(`
        SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC
      `, [userId]);
      userData.transactions = transactionResult.rows;

      // Get statistics
      userData.statistics = await this.getUserStats(userId);

      return userData;

    } catch (error) {
      logger.error('Failed to export user data:', error);
      throw new DatabaseError('data export', error);
    }
  }

  /**
   * Get credit packages
   */
  async getCreditPackages() {
    try {
      const result = await db.query(`
        SELECT * FROM credit_packages 
        WHERE is_active = true 
        ORDER BY credits ASC
      `);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get credit packages:', error);
      throw new DatabaseError('credit packages lookup', error);
    }
  }

  /**
   * Create payment intent
   */
  async createPaymentIntent(userId, packageId, paymentMethod, billingDetails) {
    try {
      // Get package details
      const packageResult = await db.query(`
        SELECT * FROM credit_packages WHERE id = $1 AND is_active = true
      `, [packageId]);

      if (packageResult.rows.length === 0) {
        throw new NotFoundError('Credit package');
      }

      const package = packageResult.rows[0];

      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(package.price * 100), // Convert to cents
        currency: package.currency.toLowerCase(),
        payment_method_types: [paymentMethod],
        metadata: {
          userId,
          packageId,
          creditsToAdd: package.credits.toString()
        }
      });

      // Record pending transaction
      await db.query(`
        INSERT INTO transactions (
          user_id, type, amount, currency, credits, package_id, 
          payment_intent_id, status, description
        )
        VALUES ($1, 'credit_purchase', $2, $3, $4, $5, $6, 'pending', $7)
      `, [
        userId,
        package.price,
        package.currency,
        package.credits,
        packageId,
        paymentIntent.id,
        `Purchase of ${package.name}`
      ]);

      return paymentIntent;

    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Failed to create payment intent:', error);
      throw new DatabaseError('payment intent creation', error);
    }
  }

  /**
   * Verify payment and add credits
   */
  async verifyPayment(userId, paymentIntentId) {
    try {
      // Get payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        throw new ValidationError('Payment not completed');
      }

      // Get transaction record
      const transactionResult = await db.query(`
        SELECT * FROM transactions 
        WHERE user_id = $1 AND payment_intent_id = $2
      `, [userId, paymentIntentId]);

      if (transactionResult.rows.length === 0) {
        throw new NotFoundError('Transaction');
      }

      const transaction = transactionResult.rows[0];

      if (transaction.status === 'completed') {
        // Already processed
        return {
          success: true,
          creditsAdded: transaction.credits,
          newBalance: await this.getCredits(userId),
          transactionId: transaction.id
        };
      }

      // Process payment in transaction
      const result = await db.transaction(async (client) => {
        // Add credits to user
        const updateResult = await client.query(`
          UPDATE users 
          SET credits = credits + $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING credits
        `, [transaction.credits, userId]);

        const newBalance = updateResult.rows[0].credits;

        // Update transaction status
        await client.query(`
          UPDATE transactions 
          SET status = 'completed', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [transaction.id]);

        // Log audit event
        await this.logAuditEvent(client, userId, 'payment_completed', 'transaction', transaction.id,
          { status: 'pending' },
          { status: 'completed', credits_added: transaction.credits }
        );

        return {
          success: true,
          creditsAdded: transaction.credits,
          newBalance,
          transactionId: transaction.id
        };
      });

      logger.info('Payment verified and credits added', {
        userId,
        paymentIntentId,
        creditsAdded: transaction.credits
      });

      return result;

    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) throw error;
      logger.error('Failed to verify payment:', error);
      throw new DatabaseError('payment verification', error);
    }
  }

  /**
   * Record transaction
   */
  async recordTransaction(transactionData) {
    try {
      const result = await db.query(`
        INSERT INTO transactions (
          user_id, type, amount, currency, credits, package_id,
          payment_intent_id, charge_id, status, description, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `, [
        transactionData.userId,
        transactionData.type,
        transactionData.amount || null,
        transactionData.currency || 'USD',
        transactionData.credits,
        transactionData.packageId || null,
        transactionData.paymentIntentId || null,
        transactionData.chargeId || null,
        transactionData.status,
        transactionData.description || null,
        JSON.stringify(transactionData.metadata || {})
      ]);

      return result.rows[0].id;

    } catch (error) {
      logger.error('Failed to record transaction:', error);
      throw new DatabaseError('transaction recording', error);
    }
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(text) {
    if (!text) return null;
    
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedText) {
    if (!encryptedText) return null;
    
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt data:', error);
      return null;
    }
  }

  /**
   * Log audit events
   */
  async logAuditEvent(client, userId, action, resourceType, resourceId, oldValues, newValues) {
    try {
      await client.query(`
        INSERT INTO audit_logs (
          user_id, action, resource_type, resource_id, 
          old_values, new_values
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        action,
        resourceType,
        resourceId,
        JSON.stringify(oldValues || {}),
        JSON.stringify(newValues || {})
      ]);
    } catch (error) {
      logger.error('Failed to log audit event:', error);
      // Don't throw - audit logging shouldn't break main operations
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const result = await db.query('SELECT COUNT(*) as user_count FROM users');
      return {
        status: 'healthy',
        userCount: parseInt(result.rows[0].user_count),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      await db.close();
      logger.info('Database User Service cleaned up');
    } catch (error) {
      logger.error('Failed to cleanup Database User Service:', error);
    }
  }
}

module.exports = DatabaseUserService;

