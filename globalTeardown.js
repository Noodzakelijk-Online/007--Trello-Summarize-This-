/**
 * Global Test Teardown for Summarize This
 * 
 * Cleans up the testing environment after all tests complete.
 * Closes database connections, clears mocks, and removes test files.
 */

module.exports = async () => {
  console.log('🧹 Cleaning up test environment...');

  try {
    // Stop in-memory MongoDB if it was started
    if (global.__MONGOD__) {
      await global.__MONGOD__.stop();
      console.log('✅ In-memory MongoDB stopped');
    }
    
    // Close Redis mock connection
    if (global.__REDIS_MOCK__) {
      global.__REDIS_MOCK__.disconnect();
      console.log('✅ Redis mock disconnected');
    }
    
    // Close test database pool
    if (global.testDbPool && global.testDbPool.end) {
      await global.testDbPool.end();
      console.log('✅ Test database pool closed');
    }
    
    // Clean up test files
    if (global.testUtils && global.testUtils.cleanupTestFiles) {
      await global.testUtils.cleanupTestFiles();
      console.log('✅ Test files cleaned up');
    }
    
    // Remove test upload directory
    const fs = require('fs').promises;
    const uploadDir = process.env.UPLOAD_DIR;
    
    if (uploadDir && uploadDir.includes('test')) {
      try {
        await fs.rmdir(uploadDir, { recursive: true });
        console.log('✅ Test upload directory removed');
      } catch (error) {
        // Ignore cleanup errors
        console.log('⚠️ Could not remove test upload directory:', error.message);
      }
    }
    
    // Clear all mocks
    if (jest && jest.clearAllMocks) {
      jest.clearAllMocks();
      console.log('✅ All mocks cleared');
    }
    
    // Clear global variables
    delete global.__MONGOD__;
    delete global.__REDIS_MOCK__;
    delete global.testUtils;
    delete global.mockStripe;
    delete global.mockOpenAI;
    delete global.mockEmailService;
    delete global.mockTranscriptionServices;
    delete global.testDbPool;
    
    console.log('✅ Global test teardown completed');
    
  } catch (error) {
    console.error('❌ Global test teardown failed:', error);
    // Don't throw error to avoid masking test failures
  }
};

