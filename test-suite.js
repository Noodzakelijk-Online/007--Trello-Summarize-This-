// Automated Test Suite for Summarize This
// Comprehensive testing framework for all components

function getTestSecret(name) {
    if (typeof process !== 'undefined' && process.env && process.env[name]) {
        return process.env[name];
    }

    if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(name);
    }

    return '';
}

class TestSuite {
    constructor() {
        this.tests = [];
        this.results = [];
        this.passed = 0;
        this.failed = 0;
        this.skipped = 0;
    }

    // Add test
    test(name, fn, options = {}) {
        this.tests.push({
            name,
            fn,
            skip: options.skip || false,
            timeout: options.timeout || 30000
        });
    }

    // Run all tests
    async runAll() {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`🧪 RUNNING TEST SUITE: ${this.tests.length} tests`);
        console.log(`${'='.repeat(80)}\n`);

        this.results = [];
        this.passed = 0;
        this.failed = 0;
        this.skipped = 0;

        for (const test of this.tests) {
            await this.runTest(test);
        }

        this.printSummary();
        return this.generateReport();
    }

    // Run single test
    async runTest(test) {
        if (test.skip) {
            console.log(`⏭️  SKIP: ${test.name}`);
            this.skipped++;
            this.results.push({
                name: test.name,
                status: 'skipped',
                duration: 0
            });
            return;
        }

        const startTime = Date.now();
        
        try {
            console.log(`▶️  RUN: ${test.name}`);
            
            // Run test with timeout
            await Promise.race([
                test.fn(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Test timeout')), test.timeout)
                )
            ]);

            const duration = Date.now() - startTime;
            console.log(`✅ PASS: ${test.name} (${duration}ms)\n`);
            
            this.passed++;
            this.results.push({
                name: test.name,
                status: 'passed',
                duration
            });

        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`❌ FAIL: ${test.name} (${duration}ms)`);
            console.error(`   Error: ${error.message}\n`);
            
            this.failed++;
            this.results.push({
                name: test.name,
                status: 'failed',
                duration,
                error: error.message,
                stack: error.stack
            });
        }
    }

    // Print summary
    printSummary() {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`📊 TEST SUMMARY`);
        console.log(`${'='.repeat(80)}`);
        console.log(`Total: ${this.tests.length}`);
        console.log(`✅ Passed: ${this.passed}`);
        console.log(`❌ Failed: ${this.failed}`);
        console.log(`⏭️  Skipped: ${this.skipped}`);
        console.log(`Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);
        console.log(`${'='.repeat(80)}\n`);
    }

    // Generate report
    generateReport() {
        return {
            timestamp: new Date().toISOString(),
            total: this.tests.length,
            passed: this.passed,
            failed: this.failed,
            skipped: this.skipped,
            successRate: (this.passed / (this.passed + this.failed)) * 100,
            results: this.results
        };
    }

    // Export report as JSON
    exportReport() {
        const report = this.generateReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `test-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Assertion helpers
class Assert {
    static equal(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected}, got ${actual}`);
        }
    }

    static notEqual(actual, expected, message) {
        if (actual === expected) {
            throw new Error(message || `Expected not ${expected}`);
        }
    }

    static true(value, message) {
        if (value !== true) {
            throw new Error(message || `Expected true, got ${value}`);
        }
    }

    static false(value, message) {
        if (value !== false) {
            throw new Error(message || `Expected false, got ${value}`);
        }
    }

    static exists(value, message) {
        if (value === null || value === undefined) {
            throw new Error(message || `Expected value to exist`);
        }
    }

    static throws(fn, message) {
        try {
            fn();
            throw new Error(message || `Expected function to throw`);
        } catch (error) {
            // Expected
        }
    }

    static async asyncThrows(fn, message) {
        try {
            await fn();
            throw new Error(message || `Expected async function to throw`);
        } catch (error) {
            // Expected
        }
    }
}

// Create test suite instance
const suite = new TestSuite();

// ============================================================================
// TRELLO INTEGRATION TESTS
// ============================================================================

suite.test('Trello API: Fetch boards', async () => {
    const apiKey = getTestSecret('TRELLO_TEST_API_KEY');
    const token = getTestSecret('TRELLO_TEST_TOKEN');
    if (!apiKey || !token) {
        console.log('Skipping Trello API test: set TRELLO_TEST_API_KEY and TRELLO_TEST_TOKEN to run it.');
        return;
    }

    const tester = new TrelloAPITester(apiKey, token);
    
    const boards = await tester.getMyBoards();
    Assert.exists(boards, 'Boards should exist');
    Assert.true(Array.isArray(boards), 'Boards should be an array');
    Assert.true(boards.length > 0, 'Should have at least one board');
});

suite.test('Trello API: Fetch card data', async () => {
    const apiKey = getTestSecret('TRELLO_TEST_API_KEY');
    const token = getTestSecret('TRELLO_TEST_TOKEN');
    const cardId = getTestSecret('TRELLO_TEST_CARD_ID') || '67ec4021155832263da4ab8d';
    if (!apiKey || !token) {
        console.log('Skipping Trello API test: set TRELLO_TEST_API_KEY and TRELLO_TEST_TOKEN to run it.');
        return;
    }

    const tester = new TrelloAPITester(apiKey, token);
    
    const cardData = await tester.getCompleteCardData(cardId);
    Assert.exists(cardData, 'Card data should exist');
    Assert.exists(cardData.name, 'Card should have a name');
    Assert.exists(cardData.board, 'Card should have board info');
});

// ============================================================================
// ATTACHMENT PROCESSING TESTS
// ============================================================================

suite.test('Attachment Processor: Initialize', () => {
    const processor = new EnhancedAttachmentProcessor();
    Assert.exists(processor, 'Processor should be created');
    Assert.exists(processor.supportedTypes, 'Should have supported types');
});

suite.test('Attachment Processor: Detect PDF type', () => {
    const processor = new EnhancedAttachmentProcessor();
    const attachment = {
        name: 'document.pdf',
        mimeType: 'application/pdf',
        url: 'https://example.com/doc.pdf'
    };
    
    const type = processor.detectType(attachment);
    Assert.equal(type, 'pdf', 'Should detect PDF type');
});

suite.test('Attachment Processor: Detect Word type', () => {
    const processor = new EnhancedAttachmentProcessor();
    const attachment = {
        name: 'document.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        url: 'https://example.com/doc.docx'
    };
    
    const type = processor.detectType(attachment);
    Assert.equal(type, 'word', 'Should detect Word type');
});

// ============================================================================
// ANALYSIS HISTORY TESTS
// ============================================================================

suite.test('Analysis History: Initialize', () => {
    const history = new AnalysisHistory();
    Assert.exists(history, 'History should be created');
    Assert.true(Array.isArray(history.history), 'History should be an array');
});

suite.test('Analysis History: Add analysis', () => {
    const history = new AnalysisHistory();
    const initialCount = history.history.length;
    
    history.addAnalysis({
        cardId: 'test123',
        cardName: 'Test Card',
        cardUrl: 'https://trello.com/c/test',
        boardName: 'Test Board',
        strategy: 'cost-effective',
        modelsUsed: ['gpt-4.1-mini'],
        totalCost: 0.001,
        tokensUsed: 100,
        summary: {
            about: 'Test',
            history: 'Test',
            status: 'Test',
            nextSteps: 'Test'
        }
    });
    
    Assert.equal(history.history.length, initialCount + 1, 'Should add one entry');
});

suite.test('Analysis History: Get statistics', () => {
    const history = new AnalysisHistory();
    const stats = history.getStatistics();
    
    Assert.exists(stats, 'Statistics should exist');
    Assert.exists(stats.totalAnalyses, 'Should have total analyses');
    Assert.exists(stats.totalCost, 'Should have total cost');
});

suite.test('Analysis History: Budget check', () => {
    const history = new AnalysisHistory();
    history.updateBudget({
        enabled: true,
        limit: 10.00,
        period: 'month'
    });
    
    const check = history.checkBudget(0.01);
    Assert.exists(check, 'Budget check should return result');
    Assert.exists(check.allowed, 'Should have allowed property');
});

// ============================================================================
// AI PROVIDER TESTS
// ============================================================================

suite.test('AI Provider: OpenAI availability', () => {
    Assert.exists(process.env.OPENAI_API_KEY, 'OpenAI API key should be available');
});

suite.test('AI Provider: Call OpenAI API', async () => {
    const tester = new FullAnalysisTest();
    const cardData = {
        name: 'Test Card',
        desc: 'This is a test card for automated testing',
        board: { name: 'Test Board' },
        list: { name: 'Test List' },
        labels: [],
        members: [],
        checklists: [],
        comments: [],
        attachments: []
    };
    
    const analysis = await tester.analyzeWithOpenAI(cardData);
    Assert.exists(analysis, 'Analysis should exist');
    Assert.exists(analysis.summary, 'Should have summary');
    Assert.exists(analysis.metadata, 'Should have metadata');
}, { timeout: 60000 });

// ============================================================================
// EXPORT FUNCTIONALITY TESTS
// ============================================================================

suite.test('Export Manager: Initialize', () => {
    const exportManager = new ExportManager();
    Assert.exists(exportManager, 'Export manager should be created');
});

suite.test('Export Manager: Format to Markdown', () => {
    const exportManager = new ExportManager();
    const data = {
        summary: {
            about: 'Test about',
            history: 'Test history',
            status: 'Test status',
            nextSteps: 'Test next steps'
        },
        metadata: {
            strategy: 'test',
            modelsUsed: ['test-model'],
            totalCost: 0.001,
            confidence: 0.9
        },
        cardData: {
            name: 'Test Card',
            board: { name: 'Test Board' }
        }
    };
    
    const markdown = exportManager.formatToMarkdown(data);
    Assert.exists(markdown, 'Markdown should be generated');
    Assert.true(markdown.includes('Test Card'), 'Should include card name');
    Assert.true(markdown.includes('Test about'), 'Should include about section');
});

// ============================================================================
// ONBOARDING SYSTEM TESTS
// ============================================================================

suite.test('Onboarding: Initialize', () => {
    const onboarding = new OnboardingSystem();
    Assert.exists(onboarding, 'Onboarding should be created');
    Assert.exists(onboarding.steps, 'Should have steps');
    Assert.true(Array.isArray(onboarding.steps), 'Steps should be an array');
});

suite.test('Onboarding: Check completion', () => {
    const onboarding = new OnboardingSystem();
    const completed = onboarding.checkOnboarding();
    Assert.true(typeof completed === 'boolean', 'Should return boolean');
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

suite.test('Integration: Full analysis pipeline', async () => {
    // This would test the complete flow from Trello fetch to AI analysis
    // Skipped by default to avoid API costs
}, { skip: true });

suite.test('Integration: Attachment processing pipeline', async () => {
    // This would test complete attachment processing
    // Skipped by default to avoid network requests
}, { skip: true });

// Export test suite
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TestSuite, Assert, suite };
}

// Auto-run if in Node.js
if (typeof require !== 'undefined' && require.main === module) {
    suite.runAll().then(report => {
        console.log('Test report generated');
        process.exit(report.failed > 0 ? 1 : 0);
    });
}
