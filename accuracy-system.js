// Confidence and validation system.
// This provides review signals, not guaranteed model accuracy.

// Module 1: Confidence Scoring System
class ConfidenceScorer {
    constructor() {
        this.thresholds = {
            high: 0.90,      // 90%+ confidence
            medium: 0.75,    // 75-90% confidence
            low: 0.60,       // 60-75% confidence
            veryLow: 0.60    // <60% confidence - requires review
        };
    }
    
    async calculateConfidence(analysis, cardData, metadata) {
        const scores = {
            dataCompleteness: this.scoreDataCompleteness(cardData),
            analysisCompleteness: this.scoreAnalysisCompleteness(analysis),
            factualConsistency: await this.scoreFactualConsistency(analysis, cardData),
            modelConfidence: this.extractModelConfidence(metadata),
            complexityScore: this.scoreComplexity(cardData)
        };
        
        // Weighted average
        const weights = {
            dataCompleteness: 0.25,
            analysisCompleteness: 0.20,
            factualConsistency: 0.30,
            modelConfidence: 0.15,
            complexityScore: 0.10
        };
        
        let totalScore = 0;
        Object.keys(scores).forEach(key => {
            totalScore += scores[key] * weights[key];
        });
        
        return {
            overall: totalScore,
            level: this.getConfidenceLevel(totalScore),
            breakdown: scores,
            needsReview: totalScore < this.thresholds.veryLow,
            reviewReason: this.getReviewReason(scores, totalScore)
        };
    }
    
    scoreDataCompleteness(cardData) {
        let score = 0;
        let maxScore = 0;
        
        // Card basics (40 points)
        maxScore += 40;
        if (cardData.card.name) score += 10;
        if (cardData.card.desc && cardData.card.desc.length > 50) score += 20;
        if (cardData.card.labels && cardData.card.labels.length > 0) score += 5;
        if (cardData.card.members && cardData.card.members.length > 0) score += 5;
        
        // Checklists (20 points)
        maxScore += 20;
        if (cardData.checklistProgress) {
            score += 10;
            if (cardData.checklistProgress.total > 0) score += 10;
        }
        
        // Comments (20 points)
        maxScore += 20;
        if (cardData.comments) {
            if (cardData.comments.length > 0) score += 10;
            if (cardData.comments.length > 5) score += 10;
        }
        
        // Attachments (10 points)
        maxScore += 10;
        if (cardData.card.attachments && cardData.card.attachments.length > 0) {
            score += 10;
        }
        
        // Activity (10 points)
        maxScore += 10;
        if (cardData.card.dateLastActivity) score += 10;
        
        return score / maxScore;
    }
    
    scoreAnalysisCompleteness(analysis) {
        let score = 0;
        let maxScore = 7; // 7 required sections
        
        const requiredSections = [
            'about', 'history', 'status', 'nextSteps', 
            'insights', 'risks', 'recommendations'
        ];
        
        requiredSections.forEach(section => {
            if (analysis[section] && analysis[section].length > 50) {
                score += 1;
            }
        });
        
        return score / maxScore;
    }
    
    async scoreFactualConsistency(analysis, cardData) {
        // Check if analysis claims are supported by card data
        let consistencyScore = 1.0;
        
        // Check due date mentions
        if (analysis.status && analysis.status.toLowerCase().includes('due')) {
            if (!cardData.card.due) {
                consistencyScore -= 0.2; // Penalty for mentioning non-existent due date
            }
        }
        
        // Check completion mentions
        if (analysis.status && analysis.status.toLowerCase().includes('complete')) {
            if (!cardData.checklistProgress || cardData.checklistProgress.percentage < 100) {
                consistencyScore -= 0.2;
            }
        }
        
        // Check member mentions
        if (analysis.status && analysis.status.toLowerCase().includes('assigned')) {
            if (!cardData.card.members || cardData.card.members.length === 0) {
                consistencyScore -= 0.2;
            }
        }
        
        // Check blocker mentions
        if (analysis.risks && analysis.risks.some(r => r.toLowerCase().includes('blocked'))) {
            const text = `${cardData.card.name} ${cardData.card.desc || ''}`.toLowerCase();
            if (!text.includes('block') && !text.includes('waiting')) {
                consistencyScore -= 0.1;
            }
        }
        
        return Math.max(0, consistencyScore);
    }
    
