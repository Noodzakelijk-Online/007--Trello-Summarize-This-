// Phase 3: Advanced Intelligence Modules
// Multi-model consensus, predictive analytics, historical trends, dependency graphs, and learning

// Module 1: Multi-Model Consensus
class MultiModelConsensus {
    constructor(apiKeys) {
        this.providers = {
            openai: apiKeys.openai,
            anthropic: apiKeys.anthropic,
            google: apiKeys.google
        };
    }
    
    async analyzeWithConsensus(prompt, cardData) {
        const results = [];
        
        // Run analysis through multiple models
        if (this.providers.openai) {
            try {
                const openaiResult = await this.analyzeWithOpenAI(prompt);
                results.push({ provider: 'openai', model: 'gpt-4o-mini', result: openaiResult });
            } catch (error) {
                console.error('OpenAI analysis failed:', error);
            }
        }
        
        if (this.providers.anthropic) {
            try {
                const anthropicResult = await this.analyzeWithAnthropic(prompt);
                results.push({ provider: 'anthropic', model: 'claude-3-5-sonnet', result: anthropicResult });
            } catch (error) {
                console.error('Anthropic analysis failed:', error);
            }
        }
        
        if (this.providers.google) {
            try {
                const googleResult = await this.analyzeWithGoogle(prompt);
                results.push({ provider: 'google', model: 'gemini-2.0-flash', result: googleResult });
            } catch (error) {
                console.error('Google analysis failed:', error);
            }
        }
        
        if (results.length === 0) {
            throw new Error('All AI providers failed');
        }
        
        // Generate consensus
        const consensus = this.generateConsensus(results);
        
        return {
            individualResults: results,
            consensus,
            confidence: this.calculateConsensusConfidence(results),
            modelsUsed: results.length
        };
    }
    
    async analyzeWithOpenAI(prompt) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.providers.openai}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are an expert project analyst.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                response_format: { type: 'json_object' }
            })
        });
        
        const data = await response.json();
        return JSON.parse(data.choices[0].message.content);
    }
    
    async analyzeWithAnthropic(prompt) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.providers.anthropic,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 4096,
                messages: [
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3
            })
        });
        
        const data = await response.json();
        return JSON.parse(data.content[0].text);
    }
    
    async analyzeWithGoogle(prompt) {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': this.providers.google
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    responseMimeType: 'application/json'
                }
            })
        });
        
        const data = await response.json();
        return JSON.parse(data.candidates[0].content.parts[0].text);
    }
    
    generateConsensus(results) {
        // Combine insights from all models
        const allInsights = [];
        const allRisks = [];
        const allRecommendations = [];
        
        results.forEach(r => {
            if (r.result.insights) allInsights.push(...r.result.insights);
            if (r.result.risks) allRisks.push(...r.result.risks);
            if (r.result.recommendations) allRecommendations.push(...r.result.recommendations);
        });
        
        // Find consensus points (mentioned by 2+ models)
        const consensusInsights = this.findConsensusPoints(allInsights);
        const consensusRisks = this.findConsensusPoints(allRisks);
        const consensusRecommendations = this.findConsensusPoints(allRecommendations);
        
        // Find unique insights (mentioned by only 1 model)
        const uniqueInsights = this.findUniquePoints(allInsights, consensusInsights);
        
        // Combine the best from each model
        const combinedAnalysis = {
            about: this.combineSections(results.map(r => r.result.about)),
            history: this.combineSections(results.map(r => r.result.history)),
            status: this.combineSections(results.map(r => r.result.status)),
            nextSteps: this.combineSections(results.map(r => r.result.nextSteps)),
            insights: [...consensusInsights, ...uniqueInsights.slice(0, 2)],
            risks: consensusRisks,
            recommendations: consensusRecommendations
        };
        
        return combinedAnalysis;
    }
    
    findConsensusPoints(items) {
        const counts = {};
        
        items.forEach(item => {
            const normalized = item.toLowerCase().trim();
            counts[normalized] = (counts[normalized] || 0) + 1;
        });
        
        return Object.entries(counts)
            .filter(([_, count]) => count >= 2)
            .map(([item, count]) => ({ text: item, agreement: count }))
            .sort((a, b) => b.agreement - a.agreement)
            .map(item => item.text);
    }
    
    findUniquePoints(allItems, consensusItems) {
        const consensusSet = new Set(consensusItems.map(i => i.toLowerCase()));
        return allItems.filter(item => !consensusSet.has(item.toLowerCase()));
    }
    
    combineSections(sections) {
        // Take the longest/most detailed section
        return sections.reduce((longest, current) => 
            current && current.length > longest.length ? current : longest, '');
    }
    
    calculateConsensusConfidence(results) {
        // Higher confidence with more models agreeing
        if (results.length === 1) return 'medium';
        if (results.length === 2) return 'high';
        if (results.length >= 3) return 'very high';
        return 'low';
    }
}

