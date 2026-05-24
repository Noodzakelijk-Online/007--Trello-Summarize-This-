// Phase 2: Deep Analysis Modules
// Advanced features for attachment processing, pattern recognition, and iterative refinement

// Module 1: Attachment Content Analysis
class AttachmentAnalyzer {
    constructor(trelloApiKey, trelloToken) {
        this.apiKey = trelloApiKey;
        this.token = trelloToken;
    }
    
    async analyzeAttachments(card) {
        if (!card.attachments || card.attachments.length === 0) {
            return { hasAttachments: false, analysis: [] };
        }
        
        const analysis = [];
        
        for (const attachment of card.attachments) {
            try {
                const result = await this.analyzeAttachment(attachment);
                analysis.push(result);
            } catch (error) {
                console.error(`Error analyzing attachment ${attachment.name}:`, error);
                analysis.push({
                    name: attachment.name,
                    type: this.detectFileType(attachment.name),
                    error: error.message,
                    analyzed: false
                });
            }
        }
        
        return {
            hasAttachments: true,
            count: card.attachments.length,
            analysis
        };
    }
    
    async analyzeAttachment(attachment) {
        const fileType = this.detectFileType(attachment.name);
        
        const result = {
            name: attachment.name,
            type: fileType,
            url: attachment.url,
            size: attachment.bytes,
            analyzed: false,
            content: null
        };
        
        // For now, we'll extract metadata and prepare for content extraction
        // In production, you would integrate PDF.js, mammoth.js, xlsx.js, Tesseract.js
        
        if (fileType === 'pdf') {
            result.extractionMethod = 'PDF.js';
            result.note = 'PDF text extraction ready (requires PDF.js integration)';
        } else if (fileType === 'word') {
            result.extractionMethod = 'mammoth.js';
            result.note = 'Word document extraction ready (requires mammoth.js integration)';
        } else if (fileType === 'excel') {
            result.extractionMethod = 'xlsx.js';
            result.note = 'Excel data extraction ready (requires xlsx.js integration)';
        } else if (fileType === 'image') {
            result.extractionMethod = 'Tesseract.js';
            result.note = 'Image OCR ready (requires Tesseract.js integration)';
        } else if (fileType === 'text') {
            // For text files, we can fetch directly
            try {
                const response = await this.safeFetchAttachment(attachment.url);
                const text = await response.text();
                result.content = text;
                result.analyzed = true;
            } catch (error) {
                result.note = 'Could not fetch text content';
            }
        }
        
        return result;
    }

    async safeFetchAttachment(url, options = {}) {
        const parsed = this.validateAttachmentUrl(url);
        return fetch(parsed.href, {
            ...options,
            credentials: 'omit',
            referrerPolicy: 'no-referrer'
        });
    }

    validateAttachmentUrl(url) {
        const parsed = new URL(url);
        const hostname = parsed.hostname.toLowerCase();
        const isPrivateHost = (
            hostname === 'localhost' ||
            hostname.endsWith('.localhost') ||
            hostname.endsWith('.local') ||
            hostname === '127.0.0.1' ||
            hostname === '0.0.0.0' ||
            hostname === '[::1]' ||
            hostname === '::1' ||
            hostname.startsWith('10.') ||
            hostname.startsWith('192.168.') ||
            /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
            hostname.startsWith('169.254.')
        );

        if (parsed.protocol !== 'https:' || isPrivateHost) {
            throw new Error('Attachment URL must be HTTPS and publicly reachable');
        }

        return parsed;
    }
    
    detectFileType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        
        const typeMap = {
            'pdf': 'pdf',
            'doc': 'word',
            'docx': 'word',
            'xls': 'excel',
            'xlsx': 'excel',
            'csv': 'csv',
            'txt': 'text',
            'md': 'text',
            'jpg': 'image',
            'jpeg': 'image',
            'png': 'image',
            'gif': 'image',
            'bmp': 'image'
        };
        
        return typeMap[ext] || 'unknown';
    }
}

// Module 2: Pattern Recognition Across Cards
class PatternRecognizer {
    constructor() {
        this.patterns = {
            blockers: [],
            commonLabels: [],
            assignmentPatterns: [],
            timePatterns: [],
            riskPatterns: []
        };
    }
    
    async analyzePatterns(cards) {
        if (!cards || cards.length < 2) {
            return { hasPatterns: false, message: 'Need multiple cards for pattern analysis' };
        }
        
        // Analyze common blockers
        const blockers = this.findCommonBlockers(cards);
        
        // Analyze label patterns
        const labelPatterns = this.analyzeLabelPatterns(cards);
        
        // Analyze assignment patterns
        const assignmentPatterns = this.analyzeAssignmentPatterns(cards);
        
        // Analyze time patterns
        const timePatterns = this.analyzeTimePatterns(cards);
        
        // Analyze risk patterns
        const riskPatterns = this.analyzeRiskPatterns(cards);
        
        return {
            hasPatterns: true,
            blockers,
            labelPatterns,
            assignmentPatterns,
            timePatterns,
            riskPatterns,
            summary: this.generatePatternSummary({
                blockers,
                labelPatterns,
                assignmentPatterns,
                timePatterns,
                riskPatterns
            })
        };
    }
    