    extractModelConfidence(metadata) {
        // Extract confidence from AI model metadata
        if (metadata && metadata.confidence) {
            return metadata.confidence;
        }
        
        // Default to medium confidence if not provided
        return 0.80;
    }
    
    scoreComplexity(cardData) {
        // Lower score for more complex cards (harder to analyze accurately)
        let complexityPenalty = 0;
        
        // Very long description
        if (cardData.card.desc && cardData.card.desc.length > 2000) {
            complexityPenalty += 0.1;
        }
        
        // Many checklists
        if (cardData.checklistProgress && cardData.checklistProgress.total > 20) {
            complexityPenalty += 0.1;
        }
        
        // Many comments
        if (cardData.comments && cardData.comments.length > 20) {
            complexityPenalty += 0.1;
        }
        
        // Many attachments
        if (cardData.card.attachments && cardData.card.attachments.length > 5) {
            complexityPenalty += 0.1;
        }
        
        return Math.max(0, 1.0 - complexityPenalty);
    }
    
    getConfidenceLevel(score) {
        if (score >= this.thresholds.high) return 'high';
        if (score >= this.thresholds.medium) return 'medium';
        if (score >= this.thresholds.low) return 'low';
        return 'very-low';
    }
    
    getReviewReason(scores, totalScore) {
        if (totalScore >= this.thresholds.veryLow) {
            return null;
        }
        
        const reasons = [];
        
        if (scores.dataCompleteness < 0.5) {
            reasons.push('Incomplete card data');
        }
        
        if (scores.factualConsistency < 0.7) {
            reasons.push('Potential factual inconsistencies');
        }
        
        if (scores.modelConfidence < 0.7) {
            reasons.push('Low AI model confidence');
        }
        
        if (scores.complexityScore < 0.6) {
            reasons.push('High card complexity');
        }
        
        return reasons.join('; ');
    }
}

// Module 2: Human Review System
class HumanReviewSystem {
    constructor() {
        this.pendingReviews = [];
        this.completedReviews = [];
    }
    
    async requestReview(analysis, cardData, confidence) {
        const review = {
            id: `review_${Date.now()}`,
            analysisId: analysis.id,
            cardId: cardData.card.id,
            cardName: cardData.card.name,
            confidence: confidence.overall,
            reason: confidence.reviewReason,
            status: 'pending',
            createdAt: new Date().toISOString(),
            analysis: analysis,
            cardData: cardData
        };
        
        this.pendingReviews.push(review);
        
        // Store in localStorage
        this.savePendingReviews();
        
        return review;
    }
    
    async submitReview(reviewId, feedback) {
        const reviewIndex = this.pendingReviews.findIndex(r => r.id === reviewId);
        
        if (reviewIndex === -1) {
            throw new Error('Review not found');
        }
        
        const review = this.pendingReviews[reviewIndex];
        
        // Update review with feedback
        review.status = 'completed';
        review.completedAt = new Date().toISOString();
        review.feedback = {
            rating: feedback.rating, // 1-5
            isAccurate: feedback.isAccurate, // true/false
            corrections: feedback.corrections || {},
            comments: feedback.comments || ''
        };
        
        // Move to completed
        this.completedReviews.push(review);
        this.pendingReviews.splice(reviewIndex, 1);
        
        // Save
        this.savePendingReviews();
        this.saveCompletedReviews();
        
        // Learn from feedback
        await this.learnFromReview(review);
        
        return review;
    }
    
    async learnFromReview(review) {
        // Extract learnings from the review
        const learnings = {
            originalAnalysis: review.analysis,
            corrections: review.feedback.corrections,
            cardData: review.cardData,
            timestamp: new Date().toISOString()
        };
        
        // Store for future model improvement
        const existingLearnings = JSON.parse(localStorage.getItem('summarizeThis_learnings') || '[]');
        existingLearnings.push(learnings);
        localStorage.setItem('summarizeThis_learnings', JSON.stringify(existingLearnings));
        
        return learnings;
    }
    
    getPendingReviews() {
        return this.pendingReviews;
    }
    
