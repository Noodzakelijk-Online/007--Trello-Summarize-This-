// Credit Usage and Business Intelligence Analytics for Summarize This
// Comprehensive tracking of credit consumption, revenue patterns, and business metrics

const { EventEmitter } = require('events');
const crypto = require('crypto');

// =============================================================================
// CREDIT USAGE ANALYTICS TRACKER
// =============================================================================

class CreditUsageAnalytics extends EventEmitter {
  constructor(analyticsFramework, config = {}) {
    super();
    
    this.analytics = analyticsFramework;
    this.config = {
      // Credit tracking configuration
      trackCreditUsage: config.trackCreditUsage !== false,
      trackPurchasePatterns: config.trackPurchasePatterns !== false,
      trackRevenueMetrics: config.trackRevenueMetrics !== false,
      trackUserLifetimeValue: config.trackUserLifetimeValue !== false,
      trackChurnPrediction: config.trackChurnPrediction !== false,
      
      // Business intelligence
      enableRevenueAnalysis: config.enableRevenueAnalysis !== false,
      enableCohortRevenueAnalysis: config.enableCohortRevenueAnalysis !== false,
      enablePredictiveAnalytics: config.enablePredictiveAnalytics !== false,
      
      // Credit system configuration
      creditPricing: {
        basic: { credits: 10, price: 5.00, type: 'starter' },
        standard: { credits: 50, price: 20.00, type: 'popular' },
        premium: { credits: 100, price: 35.00, type: 'value' },
        enterprise: { credits: 500, price: 150.00, type: 'business' },
        ...config.creditPricing
      },
      
      // Feature credit costs
      featureCosts: {
        text_summarization: 1,
        audio_transcription: 2,
        video_transcription: 3,
        document_processing: 2,
        bulk_processing: 5,
        ...config.featureCosts
      },
      
      // Business metrics thresholds
      churnRiskThreshold: config.churnRiskThreshold || 0.7,
      lowUsageThreshold: config.lowUsageThreshold || 5, // credits per month
      highValueThreshold: config.highValueThreshold || 100, // dollars per month
      
      // Analysis periods
      analysisWindows: {
        daily: 24 * 60 * 60 * 1000,
        weekly: 7 * 24 * 60 * 60 * 1000,
        monthly: 30 * 24 * 60 * 60 * 1000,
        quarterly: 90 * 24 * 60 * 60 * 1000,
        yearly: 365 * 24 * 60 * 60 * 1000,
        ...config.analysisWindows
      },
      
      // Privacy settings
      anonymizeData: config.anonymizeData !== false,
      
      // Debug mode
      debug: config.debug || false,
      
      ...config
    };
    
    // Data storage
    this.creditTransactions = new Map();
    this.userCreditHistory = new Map();
    this.purchaseHistory = new Map();
    this.revenueMetrics = new Map();
    this.userSegments = new Map();
    this.churnPredictions = new Map();
    
    this.initialize();
  }
  
  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  
  initialize() {
    // Set up periodic analysis
    this.setupPeriodicAnalysis();
    
    // Initialize user segments
    this.initializeUserSegments();
    
    // Set up churn prediction
    this.setupChurnPrediction();
    
    this.emit('initialized');
  }
  
  setupPeriodicAnalysis() {
    // Daily revenue analysis
    setInterval(() => {
      this.analyzeRevenueMetrics('daily');
    }, this.config.analysisWindows.daily);
    
    // Weekly business intelligence
    setInterval(() => {
      this.generateBusinessIntelligenceReport('weekly');
    }, this.config.analysisWindows.weekly);
    
    // Monthly cohort analysis
    setInterval(() => {
      this.analyzeCohortRevenue('monthly');
    }, this.config.analysisWindows.monthly);
  }
  
  initializeUserSegments() {
    // Define user segments based on usage and spending patterns
    const segments = [
      {
        id: 'free_trial',
        name: 'Free Trial Users',
        criteria: { total_spent: 0, credits_used: { min: 0, max: 10 } },
        characteristics: ['new_user', 'exploring']
      },
      {
        id: 'light_user',
        name: 'Light Users',
        criteria: { credits_per_month: { min: 1, max: 20 }, total_spent: { min: 5, max: 50 } },
        characteristics: ['occasional_use', 'price_sensitive']
      },
      {
        id: 'regular_user',
        name: 'Regular Users',
        criteria: { credits_per_month: { min: 21, max: 100 }, total_spent: { min: 51, max: 200 } },
        characteristics: ['consistent_use', 'engaged']
      },
      {
        id: 'power_user',
        name: 'Power Users',
        criteria: { credits_per_month: { min: 101, max: 500 }, total_spent: { min: 201, max: 1000 } },
        characteristics: ['heavy_use', 'feature_adopter']
      },
      {
        id: 'enterprise',
        name: 'Enterprise Users',
        criteria: { credits_per_month: { min: 501 }, total_spent: { min: 1001 } },
        characteristics: ['business_use', 'high_value']
      }
    ];
    
    segments.forEach(segment => {
      this.userSegments.set(segment.id, segment);
    });
  }
  
  // ==========================================================================
  // CREDIT USAGE TRACKING
  // ==========================================================================
  
