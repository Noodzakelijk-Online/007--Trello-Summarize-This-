/**
 * Enhanced Error Handling Middleware
 * 
 * Provides comprehensive error handling with specific error types,
 * user-friendly messages, and detailed logging for debugging.
 */

const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'summarize-this' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Custom Error Classes
class AppError extends Error {
  constructor(message, statusCode, errorCode = null, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.field = field;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND_ERROR');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

class InsufficientCreditsError extends AppError {
  constructor(required, available) {
    super(`Insufficient credits. Required: ${required}, Available: ${available}`, 402, 'INSUFFICIENT_CREDITS');
    this.required = required;
    this.available = available;
  }
}

class ExternalServiceError extends AppError {
  constructor(service, originalError) {
    super(`External service error: ${service}`, 503, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
    this.originalError = originalError;
  }
}

class NetworkError extends AppError {
  constructor(message = 'Network connection failed') {
    super(message, 503, 'NETWORK_ERROR');
  }
}

class TimeoutError extends AppError {
  constructor(operation = 'Operation') {
    super(`${operation} timed out`, 408, 'TIMEOUT_ERROR');
  }
}

class DatabaseError extends AppError {
  constructor(operation, originalError) {
    super(`Database error during ${operation}`, 500, 'DATABASE_ERROR');
    this.operation = operation;
    this.originalError = originalError;
  }
}

// Error Handler Middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details
  logger.error('Error occurred:', {
    error: {
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
      errorCode: error.errorCode,
      timestamp: error.timestamp
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      body: req.method === 'POST' ? sanitizeRequestBody(req.body) : undefined
    }
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new ValidationError(message);
  }

  if (err.name === 'CastError') {
    const message = 'Invalid resource ID format';
    error = new ValidationError(message);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate value for field: ${field}`;
    error = new ConflictError(message);
  }

  if (err.name === 'JsonWebTokenError') {
    error = new AuthenticationError('Invalid authentication token');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AuthenticationError('Authentication token expired');
  }

  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    error = new NetworkError('Unable to connect to external service');
  }

  if (err.code === 'ETIMEDOUT') {
    error = new TimeoutError('Request timed out');
  }

  // Default to 500 server error
  if (!error.statusCode) {
    error = new AppError('Internal server error', 500, 'INTERNAL_ERROR', false);
  }

  // Send error response
  res.status(error.statusCode).json({
    success: false,
    error: {
      message: error.message,
      code: error.errorCode,
      timestamp: error.timestamp || new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
        details: error
      })
    },
    ...(error.field && { field: error.field }),
    ...(error.required && error.available && {
      credits: {
        required: error.required,
        available: error.available
      }
    })
  });
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Request sanitizer for logging
const sanitizeRequestBody = (body) => {
  const sanitized = { ...body };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'creditCard'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

// Global unhandled rejection handler
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Promise Rejection:', {
    error: err.message,
    stack: err.stack,
    promise: promise
  });
  
  // Close server gracefully
  process.exit(1);
});

// Global uncaught exception handler
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', {
    error: err.message,
    stack: err.stack
  });
  
  // Close server gracefully
  process.exit(1);
});

module.exports = {
  errorHandler,
  asyncHandler,
  logger,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InsufficientCreditsError,
  ExternalServiceError,
  NetworkError,
  TimeoutError,
  DatabaseError
};