    getCompletedReviews() {
        return this.completedReviews;
    }
    
    savePendingReviews() {
        localStorage.setItem('summarizeThis_pendingReviews', JSON.stringify(this.pendingReviews));
    }
    
    saveCompletedReviews() {
        localStorage.setItem('summarizeThis_completedReviews', JSON.stringify(this.completedReviews));
    }
    
    loadReviews() {
        this.pendingReviews = JSON.parse(localStorage.getItem('summarizeThis_pendingReviews') || '[]');
        this.completedReviews = JSON.parse(localStorage.getItem('summarizeThis_completedReviews') || '[]');
    }
}

// Module 3: Ground Truth Validator
class GroundTruthValidator {
    constructor() {
        this.groundTruth = [];
        this.loadGroundTruth();
    }
    
    async addGroundTruth(cardData, expertAnalysis, metadata) {
        const entry = {
            id: `gt_${Date.now()}`,
            cardId: cardData.card.id,
            cardData: cardData,
            expertAnalysis: expertAnalysis,
            metadata: {
                createdBy: metadata.createdBy || 'system',
                createdAt: new Date().toISOString(),
                validated: metadata.validated || false,
                validationCount: metadata.validationCount || 1
            }
        };
        
        this.groundTruth.push(entry);
        this.saveGroundTruth();
        
        return entry;
    }
    
    async validateAnalysis(analysis, cardData) {
        // Find matching ground truth entry
        const gtEntry = this.groundTruth.find(gt => 
            this.isSimilarCard(gt.cardData, cardData)
        );
        
        if (!gtEntry) {
            return {
                hasGroundTruth: false,
                message: 'No matching ground truth found'
            };
        }
        
        // Compare analysis with ground truth
        const comparison = this.compareAnalyses(analysis, gtEntry.expertAnalysis);
        
        return {
            hasGroundTruth: true,
            groundTruthId: gtEntry.id,
            similarity: comparison.similarity,
            differences: comparison.differences,
            passed: comparison.similarity >= 0.85
        };
    }
    
    isSimilarCard(card1Data, card2Data) {
        // Check if cards are similar enough to use same ground truth
        
        // Same card ID
        if (card1Data.card.id === card2Data.card.id) {
            return true;
        }
        
        // Similar structure and content
        const titleSimilarity = this.calculateTextSimilarity(
            card1Data.card.name, 
            card2Data.card.name
        );
        
        const descSimilarity = this.calculateTextSimilarity(
            card1Data.card.desc || '',
            card2Data.card.desc || ''
        );
        
        return titleSimilarity > 0.8 && descSimilarity > 0.7;
    }
    
    calculateTextSimilarity(text1, text2) {
        // Simple Jaccard similarity
        const words1 = new Set(text1.toLowerCase().split(/\s+/));
        const words2 = new Set(text2.toLowerCase().split(/\s+/));
        
        const intersection = new Set([...words1].filter(w => words2.has(w)));
        const union = new Set([...words1, ...words2]);
        
        return intersection.size / union.size;
    }
    
    compareAnalyses(analysis1, analysis2) {
        const sections = ['about', 'history', 'status', 'nextSteps', 'insights', 'risks'];
        const similarities = {};
        const differences = [];
        
        sections.forEach(section => {
            const text1 = analysis1[section] || '';
            const text2 = analysis2[section] || '';
            
            const similarity = this.calculateTextSimilarity(text1, text2);
            similarities[section] = similarity;
            
            if (similarity < 0.7) {
                differences.push({
                    section,
                    similarity,
                    expected: text2,
                    actual: text1
                });
            }
        });
        
        const avgSimilarity = Object.values(similarities).reduce((a, b) => a + b, 0) / sections.length;
        
        return {
            similarity: avgSimilarity,
            sectionSimilarities: similarities,
            differences
        };
    }
    
    getAccuracyMetrics() {
        // Calculate overall accuracy based on ground truth validations
        const validations = JSON.parse(localStorage.getItem('summarizeThis_validations') || '[]');
        
        if (validations.length === 0) {
            return {
                hasData: false,
                message: 'No validation data available'
            };
        }
        
        const passed = validations.filter(v => v.passed).length;
        const accuracy = passed / validations.length;
        
        const avgSimilarity = validations.reduce((sum, v) => sum + v.similarity, 0) / validations.length;
        
        return {
            hasData: true,
            totalValidations: validations.length,
            passed,
            failed: validations.length - passed,
            accuracy: accuracy * 100,
            averageSimilarity: avgSimilarity * 100
        };
    }
    