  trackCreditUsage(userId, featureId, creditsUsed, usageData = {}) {
    if (!this.config.trackCreditUsage) return;
    
    const transaction = {
      id: this.generateTransactionId(),
      user_id: userId,
      feature_id: featureId,
      feature_name: usageData.featureName || featureId,
      credits_used: creditsUsed,
      credits_remaining: usageData.creditsRemaining || 0,
      timestamp: Date.now(),
      
      // Usage context
      usage_context: usageData.context || 'direct',
      session_id: usageData.sessionId,
      request_id: usageData.requestId,
      
      // Processing details
      processing_time: usageData.processingTime || 0,
      processing_success: usageData.success !== false,
      processing_error: usageData.error,
      
      // Content details (anonymized)
      content_type: usageData.contentType,
      content_size: usageData.contentSize,
      content_language: usageData.contentLanguage,
      
      // Quality metrics
      quality_score: usageData.qualityScore,
      user_satisfaction: usageData.userSatisfaction,
      
      // Business context
      user_tier: usageData.userTier || 'free',
      subscription_type: usageData.subscriptionType,
      
      // Technical context
      device_type: usageData.deviceType,
      browser: usageData.browser,
      ip_country: usageData.ipCountry,
      
      // Cost analysis
      estimated_cost: this.calculateProcessingCost(featureId, usageData),
      revenue_attribution: this.calculateRevenueAttribution(userId, creditsUsed)
    };
    
    // Store transaction
    this.creditTransactions.set(transaction.id, transaction);
    
    // Update user credit history
    this.updateUserCreditHistory(userId, transaction);
    
    // Track with analytics framework
    this.analytics.track('Credit Used', {
      user_id: userId,
      feature_id: featureId,
      credits_used: creditsUsed,
      credits_remaining: transaction.credits_remaining,
      processing_success: transaction.processing_success,
      estimated_cost: transaction.estimated_cost,
      revenue_attribution: transaction.revenue_attribution
    });
    
    // Update real-time metrics
    this.updateRealTimeMetrics(transaction);
    
    // Check for usage patterns
    this.analyzeUsagePatterns(userId, transaction);
    
    // Update user segmentation
    this.updateUserSegmentation(userId);
    
    this.emit('credit_used', transaction);
    
    return transaction;
  }
  
  trackCreditPurchase(userId, purchaseData) {
    if (!this.config.trackPurchasePatterns) return;
    
    const purchase = {
      id: this.generatePurchaseId(),
      user_id: userId,
      timestamp: Date.now(),
      
      // Purchase details
      package_type: purchaseData.packageType,
      credits_purchased: purchaseData.creditsPurchased,
      amount_paid: purchaseData.amountPaid,
      currency: purchaseData.currency || 'USD',
      payment_method: purchaseData.paymentMethod,
      
      // Transaction details
      transaction_id: purchaseData.transactionId,
      payment_processor: purchaseData.paymentProcessor || 'stripe',
      payment_status: purchaseData.paymentStatus || 'completed',
      
      // Purchase context
      purchase_trigger: purchaseData.trigger || 'manual',
      credits_before: purchaseData.creditsBefore || 0,
      credits_after: (purchaseData.creditsBefore || 0) + purchaseData.creditsPurchased,
      
      // User context
      user_tier: purchaseData.userTier,
      days_since_signup: purchaseData.daysSinceSignup,
      previous_purchases: this.getUserPurchaseCount(userId),
      
      // Marketing attribution
      utm_source: purchaseData.utmSource,
      utm_medium: purchaseData.utmMedium,
      utm_campaign: purchaseData.utmCampaign,
      referrer: purchaseData.referrer,
      
      // Discount information
      discount_code: purchaseData.discountCode,
      discount_amount: purchaseData.discountAmount || 0,
      discount_percentage: purchaseData.discountPercentage || 0,
      
      // Technical context
      device_type: purchaseData.deviceType,
      browser: purchaseData.browser,
      ip_country: purchaseData.ipCountry,
      
      // Business metrics
      customer_lifetime_value: this.calculateCustomerLifetimeValue(userId),
      purchase_frequency: this.calculatePurchaseFrequency(userId),
      average_order_value: this.calculateAverageOrderValue(userId)
    };
    
    // Store purchase
    this.purchaseHistory.set(purchase.id, purchase);
    
    // Update user purchase history
    this.updateUserPurchaseHistory(userId, purchase);
    
    // Track with analytics framework
    this.analytics.track('Credits Purchased', {
      user_id: userId,
      package_type: purchase.package_type,
      credits_purchased: purchase.credits_purchased,
      amount_paid: purchase.amount_paid,
      currency: purchase.currency,
      payment_method: purchase.payment_method,
      customer_lifetime_value: purchase.customer_lifetime_value,
      purchase_frequency: purchase.purchase_frequency
    });
    
    // Update revenue metrics
    this.updateRevenueMetrics(purchase);
    
    // Update user segmentation
    this.updateUserSegmentation(userId);
    
    // Check for purchase patterns
    this.analyzePurchasePatterns(userId, purchase);
    
    this.emit('credit_purchased', purchase);
    
    return purchase;
  }
  
  trackCreditRefund(userId, refundData) {
    const refund = {
      id: this.generateRefundId(),
      user_id: userId,
      original_purchase_id: refundData.originalPurchaseId,
      timestamp: Date.now(),
      
      // Refund details
      credits_refunded: refundData.creditsRefunded,
      amount_refunded: refundData.amountRefunded,
      currency: refundData.currency || 'USD',
      refund_reason: refundData.reason,
      refund_type: refundData.type || 'full', // full, partial
      
      // Processing details
      refund_processor: refundData.processor || 'stripe',
      refund_status: refundData.status || 'completed',
      refund_method: refundData.method,
      
      // Business impact
      revenue_impact: -refundData.amountRefunded,
      churn_risk_increase: 0.2 // Refunds increase churn risk
    };
    
    // Track with analytics framework
    this.analytics.track('Credits Refunded', {
      user_id: userId,
      credits_refunded: refund.credits_refunded,
      amount_refunded: refund.amount_refunded,
      refund_reason: refund.refund_reason,
      revenue_impact: refund.revenue_impact
    });
    
    // Update revenue metrics (negative impact)
    this.updateRevenueMetrics(refund, true);
    
    // Update churn prediction
    this.updateChurnPrediction(userId, { refund: true });
    
    this.emit('credit_refunded', refund);
    
    return refund;
  }
  
