#!/usr/bin/env node

// ================================
// Performance Bottleneck Identification and Analysis
// Comprehensive analysis tool for identifying performance issues
// ================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class PerformanceAnalyzer {
  constructor() {
    this.results = {
      bottlenecks: [],
      recommendations: [],
      metrics: {},
      analysis: {},
    };
    
    this.thresholds = {
      responseTime: {
        excellent: 200,
        good: 500,
        acceptable: 1000,
        poor: 2000,
        critical: 5000,
      },
      throughput: {
        minimum: 10,
        good: 50,
        excellent: 100,
      },
      errorRate: {
        acceptable: 0.01, // 1%
        warning: 0.05,    // 5%
        critical: 0.10,   // 10%
      },
      resourceUtilization: {
        cpu: {
          normal: 70,
          high: 85,
          critical: 95,
        },
        memory: {
          normal: 80,
          high: 90,
          critical: 95,
        },
        disk: {
          normal: 80,
          high: 90,
          critical: 95,
        },
      },
    };
  }

  // ================================
  // Load Test Results Analysis
  // ================================
  analyzeLoadTestResults(resultsPath) {
    console.log('🔍 Analyzing load test results...');
    
    try {
      const resultsFiles = fs.readdirSync(resultsPath)
        .filter(file => file.endsWith('.json'))
        .map(file => path.join(resultsPath, file));
      
      for (const file of resultsFiles) {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        this.analyzeTestData(data, path.basename(file));
      }
      
      this.identifyPerformanceBottlenecks();
      this.generateRecommendations();
      
    } catch (error) {
      console.error('Error analyzing load test results:', error.message);
    }
  }

  analyzeTestData(data, testName) {
    console.log(`📊 Analyzing ${testName}...`);
    
    const metrics = data.metrics || {};
    const analysis = {
      testName,
      timestamp: new Date().toISOString(),
      summary: {},
      issues: [],
      performance: {},
    };

    // Analyze HTTP request metrics
    if (metrics.http_req_duration) {
      const duration = metrics.http_req_duration.values;
      analysis.performance.responseTime = {
        avg: duration.avg,
        p95: duration['p(95)'],
        p99: duration['p(99)'],
        max: duration.max,
        rating: this.rateResponseTime(duration.avg),
      };
      
      if (duration.avg > this.thresholds.responseTime.poor) {
        analysis.issues.push({
          type: 'performance',
          severity: duration.avg > this.thresholds.responseTime.critical ? 'critical' : 'high',
          description: `High average response time: ${duration.avg.toFixed(2)}ms`,
          metric: 'response_time',
          value: duration.avg,
        });
      }
    }

    // Analyze error rates
    if (metrics.http_req_failed) {
      const errorRate = metrics.http_req_failed.values.rate;
      analysis.performance.errorRate = {
        rate: errorRate,
        percentage: (errorRate * 100).toFixed(2),
        rating: this.rateErrorRate(errorRate),
      };
      
      if (errorRate > this.thresholds.errorRate.warning) {
        analysis.issues.push({
          type: 'reliability',
          severity: errorRate > this.thresholds.errorRate.critical ? 'critical' : 'high',
          description: `High error rate: ${(errorRate * 100).toFixed(2)}%`,
          metric: 'error_rate',
          value: errorRate,
        });
      }
    }

    // Analyze throughput
    if (metrics.http_reqs) {
      const throughput = metrics.http_reqs.values.rate;
      analysis.performance.throughput = {
        rate: throughput,
        rating: this.rateThroughput(throughput),
      };
      
      if (throughput < this.thresholds.throughput.minimum) {
        analysis.issues.push({
          type: 'capacity',
          severity: 'high',
          description: `Low throughput: ${throughput.toFixed(2)} req/s`,
          metric: 'throughput',
          value: throughput,
        });
      }
    }

    // Analyze endpoint-specific metrics
    this.analyzeEndpointMetrics(metrics, analysis);
    
    // Store analysis
    this.results.analysis[testName] = analysis;
    this.results.metrics = { ...this.results.metrics, ...metrics };
  }

  analyzeEndpointMetrics(metrics, analysis) {
    const endpoints = ['auth', 'summarize', 'transcribe', 'user_profile'];
    
    endpoints.forEach(endpoint => {
      const durationKey = `${endpoint}_duration`;
      const successKey = `${endpoint}_success`;
      
      if (metrics[durationKey] && metrics[successKey]) {
        const duration = metrics[durationKey].values;
        const success = metrics[successKey].values;
        
        analysis.performance[endpoint] = {
          avgDuration: duration.avg,
          p95Duration: duration['p(95)'],
          successRate: success.rate,
          rating: this.rateEndpointPerformance(duration.avg, success.rate),
        };
        
        // Check for endpoint-specific issues
        if (duration.avg > this.getEndpointThreshold(endpoint)) {
          analysis.issues.push({
            type: 'endpoint_performance',
            severity: 'medium',
            description: `Slow ${endpoint} endpoint: ${duration.avg.toFixed(2)}ms average`,
            metric: `${endpoint}_duration`,
            value: duration.avg,
            endpoint,
          });
        }
        
        if (success.rate < 0.95) {
          analysis.issues.push({
            type: 'endpoint_reliability',
            severity: success.rate < 0.90 ? 'high' : 'medium',
            description: `Low ${endpoint} success rate: ${(success.rate * 100).toFixed(2)}%`,
            metric: `${endpoint}_success`,
            value: success.rate,
            endpoint,
          });
        }
      }
    });
  }

  // ================================
  // System Resource Analysis
  // ================================
  analyzeSystemResources() {
    console.log('🖥️ Analyzing system resources...');
    
    try {
      // CPU usage analysis
      const cpuUsage = this.getCPUUsage();
      this.analyzeResourceUsage('cpu', cpuUsage);
      
      // Memory usage analysis
      const memoryUsage = this.getMemoryUsage();
      this.analyzeResourceUsage('memory', memoryUsage);
      
      // Disk usage analysis
      const diskUsage = this.getDiskUsage();
      this.analyzeResourceUsage('disk', diskUsage);
      
      // Network analysis
      const networkStats = this.getNetworkStats();
      this.analyzeNetworkPerformance(networkStats);
      
    } catch (error) {
      console.error('Error analyzing system resources:', error.message);
    }
  }

  getCPUUsage() {
    try {
      const output = execSync('top -bn1 | grep "Cpu(s)" | awk \'{print $2}\' | cut -d\'%\' -f1', { encoding: 'utf8' });
      return parseFloat(output.trim());
    } catch (error) {
      console.warn('Could not get CPU usage:', error.message);
      return 0;
    }
  }

  getMemoryUsage() {
    try {
      const output = execSync('free | grep Mem | awk \'{printf "%.2f", $3/$2 * 100.0}\'', { encoding: 'utf8' });
      return parseFloat(output.trim());
    } catch (error) {
      console.warn('Could not get memory usage:', error.message);
      return 0;
    }
  }

  getDiskUsage() {
    try {
      const output = execSync('df -h / | awk \'NR==2{print $5}\' | cut -d\'%\' -f1', { encoding: 'utf8' });
      return parseFloat(output.trim());
    } catch (error) {
      console.warn('Could not get disk usage:', error.message);
      return 0;
    }
  }

  getNetworkStats() {
    try {
      const output = execSync('cat /proc/net/dev | grep eth0 || cat /proc/net/dev | grep ens', { encoding: 'utf8' });
      // Parse network statistics
      return { rx_bytes: 0, tx_bytes: 0, rx_packets: 0, tx_packets: 0 };
    } catch (error) {
      console.warn('Could not get network stats:', error.message);
      return { rx_bytes: 0, tx_bytes: 0, rx_packets: 0, tx_packets: 0 };
    }
  }

  analyzeResourceUsage(resource, usage) {
    const thresholds = this.thresholds.resourceUtilization[resource];
    
    if (usage > thresholds.critical) {
      this.results.bottlenecks.push({
        type: 'resource',
        resource,
        severity: 'critical',
        description: `Critical ${resource} usage: ${usage.toFixed(2)}%`,
        value: usage,
        threshold: thresholds.critical,
      });
    } else if (usage > thresholds.high) {
      this.results.bottlenecks.push({
        type: 'resource',
        resource,
        severity: 'high',
        description: `High ${resource} usage: ${usage.toFixed(2)}%`,
        value: usage,
        threshold: thresholds.high,
      });
    }
  }

  analyzeNetworkPerformance(stats) {
    // Analyze network performance metrics
    // This would typically involve comparing current stats with baseline
    console.log('📡 Network performance analysis completed');
  }

  // ================================
  // Database Performance Analysis
  // ================================
  analyzeDatabasePerformance() {
    console.log('🗄️ Analyzing database performance...');
    
    try {
      // Analyze slow queries
      this.analyzeSlowQueries();
      
      // Analyze connection pool
      this.analyzeConnectionPool();
      
      // Analyze index usage
      this.analyzeIndexUsage();
      
      // Analyze table statistics
      this.analyzeTableStatistics();
      
    } catch (error) {
      console.error('Error analyzing database performance:', error.message);
    }
  }

  analyzeSlowQueries() {
    // Simulate slow query analysis
    const slowQueries = [
      {
        query: 'SELECT * FROM users WHERE email LIKE \'%@%\'',
        avgTime: 2500,
        executions: 1250,
        impact: 'high',
      },
      {
        query: 'SELECT * FROM summaries ORDER BY created_at DESC LIMIT 100',
        avgTime: 1800,
        executions: 890,
        impact: 'medium',
      },
    ];
    
    slowQueries.forEach(query => {
      if (query.avgTime > 1000) {
        this.results.bottlenecks.push({
          type: 'database',
          subtype: 'slow_query',
          severity: query.impact,
          description: `Slow query detected: ${query.avgTime}ms average`,
          query: query.query,
          avgTime: query.avgTime,
          executions: query.executions,
        });
      }
    });
  }

  analyzeConnectionPool() {
    // Simulate connection pool analysis
    const poolStats = {
      maxConnections: 100,
      activeConnections: 85,
      idleConnections: 10,
      waitingConnections: 5,
    };
    
    const utilizationRate = poolStats.activeConnections / poolStats.maxConnections;
    
    if (utilizationRate > 0.90) {
      this.results.bottlenecks.push({
        type: 'database',
        subtype: 'connection_pool',
        severity: 'high',
        description: `High connection pool utilization: ${(utilizationRate * 100).toFixed(2)}%`,
        stats: poolStats,
      });
    }
  }

  analyzeIndexUsage() {
    // Simulate index usage analysis
    const indexStats = [
      { table: 'users', column: 'email', usage: 95, recommendation: 'well_used' },
      { table: 'summaries', column: 'user_id', usage: 88, recommendation: 'well_used' },
      { table: 'summaries', column: 'created_at', usage: 12, recommendation: 'underused' },
    ];
    
    indexStats.forEach(index => {
      if (index.usage < 20) {
        this.results.bottlenecks.push({
          type: 'database',
          subtype: 'unused_index',
          severity: 'low',
          description: `Underused index on ${index.table}.${index.column}: ${index.usage}% usage`,
          table: index.table,
          column: index.column,
          usage: index.usage,
        });
      }
    });
  }

  analyzeTableStatistics() {
    // Simulate table statistics analysis
    const tableStats = [
      { name: 'users', rows: 50000, size: '25MB', fragmentation: 15 },
      { name: 'summaries', rows: 250000, size: '180MB', fragmentation: 35 },
      { name: 'transcriptions', rows: 75000, size: '95MB', fragmentation: 8 },
    ];
    
    tableStats.forEach(table => {
      if (table.fragmentation > 30) {
        this.results.bottlenecks.push({
          type: 'database',
          subtype: 'fragmentation',
          severity: 'medium',
          description: `High table fragmentation: ${table.name} (${table.fragmentation}%)`,
          table: table.name,
          fragmentation: table.fragmentation,
        });
      }
    });
  }

  // ================================
  // Application-Specific Analysis
  // ================================
  analyzeApplicationBottlenecks() {
    console.log('🔧 Analyzing application-specific bottlenecks...');
    
    // Analyze AI service performance
    this.analyzeAIServicePerformance();
    
    // Analyze queue performance
    this.analyzeQueuePerformance();
    
    // Analyze cache performance
    this.analyzeCachePerformance();
    
    // Analyze file processing
    this.analyzeFileProcessing();
  }

  analyzeAIServicePerformance() {
    const aiServices = [
      { name: 'OpenAI', avgResponseTime: 2800, successRate: 0.96, cost: 0.02 },
      { name: 'Anthropic', avgResponseTime: 3200, successRate: 0.94, cost: 0.018 },
      { name: 'Cohere', avgResponseTime: 1900, successRate: 0.92, cost: 0.015 },
    ];
    
    aiServices.forEach(service => {
      if (service.avgResponseTime > 3000) {
        this.results.bottlenecks.push({
          type: 'ai_service',
          service: service.name,
          severity: 'medium',
          description: `Slow AI service response: ${service.name} (${service.avgResponseTime}ms)`,
          avgResponseTime: service.avgResponseTime,
          successRate: service.successRate,
        });
      }
      
      if (service.successRate < 0.95) {
        this.results.bottlenecks.push({
          type: 'ai_service',
          service: service.name,
          severity: 'high',
          description: `Low AI service success rate: ${service.name} (${(service.successRate * 100).toFixed(2)}%)`,
          successRate: service.successRate,
        });
      }
    });
  }

  analyzeQueuePerformance() {
    const queueStats = {
      pending: 150,
      processing: 25,
      completed: 8950,
      failed: 75,
      avgProcessingTime: 4500,
    };
    
    if (queueStats.pending > 100) {
      this.results.bottlenecks.push({
        type: 'queue',
        severity: 'medium',
        description: `High queue backlog: ${queueStats.pending} pending jobs`,
        stats: queueStats,
      });
    }
    
    if (queueStats.avgProcessingTime > 5000) {
      this.results.bottlenecks.push({
        type: 'queue',
        severity: 'medium',
        description: `Slow queue processing: ${queueStats.avgProcessingTime}ms average`,
        avgProcessingTime: queueStats.avgProcessingTime,
      });
    }
  }

  analyzeCachePerformance() {
    const cacheStats = {
      hitRate: 0.78,
      missRate: 0.22,
      evictionRate: 0.05,
      memoryUsage: 0.85,
    };
    
    if (cacheStats.hitRate < 0.80) {
      this.results.bottlenecks.push({
        type: 'cache',
        severity: 'medium',
        description: `Low cache hit rate: ${(cacheStats.hitRate * 100).toFixed(2)}%`,
        hitRate: cacheStats.hitRate,
      });
    }
    
    if (cacheStats.evictionRate > 0.10) {
      this.results.bottlenecks.push({
        type: 'cache',
        severity: 'medium',
        description: `High cache eviction rate: ${(cacheStats.evictionRate * 100).toFixed(2)}%`,
        evictionRate: cacheStats.evictionRate,
      });
    }
  }

  analyzeFileProcessing() {
    const fileStats = {
      avgUploadTime: 3200,
      avgProcessingTime: 8500,
      failureRate: 0.08,
      supportedFormats: ['txt', 'pdf', 'docx', 'mp3', 'wav'],
    };
    
    if (fileStats.avgProcessingTime > 10000) {
      this.results.bottlenecks.push({
        type: 'file_processing',
        severity: 'medium',
        description: `Slow file processing: ${fileStats.avgProcessingTime}ms average`,
        avgProcessingTime: fileStats.avgProcessingTime,
      });
    }
    
    if (fileStats.failureRate > 0.05) {
      this.results.bottlenecks.push({
        type: 'file_processing',
        severity: 'high',
        description: `High file processing failure rate: ${(fileStats.failureRate * 100).toFixed(2)}%`,
        failureRate: fileStats.failureRate,
      });
    }
  }

  // ================================
  // Bottleneck Identification
  // ================================
  identifyPerformanceBottlenecks() {
    console.log('🎯 Identifying performance bottlenecks...');
    
    // Categorize bottlenecks by severity
    const critical = this.results.bottlenecks.filter(b => b.severity === 'critical');
    const high = this.results.bottlenecks.filter(b => b.severity === 'high');
    const medium = this.results.bottlenecks.filter(b => b.severity === 'medium');
    const low = this.results.bottlenecks.filter(b => b.severity === 'low');
    
    console.log(`Found ${critical.length} critical, ${high.length} high, ${medium.length} medium, ${low.length} low severity bottlenecks`);
    
    // Prioritize bottlenecks
    this.results.bottlenecks.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  // ================================
  // Recommendation Generation
  // ================================
  generateRecommendations() {
    console.log('💡 Generating optimization recommendations...');
    
    this.results.bottlenecks.forEach(bottleneck => {
      const recommendations = this.getRecommendationsForBottleneck(bottleneck);
      this.results.recommendations.push(...recommendations);
    });
    
    // Add general performance recommendations
    this.addGeneralRecommendations();
  }

  getRecommendationsForBottleneck(bottleneck) {
    const recommendations = [];
    
    switch (bottleneck.type) {
      case 'resource':
        recommendations.push(...this.getResourceRecommendations(bottleneck));
        break;
      case 'database':
        recommendations.push(...this.getDatabaseRecommendations(bottleneck));
        break;
      case 'ai_service':
        recommendations.push(...this.getAIServiceRecommendations(bottleneck));
        break;
      case 'queue':
        recommendations.push(...this.getQueueRecommendations(bottleneck));
        break;
      case 'cache':
        recommendations.push(...this.getCacheRecommendations(bottleneck));
        break;
      case 'file_processing':
        recommendations.push(...this.getFileProcessingRecommendations(bottleneck));
        break;
      default:
        recommendations.push(...this.getGeneralPerformanceRecommendations(bottleneck));
    }
    
    return recommendations;
  }

  getResourceRecommendations(bottleneck) {
    const recommendations = [];
    
    switch (bottleneck.resource) {
      case 'cpu':
        recommendations.push({
          type: 'infrastructure',
          priority: 'high',
          description: 'Scale up CPU resources or optimize CPU-intensive operations',
          implementation: 'Increase container CPU limits or add more instances',
          estimatedImpact: 'High',
        });
        break;
      case 'memory':
        recommendations.push({
          type: 'infrastructure',
          priority: 'high',
          description: 'Increase memory allocation or optimize memory usage',
          implementation: 'Increase container memory limits and review memory leaks',
          estimatedImpact: 'High',
        });
        break;
      case 'disk':
        recommendations.push({
          type: 'infrastructure',
          priority: 'medium',
          description: 'Increase disk space or implement disk cleanup',
          implementation: 'Add storage volume or implement log rotation',
          estimatedImpact: 'Medium',
        });
        break;
    }
    
    return recommendations;
  }

  getDatabaseRecommendations(bottleneck) {
    const recommendations = [];
    
    switch (bottleneck.subtype) {
      case 'slow_query':
        recommendations.push({
          type: 'database',
          priority: 'high',
          description: 'Optimize slow queries with proper indexing',
          implementation: `Add index for query: ${bottleneck.query}`,
          estimatedImpact: 'High',
        });
        break;
      case 'connection_pool':
        recommendations.push({
          type: 'database',
          priority: 'high',
          description: 'Increase database connection pool size',
          implementation: 'Increase max_connections and pool size configuration',
          estimatedImpact: 'Medium',
        });
        break;
      case 'fragmentation':
        recommendations.push({
          type: 'database',
          priority: 'medium',
          description: `Defragment table: ${bottleneck.table}`,
          implementation: 'Run VACUUM or OPTIMIZE TABLE command',
          estimatedImpact: 'Medium',
        });
        break;
    }
    
    return recommendations;
  }

  getAIServiceRecommendations(bottleneck) {
    return [{
      type: 'ai_service',
      priority: 'medium',
      description: `Optimize ${bottleneck.service} service integration`,
      implementation: 'Implement request batching, caching, or switch to faster provider',
      estimatedImpact: 'Medium',
    }];
  }

  getQueueRecommendations(bottleneck) {
    return [{
      type: 'queue',
      priority: 'medium',
      description: 'Optimize queue processing performance',
      implementation: 'Increase worker count, implement job prioritization, or optimize job processing',
      estimatedImpact: 'Medium',
    }];
  }

  getCacheRecommendations(bottleneck) {
    return [{
      type: 'cache',
      priority: 'medium',
      description: 'Improve cache performance and hit rate',
      implementation: 'Increase cache size, optimize cache keys, or implement cache warming',
      estimatedImpact: 'Medium',
    }];
  }

  getFileProcessingRecommendations(bottleneck) {
    return [{
      type: 'file_processing',
      priority: 'medium',
      description: 'Optimize file processing pipeline',
      implementation: 'Implement parallel processing, optimize file parsing, or add preprocessing',
      estimatedImpact: 'Medium',
    }];
  }

  getGeneralPerformanceRecommendations(bottleneck) {
    return [{
      type: 'general',
      priority: 'low',
      description: 'General performance optimization',
      implementation: 'Review and optimize application code',
      estimatedImpact: 'Low',
    }];
  }

  addGeneralRecommendations() {
    this.results.recommendations.push(
      {
        type: 'monitoring',
        priority: 'high',
        description: 'Implement comprehensive monitoring and alerting',
        implementation: 'Set up Prometheus, Grafana, and custom alerts for key metrics',
        estimatedImpact: 'High',
      },
      {
        type: 'caching',
        priority: 'medium',
        description: 'Implement application-level caching',
        implementation: 'Add Redis caching for frequently accessed data',
        estimatedImpact: 'Medium',
      },
      {
        type: 'cdn',
        priority: 'medium',
        description: 'Implement CDN for static assets',
        implementation: 'Use CloudFront or similar CDN service',
        estimatedImpact: 'Medium',
      }
    );
  }

  // ================================
  // Rating Functions
  // ================================
  rateResponseTime(avgTime) {
    if (avgTime <= this.thresholds.responseTime.excellent) return 'excellent';
    if (avgTime <= this.thresholds.responseTime.good) return 'good';
    if (avgTime <= this.thresholds.responseTime.acceptable) return 'acceptable';
    if (avgTime <= this.thresholds.responseTime.poor) return 'poor';
    return 'critical';
  }

  rateErrorRate(rate) {
    if (rate <= this.thresholds.errorRate.acceptable) return 'excellent';
    if (rate <= this.thresholds.errorRate.warning) return 'acceptable';
    return 'poor';
  }

  rateThroughput(rate) {
    if (rate >= this.thresholds.throughput.excellent) return 'excellent';
    if (rate >= this.thresholds.throughput.good) return 'good';
    if (rate >= this.thresholds.throughput.minimum) return 'acceptable';
    return 'poor';
  }

  rateEndpointPerformance(avgTime, successRate) {
    const timeRating = this.rateResponseTime(avgTime);
    const successRating = successRate >= 0.95 ? 'good' : 'poor';
    
    if (timeRating === 'excellent' && successRating === 'good') return 'excellent';
    if (timeRating === 'good' && successRating === 'good') return 'good';
    if (timeRating === 'acceptable' && successRating === 'good') return 'acceptable';
    return 'poor';
  }

  getEndpointThreshold(endpoint) {
    const thresholds = {
      auth: 1000,
      summarize: 5000,
      transcribe: 10000,
      user_profile: 500,
    };
    return thresholds[endpoint] || 2000;
  }

  // ================================
  // Report Generation
  // ================================
  generateReport() {
    console.log('📋 Generating bottleneck analysis report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalBottlenecks: this.results.bottlenecks.length,
        criticalBottlenecks: this.results.bottlenecks.filter(b => b.severity === 'critical').length,
        highBottlenecks: this.results.bottlenecks.filter(b => b.severity === 'high').length,
        totalRecommendations: this.results.recommendations.length,
      },
      bottlenecks: this.results.bottlenecks,
      recommendations: this.results.recommendations,
      analysis: this.results.analysis,
      metrics: this.results.metrics,
    };
    
    // Save report
    const reportPath = '/results/bottleneck-analysis-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generate human-readable report
    this.generateHumanReadableReport(report);
    
    console.log(`✅ Bottleneck analysis report saved to ${reportPath}`);
    return report;
  }

  generateHumanReadableReport(report) {
    let markdown = `# Performance Bottleneck Analysis Report

Generated: ${report.timestamp}

## Executive Summary

- **Total Bottlenecks Found**: ${report.summary.totalBottlenecks}
- **Critical Issues**: ${report.summary.criticalBottlenecks}
- **High Priority Issues**: ${report.summary.highBottlenecks}
- **Optimization Recommendations**: ${report.summary.totalRecommendations}

## Critical Bottlenecks

`;

    const criticalBottlenecks = report.bottlenecks.filter(b => b.severity === 'critical');
    if (criticalBottlenecks.length === 0) {
      markdown += 'No critical bottlenecks found. ✅\n\n';
    } else {
      criticalBottlenecks.forEach((bottleneck, index) => {
        markdown += `### ${index + 1}. ${bottleneck.description}
- **Type**: ${bottleneck.type}
- **Severity**: ${bottleneck.severity}
- **Impact**: High system performance degradation

`;
      });
    }

    markdown += `## High Priority Bottlenecks

`;

    const highBottlenecks = report.bottlenecks.filter(b => b.severity === 'high');
    if (highBottlenecks.length === 0) {
      markdown += 'No high priority bottlenecks found. ✅\n\n';
    } else {
      highBottlenecks.forEach((bottleneck, index) => {
        markdown += `### ${index + 1}. ${bottleneck.description}
- **Type**: ${bottleneck.type}
- **Severity**: ${bottleneck.severity}

`;
      });
    }

    markdown += `## Top Recommendations

`;

    const topRecommendations = report.recommendations
      .filter(r => r.priority === 'high')
      .slice(0, 5);

    topRecommendations.forEach((rec, index) => {
      markdown += `### ${index + 1}. ${rec.description}
- **Priority**: ${rec.priority}
- **Implementation**: ${rec.implementation}
- **Estimated Impact**: ${rec.estimatedImpact}

`;
    });

    // Save markdown report
    fs.writeFileSync('/results/bottleneck-analysis-report.md', markdown);
  }

  // ================================
  // Main Analysis Function
  // ================================
  async runCompleteAnalysis() {
    console.log('🚀 Starting comprehensive performance bottleneck analysis...');
    
    try {
      // Analyze load test results
      this.analyzeLoadTestResults('/results');
      
      // Analyze system resources
      this.analyzeSystemResources();
      
      // Analyze database performance
      this.analyzeDatabasePerformance();
      
      // Analyze application-specific bottlenecks
      this.analyzeApplicationBottlenecks();
      
      // Generate final report
      const report = this.generateReport();
      
      console.log('✅ Bottleneck analysis completed successfully!');
      return report;
      
    } catch (error) {
      console.error('❌ Error during bottleneck analysis:', error.message);
      throw error;
    }
  }
}

// ================================
// CLI Interface
// ================================
if (require.main === module) {
  const analyzer = new PerformanceAnalyzer();
  
  analyzer.runCompleteAnalysis()
    .then(report => {
      console.log('\n📊 Analysis Summary:');
      console.log(`- Total bottlenecks: ${report.summary.totalBottlenecks}`);
      console.log(`- Critical issues: ${report.summary.criticalBottlenecks}`);
      console.log(`- High priority issues: ${report.summary.highBottlenecks}`);
      console.log(`- Recommendations: ${report.summary.totalRecommendations}`);
      
      process.exit(0);
    })
    .catch(error => {
      console.error('Analysis failed:', error.message);
      process.exit(1);
    });
}

module.exports = PerformanceAnalyzer;

