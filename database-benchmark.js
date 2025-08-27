// Database Performance Benchmark for Summarize This
// Comprehensive database performance testing and optimization validation

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  // Database connection
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'summarize_this',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    max: 20, // Maximum number of connections in pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  
  // Benchmark configuration
  benchmark: {
    warmupQueries: 10,
    testQueries: 100,
    concurrentConnections: [1, 5, 10, 20],
    queryTimeout: 30000, // 30 seconds
  },
  
  // Test data generation
  testData: {
    userCount: 1000,
    transcriptionCount: 5000,
    summaryCount: 3000,
    transactionCount: 2000,
  },
  
  // Performance thresholds
  thresholds: {
    simpleQuery: 50,      // ms
    complexQuery: 500,    // ms
    insertQuery: 100,     // ms
    updateQuery: 200,     // ms
    deleteQuery: 150,     // ms
  },
  
  // Output configuration
  outputDir: './performance-reports/database-benchmarks',
};

// =============================================================================
// DATABASE CONNECTION POOL
// =============================================================================

class DatabasePool {
  constructor(config) {
    this.pool = new Pool(config);
    this.isConnected = false;
  }
  
  async connect() {
    try {
      const client = await this.pool.connect();
      client.release();
      this.isConnected = true;
      console.log('Database connection established');
    } catch (error) {
      console.error('Database connection failed:', error.message);
      throw error;
    }
  }
  
  async disconnect() {
    await this.pool.end();
    this.isConnected = false;
    console.log('Database connection closed');
  }
  
  async query(text, params = []) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }
  
  async transaction(queries) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const results = [];
      
      for (const query of queries) {
        const result = await client.query(query.text, query.params);
        results.push(result);
      }
      
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

// =============================================================================
// TEST DATA GENERATOR
// =============================================================================

class TestDataGenerator {
  constructor(db) {
    this.db = db;
  }
  
  async generateTestData() {
    console.log('Generating test data...');
    
    // Clear existing test data
    await this.clearTestData();
    
    // Generate users
    await this.generateUsers();
    
    // Generate transcriptions
    await this.generateTranscriptions();
    
    // Generate summaries
    await this.generateSummaries();
    
    // Generate transactions
    await this.generateTransactions();
    
    console.log('Test data generation completed');
  }
  
  async clearTestData() {
    const queries = [
      'DELETE FROM credit_transactions WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'test%\')',
      'DELETE FROM payment_transactions WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'test%\')',
      'DELETE FROM summaries WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'test%\')',
      'DELETE FROM transcriptions WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'test%\')',
      'DELETE FROM user_credits WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'test%\')',
      'DELETE FROM usage_logs WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'test%\')',
      'DELETE FROM users WHERE email LIKE \'test%\'',
    ];
    
    for (const query of queries) {
      await this.db.query(query);
    }
  }
  
