// Artillery.io Custom Processor for Summarize This Load Testing
// Provides custom functions for data generation and test logic

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Generate random string
function randomString(length = 8) {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
}

// Generate random email
function randomEmail() {
  return `test${randomString(8)}@example.com`;
}

// Generate sample text for testing
function generateSampleText(minWords = 100, maxWords = 500) {
  const words = [
    'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing',
    'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore',
    'et', 'dolore', 'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam',
    'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip',
    'ex', 'ea', 'commodo', 'consequat', 'duis', 'aute', 'irure', 'in',
    'reprehenderit', 'voluptate', 'velit', 'esse', 'cillum', 'fugiat',
    'nulla', 'pariatur', 'excepteur', 'sint', 'occaecat', 'cupidatat',
    'non', 'proident', 'sunt', 'culpa', 'qui', 'officia', 'deserunt',
    'mollit', 'anim', 'id', 'est', 'laborum', 'the', 'quick', 'brown',
    'fox', 'jumps', 'over', 'lazy', 'dog', 'this', 'is', 'sample',
    'text', 'for', 'testing', 'purposes', 'artificial', 'intelligence',
    'machine', 'learning', 'natural', 'language', 'processing', 'data',
    'analysis', 'performance', 'optimization', 'scalability', 'reliability'
  ];
  
  const wordCount = Math.floor(Math.random() * (maxWords - minWords)) + minWords;
  const selectedWords = [];
  
  for (let i = 0; i < wordCount; i++) {
    selectedWords.push(words[Math.floor(Math.random() * words.length)]);
  }
  
  return selectedWords.join(' ') + '.';
}

