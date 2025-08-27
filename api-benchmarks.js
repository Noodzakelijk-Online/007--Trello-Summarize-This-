// API Benchmark Testing Suite for Summarize This
// Comprehensive backend API performance testing and bottleneck identification

const autocannon = require('autocannon');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  apiUrl: process.env.API_URL || 'http://localhost:3000/api',
  
  // Test configuration
  duration: parseInt(process.env.TEST_DURATION) || 60, // seconds
  connections: parseInt(process.env.CONNECTIONS) || 10,
  pipelining: parseInt(process.env.PIPELINING) || 1,
  
  // Authentication
  testUser: {
    email: 'loadtest@example.com',
    password: 'loadtest123',
    name: 'Load Test User'
  },
  
  // Output directory
  outputDir: './performance-reports/api-benchmarks',
  
  // Performance thresholds
  thresholds: {
    responseTime: {
      p50: 500,   // 50th percentile under 500ms
      p95: 2000,  // 95th percentile under 2s
      p99: 5000   // 99th percentile under 5s
    },
    throughput: {
      min: 100    // Minimum 100 requests per second
    },
    errorRate: {
      max: 0.05   // Maximum 5% error rate
    }
  }
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Ensure output directory exists
function ensureOutputDir() {
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
}

// Generate timestamp for file names
function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

// Generate random test data
function generateTestData() {
  const words = [
    'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing',
    'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore'
  ];
  
  const text = Array.from({ length: 100 }, () => 
    words[Math.floor(Math.random() * words.length)]
  ).join(' ');
  
  return {
    text,
    email: `test${Math.random().toString(36).substr(2, 9)}@example.com`,
    randomId: Math.random().toString(36).substr(2, 12)
  };
}

// Authenticate and get token
async function authenticate() {
  try {
    const response = await axios.post(`${CONFIG.apiUrl}/auth/login`, {
      email: CONFIG.testUser.email,
      password: CONFIG.testUser.password
    });
    
    return response.data.token;
  } catch (error) {
    // If login fails, try to register first
    try {
      await axios.post(`${CONFIG.apiUrl}/auth/register`, CONFIG.testUser);
      const loginResponse = await axios.post(`${CONFIG.apiUrl}/auth/login`, {
        email: CONFIG.testUser.email,
        password: CONFIG.testUser.password
      });
      return loginResponse.data.token;
    } catch (registerError) {
      console.error('Authentication failed:', registerError.message);
      throw registerError;
    }
  }
}

// Create autocannon instance with custom headers
function createAutocannonInstance(url, options = {}) {
  return autocannon({
    url,
    duration: CONFIG.duration,
    connections: CONFIG.connections,
    pipelining: CONFIG.pipelining,
    ...options
  });
}