  async generateUsers() {
    console.log(`Generating ${CONFIG.testData.userCount} test users...`);
    
    const batchSize = 100;
    const batches = Math.ceil(CONFIG.testData.userCount / batchSize);
    
    for (let batch = 0; batch < batches; batch++) {
      const values = [];
      const params = [];
      let paramIndex = 1;
      
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, CONFIG.testData.userCount);
      
      for (let i = batchStart; i < batchEnd; i++) {
        values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4})`);
        params.push(
          `test${i}@example.com`,
          `Test User ${i}`,
          '$2b$10$hash', // bcrypt hash placeholder
          new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Random date within last year
          Math.random() > 0.1 // 90% active users
        );
        paramIndex += 5;
      }
      
      const query = `
        INSERT INTO users (email, name, password_hash, created_at, is_active)
        VALUES ${values.join(', ')}
      `;
      
      await this.db.query(query, params);
    }
    
    // Generate user credits
    await this.db.query(`
      INSERT INTO user_credits (user_id, balance, last_updated)
      SELECT id, FLOOR(RANDOM() * 1000) + 100, NOW()
      FROM users WHERE email LIKE 'test%'
    `);
  }
  
  async generateTranscriptions() {
    console.log(`Generating ${CONFIG.testData.transcriptionCount} test transcriptions...`);
    
    const services = ['google', 'azure', 'assemblyai', 'speechmatics', 'whisper'];
    const statuses = ['pending', 'processing', 'completed', 'failed'];
    const statusWeights = [0.05, 0.1, 0.8, 0.05]; // Most should be completed
    
    const batchSize = 100;
    const batches = Math.ceil(CONFIG.testData.transcriptionCount / batchSize);
    
    for (let batch = 0; batch < batches; batch++) {
      const values = [];
      const params = [];
      let paramIndex = 1;
      
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, CONFIG.testData.transcriptionCount);
      
      for (let i = batchStart; i < batchEnd; i++) {
        const status = this.weightedRandom(statuses, statusWeights);
        const service = services[Math.floor(Math.random() * services.length)];
        const createdAt = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000); // Last 90 days
        
        values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7})`);
        params.push(
          Math.floor(Math.random() * CONFIG.testData.userCount) + 1, // user_id (assuming sequential IDs)
          `test-file-${i}.mp3`,
          service,
          status,
          status === 'completed' ? `Transcription result for file ${i}` : null,
          Math.floor(Math.random() * 300) + 30, // duration 30-330 seconds
          createdAt,
          status === 'completed' ? new Date(createdAt.getTime() + Math.random() * 60000) : null // completed_at
        );
        paramIndex += 8;
      }
      
      const query = `
        INSERT INTO transcriptions (user_id, file_name, service, status, result_text, duration_seconds, created_at, completed_at)
        VALUES ${values.join(', ')}
      `;
      
      await this.db.query(query, params);
    }
  }
  
  async generateSummaries() {
    console.log(`Generating ${CONFIG.testData.summaryCount} test summaries...`);
    
    const types = ['bullet_points', 'paragraph', 'key_points'];
    const methods = ['rule_based', 'ml', 'ai', 'hybrid'];
    const lengths = ['short', 'medium', 'long'];
    const statuses = ['pending', 'processing', 'completed', 'failed'];
    const statusWeights = [0.05, 0.1, 0.8, 0.05];
    
    const batchSize = 100;
    const batches = Math.ceil(CONFIG.testData.summaryCount / batchSize);
    
    for (let batch = 0; batch < batches; batch++) {
      const values = [];
      const params = [];
      let paramIndex = 1;
      
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, CONFIG.testData.summaryCount);
      
      for (let i = batchStart; i < batchEnd; i++) {
        const status = this.weightedRandom(statuses, statusWeights);
        const type = types[Math.floor(Math.random() * types.length)];
        const method = methods[Math.floor(Math.random() * methods.length)];
        const length = lengths[Math.floor(Math.random() * lengths.length)];
        const createdAt = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
        
        values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8})`);
        params.push(
          Math.floor(Math.random() * CONFIG.testData.userCount) + 1,
          `Original text for summary ${i}. `.repeat(50), // Generate some text
          type,
          method,
          length,
          status,
          status === 'completed' ? `Summary result for text ${i}` : null,
          createdAt,
          status === 'completed' ? new Date(createdAt.getTime() + Math.random() * 30000) : null
        );
        paramIndex += 9;
      }
      
      const query = `
        INSERT INTO summaries (user_id, original_text, type, method, length, status, summary_text, created_at, completed_at)
        VALUES ${values.join(', ')}
      `;
      
      await this.db.query(query, params);
    }
  }
  
  async generateTransactions() {
    console.log(`Generating ${CONFIG.testData.transactionCount} test transactions...`);
    
    // Generate credit transactions
    const creditTypes = ['credit', 'debit'];
    const creditReasons = ['purchase', 'transcription', 'summarization', 'refund', 'bonus'];
    
    for (let i = 0; i < CONFIG.testData.transactionCount; i++) {
      const type = creditTypes[Math.floor(Math.random() * creditTypes.length)];
      const reason = creditReasons[Math.floor(Math.random() * creditReasons.length)];
      const amount = Math.floor(Math.random() * 100) + 1;
      const createdAt = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
      
      await this.db.query(`
        INSERT INTO credit_transactions (user_id, transaction_type, amount, description, created_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        Math.floor(Math.random() * CONFIG.testData.userCount) + 1,
        type,
        amount,
        `${reason} transaction`,
        createdAt
      ]);
    }
    
    // Generate payment transactions
    const paymentStatuses = ['pending', 'completed', 'failed', 'refunded'];
    const paymentStatusWeights = [0.1, 0.8, 0.05, 0.05];
    
    for (let i = 0; i < Math.floor(CONFIG.testData.transactionCount / 2); i++) {
      const status = this.weightedRandom(paymentStatuses, paymentStatusWeights);
      const amount = [1000, 2500, 5000][Math.floor(Math.random() * 3)]; // $10, $25, $50
      const createdAt = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
      
      await this.db.query(`
        INSERT INTO payment_transactions (user_id, amount, currency, status, stripe_payment_intent_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        Math.floor(Math.random() * CONFIG.testData.userCount) + 1,
        amount,
        'usd',
        status,
        `pi_test_${i}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt
      ]);
    }
  }
  
  weightedRandom(items, weights) {
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < items.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return items[i];
      }
    }
    
    return items[items.length - 1];
  }
}

