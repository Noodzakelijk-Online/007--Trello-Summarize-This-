/**
 * Enhanced User Service with Database Integration
 * 
 * Manages user data, credits, transactions, and usage statistics with persistent storage.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/user-service.log' })
  ]
});

// User Schema
const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true
  },
  credits: {
    type: Number,
    default: 10,
    min: 0
  },
  totalCreditsEarned: {
    type: Number,
    default: 10
  },
  totalCreditsSpent: {
    type: Number,
    default: 0
  },
  settings: {
    preferredSummarizationMethod: {
      type: String,
      enum: ['ruleBased', 'mlBased', 'aiPowered'],
      default: 'ruleBased'
    },
    preferredTranscriptionService: {
      type: String,
      enum: ['auto', 'whisper', 'speechmatics', 'assemblyai', 'deepgram', 'rev'],
      default: 'auto'
    },
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      lowCredits: {
        type: Boolean,
        default: true
      },
      completedOperations: {
        type: Boolean,
        default: true
      }
    }
  },
  usage: {
    totalSummarizations: {
      type: Number,
      default: 0
    },
    totalTranscriptions: {
      type: Number,
      default: 0
    },
    totalProcessingTime: {
      type: Number,
      default: 0
    },
    lastActivity: {
      type: Date,
      default: Date.now
    }
  },
  subscription: {
    type: {
      type: String,
      enum: ['free', 'basic', 'premium'],
      default: 'free'
    },
    startDate: Date,
    endDate: Date,
    autoRenew: {
      type: Boolean,
      default: false
    }
  },
  stripeCustomerId: String,
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Transaction Schema
const transactionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['purchase', 'usage', 'refund', 'bonus'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  stripePaymentIntentId: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'completed'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Usage Log Schema
const usageLogSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  operation: {
    type: String,
    enum: ['summarization', 'transcription'],
    required: true
  },
  method: String,
  service: String,
  creditsUsed: {
    type: Number,
    required: true
  },
  processingTime: Number,
  inputSize: Number,
  outputSize: Number,
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for better performance
userSchema.index({ 'usage.lastActivity': -1 });
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, createdAt: -1 });
usageLogSchema.index({ userId: 1, createdAt: -1 });
usageLogSchema.index({ operation: 1, createdAt: -1 });

// Models
const User = mongoose.model('User', userSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const UsageLog = mongoose.model('UsageLog', usageLogSchema);

class EnhancedUserService {
  constructor() {
    this.creditPackages = {
      basic: { credits: 100, price: 9.99 },
      standard: { credits: 500, price: 39.99 },
      premium: { credits: 1500, price: 99.99 }
    };
    
    this.connectToDatabase();
  }

  async connectToDatabase() {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/summarize-this';
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      logger.info('Connected to MongoDB successfully');
    } catch (error) {
      logger.error('MongoDB connection failed:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      await mongoose.connection.db.admin().ping();
      return {
        status: 'healthy',
        database: 'connected',
        collections: {
          users: await User.countDocuments(),
          transactions: await Transaction.countDocuments(),
          usageLogs: await UsageLog.countDocuments()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  async getUserInfo(userId) {
    try {
      let user = await User.findOne({ userId });
      
      if (!user) {
        // Create new user with default credits
        user = new User({
          userId,
          credits: 10,
          totalCreditsEarned: 10
        });
        await user.save();
        
        // Log the new user creation
        await this.logTransaction(userId, 'bonus', 10, 'Welcome bonus credits');
        
        logger.info('New user created', { userId });
      }
      
      return user;
    } catch (error) {
      logger.error('Error getting user info:', error);
      throw error;
    }
  }

  async getCredits(userId) {
    try {
      const user = await this.getUserInfo(userId);
      return user.credits;
    } catch (error) {
      logger.error('Error getting credits:', error);
      throw error;
    }
  }

  async checkCredits(userId, requiredCredits) {
    try {
      const userCredits = await this.getCredits(userId);
      return userCredits >= requiredCredits;
    } catch (error) {
      logger.error('Error checking credits:', error);
      throw error;
    }
  }

  async deductCredits(userId, amount, description, metadata = {}) {
    try {
      const user = await User.findOne({ userId });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      if (user.credits < amount) {
        throw new Error('Insufficient credits');
      }
      
      // Update user credits and usage
      user.credits -= amount;
      user.totalCreditsSpent += amount;
      user.usage.lastActivity = new Date();
      
      if (metadata.operation === 'summarization') {
        user.usage.totalSummarizations += 1;
      } else if (metadata.operation === 'transcription') {
        user.usage.totalTranscriptions += 1;
      }
      
      if (metadata.processingTime) {
        user.usage.totalProcessingTime += metadata.processingTime;
      }
      
      user.updatedAt = new Date();
      await user.save();
      
      // Log the transaction
      await this.logTransaction(userId, 'usage', -amount, description, metadata);
      
      // Log detailed usage
      await this.logUsage(userId, metadata.operation || 'unknown', {
        method: metadata.method,
        service: metadata.service,
        creditsUsed: amount,
        processingTime: metadata.processingTime,
        inputSize: metadata.textLength || metadata.fileSize,
        metadata
      });
      
      logger.info('Credits deducted successfully', {
        userId,
        amount,
        remainingCredits: user.credits
      });
      
      return user.credits;
    } catch (error) {
      logger.error('Error deducting credits:', error);
      throw error;
    }
  }

  async purchaseCredits(userId, packageType, paymentToken, customAmount = null) {
    try {
      const user = await this.getUserInfo(userId);
      
      let credits, price;
      if (customAmount && customAmount > 0) {
        credits = Math.floor(customAmount / 0.1); // $0.10 per credit
        price = customAmount;
      } else if (this.creditPackages[packageType]) {
        credits = this.creditPackages[packageType].credits;
        price = this.creditPackages[packageType].price;
      } else {
        throw new Error('Invalid package type');
      }
      
      // Create Stripe customer if doesn't exist
      if (!user.stripeCustomerId) {
        const customer = await stripe.customers.create({
          metadata: { userId }
        });
        user.stripeCustomerId = customer.id;
        await user.save();
      }
      
      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(price * 100), // Convert to cents
        currency: 'usd',
        customer: user.stripeCustomerId,
        payment_method: paymentToken,
        confirmation_method: 'manual',
        confirm: true,
        metadata: {
          userId,
          packageType: packageType || 'custom',
          credits: credits.toString()
        }
      });
      
      if (paymentIntent.status === 'succeeded') {
        // Add credits to user account
        user.credits += credits;
        user.totalCreditsEarned += credits;
        user.updatedAt = new Date();
        await user.save();
        
        // Log the transaction
        await this.logTransaction(userId, 'purchase', credits, `Purchased ${packageType || 'custom'} package`, {
          packageType: packageType || 'custom',
          price,
          stripePaymentIntentId: paymentIntent.id
        });
        
        logger.info('Credits purchased successfully', {
          userId,
          packageType,
          credits,
          price,
          paymentIntentId: paymentIntent.id
        });
        
        return {
          success: true,
          creditsAdded: credits,
          newBalance: user.credits,
          transactionId: paymentIntent.id
        };
      } else {
        throw new Error(`Payment failed: ${paymentIntent.status}`);
      }
    } catch (error) {
      logger.error('Error purchasing credits:', error);
      return {
        success: false,
        error: error.message,
        details: error.type || 'unknown_error'
      };
    }
  }

  async getTransactionHistory(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        type = 'all',
        startDate,
        endDate
      } = options;
      
      const query = { userId };
      
      if (type !== 'all') {
        query.type = type;
      }
      
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }
      
      const skip = (page - 1) * limit;
      
      const [transactions, total] = await Promise.all([
        Transaction.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Transaction.countDocuments(query)
      ]);
      
      return {
        data: transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Error getting transaction history:', error);
      throw error;
    }
  }

  async getUserStats(userId) {
    try {
      const user = await this.getUserInfo(userId);
      
      // Get usage statistics
      const usageStats = await UsageLog.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: '$operation',
            count: { $sum: 1 },
            totalCredits: { $sum: '$creditsUsed' },
            avgProcessingTime: { $avg: '$processingTime' },
            totalInputSize: { $sum: '$inputSize' }
          }
        }
      ]);
      
      // Get recent activity
      const recentActivity = await UsageLog.find({ userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
      
      // Calculate efficiency metrics
      const totalOperations = user.usage.totalSummarizations + user.usage.totalTranscriptions;
      const avgCreditsPerOperation = totalOperations > 0 ? user.totalCreditsSpent / totalOperations : 0;
      const avgProcessingTime = totalOperations > 0 ? user.usage.totalProcessingTime / totalOperations : 0;
      
      return {
        user: {
          credits: user.credits,
          totalCreditsEarned: user.totalCreditsEarned,
          totalCreditsSpent: user.totalCreditsSpent,
          memberSince: user.createdAt,
          lastActivity: user.usage.lastActivity
        },
        usage: {
          totalSummarizations: user.usage.totalSummarizations,
          totalTranscriptions: user.usage.totalTranscriptions,
          totalProcessingTime: user.usage.totalProcessingTime,
          avgCreditsPerOperation,
          avgProcessingTime
        },
        breakdown: usageStats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            totalCredits: stat.totalCredits,
            avgProcessingTime: stat.avgProcessingTime,
            totalInputSize: stat.totalInputSize
          };
          return acc;
        }, {}),
        recentActivity
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  async getUsageStats(userId) {
    try {
      const user = await this.getUserInfo(userId);
      
      // Get usage for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentUsage = await UsageLog.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              operation: '$operation'
            },
            count: { $sum: 1 },
            credits: { $sum: '$creditsUsed' }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]);
      
      return {
        current: {
          credits: user.credits,
          totalOperations: user.usage.totalSummarizations + user.usage.totalTranscriptions
        },
        recent: recentUsage
      };
    } catch (error) {
      logger.error('Error getting usage stats:', error);
      throw error;
    }
  }

  async updateUserSettings(userId, settings) {
    try {
      const user = await User.findOne({ userId });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Validate settings
      const allowedSettings = [
        'preferredSummarizationMethod',
        'preferredTranscriptionService',
        'language',
        'notifications'
      ];
      
      const updatedSettings = {};
      for (const [key, value] of Object.entries(settings)) {
        if (allowedSettings.includes(key)) {
          updatedSettings[`settings.${key}`] = value;
        }
      }
      
      if (Object.keys(updatedSettings).length === 0) {
        throw new Error('No valid settings provided');
      }
      
      await User.updateOne(
        { userId },
        {
          $set: {
            ...updatedSettings,
            updatedAt: new Date()
          }
        }
      );
      
      logger.info('User settings updated', { userId, settings: updatedSettings });
      
      return { success: true };
    } catch (error) {
      logger.error('Error updating user settings:', error);
      throw error;
    }
  }

  async logTransaction(userId, type, amount, description, metadata = {}) {
    try {
      const transaction = new Transaction({
        userId,
        type,
        amount,
        description,
        metadata,
        stripePaymentIntentId: metadata.stripePaymentIntentId
      });
      
      await transaction.save();
      return transaction;
    } catch (error) {
      logger.error('Error logging transaction:', error);
      throw error;
    }
  }

  async logUsage(userId, operation, details) {
    try {
      const usageLog = new UsageLog({
        userId,
        operation,
        method: details.method,
        service: details.service,
        creditsUsed: details.creditsUsed,
        processingTime: details.processingTime,
        inputSize: details.inputSize,
        outputSize: details.outputSize,
        success: details.success !== false,
        errorMessage: details.errorMessage,
        metadata: details.metadata || {}
      });
      
      await usageLog.save();
      return usageLog;
    } catch (error) {
      logger.error('Error logging usage:', error);
      throw error;
    }
  }

  async getSystemStats() {
    try {
      const [userCount, transactionCount, usageCount] = await Promise.all([
        User.countDocuments(),
        Transaction.countDocuments(),
        UsageLog.countDocuments()
      ]);
      
      const revenueStats = await Transaction.aggregate([
        { $match: { type: 'purchase' } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$metadata.price' },
            totalCreditsIssued: { $sum: '$amount' }
          }
        }
      ]);
      
      const usageStats = await UsageLog.aggregate([
        {
          $group: {
            _id: '$operation',
            count: { $sum: 1 },
            totalCredits: { $sum: '$creditsUsed' }
          }
        }
      ]);
      
      return {
        users: {
          total: userCount,
          active: await User.countDocuments({ isActive: true })
        },
        transactions: {
          total: transactionCount,
          revenue: revenueStats[0]?.totalRevenue || 0,
          creditsIssued: revenueStats[0]?.totalCreditsIssued || 0
        },
        usage: {
          total: usageCount,
          breakdown: usageStats.reduce((acc, stat) => {
            acc[stat._id] = {
              count: stat.count,
              totalCredits: stat.totalCredits
            };
            return acc;
          }, {})
        }
      };
    } catch (error) {
      logger.error('Error getting system stats:', error);
      throw error;
    }
  }

  async cleanup() {
    try {
      await mongoose.connection.close();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database connection:', error);
    }
  }
}

module.exports = EnhancedUserService;

