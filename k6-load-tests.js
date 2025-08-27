// K6 Load Testing Suite for Summarize This Application
// Comprehensive performance testing for all API endpoints and user scenarios

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

// Environment configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;
const TEST_DURATION = __ENV.TEST_DURATION || '5m';
const VUS = parseInt(__ENV.VUS) || 10;
const MAX_VUS = parseInt(__ENV.MAX_VUS) || 100;

// Test data
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123',
  name: 'Test User'
};

const SAMPLE_TEXT = `
This is a sample text for transcription and summarization testing. 
It contains multiple sentences and paragraphs to simulate real-world usage.
The text should be long enough to trigger meaningful processing time
and provide realistic performance metrics for the AI services.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod 
tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
`;

// =============================================================================
// CUSTOM METRICS
// =============================================================================

// Custom metrics for business logic
const authSuccessRate = new Rate('auth_success_rate');
const transcriptionSuccessRate = new Rate('transcription_success_rate');
const summarizationSuccessRate = new Rate('summarization_success_rate');
const apiResponseTime = new Trend('api_response_time');
const errorRate = new Rate('error_rate');
const creditConsumption = new Counter('credits_consumed');

// Performance thresholds
export const options = {
  stages: [
    // Ramp-up phase
    { duration: '2m', target: VUS },
    // Steady state
    { duration: TEST_DURATION, target: VUS },
    // Spike test
    { duration: '1m', target: MAX_VUS },
    // Recovery
    { duration: '1m', target: VUS },
    // Ramp-down
    { duration: '2m', target: 0 },
  ],
  
  thresholds: {
    // HTTP metrics
    http_req_duration: ['p(95)<2000', 'p(99)<5000'], // 95% under 2s, 99% under 5s
    http_req_failed: ['rate<0.05'], // Error rate under 5%
    
    // Custom metrics
    auth_success_rate: ['rate>0.95'], // 95% auth success
    transcription_success_rate: ['rate>0.90'], // 90% transcription success
    summarization_success_rate: ['rate>0.90'], // 90% summarization success
    api_response_time: ['p(95)<3000'], // 95% API calls under 3s
    error_rate: ['rate<0.05'], // Overall error rate under 5%
  },
  
  // Test scenarios
  scenarios: {
    // Constant load test
    constant_load: {
      executor: 'constant-vus',
      vus: VUS,
      duration: TEST_DURATION,
      tags: { test_type: 'load' },
    },
    
    // Stress test
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: VUS * 2 },
        { duration: '5m', target: VUS * 2 },
        { duration: '2m', target: 0 },
      ],
      tags: { test_type: 'stress' },
    },
    
    // Spike test
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: VUS },
        { duration: '1m', target: MAX_VUS },
        { duration: '10s', target: VUS },
      ],
      tags: { test_type: 'spike' },
    },
    
    // Soak test (long duration)
    soak_test: {
      executor: 'constant-vus',
      vus: Math.floor(VUS / 2),
      duration: '30m',
      tags: { test_type: 'soak' },
    },
  },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Generate random test data
function generateRandomText(length = 500) {
  const words = [
    'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing',
    'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore',
    'et', 'dolore', 'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam'
  ];
  
  let text = '';
  while (text.length < length) {
    text += words[Math.floor(Math.random() * words.length)] + ' ';
  }
  
  return text.trim();
}

// Create multipart form data for file uploads
function createMultipartData(text, filename = 'test.txt') {
  const boundary = '----formdata-k6-' + Math.random().toString(36);
  const body = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${filename}"`,
    'Content-Type: text/plain',
    '',
    text,
    `--${boundary}--`,
  ].join('\r\n');
  
  return {
    body: body,
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
  };
}