// Module 2: Predictive Analytics
class PredictiveAnalytics {
    constructor() {
        this.historicalData = [];
    }
    
    async predictCompletion(card, historicalCards) {
        if (!historicalCards || historicalCards.length < 5) {
            return {
                hasPrediction: false,
                message: 'Need at least 5 historical cards for predictions'
            };
        }
        
        // Find similar cards
        const similarCards = this.findSimilarCards(card, historicalCards);
        
        if (similarCards.length === 0) {
            return {
                hasPrediction: false,
                message: 'No similar historical cards found'
            };
        }
        
        // Calculate average completion time
        const avgCompletionDays = this.calculateAverageCompletionTime(similarCards);
        
        // Predict completion date
        const predictedDate = new Date();
        predictedDate.setDate(predictedDate.getDate() + avgCompletionDays);
        
        // Calculate delay probability
        const delayProbability = this.calculateDelayProbability(card, similarCards);
        
        // Predict required resources
        const resourcePrediction = this.predictResources(card, similarCards);
        
        // Calculate success probability
        const successProbability = this.calculateSuccessProbability(card, similarCards);
        
        return {
            hasPrediction: true,
            predictedCompletionDate: predictedDate,
            estimatedDays: avgCompletionDays,
            delayProbability,
            successProbability,
            resourcePrediction,
            basedOnCards: similarCards.length,
            confidence: similarCards.length >= 10 ? 'high' : 'medium'
        };
    }
    
    findSimilarCards(card, historicalCards) {
        return historicalCards.filter(hCard => {
            let similarityScore = 0;
            
            // Same list
            if (hCard.idList === card.idList) similarityScore += 2;
            
            // Similar labels
            const commonLabels = this.countCommonLabels(card.labels, hCard.labels);
            similarityScore += commonLabels;
            
            // Similar checklist size
            if (card.checklistProgress && hCard.checklistProgress) {
                const sizeDiff = Math.abs(card.checklistProgress.total - hCard.checklistProgress.total);
                if (sizeDiff <= 3) similarityScore += 2;
            }
            
            // Similar description length
            const descLengthDiff = Math.abs(
                (card.desc || '').length - (hCard.desc || '').length
            );
            if (descLengthDiff < 200) similarityScore += 1;
            
            return similarityScore >= 3;
        });
    }
    
    countCommonLabels(labels1, labels2) {
        if (!labels1 || !labels2) return 0;
        
        const names1 = new Set(labels1.map(l => l.name || l.color));
        const names2 = new Set(labels2.map(l => l.name || l.color));
        
        let common = 0;
        names1.forEach(name => {
            if (names2.has(name)) common++;
        });
        
        return common;
    }
    
    calculateAverageCompletionTime(cards) {
        const completionTimes = cards
            .filter(c => c.dateCompleted && c.dateCreated)
            .map(c => {
                const created = new Date(c.dateCreated);
                const completed = new Date(c.dateCompleted);
                return Math.ceil((completed - created) / (1000 * 60 * 60 * 24));
            });
        
        if (completionTimes.length === 0) return 7; // Default 1 week
        
        const sum = completionTimes.reduce((a, b) => a + b, 0);
        return Math.round(sum / completionTimes.length);
    }
    
    calculateDelayProbability(card, similarCards) {
        const delayedCards = similarCards.filter(c => {
            if (!c.due || !c.dateCompleted) return false;
            return new Date(c.dateCompleted) > new Date(c.due);
        });
        
        const probability = (delayedCards.length / similarCards.length) * 100;
        
        // Adjust based on current card factors
        let adjustment = 0;
        
        if (card.checklistProgress && card.checklistProgress.percentage < 25) {
            adjustment += 20;
        }
        
        if (card.members && card.members.length === 0) {
            adjustment += 15;
        }
        
        if (card.due) {
            const daysUntilDue = Math.ceil((new Date(card.due) - new Date()) / (1000 * 60 * 60 * 24));
            if (daysUntilDue < 3) adjustment += 25;
        }
        
        return Math.min(100, Math.round(probability + adjustment));
    }
    