// Generate realistic user data
function generateUserData() {
  const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa', 'Chris', 'Emma'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  
  return {
    name: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomString(4)}@example.com`,
    password: 'testpassword123'
  };
}

// =============================================================================
// ARTILLERY PROCESSOR FUNCTIONS
// =============================================================================

// Before scenario hook
function beforeScenario(userContext, events, done) {
  // Generate user data for this scenario
  const userData = generateUserData();
  userContext.vars.testUser = userData;
  userContext.vars.sampleText = generateSampleText();
  userContext.vars.randomId = randomString(12);
  
  // Log scenario start
  console.log(`Starting scenario for user: ${userData.email}`);
  
  return done();
}

// After scenario hook
function afterScenario(userContext, events, done) {
  // Log scenario completion
  if (userContext.vars.testUser) {
    console.log(`Completed scenario for user: ${userContext.vars.testUser.email}`);
  }
  
  return done();
}

// Custom function to generate random string
function setRandomString(userContext, events, done) {
  userContext.vars.randomString = randomString();
  return done();
}

// Custom function to generate random email
function setRandomEmail(userContext, events, done) {
  userContext.vars.randomEmail = randomEmail();
  return done();
}

// Custom function to generate sample text
function setSampleText(userContext, events, done) {
  userContext.vars.sampleText = generateSampleText();
  return done();
}

// Custom function to set authentication headers
function setAuthHeaders(userContext, events, done) {
  if (userContext.vars.authToken) {
    userContext.vars.authHeaders = {
      'Authorization': `Bearer ${userContext.vars.authToken}`
    };
  }
  return done();
}

// Custom function to validate response
function validateResponse(userContext, events, done) {
  const response = userContext.vars.$;
  
  if (response && response.statusCode >= 400) {
    console.error(`Error response: ${response.statusCode} - ${response.body}`);
  }
  
  return done();
}

// Custom function to simulate think time
function thinkTime(userContext, events, done) {
  const minThinkTime = 1000; // 1 second
  const maxThinkTime = 5000; // 5 seconds
  const thinkTime = Math.floor(Math.random() * (maxThinkTime - minThinkTime)) + minThinkTime;
  
  setTimeout(() => {
    return done();
  }, thinkTime);
}

// Custom function to log performance metrics
function logMetrics(userContext, events, done) {
  const response = userContext.vars.$;
  
  if (response) {
    const metrics = {
      timestamp: new Date().toISOString(),
      statusCode: response.statusCode,
      responseTime: response.timings ? response.timings.response : 'N/A',
      url: response.request ? response.request.uri.href : 'N/A'
    };
    
    // Log to console (in production, you might want to send to a metrics service)
    console.log(`Metrics: ${JSON.stringify(metrics)}`);
  }
  
  return done();
}

// Custom function to handle errors
function handleError(userContext, events, done) {
  const response = userContext.vars.$;
  
  if (response && response.statusCode >= 400) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      statusCode: response.statusCode,
      url: response.request ? response.request.uri.href : 'N/A',
      error: response.body || 'Unknown error'
    };
    
    console.error(`Error: ${JSON.stringify(errorInfo)}`);
    
    // Store error for later analysis
    if (!userContext.vars.errors) {
      userContext.vars.errors = [];
    }
    userContext.vars.errors.push(errorInfo);
  }
  
  return done();
}

// Custom function to create multipart form data
function createMultipartData(userContext, events, done) {
  const boundary = `----formdata-artillery-${randomString(16)}`;
  const text = userContext.vars.sampleText || generateSampleText();
  
  const formData = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="test.txt"',
    'Content-Type: text/plain',
    '',
    text,
    `--${boundary}--`
  ].join('\r\n');
  
  userContext.vars.multipartData = formData;
  userContext.vars.multipartHeaders = {
    'Content-Type': `multipart/form-data; boundary=${boundary}`
  };
  
  return done();
}

// Custom function to simulate file upload
function simulateFileUpload(userContext, events, done) {
  // Create a temporary file for upload simulation
  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const filename = `test-${randomString(8)}.txt`;
  const filepath = path.join(tempDir, filename);
  const content = userContext.vars.sampleText || generateSampleText();
  
  fs.writeFileSync(filepath, content);
  
  userContext.vars.uploadFile = filepath;
  userContext.vars.uploadFilename = filename;
  
  // Clean up file after a delay
  setTimeout(() => {
    try {
      fs.unlinkSync(filepath);
    } catch (error) {
      console.warn(`Failed to clean up temp file: ${filepath}`);
    }
  }, 30000); // Clean up after 30 seconds
  
  return done();
}

// Custom function to generate realistic API payloads
function generateApiPayload(userContext, events, done) {
  const payloadType = userContext.vars.payloadType || 'summarization';
  
  switch (payloadType) {
    case 'summarization':
      userContext.vars.apiPayload = {
        text: generateSampleText(200, 1000),
        type: ['bullet_points', 'paragraph', 'key_points'][Math.floor(Math.random() * 3)],
        length: ['short', 'medium', 'long'][Math.floor(Math.random() * 3)],
        method: ['rule_based', 'ml', 'ai', 'hybrid'][Math.floor(Math.random() * 4)]
      };
      break;
      
    case 'transcription':
      userContext.vars.apiPayload = {
        language: ['en', 'es', 'fr', 'de'][Math.floor(Math.random() * 4)],
        service: ['google', 'azure', 'assemblyai', 'speechmatics'][Math.floor(Math.random() * 4)],
        format: ['text', 'srt', 'vtt'][Math.floor(Math.random() * 3)]
      };
      break;
      
    case 'payment':
      userContext.vars.apiPayload = {
        planId: ['basic', 'premium', 'enterprise'][Math.floor(Math.random() * 3)],
        amount: [1000, 2500, 5000][Math.floor(Math.random() * 3)], // in cents
        currency: 'usd'
      };
      break;
      
    default:
      userContext.vars.apiPayload = {};
  }
  
  return done();
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Hooks
  beforeScenario,
  afterScenario,
  
  // Utility functions
  setRandomString,
  setRandomEmail,
  setSampleText,
  setAuthHeaders,
  validateResponse,
  thinkTime,
  logMetrics,
  handleError,
  createMultipartData,
  simulateFileUpload,
  generateApiPayload,
  
  // Helper functions for direct use
  randomString,
  randomEmail,
  generateSampleText,
  generateUserData
};