// =============================================================================
// BENCHMARK TESTS
// =============================================================================

class DatabaseBenchmark {
  constructor(db) {
    this.db = db;
    this.results = [];
  }
  
  async runAllBenchmarks() {
    console.log('Starting database benchmark tests...');
    
    // Simple query benchmarks
    await this.benchmarkSimpleQueries();
    
    // Complex query benchmarks
    await this.benchmarkComplexQueries();
    
    // CRUD operation benchmarks
    await this.benchmarkCrudOperations();
    
    // Concurrent connection benchmarks
    await this.benchmarkConcurrentConnections();
    
    // Index effectiveness benchmarks
    await this.benchmarkIndexEffectiveness();
    
    console.log('Database benchmark tests completed');
    return this.results;
  }
  
  async benchmarkSimpleQueries() {
    console.log('Benchmarking simple queries...');
    
    const queries = [
      {
        name: 'User by email lookup',
        query: 'SELECT * FROM users WHERE email = $1',
        params: ['test1@example.com'],
        threshold: CONFIG.thresholds.simpleQuery
      },
      {
        name: 'User credit balance',
        query: 'SELECT balance FROM user_credits WHERE user_id = $1',
        params: [1],
        threshold: CONFIG.thresholds.simpleQuery
      },
      {
        name: 'Recent transcriptions count',
        query: 'SELECT COUNT(*) FROM transcriptions WHERE created_at >= $1',
        params: [new Date(Date.now() - 24 * 60 * 60 * 1000)],
        threshold: CONFIG.thresholds.simpleQuery
      },
      {
        name: 'User active status',
        query: 'SELECT is_active FROM users WHERE id = $1',
        params: [1],
        threshold: CONFIG.thresholds.simpleQuery
      }
    ];
    
    for (const queryTest of queries) {
      const result = await this.benchmarkQuery(queryTest);
      this.results.push(result);
    }
  }
  
