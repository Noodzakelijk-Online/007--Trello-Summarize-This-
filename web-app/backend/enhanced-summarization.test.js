/**
 * Enhanced Summarization Service Tests
 * 
 * Comprehensive test suite for the enhanced summarization service
 * covering all methods, error handling, and edge cases.
 */

const EnhancedSummarizationService = require('../../server/services/enhanced-summarization');
const { ValidationError, ServiceError } = require('../../server/middleware/errorHandler');

describe('EnhancedSummarizationService', () => {
  let service;
  let mockOpenAI;
  let mockLogger;

  beforeEach(() => {
    // Mock OpenAI
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    };

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    // Create service instance
    service = new EnhancedSummarizationService();
    service.openai = mockOpenAI;
    service.logger = mockLogger;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const newService = new EnhancedSummarizationService();
      
      expect(newService.methods).toHaveProperty('ruleBased');
      expect(newService.methods).toHaveProperty('mlBased');
      expect(newService.methods).toHaveProperty('aiPowered');
      expect(newService.methods).toHaveProperty('hybrid');
      expect(newService.isInitialized).toBe(false);
    });

    it('should initialize successfully', async () => {
      await service.initialize();
      
      expect(service.isInitialized).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Enhanced Summarization Service initialized');
    });
  });

  describe('input validation', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should validate text input', () => {
      expect(() => service.validateInput('')).toThrow(ValidationError);
      expect(() => service.validateInput('a')).toThrow(ValidationError);
      expect(() => service.validateInput('a'.repeat(50001))).toThrow(ValidationError);
      expect(() => service.validateInput(null)).toThrow(ValidationError);
      expect(() => service.validateInput(undefined)).toThrow(ValidationError);
    });

    it('should validate method parameter', () => {
      const validText = 'This is a valid text for summarization.';
      
      expect(() => service.validateInput(validText, 'invalidMethod')).toThrow(ValidationError);
      expect(() => service.validateInput(validText, '')).toThrow(ValidationError);
      expect(() => service.validateInput(validText, null)).toThrow(ValidationError);
    });

    it('should validate options parameter', () => {
      const validText = 'This is a valid text for summarization.';
      
      expect(() => service.validateInput(validText, 'hybrid', { maxLength: 0 })).toThrow(ValidationError);
      expect(() => service.validateInput(validText, 'hybrid', { maxLength: 2001 })).toThrow(ValidationError);
      expect(() => service.validateInput(validText, 'hybrid', { style: 'invalid' })).toThrow(ValidationError);
    });

    it('should accept valid input', () => {
      const validText = 'This is a valid text for summarization that meets the minimum length requirement.';
      
      expect(() => service.validateInput(validText)).not.toThrow();
      expect(() => service.validateInput(validText, 'hybrid')).not.toThrow();
      expect(() => service.validateInput(validText, 'aiPowered', { maxLength: 200 })).not.toThrow();
    });
  });

  describe('cost estimation', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should estimate cost for rule-based method', () => {
      const cost = service.estimateCost('This is a test text.', 'ruleBased');
      
      expect(cost).toBe(1);
    });

    it('should estimate cost for ML-based method', () => {
      const cost = service.estimateCost('This is a test text.', 'mlBased');
      
      expect(cost).toBe(2);
    });

    it('should estimate cost for AI-powered method', () => {
      const shortText = 'Short text.';
      const longText = 'a'.repeat(1000);
      
      expect(service.estimateCost(shortText, 'aiPowered')).toBe(3);
      expect(service.estimateCost(longText, 'aiPowered')).toBeGreaterThan(3);
    });

    it('should estimate cost for hybrid method', () => {
      const cost = service.estimateCost('This is a test text.', 'hybrid');
      
      expect(cost).toBe(4);
    });

    it('should handle invalid method gracefully', () => {
      const cost = service.estimateCost('This is a test text.', 'invalid');
      
      expect(cost).toBe(1);
    });
  });

  describe('rule-based summarization', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should summarize text using rule-based method', async () => {
      const text = 'This is the first sentence. This is the second sentence. This is the third sentence. This is the fourth sentence.';
      const options = { maxLength: 50 };
      
      const result = await service.summarizeRuleBased(text, options);
      
      expect(result).toHaveRequiredProperties(['summary', 'confidence', 'method', 'processingTime']);
      expect(result.method).toBe('ruleBased');
      expect(result.summary).toBeTruthy();
      expect(result.confidence).toBeWithinRange(0, 1);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should handle short text appropriately', async () => {
      const text = 'Short text.';
      
      const result = await service.summarizeRuleBased(text);
      
      expect(result.summary).toBe(text);
      expect(result.confidence).toBeWithinRange(0.8, 1);
    });

    it('should respect maxLength option', async () => {
      const text = 'This is a very long sentence that should be truncated when the maxLength option is set to a small value.';
      const options = { maxLength: 20 };
      
      const result = await service.summarizeRuleBased(text, options);
      
      expect(result.summary.length).toBeLessThanOrEqual(25); // Allow some flexibility for word boundaries
    });

    it('should extract key sentences', async () => {
      const text = 'Important sentence. Less important sentence. Another important sentence. Filler text.';
      
      const result = await service.summarizeRuleBased(text);
      
      expect(result.summary).toContain('Important');
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('ML-based summarization', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should summarize text using ML-based method', async () => {
      const text = 'This is a test text for ML-based summarization. It contains multiple sentences to test the algorithm.';
      
      const result = await service.summarizeMLBased(text);
      
      expect(result).toHaveRequiredProperties(['summary', 'confidence', 'method', 'processingTime']);
      expect(result.method).toBe('mlBased');
      expect(result.summary).toBeTruthy();
      expect(result.confidence).toBeWithinRange(0, 1);
    });

    it('should calculate TF-IDF scores correctly', () => {
      const sentences = [
        'The cat sat on the mat.',
        'The dog ran in the park.',
        'Cats and dogs are pets.'
      ];
      
      const scores = service.calculateTFIDF(sentences);
      
      expect(scores).toHaveLength(3);
      expect(scores.every(score => typeof score === 'number')).toBe(true);
    });

    it('should rank sentences by importance', () => {
      const sentences = [
        'This is important.',
        'This is less important.',
        'This is very important.'
      ];
      
      const ranked = service.rankSentences(sentences);
      
      expect(ranked).toHaveLength(3);
      expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
      expect(ranked[1].score).toBeGreaterThanOrEqual(ranked[2].score);
    });
  });

  describe('AI-powered summarization', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should summarize text using AI-powered method', async () => {
      const text = 'This is a test text for AI-powered summarization.';
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: 'AI-generated summary of the test text.'
          }
        }],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 10,
          total_tokens: 30
        }
      });
      
      const result = await service.summarizeAIPowered(text);
      
      expect(result).toHaveRequiredProperties(['summary', 'confidence', 'method', 'processingTime', 'tokensUsed']);
      expect(result.method).toBe('aiPowered');
      expect(result.summary).toBe('AI-generated summary of the test text.');
      expect(result.tokensUsed).toBe(30);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
    });

    it('should handle OpenAI API errors', async () => {
      const text = 'This is a test text.';
      
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));
      
      await expect(service.summarizeAIPowered(text)).rejects.toThrow(ServiceError);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should build correct prompt for different styles', () => {
      const text = 'Test text';
      const options = { style: 'technical', maxLength: 100 };
      
      const prompt = service.buildAIPrompt(text, options);
      
      expect(prompt).toContain('technical');
      expect(prompt).toContain('100');
      expect(prompt).toContain(text);
    });

    it('should handle rate limiting', async () => {
      const text = 'This is a test text.';
      
      mockOpenAI.chat.completions.create.mockRejectedValue({
        error: { type: 'rate_limit_exceeded' }
      });
      
      await expect(service.summarizeAIPowered(text)).rejects.toThrow(ServiceError);
    });
  });

  describe('hybrid summarization', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should combine multiple methods for hybrid summarization', async () => {
      const text = 'This is a comprehensive test text for hybrid summarization. It should use multiple methods to create the best possible summary.';
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: 'AI-enhanced hybrid summary.'
          }
        }],
        usage: {
          prompt_tokens: 25,
          completion_tokens: 15,
          total_tokens: 40
        }
      });
      
      const result = await service.summarizeHybrid(text);
      
      expect(result).toHaveRequiredProperties(['summary', 'confidence', 'method', 'processingTime']);
      expect(result.method).toBe('hybrid');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should fall back gracefully when AI fails', async () => {
      const text = 'This is a test text for hybrid summarization fallback.';
      
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('AI Service Unavailable'));
      
      const result = await service.summarizeHybrid(text);
      
      expect(result.method).toBe('hybrid');
      expect(result.summary).toBeTruthy();
      expect(mockLogger.warn).toHaveBeenCalledWith('AI enhancement failed, using ML+Rule combination');
    });

    it('should weight different method results appropriately', () => {
      const results = [
        { summary: 'Rule-based summary', confidence: 0.6 },
        { summary: 'ML-based summary', confidence: 0.8 },
        { summary: 'AI-powered summary', confidence: 0.9 }
      ];
      
      const combined = service.combineResults(results);
      
      expect(combined.summary).toBeTruthy();
      expect(combined.confidence).toBeWithinRange(0.6, 0.9);
    });
  });

  describe('main summarize method', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should route to correct method based on parameter', async () => {
      const text = 'This is a test text for routing.';
      
      // Mock AI response for aiPowered method
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'AI summary' } }],
        usage: { total_tokens: 20 }
      });
      
      const ruleResult = await service.summarize(text, 'ruleBased');
      expect(ruleResult.method).toBe('ruleBased');
      
      const mlResult = await service.summarize(text, 'mlBased');
      expect(mlResult.method).toBe('mlBased');
      
      const aiResult = await service.summarize(text, 'aiPowered');
      expect(aiResult.method).toBe('aiPowered');
      
      const hybridResult = await service.summarize(text, 'hybrid');
      expect(hybridResult.method).toBe('hybrid');
    });

    it('should use default method when none specified', async () => {
      const text = 'This is a test text.';
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Default summary' } }],
        usage: { total_tokens: 15 }
      });
      
      const result = await service.summarize(text);
      
      expect(result.method).toBe('hybrid'); // Default method
    });

    it('should validate input before processing', async () => {
      await expect(service.summarize('')).rejects.toThrow(ValidationError);
      await expect(service.summarize('short')).rejects.toThrow(ValidationError);
      await expect(service.summarize(null)).rejects.toThrow(ValidationError);
    });

    it('should handle service not initialized', async () => {
      const uninitializedService = new EnhancedSummarizationService();
      
      await expect(uninitializedService.summarize('test text')).rejects.toThrow('Service not initialized');
    });

    it('should include metadata in result', async () => {
      const text = 'This is a test text for metadata inclusion.';
      
      const result = await service.summarize(text, 'ruleBased');
      
      expect(result).toHaveRequiredProperties([
        'summary',
        'confidence',
        'method',
        'processingTime',
        'originalLength',
        'summaryLength',
        'compressionRatio'
      ]);
      
      expect(result.originalLength).toBe(text.length);
      expect(result.summaryLength).toBe(result.summary.length);
      expect(result.compressionRatio).toBeWithinRange(0, 1);
    });
  });

  describe('performance and optimization', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should complete summarization within reasonable time', async () => {
      const text = 'This is a performance test text.';
      const startTime = Date.now();
      
      await service.summarize(text, 'ruleBased');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent requests', async () => {
      const text = 'This is a concurrency test text.';
      
      const promises = Array(5).fill().map(() => 
        service.summarize(text, 'ruleBased')
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.summary).toBeTruthy();
        expect(result.method).toBe('ruleBased');
      });
    });

    it('should cache results for identical requests', async () => {
      const text = 'This is a caching test text.';
      
      // Enable caching
      service.enableCaching = true;
      
      const result1 = await service.summarize(text, 'ruleBased');
      const result2 = await service.summarize(text, 'ruleBased');
      
      expect(result1.summary).toBe(result2.summary);
      expect(result2.fromCache).toBe(true);
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should handle network errors gracefully', async () => {
      const text = 'This is a network error test.';
      
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Network Error'));
      
      await expect(service.summarize(text, 'aiPowered')).rejects.toThrow(ServiceError);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle malformed API responses', async () => {
      const text = 'This is a malformed response test.';
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [] // Empty choices array
      });
      
      await expect(service.summarize(text, 'aiPowered')).rejects.toThrow(ServiceError);
    });

    it('should handle timeout errors', async () => {
      const text = 'This is a timeout test.';
      
      mockOpenAI.chat.completions.create.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );
      
      await expect(service.summarize(text, 'aiPowered')).rejects.toThrow();
    });
  });

  describe('configuration and customization', () => {
    it('should accept custom configuration', () => {
      const customConfig = {
        defaultMethod: 'aiPowered',
        maxLength: 500,
        enableCaching: true
      };
      
      const customService = new EnhancedSummarizationService(customConfig);
      
      expect(customService.config.defaultMethod).toBe('aiPowered');
      expect(customService.config.maxLength).toBe(500);
      expect(customService.config.enableCaching).toBe(true);
    });

    it('should validate configuration parameters', () => {
      const invalidConfig = {
        defaultMethod: 'invalidMethod',
        maxLength: -1
      };
      
      expect(() => new EnhancedSummarizationService(invalidConfig)).toThrow();
    });
  });

  describe('health check', () => {
    it('should return health status', async () => {
      await service.initialize();
      
      const health = await service.healthCheck();
      
      expect(health).toHaveRequiredProperties(['status', 'methods', 'timestamp']);
      expect(health.status).toBe('healthy');
      expect(health.methods).toHaveProperty('ruleBased');
      expect(health.methods).toHaveProperty('mlBased');
      expect(health.methods).toHaveProperty('aiPowered');
      expect(health.methods).toHaveProperty('hybrid');
    });

    it('should detect unhealthy state', async () => {
      // Don't initialize service
      const health = await service.healthCheck();
      
      expect(health.status).toBe('unhealthy');
      expect(health.error).toBeTruthy();
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources properly', async () => {
      await service.initialize();
      await service.cleanup();
      
      expect(mockLogger.info).toHaveBeenCalledWith('Enhanced Summarization Service cleaned up');
    });
  });
});

