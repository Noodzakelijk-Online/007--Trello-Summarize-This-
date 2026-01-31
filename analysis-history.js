// Analysis History and Cost Tracking Module
// Tracks all analyses, costs, and provides budget management

class AnalysisHistory {
    constructor() {
        this.storageKey = 'summarizeThis_analysisHistory';
        this.budgetKey = 'summarizeThis_budget';
        this.history = this.loadHistory();
        this.budget = this.loadBudget();
    }

    // Load history from storage
    loadHistory() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to load history:', error);
            return [];
        }
    }

    // Save history to storage
    saveHistory() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.history));
        } catch (error) {
            console.error('Failed to save history:', error);
        }
    }

    // Load budget settings
    loadBudget() {
        try {
            const stored = localStorage.getItem(this.budgetKey);
            return stored ? JSON.parse(stored) : {
                enabled: false,
                limit: 10.00,
                period: 'month', // 'day', 'week', 'month'
                alertThreshold: 0.8 // Alert at 80%
            };
        } catch (error) {
            console.error('Failed to load budget:', error);
            return {
                enabled: false,
                limit: 10.00,
                period: 'month',
                alertThreshold: 0.8
            };
        }
    }

    // Save budget settings
    saveBudget() {
        try {
            localStorage.setItem(this.budgetKey, JSON.stringify(this.budget));
        } catch (error) {
            console.error('Failed to save budget:', error);
        }
    }

    // Add analysis to history
    addAnalysis(analysis) {
        const entry = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            cardId: analysis.cardId,
            cardName: analysis.cardName,
            cardUrl: analysis.cardUrl,
            boardName: analysis.boardName,
            strategy: analysis.strategy,
            modelsUsed: analysis.modelsUsed || [],
            totalCost: analysis.totalCost || 0,
            tokensUsed: analysis.tokensUsed || 0,
            summary: analysis.summary,
            metadata: analysis.metadata || {}
        };

        this.history.unshift(entry); // Add to beginning

        // Keep only last 100 analyses
        if (this.history.length > 100) {
            this.history = this.history.slice(0, 100);
        }

        this.saveHistory();
        return entry;
    }

    // Get all history
    getHistory() {
        return this.history;
    }

    // Get history for specific card
    getCardHistory(cardId) {
        return this.history.filter(entry => entry.cardId === cardId);
    }

    // Get history for date range
    getHistoryByDateRange(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return this.history.filter(entry => {
            const date = new Date(entry.timestamp);
            return date >= start && date <= end;
        });
    }

    // Get specific analysis by ID
    getAnalysis(id) {
        return this.history.find(entry => entry.id === id);
    }

    // Delete analysis
    deleteAnalysis(id) {
        this.history = this.history.filter(entry => entry.id !== id);
        this.saveHistory();
    }

    // Clear all history
    clearHistory() {
        if (confirm('Are you sure you want to clear all analysis history? This cannot be undone.')) {
            this.history = [];
            this.saveHistory();
            return true;
        }
        return false;
    }

    // Get statistics
    getStatistics() {
        if (this.history.length === 0) {
            return {
                totalAnalyses: 0,
                totalCost: 0,
                totalTokens: 0,
                averageCost: 0,
                mostUsedStrategy: 'N/A',
                mostAnalyzedBoard: 'N/A'
            };
        }

        const totalCost = this.history.reduce((sum, entry) => sum + (entry.totalCost || 0), 0);
        const totalTokens = this.history.reduce((sum, entry) => sum + (entry.tokensUsed || 0), 0);
        
        // Most used strategy
        const strategies = {};
        this.history.forEach(entry => {
            strategies[entry.strategy] = (strategies[entry.strategy] || 0) + 1;
        });
        const mostUsedStrategy = Object.keys(strategies).reduce((a, b) => 
            strategies[a] > strategies[b] ? a : b, 'N/A');

        // Most analyzed board
        const boards = {};
        this.history.forEach(entry => {
            if (entry.boardName) {
                boards[entry.boardName] = (boards[entry.boardName] || 0) + 1;
            }
        });
        const mostAnalyzedBoard = Object.keys(boards).length > 0 ?
            Object.keys(boards).reduce((a, b) => boards[a] > boards[b] ? a : b) : 'N/A';

        return {
            totalAnalyses: this.history.length,
            totalCost: totalCost,
            totalTokens: totalTokens,
            averageCost: totalCost / this.history.length,
            mostUsedStrategy: mostUsedStrategy,
            mostAnalyzedBoard: mostAnalyzedBoard
        };
    }

    // Get cost for current period
    getCurrentPeriodCost() {
        const now = new Date();
        let startDate;

        switch (this.budget.period) {
            case 'day':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                const day = now.getDay();
                startDate = new Date(now);
                startDate.setDate(now.getDate() - day);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        const periodHistory = this.getHistoryByDateRange(startDate, now);
        return periodHistory.reduce((sum, entry) => sum + (entry.totalCost || 0), 0);
    }

    // Check if budget allows new analysis
    checkBudget(estimatedCost = 0) {
        if (!this.budget.enabled) {
            return { allowed: true, message: 'Budget tracking disabled' };
        }

        const currentCost = this.getCurrentPeriodCost();
        const projectedCost = currentCost + estimatedCost;
        const remaining = this.budget.limit - currentCost;
        const percentUsed = (currentCost / this.budget.limit) * 100;

        if (projectedCost > this.budget.limit) {
            return {
                allowed: false,
                message: `Budget limit exceeded. Current: $${currentCost.toFixed(4)}, Limit: $${this.budget.limit.toFixed(2)}`,
                currentCost: currentCost,
                remaining: remaining,
                percentUsed: percentUsed
            };
        }

        if (percentUsed >= (this.budget.alertThreshold * 100)) {
            return {
                allowed: true,
                warning: true,
                message: `Budget alert: ${percentUsed.toFixed(0)}% used ($${currentCost.toFixed(4)} of $${this.budget.limit.toFixed(2)})`,
                currentCost: currentCost,
                remaining: remaining,
                percentUsed: percentUsed
            };
        }

        return {
            allowed: true,
            message: 'Within budget',
            currentCost: currentCost,
            remaining: remaining,
            percentUsed: percentUsed
        };
    }

    // Update budget settings
    updateBudget(settings) {
        this.budget = {
            ...this.budget,
            ...settings
        };
        this.saveBudget();
    }

    // Get budget settings
    getBudget() {
        return this.budget;
    }

    // Export history as JSON
    exportHistory() {
        const data = {
            exportDate: new Date().toISOString(),
            totalAnalyses: this.history.length,
            statistics: this.getStatistics(),
            history: this.history
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `summarize-this-history-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Export history as CSV
    exportHistoryCSV() {
        const headers = ['Date', 'Card Name', 'Board', 'Strategy', 'Models', 'Cost', 'Tokens'];
        const rows = this.history.map(entry => [
            new Date(entry.timestamp).toLocaleString(),
            entry.cardName,
            entry.boardName,
            entry.strategy,
            entry.modelsUsed.join(', '),
            entry.totalCost.toFixed(6),
            entry.tokensUsed
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `summarize-this-history-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Create history UI
    createHistoryUI() {
        const container = document.createElement('div');
        container.className = 'history-container';
        container.innerHTML = `
            <div class="history-header">
                <h2>📊 Analysis History</h2>
                <div class="history-actions">
                    <button class="btn-history-export" onclick="window.analysisHistory.exportHistory()">
                        Export JSON
                    </button>
                    <button class="btn-history-export-csv" onclick="window.analysisHistory.exportHistoryCSV()">
                        Export CSV
                    </button>
                    <button class="btn-history-clear" onclick="window.analysisHistory.clearHistory()">
                        Clear History
                    </button>
                </div>
            </div>

            <div class="history-stats">
                ${this.renderStatistics()}
            </div>

            <div class="history-budget">
                ${this.renderBudgetSettings()}
            </div>

            <div class="history-list">
                ${this.renderHistoryList()}
            </div>
        `;

        return container;
    }

    // Render statistics
    renderStatistics() {
        const stats = this.getStatistics();
        return `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${stats.totalAnalyses}</div>
                    <div class="stat-label">Total Analyses</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">$${stats.totalCost.toFixed(4)}</div>
                    <div class="stat-label">Total Cost</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">$${stats.averageCost.toFixed(4)}</div>
                    <div class="stat-label">Average Cost</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.totalTokens.toLocaleString()}</div>
                    <div class="stat-label">Total Tokens</div>
                </div>
            </div>
        `;
    }

    // Render budget settings
    renderBudgetSettings() {
        const currentCost = this.getCurrentPeriodCost();
        const percentUsed = this.budget.enabled ? 
            (currentCost / this.budget.limit) * 100 : 0;

        return `
            <div class="budget-settings">
                <h3>💰 Budget Management</h3>
                <div class="budget-toggle">
                    <label>
                        <input type="checkbox" id="budgetEnabled" 
                            ${this.budget.enabled ? 'checked' : ''}
                            onchange="window.analysisHistory.updateBudget({enabled: this.checked})">
                        Enable Budget Tracking
                    </label>
                </div>
                ${this.budget.enabled ? `
                    <div class="budget-controls">
                        <div class="budget-input">
                            <label>Budget Limit: $</label>
                            <input type="number" id="budgetLimit" 
                                value="${this.budget.limit}" 
                                step="0.01" min="0.01"
                                onchange="window.analysisHistory.updateBudget({limit: parseFloat(this.value)})">
                        </div>
                        <div class="budget-input">
                            <label>Period:</label>
                            <select id="budgetPeriod" 
                                onchange="window.analysisHistory.updateBudget({period: this.value})">
                                <option value="day" ${this.budget.period === 'day' ? 'selected' : ''}>Daily</option>
                                <option value="week" ${this.budget.period === 'week' ? 'selected' : ''}>Weekly</option>
                                <option value="month" ${this.budget.period === 'month' ? 'selected' : ''}>Monthly</option>
                            </select>
                        </div>
                        <div class="budget-status">
                            <div class="budget-bar">
                                <div class="budget-fill" style="width: ${Math.min(percentUsed, 100)}%"></div>
                            </div>
                            <div class="budget-text">
                                $${currentCost.toFixed(4)} / $${this.budget.limit.toFixed(2)} 
                                (${percentUsed.toFixed(0)}% used)
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Render history list
    renderHistoryList() {
        if (this.history.length === 0) {
            return '<div class="history-empty">No analyses yet. Start analyzing cards to build your history!</div>';
        }

        return this.history.map(entry => `
            <div class="history-item" data-id="${entry.id}">
                <div class="history-item-header">
                    <div class="history-item-title">
                        <strong>${entry.cardName}</strong>
                        <span class="history-item-board">${entry.boardName}</span>
                    </div>
                    <div class="history-item-date">
                        ${new Date(entry.timestamp).toLocaleString()}
                    </div>
                </div>
                <div class="history-item-details">
                    <span class="history-badge">${entry.strategy}</span>
                    <span class="history-badge">${entry.modelsUsed.length} models</span>
                    <span class="history-badge">$${entry.totalCost.toFixed(6)}</span>
                    <span class="history-badge">${entry.tokensUsed} tokens</span>
                </div>
                <div class="history-item-actions">
                    <button onclick="window.analysisHistory.viewAnalysis('${entry.id}')">View</button>
                    <button onclick="window.analysisHistory.deleteAnalysis('${entry.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    // View analysis details
    viewAnalysis(id) {
        const entry = this.getAnalysis(id);
        if (!entry) return;

        // Create modal or navigate to card
        alert(`Analysis for: ${entry.cardName}\n\nAbout: ${entry.summary.about.substring(0, 200)}...`);
        // TODO: Implement full modal view
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnalysisHistory;
}
