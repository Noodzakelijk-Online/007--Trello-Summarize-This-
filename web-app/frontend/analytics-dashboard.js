// Analytics Dashboard JavaScript
// Comprehensive dashboard functionality with real-time updates and interactive visualizations

class AnalyticsDashboard {
    constructor() {
        this.charts = {};
        this.data = {};
        this.websocket = null;
        this.refreshInterval = null;
        this.currentTab = 'overview';
        this.timeRange = '30d';
        
        this.init();
    }
    
    // ==========================================================================
    // INITIALIZATION
    // ==========================================================================
    
    init() {
        this.setupEventListeners();
        this.initializeCharts();
        this.loadInitialData();
        this.setupWebSocket();
        this.startAutoRefresh();
    }
    
    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchTab(tabName);
            });
        });
        
        // Time range selector
        document.getElementById('timeRange').addEventListener('change', (e) => {
            this.timeRange = e.target.value;
            this.refreshData();
        });
        
        // Refresh button
        document.getElementById('refreshData').addEventListener('click', () => {
            this.refreshData();
        });
        
        // Chart controls
        document.querySelectorAll('.chart-control').forEach(control => {
            control.addEventListener('click', (e) => {
                const metric = e.currentTarget.dataset.metric;
                const breakdown = e.currentTarget.dataset.breakdown;
                
                if (metric) {
                    this.updateChart('revenueChart', metric);
                }
                
                if (breakdown) {
                    this.updateRevenueBreakdown(breakdown);
                }
                
                // Update active state
                e.currentTarget.parentElement.querySelectorAll('.chart-control').forEach(c => {
                    c.classList.remove('active');
                });
                e.currentTarget.classList.add('active');
            });
        });
        
        // Feature selector
        const featureSelector = document.getElementById('featureSelector');
        if (featureSelector) {
            featureSelector.addEventListener('change', (e) => {
                this.updateAdoptionFunnel(e.target.value);
            });
        }
        
        // Export buttons
        document.getElementById('exportUsers')?.addEventListener('click', () => {
            this.exportData('users');
        });
        
        document.getElementById('exportFeatures')?.addEventListener('click', () => {
            this.exportData('features');
        });
        
        document.getElementById('exportRevenue')?.addEventListener('click', () => {
            this.exportData('revenue');
        });
        
        document.getElementById('exportChurnRisk')?.addEventListener('click', () => {
            this.exportData('churn');
        });
    }
    
    // ==========================================================================
    // TAB MANAGEMENT
    // ==========================================================================
    
    switchTab(tabName) {
        // Update nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        this.currentTab = tabName;
        
        // Load tab-specific data
        this.loadTabData(tabName);
    }
    
    loadTabData(tabName) {
        switch (tabName) {
            case 'overview':
                this.loadOverviewData();
                break;
            case 'users':
                this.loadUsersData();
                break;
            case 'features':
                this.loadFeaturesData();
                break;
            case 'revenue':
                this.loadRevenueData();
                break;
            case 'churn':
                this.loadChurnData();
                break;
        }
    }
    
    // ==========================================================================
    // DATA LOADING
    // ==========================================================================
    
    async loadInitialData() {
        this.showLoading(true);
        
        try {
            // Load all initial data
            await Promise.all([
                this.loadKPIData(),
                this.loadOverviewData(),
                this.loadUsersData(),
                this.loadFeaturesData(),
                this.loadRevenueData(),
                this.loadChurnData()
            ]);
            
            this.showToast('Dashboard loaded successfully', 'success');
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showToast('Error loading dashboard data', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    async loadKPIData() {
        // Simulate API call - replace with actual API endpoint
        const kpiData = await this.fetchData('/api/analytics/kpi', { timeRange: this.timeRange });
        
        // Update KPI cards
        this.updateKPI('totalRevenue', kpiData.totalRevenue, kpiData.revenueChange);
        this.updateKPI('activeUsers', kpiData.activeUsers, kpiData.usersChange);
        this.updateKPI('creditsUsed', kpiData.creditsUsed, kpiData.creditsChange);
        this.updateKPI('conversionRate', kpiData.conversionRate, kpiData.conversionChange);
    }
    
    async loadOverviewData() {
        const data = await this.fetchData('/api/analytics/overview', { timeRange: this.timeRange });
        
        // Update revenue chart
        this.updateRevenueChart(data.revenueData);
        
        // Update feature usage chart
        this.updateFeatureUsageChart(data.featureUsage);
        
        // Update user segments chart
        this.updateUserSegmentsChart(data.userSegments);
        
        // Update activity feed
        this.updateActivityFeed(data.recentActivity);
    }
    
    async loadUsersData() {
        const data = await this.fetchData('/api/analytics/users', { timeRange: this.timeRange });
        
        // Update user heatmap
        this.updateUserHeatmap(data.userJourney);
        
        // Update cohort chart
        this.updateCohortChart(data.cohortData);
        
        // Update LTV metrics
        this.updateLTVMetrics(data.ltvData);
    }
    
    async loadFeaturesData() {
        const data = await this.fetchData('/api/analytics/features', { timeRange: this.timeRange });
        
        // Update adoption funnel
        this.updateAdoptionFunnel('text_summarization', data.adoptionFunnels);
        
        // Update feature matrix
        this.updateFeatureMatrix(data.featurePerformance);
        
        // Update A/B tests
        this.updateABTests(data.abTests);
    }
    
    async loadRevenueData() {
        const data = await this.fetchData('/api/analytics/revenue', { timeRange: this.timeRange });
        
        // Update revenue breakdown
        this.updateRevenueBreakdown('package', data.revenueBreakdown);
        
        // Update MRR chart
        this.updateMRRChart(data.mrrData);
        
        // Update forecast chart
        this.updateForecastChart(data.forecastData);
    }
    
    async loadChurnData() {
        const data = await this.fetchData('/api/analytics/churn', { timeRange: this.timeRange });
        
        // Update risk distribution
        this.updateRiskDistribution(data.riskDistribution);
        
        // Update risk factors
        this.updateRiskFactors(data.topRiskFactors);
        
        // Update at-risk users
        this.updateAtRiskUsers(data.atRiskUsers);
    }
    
    // ==========================================================================
    // CHART INITIALIZATION
    // ==========================================================================
    
    initializeCharts() {
        // Revenue Chart
        this.initRevenueChart();
        
        // Feature Usage Chart
        this.initFeatureUsageChart();
        
        // User Segments Chart
        this.initUserSegmentsChart();
        
        // Cohort Chart
        this.initCohortChart();
        
        // LTV Chart
        this.initLTVChart();
        
        // Revenue Breakdown Chart
        this.initRevenueBreakdownChart();
        
        // MRR Chart
        this.initMRRChart();
        
        // Forecast Chart
        this.initForecastChart();
    }
    
    initRevenueChart() {
        const ctx = document.getElementById('revenueChart').getContext('2d');
        
        this.charts.revenue = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Revenue',
                    data: [],
                    borderColor: 'rgb(102, 126, 234)',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgb(102, 126, 234)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgb(102, 126, 234)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return `$${context.parsed.y.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#6b7280'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            color: '#6b7280',
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }
    
    initFeatureUsageChart() {
        const ctx = document.getElementById('featureChart').getContext('2d');
        
        this.charts.features = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        'rgb(102, 126, 234)',
                        'rgb(16, 185, 129)',
                        'rgb(245, 158, 11)',
                        'rgb(239, 68, 68)',
                        'rgb(139, 92, 246)'
                    ],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${percentage}%`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 1000
                }
            }
        });
    }
    
    initUserSegmentsChart() {
        const ctx = document.getElementById('segmentsChart').getContext('2d');
        
        this.charts.segments = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Users',
                    data: [],
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderColor: 'rgb(102, 126, 234)',
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        cornerRadius: 8
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#6b7280'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            color: '#6b7280'
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }
    
    initCohortChart() {
        const ctx = document.getElementById('cohortChart').getContext('2d');
        
        this.charts.cohort = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${(context.parsed.y * 100).toFixed(1)}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#6b7280'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            color: '#6b7280',
                            callback: function(value) {
                                return (value * 100).toFixed(0) + '%';
                            }
                        },
                        min: 0,
                        max: 1
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }
    
    initLTVChart() {
        const ctx = document.getElementById('ltvChart').getContext('2d');
        
        this.charts.ltv = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Customer LTV',
                    data: [],
                    backgroundColor: 'rgba(102, 126, 234, 0.6)',
                    borderColor: 'rgb(102, 126, 234)',
                    borderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return `LTV: $${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Days Since Signup',
                            color: '#6b7280'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            color: '#6b7280'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Lifetime Value ($)',
                            color: '#6b7280'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            color: '#6b7280',
                            callback: function(value) {
                                return '$' + value.toFixed(0);
                            }
                        }
                    }
                }
            }
        });
    }
    
    initRevenueBreakdownChart() {
        const ctx = document.getElementById('revenueBreakdownChart').getContext('2d');
        
        this.charts.revenueBreakdown = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        'rgb(102, 126, 234)',
                        'rgb(16, 185, 129)',
                        'rgb(245, 158, 11)',
                        'rgb(239, 68, 68)',
                        'rgb(139, 92, 246)',
                        'rgb(236, 72, 153)'
                    ],
                    borderWidth: 0,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: $${context.parsed.toLocaleString()} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 1000
                }
            }
        });
    }
    
    initMRRChart() {
        const ctx = document.getElementById('mrrChart').getContext('2d');
        
        this.charts.mrr = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'MRR',
                    data: [],
                    borderColor: 'rgb(16, 185, 129)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgb(16, 185, 129)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgb(16, 185, 129)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return `$${context.parsed.y.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#6b7280'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            color: '#6b7280',
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }
    
    initForecastChart() {
        const ctx = document.getElementById('forecastChart').getContext('2d');
        
        this.charts.forecast = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Actual Revenue',
                        data: [],
                        borderColor: 'rgb(102, 126, 234)',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4,
                        pointBackgroundColor: 'rgb(102, 126, 234)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 6
                    },
                    {
                        label: 'Predicted Revenue',
                        data: [],
                        borderColor: 'rgb(245, 158, 11)',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        borderWidth: 3,
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.4,
                        pointBackgroundColor: 'rgb(245, 158, 11)',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: $${context.parsed.y.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#6b7280'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            color: '#6b7280',
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }
    
    // ==========================================================================
    // DATA UPDATE METHODS
    // ==========================================================================
    
    updateKPI(kpiId, value, change) {
        const valueElement = document.getElementById(kpiId);
        const changeElement = document.getElementById(kpiId.replace(/([A-Z])/g, '$1').toLowerCase() + 'Change');
        
        if (valueElement) {
            // Format value based on KPI type
            let formattedValue = value;
            if (kpiId === 'totalRevenue') {
                formattedValue = '$' + value.toLocaleString();
            } else if (kpiId === 'conversionRate') {
                formattedValue = value.toFixed(1) + '%';
            } else {
                formattedValue = value.toLocaleString();
            }
            
            // Animate value change
            this.animateValue(valueElement, formattedValue);
        }
        
        if (changeElement) {
            const changeValue = Math.abs(change);
            const changeDirection = change >= 0 ? 'positive' : 'negative';
            const changeIcon = change >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
            
            changeElement.className = `kpi-change ${changeDirection}`;
            changeElement.innerHTML = `
                <i class="fas ${changeIcon}"></i>
                <span>${changeValue.toFixed(1)}%</span>
            `;
        }
    }
    
    updateRevenueChart(data) {
        if (!this.charts.revenue || !data) return;
        
        this.charts.revenue.data.labels = data.labels;
        this.charts.revenue.data.datasets[0].data = data.values;
        this.charts.revenue.update('active');
    }
    
    updateFeatureUsageChart(data) {
        if (!this.charts.features || !data) return;
        
        this.charts.features.data.labels = data.labels;
        this.charts.features.data.datasets[0].data = data.values;
        this.charts.features.update('active');
    }
    
    updateUserSegmentsChart(data) {
        if (!this.charts.segments || !data) return;
        
        this.charts.segments.data.labels = data.labels;
        this.charts.segments.data.datasets[0].data = data.values;
        this.charts.segments.update('active');
    }
    
    updateActivityFeed(activities) {
        const feedElement = document.getElementById('activityFeed');
        if (!feedElement || !activities) return;
        
        feedElement.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    <i class="fas ${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-description">${activity.description}</div>
                </div>
                <div class="activity-time">${this.formatTimeAgo(activity.timestamp)}</div>
            </div>
        `).join('');
    }
    
    updateUserHeatmap(journeyData) {
        const heatmapElement = document.getElementById('userHeatmap');
        if (!heatmapElement || !journeyData) return;
        
        // Create heatmap visualization
        const heatmapHTML = journeyData.map((row, rowIndex) => 
            row.map((cell, colIndex) => {
                const intensity = Math.min(cell.value / journeyData.maxValue, 1);
                const color = this.getHeatmapColor(intensity);
                return `
                    <div class="heatmap-cell" 
                         style="background-color: ${color}" 
                         title="${cell.label}: ${cell.value} users">
                        ${cell.value}
                    </div>
                `;
            }).join('')
        ).join('');
        
        heatmapElement.innerHTML = heatmapHTML;
    }
    
    updateCohortChart(cohortData) {
        if (!this.charts.cohort || !cohortData) return;
        
        this.charts.cohort.data.labels = cohortData.periods;
        this.charts.cohort.data.datasets = cohortData.cohorts.map((cohort, index) => ({
            label: cohort.name,
            data: cohort.retention,
            borderColor: this.getCohortColor(index),
            backgroundColor: this.getCohortColor(index, 0.1),
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6
        }));
        
        this.charts.cohort.update('active');
    }
    
    updateLTVMetrics(ltvData) {
        if (!ltvData) return;
        
        document.getElementById('avgLTV').textContent = '$' + ltvData.averageLTV.toLocaleString();
        document.getElementById('predictedLTV').textContent = '$' + ltvData.predictedLTV.toLocaleString();
        document.getElementById('ltvCacRatio').textContent = ltvData.ltvCacRatio.toFixed(1) + ':1';
        
        if (this.charts.ltv) {
            this.charts.ltv.data.datasets[0].data = ltvData.scatterData;
            this.charts.ltv.update('active');
        }
    }
    
    updateAdoptionFunnel(featureId, funnelData) {
        const funnelElement = document.getElementById('adoptionFunnel');
        if (!funnelElement) return;
        
        const data = funnelData?.[featureId] || this.generateMockFunnelData(featureId);
        
        const funnelHTML = data.steps.map((step, index) => {
            const width = (step.users / data.steps[0].users) * 100;
            return `
                <div class="funnel-step" style="width: ${width}%">
                    <div class="funnel-step-number">${index + 1}</div>
                    <div class="funnel-step-content">
                        <div class="funnel-step-title">${step.name}</div>
                        <div class="funnel-step-stats">
                            ${step.users.toLocaleString()} users (${step.conversionRate.toFixed(1)}%)
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        funnelElement.innerHTML = funnelHTML;
    }
    
    updateFeatureMatrix(performanceData) {
        const matrixElement = document.getElementById('featureMatrix');
        if (!matrixElement || !performanceData) return;
        
        const matrixHTML = performanceData.map(feature => `
            <div class="performance-item">
                <div class="performance-metric">${feature.adoptionRate.toFixed(1)}%</div>
                <div class="performance-label">${feature.name} Adoption</div>
            </div>
        `).join('');
        
        matrixElement.innerHTML = matrixHTML;
    }
    
    updateABTests(abTestData) {
        const testsElement = document.getElementById('abTests');
        if (!testsElement || !abTestData) return;
        
        const testsHTML = abTestData.map(test => `
            <div class="ab-test">
                <div class="ab-test-header">
                    <div class="ab-test-name">${test.name}</div>
                    <div class="ab-test-status ${test.status}">${test.status}</div>
                </div>
                <div class="ab-test-results">
                    Control: ${test.controlConversion.toFixed(1)}% | 
                    Treatment: ${test.treatmentConversion.toFixed(1)}%
                    ${test.significant ? ' ✓ Significant' : ''}
                </div>
            </div>
        `).join('');
        
        testsElement.innerHTML = testsHTML;
    }
    
    updateRevenueBreakdown(breakdownType, data) {
        if (!this.charts.revenueBreakdown) return;
        
        const breakdownData = data?.[breakdownType] || this.generateMockBreakdownData(breakdownType);
        
        this.charts.revenueBreakdown.data.labels = breakdownData.labels;
        this.charts.revenueBreakdown.data.datasets[0].data = breakdownData.values;
        this.charts.revenueBreakdown.update('active');
    }
    
    updateMRRChart(mrrData) {
        if (!this.charts.mrr || !mrrData) return;
        
        // Update MRR metrics
        document.getElementById('currentMRR').textContent = '$' + mrrData.currentMRR.toLocaleString();
        document.getElementById('mrrGrowth').textContent = mrrData.growthRate.toFixed(1) + '%';
        
        // Update chart
        this.charts.mrr.data.labels = mrrData.labels;
        this.charts.mrr.data.datasets[0].data = mrrData.values;
        this.charts.mrr.update('active');
    }
    
    updateForecastChart(forecastData) {
        if (!this.charts.forecast || !forecastData) return;
        
        // Update confidence
        document.getElementById('forecastConfidence').textContent = (forecastData.confidence * 100).toFixed(0) + '%';
        
        // Update chart
        this.charts.forecast.data.labels = forecastData.labels;
        this.charts.forecast.data.datasets[0].data = forecastData.actual;
        this.charts.forecast.data.datasets[1].data = forecastData.predicted;
        this.charts.forecast.update('active');
    }
    
    updateRiskDistribution(riskData) {
        if (!riskData) return;
        
        const total = riskData.high + riskData.medium + riskData.low;
        
        // Update counts
        document.getElementById('highRiskCount').textContent = riskData.high.toLocaleString();
        document.getElementById('mediumRiskCount').textContent = riskData.medium.toLocaleString();
        document.getElementById('lowRiskCount').textContent = riskData.low.toLocaleString();
        
        // Update bars
        document.getElementById('highRiskFill').style.width = ((riskData.high / total) * 100) + '%';
        document.getElementById('mediumRiskFill').style.width = ((riskData.medium / total) * 100) + '%';
        document.getElementById('lowRiskFill').style.width = ((riskData.low / total) * 100) + '%';
    }
    
    updateRiskFactors(factorsData) {
        const factorsElement = document.getElementById('riskFactors');
        if (!factorsElement || !factorsData) return;
        
        const factorsHTML = factorsData.map(factor => `
            <div class="risk-factor">
                <div class="risk-factor-name">${factor.name}</div>
                <div class="risk-factor-impact">${(factor.impact * 100).toFixed(1)}%</div>
            </div>
        `).join('');
        
        factorsElement.innerHTML = factorsHTML;
    }
    
    updateAtRiskUsers(usersData) {
        const usersElement = document.getElementById('atRiskUsers');
        if (!usersElement || !usersData) return;
        
        const usersHTML = usersData.map(user => `
            <div class="at-risk-user">
                <div class="user-info">
                    <div class="user-id">User ${user.id}</div>
                    <div class="user-risk">${user.primaryRiskFactor}</div>
                </div>
                <div class="risk-score">${(user.riskScore * 100).toFixed(0)}%</div>
            </div>
        `).join('');
        
        usersElement.innerHTML = usersHTML;
    }
    
    // ==========================================================================
    // WEBSOCKET AND REAL-TIME UPDATES
    // ==========================================================================
    
    setupWebSocket() {
        // Connect to WebSocket for real-time updates
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/ws/analytics`;
        
        this.websocket = new WebSocket(wsUrl);
        
        this.websocket.onopen = () => {
            console.log('WebSocket connected');
            this.showToast('Real-time updates connected', 'success');
        };
        
        this.websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleRealTimeUpdate(data);
        };
        
        this.websocket.onclose = () => {
            console.log('WebSocket disconnected');
            // Attempt to reconnect after 5 seconds
            setTimeout(() => {
                this.setupWebSocket();
            }, 5000);
        };
        
        this.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }
    
    handleRealTimeUpdate(data) {
        switch (data.type) {
            case 'kpi_update':
                this.updateKPI(data.kpi, data.value, data.change);
                break;
            case 'new_activity':
                this.addActivityItem(data.activity);
                break;
            case 'user_signup':
                this.handleUserSignup(data);
                break;
            case 'purchase':
                this.handlePurchase(data);
                break;
            case 'feature_usage':
                this.handleFeatureUsage(data);
                break;
        }
    }
    
    addActivityItem(activity) {
        const feedElement = document.getElementById('activityFeed');
        if (!feedElement) return;
        
        const activityHTML = `
            <div class="activity-item" style="animation: slideIn 0.5s ease;">
                <div class="activity-icon ${activity.type}">
                    <i class="fas ${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-description">${activity.description}</div>
                </div>
                <div class="activity-time">Just now</div>
            </div>
        `;
        
        feedElement.insertAdjacentHTML('afterbegin', activityHTML);
        
        // Remove old items if more than 20
        const items = feedElement.querySelectorAll('.activity-item');
        if (items.length > 20) {
            items[items.length - 1].remove();
        }
    }
    
    // ==========================================================================
    // UTILITY METHODS
    // ==========================================================================
    
    async fetchData(endpoint, params = {}) {
        try {
            const url = new URL(endpoint, window.location.origin);
            Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching data:', error);
            // Return mock data for demo purposes
            return this.generateMockData(endpoint, params);
        }
    }
    
    generateMockData(endpoint, params) {
        // Generate realistic mock data based on endpoint
        const mockData = {
            '/api/analytics/kpi': {
                totalRevenue: 125000,
                revenueChange: 15.2,
                activeUsers: 2340,
                usersChange: 8.7,
                creditsUsed: 45600,
                creditsChange: 12.3,
                conversionRate: 3.2,
                conversionChange: 0.8
            },
            '/api/analytics/overview': {
                revenueData: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    values: [20000, 25000, 30000, 35000, 40000, 45000]
                },
                featureUsage: {
                    labels: ['Text Summarization', 'Audio Transcription', 'Video Transcription', 'File Upload'],
                    values: [45, 25, 20, 10]
                },
                userSegments: {
                    labels: ['Free Trial', 'Light', 'Regular', 'Power', 'Enterprise'],
                    values: [1200, 800, 600, 400, 100]
                },
                recentActivity: this.generateMockActivity()
            }
        };
        
        return mockData[endpoint] || {};
    }
    
    generateMockActivity() {
        const activities = [
            { type: 'purchase', title: 'New Purchase', description: 'User purchased 100 credits', timestamp: Date.now() - 60000 },
            { type: 'signup', title: 'New User', description: 'User signed up for free trial', timestamp: Date.now() - 120000 },
            { type: 'usage', title: 'Feature Used', description: 'Text summarization completed', timestamp: Date.now() - 180000 },
            { type: 'purchase', title: 'Upgrade', description: 'User upgraded to premium plan', timestamp: Date.now() - 240000 },
            { type: 'usage', title: 'Transcription', description: 'Audio file transcribed', timestamp: Date.now() - 300000 }
        ];
        
        return activities;
    }
    
    generateMockFunnelData(featureId) {
        return {
            steps: [
                { name: 'Initiated', users: 1000, conversionRate: 100 },
                { name: 'File Selected', users: 850, conversionRate: 85 },
                { name: 'Processing Started', users: 720, conversionRate: 72 },
                { name: 'Results Viewed', users: 680, conversionRate: 68 },
                { name: 'Results Saved', users: 540, conversionRate: 54 }
            ]
        };
    }
    
    generateMockBreakdownData(breakdownType) {
        const breakdowns = {
            package: {
                labels: ['Basic', 'Standard', 'Premium', 'Enterprise'],
                values: [25000, 45000, 35000, 20000]
            },
            feature: {
                labels: ['Text Summarization', 'Audio Transcription', 'Video Transcription', 'File Processing'],
                values: [50000, 30000, 25000, 20000]
            },
            geography: {
                labels: ['North America', 'Europe', 'Asia', 'Other'],
                values: [60000, 35000, 25000, 5000]
            }
        };
        
        return breakdowns[breakdownType] || breakdowns.package;
    }
    
    animateValue(element, targetValue) {
        const currentValue = element.textContent;
        element.style.transform = 'scale(1.1)';
        element.style.color = '#4f46e5';
        
        setTimeout(() => {
            element.textContent = targetValue;
            element.style.transform = 'scale(1)';
            element.style.color = '';
        }, 150);
    }
    
    getActivityIcon(type) {
        const icons = {
            purchase: 'fa-shopping-cart',
            signup: 'fa-user-plus',
            usage: 'fa-play',
            upgrade: 'fa-arrow-up',
            transcription: 'fa-microphone'
        };
        
        return icons[type] || 'fa-info';
    }
    
    getHeatmapColor(intensity) {
        const colors = [
            '#f3f4f6', '#ddd6fe', '#c4b5fd', '#a78bfa',
            '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6'
        ];
        
        const index = Math.floor(intensity * (colors.length - 1));
        return colors[index];
    }
    
    getCohortColor(index, alpha = 1) {
        const colors = [
            `rgba(102, 126, 234, ${alpha})`,
            `rgba(16, 185, 129, ${alpha})`,
            `rgba(245, 158, 11, ${alpha})`,
            `rgba(239, 68, 68, ${alpha})`,
            `rgba(139, 92, 246, ${alpha})`
        ];
        
        return colors[index % colors.length];
    }
    
    formatTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
        if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
        return Math.floor(diff / 86400000) + 'd ago';
    }
    
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.toggle('show', show);
        }
    }
    
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const icon = toast.querySelector('.toast-icon');
        const messageEl = toast.querySelector('.toast-message');
        
        // Set icon based on type
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            info: 'fa-info-circle'
        };
        
        icon.className = `toast-icon fas ${icons[type]}`;
        messageEl.textContent = message;
        toast.className = `toast ${type}`;
        
        // Show toast
        toast.classList.add('show');
        
        // Hide after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    refreshData() {
        this.showLoading(true);
        this.loadInitialData();
    }
    
    startAutoRefresh() {
        // Refresh data every 5 minutes
        this.refreshInterval = setInterval(() => {
            this.loadTabData(this.currentTab);
        }, 5 * 60 * 1000);
    }
    
    exportData(type) {
        // Generate CSV data based on type
        let csvData = '';
        let filename = '';
        
        switch (type) {
            case 'users':
                csvData = this.generateUserCSV();
                filename = 'users_analytics.csv';
                break;
            case 'features':
                csvData = this.generateFeatureCSV();
                filename = 'features_analytics.csv';
                break;
            case 'revenue':
                csvData = this.generateRevenueCSV();
                filename = 'revenue_analytics.csv';
                break;
            case 'churn':
                csvData = this.generateChurnCSV();
                filename = 'churn_risk.csv';
                break;
        }
        
        // Download CSV
        this.downloadCSV(csvData, filename);
        this.showToast(`${type} data exported successfully`, 'success');
    }
    
    generateUserCSV() {
        return 'User ID,Segment,LTV,Signup Date,Last Activity\n' +
               'user_001,Regular,$125.50,2024-01-15,2024-02-01\n' +
               'user_002,Power,$450.75,2024-01-10,2024-02-01\n';
    }
    
    generateFeatureCSV() {
        return 'Feature,Usage Count,Adoption Rate,Success Rate\n' +
               'Text Summarization,15420,85.2%,94.1%\n' +
               'Audio Transcription,8750,62.3%,91.8%\n';
    }
    
    generateRevenueCSV() {
        return 'Date,Revenue,Purchases,Customers\n' +
               '2024-01-01,$12500,125,98\n' +
               '2024-01-02,$13200,132,105\n';
    }
    
    generateChurnCSV() {
        return 'User ID,Risk Score,Risk Level,Primary Factor\n' +
               'user_001,0.85,High,Inactive 30 days\n' +
               'user_002,0.72,High,Low credits\n';
    }
    
    downloadCSV(csvData, filename) {
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // Cleanup method
    destroy() {
        if (this.websocket) {
            this.websocket.close();
        }
        
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        // Destroy all charts
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.analyticsDashboard = new AnalyticsDashboard();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.analyticsDashboard) {
        window.analyticsDashboard.destroy();
    }
});

