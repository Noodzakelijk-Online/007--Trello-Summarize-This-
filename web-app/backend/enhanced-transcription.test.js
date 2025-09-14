/**
 * Enhanced Transcription Service Tests
 * 
 * Comprehensive test suite for the enhanced transcription service
 * covering all providers, error handling, and edge cases.
 */

const EnhancedTranscriptionService = require('../../server/services/enhanced-transcription');
const { ValidationError, ServiceError } = require('../../server/middleware/errorHandler');
const fs = require('fs').promises;
const path = require('path');

describe('EnhancedTranscriptionService', () => {
  let service;
  let mockLogger;
  let testAudioFile;

  beforeEach(async () => {
    // Mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    // Create service instance
    service = new EnhancedTranscriptionService();
    service.logger = mockLogger;

    // Create test audio file
    testAudioFile = {
      fieldname: 'audio',
      originalname: 'test-audio.mp3',
      encoding: '7bit',
      mimetype: 'audio/mpeg',
      buffer: Buffer.from('fake audio data'),
      size: 1024000,
      path: '/tmp/test-audio.mp3'
    };

    // Mock file operations
    jest.spyOn(fs, 'writeFile').mockResolvedValue();
    jest.spyOn(fs, 'unlink').mockResolvedValue();
    jest.spyOn(fs, 'access').mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const newService = new EnhancedTranscriptionService();
      
      expect(newService.providers).toHaveProperty('whisper');
      expect(newService.providers).toHaveProperty('assemblyai');
      expect(newService.providers).toHaveProperty('speechmatics');
      expect(newService.providers).toHaveProperty('deepgram');
      expect(newService.providers).toHaveProperty('revai');
      expect(newService.isInitialized).toBe(false);
    });

    it('should initialize successfully', async () => {
      await service.initialize();
      
      expect(service.isInitialized).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Enhanced Transcription Service initialized');
    });

    it('should validate API keys during initialization', async () => {
      // Mock missing API keys
      const originalEnv = process.env;
      process.env = { ...originalEnv };
      delete process.env.OPENAI_API_KEY;
      
      await service.initialize();
      
      expect(mockLogger.warn).toHaveBeenCalledWith('Missing API key for provider: whisper');
      
      process.env = originalEnv;
    });
  });

  describe('file validation', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should validate audio file format', () => {
      const validFile = { ...testAudioFile, mimetype: 'audio/mpeg' };
      const invalidFile = { ...testAudioFile, mimetype: 'text/plain' };
      
      expect(() => service.validateAudioFile(validFile)).not.toThrow();
      expect(() => service.validateAudioFile(invalidFile)).toThrow(ValidationError);
    });

    it('should validate file size', () => {
      const validFile = { ...testAudioFile, size: 10 * 1024 * 1024 }; // 10MB
      const oversizedFile = { ...testAudioFile, size: 100 * 1024 * 1024 }; // 100MB
      
      expect(() => service.validateAudioFile(validFile)).not.toThrow();
      expect(() => service.validateAudioFile(oversizedFile)).toThrow(ValidationError);
    });

    it('should validate file duration', async () => {
      // Mock audio duration detection
      service.getAudioDuration = jest.fn().mockResolvedValue(300); // 5 minutes
      
      const result = await service.validateAudioFile(testAudioFile);
      expect(result.duration).toBe(300);
    });

    it('should reject files that are too long', async () => {
      service.getAudioDuration = jest.fn().mockResolvedValue(7200); // 2 hours
      
      await expect(service.validateAudioFile(testAudioFile)).rejects.toThrow(ValidationError);
    });

    it('should handle missing file properties', () => {
      const incompleteFile = { originalname: 'test.mp3' };
      
      expect(() => service.validateAudioFile(incompleteFile)).toThrow(ValidationError);
    });
  });

  describe('cost estimation', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should estimate cost based on duration and provider', () => {
      const duration = 300; // 5 minutes
      
      const whisperCost = service.estimateCost(duration, 'whisper');
      const assemblyaiCost = service.estimateCost(duration, 'assemblyai');
      
      expect(whisperCost).toBeGreaterThan(0);
      expect(assemblyaiCost).toBeGreaterThan(0);
      expect(typeof whisperCost).toBe('number');
      expect(typeof assemblyaiCost).toBe('number');
    });

    it('should handle different duration ranges', () => {
      const shortDuration = 30; // 30 seconds
      const longDuration = 3600; // 1 hour
      
      const shortCost = service.estimateCost(shortDuration, 'whisper');
      const longCost = service.estimateCost(longDuration, 'whisper');
      
      expect(longCost).toBeGreaterThan(shortCost);
    });

    it('should return minimum cost for very short files', () => {
      const veryShortDuration = 5; // 5 seconds
      
      const cost = service.estimateCost(veryShortDuration, 'whisper');
      
      expect(cost).toBeGreaterThanOrEqual(1);
    });
  });

  describe('provider selection', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should select best provider based on criteria', () => {
      const criteria = {
        language: 'en',
        quality: 'high',
        speed: 'medium'
      };
      
      const provider = service.selectBestProvider(criteria);
      
      expect(typeof provider).toBe('string');
      expect(service.providers).toHaveProperty(provider);
    });

    it('should fall back to default provider when criteria not met', () => {
      const criteria = {
        language: 'unsupported-language',
        quality: 'ultra-high'
      };
      
      const provider = service.selectBestProvider(criteria);
      
      expect(provider).toBe('whisper'); // Default provider
    });

    it('should consider provider availability', () => {
      // Mock provider availability
      service.checkProviderAvailability = jest.fn()
        .mockResolvedValueOnce(false) // whisper unavailable
        .mockResolvedValueOnce(true); // assemblyai available
      
      const provider = service.selectBestProvider({ quality: 'high' });
      
      expect(provider).not.toBe('whisper');
    });
  });

  describe('Whisper transcription', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should transcribe audio using Whisper', async () => {
      // Mock OpenAI Whisper API
      const mockWhisperResponse = {
        text: 'This is a test transcription from Whisper.',
        language: 'en',
        duration: 10.5
      };
      
      service.callWhisperAPI = jest.fn().mockResolvedValue(mockWhisperResponse);
      
      const result = await service.transcribeWithWhisper(testAudioFile);
      
      expect(result).toHaveRequiredProperties(['text', 'confidence', 'provider', 'processingTime']);
      expect(result.provider).toBe('whisper');
      expect(result.text).toBe(mockWhisperResponse.text);
      expect(result.confidence).toBeWithinRange(0, 1);
    });

    it('should handle Whisper API errors', async () => {
      service.callWhisperAPI = jest.fn().mockRejectedValue(new Error('Whisper API Error'));
      
      await expect(service.transcribeWithWhisper(testAudioFile)).rejects.toThrow(ServiceError);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should support different Whisper models', async () => {
      const options = { model: 'whisper-1', language: 'es' };
      
      service.callWhisperAPI = jest.fn().mockResolvedValue({
        text: 'Transcripción en español',
        language: 'es'
      });
      
      const result = await service.transcribeWithWhisper(testAudioFile, options);
      
      expect(service.callWhisperAPI).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining(options)
      );
    });
  });

  describe('AssemblyAI transcription', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should transcribe audio using AssemblyAI', async () => {
      const mockAssemblyResponse = {
        text: 'This is a test transcription from AssemblyAI.',
        confidence: 0.95,
        audio_duration: 10.5
      };
      
      service.callAssemblyAI = jest.fn().mockResolvedValue(mockAssemblyResponse);
      
      const result = await service.transcribeWithAssemblyAI(testAudioFile);
      
      expect(result).toHaveRequiredProperties(['text', 'confidence', 'provider', 'processingTime']);
      expect(result.provider).toBe('assemblyai');
      expect(result.text).toBe(mockAssemblyResponse.text);
      expect(result.confidence).toBe(mockAssemblyResponse.confidence);
    });

    it('should handle AssemblyAI polling for completion', async () => {
      service.uploadToAssemblyAI = jest.fn().mockResolvedValue('upload-url');
      service.submitAssemblyAIJob = jest.fn().mockResolvedValue('job-id');
      service.pollAssemblyAIJob = jest.fn().mockResolvedValue({
        status: 'completed',
        text: 'Completed transcription',
        confidence: 0.92
      });
      
      const result = await service.transcribeWithAssemblyAI(testAudioFile);
      
      expect(service.uploadToAssemblyAI).toHaveBeenCalled();
      expect(service.submitAssemblyAIJob).toHaveBeenCalled();
      expect(service.pollAssemblyAIJob).toHaveBeenCalled();
      expect(result.text).toBe('Completed transcription');
    });

    it('should handle AssemblyAI job failures', async () => {
      service.uploadToAssemblyAI = jest.fn().mockResolvedValue('upload-url');
      service.submitAssemblyAIJob = jest.fn().mockResolvedValue('job-id');
      service.pollAssemblyAIJob = jest.fn().mockResolvedValue({
        status: 'error',
        error: 'Transcription failed'
      });
      
      await expect(service.transcribeWithAssemblyAI(testAudioFile)).rejects.toThrow(ServiceError);
    });
  });

  describe('multi-provider transcription', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should transcribe using multiple providers', async () => {
      const providers = ['whisper', 'assemblyai'];
      
      service.transcribeWithWhisper = jest.fn().mockResolvedValue({
        text: 'Whisper result',
        confidence: 0.9,
        provider: 'whisper'
      });
      
      service.transcribeWithAssemblyAI = jest.fn().mockResolvedValue({
        text: 'AssemblyAI result',
        confidence: 0.95,
        provider: 'assemblyai'
      });
      
      const results = await service.transcribeWithMultipleProviders(testAudioFile, providers);
      
      expect(results).toHaveLength(2);
      expect(results[0].provider).toBe('whisper');
      expect(results[1].provider).toBe('assemblyai');
    });

    it('should handle partial failures in multi-provider transcription', async () => {
      const providers = ['whisper', 'assemblyai'];
      
      service.transcribeWithWhisper = jest.fn().mockResolvedValue({
        text: 'Whisper result',
        confidence: 0.9,
        provider: 'whisper'
      });
      
      service.transcribeWithAssemblyAI = jest.fn().mockRejectedValue(new Error('AssemblyAI failed'));
      
      const results = await service.transcribeWithMultipleProviders(testAudioFile, providers);
      
      expect(results).toHaveLength(1);
      expect(results[0].provider).toBe('whisper');
      expect(mockLogger.warn).toHaveBeenCalledWith('Provider assemblyai failed:', expect.any(Error));
    });

    it('should combine results from multiple providers', () => {
      const results = [
        { text: 'Hello world', confidence: 0.9, provider: 'whisper' },
        { text: 'Hello world!', confidence: 0.95, provider: 'assemblyai' },
        { text: 'Hello, world', confidence: 0.85, provider: 'deepgram' }
      ];
      
      const combined = service.combineTranscriptionResults(results);
      
      expect(combined).toHaveRequiredProperties(['text', 'confidence', 'providers', 'consensus']);
      expect(combined.providers).toHaveLength(3);
      expect(combined.confidence).toBeWithinRange(0.85, 0.95);
    });
  });

  describe('main transcribe method', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should transcribe with default provider', async () => {
      service.transcribeWithWhisper = jest.fn().mockResolvedValue({
        text: 'Default transcription',
        confidence: 0.9,
        provider: 'whisper',
        processingTime: 1000
      });
      
      const result = await service.transcribe(testAudioFile);
      
      expect(result.provider).toBe('whisper');
      expect(result.text).toBe('Default transcription');
    });

    it('should transcribe with specified provider', async () => {
      service.transcribeWithAssemblyAI = jest.fn().mockResolvedValue({
        text: 'AssemblyAI transcription',
        confidence: 0.95,
        provider: 'assemblyai',
        processingTime: 1500
      });
      
      const result = await service.transcribe(testAudioFile, { provider: 'assemblyai' });
      
      expect(result.provider).toBe('assemblyai');
      expect(service.transcribeWithAssemblyAI).toHaveBeenCalled();
    });

    it('should validate file before transcription', async () => {
      const invalidFile = { ...testAudioFile, mimetype: 'text/plain' };
      
      await expect(service.transcribe(invalidFile)).rejects.toThrow(ValidationError);
    });

    it('should include metadata in result', async () => {
      service.transcribeWithWhisper = jest.fn().mockResolvedValue({
        text: 'Test transcription',
        confidence: 0.9,
        provider: 'whisper',
        processingTime: 1000
      });
      
      service.getAudioDuration = jest.fn().mockResolvedValue(120);
      
      const result = await service.transcribe(testAudioFile);
      
      expect(result).toHaveRequiredProperties([
        'text',
        'confidence',
        'provider',
        'processingTime',
        'fileName',
        'fileSize',
        'duration',
        'wordCount'
      ]);
      
      expect(result.fileName).toBe(testAudioFile.originalname);
      expect(result.fileSize).toBe(testAudioFile.size);
      expect(result.wordCount).toBeGreaterThan(0);
    });

    it('should handle service not initialized', async () => {
      const uninitializedService = new EnhancedTranscriptionService();
      
      await expect(uninitializedService.transcribe(testAudioFile)).rejects.toThrow('Service not initialized');
    });
  });

  describe('queue integration', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should add transcription job to queue', async () => {
      const mockQueue = {
        add: jest.fn().mockResolvedValue({ id: 'job-123' })
      };
      
      service.transcriptionQueue = mockQueue;
      
      const jobId = await service.addToQueue(testAudioFile, { provider: 'whisper' });
      
      expect(jobId).toBe('job-123');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'transcribe',
        expect.objectContaining({
          file: testAudioFile,
          options: { provider: 'whisper' }
        })
      );
    });

    it('should process queued transcription job', async () => {
      const job = {
        id: 'job-123',
        data: {
          file: testAudioFile,
          options: { provider: 'whisper' }
        },
        progress: jest.fn(),
        log: jest.fn()
      };
      
      service.transcribeWithWhisper = jest.fn().mockResolvedValue({
        text: 'Queued transcription result',
        confidence: 0.9,
        provider: 'whisper'
      });
      
      const result = await service.processTranscriptionJob(job);
      
      expect(result.text).toBe('Queued transcription result');
      expect(job.progress).toHaveBeenCalled();
    });

    it('should handle job processing errors', async () => {
      const job = {
        id: 'job-123',
        data: {
          file: testAudioFile,
          options: { provider: 'whisper' }
        },
        progress: jest.fn(),
        log: jest.fn()
      };
      
      service.transcribeWithWhisper = jest.fn().mockRejectedValue(new Error('Processing failed'));
      
      await expect(service.processTranscriptionJob(job)).rejects.toThrow('Processing failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('performance and optimization', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should complete transcription within reasonable time', async () => {
      service.transcribeWithWhisper = jest.fn().mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            text: 'Performance test',
            confidence: 0.9,
            provider: 'whisper',
            processingTime: 1000
          }), 100)
        )
      );
      
      const startTime = Date.now();
      await service.transcribe(testAudioFile);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should handle concurrent transcriptions', async () => {
      service.transcribeWithWhisper = jest.fn().mockResolvedValue({
        text: 'Concurrent test',
        confidence: 0.9,
        provider: 'whisper',
        processingTime: 500
      });
      
      const promises = Array(3).fill().map(() => 
        service.transcribe(testAudioFile)
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.text).toBe('Concurrent test');
      });
    });

    it('should optimize file format for transcription', async () => {
      const optimizedFile = await service.optimizeAudioFile(testAudioFile);
      
      expect(optimizedFile).toHaveProperty('path');
      expect(optimizedFile).toHaveProperty('format');
      expect(optimizedFile.format).toBe('wav'); // Optimized format
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should handle network timeouts', async () => {
      service.transcribeWithWhisper = jest.fn().mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );
      
      await expect(service.transcribe(testAudioFile)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle corrupted audio files', async () => {
      const corruptedFile = { ...testAudioFile, buffer: Buffer.from('corrupted data') };
      
      service.validateAudioFile = jest.fn().mockRejectedValue(new ValidationError('Corrupted audio file'));
      
      await expect(service.transcribe(corruptedFile)).rejects.toThrow(ValidationError);
    });

    it('should handle provider rate limits', async () => {
      service.transcribeWithWhisper = jest.fn().mockRejectedValue({
        error: { type: 'rate_limit_exceeded' }
      });
      
      await expect(service.transcribe(testAudioFile)).rejects.toThrow(ServiceError);
    });

    it('should retry failed transcriptions', async () => {
      service.transcribeWithWhisper = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          text: 'Retry success',
          confidence: 0.9,
          provider: 'whisper'
        });
      
      const result = await service.transcribeWithRetry(testAudioFile, { provider: 'whisper' });
      
      expect(result.text).toBe('Retry success');
      expect(service.transcribeWithWhisper).toHaveBeenCalledTimes(2);
    });
  });

  describe('health check', () => {
    it('should return health status', async () => {
      await service.initialize();
      
      const health = await service.healthCheck();
      
      expect(health).toHaveRequiredProperties(['status', 'providers', 'timestamp']);
      expect(health.status).toBe('healthy');
      expect(health.providers).toHaveProperty('whisper');
      expect(health.providers).toHaveProperty('assemblyai');
    });

    it('should detect unhealthy providers', async () => {
      await service.initialize();
      
      service.checkProviderAvailability = jest.fn()
        .mockResolvedValueOnce(true)  // whisper healthy
        .mockResolvedValueOnce(false); // assemblyai unhealthy
      
      const health = await service.healthCheck();
      
      expect(health.providers.whisper.status).toBe('healthy');
      expect(health.providers.assemblyai.status).toBe('unhealthy');
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources properly', async () => {
      await service.initialize();
      
      // Mock temporary files
      service.tempFiles = ['/tmp/file1.wav', '/tmp/file2.wav'];
      
      await service.cleanup();
      
      expect(fs.unlink).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith('Enhanced Transcription Service cleaned up');
    });

    it('should handle cleanup errors gracefully', async () => {
      await service.initialize();
      
      service.tempFiles = ['/tmp/file1.wav'];
      fs.unlink.mockRejectedValue(new Error('File not found'));
      
      await service.cleanup();
      
      expect(mockLogger.warn).toHaveBeenCalledWith('Failed to cleanup temp file:', expect.any(Error));
    });
  });
});