  // ==========================================================================
  // BUSINESS INTELLIGENCE ANALYSIS
  // ==========================================================================
  
  analyzeRevenueMetrics(period = 'daily') {
    const windowMs = this.config.analysisWindows[period];
    const startTime = Date.now() - windowMs;
    
    // Get purchases in the period
    const periodPurchases = Array.from(this.purchaseHistory.values())
      .filter(purchase => purchase.timestamp >= startTime);
    
    // Get credit usage in the period
    const periodUsage = Array.from(this.creditTransactions.values())
      .filter(transaction => transaction.timestamp >= startTime);
    
    const metrics = {
      period: period,
      start_time: startTime,
      end_time: Date.now(),
      analysis_timestamp: Date.now(),
      
      // Revenue metrics
      total_revenue: 0,
      gross_revenue: 0,
      net_revenue: 0,
      refunded_revenue: 0,
      
      // Purchase metrics
      total_purchases: periodPurchases.length,
      unique_purchasers: new Set(periodPurchases.map(p => p.user_id)).size,
      average_order_value: 0,
      median_order_value: 0,
      
      // Credit metrics
      total_credits_sold: 0,
      total_credits_used: 0,
      credit_utilization_rate: 0,
      average_credits_per_purchase: 0,
      
      // User metrics
      new_customers: 0,
      returning_customers: 0,
      customer_retention_rate: 0,
      
      // Package breakdown
      package_breakdown: {},
      
      // Payment method breakdown
      payment_method_breakdown: {},
      
      // Geographic breakdown
      geographic_breakdown: {},
      
      // Conversion metrics
      trial_to_paid_conversion: 0,
      
      // Profitability metrics
      gross_margin: 0,
      customer_acquisition_cost: 0,
      lifetime_value_to_cac_ratio: 0
    };
    
    // Calculate revenue metrics
    periodPurchases.forEach(purchase => {
      metrics.total_revenue += purchase.amount_paid;
      metrics.gross_revenue += purchase.amount_paid;
      metrics.total_credits_sold += purchase.credits_purchased;
      
      // Package breakdown
      if (!metrics.package_breakdown[purchase.package_type]) {
        metrics.package_breakdown[purchase.package_type] = {
          count: 0,
          revenue: 0,
          credits: 0
        };
      }
      metrics.package_breakdown[purchase.package_type].count++;
      metrics.package_breakdown[purchase.package_type].revenue += purchase.amount_paid;
      metrics.package_breakdown[purchase.package_type].credits += purchase.credits_purchased;
      
      // Payment method breakdown
      if (!metrics.payment_method_breakdown[purchase.payment_method]) {
        metrics.payment_method_breakdown[purchase.payment_method] = {
          count: 0,
          revenue: 0
        };
      }
      metrics.payment_method_breakdown[purchase.payment_method].count++;
      metrics.payment_method_breakdown[purchase.payment_method].revenue += purchase.amount_paid;
      
      // Geographic breakdown
      if (purchase.ip_country) {
        if (!metrics.geographic_breakdown[purchase.ip_country]) {
          metrics.geographic_breakdown[purchase.ip_country] = {
            count: 0,
            revenue: 0
          };
        }
        metrics.geographic_breakdown[purchase.ip_country].count++;
        metrics.geographic_breakdown[purchase.ip_country].revenue += purchase.amount_paid;
      }
    });
    
    // Calculate credit usage metrics
    periodUsage.forEach(usage => {
      metrics.total_credits_used += usage.credits_used;
    });
    
    // Calculate derived metrics
    if (metrics.total_purchases > 0) {
      metrics.average_order_value = metrics.total_revenue / metrics.total_purchases;
      metrics.average_credits_per_purchase = metrics.total_credits_sold / metrics.total_purchases;
      
      const orderValues = periodPurchases.map(p => p.amount_paid).sort((a, b) => a - b);
      metrics.median_order_value = this.calculateMedian(orderValues);
    }
    
    if (metrics.total_credits_sold > 0) {
      metrics.credit_utilization_rate = metrics.total_credits_used / metrics.total_credits_sold;
    }
    
    // Calculate customer metrics
    const uniquePurchasers = new Set(periodPurchases.map(p => p.user_id));
    metrics.new_customers = Array.from(uniquePurchasers).filter(userId => {
      return this.isNewCustomer(userId, startTime);
    }).length;
    metrics.returning_customers = metrics.unique_purchasers - metrics.new_customers;
    
    // Store metrics
    const metricsKey = `${period}_${Date.now()}`;
    this.revenueMetrics.set(metricsKey, metrics);
    
    // Track with analytics framework
    this.analytics.track('Revenue Analysis', {
      period: period,
      total_revenue: metrics.total_revenue,
      total_purchases: metrics.total_purchases,
      unique_purchasers: metrics.unique_purchasers,
      average_order_value: metrics.average_order_value,
      credit_utilization_rate: metrics.credit_utilization_rate,
      new_customers: metrics.new_customers,
      returning_customers: metrics.returning_customers
    });
    
    this.emit('revenue_analyzed', metrics);
    
    return metrics;
  }
  