    predictResources(card, similarCards) {
        const avgMembers = similarCards
            .filter(c => c.members && c.members.length > 0)
            .reduce((sum, c) => sum + c.members.length, 0) / similarCards.length;
        
        const avgComments = similarCards
            .filter(c => c.comments)
            .reduce((sum, c) => sum + c.comments.length, 0) / similarCards.length;
        
        return {
            recommendedTeamSize: Math.ceil(avgMembers),
            expectedCollaboration: avgComments > 5 ? 'high' : avgComments > 2 ? 'medium' : 'low',
            estimatedEffort: this.estimateEffort(card, similarCards)
        };
    }
    
    estimateEffort(card, similarCards) {
        const avgChecklistItems = similarCards
            .filter(c => c.checklistProgress)
            .reduce((sum, c) => sum + c.checklistProgress.total, 0) / similarCards.length;
        
        if (avgChecklistItems > 10) return 'high';
        if (avgChecklistItems > 5) return 'medium';
        return 'low';
    }
    
    calculateSuccessProbability(card, similarCards) {
        const completedCards = similarCards.filter(c => c.dateCompleted);
        const baseSuccess = (completedCards.length / similarCards.length) * 100;
        
        // Adjust based on current card factors
        let adjustment = 0;
        
        if (card.members && card.members.length > 0) adjustment += 10;
        if (card.desc && card.desc.length > 100) adjustment += 10;
        if (card.checklistProgress) adjustment += 10;
        if (card.due) adjustment += 5;
        
        return Math.min(100, Math.round(baseSuccess + adjustment));
    }
}

// Module 3: Historical Trend Analysis
class HistoricalTrendAnalyzer {
    constructor() {
        this.trends = {};
    }
    
    async analyzeTrends(card, boardHistory) {
        if (!boardHistory || boardHistory.length < 10) {
            return {
                hasTrends: false,
                message: 'Need more historical data for trend analysis'
            };
        }
        
        const velocityTrend = this.analyzeVelocityTrend(boardHistory);
        const completionTrend = this.analyzeCompletionTrend(boardHistory);
        const blockerTrend = this.analyzeBlockerTrend(boardHistory);
        const teamTrend = this.analyzeTeamTrend(boardHistory);
        
        return {
            hasTrends: true,
            velocity: velocityTrend,
            completion: completionTrend,
            blockers: blockerTrend,
            team: teamTrend,
            summary: this.generateTrendSummary({
                velocityTrend,
                completionTrend,
                blockerTrend,
                teamTrend
            })
        };
    }
    
    analyzeVelocityTrend(history) {
        // Calculate cards completed per week over time
        const weeklyCompletion = this.groupByWeek(history);
        
        const trend = this.calculateTrend(weeklyCompletion);
        
        return {
            currentVelocity: weeklyCompletion[weeklyCompletion.length - 1] || 0,
            averageVelocity: Math.round(weeklyCompletion.reduce((a, b) => a + b, 0) / weeklyCompletion.length),
            trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
            changePercentage: Math.round(Math.abs(trend) * 100)
        };
    }
    
    analyzeCompletionTrend(history) {
        const completionRates = history.map(card => {
            if (!card.checklistProgress) return null;
            return card.checklistProgress.percentage;
        }).filter(r => r !== null);
        
        if (completionRates.length === 0) {
            return { hasData: false };
        }
        
        const avgCompletion = completionRates.reduce((a, b) => a + b, 0) / completionRates.length;
        
        return {
            hasData: true,
            averageCompletion: Math.round(avgCompletion),
            trend: avgCompletion > 60 ? 'healthy' : avgCompletion > 30 ? 'moderate' : 'concerning'
        };
    }
    
    analyzeBlockerTrend(history) {
        const blockerKeywords = ['blocked', 'waiting', 'stuck', 'issue'];
        
        const blockerCounts = history.map(card => {
            const text = `${card.name} ${card.desc || ''}`.toLowerCase();
            return blockerKeywords.some(keyword => text.includes(keyword)) ? 1 : 0;
        });
        
        const blockerRate = (blockerCounts.reduce((a, b) => a + b, 0) / history.length) * 100;
        
        return {
            blockerRate: Math.round(blockerRate),
            trend: blockerRate > 30 ? 'high' : blockerRate > 15 ? 'moderate' : 'low'
        };
    }
    
    analyzeTeamTrend(history) {
        const assignmentRates = history.map(card => {
            return card.members && card.members.length > 0 ? 1 : 0;
        });
        
        const assignmentRate = (assignmentRates.reduce((a, b) => a + b, 0) / history.length) * 100;
        
        return {
            assignmentRate: Math.round(assignmentRate),
            trend: assignmentRate > 80 ? 'excellent' : assignmentRate > 60 ? 'good' : 'needs improvement'
        };
    }
    
