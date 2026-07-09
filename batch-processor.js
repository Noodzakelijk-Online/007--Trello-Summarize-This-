// Batch Processing Module
// Analyze multiple Trello cards in sequence or parallel

class BatchProcessor {
    constructor(analyzer, trelloIntegration) {
        this.analyzer = analyzer;
        this.trelloIntegration = trelloIntegration;
        this.queue = [];
        this.results = [];
        this.isProcessing = false;
        this.onProgress = null;
        this.onComplete = null;
        this.onError = null;
    }

    sanitizeErrorMessage(error) {
        const message = error && error.message ? error.message : String(error || 'Batch operation failed');
        return message
            .replace(/https?:\/\/[^\s)]+/gi, '[url redacted]')
            .replace(/(api[_-]?key|token|authorization)(\s*[:=]\s*)([A-Za-z0-9._~+/=-]+)/gi, '$1$2[redacted]')
            .slice(0, 240);
    }

    logSafeWarning(message, error) {
        if (typeof console !== 'undefined' && console.warn) {
            console.warn(`${message}: ${this.sanitizeErrorMessage(error)}`);
        }
    }

    // Add cards to batch queue
    addCards(cardIds) {
        if (!Array.isArray(cardIds)) {
            cardIds = [cardIds];
        }

        cardIds.forEach(cardId => {
            if (!this.queue.find(item => item.cardId === cardId)) {
                this.queue.push({
                    cardId: cardId,
                    status: 'pending',
                    result: null,
                    error: null
                });
            }
        });

        return this.queue.length;
    }

    // Add all cards from a list
    async addCardsFromList(listId) {
        try {
            const cards = await this.trelloIntegration.getListCards(listId);
            const cardIds = cards.map(card => card.id);
            return this.addCards(cardIds);
        } catch (error) {
            this.logSafeWarning('Failed to fetch list cards', error);
            throw error;
        }
    }

    // Add all cards from a board
    async addCardsFromBoard(boardId) {
        try {
            const cards = await this.trelloIntegration.getBoardCards(boardId);
            const cardIds = cards.map(card => card.id);
            return this.addCards(cardIds);
        } catch (error) {
            this.logSafeWarning('Failed to fetch board cards', error);
            throw error;
        }
    }

    // Process batch sequentially
    async processSequential(options = {}) {
        if (this.isProcessing) {
            throw new Error('Batch processing already in progress');
        }

        this.isProcessing = true;
        this.results = [];

        const {
            delayBetween = 1000, // 1 second delay between requests
            stopOnError = false
        } = options;

        try {
            for (let i = 0; i < this.queue.length; i++) {
                const item = this.queue[i];
                
                try {
                    // Update status
                    item.status = 'processing';
                    this.notifyProgress(i + 1, this.queue.length, item.cardId, 'processing');

                    // Fetch card data
                    const cardData = await this.trelloIntegration.getCardData(item.cardId);
                    
                    // Analyze card
                    const result = await this.analyzer.analyze(cardData);
                    
                    // Store result
                    item.status = 'completed';
                    item.result = result;
                    this.results.push({
                        cardId: item.cardId,
                        cardName: cardData.name,
                        result: result
                    });

                    this.notifyProgress(i + 1, this.queue.length, item.cardId, 'completed');

                    // Delay before next request
                    if (i < this.queue.length - 1) {
                        await this.delay(delayBetween);
                    }

                } catch (error) {
                    item.status = 'failed';
                    item.error = error.message;
                    
                    this.notifyProgress(i + 1, this.queue.length, item.cardId, 'failed', error);
                    
                    if (this.onError) {
                        this.onError(item.cardId, error);
                    }

                    if (stopOnError) {
                        throw error;
                    }
                }
            }

            this.isProcessing = false;
            this.notifyComplete();
            return this.results;

        } catch (error) {
            this.isProcessing = false;
            throw error;
        }
    }

    // Process batch in parallel (with concurrency limit)
    async processParallel(options = {}) {
        if (this.isProcessing) {
            throw new Error('Batch processing already in progress');
        }

        this.isProcessing = true;
        this.results = [];

        const {
            concurrency = 3, // Process 3 cards at a time
            stopOnError = false
        } = options;

        try {
            const chunks = this.chunkArray(this.queue, concurrency);
            let processed = 0;

            for (const chunk of chunks) {
                const promises = chunk.map(async (item) => {
                    try {
                        item.status = 'processing';
                        this.notifyProgress(processed + 1, this.queue.length, item.cardId, 'processing');

                        const cardData = await this.trelloIntegration.getCardData(item.cardId);
                        const result = await this.analyzer.analyze(cardData);

                        item.status = 'completed';
                        item.result = result;
                        this.results.push({
                            cardId: item.cardId,
                            cardName: cardData.name,
                            result: result
                        });

                        processed++;
                        this.notifyProgress(processed, this.queue.length, item.cardId, 'completed');

                    } catch (error) {
                        item.status = 'failed';
                        item.error = error.message;
                        
                        processed++;
                        this.notifyProgress(processed, this.queue.length, item.cardId, 'failed', error);
                        
                        if (this.onError) {
                            this.onError(item.cardId, error);
                        }

                        if (stopOnError) {
                            throw error;
                        }
                    }
                });

                await Promise.all(promises);
            }

            this.isProcessing = false;
            this.notifyComplete();
            return this.results;

        } catch (error) {
            this.isProcessing = false;
            throw error;
        }
    }

    // Get batch status
    getStatus() {
        const pending = this.queue.filter(item => item.status === 'pending').length;
        const processing = this.queue.filter(item => item.status === 'processing').length;
        const completed = this.queue.filter(item => item.status === 'completed').length;
        const failed = this.queue.filter(item => item.status === 'failed').length;

        return {
            total: this.queue.length,
            pending,
            processing,
            completed,
            failed,
            isProcessing: this.isProcessing,
            progress: this.queue.length > 0 ? (completed + failed) / this.queue.length : 0
        };
    }

    // Cancel batch processing
    cancel() {
        this.isProcessing = false;
        this.queue.forEach(item => {
            if (item.status === 'pending' || item.status === 'processing') {
                item.status = 'cancelled';
            }
        });
    }

    // Clear queue
    clear() {
        if (this.isProcessing) {
            throw new Error('Cannot clear queue while processing');
        }
        this.queue = [];
        this.results = [];
    }

    // Export results
    exportResults() {
        const data = {
            exportDate: new Date().toISOString(),
            totalCards: this.queue.length,
            completed: this.results.length,
            results: this.results.map(result => ({
                cardId: result.cardId,
                cardName: result.cardName,
                summary: result.result.summary,
                metadata: result.result.metadata
            }))
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `batch-results-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Helper: Delay
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Helper: Chunk array
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    // Notify progress
    notifyProgress(current, total, cardId, status, error = null) {
        if (this.onProgress) {
            this.onProgress({
                current,
                total,
                cardId,
                status,
                error,
                percentage: (current / total) * 100
            });
        }
    }

    // Notify complete
    notifyComplete() {
        if (this.onComplete) {
            this.onComplete({
                total: this.queue.length,
                completed: this.results.length,
                failed: this.queue.filter(item => item.status === 'failed').length,
                results: this.results
            });
        }
    }

    // Create batch UI
    createBatchUI() {
        const container = document.createElement('div');
        container.className = 'batch-processor-container';
        container.innerHTML = `
            <div class="batch-header">
                <h2>📦 Batch Processing</h2>
                <button class="btn-close-batch" onclick="this.closest('.batch-processor-container').remove()">×</button>
            </div>

            <div class="batch-setup">
                <h3>Add Cards to Batch</h3>
                <div class="batch-input-group">
                    <input type="text" id="batchCardIds" placeholder="Enter card IDs (comma-separated)" />
                    <button onclick="window.batchProcessor.addCardsFromInput()">Add Cards</button>
                </div>
                <div class="batch-input-group">
                    <input type="text" id="batchListId" placeholder="Enter list ID" />
                    <button onclick="window.batchProcessor.addCardsFromListInput()">Add List</button>
                </div>
                <div class="batch-input-group">
                    <input type="text" id="batchBoardId" placeholder="Enter board ID" />
                    <button onclick="window.batchProcessor.addCardFromBoardInput()">Add Board</button>
                </div>
            </div>

            <div class="batch-queue">
                <h3>Queue (${this.queue.length} cards)</h3>
                <div class="batch-queue-list" id="batchQueueList">
                    ${this.renderQueue()}
                </div>
            </div>

            <div class="batch-controls">
                <button class="btn-batch-start" onclick="window.batchProcessor.startBatch()">
                    Start Batch Processing
                </button>
                <button class="btn-batch-cancel" onclick="window.batchProcessor.cancel()">
                    Cancel
                </button>
                <button class="btn-batch-clear" onclick="window.batchProcessor.clear()">
                    Clear Queue
                </button>
            </div>

            <div class="batch-progress" id="batchProgress" style="display: none;">
                <div class="progress-bar">
                    <div class="progress-fill" id="batchProgressFill"></div>
                </div>
                <div class="progress-text" id="batchProgressText">0 / 0</div>
            </div>

            <div class="batch-results" id="batchResults" style="display: none;">
                <h3>Results</h3>
                <div class="batch-results-list" id="batchResultsList"></div>
                <button onclick="window.batchProcessor.exportResults()">Export Results</button>
            </div>
        `;

        return container;
    }

    // Render queue
    renderQueue() {
        if (this.queue.length === 0) {
            return '<div class="batch-empty">No cards in queue</div>';
        }

        return this.queue.map(item => `
            <div class="batch-queue-item ${item.status}">
                <span class="batch-card-id">${item.cardId}</span>
                <span class="batch-status">${item.status}</span>
                ${item.status === 'pending' ? 
                    `<button onclick="window.batchProcessor.removeCard('${item.cardId}')">Remove</button>` : 
                    ''}
            </div>
        `).join('');
    }

    // Remove card from queue
    removeCard(cardId) {
        this.queue = this.queue.filter(item => item.cardId !== cardId);
        this.updateUI();
    }

    // Update UI
    updateUI() {
        const queueList = document.getElementById('batchQueueList');
        if (queueList) {
            queueList.innerHTML = this.renderQueue();
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BatchProcessor;
}
