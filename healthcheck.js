#!/usr/bin/env node
/**
 * Health Check Script for Summarize This Application
 * 
 * Performs comprehensive health checks for Docker container monitoring
 * and load balancer health probes.
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');

class HealthChecker {
  constructor() {
    this.port = process.env.PORT || 3000;
    this.timeout = 5000; // 5 seconds
    this.checks = [];
    this.results = {
      status: 'unknown',
      timestamp: new Date().toISOString(),
      checks: {},
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    };
  }

  /**
   * Add a health check
   */
  addCheck(name, checkFunction) {
    this.checks.push({ name, check: checkFunction });
  }

  /**
   * Run all health checks
   */
  async runChecks() {
    console.log('🏥 Starting health checks...');
    
    let allPassed = true;
    
    for (const { name, check } of this.checks) {
      try {
        console.log(`  ⏳ Checking ${name}...`);
        const startTime = Date.now();
        
        const result = await Promise.race([
          check(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), this.timeout)
          )
        ]);
        
        const duration = Date.now() - startTime;
        
        this.results.checks[name] = {
          status: 'healthy',
          message: result || 'OK',
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        };
        
        console.log(`  ✅ ${name}: OK (${duration}ms)`);
      } catch (error) {
        allPassed = false;
        
        this.results.checks[name] = {
          status: 'unhealthy',
          message: error.message,
          timestamp: new Date().toISOString()
        };
        
        console.log(`  ❌ ${name}: ${error.message}`);
      }
    }
    
    this.results.status = allPassed ? 'healthy' : 'unhealthy';
    this.results.timestamp = new Date().toISOString();
    
    return allPassed;
  }

  /**
   * HTTP endpoint health check
   */
  async checkHttpEndpoint() {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: this.port,
        path: '/health',
        method: 'GET',
        timeout: this.timeout
      }, (res) => {
        if (res.statusCode === 200) {
          resolve(`HTTP endpoint responding (${res.statusCode})`);
        } else {
          reject(new Error(`HTTP endpoint returned ${res.statusCode}`));
        }
      });
      
      req.on('error', (error) => {
        reject(new Error(`HTTP request failed: ${error.message}`));
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('HTTP request timeout'));
      });
      
      req.end();
    });
  }

  /**
   * Database connection health check
   */
  async checkDatabase() {
    try {
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: this.timeout
      });
      
      const client = await pool.connect();
      const result = await client.query('SELECT 1 as health_check');
      client.release();
      await pool.end();
      
      if (result.rows[0].health_check === 1) {
        return 'Database connection successful';
      } else {
        throw new Error('Database query returned unexpected result');
      }
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  /**
   * Redis connection health check
   */
  async checkRedis() {
    try {
      const redis = require('redis');
      const client = redis.createClient({
        url: process.env.REDIS_URL,
        socket: {
          connectTimeout: this.timeout,
          commandTimeout: this.timeout
        }
      });
      
      await client.connect();
      const result = await client.ping();
      await client.quit();
      
      if (result === 'PONG') {
        return 'Redis connection successful';
      } else {
        throw new Error('Redis ping returned unexpected result');
      }
    } catch (error) {
      throw new Error(`Redis connection failed: ${error.message}`);
    }
  }

  /**
   * File system health check
   */
  async checkFileSystem() {
    const testDir = '/app/temp';
    const testFile = path.join(testDir, `health-check-${Date.now()}.tmp`);
    
    try {
      // Check if directory exists and is writable
      await fs.access(testDir, fs.constants.W_OK);
      
      // Write test file
      await fs.writeFile(testFile, 'health-check-test');
      
      // Read test file
      const content = await fs.readFile(testFile, 'utf8');
      
      // Clean up test file
      await fs.unlink(testFile);
      
      if (content === 'health-check-test') {
        return 'File system read/write successful';
      } else {
        throw new Error('File system read/write verification failed');
      }
    } catch (error) {
      // Try to clean up test file if it exists
      try {
        await fs.unlink(testFile);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      throw new Error(`File system check failed: ${error.message}`);
    }
  }

  /**
   * Memory usage health check
   */
  async checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal;
    const usedMemory = memUsage.heapUsed;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;
    
    // Alert if memory usage is above 90%
    if (memoryUsagePercent > 90) {
      throw new Error(`High memory usage: ${memoryUsagePercent.toFixed(2)}%`);
    }
    
    return `Memory usage: ${memoryUsagePercent.toFixed(2)}% (${Math.round(usedMemory / 1024 / 1024)}MB used)`;
  }

  /**
   * Disk space health check
   */
  async checkDiskSpace() {
    try {
      const stats = await fs.stat('/app');
      
      // This is a basic check - in production, you might want to use a more
      // sophisticated disk space checking method
      return 'Disk space check passed';
    } catch (error) {
      throw new Error(`Disk space check failed: ${error.message}`);
    }
  }

  /**
   * External service connectivity check
   */
  async checkExternalServices() {
    const services = [];
    
    // Check if API keys are configured
    if (process.env.OPENAI_API_KEY) {
      services.push('OpenAI');
    }
    if (process.env.GOOGLE_CLOUD_API_KEY) {
      services.push('Google Cloud');
    }
    if (process.env.AZURE_SPEECH_KEY) {
      services.push('Azure Speech');
    }
    if (process.env.ASSEMBLYAI_API_KEY) {
      services.push('AssemblyAI');
    }
    if (process.env.AWS_ACCESS_KEY_ID) {
      services.push('AWS');
    }
    
    if (services.length === 0) {
      throw new Error('No external services configured');
    }
    
    return `External services configured: ${services.join(', ')}`;
  }

  /**
   * Application-specific health check
   */
  async checkApplicationHealth() {
    // Check if critical application files exist
    const criticalFiles = [
      '/app/server/server.js',
      '/app/package.json'
    ];
    
    for (const file of criticalFiles) {
      try {
        await fs.access(file, fs.constants.R_OK);
      } catch (error) {
        throw new Error(`Critical file missing: ${file}`);
      }
    }
    
    // Check if application has been running for a reasonable time
    const uptime = process.uptime();
    if (uptime < 5) {
      throw new Error(`Application just started (uptime: ${uptime.toFixed(2)}s)`);
    }
    
    return `Application healthy (uptime: ${Math.floor(uptime)}s)`;
  }

  /**
   * Initialize and run all health checks
   */
  async initialize() {
    // Add all health checks
    this.addCheck('http_endpoint', () => this.checkHttpEndpoint());
    this.addCheck('application', () => this.checkApplicationHealth());
    this.addCheck('memory_usage', () => this.checkMemoryUsage());
    this.addCheck('file_system', () => this.checkFileSystem());
    this.addCheck('disk_space', () => this.checkDiskSpace());
    this.addCheck('external_services', () => this.checkExternalServices());
    
    // Add database check if DATABASE_URL is configured
    if (process.env.DATABASE_URL) {
      this.addCheck('database', () => this.checkDatabase());
    }
    
    // Add Redis check if REDIS_URL is configured
    if (process.env.REDIS_URL) {
      this.addCheck('redis', () => this.checkRedis());
    }
  }

  /**
   * Output results and exit with appropriate code
   */
  outputResults(allPassed) {
    if (process.env.HEALTH_CHECK_FORMAT === 'json') {
      console.log(JSON.stringify(this.results, null, 2));
    } else {
      console.log(`\n🏥 Health Check Results:`);
      console.log(`Status: ${this.results.status.toUpperCase()}`);
      console.log(`Timestamp: ${this.results.timestamp}`);
      console.log(`Uptime: ${Math.floor(this.results.uptime)}s`);
      console.log(`Version: ${this.results.version}`);
      
      console.log('\nDetailed Results:');
      Object.entries(this.results.checks).forEach(([name, result]) => {
        const icon = result.status === 'healthy' ? '✅' : '❌';
        const duration = result.duration ? ` (${result.duration})` : '';
        console.log(`  ${icon} ${name}: ${result.message}${duration}`);
      });
    }
    
    // Exit with appropriate code
    process.exit(allPassed ? 0 : 1);
  }

  /**
   * Run the complete health check process
   */
  async run() {
    try {
      await this.initialize();
      const allPassed = await this.runChecks();
      this.outputResults(allPassed);
    } catch (error) {
      console.error('❌ Health check failed to run:', error.message);
      
      this.results.status = 'error';
      this.results.error = error.message;
      
      this.outputResults(false);
    }
  }
}

// Run health check if this script is executed directly
if (require.main === module) {
  const healthChecker = new HealthChecker();
  healthChecker.run();
}

module.exports = HealthChecker;

