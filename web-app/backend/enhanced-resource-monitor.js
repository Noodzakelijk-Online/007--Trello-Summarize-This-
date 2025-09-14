/**
 * Enhanced Resource Monitor
 * 
 * Comprehensive resource monitoring system that tracks CPU, memory, API calls,
 * storage usage, and calculates real-time costs for the Summarize This application.
 */

const EventEmitter = require('events');
const os = require('os');
const fs = require('fs');
const path = require('path');

class EnhancedResourceMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      monitoringInterval: options.monitoringInterval || 5000, // 5 seconds
      costCalculationInterval: options.costCalculationInterval || 30000, // 30 seconds
      historyRetention: options.historyRetention || 24 * 60 * 60 * 1000, // 24 hours
      alertThresholds: {
        cpu: options.alertThresholds?.cpu || 80, // 80%
        memory: options.alertThresholds?.memory || 85, // 85%
        storage: options.alertThresholds?.storage || 90, // 90%
        costPerHour: options.alertThresholds?.costPerHour || 10 // $10/hour
      },
      ...options
    };
    
    // Cost coefficients (configurable based on actual infrastructure costs)
    this.costCoefficients = {
      cpu: {
        base: 0.001, // $0.001 per CPU percentage per minute
        multiplier: 1.0
      },
      memory: {
        base: 0.0005, // $0.0005 per MB per minute
        multiplier: 1.0
      },
      storage: {
        base: 0.0001, // $0.0001 per MB per minute
        multiplier: 1.0
      },
      apiCalls: {
        openai: 0.002, // $0.002 per API call
        transcription: 0.006, // $0.006 per minute of audio
        stripe: 0.029 + 0.0001 // $0.029 + 0.01% per transaction
      },
      bandwidth: {
        ingress: 0.0001, // $0.0001 per MB
        egress: 0.0002 // $0.0002 per MB
      }
    };
    
    // Resource tracking data
    this.resourceData = {
      cpu: {
        current: 0,
        average: 0,
        peak: 0,
        history: []
      },
      memory: {
        used: 0,
        total: 0,
        percentage: 0,
        peak: 0,
        history: []
      },
      storage: {
        used: 0,
        total: 0,
        percentage: 0,
        history: []
      },
      network: {
        bytesReceived: 0,
        bytesSent: 0,
        history: []
      },
      apiCalls: {
        total: 0,
        byService: {},
        history: []
      }
    };
    
    // Cost tracking data
    this.costData = {
      current: {
        cpu: 0,
        memory: 0,
        storage: 0,
        apiCalls: 0,
        bandwidth: 0,
        total: 0
      },
      accumulated: {
        cpu: 0,
        memory: 0,
        storage: 0,
        apiCalls: 0,
        bandwidth: 0,
        total: 0
      },
      history: [],
      projections: {
        hourly: 0,
        daily: 0,
        monthly: 0
      }
    };
    
    // Monitoring state
    this.isMonitoring = false;
    this.monitoringTimer = null;
    this.costTimer = null;
    this.startTime = Date.now();
    this.lastCostCalculation = Date.now();
    
    // Initialize baseline measurements
    this.initializeBaseline();
  }

  async initializeBaseline() {
    try {
      // Get initial system metrics
      const initialCpu = await this.getCpuUsage();
      const initialMemory = this.getMemoryUsage();
      const initialStorage = await this.getStorageUsage();
      
      this.resourceData.cpu.current = initialCpu;
      this.resourceData.memory = { ...this.resourceData.memory, ...initialMemory };
      this.resourceData.storage = { ...this.resourceData.storage, ...initialStorage };
      
      this.emit('initialized', {
        cpu: initialCpu,
        memory: initialMemory,
        storage: initialStorage,
        timestamp: Date.now()
      });
    } catch (error) {
      this.emit('error', { type: 'initialization', error: error.message });
    }
  }

  startMonitoring() {
    if (this.isMonitoring) {
      return;
    }
    
    this.isMonitoring = true;
    this.startTime = Date.now();
    
    // Start resource monitoring
    this.monitoringTimer = setInterval(() => {
      this.collectResourceMetrics();
    }, this.options.monitoringInterval);
    
    // Start cost calculation
    this.costTimer = setInterval(() => {
      this.calculateCosts();
    }, this.options.costCalculationInterval);
    
    this.emit('monitoring-started', {
      interval: this.options.monitoringInterval,
      timestamp: Date.now()
    });
    
    console.log('Resource monitoring started');
  }

  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }
    
    this.isMonitoring = false;
    
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    
    if (this.costTimer) {
      clearInterval(this.costTimer);
      this.costTimer = null;
    }
    
    this.emit('monitoring-stopped', {
      duration: Date.now() - this.startTime,
      timestamp: Date.now()
    });
    
    console.log('Resource monitoring stopped');
  }

  async collectResourceMetrics() {
    try {
      const timestamp = Date.now();
      
      // Collect CPU usage
      const cpuUsage = await this.getCpuUsage();
      this.updateResourceData('cpu', cpuUsage, timestamp);
      
      // Collect memory usage
      const memoryUsage = this.getMemoryUsage();
      this.updateResourceData('memory', memoryUsage, timestamp);
      
      // Collect storage usage
      const storageUsage = await this.getStorageUsage();
      this.updateResourceData('storage', storageUsage, timestamp);
      
      // Collect network usage
      const networkUsage = this.getNetworkUsage();
      this.updateResourceData('network', networkUsage, timestamp);
      
      // Check for alerts
      this.checkAlerts();
      
      // Emit metrics update
      this.emit('metrics-updated', {
        cpu: this.resourceData.cpu.current,
        memory: this.resourceData.memory.percentage,
        storage: this.resourceData.storage.percentage,
        timestamp
      });
      
    } catch (error) {
      this.emit('error', { type: 'collection', error: error.message });
    }
  }

  async getCpuUsage() {
    return new Promise((resolve) => {
      const startMeasure = process.cpuUsage();
      const startTime = Date.now();
      
      setTimeout(() => {
        const endMeasure = process.cpuUsage(startMeasure);
        const endTime = Date.now();
        
        const totalTime = (endTime - startTime) * 1000; // Convert to microseconds
        const cpuPercent = ((endMeasure.user + endMeasure.system) / totalTime) * 100;
        
        resolve(Math.min(Math.max(cpuPercent, 0), 100));
      }, 100);
    });
  }

  getMemoryUsage() {
    const memUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    return {
      used: Math.round(usedMemory / 1024 / 1024), // MB
      total: Math.round(totalMemory / 1024 / 1024), // MB
      percentage: Math.round((usedMemory / totalMemory) * 100),
      process: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024) // MB
      }
    };
  }

  async getStorageUsage() {
    try {
      const stats = await this.getDirectorySize(process.cwd());
      const diskSpace = await this.getDiskSpace();
      
      return {
        used: Math.round(stats.size / 1024 / 1024), // MB
        total: Math.round(diskSpace.total / 1024 / 1024), // MB
        percentage: Math.round((diskSpace.used / diskSpace.total) * 100),
        files: stats.files,
        directories: stats.directories
      };
    } catch (error) {
      return {
        used: 0,
        total: 0,
        percentage: 0,
        files: 0,
        directories: 0
      };
    }
  }

  async getDirectorySize(dirPath) {
    let totalSize = 0;
    let fileCount = 0;
    let dirCount = 0;
    
    try {
      const items = await fs.promises.readdir(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.promises.stat(itemPath);
        
        if (stats.isDirectory()) {
          dirCount++;
          if (!item.startsWith('.') && item !== 'node_modules') {
            const subDirStats = await this.getDirectorySize(itemPath);
            totalSize += subDirStats.size;
            fileCount += subDirStats.files;
            dirCount += subDirStats.directories;
          }
        } else {
          fileCount++;
          totalSize += stats.size;
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
    
    return {
      size: totalSize,
      files: fileCount,
      directories: dirCount
    };
  }

  async getDiskSpace() {
    try {
      const stats = await fs.promises.statvfs ? 
        fs.promises.statvfs(process.cwd()) :
        { bavail: 1000000000, blocks: 2000000000, bsize: 4096 }; // Fallback values
      
      const total = stats.blocks * stats.bsize;
      const free = stats.bavail * stats.bsize;
      const used = total - free;
      
      return { total, used, free };
    } catch (error) {
      // Fallback for systems without statvfs
      return {
        total: 100 * 1024 * 1024 * 1024, // 100GB
        used: 50 * 1024 * 1024 * 1024,   // 50GB
        free: 50 * 1024 * 1024 * 1024    // 50GB
      };
    }
  }

  getNetworkUsage() {
    const networkInterfaces = os.networkInterfaces();
    let totalReceived = 0;
    let totalSent = 0;
    
    // This is a simplified implementation
    // In a real application, you'd track actual network I/O
    Object.values(networkInterfaces).forEach(interfaces => {
      interfaces.forEach(iface => {
        if (!iface.internal) {
          // Estimate based on interface activity
          totalReceived += Math.random() * 1000; // Placeholder
          totalSent += Math.random() * 500; // Placeholder
        }
      });
    });
    
    return {
      bytesReceived: Math.round(totalReceived),
      bytesSent: Math.round(totalSent)
    };
  }

  updateResourceData(type, data, timestamp) {
    const resourceType = this.resourceData[type];
    
    if (type === 'cpu') {
      resourceType.current = data;
      resourceType.peak = Math.max(resourceType.peak, data);
      resourceType.history.push({ value: data, timestamp });
      
      // Calculate average
      const recentHistory = resourceType.history.slice(-10);
      resourceType.average = recentHistory.reduce((sum, item) => sum + item.value, 0) / recentHistory.length;
      
    } else if (type === 'memory') {
      Object.assign(resourceType, data);
      resourceType.peak = Math.max(resourceType.peak, data.percentage);
      resourceType.history.push({ ...data, timestamp });
      
    } else if (type === 'storage') {
      Object.assign(resourceType, data);
      resourceType.history.push({ ...data, timestamp });
      
    } else if (type === 'network') {
      resourceType.bytesReceived += data.bytesReceived;
      resourceType.bytesSent += data.bytesSent;
      resourceType.history.push({ ...data, timestamp });
    }
    
    // Cleanup old history
    this.cleanupHistory(resourceType.history, timestamp);
  }

  cleanupHistory(history, currentTimestamp) {
    const cutoff = currentTimestamp - this.options.historyRetention;
    const index = history.findIndex(item => item.timestamp > cutoff);
    if (index > 0) {
      history.splice(0, index);
    }
  }

  trackApiCall(service, operation, cost = 0, metadata = {}) {
    const timestamp = Date.now();
    
    this.resourceData.apiCalls.total++;
    
    if (!this.resourceData.apiCalls.byService[service]) {
      this.resourceData.apiCalls.byService[service] = {
        count: 0,
        totalCost: 0,
        operations: {}
      };
    }
    
    const serviceData = this.resourceData.apiCalls.byService[service];
    serviceData.count++;
    serviceData.totalCost += cost;
    
    if (!serviceData.operations[operation]) {
      serviceData.operations[operation] = { count: 0, totalCost: 0 };
    }
    
    serviceData.operations[operation].count++;
    serviceData.operations[operation].totalCost += cost;
    
    this.resourceData.apiCalls.history.push({
      service,
      operation,
      cost,
      metadata,
      timestamp
    });
    
    // Update accumulated API costs
    this.costData.accumulated.apiCalls += cost;
    
    this.emit('api-call-tracked', {
      service,
      operation,
      cost,
      totalCalls: this.resourceData.apiCalls.total,
      timestamp
    });
  }

  calculateCosts() {
    const now = Date.now();
    const timeDelta = (now - this.lastCostCalculation) / 1000 / 60; // Convert to minutes
    
    // Calculate current costs
    const cpuCost = (this.resourceData.cpu.current / 100) * this.costCoefficients.cpu.base * timeDelta;
    const memoryCost = (this.resourceData.memory.used || 0) * this.costCoefficients.memory.base * timeDelta;
    const storageCost = (this.resourceData.storage.used || 0) * this.costCoefficients.storage.base * timeDelta;
    
    // Calculate bandwidth costs
    const bandwidthCost = 
      (this.resourceData.network.bytesReceived / 1024 / 1024) * this.costCoefficients.bandwidth.ingress +
      (this.resourceData.network.bytesSent / 1024 / 1024) * this.costCoefficients.bandwidth.egress;
    
    // Update current costs
    this.costData.current = {
      cpu: cpuCost,
      memory: memoryCost,
      storage: storageCost,
      apiCalls: 0, // API calls are tracked separately
      bandwidth: bandwidthCost,
      total: cpuCost + memoryCost + storageCost + bandwidthCost
    };
    
    // Update accumulated costs
    this.costData.accumulated.cpu += cpuCost;
    this.costData.accumulated.memory += memoryCost;
    this.costData.accumulated.storage += storageCost;
    this.costData.accumulated.bandwidth += bandwidthCost;
    this.costData.accumulated.total = 
      this.costData.accumulated.cpu +
      this.costData.accumulated.memory +
      this.costData.accumulated.storage +
      this.costData.accumulated.apiCalls +
      this.costData.accumulated.bandwidth;
    
    // Calculate projections
    const runningTime = (now - this.startTime) / 1000 / 60 / 60; // Hours
    const hourlyRate = runningTime > 0 ? this.costData.accumulated.total / runningTime : 0;
    
    this.costData.projections = {
      hourly: hourlyRate,
      daily: hourlyRate * 24,
      monthly: hourlyRate * 24 * 30
    };
    
    // Add to history
    this.costData.history.push({
      ...this.costData.current,
      accumulated: { ...this.costData.accumulated },
      projections: { ...this.costData.projections },
      timestamp: now
    });
    
    // Cleanup old history
    this.cleanupHistory(this.costData.history, now);
    
    this.lastCostCalculation = now;
    
    this.emit('costs-calculated', {
      current: this.costData.current,
      accumulated: this.costData.accumulated,
      projections: this.costData.projections,
      timestamp: now
    });
  }

  checkAlerts() {
    const alerts = [];
    
    // CPU alert
    if (this.resourceData.cpu.current > this.options.alertThresholds.cpu) {
      alerts.push({
        type: 'cpu',
        level: 'warning',
        message: `High CPU usage: ${this.resourceData.cpu.current.toFixed(1)}%`,
        value: this.resourceData.cpu.current,
        threshold: this.options.alertThresholds.cpu
      });
    }
    
    // Memory alert
    if (this.resourceData.memory.percentage > this.options.alertThresholds.memory) {
      alerts.push({
        type: 'memory',
        level: 'warning',
        message: `High memory usage: ${this.resourceData.memory.percentage}%`,
        value: this.resourceData.memory.percentage,
        threshold: this.options.alertThresholds.memory
      });
    }
    
    // Storage alert
    if (this.resourceData.storage.percentage > this.options.alertThresholds.storage) {
      alerts.push({
        type: 'storage',
        level: 'warning',
        message: `High storage usage: ${this.resourceData.storage.percentage}%`,
        value: this.resourceData.storage.percentage,
        threshold: this.options.alertThresholds.storage
      });
    }
    
    // Cost alert
    if (this.costData.projections.hourly > this.options.alertThresholds.costPerHour) {
      alerts.push({
        type: 'cost',
        level: 'critical',
        message: `High projected cost: $${this.costData.projections.hourly.toFixed(4)}/hour`,
        value: this.costData.projections.hourly,
        threshold: this.options.alertThresholds.costPerHour
      });
    }
    
    if (alerts.length > 0) {
      this.emit('alerts', alerts);
    }
  }

  getResourceSummary() {
    return {
      cpu: {
        current: this.resourceData.cpu.current,
        average: this.resourceData.cpu.average,
        peak: this.resourceData.cpu.peak
      },
      memory: {
        used: this.resourceData.memory.used,
        total: this.resourceData.memory.total,
        percentage: this.resourceData.memory.percentage,
        peak: this.resourceData.memory.peak
      },
      storage: {
        used: this.resourceData.storage.used,
        total: this.resourceData.storage.total,
        percentage: this.resourceData.storage.percentage
      },
      network: {
        totalReceived: this.resourceData.network.bytesReceived,
        totalSent: this.resourceData.network.bytesSent
      },
      apiCalls: {
        total: this.resourceData.apiCalls.total,
        byService: this.resourceData.apiCalls.byService
      }
    };
  }

  getCostSummary() {
    return {
      current: this.costData.current,
      accumulated: this.costData.accumulated,
      projections: this.costData.projections,
      breakdown: {
        infrastructure: this.costData.accumulated.cpu + this.costData.accumulated.memory + this.costData.accumulated.storage,
        apiCalls: this.costData.accumulated.apiCalls,
        bandwidth: this.costData.accumulated.bandwidth
      }
    };
  }

  getDetailedReport() {
    const uptime = Date.now() - this.startTime;
    
    return {
      monitoring: {
        isActive: this.isMonitoring,
        uptime: uptime,
        startTime: this.startTime,
        interval: this.options.monitoringInterval
      },
      resources: this.getResourceSummary(),
      costs: this.getCostSummary(),
      efficiency: {
        costPerOperation: this.resourceData.apiCalls.total > 0 ? 
          this.costData.accumulated.total / this.resourceData.apiCalls.total : 0,
        avgCpuUsage: this.resourceData.cpu.average,
        memoryEfficiency: this.resourceData.memory.total > 0 ?
          (this.resourceData.memory.total - this.resourceData.memory.used) / this.resourceData.memory.total : 0
      },
      alerts: {
        thresholds: this.options.alertThresholds
      }
    };
  }

  updateCostCoefficients(newCoefficients) {
    this.costCoefficients = {
      ...this.costCoefficients,
      ...newCoefficients
    };
    
    this.emit('cost-coefficients-updated', this.costCoefficients);
  }

  exportData() {
    return {
      resourceData: this.resourceData,
      costData: this.costData,
      options: this.options,
      costCoefficients: this.costCoefficients,
      exportTimestamp: Date.now()
    };
  }

  importData(data) {
    if (data.resourceData) {
      this.resourceData = data.resourceData;
    }
    if (data.costData) {
      this.costData = data.costData;
    }
    if (data.costCoefficients) {
      this.costCoefficients = data.costCoefficients;
    }
    
    this.emit('data-imported', {
      timestamp: Date.now(),
      importedFrom: data.exportTimestamp
    });
  }
}

module.exports = EnhancedResourceMonitor;