    groupByWeek(history) {
        // Group cards by week and count completions
        const weeks = {};
        
        history.forEach(card => {
            if (!card.dateCompleted) return;
            
            const date = new Date(card.dateCompleted);
            const weekKey = `${date.getFullYear()}-W${this.getWeekNumber(date)}`;
            
            weeks[weekKey] = (weeks[weekKey] || 0) + 1;
        });
        
        return Object.values(weeks);
    }
    
    getWeekNumber(date) {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }
    
    calculateTrend(values) {
        if (values.length < 2) return 0;
        
        const recent = values.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, values.length);
        const older = values.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(1, values.length - 3);
        
        return (recent - older) / Math.max(1, older);
    }
    
    generateTrendSummary(trends) {
        const insights = [];
        
        if (trends.velocityTrend.trend === 'increasing') {
            insights.push(`Team velocity is increasing by ${trends.velocityTrend.changePercentage}% - productivity is improving`);
        } else if (trends.velocityTrend.trend === 'decreasing') {
            insights.push(`Team velocity is decreasing by ${trends.velocityTrend.changePercentage}% - may need support`);
        }
        
        if (trends.completion.hasData && trends.completion.trend === 'concerning') {
            insights.push(`Average completion rate is ${trends.completion.averageCompletion}% - cards may be too large or complex`);
        }
        
        if (trends.blockers.trend === 'high') {
            insights.push(`${trends.blockers.blockerRate}% of cards mention blockers - systemic issues need addressing`);
        }
        
        return insights;
    }
}

// Module 4: Dependency Graph Analyzer
class DependencyGraphAnalyzer {
    async analyzeDependencies(card, allCards) {
        const dependencies = this.findDependencies(card, allCards);
        const dependents = this.findDependents(card, allCards);
        const criticalPath = this.calculateCriticalPath(card, dependencies, dependents);
        
        return {
            hasDependencies: dependencies.length > 0 || dependents.length > 0,
            blockedBy: dependencies,
            blocking: dependents,
            criticalPath,
            impactScore: this.calculateImpactScore(card, dependents),
            recommendations: this.generateDependencyRecommendations(dependencies, dependents)
        };
    }
    
    findDependencies(card, allCards) {
        const dependencies = [];
        const text = `${card.name} ${card.desc || ''}`.toLowerCase();
        
        // Look for references to other cards
        const patterns = [
            /depends on #(\d+)/gi,
            /blocked by #(\d+)/gi,
            /waiting for #(\d+)/gi,
            /requires #(\d+)/gi
        ];
        
        allCards.forEach(otherCard => {
            if (otherCard.id === card.id) return;
            
            // Check if this card mentions the other card
            patterns.forEach(pattern => {
                if (text.match(pattern)) {
                    dependencies.push({
                        id: otherCard.id,
                        name: otherCard.name,
                        status: otherCard.list?.name || 'Unknown',
                        completed: otherCard.dateCompleted ? true : false
                    });
                }
            });
            
            // Check if other card's ID is mentioned
            if (text.includes(otherCard.shortLink) || text.includes(otherCard.id)) {
                dependencies.push({
                    id: otherCard.id,
                    name: otherCard.name,
                    status: otherCard.list?.name || 'Unknown',
                    completed: otherCard.dateCompleted ? true : false
                });
            }
        });
        
        return dependencies;
    }
    
    findDependents(card, allCards) {
        const dependents = [];
        
        allCards.forEach(otherCard => {
            if (otherCard.id === card.id) return;
            
            const text = `${otherCard.name} ${otherCard.desc || ''}`.toLowerCase();
            
            // Check if other card mentions this card
            if (text.includes(card.shortLink) || text.includes(card.id) || 
                text.includes(`#${card.idShort}`)) {
                dependents.push({
                    id: otherCard.id,
                    name: otherCard.name,
                    status: otherCard.list?.name || 'Unknown',
                    urgent: otherCard.due && new Date(otherCard.due) < new Date()
                });
            }
        });
        
        return dependents;
    }
    
