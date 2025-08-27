/**
 * Resource Dashboard JavaScript
 * 
 * Handles real-time resource monitoring display, charts, and cost calculations
 * for the Summarize This application.
 */

class ResourceDashboard {
    constructor() {
        this.isConnected = false;
        this.updateInterval = 5000; // 5 seconds
        this.maxDataPoints = 50;
        this.startTime = Date.now();
        
        // Chart instances
        this.resourceChart = null;
        this.costChart = null;
        
        // Data storage
        this.resourceHistory = {
            cpu: [],
            memory: [],
            storage: [],
            timestamps: []
        };
        
        this.costHistory = {
            infrastructure: [],
            apiCalls: [],
            total: [],
            timestamps: []
        };
        
        // Current data
        this.currentData = {
            resources: {
                cpu: { current: 0, peak: 0, average: 0 },
                memory: { used: 0, total: 0, percentage: 0, peak: 0, process: {} },
                storage: { used: 0, total: 0, percentage: 0 },
                network: { totalReceived: 0, totalSent: 0 },
                apiCalls: { total: 0, byService: {} }
            },
            costs: {
                current: { cpu: 0, memory: 0, storage: 0, apiCalls: 0, bandwidth: 0, total: 0 },
                accumulated: { cpu: 0, memory: 0, storage: 0, apiCalls: 0, bandwidth: 0, total: 0 },
                projections: { hourly: 0, daily: 0, monthly: 0 }
            }
        };
        
        this.initialize();
    }

    async initialize() {
        try {
            // Initialize charts
            this.initializeCharts();
            
            // Set up system info
            this.updateSystemInfo();
            
            // Start monitoring
            this.startMonitoring();
            
            // Set up event listeners
            this.setupEventListeners();
            
            console.log('Resource Dashboard initialized successfully');
        } catch (error) {
            console.error('Failed to initialize dashboard:', error);
            this.showError('Failed to initialize dashboard');
        }
    }

