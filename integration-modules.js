// Phase 4: Integration & Automation Modules
// External tool integration, natural language queries, automated actions, and scheduling

// Module 1: External Tool Integration
class ExternalIntegrations {
    constructor(credentials) {
        this.github = credentials.github;
        this.slack = credentials.slack;
        this.jira = credentials.jira;
    }

    sanitizeErrorMessage(error) {
        const message = error && error.message ? error.message : String(error || 'External integration failed');
        return message
            .replace(/https?:\/\/[^\s)]+/gi, '[url redacted]')
            .replace(/(api[_-]?key|token|authorization)(\s*[:=]\s*)([A-Za-z0-9._~+/=-]+)/gi, '$1$2[redacted]')
            .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
            .slice(0, 240);
    }

    logSafeWarning(message, error) {
        if (typeof console !== 'undefined' && console.warn) {
            console.warn(`${message}: ${this.sanitizeErrorMessage(error)}`);
        }
    }
    
    async enrichCardData(card) {
        const enrichedData = {
            original: card,
            github: null,
            slack: null,
            jira: null
        };
        
        // Check for GitHub references
        if (this.github && this.hasGitHubReferences(card)) {
            enrichedData.github = await this.fetchGitHubData(card);
        }
        
        // Check for Slack references
        if (this.slack && this.hasSlackReferences(card)) {
            enrichedData.slack = await this.fetchSlackData(card);
        }
        
        // Check for Jira references
        if (this.jira && this.hasJiraReferences(card)) {
            enrichedData.jira = await this.fetchJiraData(card);
        }
        
        return enrichedData;
    }
    
    hasGitHubReferences(card) {
        const text = `${card.name} ${card.desc || ''}`;
        return text.includes('github.com') || text.includes('PR #') || text.includes('Issue #');
    }
    
    async fetchGitHubData(card) {
        try {
            const text = `${card.name} ${card.desc || ''}`;
            
            // Extract GitHub URLs
            const urlPattern = /github\.com\/([^\/]+)\/([^\/]+)\/(pull|issues)\/(\d+)/g;
            const matches = [...text.matchAll(urlPattern)];
            
            if (matches.length === 0) return null;
            
            const data = [];
            
            for (const match of matches) {
                const [_, owner, repo, type, number] = match;
                
                const endpoint = type === 'pull' 
                    ? `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`
                    : `https://api.github.com/repos/${owner}/${repo}/issues/${number}`;
                
                const response = await fetch(endpoint, {
                    headers: {
                        'Authorization': `token ${this.github.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (response.ok) {
                    const item = await response.json();
                    data.push({
                        type,
                        number,
                        title: item.title,
                        state: item.state,
                        url: item.html_url,
                        created: item.created_at,
                        updated: item.updated_at,
                        merged: item.merged_at || null,
                        author: item.user.login
                    });
                }
            }
            
            return {
                hasData: data.length > 0,
                items: data,
                summary: this.generateGitHubSummary(data)
            };
        } catch (error) {
            this.logSafeWarning('GitHub fetch error', error);
            return null;
        }
    }
    
    generateGitHubSummary(data) {
        const prs = data.filter(item => item.type === 'pull');
        const issues = data.filter(item => item.type === 'issues');
        
        const openPRs = prs.filter(pr => pr.state === 'open').length;
        const mergedPRs = prs.filter(pr => pr.merged).length;
        const openIssues = issues.filter(issue => issue.state === 'open').length;
        
        const summary = [];
        
        if (prs.length > 0) {
            summary.push(`${prs.length} PR(s): ${openPRs} open, ${mergedPRs} merged`);
        }
        
        if (issues.length > 0) {
            summary.push(`${issues.length} issue(s): ${openIssues} open`);
        }
        
        return summary.join('; ');
    }
    
    hasSlackReferences(card) {
        const text = `${card.name} ${card.desc || ''}`;
        return text.includes('slack.com') || text.includes('#channel');
    }
    
    async fetchSlackData(card) {
        // Placeholder for Slack integration
        // In production, would fetch channel discussions, mentions, etc.
        return {
            hasData: false,
            message: 'Slack integration ready for implementation'
        };
    }
    
    hasJiraReferences(card) {
        const text = `${card.name} ${card.desc || ''}`;
        return text.match(/[A-Z]+-\d+/); // JIRA ticket pattern
    }
    
    async fetchJiraData(card) {
        // Placeholder for Jira integration
        // In production, would fetch ticket status, sprint info, etc.
        return {
            hasData: false,
            message: 'Jira integration ready for implementation'
        };
    }
}

// Module 2: Natural Language Query Engine
class NaturalLanguageQueryEngine {
    constructor(aiFunction) {
        this.aiFunction = aiFunction;
        this.queryHistory = [];
    }
    
    async askQuestion(question, cardData, analysisData) {
        // Build context for the AI
        const context = this.buildContext(cardData, analysisData);
        
        // Create prompt for answering the question
        const prompt = `
You are an AI assistant helping users understand their Trello card.

CARD CONTEXT:
${JSON.stringify(context, null, 2)}

PREVIOUS ANALYSIS:
${JSON.stringify(analysisData, null, 2)}

USER QUESTION:
"${question}"

Provide a clear, specific answer based on the card data and analysis.
If the question cannot be answered with available data, explain what information is missing.

Return your answer as JSON:
{
    "answer": "Your detailed answer here",
    "confidence": "high/medium/low",
    "dataUsed": ["source 1", "source 2"],
    "suggestions": ["related question 1", "related question 2"]
}`;
        
        const response = await this.aiFunction(prompt);
        
        // Record query
        this.queryHistory.push({
            question,
            answer: response.answer,
            timestamp: new Date().toISOString()
        });
        
        return response;
    }
    
    buildContext(cardData, analysisData) {
        return {
            title: cardData.card.name,
            description: cardData.card.desc,
            list: cardData.card.list?.name,
            labels: cardData.card.labels?.map(l => l.name),
            members: cardData.card.members?.map(m => m.fullName),
            dueDate: cardData.card.due,
            progress: cardData.checklistProgress,
            commentsCount: cardData.comments?.length || 0,
            attachmentsCount: cardData.card.attachments?.length || 0,
            urgency: analysisData.urgency,
            sentiment: analysisData.sentiment,
            boardType: analysisData.boardType
        };
    }
    
    getSuggestedQuestions(cardData, analysisData) {
        const suggestions = [];
        
        // Based on card state
        if (cardData.card.due) {
            suggestions.push("When will this likely be completed?");
            suggestions.push("What are the risks of missing the deadline?");
        }
        
        if (cardData.checklistProgress && cardData.checklistProgress.percentage < 50) {
            suggestions.push("What's blocking progress?");
            suggestions.push("What should be prioritized next?");
        }
        
        if (cardData.comments && cardData.comments.length > 5) {
            suggestions.push("What are the main discussion points?");
            suggestions.push("Are there any unresolved concerns?");
        }
        
        if (analysisData.risks && analysisData.risks.length > 0) {
            suggestions.push("How can we mitigate the identified risks?");
            suggestions.push("Which risk is most critical?");
        }
        
        // General questions
        suggestions.push("How does this compare to similar cards?");
        suggestions.push("Who should work on this next?");
        suggestions.push("What's the estimated effort required?");
        
        return suggestions.slice(0, 6);
    }
}

// Module 3: Automated Action Suggester
class AutomatedActionSuggester {
    constructor(trelloClient) {
        this.trello = trelloClient;
    }
    
    async generateActions(card, analysisData) {
        const actions = [];
        
        // Based on urgency
        if (analysisData.urgency.level === 'critical' || analysisData.urgency.level === 'high') {
            if (!card.members || card.members.length === 0) {
                actions.push({
                    type: 'assign',
                    title: 'Assign Team Member',
                    description: 'High urgency card needs an owner',
                    action: () => this.suggestAssignment(card, analysisData),
                    priority: 'high'
                });
            }
            
            if (!card.due) {
                actions.push({
                    type: 'set_due_date',
                    title: 'Set Due Date',
                    description: 'Urgent card should have a deadline',
                    suggestedDate: this.suggestDueDate(card, analysisData),
                    priority: 'high'
                });
            }
        }
        
        // Based on progress
        if (card.checklistProgress && card.checklistProgress.percentage === 0) {
            actions.push({
                type: 'start_work',
                title: 'Start Working',
                description: 'No progress yet - move to "In Progress"',
                suggestedList: 'In Progress',
                priority: 'medium'
            });
        }
        
        // Based on completion
        if (card.checklistProgress && card.checklistProgress.percentage === 100) {
            actions.push({
                type: 'mark_complete',
                title: 'Mark as Complete',
                description: 'All checklist items done - move to "Done"',
                suggestedList: 'Done',
                priority: 'high'
            });
        }
        
        // Based on blockers
        if (analysisData.risks && analysisData.risks.some(r => r.toLowerCase().includes('blocked'))) {
            actions.push({
                type: 'add_label',
                title: 'Add "Blocked" Label',
                description: 'Mark card as blocked for visibility',
                suggestedLabel: 'Blocked',
                priority: 'high'
            });
        }
        
        // Based on sentiment
        if (analysisData.sentiment.overall === 'negative') {
            actions.push({
                type: 'schedule_meeting',
                title: 'Schedule Team Sync',
                description: 'Negative sentiment detected - team discussion needed',
                priority: 'medium'
            });
        }
        
        // Based on recommendations
        if (analysisData.recommendations) {
            analysisData.recommendations.forEach(rec => {
                if (rec.toLowerCase().includes('add') || rec.toLowerCase().includes('create')) {
                    actions.push({
                        type: 'follow_recommendation',
                        title: 'Follow AI Recommendation',
                        description: rec,
                        priority: 'medium'
                    });
                }
            });
        }
        
        return actions.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }
    
    suggestAssignment(card, analysisData) {
        // Logic to suggest best team member based on:
        // - Current workload
        // - Skills/labels
        // - Past performance on similar cards
        return {
            suggestions: [
                { member: 'Available team member', reason: 'Low current workload' },
                { member: 'Expert in this area', reason: 'Relevant experience' }
            ]
        };
    }
    
    suggestDueDate(card, analysisData) {
        const now = new Date();
        
        // Based on urgency
        if (analysisData.urgency.level === 'critical') {
            now.setDate(now.getDate() + 1); // Tomorrow
        } else if (analysisData.urgency.level === 'high') {
            now.setDate(now.getDate() + 3); // 3 days
        } else if (analysisData.urgency.level === 'medium') {
            now.setDate(now.getDate() + 7); // 1 week
        } else {
            now.setDate(now.getDate() + 14); // 2 weeks
        }
        
        return now;
    }
    
    async executeAction(action, card) {
        // Execute the suggested action via Trello API
        try {
            switch (action.type) {
                case 'assign':
                    return await this.trello.assignMember(card.id, action.memberId);
                    
                case 'set_due_date':
                    return await this.trello.setDueDate(card.id, action.suggestedDate);
                    
                case 'add_label':
                    return await this.trello.addLabel(card.id, action.suggestedLabel);
                    
                case 'move_card':
                    return await this.trello.moveCard(card.id, action.suggestedList);
                    
                default:
                    return { success: false, message: 'Action type not implemented' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Module 4: Scheduled Analysis Engine
class ScheduledAnalysisEngine {
    constructor(trelloClient, aiFunction) {
        this.trello = trelloClient;
        this.aiFunction = aiFunction;
        this.schedules = [];
    }

    sanitizeErrorMessage(error) {
        const message = error && error.message ? error.message : String(error || 'Scheduled analysis failed');
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
    
    async createSchedule(boardId, config) {
        const schedule = {
            id: Date.now(),
            boardId,
            frequency: config.frequency, // 'daily', 'weekly', 'monthly'
            time: config.time, // '09:00'
            filters: config.filters || {}, // { list: 'In Progress', labels: ['urgent'] }
            notifications: config.notifications || [], // ['email', 'slack']
            enabled: true,
            created: new Date().toISOString()
        };
        
        this.schedules.push(schedule);
        
        // Store in localStorage
        localStorage.setItem('summarizeThis_schedules', JSON.stringify(this.schedules));
        
        return schedule;
    }
    
    async runScheduledAnalysis(schedule) {
        try {
            // Fetch cards based on filters
            const cards = await this.fetchFilteredCards(schedule.boardId, schedule.filters);
            
            // Analyze each card
            const analyses = [];
            for (const card of cards) {
                const analysis = await this.analyzeCard(card);
                analyses.push({ card, analysis });
            }
            
            // Generate report
            const report = this.generateReport(analyses, schedule);
            
            // Send notifications
            if (schedule.notifications.includes('email')) {
                await this.sendEmailReport(report);
            }
            
            if (schedule.notifications.includes('slack')) {
                await this.sendSlackReport(report);
            }
            
            return {
                success: true,
                cardsAnalyzed: cards.length,
                report
            };
        } catch (error) {
            this.logSafeWarning('Scheduled analysis error', error);
            return {
                success: false,
                error: this.sanitizeErrorMessage(error)
            };
        }
    }
    
    async fetchFilteredCards(boardId, filters) {
        let cards = await this.trello.getCards(boardId);
        
        // Apply filters
        if (filters.list) {
            cards = cards.filter(c => c.list?.name === filters.list);
        }
        
        if (filters.labels && filters.labels.length > 0) {
            cards = cards.filter(c => 
                c.labels && c.labels.some(l => filters.labels.includes(l.name))
            );
        }
        
        if (filters.members && filters.members.length > 0) {
            cards = cards.filter(c =>
                c.members && c.members.some(m => filters.members.includes(m.id))
            );
        }
        
        if (filters.overdue) {
            const now = new Date();
            cards = cards.filter(c => c.due && new Date(c.due) < now);
        }
        
        return cards;
    }
    
    async analyzeCard(card) {
        // Run full analysis on the card
        // (This would use the main analysis pipeline)
        return {
            cardId: card.id,
            cardName: card.name,
            urgency: 'medium',
            status: 'In progress',
            insights: ['Sample insight']
        };
    }
    
    generateReport(analyses, schedule) {
        const summary = {
            date: new Date().toISOString(),
            boardId: schedule.boardId,
            totalCards: analyses.length,
            criticalCards: analyses.filter(a => a.analysis.urgency === 'critical').length,
            highUrgency: analyses.filter(a => a.analysis.urgency === 'high').length,
            overdueCards: analyses.filter(a => a.card.due && new Date(a.card.due) < new Date()).length,
            topInsights: this.extractTopInsights(analyses),
            recommendations: this.generateRecommendations(analyses)
        };
        
        return {
            summary,
            details: analyses,
            generated: new Date().toISOString()
        };
    }
    
    extractTopInsights(analyses) {
        // Extract most important insights across all cards
        const allInsights = [];
        
        analyses.forEach(a => {
            if (a.analysis.insights) {
                allInsights.push(...a.analysis.insights);
            }
        });
        
        // Return top 5 unique insights
        return [...new Set(allInsights)].slice(0, 5);
    }
    
    generateRecommendations(analyses) {
        const recommendations = [];
        
        const criticalCount = analyses.filter(a => a.analysis.urgency === 'critical').length;
        if (criticalCount > 0) {
            recommendations.push(`${criticalCount} cards need immediate attention`);
        }
        
        const overdueCount = analyses.filter(a => a.card.due && new Date(a.card.due) < new Date()).length;
        if (overdueCount > 0) {
            recommendations.push(`${overdueCount} cards are overdue - review deadlines`);
        }
        
        return recommendations;
    }
    
    async sendEmailReport(report) {
        // Placeholder for email sending
        if (typeof console !== 'undefined' && console.info) {
            console.info(`Email report placeholder prepared for ${report && report.summary ? report.summary.totalCards : 0} card(s).`);
        }
        return { sent: true };
    }
    
    async sendSlackReport(report) {
        // Placeholder for Slack notification
        if (typeof console !== 'undefined' && console.info) {
            console.info(`Slack report placeholder prepared for ${report && report.summary ? report.summary.totalCards : 0} card(s).`);
        }
        return { sent: true };
    }
}

// Export modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ExternalIntegrations,
        NaturalLanguageQueryEngine,
        AutomatedActionSuggester,
        ScheduledAnalysisEngine
    };
}