  generateBusinessIntelligenceReport(period = 'weekly') {
    const revenueMetrics = this.analyzeRevenueMetrics(period);
    const userSegmentAnalysis = this.analyzeUserSegments();
    const churnAnalysis = this.analyzeChurnRisk();
    const featureRevenueAnalysis = this.analyzeFeatureRevenue(period);
    
    const report = {
      report_id: this.generateReportId(),
      period: period,
      generated_at: Date.now(),
      
      // Executive summary
      executive_summary: {
        total_revenue: revenueMetrics.total_revenue,
        revenue_growth: this.calculateRevenueGrowth(period),
        customer_count: revenueMetrics.unique_purchasers,
        customer_growth: this.calculateCustomerGrowth(period),
        average_revenue_per_user: revenueMetrics.total_revenue / revenueMetrics.unique_purchasers,
        churn_rate: churnAnalysis.overall_churn_rate,
        key_insights: this.generateKeyInsights(revenueMetrics, userSegmentAnalysis, churnAnalysis)
      },
      
      // Detailed metrics
      revenue_metrics: revenueMetrics,
      user_segments: userSegmentAnalysis,
      churn_analysis: churnAnalysis,
      feature_revenue: featureRevenueAnalysis,
      
      // Predictions and recommendations
      predictions: {
        next_period_revenue: this.predictRevenue(period),
        churn_risk_users: this.identifyChurnRiskUsers(),
        growth_opportunities: this.identifyGrowthOpportunities()
      },
      
      // Action items
      recommendations: this.generateBusinessRecommendations(revenueMetrics, userSegmentAnalysis, churnAnalysis)
    };
    
    // Track report generation
    this.analytics.track('BI Report Generated', {
      report_id: report.report_id,
      period: period,
      total_revenue: report.executive_summary.total_revenue,
      customer_count: report.executive_summary.customer_count,
      churn_rate: report.executive_summary.churn_rate
    });
    
    this.emit('bi_report_generated', report);
    
    return report;
  }
  
  analyzeCohortRevenue(period = 'monthly') {
    const cohortAnalysis = {
      period: period,
      analysis_timestamp: Date.now(),
      cohorts: []
    };
    
    const periodMs = this.config.analysisWindows[period];
    const currentPeriod = Math.floor(Date.now() / periodMs);
    
    // Analyze last 12 cohorts
    for (let cohortOffset = 0; cohortOffset < 12; cohortOffset++) {
      const cohortPeriod = currentPeriod - cohortOffset;
      const cohortStart = cohortPeriod * periodMs;
      const cohortEnd = cohortStart + periodMs;
      
      // Get users who made their first purchase in this cohort
      const cohortUsers = this.getNewCustomersInPeriod(cohortStart, cohortEnd);
      
      if (cohortUsers.length === 0) continue;
      
      const cohort = {
        cohort_period: cohortPeriod,
        cohort_start: cohortStart,
        cohort_end: cohortEnd,
        initial_customers: cohortUsers.length,
        revenue_by_period: {}
      };
      
      // Calculate revenue for each subsequent period
      for (let revenuePeriod = 0; revenuePeriod <= cohortOffset; revenuePeriod++) {
        const revenueStart = cohortStart + (revenuePeriod * periodMs);
        const revenueEnd = revenueStart + periodMs;
        
        let periodRevenue = 0;
        let activeCustomers = 0;
        
        cohortUsers.forEach(userId => {
          const userRevenue = this.getUserRevenueInPeriod(userId, revenueStart, revenueEnd);
          if (userRevenue > 0) {
            periodRevenue += userRevenue;
            activeCustomers++;
          }
        });
        
        cohort.revenue_by_period[`period_${revenuePeriod}`] = {
          revenue: periodRevenue,
          active_customers: activeCustomers,
          revenue_per_customer: activeCustomers > 0 ? periodRevenue / activeCustomers : 0,
          retention_rate: activeCustomers / cohort.initial_customers
        };
      }
      
      cohortAnalysis.cohorts.push(cohort);
    }
    
    // Calculate cohort summary metrics
    cohortAnalysis.summary = this.calculateCohortSummary(cohortAnalysis.cohorts);
    
    this.emit('cohort_revenue_analyzed', cohortAnalysis);
    
    return cohortAnalysis;
  }
  
  // ==========================================================================
  // USER SEGMENTATION AND LIFETIME VALUE
  // ==========================================================================
  
  analyzeUserSegments() {
    const segmentAnalysis = {
      analysis_timestamp: Date.now(),
      segments: {},
      total_users: 0,
      total_revenue: 0
    };
    
    // Initialize segment data
    this.userSegments.forEach((segment, segmentId) => {
      segmentAnalysis.segments[segmentId] = {
        name: segment.name,
        user_count: 0,
        revenue: 0,
        average_revenue_per_user: 0,
        average_credits_used: 0,
        retention_rate: 0,
        churn_rate: 0,
        characteristics: segment.characteristics
      };
    });
    
    // Analyze each user
    const allUsers = this.getAllUsers();
    
    allUsers.forEach(userId => {
      const userMetrics = this.calculateUserMetrics(userId);
      const userSegment = this.classifyUserSegment(userMetrics);
      
      if (userSegment && segmentAnalysis.segments[userSegment]) {
        const segment = segmentAnalysis.segments[userSegment];
        segment.user_count++;
        segment.revenue += userMetrics.total_spent;
        segment.average_credits_used += userMetrics.total_credits_used;
        
        segmentAnalysis.total_users++;
        segmentAnalysis.total_revenue += userMetrics.total_spent;
      }
    });
    
    // Calculate segment averages
    Object.values(segmentAnalysis.segments).forEach(segment => {
      if (segment.user_count > 0) {
        segment.average_revenue_per_user = segment.revenue / segment.user_count;
        segment.average_credits_used = segment.average_credits_used / segment.user_count;
        segment.retention_rate = this.calculateSegmentRetentionRate(segment);
        segment.churn_rate = 1 - segment.retention_rate;
      }
    });
    
    this.emit('user_segments_analyzed', segmentAnalysis);
    
    return segmentAnalysis;
  }
  