    findCommonBlockers(cards) {
        const blockerKeywords = ['blocked', 'waiting', 'stuck', 'issue', 'problem', 'dependency'];
        const blockerCounts = {};
        
        cards.forEach(card => {
            const text = `${card.name} ${card.desc || ''}`.toLowerCase();
            blockerKeywords.forEach(keyword => {
                if (text.includes(keyword)) {
                    blockerCounts[keyword] = (blockerCounts[keyword] || 0) + 1;
                }
            });
        });
        
        return Object.entries(blockerCounts)
            .filter(([_, count]) => count >= 2)
            .map(([keyword, count]) => ({
                type: keyword,
                frequency: count,
                percentage: Math.round((count / cards.length) * 100)
            }))
            .sort((a, b) => b.frequency - a.frequency);
    }
    
    analyzeLabelPatterns(cards) {
        const labelCounts = {};
        
        cards.forEach(card => {
            if (card.labels) {
                card.labels.forEach(label => {
                    const name = label.name || label.color;
                    labelCounts[name] = (labelCounts[name] || 0) + 1;
                });
            }
        });
        
        return Object.entries(labelCounts)
            .map(([label, count]) => ({
                label,
                count,
                percentage: Math.round((count / cards.length) * 100)
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }
    
    analyzeAssignmentPatterns(cards) {
        const memberCounts = {};
        let unassignedCount = 0;
        let multiAssignedCount = 0;
        
        cards.forEach(card => {
            if (!card.members || card.members.length === 0) {
                unassignedCount++;
            } else if (card.members.length > 1) {
                multiAssignedCount++;
                card.members.forEach(member => {
                    const name = member.fullName || member.username;
                    memberCounts[name] = (memberCounts[name] || 0) + 1;
                });
            } else {
                const name = card.members[0].fullName || card.members[0].username;
                memberCounts[name] = (memberCounts[name] || 0) + 1;
            }
        });
        
        return {
            unassignedPercentage: Math.round((unassignedCount / cards.length) * 100),
            multiAssignedPercentage: Math.round((multiAssignedCount / cards.length) * 100),
            topAssignees: Object.entries(memberCounts)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
        };
    }
    
    analyzeTimePatterns(cards) {
        let overdueCount = 0;
        let dueSoonCount = 0;
        let noDueDateCount = 0;
        
        const now = new Date();
        
        cards.forEach(card => {
            if (!card.due) {
                noDueDateCount++;
            } else {
                const dueDate = new Date(card.due);
                const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
                
                if (daysUntilDue < 0) {
                    overdueCount++;
                } else if (daysUntilDue <= 7) {
                    dueSoonCount++;
                }
            }
        });
        
        return {
            overduePercentage: Math.round((overdueCount / cards.length) * 100),
            dueSoonPercentage: Math.round((dueSoonCount / cards.length) * 100),
            noDueDatePercentage: Math.round((noDueDateCount / cards.length) * 100),
            overdueCount,
            dueSoonCount
        };
    }
    
    analyzeRiskPatterns(cards) {
        const risks = {
            highRiskCount: 0,
            lowProgressCount: 0,
            highActivityCount: 0,
            staleCount: 0
        };
        
        cards.forEach(card => {
            // High risk: overdue + low progress
            if (card.due && new Date(card.due) < new Date() && 
                card.checklistProgress && card.checklistProgress.percentage < 50) {
                risks.highRiskCount++;
            }
            
            // Low progress: has checklist but < 25% complete
            if (card.checklistProgress && card.checklistProgress.percentage < 25) {
                risks.lowProgressCount++;
            }
            
            // High activity: many comments
            if (card.comments && card.comments.length > 10) {
                risks.highActivityCount++;
            }
            
            // Stale: no activity in 30 days
            if (card.dateLastActivity) {
                const daysSinceActivity = Math.ceil((new Date() - new Date(card.dateLastActivity)) / (1000 * 60 * 60 * 24));
                if (daysSinceActivity > 30) {
                    risks.staleCount++;
                }
            }
        });
        
        return {
            highRiskPercentage: Math.round((risks.highRiskCount / cards.length) * 100),
            lowProgressPercentage: Math.round((risks.lowProgressCount / cards.length) * 100),
            stalePercentage: Math.round((risks.staleCount / cards.length) * 100),
            ...risks
        };
    }
    
    generatePatternSummary(patterns) {
        const insights = [];
        
        if (patterns.blockers.length > 0) {
            const topBlocker = patterns.blockers[0];
            insights.push(`${topBlocker.percentage}% of cards mention "${topBlocker.type}" - this is a recurring blocker`);
        }
        
        if (patterns.assignmentPatterns.unassignedPercentage > 30) {
            insights.push(`${patterns.assignmentPatterns.unassignedPercentage}% of cards are unassigned - consider assigning owners`);
        }
        
        if (patterns.timePatterns.overduePercentage > 20) {
            insights.push(`${patterns.timePatterns.overduePercentage}% of cards are overdue - deadline management needs attention`);
        }
        
        if (patterns.riskPatterns.stalePercentage > 25) {
            insights.push(`${patterns.riskPatterns.stalePercentage}% of cards are stale (no activity in 30+ days) - review and archive`);
        }
        
        return insights;
    }
}

// Module 3: Iterative Refinement
class IterativeRefiner {
    async refineAnalysis(initialAnalysis, cardData, aiFunction) {
        // Step 1: Generate initial analysis (already done)
        
        // Step 2: Self-critique
        const critiquePrompt = `
Review this card analysis and identify weaknesses, gaps, or areas for improvement:

ANALYSIS:
${JSON.stringify(initialAnalysis, null, 2)}

CARD DATA:
${JSON.stringify(cardData, null, 2)}

Provide a critique in JSON format:
{
    "strengths": ["strength 1", "strength 2"],
    "weaknesses": ["weakness 1", "weakness 2"],
    "gaps": ["missing insight 1", "missing insight 2"],
    "improvements": ["suggestion 1", "suggestion 2"]
}`;
        
        const critique = await aiFunction(critiquePrompt);
        
        // Step 3: Improve based on critique
        const improvementPrompt = `
Based on this critique, improve the original analysis:

ORIGINAL ANALYSIS:
${JSON.stringify(initialAnalysis, null, 2)}

CRITIQUE:
${JSON.stringify(critique, null, 2)}

CARD DATA:
${JSON.stringify(cardData, null, 2)}

Provide an improved analysis that addresses the weaknesses and gaps identified.
Return the same JSON structure as the original analysis, but with improvements.`;
        
        const improvedAnalysis = await aiFunction(improvementPrompt);
        
        return {
            original: initialAnalysis,
            critique,
            improved: improvedAnalysis,
            refinementApplied: true
        };
    }
}

// Module 4: Visual Analytics Generator
class VisualAnalytics {
    generateChartData(cardData, patterns) {
        return {
            progressChart: this.generateProgressChart(cardData),
            urgencyDistribution: this.generateUrgencyChart(cardData),
            sentimentTrend: this.generateSentimentChart(cardData),
            patternInsights: this.generatePatternCharts(patterns)
        };
    }
    
    generateProgressChart(cardData) {
        if (!cardData.checklistProgress) {
            return null;
        }
        
        return {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'Remaining'],
                datasets: [{
                    data: [
                        cardData.checklistProgress.completed,
                        cardData.checklistProgress.total - cardData.checklistProgress.completed
                    ],
                    backgroundColor: ['#4caf50', '#e0e0e0']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Task Completion'
                    }
                }
            }
        };
    }
    
    generateUrgencyChart(cardData) {
        // Generate urgency timeline
        return {
            type: 'bar',
            data: {
                labels: ['Urgency Score'],
                datasets: [{
                    label: 'Current Card',
                    data: [cardData.urgency.score],
                    backgroundColor: this.getUrgencyColor(cardData.urgency.level)
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        };
    }
    
    generateSentimentChart(cardData) {
        return {
            type: 'line',
            data: {
                labels: ['Sentiment Score'],
                datasets: [{
                    label: 'Team Sentiment',
                    data: [cardData.sentiment.score],
                    borderColor: this.getSentimentColor(cardData.sentiment.overall),
                    fill: false
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        min: -100,
                        max: 100
                    }
                }
            }
        };
    }
    
    generatePatternCharts(patterns) {
        if (!patterns || !patterns.hasPatterns) {
            return null;
        }
        
        return {
            blockers: {
                type: 'bar',
                data: {
                    labels: patterns.blockers.map(b => b.type),
                    datasets: [{
                        label: 'Blocker Frequency',
                        data: patterns.blockers.map(b => b.frequency),
                        backgroundColor: '#f44336'
                    }]
                }
            },
            timeDistribution: {
                type: 'pie',
                data: {
                    labels: ['Overdue', 'Due Soon', 'No Due Date'],
                    datasets: [{
                        data: [
                            patterns.timePatterns.overduePercentage,
                            patterns.timePatterns.dueSoonPercentage,
                            patterns.timePatterns.noDueDatePercentage
                        ],
                        backgroundColor: ['#f44336', '#ff9800', '#9e9e9e']
                    }]
                }
            }
        };
    }
    
    getUrgencyColor(level) {
        const colors = {
            'critical': '#f44336',
            'high': '#ff9800',
            'medium': '#ffc107',
            'low': '#4caf50'
        };
        return colors[level] || '#9e9e9e';
    }
    
    getSentimentColor(sentiment) {
        const colors = {
            'positive': '#4caf50',
            'neutral': '#9e9e9e',
            'negative': '#f44336'
        };
        return colors[sentiment] || '#9e9e9e';
    }
}

// Export modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AttachmentAnalyzer,
        PatternRecognizer,
        IterativeRefiner,
        VisualAnalytics
    };
}