    saveGroundTruth() {
        localStorage.setItem('summarizeThis_groundTruth', JSON.stringify(this.groundTruth));
    }
    
    loadGroundTruth() {
        this.groundTruth = JSON.parse(localStorage.getItem('summarizeThis_groundTruth') || '[]');
    }
}

// Module 4: Error Detector
class ErrorDetector {
    async detectErrors(analysis, cardData) {
        const errors = [];
        
        // Check 1: Factual errors
        const factualErrors = await this.checkFactualErrors(analysis, cardData);
        errors.push(...factualErrors);
        
        // Check 2: Logical inconsistencies
        const logicalErrors = await this.checkLogicalConsistency(analysis);
        errors.push(...logicalErrors);
        
        // Check 3: Completeness
        const completenessErrors = await this.checkCompleteness(analysis);
        errors.push(...completenessErrors);
        
        // Check 4: Hallucinations
        const hallucinations = await this.detectHallucinations(analysis, cardData);
        errors.push(...hallucinations);
        
        return {
            hasErrors: errors.length > 0,
            errorCount: errors.length,
            errors: errors,
            severity: this.calculateSeverity(errors)
        };
    }
    
    async checkFactualErrors(analysis, cardData) {
        const errors = [];
        
        // Check due date claims
        if (analysis.status && analysis.status.toLowerCase().includes('overdue')) {
            if (!cardData.card.due || new Date(cardData.card.due) > new Date()) {
                errors.push({
                    type: 'factual_error',
                    field: 'status',
                    message: 'Claims card is overdue but due date is not past',
                    severity: 'high'
                });
            }
        }
        
        // Check completion claims
        if (analysis.status && analysis.status.toLowerCase().includes('100%')) {
            if (!cardData.checklistProgress || cardData.checklistProgress.percentage !== 100) {
                errors.push({
                    type: 'factual_error',
                    field: 'status',
                    message: 'Claims 100% complete but checklist shows otherwise',
                    severity: 'high'
                });
            }
        }
        
        // Check member assignment claims
        if (analysis.status && analysis.status.toLowerCase().includes('unassigned')) {
            if (cardData.card.members && cardData.card.members.length > 0) {
                errors.push({
                    type: 'factual_error',
                    field: 'status',
                    message: 'Claims unassigned but members are assigned',
                    severity: 'medium'
                });
            }
        }
        
        return errors;
    }
    
    async checkLogicalConsistency(analysis) {
        const errors = [];
        
        // Check if insights contradict status
        if (analysis.status && analysis.insights) {
            const statusText = analysis.status.toLowerCase();
            const insightsText = analysis.insights.join(' ').toLowerCase();
            
            if (statusText.includes('on track') && insightsText.includes('behind schedule')) {
                errors.push({
                    type: 'logical_inconsistency',
                    fields: ['status', 'insights'],
                    message: 'Status says "on track" but insights mention "behind schedule"',
                    severity: 'medium'
                });
            }
        }
        
        return errors;
    }
    
    async checkCompleteness(analysis) {
        const errors = [];
        
        const requiredSections = ['about', 'status', 'nextSteps', 'insights'];
        
        requiredSections.forEach(section => {
            if (!analysis[section] || analysis[section].length < 20) {
                errors.push({
                    type: 'incomplete',
                    field: section,
                    message: `Section "${section}" is missing or too short`,
                    severity: 'low'
                });
            }
        });
        
        return errors;
    }
    