  calculateCustomerLifetimeValue(userId) {
    const userPurchases = this.getUserPurchases(userId);
    const userUsage = this.getUserCreditUsage(userId);
    
    if (userPurchases.length === 0) return 0;
    
    // Calculate historical LTV
    const totalRevenue = userPurchases.reduce((sum, purchase) => sum + purchase.amount_paid, 0);
    const firstPurchase = Math.min(...userPurchases.map(p => p.timestamp));
    const daysSinceFirstPurchase = (Date.now() - firstPurchase) / (24 * 60 * 60 * 1000);
    
    // Calculate purchase frequency
    const purchaseFrequency = userPurchases.length / Math.max(daysSinceFirstPurchase / 30, 1); // purchases per month
    
    // Calculate average order value
    const averageOrderValue = totalRevenue / userPurchases.length;
    
    // Calculate churn probability
    const churnProbability = this.calculateUserChurnProbability(userId);
    
    // Predict future value
    const monthsToChurn = churnProbability > 0 ? 1 / churnProbability : 12; // Assume 12 months if low churn risk
    const predictedFutureValue = purchaseFrequency * averageOrderValue * monthsToChurn;
    
    return {
      historical_value: totalRevenue,
      predicted_future_value: predictedFutureValue,
      total_lifetime_value: totalRevenue + predictedFutureValue,
      purchase_frequency: purchaseFrequency,
      average_order_value: averageOrderValue,
      churn_probability: churnProbability,
      months_to_churn: monthsToChurn
    };
  }
  
  // ==========================================================================
  // CHURN PREDICTION AND ANALYSIS
  // ==========================================================================
  
  setupChurnPrediction() {
    // Run churn prediction analysis daily
    setInterval(() => {
      this.updateChurnPredictions();
    }, this.config.analysisWindows.daily);
  }
  
  updateChurnPredictions() {
    const allUsers = this.getAllUsers();
    
    allUsers.forEach(userId => {
      const churnRisk = this.calculateUserChurnRisk(userId);
      
      this.churnPredictions.set(userId, {
        user_id: userId,
        churn_risk_score: churnRisk.score,
        churn_probability: churnRisk.probability,
        risk_factors: churnRisk.factors,
        predicted_churn_date: churnRisk.predictedChurnDate,
        recommended_actions: churnRisk.recommendedActions,
        last_updated: Date.now()
      });
      
      // Track high-risk users
      if (churnRisk.score > this.config.churnRiskThreshold) {
        this.analytics.track('High Churn Risk Detected', {
          user_id: userId,
          churn_risk_score: churnRisk.score,
          churn_probability: churnRisk.probability,
          primary_risk_factors: churnRisk.factors.slice(0, 3)
        });
      }
    });
  }
  
  calculateUserChurnRisk(userId) {
    const userMetrics = this.calculateUserMetrics(userId);
    const riskFactors = [];
    let riskScore = 0;
    
    // Factor 1: Days since last activity
    const daysSinceLastActivity = (Date.now() - userMetrics.last_activity) / (24 * 60 * 60 * 1000);
    if (daysSinceLastActivity > 30) {
      riskFactors.push({ factor: 'inactive_30_days', weight: 0.3, value: daysSinceLastActivity });
      riskScore += 0.3;
    } else if (daysSinceLastActivity > 14) {
      riskFactors.push({ factor: 'inactive_14_days', weight: 0.2, value: daysSinceLastActivity });
      riskScore += 0.2;
    }
    
    // Factor 2: Declining usage trend
    const usageTrend = this.calculateUsageTrend(userId);
    if (usageTrend < -0.5) {
      riskFactors.push({ factor: 'declining_usage', weight: 0.25, value: usageTrend });
      riskScore += 0.25;
    }
    
    // Factor 3: Low credit balance
    if (userMetrics.current_credits < 5) {
      riskFactors.push({ factor: 'low_credits', weight: 0.15, value: userMetrics.current_credits });
      riskScore += 0.15;
    }
    
    // Factor 4: High error rate
    if (userMetrics.error_rate > 0.3) {
      riskFactors.push({ factor: 'high_error_rate', weight: 0.2, value: userMetrics.error_rate });
      riskScore += 0.2;
    }
    
    // Factor 5: Support tickets
    const supportTickets = userMetrics.support_tickets || 0;
    if (supportTickets > 2) {
      riskFactors.push({ factor: 'multiple_support_tickets', weight: 0.15, value: supportTickets });
      riskScore += 0.15;
    }
    
    // Factor 6: Refund history
    if (userMetrics.refund_count > 0) {
      riskFactors.push({ factor: 'refund_history', weight: 0.25, value: userMetrics.refund_count });
      riskScore += 0.25;
    }
    
    // Factor 7: Feature adoption
    if (userMetrics.features_used < 2) {
      riskFactors.push({ factor: 'low_feature_adoption', weight: 0.1, value: userMetrics.features_used });
      riskScore += 0.1;
    }
    
    // Cap risk score at 1.0
    riskScore = Math.min(riskScore, 1.0);
    
    // Calculate churn probability (sigmoid function)
    const churnProbability = 1 / (1 + Math.exp(-5 * (riskScore - 0.5)));
    
    // Predict churn date
    const daysToChurn = riskScore > 0.7 ? 30 : riskScore > 0.5 ? 60 : 90;
    const predictedChurnDate = Date.now() + (daysToChurn * 24 * 60 * 60 * 1000);
    
    // Generate recommended actions
    const recommendedActions = this.generateChurnPreventionActions(riskFactors, userMetrics);
    
    return {
      score: riskScore,
      probability: churnProbability,
      factors: riskFactors,
      predictedChurnDate: predictedChurnDate,
      recommendedActions: recommendedActions
    };
  }
  