  async benchmarkComplexQueries() {
    console.log('Benchmarking complex queries...');
    
    const queries = [
      {
        name: 'User profile with stats',
        query: `
          SELECT 
            u.id, u.email, u.name, u.created_at,
            uc.balance,
            COUNT(DISTINCT t.id) as transcription_count,
            COUNT(DISTINCT s.id) as summary_count
          FROM users u
          LEFT JOIN user_credits uc ON u.id = uc.user_id
          LEFT JOIN transcriptions t ON u.id = t.user_id AND t.created_at >= $2
          LEFT JOIN summaries s ON u.id = s.user_id AND s.created_at >= $2
          WHERE u.id = $1
          GROUP BY u.id, u.email, u.name, u.created_at, uc.balance
        `,
        params: [1, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)],
        threshold: CONFIG.thresholds.complexQuery
      },
      {
        name: 'User activity history',
        query: `
          WITH user_activities AS (
            SELECT 'transcription' as type, id, created_at, status, file_name as title
            FROM transcriptions WHERE user_id = $1
            UNION ALL
            SELECT 'summary' as type, id, created_at, status, 
                   SUBSTRING(original_text, 1, 50) as title
            FROM summaries WHERE user_id = $1
          )
          SELECT * FROM user_activities 
          ORDER BY created_at DESC 
          LIMIT $2
        `,
        params: [1, 20],
        threshold: CONFIG.thresholds.complexQuery
      },
      {
        name: 'Revenue analytics',
        query: `
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as transaction_count,
            SUM(amount) as total_revenue,
            AVG(amount) as avg_transaction
          FROM payment_transactions 
          WHERE status = 'completed' 
            AND created_at >= $1
          GROUP BY DATE(created_at)
          ORDER BY date DESC
        `,
        params: [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)],
        threshold: CONFIG.thresholds.complexQuery
      },
      {
        name: 'Top users by usage',
        query: `
          SELECT 
            u.email,
            COUNT(DISTINCT t.id) as transcriptions,
            COUNT(DISTINCT s.id) as summaries,
            SUM(ct.amount) FILTER (WHERE ct.transaction_type = 'debit') as credits_used
          FROM users u
          LEFT JOIN transcriptions t ON u.id = t.user_id AND t.created_at >= $1
          LEFT JOIN summaries s ON u.id = s.user_id AND s.created_at >= $1
          LEFT JOIN credit_transactions ct ON u.id = ct.user_id AND ct.created_at >= $1
          WHERE u.email LIKE 'test%'
          GROUP BY u.id, u.email
          ORDER BY (COUNT(DISTINCT t.id) + COUNT(DISTINCT s.id)) DESC
          LIMIT $2
        `,
        params: [new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 10],
        threshold: CONFIG.thresholds.complexQuery
      }
    ];
    
    for (const queryTest of queries) {
      const result = await this.benchmarkQuery(queryTest);
      this.results.push(result);
    }
  }
  
  async benchmarkCrudOperations() {
    console.log('Benchmarking CRUD operations...');
    
    // INSERT benchmark
    const insertResult = await this.benchmarkOperation('INSERT', async () => {
      await this.db.query(`
        INSERT INTO users (email, name, password_hash, created_at, is_active)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        `benchmark${Date.now()}@example.com`,
        'Benchmark User',
        '$2b$10$hash',
        new Date(),
        true
      ]);
    }, CONFIG.thresholds.insertQuery);
    
    this.results.push(insertResult);
    
    // UPDATE benchmark
    const updateResult = await this.benchmarkOperation('UPDATE', async () => {
      await this.db.query(`
        UPDATE users 
        SET last_login = $1 
        WHERE email LIKE 'test%' 
        LIMIT 1
      `, [new Date()]);
    }, CONFIG.thresholds.updateQuery);
    
    this.results.push(updateResult);
    
    // DELETE benchmark
    const deleteResult = await this.benchmarkOperation('DELETE', async () => {
      await this.db.query(`
        DELETE FROM users 
        WHERE email LIKE 'benchmark%'
      `);
    }, CONFIG.thresholds.deleteQuery);
    
    this.results.push(deleteResult);
  }
  
  async benchmarkConcurrentConnections() {
    console.log('Benchmarking concurrent connections...');
    
    for (const connectionCount of CONFIG.benchmark.concurrentConnections) {
      console.log(`Testing with ${connectionCount} concurrent connections...`);
      
      const promises = [];
      const startTime = performance.now();
      
      for (let i = 0; i < connectionCount; i++) {
        promises.push(this.db.query('SELECT COUNT(*) FROM users WHERE email LIKE \'test%\''));
      }
      
      try {
        await Promise.all(promises);
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const avgTime = totalTime / connectionCount;
        
        this.results.push({
          name: `Concurrent connections (${connectionCount})`,
          type: 'concurrency',
          connectionCount,
          totalTime,
          averageTime: avgTime,
          passed: avgTime < CONFIG.thresholds.simpleQuery * 2, // Allow 2x threshold for concurrent
          threshold: CONFIG.thresholds.simpleQuery * 2
        });
        
      } catch (error) {
        this.results.push({
          name: `Concurrent connections (${connectionCount})`,
          type: 'concurrency',
          connectionCount,
          error: error.message,
          passed: false
        });
      }
    }
  }
  
  async benchmarkIndexEffectiveness() {
    console.log('Benchmarking index effectiveness...');
    
    // Test queries that should use indexes
    const indexTests = [
      {
        name: 'User email index',
        query: 'EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM users WHERE email = $1',
        params: ['test1@example.com'],
        expectIndex: true
      },
      {
        name: 'Transcription user_id index',
        query: 'EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM transcriptions WHERE user_id = $1',
        params: [1],
        expectIndex: true
      },
      {
        name: 'Date range index',
        query: 'EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM transcriptions WHERE created_at >= $1',
        params: [new Date(Date.now() - 24 * 60 * 60 * 1000)],
        expectIndex: true
      }
    ];
    
    for (const test of indexTests) {
      try {
        const result = await this.db.query(test.query, test.params);
        const plan = result.rows[0]['QUERY PLAN'];
        const usesIndex = plan.includes('Index Scan') || plan.includes('Index Only Scan');
        
        this.results.push({
          name: test.name,
          type: 'index_effectiveness',
          usesIndex,
          expectIndex: test.expectIndex,
          passed: usesIndex === test.expectIndex,
          queryPlan: plan
        });
        
      } catch (error) {
        this.results.push({
          name: test.name,
          type: 'index_effectiveness',
          error: error.message,
          passed: false
        });
      }
    }
  }
  
  async benchmarkQuery(queryTest) {
    const times = [];
    
    // Warmup
    for (let i = 0; i < CONFIG.benchmark.warmupQueries; i++) {
      await this.db.query(queryTest.query, queryTest.params);
    }
    
    // Actual benchmark
    for (let i = 0; i < CONFIG.benchmark.testQueries; i++) {
      const startTime = performance.now();
      await this.db.query(queryTest.query, queryTest.params);
      const endTime = performance.now();
      times.push(endTime - startTime);
    }
    
    const avgTime = times.reduce((a, b) => a + b) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const p95Time = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];
    
    return {
      name: queryTest.name,
      type: 'query',
      averageTime: avgTime,
      minTime,
      maxTime,
      p95Time,
      iterations: CONFIG.benchmark.testQueries,
      passed: avgTime < queryTest.threshold,
      threshold: queryTest.threshold
    };
  }
  
  async benchmarkOperation(operationType, operation, threshold) {
    const times = [];
    
    // Warmup
    for (let i = 0; i < Math.min(CONFIG.benchmark.warmupQueries, 5); i++) {
      try {
        await operation();
      } catch (error) {
        // Ignore warmup errors
      }
    }
    
    // Actual benchmark
    for (let i = 0; i < Math.min(CONFIG.benchmark.testQueries, 20); i++) {
      const startTime = performance.now();
      try {
        await operation();
        const endTime = performance.now();
        times.push(endTime - startTime);
      } catch (error) {
        // Some operations might fail (e.g., duplicate inserts), that's ok
      }
    }
    
    if (times.length === 0) {
      return {
        name: `${operationType} operation`,
        type: 'crud',
        error: 'No successful operations',
        passed: false
      };
    }
    
    const avgTime = times.reduce((a, b) => a + b) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    return {
      name: `${operationType} operation`,
      type: 'crud',
      averageTime: avgTime,
      minTime,
      maxTime,
      iterations: times.length,
      passed: avgTime < threshold,
      threshold
    };
  }
}

// =============================================================================
// REPORT GENERATION
// =============================================================================

function generateBenchmarkReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    configuration: CONFIG,
    summary: {
      totalTests: results.length,
      passedTests: results.filter(r => r.passed).length,
      failedTests: results.filter(r => !r.passed).length,
      averageQueryTime: 0,
      slowestQuery: null,
      fastestQuery: null
    },
    results: results,
    recommendations: []
  };
  
  // Calculate summary statistics
  const queryResults = results.filter(r => r.type === 'query' && r.averageTime);
  if (queryResults.length > 0) {
    report.summary.averageQueryTime = queryResults.reduce((sum, r) => sum + r.averageTime, 0) / queryResults.length;
    report.summary.slowestQuery = queryResults.reduce((prev, curr) => prev.averageTime > curr.averageTime ? prev : curr);
    report.summary.fastestQuery = queryResults.reduce((prev, curr) => prev.averageTime < curr.averageTime ? prev : curr);
  }
  
  // Generate recommendations
  results.forEach(result => {
    if (!result.passed) {
      if (result.type === 'query' && result.averageTime > result.threshold) {
        report.recommendations.push({
          priority: 'High',
          category: 'Query Performance',
          issue: `Slow query: ${result.name}`,
          recommendation: 'Consider adding indexes, optimizing query structure, or reviewing execution plan',
          details: `Average time: ${result.averageTime.toFixed(2)}ms, Threshold: ${result.threshold}ms`
        });
      }
      
      if (result.type === 'index_effectiveness' && !result.usesIndex && result.expectIndex) {
        report.recommendations.push({
          priority: 'Medium',
          category: 'Index Usage',
          issue: `Missing index usage: ${result.name}`,
          recommendation: 'Verify that appropriate indexes exist and are being used by the query planner',
          details: 'Query is not using expected indexes'
        });
      }
      
      if (result.type === 'concurrency' && result.error) {
        report.recommendations.push({
          priority: 'High',
          category: 'Concurrency',
          issue: `Concurrency failure: ${result.name}`,
          recommendation: 'Review connection pool settings and database configuration for concurrent access',
          details: result.error
        });
      }
    }
  });
  
  return report;
}

function generateHtmlReport(report) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Benchmark Report - Summarize This</title>
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
        .pass { color: #28a745; font-weight: bold; }
        .fail { color: #dc3545; font-weight: bold; }
        .recommendation { background: #fff3cd; padding: 10px; margin: 10px 0; border-radius: 4px; border-left: 4px solid #ffc107; }
        .high { border-left-color: #dc3545; background: #f8d7da; }
        .medium { border-left-color: #fd7e14; }
        .chart { margin: 20px 0; height: 300px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Database Benchmark Report - Summarize This</h1>
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
                <div class="value">${report.summary.averageQueryTime.toFixed(1)}ms</div>
                <div class="label">Avg Query Time</div>
            </div>
        </div>
        
        <h2>Test Results</h2>
        <table>
            <thead>
                <tr>
                    <th>Test Name</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Avg Time (ms)</th>
                    <th>Min Time (ms)</th>
                    <th>Max Time (ms)</th>
                    <th>P95 Time (ms)</th>
                    <th>Threshold (ms)</th>
                </tr>
            </thead>
            <tbody>
                ${report.results.map(result => `
                    <tr>
                        <td>${result.name}</td>
                        <td>${result.type}</td>
                        <td class="${result.passed ? 'pass' : 'fail'}">
                            ${result.passed ? 'PASS' : 'FAIL'}
                        </td>
                        <td>${result.averageTime ? result.averageTime.toFixed(2) : 'N/A'}</td>
                        <td>${result.minTime ? result.minTime.toFixed(2) : 'N/A'}</td>
                        <td>${result.maxTime ? result.maxTime.toFixed(2) : 'N/A'}</td>
                        <td>${result.p95Time ? result.p95Time.toFixed(2) : 'N/A'}</td>
                        <td>${result.threshold || 'N/A'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        ${report.recommendations.length > 0 ? `
        <h2>Recommendations</h2>
        ${report.recommendations.map(rec => `
            <div class="recommendation ${rec.priority.toLowerCase()}">
                <strong>${rec.priority} Priority:</strong> ${rec.issue}<br>
                ${rec.recommendation}<br>
                <small>${rec.details}</small>
            </div>
        `).join('')}
        ` : ''}
        
        <h2>Configuration</h2>
        <pre>${JSON.stringify(report.configuration, null, 2)}</pre>
    </div>
</body>
</html>
  `;
  
  return html;
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
  let db;
  
  try {
    console.log('Starting database benchmark suite...');
    
    // Ensure output directory exists
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }
    
    // Initialize database connection
    db = new DatabasePool(CONFIG.database);
    await db.connect();
    
    // Generate test data
    const dataGenerator = new TestDataGenerator(db);
    await dataGenerator.generateTestData();
    
    // Run benchmarks
    const benchmark = new DatabaseBenchmark(db);
    const results = await benchmark.runAllBenchmarks();
    
    // Generate report
    const report = generateBenchmarkReport(results);
    
    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Save JSON report
    const jsonPath = path.join(CONFIG.outputDir, `database-benchmark-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    
    // Save HTML report
    const htmlReport = generateHtmlReport(report);
    const htmlPath = path.join(CONFIG.outputDir, `database-benchmark-${timestamp}.html`);
    fs.writeFileSync(htmlPath, htmlReport);
    
    console.log('\\n=== DATABASE BENCHMARK COMPLETE ===');
    console.log(`Total tests: ${report.summary.totalTests}`);
    console.log(`Passed: ${report.summary.passedTests}`);
    console.log(`Failed: ${report.summary.failedTests}`);
    console.log(`Average query time: ${report.summary.averageQueryTime.toFixed(2)}ms`);
    if (report.summary.slowestQuery) {
      console.log(`Slowest query: ${report.summary.slowestQuery.name} (${report.summary.slowestQuery.averageTime.toFixed(2)}ms)`);
    }
    console.log(`Reports saved to: ${CONFIG.outputDir}`);
    
    // Exit with error code if tests failed
    if (report.summary.failedTests > 0) {
      console.log('\\nWARNING: Some database benchmark tests failed!');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Error running database benchmarks:', error);
    process.exit(1);
  } finally {
    if (db) {
      await db.disconnect();
    }
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  DatabaseBenchmark,
  TestDataGenerator,
  generateBenchmarkReport,
  CONFIG
};