    async detectHallucinations(analysis, cardData) {
        // Check if analysis mentions specific things not in card data
        const errors = [];
        
        const allCardText = `
            ${cardData.card.name}
            ${cardData.card.desc || ''}
            ${cardData.comments ? cardData.comments.map(c => c.text).join(' ') : ''}
        `.toLowerCase();
        
        // Check for specific dates not in card
        const datePattern = /\d{4}-\d{2}-\d{2}/g;
        const analysisText = JSON.stringify(analysis);
        const mentionedDates = analysisText.match(datePattern) || [];
        
        mentionedDates.forEach(date => {
            if (!allCardText.includes(date) && 
                (!cardData.card.due || !cardData.card.due.includes(date))) {
                errors.push({
                    type: 'hallucination',
                    field: 'unknown',
                    message: `Mentions specific date ${date} not found in card`,
                    severity: 'medium'
                });
            }
        });
        
        return errors;
    }
    
    calculateSeverity(errors) {
        if (errors.length === 0) return 'none';
        
        const highCount = errors.filter(e => e.severity === 'high').length;
        const mediumCount = errors.filter(e => e.severity === 'medium').length;
        
        if (highCount > 0) return 'high';
        if (mediumCount > 2) return 'high';
        if (mediumCount > 0) return 'medium';
        return 'low';
    }
}

// Module 5: Accuracy Dashboard
class AccuracyDashboard {
    constructor() {
        this.metrics = this.loadMetrics();
    }
    
    async recordAnalysis(analysis, cardData, confidence, errors, validationResult) {
        const record = {
            id: `analysis_${Date.now()}`,
            timestamp: new Date().toISOString(),
            cardId: cardData.card.id,
            confidence: confidence.overall,
            confidenceLevel: confidence.level,
            errorCount: errors.errorCount,
            errorSeverity: errors.severity,
            validated: validationResult ? validationResult.hasGroundTruth : false,
            validationPassed: validationResult ? validationResult.passed : null,
            similarity: validationResult ? validationResult.similarity : null
        };
        
        this.metrics.analyses.push(record);
        this.saveMetrics();
        
        return record;
    }
    
    getAccuracyReport() {
        const analyses = this.metrics.analyses;
        
        if (analyses.length === 0) {
            return {
                hasData: false,
                message: 'No analysis data available'
            };
        }
        
        // Calculate metrics
        const avgConfidence = analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length;
        
        const highConfidence = analyses.filter(a => a.confidenceLevel === 'high').length;
        const mediumConfidence = analyses.filter(a => a.confidenceLevel === 'medium').length;
        const lowConfidence = analyses.filter(a => a.confidenceLevel === 'low' || a.confidenceLevel === 'very-low').length;
        
        const withErrors = analyses.filter(a => a.errorCount > 0).length;
        const errorRate = withErrors / analyses.length;
        
        const validated = analyses.filter(a => a.validated);
        const validationAccuracy = validated.length > 0
            ? validated.filter(a => a.validationPassed).length / validated.length
            : null;
        
        return {
            hasData: true,
            totalAnalyses: analyses.length,
            averageConfidence: (avgConfidence * 100).toFixed(1),
            confidenceDistribution: {
                high: highConfidence,
                medium: mediumConfidence,
                low: lowConfidence
            },
            errorRate: (errorRate * 100).toFixed(1),
            validatedCount: validated.length,
            validationAccuracy: validationAccuracy ? (validationAccuracy * 100).toFixed(1) : 'N/A',
            estimatedAccuracy: this.estimateAccuracy(avgConfidence, errorRate, validationAccuracy)
        };
    }
    
    estimateAccuracy(avgConfidence, errorRate, validationAccuracy) {
        // Estimate overall accuracy based on available metrics
        
        if (validationAccuracy !== null) {
            // If we have validation data, use it primarily
            return (validationAccuracy * 100).toFixed(1);
        }
        
        // Otherwise estimate from confidence and error rate
        const confidenceContribution = avgConfidence * 0.6;
        const errorContribution = (1 - errorRate) * 0.4;
        
        const estimated = (confidenceContribution + errorContribution) * 100;
        
        return estimated.toFixed(1);
    }
    
    loadMetrics() {
        return JSON.parse(localStorage.getItem('summarizeThis_accuracyMetrics') || '{"analyses":[]}');
    }
    
    saveMetrics() {
        localStorage.setItem('summarizeThis_accuracyMetrics', JSON.stringify(this.metrics));
    }
}

// Export modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ConfidenceScorer,
        HumanReviewSystem,
        GroundTruthValidator,
        ErrorDetector,
        AccuracyDashboard
    };
}