    calculateCriticalPath(card, dependencies, dependents) {
        // Determine if this card is on the critical path
        const hasUrgentDependents = dependents.some(d => d.urgent);
        const hasBlockedDependencies = dependencies.some(d => !d.completed);
        
        let isCritical = false;
        let reason = '';
        
        if (hasUrgentDependents && dependents.length > 2) {
            isCritical = true;
            reason = `Blocking ${dependents.length} cards, including urgent ones`;
        } else if (hasBlockedDependencies && dependencies.length > 2) {
            isCritical = true;
            reason = `Blocked by ${dependencies.length} incomplete cards`;
        } else if (dependents.length > 5) {
            isCritical = true;
            reason = `Blocking ${dependents.length} downstream cards`;
        }
        
        return {
            isCritical,
            reason,
            priority: isCritical ? 'high' : 'normal'
        };
    }
    
    calculateImpactScore(card, dependents) {
        // Calculate how many cards would be impacted if this card is delayed
        let score = dependents.length * 10;
        
        // Add weight for urgent dependents
        const urgentCount = dependents.filter(d => d.urgent).length;
        score += urgentCount * 20;
        
        return Math.min(100, score);
    }
    
    generateDependencyRecommendations(dependencies, dependents) {
        const recommendations = [];
        
        if (dependencies.length > 0) {
            const incomplete = dependencies.filter(d => !d.completed);
            if (incomplete.length > 0) {
                recommendations.push(`Unblock by completing: ${incomplete.map(d => d.name).join(', ')}`);
            }
        }
        
        if (dependents.length > 3) {
            recommendations.push(`High impact: ${dependents.length} cards depend on this - prioritize completion`);
        }
        
        if (dependents.some(d => d.urgent)) {
            recommendations.push('URGENT: Dependent cards have approaching deadlines');
        }
        
        return recommendations;
    }
}

// Module 5: Learning from Feedback
class FeedbackLearner {
    constructor() {
        this.feedback = [];
    }
    
    async recordFeedback(analysisId, cardId, rating, comments) {
        const feedbackEntry = {
            id: Date.now(),
            analysisId,
            cardId,
            rating, // 1-5 stars
            comments,
            timestamp: new Date().toISOString()
        };
        
        this.feedback.push(feedbackEntry);
        
        // Store in localStorage
        localStorage.setItem('summarizeThis_feedback', JSON.stringify(this.feedback));
        
        return feedbackEntry;
    }
    
    async analyzeFeedback() {
        if (this.feedback.length === 0) {
            return {
                hasFeedback: false,
                message: 'No feedback collected yet'
            };
        }
        
        const avgRating = this.feedback.reduce((sum, f) => sum + f.rating, 0) / this.feedback.length;
        
        const lowRatings = this.feedback.filter(f => f.rating <= 2);
        const highRatings = this.feedback.filter(f => f.rating >= 4);
        
        return {
            hasFeedback: true,
            totalFeedback: this.feedback.length,
            averageRating: avgRating.toFixed(2),
            lowRatingCount: lowRatings.length,
            highRatingCount: highRatings.length,
            improvements: this.extractImprovements(lowRatings),
            strengths: this.extractStrengths(highRatings)
        };
    }
    
    extractImprovements(lowRatings) {
        // Extract common themes from low-rated feedback
        const themes = {};
        
        lowRatings.forEach(feedback => {
            if (!feedback.comments) return;
            
            const text = feedback.comments.toLowerCase();
            
            if (text.includes('missing') || text.includes('incomplete')) {
                themes['completeness'] = (themes['completeness'] || 0) + 1;
            }
            if (text.includes('wrong') || text.includes('incorrect')) {
                themes['accuracy'] = (themes['accuracy'] || 0) + 1;
            }
            if (text.includes('vague') || text.includes('generic')) {
                themes['specificity'] = (themes['specificity'] || 0) + 1;
            }
        });
        
        return Object.entries(themes)
            .map(([theme, count]) => ({ theme, count }))
            .sort((a, b) => b.count - a.count);
    }
    
    extractStrengths(highRatings) {
        // Extract what users liked
        const strengths = [];
        
        highRatings.forEach(feedback => {
            if (!feedback.comments) return;
            
            const text = feedback.comments.toLowerCase();
            
            if (text.includes('detailed') || text.includes('thorough')) {
                strengths.push('detailed analysis');
            }
            if (text.includes('helpful') || text.includes('useful')) {
                strengths.push('actionable insights');
            }
            if (text.includes('accurate') || text.includes('spot on')) {
                strengths.push('accuracy');
            }
        });
        
        return [...new Set(strengths)];
    }
}

// Export modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MultiModelConsensus,
        PredictiveAnalytics,
        HistoricalTrendAnalyzer,
        DependencyGraphAnalyzer,
        FeedbackLearner
    };
}