    initializeCharts() {
        // Resource Usage Chart
        const resourceCtx = document.getElementById('resource-chart').getContext('2d');
        this.resourceChart = new Chart(resourceCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'CPU Usage (%)',
                        data: [],
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Memory Usage (%)',
                        data: [],
                        borderColor: '#27ae60',
                        backgroundColor: 'rgba(39, 174, 96, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Storage Usage (%)',
                        data: [],
                        borderColor: '#f39c12',
                        backgroundColor: 'rgba(243, 156, 18, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#ecf0f1'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#ecf0f1'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            color: '#ecf0f1',
                            callback: function(value) {
                                return value + '%';
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });

        // Cost Breakdown Chart
        const costCtx = document.getElementById('cost-chart').getContext('2d');
        this.costChart = new Chart(costCtx, {
            type: 'doughnut',
            data: {
                labels: ['Infrastructure', 'API Calls', 'Bandwidth'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: [
                        '#3498db',
                        '#e74c3c',
                        '#9b59b6'
                    ],
                    borderColor: [
                        '#2980b9',
                        '#c0392b',
                        '#8e44ad'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#ecf0f1'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${context.label}: $${value.toFixed(4)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    updateSystemInfo() {
        // Update static system information
        document.getElementById('process-id').textContent = process?.pid || 'N/A';
        document.getElementById('node-version').textContent = process?.version || 'N/A';
        document.getElementById('platform').textContent = process?.platform || 'N/A';
    }

    async startMonitoring() {
        this.isConnected = true;
        this.updateMonitoringStatus(true);
        
        // Start the update loop
        this.updateLoop();
    }

    async updateLoop() {
        if (!this.isConnected) return;
        
        try {
            // Fetch current resource data
            await this.fetchResourceData();
            
            // Update UI
            this.updateMetrics();
            this.updateCharts();
            this.updateCostBreakdown();
            this.updateApiCallsBreakdown();
            
        } catch (error) {
            console.error('Error updating dashboard:', error);
            this.showError('Failed to fetch resource data');
        }
        
        // Schedule next update
        setTimeout(() => this.updateLoop(), this.updateInterval);
    }

    async fetchResourceData() {
        try {
            // In a real implementation, this would fetch from the server
            // For now, we'll simulate the data
            const response = await this.simulateResourceData();
            
            this.currentData = response;
            
            // Add to history
            this.addToHistory();
            
        } catch (error) {
            throw new Error('Failed to fetch resource data: ' + error.message);
        }
    }

    simulateResourceData() {
        // Simulate realistic resource usage data
        const now = Date.now();
        const runtime = (now - this.startTime) / 1000; // seconds
        
        // Simulate varying CPU usage
        const baseCpu = 15 + Math.sin(runtime / 30) * 10;
        const cpuSpike = Math.random() > 0.9 ? Math.random() * 30 : 0;
        const cpu = Math.max(0, Math.min(100, baseCpu + cpuSpike + (Math.random() - 0.5) * 5));
        
        // Simulate memory usage that gradually increases
        const baseMemory = 40 + (runtime / 3600) * 5; // Gradual increase over time
        const memory = Math.max(0, Math.min(95, baseMemory + (Math.random() - 0.5) * 3));
        
        // Simulate storage usage
        const storage = Math.max(0, Math.min(100, 25 + (runtime / 7200) * 2 + (Math.random() - 0.5) * 1));
        
        // Simulate API calls
        const apiCallsIncrement = Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0;
        
        // Calculate costs based on usage
        const cpuCost = (cpu / 100) * 0.001 * (runtime / 3600); // $0.001 per hour at 100% CPU
        const memoryCost = (memory / 100) * 1024 * 0.0005 * (runtime / 3600); // $0.0005 per GB per hour
        const storageCost = (storage / 100) * 10240 * 0.0001 * (runtime / 3600); // $0.0001 per GB per hour
        const apiCost = this.currentData.resources.apiCalls.total * 0.002; // $0.002 per API call
        
        return {
            resources: {
                cpu: {
                    current: cpu,
                    peak: Math.max(this.currentData.resources.cpu.peak, cpu),
                    average: this.calculateAverage(this.resourceHistory.cpu.concat([cpu]))
                },
                memory: {
                    used: Math.round((memory / 100) * 8192), // Assume 8GB total
                    total: 8192,
                    percentage: memory,
                    peak: Math.max(this.currentData.resources.memory.peak, memory),
                    process: {
                        rss: Math.round(memory * 20),
                        heapUsed: Math.round(memory * 15),
                        heapTotal: Math.round(memory * 18),
                        external: Math.round(memory * 5)
                    }
                },
                storage: {
                    used: Math.round((storage / 100) * 102400), // Assume 100GB total
                    total: 102400,
                    percentage: storage
                },
                network: {
                    totalReceived: this.currentData.resources.network.totalReceived + Math.random() * 1000,
                    totalSent: this.currentData.resources.network.totalSent + Math.random() * 500
                },
                apiCalls: {
                    total: this.currentData.resources.apiCalls.total + apiCallsIncrement,
                    byService: {
                        openai: {
                            count: Math.floor((this.currentData.resources.apiCalls.total + apiCallsIncrement) * 0.6),
                            totalCost: Math.floor((this.currentData.resources.apiCalls.total + apiCallsIncrement) * 0.6) * 0.002
                        },
                        transcription: {
                            count: Math.floor((this.currentData.resources.apiCalls.total + apiCallsIncrement) * 0.3),
                            totalCost: Math.floor((this.currentData.resources.apiCalls.total + apiCallsIncrement) * 0.3) * 0.006
                        },
                        stripe: {
                            count: Math.floor((this.currentData.resources.apiCalls.total + apiCallsIncrement) * 0.1),
                            totalCost: Math.floor((this.currentData.resources.apiCalls.total + apiCallsIncrement) * 0.1) * 0.029
                        }
                    }
                }
            },
            costs: {
                current: {
                    cpu: cpuCost / runtime * this.updateInterval / 1000,
                    memory: memoryCost / runtime * this.updateInterval / 1000,
                    storage: storageCost / runtime * this.updateInterval / 1000,
                    apiCalls: apiCost / runtime * this.updateInterval / 1000,
                    bandwidth: 0.001,
                    total: (cpuCost + memoryCost + storageCost + apiCost) / runtime * this.updateInterval / 1000
                },
                accumulated: {
                    cpu: cpuCost,
                    memory: memoryCost,
                    storage: storageCost,
                    apiCalls: apiCost,
                    bandwidth: 0.001 * (runtime / 3600),
                    total: cpuCost + memoryCost + storageCost + apiCost + (0.001 * (runtime / 3600))
                },
                projections: {
                    hourly: (cpuCost + memoryCost + storageCost + apiCost) / (runtime / 3600),
                    daily: (cpuCost + memoryCost + storageCost + apiCost) / (runtime / 3600) * 24,
                    monthly: (cpuCost + memoryCost + storageCost + apiCost) / (runtime / 3600) * 24 * 30
                }
            }
        };
    }

    calculateAverage(values) {
        if (values.length === 0) return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    addToHistory() {
        const timestamp = new Date().toLocaleTimeString();
        
        // Add resource data
        this.resourceHistory.cpu.push(this.currentData.resources.cpu.current);
        this.resourceHistory.memory.push(this.currentData.resources.memory.percentage);
        this.resourceHistory.storage.push(this.currentData.resources.storage.percentage);
        this.resourceHistory.timestamps.push(timestamp);
        
        // Add cost data
        const infraCost = this.currentData.costs.accumulated.cpu + 
                         this.currentData.costs.accumulated.memory + 
                         this.currentData.costs.accumulated.storage;
        
        this.costHistory.infrastructure.push(infraCost);
        this.costHistory.apiCalls.push(this.currentData.costs.accumulated.apiCalls);
        this.costHistory.total.push(this.currentData.costs.accumulated.total);
        this.costHistory.timestamps.push(timestamp);
        
        // Keep only recent data points
        if (this.resourceHistory.cpu.length > this.maxDataPoints) {
            Object.keys(this.resourceHistory).forEach(key => {
                this.resourceHistory[key].shift();
            });
        }
        
        if (this.costHistory.total.length > this.maxDataPoints) {
            Object.keys(this.costHistory).forEach(key => {
                this.costHistory[key].shift();
            });
        }
    }

    updateMetrics() {
        const { resources, costs } = this.currentData;
        
        // Update CPU metrics
        document.getElementById('cpu-usage').textContent = `${resources.cpu.current.toFixed(1)}%`;
        document.getElementById('cpu-progress').style.width = `${resources.cpu.current}%`;
        document.getElementById('cpu-change').textContent = `Peak: ${resources.cpu.peak.toFixed(1)}%`;
        
        // Update CPU progress bar color
        const cpuProgress = document.getElementById('cpu-progress');
        if (resources.cpu.current > 80) {
            cpuProgress.className = 'progress-bar bg-danger';
        } else if (resources.cpu.current > 60) {
            cpuProgress.className = 'progress-bar bg-warning';
        } else {
            cpuProgress.className = 'progress-bar bg-primary';
        }
        
        // Update Memory metrics
        document.getElementById('memory-usage').textContent = `${resources.memory.percentage.toFixed(1)}%`;
        document.getElementById('memory-progress').style.width = `${resources.memory.percentage}%`;
        document.getElementById('memory-details').textContent = `${resources.memory.used} MB / ${resources.memory.total} MB`;
        
        // Update memory progress bar color
        const memoryProgress = document.getElementById('memory-progress');
        if (resources.memory.percentage > 85) {
            memoryProgress.className = 'progress-bar bg-danger';
        } else if (resources.memory.percentage > 70) {
            memoryProgress.className = 'progress-bar bg-warning';
        } else {
            memoryProgress.className = 'progress-bar bg-success';
        }
        
        // Update Storage metrics
        document.getElementById('storage-usage').textContent = `${resources.storage.percentage.toFixed(1)}%`;
        document.getElementById('storage-progress').style.width = `${resources.storage.percentage}%`;
        document.getElementById('storage-details').textContent = `${resources.storage.used} MB / ${resources.storage.total} MB`;
        
        // Update storage progress bar color
        const storageProgress = document.getElementById('storage-progress');
        if (resources.storage.percentage > 90) {
            storageProgress.className = 'progress-bar bg-danger';
        } else if (resources.storage.percentage > 75) {
            storageProgress.className = 'progress-bar bg-warning';
        } else {
            storageProgress.className = 'progress-bar bg-warning';
        }
        
        // Update Cost metrics
        document.getElementById('total-cost').textContent = `$${costs.accumulated.total.toFixed(4)}`;
        document.getElementById('hourly-cost').textContent = costs.projections.hourly.toFixed(4);
        document.getElementById('daily-cost').textContent = costs.projections.daily.toFixed(2);
        
        // Update uptime
        const uptime = Math.floor((Date.now() - this.startTime) / 1000);
        document.getElementById('uptime').textContent = this.formatUptime(uptime);
        
        // Update memory details
        if (resources.memory.process) {
            document.getElementById('memory-rss').textContent = `${resources.memory.process.rss} MB`;
            document.getElementById('memory-heap-used').textContent = `${resources.memory.process.heapUsed} MB`;
            document.getElementById('memory-heap-total').textContent = `${resources.memory.process.heapTotal} MB`;
            document.getElementById('memory-external').textContent = `${resources.memory.process.external} MB`;
        }
        
        // Check for alerts
        this.checkAndDisplayAlerts();
    }

    updateCharts() {
        // Update resource chart
        this.resourceChart.data.labels = this.resourceHistory.timestamps;
        this.resourceChart.data.datasets[0].data = this.resourceHistory.cpu;
        this.resourceChart.data.datasets[1].data = this.resourceHistory.memory;
        this.resourceChart.data.datasets[2].data = this.resourceHistory.storage;
        this.resourceChart.update('none');
        
        // Update cost chart
        const infraCost = this.currentData.costs.accumulated.cpu + 
                         this.currentData.costs.accumulated.memory + 
                         this.currentData.costs.accumulated.storage;
        
        this.costChart.data.datasets[0].data = [
            infraCost,
            this.currentData.costs.accumulated.apiCalls,
            this.currentData.costs.accumulated.bandwidth
        ];
        this.costChart.update('none');
    }

    updateCostBreakdown() {
        const { costs } = this.currentData;
        
        // Infrastructure costs
        document.getElementById('cost-cpu').textContent = costs.accumulated.cpu.toFixed(4);
        document.getElementById('cost-memory').textContent = costs.accumulated.memory.toFixed(4);
        document.getElementById('cost-storage').textContent = costs.accumulated.storage.toFixed(4);
        document.getElementById('cost-bandwidth').textContent = costs.accumulated.bandwidth.toFixed(4);
        
        // Service costs
        document.getElementById('cost-api').textContent = costs.accumulated.apiCalls.toFixed(4);
        document.getElementById('cost-transcription').textContent = (costs.accumulated.apiCalls * 0.3).toFixed(4);
        document.getElementById('cost-ai').textContent = (costs.accumulated.apiCalls * 0.6).toFixed(4);
        document.getElementById('cost-payment').textContent = (costs.accumulated.apiCalls * 0.1).toFixed(4);
        
        // Projections
        document.getElementById('proj-hourly').textContent = costs.projections.hourly.toFixed(4);
        document.getElementById('proj-daily').textContent = costs.projections.daily.toFixed(2);
        document.getElementById('proj-monthly').textContent = costs.projections.monthly.toFixed(2);
        
        // Break-even calculation (assuming $0.10 per operation)
        const breakEven = costs.projections.hourly > 0 ? Math.ceil(costs.projections.hourly / 0.10) : 0;
        document.getElementById('break-even').textContent = breakEven;
    }

    updateApiCallsBreakdown() {
        const { apiCalls } = this.currentData.resources;
        
        document.getElementById('total-api-calls').textContent = apiCalls.total;
        
        const breakdown = document.getElementById('api-calls-breakdown');
        breakdown.innerHTML = '';
        
        Object.entries(apiCalls.byService).forEach(([service, data]) => {
            const item = document.createElement('div');
            item.className = 'api-call-item';
            item.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${service.charAt(0).toUpperCase() + service.slice(1)}</strong>
                        <br>
                        <small class="text-muted">${data.count} calls</small>
                    </div>
                    <div class="text-end">
                        <span class="badge bg-secondary">$${data.totalCost.toFixed(4)}</span>
                    </div>
                </div>
            `;
            breakdown.appendChild(item);
        });
    }

    checkAndDisplayAlerts() {
        const alerts = [];
        const { resources, costs } = this.currentData;
        
        // CPU alert
        if (resources.cpu.current > 80) {
            alerts.push({
                type: 'warning',
                message: `High CPU usage: ${resources.cpu.current.toFixed(1)}%`,
                icon: 'fas fa-microchip'
            });
        }
        
        // Memory alert
        if (resources.memory.percentage > 85) {
            alerts.push({
                type: 'warning',
                message: `High memory usage: ${resources.memory.percentage.toFixed(1)}%`,
                icon: 'fas fa-memory'
            });
        }
        
        // Storage alert
        if (resources.storage.percentage > 90) {
            alerts.push({
                type: 'danger',
                message: `Critical storage usage: ${resources.storage.percentage.toFixed(1)}%`,
                icon: 'fas fa-hdd'
            });
        }
        
        // Cost alert
        if (costs.projections.hourly > 1.0) {
            alerts.push({
                type: 'danger',
                message: `High projected cost: $${costs.projections.hourly.toFixed(2)}/hour`,
                icon: 'fas fa-dollar-sign'
            });
        }
        
        this.displayAlerts(alerts);
    }

    displayAlerts(alerts) {
        const container = document.getElementById('alerts-container');
        container.innerHTML = '';
        
        alerts.forEach(alert => {
            const alertDiv = document.createElement('div');
            alertDiv.className = `alert alert-${alert.type} alert-dismissible fade show`;
            alertDiv.innerHTML = `
                <i class="${alert.icon} me-2"></i>
                ${alert.message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            container.appendChild(alertDiv);
        });
    }

    updateMonitoringStatus(isActive) {
        const statusIndicator = document.getElementById('monitoring-status');
        const statusText = document.getElementById('monitoring-text');
        
        if (isActive) {
            statusIndicator.className = 'status-indicator status-healthy';
            statusText.textContent = 'Monitoring Active';
        } else {
            statusIndicator.className = 'status-indicator status-critical';
            statusText.textContent = 'Monitoring Inactive';
        }
    }

    formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    showError(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.getElementById('alerts-container');
        container.insertBefore(alertDiv, container.firstChild);
    }

    setupEventListeners() {
        // Add any additional event listeners here
        window.addEventListener('beforeunload', () => {
            this.isConnected = false;
        });
        
        // Handle visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.isConnected = false;
            } else {
                this.isConnected = true;
                this.updateLoop();
            }
        });
    }

    destroy() {
        this.isConnected = false;
        
        if (this.resourceChart) {
            this.resourceChart.destroy();
        }
        
        if (this.costChart) {
            this.costChart.destroy();
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.resourceDashboard = new ResourceDashboard();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResourceDashboard;
}