  analyzeChurnRisk() {
    const analysis = {
      analysis_timestamp: Date.now(),
      total_users: 0,
      high_risk_users: 0,
      medium_risk_users: 0,
      low_risk_users: 0,
      overall_churn_rate: 0,
      churn_by_segment: {},
      top_churn_factors: [],
      predicted_monthly_churn: 0
    };
    
    const allPredictions = Array.from(this.churnPredictions.values());
    analysis.total_users = allPredictions.length;
    
    // Categorize users by risk level
    allPredictions.forEach(prediction => {
      if (prediction.churn_risk_score > 0.7) {
        analysis.high_risk_users++;
      } else if (prediction.churn_risk_score > 0.4) {
        analysis.medium_risk_users++;
      } else {
        analysis.low_risk_users++;
      }
    });
    
    // Calculate overall churn rate (based on high-risk users)
    analysis.overall_churn_rate = analysis.high_risk_users / analysis.total_users;
    
    // Analyze churn factors
    const factorCounts = {};
    allPredictions.forEach(prediction => {
      prediction.risk_factors.forEach(factor => {
        if (!factorCounts[factor.factor]) {
          factorCounts[factor.factor] = { count: 0, total_weight: 0 };
        }
        factorCounts[factor.factor].count++;
        factorCounts[factor.factor].total_weight += factor.weight;
      });
    });
    
    // Sort factors by impact
    analysis.top_churn_factors = Object.entries(factorCounts)
      .map(([factor, data]) => ({
        factor: factor,
        affected_users: data.count,
        average_weight: data.total_weight / data.count,
        impact_score: (data.count / analysis.total_users) * (data.total_weight / data.count)
      }))
      .sort((a, b) => b.impact_score - a.impact_score)
      .slice(0, 10);
    
    // Predict monthly churn
    const highRiskUsers = allPredictions.filter(p => p.churn_risk_score > 0.7);
    analysis.predicted_monthly_churn = highRiskUsers.length * 0.5; // Assume 50% of high-risk users churn monthly
    
    this.emit('churn_risk_analyzed', analysis);
    
    return analysis;
  }
  
  // ==========================================================================
  // FEATURE REVENUE ANALYSIS
  // ==========================================================================
  
  analyzeFeatureRevenue(period = 'monthly') {
    const windowMs = this.config.analysisWindows[period];
    const startTime = Date.now() - windowMs;
    
    const featureAnalysis = {
      period: period,
      analysis_timestamp: Date.now(),
      features: {}
    };
    
    // Get credit usage in the period
    const periodUsage = Array.from(this.creditTransactions.values())
      .filter(transaction => transaction.timestamp >= startTime);
    
    // Analyze each feature
    Object.keys(this.config.featureCosts).forEach(featureId => {
      const featureUsage = periodUsage.filter(usage => usage.feature_id === featureId);
      
      const analysis = {
        feature_id: featureId,
        usage_count: featureUsage.length,
        unique_users: new Set(featureUsage.map(u => u.user_id)).size,
        total_credits_used: featureUsage.reduce((sum, u) => sum + u.credits_used, 0),
        total_revenue_attributed: featureUsage.reduce((sum, u) => sum + u.revenue_attribution, 0),
        average_credits_per_use: 0,
        success_rate: 0,
        user_satisfaction: 0,
        processing_cost: featureUsage.reduce((sum, u) => sum + u.estimated_cost, 0),
        profit_margin: 0
      };
      
      if (analysis.usage_count > 0) {
        analysis.average_credits_per_use = analysis.total_credits_used / analysis.usage_count;
        analysis.success_rate = featureUsage.filter(u => u.processing_success).length / analysis.usage_count;
        
        const satisfactionScores = featureUsage
          .filter(u => u.user_satisfaction !== undefined)
          .map(u => u.user_satisfaction);
        
        if (satisfactionScores.length > 0) {
          analysis.user_satisfaction = satisfactionScores.reduce((sum, score) => sum + score, 0) / satisfactionScores.length;
        }
        
        analysis.profit_margin = (analysis.total_revenue_attributed - analysis.processing_cost) / analysis.total_revenue_attributed;
      }
      
      featureAnalysis.features[featureId] = analysis;
    });
    
    // Calculate feature rankings
    featureAnalysis.rankings = {
      by_revenue: Object.values(featureAnalysis.features)
        .sort((a, b) => b.total_revenue_attributed - a.total_revenue_attributed),
      by_usage: Object.values(featureAnalysis.features)
        .sort((a, b) => b.usage_count - a.usage_count),
      by_profit_margin: Object.values(featureAnalysis.features)
        .sort((a, b) => b.profit_margin - a.profit_margin)
    };
    
    this.emit('feature_revenue_analyzed', featureAnalysis);
    
    return featureAnalysis;
  }
  
  // ==========================================================================
  // PREDICTIVE ANALYTICS
  // ==========================================================================
  
  predictRevenue(period = 'monthly') {
    const historicalData = this.getHistoricalRevenueData(period, 6); // Last 6 periods
    
    if (historicalData.length < 3) {
      return { prediction: 0, confidence: 0, method: 'insufficient_data' };
    }
    
    // Simple linear regression for trend prediction
    const revenues = historicalData.map(data => data.revenue);
    const trend = this.calculateLinearTrend(revenues);
    
    // Seasonal adjustment (if applicable)
    const seasonalFactor = this.calculateSeasonalFactor(historicalData);
    
    // Base prediction on trend
    const basePrediction = revenues[revenues.length - 1] + trend;
    const seasonalPrediction = basePrediction * seasonalFactor;
    
    // Calculate confidence based on trend consistency
    const trendConsistency = this.calculateTrendConsistency(revenues);
    const confidence = Math.min(trendConsistency, 0.95);
    
    return {
      prediction: Math.max(seasonalPrediction, 0),
      confidence: confidence,
      method: 'linear_regression_with_seasonal',
      trend: trend,
      seasonal_factor: seasonalFactor,
      base_prediction: basePrediction,
      historical_data: historicalData
    };
  }
  