// Authentication helper
function authenticate() {
  const loginResponse = http.post(`${API_BASE}/auth/login`, JSON.stringify({
    email: TEST_USER.email,
    password: TEST_USER.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const success = check(loginResponse, {
    'login successful': (r) => r.status === 200,
    'login response time < 1s': (r) => r.timings.duration < 1000,
  });
  
  authSuccessRate.add(success);
  
  if (success && loginResponse.json('token')) {
    return loginResponse.json('token');
  }
  
  return null;
}

// =============================================================================
// TEST SCENARIOS
// =============================================================================

// Health check test
export function healthCheck() {
  group('Health Check', () => {
    const response = http.get(`${BASE_URL}/health`);
    
    check(response, {
      'health check status is 200': (r) => r.status === 200,
      'health check response time < 100ms': (r) => r.timings.duration < 100,
      'health check returns ok status': (r) => r.json('status') === 'ok',
    });
    
    apiResponseTime.add(response.timings.duration);
    errorRate.add(response.status >= 400);
  });
}

// Authentication flow test
export function authenticationFlow() {
  group('Authentication Flow', () => {
    // Register new user (with random email to avoid conflicts)
    const randomEmail = `test${Math.random().toString(36).substr(2, 9)}@example.com`;
    
    const registerResponse = http.post(`${API_BASE}/auth/register`, JSON.stringify({
      email: randomEmail,
      password: TEST_USER.password,
      name: TEST_USER.name,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    check(registerResponse, {
      'registration successful': (r) => r.status === 201,
      'registration response time < 2s': (r) => r.timings.duration < 2000,
    });
    
    // Login with new user
    const loginResponse = http.post(`${API_BASE}/auth/login`, JSON.stringify({
      email: randomEmail,
      password: TEST_USER.password,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    const loginSuccess = check(loginResponse, {
      'login successful': (r) => r.status === 200,
      'login response time < 1s': (r) => r.timings.duration < 1000,
      'login returns token': (r) => r.json('token') !== undefined,
    });
    
    authSuccessRate.add(loginSuccess);
    apiResponseTime.add(loginResponse.timings.duration);
    errorRate.add(loginResponse.status >= 400);
    
    if (loginSuccess) {
      const token = loginResponse.json('token');
      
      // Test protected endpoint
      const profileResponse = http.get(`${API_BASE}/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      check(profileResponse, {
        'profile access successful': (r) => r.status === 200,
        'profile response time < 500ms': (r) => r.timings.duration < 500,
      });
      
      apiResponseTime.add(profileResponse.timings.duration);
      errorRate.add(profileResponse.status >= 400);
    }
  });
}

// Transcription service test
export function transcriptionTest() {
  group('Transcription Service', () => {
    const token = authenticate();
    if (!token) return;
    
    const testText = generateRandomText(1000);
    const multipartData = createMultipartData(testText, 'audio.txt');
    
    const transcriptionResponse = http.post(`${API_BASE}/transcribe`, multipartData.body, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...multipartData.headers,
      },
    });
    
    const success = check(transcriptionResponse, {
      'transcription request accepted': (r) => r.status === 202 || r.status === 200,
      'transcription response time < 5s': (r) => r.timings.duration < 5000,
      'transcription returns job id': (r) => r.json('jobId') !== undefined || r.json('result') !== undefined,
    });
    
    transcriptionSuccessRate.add(success);
    apiResponseTime.add(transcriptionResponse.timings.duration);
    errorRate.add(transcriptionResponse.status >= 400);
    
    if (success) {
      creditConsumption.add(1);
      
      // If async, check job status
      const jobId = transcriptionResponse.json('jobId');
      if (jobId) {
        sleep(2); // Wait for processing
        
        const statusResponse = http.get(`${API_BASE}/transcribe/status/${jobId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        check(statusResponse, {
          'status check successful': (r) => r.status === 200,
          'status check response time < 1s': (r) => r.timings.duration < 1000,
        });
        
        apiResponseTime.add(statusResponse.timings.duration);
      }
    }
  });
}

// Summarization service test
export function summarizationTest() {
  group('Summarization Service', () => {
    const token = authenticate();
    if (!token) return;
    
    const testText = generateRandomText(2000);
    
    const summarizationResponse = http.post(`${API_BASE}/summarize`, JSON.stringify({
      text: testText,
      type: 'bullet_points',
      length: 'medium',
    }), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const success = check(summarizationResponse, {
      'summarization request accepted': (r) => r.status === 202 || r.status === 200,
      'summarization response time < 10s': (r) => r.timings.duration < 10000,
      'summarization returns result': (r) => r.json('summary') !== undefined || r.json('jobId') !== undefined,
    });
    
    summarizationSuccessRate.add(success);
    apiResponseTime.add(summarizationResponse.timings.duration);
    errorRate.add(summarizationResponse.status >= 400);
    
    if (success) {
      creditConsumption.add(2); // Summarization costs more credits
    }
  });
}

// User management test
export function userManagementTest() {
  group('User Management', () => {
    const token = authenticate();
    if (!token) return;
    
    // Get user profile
    const profileResponse = http.get(`${API_BASE}/user/profile`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    check(profileResponse, {
      'profile retrieval successful': (r) => r.status === 200,
      'profile response time < 500ms': (r) => r.timings.duration < 500,
      'profile contains user data': (r) => r.json('email') !== undefined,
    });
    
    // Get user credits
    const creditsResponse = http.get(`${API_BASE}/user/credits`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    check(creditsResponse, {
      'credits retrieval successful': (r) => r.status === 200,
      'credits response time < 500ms': (r) => r.timings.duration < 500,
      'credits contains balance': (r) => r.json('balance') !== undefined,
    });
    
    // Get usage history
    const historyResponse = http.get(`${API_BASE}/user/history?limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    check(historyResponse, {
      'history retrieval successful': (r) => r.status === 200,
      'history response time < 1s': (r) => r.timings.duration < 1000,
      'history contains data': (r) => Array.isArray(r.json('history')),
    });
    
    apiResponseTime.add(profileResponse.timings.duration);
    apiResponseTime.add(creditsResponse.timings.duration);
    apiResponseTime.add(historyResponse.timings.duration);
    
    errorRate.add(profileResponse.status >= 400);
    errorRate.add(creditsResponse.status >= 400);
    errorRate.add(historyResponse.status >= 400);
  });
}

// Payment processing test
export function paymentTest() {
  group('Payment Processing', () => {
    const token = authenticate();
    if (!token) return;
    
    // Get pricing information
    const pricingResponse = http.get(`${API_BASE}/payment/pricing`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    check(pricingResponse, {
      'pricing retrieval successful': (r) => r.status === 200,
      'pricing response time < 500ms': (r) => r.timings.duration < 500,
      'pricing contains plans': (r) => Array.isArray(r.json('plans')),
    });
    
    // Create payment intent (test mode)
    const paymentIntentResponse = http.post(`${API_BASE}/payment/create-intent`, JSON.stringify({
      planId: 'basic',
      amount: 1000, // $10.00
    }), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    check(paymentIntentResponse, {
      'payment intent creation successful': (r) => r.status === 200,
      'payment intent response time < 2s': (r) => r.timings.duration < 2000,
      'payment intent returns client secret': (r) => r.json('clientSecret') !== undefined,
    });
    
    apiResponseTime.add(pricingResponse.timings.duration);
    apiResponseTime.add(paymentIntentResponse.timings.duration);
    
    errorRate.add(pricingResponse.status >= 400);
    errorRate.add(paymentIntentResponse.status >= 400);
  });
}

// Concurrent operations test
export function concurrentOperationsTest() {
  group('Concurrent Operations', () => {
    const token = authenticate();
    if (!token) return;
    
    // Simulate multiple concurrent requests
    const requests = [
      ['GET', `${API_BASE}/user/profile`],
      ['GET', `${API_BASE}/user/credits`],
      ['GET', `${API_BASE}/user/history?limit=5`],
      ['GET', `${API_BASE}/payment/pricing`],
    ];
    
    const responses = http.batch(requests.map(([method, url]) => ({
      method,
      url,
      headers: { 'Authorization': `Bearer ${token}` },
    })));
    
    responses.forEach((response, index) => {
      check(response, {
        [`concurrent request ${index + 1} successful`]: (r) => r.status === 200,
        [`concurrent request ${index + 1} response time < 1s`]: (r) => r.timings.duration < 1000,
      });
      
      apiResponseTime.add(response.timings.duration);
      errorRate.add(response.status >= 400);
    });
  });
}

// =============================================================================
// MAIN TEST FUNCTION
// =============================================================================

export default function() {
  // Run health check first
  healthCheck();
  
  // Random delay to simulate real user behavior
  sleep(Math.random() * 2);
  
  // Randomly select test scenarios based on realistic usage patterns
  const scenario = Math.random();
  
  if (scenario < 0.3) {
    // 30% - Authentication and user management
    authenticationFlow();
    userManagementTest();
  } else if (scenario < 0.6) {
    // 30% - Transcription workflow
    transcriptionTest();
    sleep(1);
    userManagementTest();
  } else if (scenario < 0.8) {
    // 20% - Summarization workflow
    summarizationTest();
    sleep(1);
    userManagementTest();
  } else if (scenario < 0.9) {
    // 10% - Payment processing
    paymentTest();
  } else {
    // 10% - Concurrent operations
    concurrentOperationsTest();
  }
  
  // Random think time between operations
  sleep(Math.random() * 3 + 1);
}

// =============================================================================
// SETUP AND TEARDOWN
// =============================================================================

export function setup() {
  console.log('Starting performance tests...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test Duration: ${TEST_DURATION}`);
  console.log(`Virtual Users: ${VUS}`);
  console.log(`Max Virtual Users: ${MAX_VUS}`);
  
  // Verify application is running
  const healthResponse = http.get(`${BASE_URL}/health`);
  if (healthResponse.status !== 200) {
    throw new Error(`Application not available at ${BASE_URL}`);
  }
  
  console.log('Application health check passed');
  return { baseUrl: BASE_URL };
}

export function teardown(data) {
  console.log('Performance tests completed');
}

// =============================================================================
// CUSTOM REPORT GENERATION
// =============================================================================

export function handleSummary(data) {
  return {
    'performance-report.html': htmlReport(data),
    'performance-summary.txt': textSummary(data, { indent: ' ', enableColors: true }),
    'performance-results.json': JSON.stringify(data, null, 2),
  };
}