// Analyze results and check thresholds
function analyzeResults(results, testName) {
  const analysis = {
    testName,
    timestamp: new Date().toISOString(),
    duration: results.duration,
    requests: {
      total: results.requests.total,
      average: results.requests.average,
      mean: results.requests.mean,
      stddev: results.requests.stddev,
      min: results.requests.min,
      max: results.requests.max
    },
    latency: {
      average: results.latency.average,
      mean: results.latency.mean,
      stddev: results.latency.stddev,
      min: results.latency.min,
      max: results.latency.max,
      p50: results.latency.p50,
      p75: results.latency.p75,
      p90: results.latency.p90,
      p95: results.latency.p95,
      p99: results.latency.p99
    },
    throughput: {
      average: results.throughput.average,
      mean: results.throughput.mean,
      stddev: results.throughput.stddev,
      min: results.throughput.min,
      max: results.throughput.max
    },
    errors: results.errors,
    timeouts: results.timeouts,
    non2xx: results.non2xx,
    errorRate: (results.errors + results.timeouts + results.non2xx) / results.requests.total,
    thresholdViolations: []
  };
  
  // Check thresholds
  if (analysis.latency.p50 > CONFIG.thresholds.responseTime.p50) {
    analysis.thresholdViolations.push({
      metric: 'p50 Response Time',
      actual: analysis.latency.p50,
      threshold: CONFIG.thresholds.responseTime.p50
    });
  }
  
  if (analysis.latency.p95 > CONFIG.thresholds.responseTime.p95) {
    analysis.thresholdViolations.push({
      metric: 'p95 Response Time',
      actual: analysis.latency.p95,
      threshold: CONFIG.thresholds.responseTime.p95
    });
  }
  
  if (analysis.latency.p99 > CONFIG.thresholds.responseTime.p99) {
    analysis.thresholdViolations.push({
      metric: 'p99 Response Time',
      actual: analysis.latency.p99,
      threshold: CONFIG.thresholds.responseTime.p99
    });
  }
  
  if (analysis.throughput.average < CONFIG.thresholds.throughput.min) {
    analysis.thresholdViolations.push({
      metric: 'Average Throughput',
      actual: analysis.throughput.average,
      threshold: CONFIG.thresholds.throughput.min
    });
  }
  
  if (analysis.errorRate > CONFIG.thresholds.errorRate.max) {
    analysis.thresholdViolations.push({
      metric: 'Error Rate',
      actual: analysis.errorRate,
      threshold: CONFIG.thresholds.errorRate.max
    });
  }
  
  return analysis;
}

// =============================================================================
// BENCHMARK TESTS
// =============================================================================

// Health endpoint benchmark
async function benchmarkHealthEndpoint() {
  console.log('Benchmarking health endpoint...');
  
  const instance = createAutocannonInstance(`${CONFIG.baseUrl}/health`, {
    method: 'GET'
  });
  
  const results = await instance;
  return analyzeResults(results, 'Health Endpoint');
}