  identifyGrowthOpportunities() {
    const opportunities = [];
    
    // Analyze user segments for expansion opportunities
    const segmentAnalysis = this.analyzeUserSegments();
    
    Object.entries(segmentAnalysis.segments).forEach(([segmentId, segment]) => {
      if (segment.user_count > 0) {
        // Low-spending segments with high usage
        if (segment.average_revenue_per_user < 20 && segment.average_credits_used > 50) {
          opportunities.push({
            type: 'upsell_opportunity',
            segment: segmentId,
            description: `${segment.name} users have high usage but low spending`,
            potential_impact: 'medium',
            recommended_action: 'targeted_upsell_campaign'
          });
        }
        
        // High-value segments with declining usage
        if (segment.average_revenue_per_user > 100 && segment.retention_rate < 0.8) {
          opportunities.push({
            type: 'retention_opportunity',
            segment: segmentId,
            description: `${segment.name} users are high-value but showing retention issues`,
            potential_impact: 'high',
            recommended_action: 'retention_campaign'
          });
        }
      }
    });
    
    // Analyze feature adoption for cross-sell opportunities
    const featureAnalysis = this.analyzeFeatureRevenue();
    
    Object.values(featureAnalysis.features).forEach(feature => {
      if (feature.unique_users < segmentAnalysis.total_users * 0.3 && feature.user_satisfaction > 4.0) {
        opportunities.push({
          type: 'cross_sell_opportunity',
          feature: feature.feature_id,
          description: `${feature.feature_id} has high satisfaction but low adoption`,
          potential_impact: 'medium',
          recommended_action: 'feature_promotion_campaign'
        });
      }
    });
    
    // Identify pricing optimization opportunities
    const pricingOpportunities = this.identifyPricingOpportunities();
    opportunities.push(...pricingOpportunities);
    
    return opportunities.sort((a, b) => {
      const impactOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return impactOrder[b.potential_impact] - impactOrder[a.potential_impact];
    });
  }
  
  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================
  
  updateUserCreditHistory(userId, transaction) {
    if (!this.userCreditHistory.has(userId)) {
      this.userCreditHistory.set(userId, []);
    }
    
    this.userCreditHistory.get(userId).push(transaction);
  }
  
  updateUserPurchaseHistory(userId, purchase) {
    const userKey = `purchases_${userId}`;
    if (!this.purchaseHistory.has(userKey)) {
      this.purchaseHistory.set(userKey, []);
    }
    
    this.purchaseHistory.get(userKey).push(purchase);
  }
  
  calculateProcessingCost(featureId, usageData) {
    // Simplified cost calculation - in production, this would be more sophisticated
    const baseCosts = {
      text_summarization: 0.01,
      audio_transcription: 0.05,
      video_transcription: 0.08,
      document_processing: 0.03,
      bulk_processing: 0.02
    };
    
    const baseCost = baseCosts[featureId] || 0.01;
    const sizeFactor = (usageData.contentSize || 1000) / 1000; // Scale by content size
    const timeFactor = (usageData.processingTime || 1000) / 1000; // Scale by processing time
    
    return baseCost * sizeFactor * timeFactor;
  }
  
  calculateRevenueAttribution(userId, creditsUsed) {
    const userPurchases = this.getUserPurchases(userId);
    if (userPurchases.length === 0) return 0;
    
    // Calculate weighted average price per credit
    let totalCredits = 0;
    let totalSpent = 0;
    
    userPurchases.forEach(purchase => {
      totalCredits += purchase.credits_purchased;
      totalSpent += purchase.amount_paid;
    });
    
    const pricePerCredit = totalSpent / totalCredits;
    return creditsUsed * pricePerCredit;
  }
  
  updateRealTimeMetrics(transaction) {
    // Update real-time business metrics
    // This would typically update a real-time dashboard
  }
  
  updateRevenueMetrics(purchase, isRefund = false) {
    const multiplier = isRefund ? -1 : 1;
    
    // Update daily, weekly, monthly metrics
    ['daily', 'weekly', 'monthly'].forEach(period => {
      const key = `${period}_${this.getPeriodKey(period)}`;
      
      if (!this.revenueMetrics.has(key)) {
        this.revenueMetrics.set(key, {
          period: period,
          revenue: 0,
          purchases: 0,
          customers: new Set()
        });
      }
      
      const metrics = this.revenueMetrics.get(key);
      metrics.revenue += purchase.amount_paid * multiplier;
      metrics.purchases += 1 * multiplier;
      metrics.customers.add(purchase.user_id);
    });
  }
  
  updateUserSegmentation(userId) {
    const userMetrics = this.calculateUserMetrics(userId);
    const newSegment = this.classifyUserSegment(userMetrics);
    
    // Track segment changes
    const currentSegment = this.getUserSegment(userId);
    if (currentSegment !== newSegment) {
      this.analytics.track('User Segment Changed', {
        user_id: userId,
        previous_segment: currentSegment,
        new_segment: newSegment,
        total_spent: userMetrics.total_spent,
        credits_used: userMetrics.total_credits_used
      });
    }
  }
  