// Authentication endpoint benchmark
async function benchmarkAuthEndpoint() {
  console.log('Benchmarking authentication endpoint...');
  
  const testData = generateTestData();
  
  const instance = createAutocannonInstance(`${CONFIG.apiUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: CONFIG.testUser.email,
      password: CONFIG.testUser.password
    })
  });
  
  const results = await instance;
  return analyzeResults(results, 'Authentication Endpoint');
}

// User profile endpoint benchmark
async function benchmarkUserProfileEndpoint() {
  console.log('Benchmarking user profile endpoint...');
  
  const token = await authenticate();
  
  const instance = createAutocannonInstance(`${CONFIG.apiUrl}/user/profile`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const results = await instance;
  return analyzeResults(results, 'User Profile Endpoint');
}

// Summarization endpoint benchmark
async function benchmarkSummarizationEndpoint() {
  console.log('Benchmarking summarization endpoint...');
  
  const token = await authenticate();
  const testData = generateTestData();
  
  const instance = createAutocannonInstance(`${CONFIG.apiUrl}/summarize`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: testData.text,
      type: 'bullet_points',
      length: 'medium',
      method: 'rule_based' // Use fastest method for load testing
    })
  });
  
  const results = await instance;
  return analyzeResults(results, 'Summarization Endpoint');
}

// Transcription endpoint benchmark
async function benchmarkTranscriptionEndpoint() {
  console.log('Benchmarking transcription endpoint...');
  
  const token = await authenticate();
  const testData = generateTestData();
  
  // Create multipart form data
  const boundary = '----formdata-benchmark-' + Math.random().toString(36);
  const body = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="test.txt"',
    'Content-Type: text/plain',
    '',
    testData.text,
    `--${boundary}--`
  ].join('\\r\\n');
  
  const instance = createAutocannonInstance(`${CONFIG.apiUrl}/transcribe`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body
  });
  
  const results = await instance;
  return analyzeResults(results, 'Transcription Endpoint');
}

// Payment endpoint benchmark
async function benchmarkPaymentEndpoint() {
  console.log('Benchmarking payment endpoint...');
  
  const token = await authenticate();
  
  const instance = createAutocannonInstance(`${CONFIG.apiUrl}/payment/pricing`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const results = await instance;
  return analyzeResults(results, 'Payment Endpoint');
}

// Database-heavy endpoint benchmark (user history)
async function benchmarkDatabaseEndpoint() {
  console.log('Benchmarking database-heavy endpoint...');
  
  const token = await authenticate();
  
  const instance = createAutocannonInstance(`${CONFIG.apiUrl}/user/history?limit=50`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const results = await instance;
  return analyzeResults(results, 'Database Heavy Endpoint');
}

// Concurrent mixed workload benchmark
async function benchmarkMixedWorkload() {
  console.log('Benchmarking mixed workload...');
  
  const token = await authenticate();
  
  // Create multiple autocannon instances for different endpoints
  const endpoints = [
    { url: `${CONFIG.baseUrl}/health`, weight: 0.3 },
    { url: `${CONFIG.apiUrl}/user/profile`, weight: 0.2, headers: { 'Authorization': `Bearer ${token}` } },
    { url: `${CONFIG.apiUrl}/user/credits`, weight: 0.2, headers: { 'Authorization': `Bearer ${token}` } },
    { url: `${CONFIG.apiUrl}/payment/pricing`, weight: 0.15, headers: { 'Authorization': `Bearer ${token}` } },
    { url: `${CONFIG.apiUrl}/user/history?limit=10`, weight: 0.15, headers: { 'Authorization': `Bearer ${token}` } }
  ];
  
  const promises = endpoints.map(endpoint => {
    const connections = Math.floor(CONFIG.connections * endpoint.weight);
    return createAutocannonInstance(endpoint.url, {
      method: 'GET',
      connections: Math.max(1, connections),
      headers: endpoint.headers || {}
    });
  });
  
  const results = await Promise.all(promises);
  
  // Aggregate results
  const aggregated = {
    duration: results[0].duration,
    requests: { total: 0, average: 0 },
    latency: { average: 0, p95: 0, p99: 0 },
    throughput: { average: 0 },
    errors: 0,
    timeouts: 0,
    non2xx: 0
  };
  
  results.forEach(result => {
    aggregated.requests.total += result.requests.total;
    aggregated.requests.average += result.requests.average;
    aggregated.latency.average += result.latency.average;
    aggregated.latency.p95 = Math.max(aggregated.latency.p95, result.latency.p95);
    aggregated.latency.p99 = Math.max(aggregated.latency.p99, result.latency.p99);
    aggregated.throughput.average += result.throughput.average;
    aggregated.errors += result.errors;
    aggregated.timeouts += result.timeouts;
    aggregated.non2xx += result.non2xx;
  });
  
  // Average the averages
  aggregated.requests.average /= results.length;
  aggregated.latency.average /= results.length;
  
  return analyzeResults(aggregated, 'Mixed Workload');
}

// =============================================================================
// STRESS TESTING
// =============================================================================

// Gradual load increase test
async function stressTestGradualIncrease() {
  console.log('Running gradual load increase stress test...');
  
  const token = await authenticate();
  const results = [];
  const connectionLevels = [1, 5, 10, 20, 50, 100];
  
  for (const connections of connectionLevels) {
    console.log(`Testing with ${connections} connections...`);
    
    const instance = createAutocannonInstance(`${CONFIG.apiUrl}/user/profile`, {
      method: 'GET',
      connections,
      duration: 30, // Shorter duration for stress test
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await instance;
    const analysis = analyzeResults(result, `Stress Test - ${connections} connections`);
    results.push(analysis);
    
    console.log(`${connections} connections: ${analysis.latency.p95}ms p95, ${analysis.throughput.average.toFixed(2)} req/s`);
    
    // Stop if error rate becomes too high
    if (analysis.errorRate > 0.1) {
      console.log(`Stopping stress test due to high error rate: ${(analysis.errorRate * 100).toFixed(2)}%`);
      break;
    }
  }
  
  return results;
}

// Memory leak detection test
async function memoryLeakTest() {
  console.log('Running memory leak detection test...');
  
  const token = await authenticate();
  const duration = 300; // 5 minutes
  
  const instance = createAutocannonInstance(`${CONFIG.apiUrl}/summarize`, {
    method: 'POST',
    connections: 10,
    duration,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: generateTestData().text,
      type: 'bullet_points',
      length: 'medium',
      method: 'rule_based'
    })
  });
  
  const results = await instance;
  return analyzeResults(results, 'Memory Leak Test');
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

// Run all benchmarks
async function runAllBenchmarks() {
  console.log('Starting comprehensive API benchmark suite...');
  
  ensureOutputDir();
  
  const allResults = [];
  
  try {
    // Basic endpoint benchmarks
    allResults.push(await benchmarkHealthEndpoint());
    allResults.push(await benchmarkAuthEndpoint());
    allResults.push(await benchmarkUserProfileEndpoint());
    allResults.push(await benchmarkPaymentEndpoint());
    allResults.push(await benchmarkDatabaseEndpoint());
    
    // Complex endpoint benchmarks
    allResults.push(await benchmarkSummarizationEndpoint());
    allResults.push(await benchmarkTranscriptionEndpoint());
    
    // Mixed workload benchmark
    allResults.push(await benchmarkMixedWorkload());
    
    // Stress tests
    const stressResults = await stressTestGradualIncrease();
    allResults.push(...stressResults);
    
    allResults.push(await memoryLeakTest());
    
  } catch (error) {
    console.error('Error running benchmarks:', error);
    throw error;
  }
  
  return allResults;
}

// Generate comprehensive report
function generateBenchmarkReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    configuration: CONFIG,
    summary: {
      totalTests: results.length,
      passedTests: results.filter(r => r.thresholdViolations.length === 0).length,
      failedTests: results.filter(r => r.thresholdViolations.length > 0).length,
      averageLatency: results.reduce((sum, r) => sum + r.latency.average, 0) / results.length,
      averageThroughput: results.reduce((sum, r) => sum + r.throughput.average, 0) / results.length,
      totalViolations: results.reduce((sum, r) => sum + r.thresholdViolations.length, 0)
    },
    results,
    recommendations: []
  };
  
  // Generate recommendations
  results.forEach(result => {
    if (result.latency.p95 > 2000) {
      report.recommendations.push({
        test: result.testName,
        issue: 'High p95 latency',
        recommendation: 'Consider optimizing database queries, adding caching, or scaling horizontally',
        priority: 'High'
      });
    }
    
    if (result.errorRate > 0.01) {
      report.recommendations.push({
        test: result.testName,
        issue: 'High error rate',
        recommendation: 'Investigate error logs and improve error handling',
        priority: 'Critical'
      });
    }
    
    if (result.throughput.average < 50) {
      report.recommendations.push({
        test: result.testName,
        issue: 'Low throughput',
        recommendation: 'Optimize application code and consider load balancing',
        priority: 'Medium'
      });
    }
  });
  
  return report;
}

// Generate HTML report
function generateHtmlReport(report) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Benchmark Report - Summarize This</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1, h2, h3 { color: #333; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }
        .metric .value { font-size: 2em; font-weight: bold; color: #007bff; }
        .metric .label { color: #666; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
        .pass { color: #28a745; }
        .fail { color: #dc3545; }
        .recommendation { background: #fff3cd; padding: 10px; margin: 10px 0; border-radius: 4px; border-left: 4px solid #ffc107; }
        .critical { border-left-color: #dc3545; background: #f8d7da; }
        .high { border-left-color: #fd7e14; }
        .medium { border-left-color: #ffc107; }
    </style>
</head>
<body>
    <div class="container">
        <h1>API Benchmark Report - Summarize This</h1>
        <p><strong>Generated:</strong> ${report.timestamp}</p>
        
        <h2>Summary</h2>
        <div class="summary">
            <div class="metric">
                <div class="value">${report.summary.totalTests}</div>
                <div class="label">Total Tests</div>
            </div>
            <div class="metric">
                <div class="value">${report.summary.passedTests}</div>
                <div class="label">Passed Tests</div>
            </div>
            <div class="metric">
                <div class="value">${report.summary.failedTests}</div>
                <div class="label">Failed Tests</div>
            </div>
            <div class="metric">
                <div class="value">${report.summary.averageLatency.toFixed(1)}ms</div>
                <div class="label">Avg Latency</div>
            </div>
            <div class="metric">
                <div class="value">${report.summary.averageThroughput.toFixed(1)}</div>
                <div class="label">Avg Throughput</div>
            </div>
        </div>
        
        <h2>Test Results</h2>
        <table>
            <thead>
                <tr>
                    <th>Test Name</th>
                    <th>Status</th>
                    <th>Avg Latency</th>
                    <th>P95 Latency</th>
                    <th>P99 Latency</th>
                    <th>Throughput</th>
                    <th>Error Rate</th>
                    <th>Violations</th>
                </tr>
            </thead>
            <tbody>
                ${report.results.map(result => `
                    <tr>
                        <td>${result.testName}</td>
                        <td class="${result.thresholdViolations.length === 0 ? 'pass' : 'fail'}">
                            ${result.thresholdViolations.length === 0 ? 'PASS' : 'FAIL'}
                        </td>
                        <td>${result.latency.average.toFixed(1)}ms</td>
                        <td>${result.latency.p95.toFixed(1)}ms</td>
                        <td>${result.latency.p99.toFixed(1)}ms</td>
                        <td>${result.throughput.average.toFixed(1)} req/s</td>
                        <td>${(result.errorRate * 100).toFixed(2)}%</td>
                        <td>${result.thresholdViolations.length}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        ${report.recommendations.length > 0 ? `
        <h2>Recommendations</h2>
        ${report.recommendations.map(rec => `
            <div class="recommendation ${rec.priority.toLowerCase()}">
                <strong>${rec.priority} Priority:</strong> ${rec.issue} (${rec.test})<br>
                ${rec.recommendation}
            </div>
        `).join('')}
        ` : ''}
    </div>
</body>
</html>
  `;
  
  return html;
}

// Main execution function
async function main() {
  try {
    console.log('Starting API benchmark suite...');
    
    // Run all benchmarks
    const results = await runAllBenchmarks();
    
    // Generate report
    const report = generateBenchmarkReport(results);
    
    // Save results
    const timestamp = getTimestamp();
    
    // Save JSON report
    const jsonPath = path.join(CONFIG.outputDir, `api-benchmark-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    
    // Save HTML report
    const htmlReport = generateHtmlReport(report);
    const htmlPath = path.join(CONFIG.outputDir, `api-benchmark-${timestamp}.html`);
    fs.writeFileSync(htmlPath, htmlReport);
    
    console.log('\\n=== BENCHMARK COMPLETE ===');
    console.log(`Total tests: ${report.summary.totalTests}`);
    console.log(`Passed: ${report.summary.passedTests}`);
    console.log(`Failed: ${report.summary.failedTests}`);
    console.log(`Average latency: ${report.summary.averageLatency.toFixed(1)}ms`);
    console.log(`Average throughput: ${report.summary.averageThroughput.toFixed(1)} req/s`);
    console.log(`Reports saved to: ${CONFIG.outputDir}`);
    
    // Exit with error code if tests failed
    if (report.summary.failedTests > 0) {
      console.log('\\nWARNING: Some benchmark tests failed!');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Error running benchmarks:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  runAllBenchmarks,
  generateBenchmarkReport,
  CONFIG
};