  calculateUserMetrics(userId) {
    const purchases = this.getUserPurchases(userId);
    const usage = this.getUserCreditUsage(userId);
    
    const metrics = {
      user_id: userId,
      total_spent: purchases.reduce((sum, p) => sum + p.amount_paid, 0),
      total_purchases: purchases.length,
      total_credits_purchased: purchases.reduce((sum, p) => sum + p.credits_purchased, 0),
      total_credits_used: usage.reduce((sum, u) => sum + u.credits_used, 0),
      current_credits: 0, // This would come from user account data
      first_purchase: purchases.length > 0 ? Math.min(...purchases.map(p => p.timestamp)) : null,
      last_purchase: purchases.length > 0 ? Math.max(...purchases.map(p => p.timestamp)) : null,
      last_activity: usage.length > 0 ? Math.max(...usage.map(u => u.timestamp)) : null,
      error_rate: usage.length > 0 ? usage.filter(u => !u.processing_success).length / usage.length : 0,
      features_used: new Set(usage.map(u => u.feature_id)).size,
      refund_count: 0, // This would come from refund data
      support_tickets: 0 // This would come from support system
    };
    
    // Calculate current credits (simplified)
    metrics.current_credits = Math.max(0, metrics.total_credits_purchased - metrics.total_credits_used);
    
    return metrics;
  }
  
  classifyUserSegment(userMetrics) {
    // Calculate monthly averages
    const daysSinceFirstPurchase = userMetrics.first_purchase ? 
      (Date.now() - userMetrics.first_purchase) / (24 * 60 * 60 * 1000) : 0;
    const monthsSinceFirstPurchase = Math.max(daysSinceFirstPurchase / 30, 1);
    
    const creditsPerMonth = userMetrics.total_credits_used / monthsSinceFirstPurchase;
    const spentPerMonth = userMetrics.total_spent / monthsSinceFirstPurchase;
    
    // Classify based on segment criteria
    for (const [segmentId, segment] of this.userSegments) {
      const criteria = segment.criteria;
      let matches = true;
      
      if (criteria.total_spent) {
        if (criteria.total_spent.min && userMetrics.total_spent < criteria.total_spent.min) matches = false;
        if (criteria.total_spent.max && userMetrics.total_spent > criteria.total_spent.max) matches = false;
      }
      
      if (criteria.credits_per_month) {
        if (criteria.credits_per_month.min && creditsPerMonth < criteria.credits_per_month.min) matches = false;
        if (criteria.credits_per_month.max && creditsPerMonth > criteria.credits_per_month.max) matches = false;
      }
      
      if (criteria.credits_used) {
        if (criteria.credits_used.min && userMetrics.total_credits_used < criteria.credits_used.min) matches = false;
        if (criteria.credits_used.max && userMetrics.total_credits_used > criteria.credits_used.max) matches = false;
      }
      
      if (matches) {
        return segmentId;
      }
    }
    
    return 'unclassified';
  }
  
  // Helper methods for data retrieval and calculations
  getUserPurchases(userId) {
    return Array.from(this.purchaseHistory.values())
      .filter(purchase => purchase.user_id === userId);
  }
  
  getUserCreditUsage(userId) {
    return Array.from(this.creditTransactions.values())
      .filter(transaction => transaction.user_id === userId);
  }
  
  getAllUsers() {
    const users = new Set();
    
    this.purchaseHistory.forEach(purchase => users.add(purchase.user_id));
    this.creditTransactions.forEach(transaction => users.add(transaction.user_id));
    
    return Array.from(users);
  }
  
  calculateMedian(values) {
    if (values.length === 0) return 0;
    
    const sorted = values.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0 ? 
      (sorted[mid - 1] + sorted[mid]) / 2 : 
      sorted[mid];
  }
  
  generateTransactionId() {
    return 'tx_' + crypto.randomBytes(12).toString('hex');
  }
  
  generatePurchaseId() {
    return 'purchase_' + crypto.randomBytes(12).toString('hex');
  }
  
  generateRefundId() {
    return 'refund_' + crypto.randomBytes(12).toString('hex');
  }
  
  generateReportId() {
    return 'report_' + crypto.randomBytes(8).toString('hex');
  }
  
  getPeriodKey(period) {
    const now = new Date();
    
    switch (period) {
      case 'daily':
        return now.toISOString().split('T')[0];
      case 'weekly':
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        return weekStart.toISOString().split('T')[0];
      case 'monthly':
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      default:
        return now.toISOString().split('T')[0];
    }
  }
  
  // Placeholder methods that would be implemented with more sophisticated algorithms
  calculateRevenueGrowth(period) { return 0.15; } // 15% growth
  calculateCustomerGrowth(period) { return 0.12; } // 12% growth
  calculateUsageTrend(userId) { return 0.05; } // 5% increase
  calculateUserChurnProbability(userId) { return 0.1; } // 10% churn probability
  calculatePurchaseFrequency(userId) { return 1.2; } // 1.2 purchases per month
  calculateAverageOrderValue(userId) { return 25.00; } // $25 average
  isNewCustomer(userId, startTime) { return true; }
  getUserSegment(userId) { return 'regular_user'; }
  getUserPurchaseCount(userId) { return this.getUserPurchases(userId).length; }
  getUserRevenueInPeriod(userId, start, end) { return 0; }
  getNewCustomersInPeriod(start, end) { return []; }
  calculateSegmentRetentionRate(segment) { return 0.8; }
  getHistoricalRevenueData(period, count) { return []; }
  calculateLinearTrend(values) { return 0; }
  calculateSeasonalFactor(data) { return 1.0; }
  calculateTrendConsistency(values) { return 0.8; }
  identifyPricingOpportunities() { return []; }
  generateKeyInsights(revenue, segments, churn) { return []; }
  generateBusinessRecommendations(revenue, segments, churn) { return []; }
  calculateCohortSummary(cohorts) { return {}; }
  identifyChurnRiskUsers() { return []; }
  generateChurnPreventionActions(factors, metrics) { return []; }
  analyzeUsagePatterns(userId, transaction) { }
  analyzePurchasePatterns(userId, purchase) { }
  updateChurnPrediction(userId, data) { }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  CreditUsageAnalytics
};

