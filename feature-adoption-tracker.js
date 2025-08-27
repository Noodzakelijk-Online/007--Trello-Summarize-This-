// Feature Adoption and Usage Analytics for Summarize This
// Comprehensive tracking of feature usage patterns, adoption rates, and user engagement

const { EventEmitter } = require('events');
const crypto = require('crypto');

// =============================================================================
// FEATURE ADOPTION TRACKER
// =============================================================================

class FeatureAdoptionTracker extends EventEmitter {
  constructor(analyticsFramework, config = {}) {
    super();
    
    this.analytics = analyticsFramework;
    this.config = {
      // Feature tracking configuration
      trackFeatureUsage: config.trackFeatureUsage !== false,
      trackFeatureAdoption: config.trackFeatureAdoption !== false,
      trackFeatureEngagement: config.trackFeatureEngagement !== false,
      trackFeatureRetention: config.trackFeatureRetention !== false,
      trackFeatureAbandon: config.trackFeatureAbandon !== false,
      
      // Cohort analysis
      enableCohortAnalysis: config.enableCohortAnalysis !== false,
      cohortPeriods: config.cohortPeriods || ['daily', 'weekly', 'monthly'],
      
      // A/B testing
      enableABTesting: config.enableABTesting !== false,
      
      // Feature flags
      enableFeatureFlags: config.enableFeatureFlags !== false,
      
      // Adoption thresholds
      adoptionThresholds: {
        trial: 1,           // First use
        adoption: 3,        // 3 uses within 7 days
        engagement: 10,     // 10 uses within 30 days
        power_user: 50,     // 50 uses within 30 days
        ...config.adoptionThresholds
      },
      
      // Time windows for analysis
      timeWindows: {
        short: 7 * 24 * 60 * 60 * 1000,    // 7 days
        medium: 30 * 24 * 60 * 60 * 1000,  // 30 days
        long: 90 * 24 * 60 * 60 * 1000,    // 90 days
        ...config.timeWindows
      },
      
      // Privacy settings
      anonymizeData: config.anonymizeData !== false,
      
      // Debug mode
      debug: config.debug || false,
      
      ...config
    };
    
    // Feature definitions
    this.features = new Map();
    this.userFeatureUsage = new Map();
    this.featureCohorts = new Map();
    this.abTests = new Map();
    this.featureFlags = new Map();
    
    this.initialize();
  }
  
  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  
  initialize() {
    // Define core features
    this.defineFeatures();
    
    // Set up periodic analysis
    this.setupPeriodicAnalysis();
    
    // Set up cohort tracking
    this.setupCohortTracking();
    
    this.emit('initialized');
  }
  
  defineFeatures() {
    // Core features of Summarize This
    const coreFeatures = [
      {
        id: 'text_summarization',
        name: 'Text Summarization',
        category: 'ai_processing',
        type: 'core',
        description: 'AI-powered text summarization',
        success_metrics: ['completion_rate', 'satisfaction_score', 'retry_rate'],
        funnel_steps: ['initiate', 'upload', 'process', 'review', 'save']
      },
      {
        id: 'audio_transcription',
        name: 'Audio Transcription',
        category: 'ai_processing',
        type: 'core',
        description: 'Audio to text transcription',
        success_metrics: ['completion_rate', 'accuracy_rating', 'edit_rate'],
        funnel_steps: ['initiate', 'upload', 'transcribe', 'review', 'export']
      },
      {
        id: 'video_transcription',
        name: 'Video Transcription',
        category: 'ai_processing',
        type: 'core',
        description: 'Video to text transcription',
        success_metrics: ['completion_rate', 'accuracy_rating', 'edit_rate'],
        funnel_steps: ['initiate', 'upload', 'transcribe', 'review', 'export']
      },
      {
        id: 'file_upload',
        name: 'File Upload',
        category: 'file_management',
        type: 'supporting',
        description: 'File upload and management',
        success_metrics: ['upload_success_rate', 'upload_speed', 'file_size_distribution'],
        funnel_steps: ['select', 'validate', 'upload', 'confirm']
      },
      {
        id: 'credit_purchase',
        name: 'Credit Purchase',
        category: 'monetization',
        type: 'conversion',
        description: 'Credit purchase and payment',
        success_metrics: ['conversion_rate', 'average_purchase_value', 'payment_success_rate'],
        funnel_steps: ['view_pricing', 'select_package', 'payment_info', 'confirm', 'complete']
      },
      {
        id: 'user_dashboard',
        name: 'User Dashboard',
        category: 'navigation',
        type: 'supporting',
        description: 'Main user dashboard',
        success_metrics: ['time_spent', 'feature_discovery_rate', 'return_rate'],
        funnel_steps: ['load', 'explore', 'action']
      },
      {
        id: 'settings_management',
        name: 'Settings Management',
        category: 'user_management',
        type: 'supporting',
        description: 'User settings and preferences',
        success_metrics: ['completion_rate', 'save_rate', 'customization_depth'],
        funnel_steps: ['access', 'modify', 'save']
      },
      {
        id: 'history_view',
        name: 'History View',
        category: 'data_access',
        type: 'supporting',
        description: 'View processing history',
        success_metrics: ['usage_frequency', 'item_interaction_rate', 'search_usage'],
        funnel_steps: ['access', 'browse', 'interact']
      }
    ];
    
    coreFeatures.forEach(feature => {
      this.features.set(feature.id, {
        ...feature,
        created_at: Date.now(),
        usage_stats: {
          total_users: 0,
          total_uses: 0,
          successful_uses: 0,
          failed_uses: 0,
          average_duration: 0,
          last_used: null
        },
        adoption_stats: {
          trial_users: 0,
          adopted_users: 0,
          engaged_users: 0,
          power_users: 0,
          churned_users: 0
        }
      });
    });
  }
  
  // ==========================================================================
  // FEATURE USAGE TRACKING
  // ==========================================================================
  
  trackFeatureUsage(featureId, userId, usageData = {}) {
    if (!this.config.trackFeatureUsage) return;
    
    const feature = this.features.get(featureId);
    if (!feature) {
      console.warn(`Unknown feature: ${featureId}`);
      return;
    }
    
    const usage = {
      feature_id: featureId,
      feature_name: feature.name,
      feature_category: feature.category,
      feature_type: feature.type,
      user_id: userId,
      session_id: usageData.sessionId,
      timestamp: Date.now(),
      
      // Usage context
      usage_context: usageData.context || 'direct',
      entry_point: usageData.entryPoint || 'unknown',
      user_intent: usageData.intent || 'unknown',
      
      // Usage details
      duration: usageData.duration || 0,
      success: usageData.success !== false,
      error_type: usageData.errorType,
      error_message: usageData.errorMessage,
      
      // Feature-specific data
      feature_data: this.sanitizeFeatureData(usageData.featureData || {}),
      
      // User context
      user_type: usageData.userType || 'standard',
      user_tier: usageData.userTier || 'free',
      credits_used: usageData.creditsUsed || 0,
      credits_remaining: usageData.creditsRemaining,
      
      // Technical context
      device_type: usageData.deviceType,
      browser: usageData.browser,
      page_url: usageData.pageUrl,
      referrer: usageData.referrer
    };
    
    // Track with analytics framework
    this.analytics.track('Feature Used', usage);
    
    // Update feature usage statistics
    this.updateFeatureStats(featureId, usage);
    
    // Update user feature usage
    this.updateUserFeatureUsage(userId, featureId, usage);
    
    // Check for adoption milestones
    this.checkAdoptionMilestones(userId, featureId);
    
    // Analyze usage patterns
    this.analyzeUsagePatterns(userId, featureId, usage);
    
    this.emit('feature_used', usage);
  }
  
  trackFeatureFunnelStep(featureId, userId, step, stepData = {}) {
    const feature = this.features.get(featureId);
    if (!feature || !feature.funnel_steps.includes(step)) {
      return;
    }
    
    const funnelData = {
      feature_id: featureId,
      feature_name: feature.name,
      user_id: userId,
      funnel_step: step,
      step_index: feature.funnel_steps.indexOf(step),
      total_steps: feature.funnel_steps.length,
      timestamp: Date.now(),
      
      // Step context
      step_duration: stepData.duration || 0,
      step_success: stepData.success !== false,
      step_error: stepData.error,
      
      // Funnel context
      funnel_session_id: stepData.funnelSessionId || this.generateFunnelSessionId(),
      previous_step: stepData.previousStep,
      next_step: stepData.nextStep,
      
      // User context
      session_id: stepData.sessionId,
      page_url: stepData.pageUrl,
      
      ...stepData
    };
    
    this.analytics.track('Feature Funnel Step', funnelData);
    
    // Update funnel analytics
    this.updateFunnelAnalytics(featureId, step, funnelData);
    
    this.emit('funnel_step', funnelData);
  }
  
  trackFeatureAbandon(featureId, userId, abandonData = {}) {
    if (!this.config.trackFeatureAbandon) return;
    
    const feature = this.features.get(featureId);
    if (!feature) return;
    
    const abandon = {
      feature_id: featureId,
      feature_name: feature.name,
      user_id: userId,
      timestamp: Date.now(),
      
      // Abandonment context
      abandon_point: abandonData.point || 'unknown',
      abandon_reason: abandonData.reason || 'unknown',
      time_before_abandon: abandonData.timeSpent || 0,
      progress_percentage: abandonData.progressPercentage || 0,
      
      // Context
      session_id: abandonData.sessionId,
      page_url: abandonData.pageUrl,
      error_encountered: abandonData.errorEncountered || false,
      
      // User context
      user_type: abandonData.userType,
      credits_remaining: abandonData.creditsRemaining,
      previous_usage_count: this.getUserFeatureUsageCount(userId, featureId)
    };
    
    this.analytics.track('Feature Abandoned', abandon);
    
    // Update abandonment statistics
    this.updateAbandonmentStats(featureId, abandon);
    
    this.emit('feature_abandoned', abandon);
  }
  
  // ==========================================================================
  // FEATURE ADOPTION ANALYSIS
  // ==========================================================================
  
  analyzeFeatureAdoption(featureId, timeWindow = 'medium') {
    const feature = this.features.get(featureId);
    if (!feature) return null;
    
    const windowMs = this.config.timeWindows[timeWindow];
    const cutoffTime = Date.now() - windowMs;
    
    // Get users who used the feature in the time window
    const recentUsers = this.getUsersWhoUsedFeature(featureId, cutoffTime);
    
    // Categorize users by adoption level
    const adoption = {
      feature_id: featureId,
      feature_name: feature.name,
      analysis_period: timeWindow,
      analysis_timestamp: Date.now(),
      
      // User counts
      total_users: recentUsers.length,
      trial_users: 0,
      adopted_users: 0,
      engaged_users: 0,
      power_users: 0,
      churned_users: 0,
      
      // Adoption rates
      trial_rate: 0,
      adoption_rate: 0,
      engagement_rate: 0,
      power_user_rate: 0,
      churn_rate: 0,
      
      // Usage patterns
      average_uses_per_user: 0,
      median_uses_per_user: 0,
      average_session_duration: 0,
      success_rate: 0,
      
      // Time-based metrics
      time_to_adoption: 0,
      retention_rates: {
        day_1: 0,
        day_7: 0,
        day_30: 0
      }
    };
    
    // Analyze each user's adoption level
    const usageCounts = [];
    const sessionDurations = [];
    const successRates = [];
    
    recentUsers.forEach(userId => {
      const userUsage = this.getUserFeatureUsage(userId, featureId, cutoffTime);
      const usageCount = userUsage.length;
      usageCounts.push(usageCount);
      
      // Calculate user's adoption level
      if (usageCount >= this.config.adoptionThresholds.power_user) {
        adoption.power_users++;
      } else if (usageCount >= this.config.adoptionThresholds.engagement) {
        adoption.engaged_users++;
      } else if (usageCount >= this.config.adoptionThresholds.adoption) {
        adoption.adopted_users++;
      } else if (usageCount >= this.config.adoptionThresholds.trial) {
        adoption.trial_users++;
      }
      
      // Calculate session metrics
      const avgDuration = userUsage.reduce((sum, usage) => sum + usage.duration, 0) / userUsage.length;
      sessionDurations.push(avgDuration);
      
      // Calculate success rate
      const successCount = userUsage.filter(usage => usage.success).length;
      const userSuccessRate = successCount / userUsage.length;
      successRates.push(userSuccessRate);
    });
    
    // Calculate rates
    if (adoption.total_users > 0) {
      adoption.trial_rate = adoption.trial_users / adoption.total_users;
      adoption.adoption_rate = adoption.adopted_users / adoption.total_users;
      adoption.engagement_rate = adoption.engaged_users / adoption.total_users;
      adoption.power_user_rate = adoption.power_users / adoption.total_users;
    }
    
    // Calculate usage statistics
    if (usageCounts.length > 0) {
      adoption.average_uses_per_user = usageCounts.reduce((sum, count) => sum + count, 0) / usageCounts.length;
      adoption.median_uses_per_user = this.calculateMedian(usageCounts);
    }
    
    if (sessionDurations.length > 0) {
      adoption.average_session_duration = sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length;
    }
    
    if (successRates.length > 0) {
      adoption.success_rate = successRates.reduce((sum, rate) => sum + rate, 0) / successRates.length;
    }
    
    // Calculate retention rates
    adoption.retention_rates = this.calculateRetentionRates(featureId, cutoffTime);
    
    // Update feature adoption stats
    feature.adoption_stats = {
      ...feature.adoption_stats,
      trial_users: adoption.trial_users,
      adopted_users: adoption.adopted_users,
      engaged_users: adoption.engaged_users,
      power_users: adoption.power_users,
      last_analyzed: Date.now()
    };
    
    this.emit('adoption_analyzed', adoption);
    
    return adoption;
  }
  
  calculateRetentionRates(featureId, cutoffTime) {
    const retention = { day_1: 0, day_7: 0, day_30: 0 };
    
    // Get users who first used the feature in the analysis period
    const newUsers = this.getNewFeatureUsers(featureId, cutoffTime);
    
    if (newUsers.length === 0) return retention;
    
    // Calculate retention for each period
    const day1Cutoff = Date.now() - (1 * 24 * 60 * 60 * 1000);
    const day7Cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const day30Cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    let day1Retained = 0;
    let day7Retained = 0;
    let day30Retained = 0;
    
    newUsers.forEach(userId => {
      const userUsage = this.getUserFeatureUsage(userId, featureId);
      
      // Check if user used feature after day 1
      if (userUsage.some(usage => usage.timestamp > day1Cutoff)) {
        day1Retained++;
      }
      
      // Check if user used feature after day 7
      if (userUsage.some(usage => usage.timestamp > day7Cutoff)) {
        day7Retained++;
      }
      
      // Check if user used feature after day 30
      if (userUsage.some(usage => usage.timestamp > day30Cutoff)) {
        day30Retained++;
      }
    });
    
    retention.day_1 = day1Retained / newUsers.length;
    retention.day_7 = day7Retained / newUsers.length;
    retention.day_30 = day30Retained / newUsers.length;
    
    return retention;
  }
  
  // ==========================================================================
  // COHORT ANALYSIS
  // ==========================================================================
  
  setupCohortTracking() {
    if (!this.config.enableCohortAnalysis) return;
    
    // Create cohorts for each period
    this.config.cohortPeriods.forEach(period => {
      this.featureCohorts.set(period, new Map());
    });
    
    // Set up periodic cohort updates
    setInterval(() => {
      this.updateCohorts();
    }, 24 * 60 * 60 * 1000); // Daily updates
  }
  
  updateCohorts() {
    this.config.cohortPeriods.forEach(period => {
      this.features.forEach((feature, featureId) => {
        this.updateFeatureCohort(featureId, period);
      });
    });
  }
  
  updateFeatureCohort(featureId, period) {
    const cohortKey = `${featureId}_${period}`;
    const cohorts = this.featureCohorts.get(period);
    
    if (!cohorts) return;
    
    // Get period duration
    const periodMs = this.getPeriodDuration(period);
    const currentPeriod = Math.floor(Date.now() / periodMs);
    
    // Get users who first used the feature in each period
    for (let periodOffset = 0; periodOffset < 12; periodOffset++) {
      const periodStart = (currentPeriod - periodOffset) * periodMs;
      const periodEnd = periodStart + periodMs;
      
      const cohortId = `${cohortKey}_${currentPeriod - periodOffset}`;
      
      if (!cohorts.has(cohortId)) {
        const newUsers = this.getNewFeatureUsers(featureId, periodStart, periodEnd);
        
        cohorts.set(cohortId, {
          feature_id: featureId,
          period: period,
          cohort_start: periodStart,
          cohort_end: periodEnd,
          initial_users: newUsers.length,
          users: newUsers,
          retention_data: {}
        });
      }
      
      // Update retention data for existing cohort
      const cohort = cohorts.get(cohortId);
      if (cohort) {
        this.updateCohortRetention(cohort, featureId);
      }
    }
  }
  
  updateCohortRetention(cohort, featureId) {
    const periodMs = this.getPeriodDuration(cohort.period);
    const periodsElapsed = Math.floor((Date.now() - cohort.cohort_end) / periodMs);
    
    // Calculate retention for each period since cohort creation
    for (let period = 1; period <= periodsElapsed; period++) {
      const retentionKey = `period_${period}`;
      
      if (!cohort.retention_data[retentionKey]) {
        const retentionStart = cohort.cohort_end + ((period - 1) * periodMs);
        const retentionEnd = cohort.cohort_end + (period * periodMs);
        
        let retainedUsers = 0;
        
        cohort.users.forEach(userId => {
          const userUsage = this.getUserFeatureUsage(userId, featureId, retentionStart, retentionEnd);
          if (userUsage.length > 0) {
            retainedUsers++;
          }
        });
        
        cohort.retention_data[retentionKey] = {
          retained_users: retainedUsers,
          retention_rate: retainedUsers / cohort.initial_users,
          period_start: retentionStart,
          period_end: retentionEnd
        };
      }
    }
  }
  
  getCohortAnalysis(featureId, period = 'weekly', maxPeriods = 12) {
    const cohorts = this.featureCohorts.get(period);
    if (!cohorts) return null;
    
    const cohortData = [];
    const periodMs = this.getPeriodDuration(period);
    const currentPeriod = Math.floor(Date.now() / periodMs);
    
    // Collect cohort data
    for (let periodOffset = 0; periodOffset < maxPeriods; periodOffset++) {
      const cohortId = `${featureId}_${period}_${currentPeriod - periodOffset}`;
      const cohort = cohorts.get(cohortId);
      
      if (cohort) {
        cohortData.push({
          cohort_period: currentPeriod - periodOffset,
          cohort_start: new Date(cohort.cohort_start).toISOString(),
          initial_users: cohort.initial_users,
          retention_by_period: cohort.retention_data
        });
      }
    }
    
    return {
      feature_id: featureId,
      period: period,
      analysis_timestamp: Date.now(),
      cohorts: cohortData,
      summary: this.calculateCohortSummary(cohortData)
    };
  }
  
  calculateCohortSummary(cohortData) {
    if (cohortData.length === 0) return {};
    
    const summary = {
      total_cohorts: cohortData.length,
      total_initial_users: 0,
      average_cohort_size: 0,
      retention_rates: {}
    };
    
    // Calculate totals
    summary.total_initial_users = cohortData.reduce((sum, cohort) => sum + cohort.initial_users, 0);
    summary.average_cohort_size = summary.total_initial_users / cohortData.length;
    
    // Calculate average retention rates by period
    const maxPeriods = Math.max(...cohortData.map(cohort => Object.keys(cohort.retention_by_period).length));
    
    for (let period = 1; period <= maxPeriods; period++) {
      const periodKey = `period_${period}`;
      const cohortsWithPeriod = cohortData.filter(cohort => cohort.retention_by_period[periodKey]);
      
      if (cohortsWithPeriod.length > 0) {
        const avgRetention = cohortsWithPeriod.reduce((sum, cohort) => {
          return sum + cohort.retention_by_period[periodKey].retention_rate;
        }, 0) / cohortsWithPeriod.length;
        
        summary.retention_rates[periodKey] = avgRetention;
      }
    }
    
    return summary;
  }
  
  // ==========================================================================
  // A/B TESTING
  // ==========================================================================
  
  createABTest(testId, config) {
    if (!this.config.enableABTesting) return;
    
    const test = {
      id: testId,
      name: config.name,
      description: config.description,
      feature_id: config.featureId,
      
      // Test configuration
      variants: config.variants || ['control', 'treatment'],
      traffic_split: config.trafficSplit || [0.5, 0.5],
      success_metrics: config.successMetrics || ['conversion_rate'],
      
      // Test lifecycle
      status: 'draft',
      created_at: Date.now(),
      started_at: null,
      ended_at: null,
      
      // Results
      results: {
        participants: {},
        metrics: {},
        statistical_significance: null,
        winner: null
      }
    };
    
    this.abTests.set(testId, test);
    
    this.emit('ab_test_created', test);
    
    return test;
  }
  
  startABTest(testId) {
    const test = this.abTests.get(testId);
    if (!test || test.status !== 'draft') return false;
    
    test.status = 'running';
    test.started_at = Date.now();
    
    // Initialize participant tracking
    test.variants.forEach(variant => {
      test.results.participants[variant] = [];
      test.results.metrics[variant] = {};
    });
    
    this.emit('ab_test_started', test);
    
    return true;
  }
  
  assignUserToABTest(testId, userId) {
    const test = this.abTests.get(testId);
    if (!test || test.status !== 'running') return null;
    
    // Check if user is already assigned
    const existingAssignment = this.getUserABTestAssignment(testId, userId);
    if (existingAssignment) return existingAssignment;
    
    // Assign user to variant based on traffic split
    const variant = this.assignVariant(userId, test.traffic_split, test.variants);
    
    // Record assignment
    test.results.participants[variant].push({
      user_id: userId,
      assigned_at: Date.now(),
      first_exposure: Date.now()
    });
    
    this.analytics.track('AB Test Assignment', {
      test_id: testId,
      test_name: test.name,
      user_id: userId,
      variant: variant,
      feature_id: test.feature_id
    });
    
    return variant;
  }
  
  trackABTestMetric(testId, userId, metric, value) {
    const test = this.abTests.get(testId);
    if (!test || test.status !== 'running') return;
    
    const variant = this.getUserABTestAssignment(testId, userId);
    if (!variant) return;
    
    // Initialize metric tracking for variant
    if (!test.results.metrics[variant][metric]) {
      test.results.metrics[variant][metric] = [];
    }
    
    // Record metric
    test.results.metrics[variant][metric].push({
      user_id: userId,
      value: value,
      timestamp: Date.now()
    });
    
    this.analytics.track('AB Test Metric', {
      test_id: testId,
      test_name: test.name,
      user_id: userId,
      variant: variant,
      metric: metric,
      value: value,
      feature_id: test.feature_id
    });
  }
  
  analyzeABTest(testId) {
    const test = this.abTests.get(testId);
    if (!test) return null;
    
    const analysis = {
      test_id: testId,
      test_name: test.name,
      status: test.status,
      duration: test.started_at ? Date.now() - test.started_at : 0,
      analysis_timestamp: Date.now(),
      
      // Participant summary
      participants: {},
      
      // Metric analysis
      metrics: {},
      
      // Statistical analysis
      statistical_significance: {},
      
      // Recommendations
      recommendations: []
    };
    
    // Analyze participants
    test.variants.forEach(variant => {
      analysis.participants[variant] = {
        count: test.results.participants[variant].length,
        percentage: 0
      };
    });
    
    const totalParticipants = Object.values(analysis.participants).reduce((sum, p) => sum + p.count, 0);
    
    if (totalParticipants > 0) {
      test.variants.forEach(variant => {
        analysis.participants[variant].percentage = analysis.participants[variant].count / totalParticipants;
      });
    }
    
    // Analyze metrics
    test.success_metrics.forEach(metric => {
      analysis.metrics[metric] = {};
      
      test.variants.forEach(variant => {
        const metricData = test.results.metrics[variant][metric] || [];
        
        analysis.metrics[metric][variant] = {
          count: metricData.length,
          mean: this.calculateMean(metricData.map(d => d.value)),
          median: this.calculateMedian(metricData.map(d => d.value)),
          std_dev: this.calculateStdDev(metricData.map(d => d.value)),
          conversion_rate: metricData.length / (test.results.participants[variant].length || 1)
        };
      });
      
      // Calculate statistical significance
      if (test.variants.length === 2) {
        const [control, treatment] = test.variants;
        analysis.statistical_significance[metric] = this.calculateStatisticalSignificance(
          analysis.metrics[metric][control],
          analysis.metrics[metric][treatment]
        );
      }
    });
    
    // Generate recommendations
    analysis.recommendations = this.generateABTestRecommendations(analysis);
    
    return analysis;
  }
  
  // ==========================================================================
  // FEATURE FLAGS
  // ==========================================================================
  
  createFeatureFlag(flagId, config) {
    if (!this.config.enableFeatureFlags) return;
    
    const flag = {
      id: flagId,
      name: config.name,
      description: config.description,
      feature_id: config.featureId,
      
      // Flag configuration
      enabled: config.enabled || false,
      rollout_percentage: config.rolloutPercentage || 0,
      target_users: config.targetUsers || [],
      target_segments: config.targetSegments || [],
      
      // Conditions
      conditions: config.conditions || [],
      
      // Lifecycle
      created_at: Date.now(),
      updated_at: Date.now(),
      
      // Tracking
      exposures: 0,
      unique_users: new Set()
    };
    
    this.featureFlags.set(flagId, flag);
    
    this.emit('feature_flag_created', flag);
    
    return flag;
  }
  
  evaluateFeatureFlag(flagId, userId, context = {}) {
    const flag = this.featureFlags.get(flagId);
    if (!flag) return false;
    
    // Check if flag is enabled
    if (!flag.enabled) return false;
    
    // Check target users
    if (flag.target_users.length > 0 && !flag.target_users.includes(userId)) {
      return false;
    }
    
    // Check target segments
    if (flag.target_segments.length > 0) {
      const userSegments = context.segments || [];
      const hasTargetSegment = flag.target_segments.some(segment => userSegments.includes(segment));
      if (!hasTargetSegment) return false;
    }
    
    // Check conditions
    for (const condition of flag.conditions) {
      if (!this.evaluateCondition(condition, context)) {
        return false;
      }
    }
    
    // Check rollout percentage
    if (flag.rollout_percentage < 100) {
      const userHash = this.hashUserId(userId, flagId);
      const userPercentile = userHash % 100;
      if (userPercentile >= flag.rollout_percentage) {
        return false;
      }
    }
    
    // Track exposure
    flag.exposures++;
    flag.unique_users.add(userId);
    
    this.analytics.track('Feature Flag Exposure', {
      flag_id: flagId,
      flag_name: flag.name,
      user_id: userId,
      feature_id: flag.feature_id,
      enabled: true,
      context: this.sanitizeContext(context)
    });
    
    return true;
  }
  
  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================
  
  updateFeatureStats(featureId, usage) {
    const feature = this.features.get(featureId);
    if (!feature) return;
    
    const stats = feature.usage_stats;
    
    stats.total_uses++;
    stats.last_used = usage.timestamp;
    
    if (usage.success) {
      stats.successful_uses++;
    } else {
      stats.failed_uses++;
    }
    
    // Update average duration
    if (usage.duration > 0) {
      const totalDuration = stats.average_duration * (stats.total_uses - 1) + usage.duration;
      stats.average_duration = totalDuration / stats.total_uses;
    }
  }
  
  updateUserFeatureUsage(userId, featureId, usage) {
    const userKey = `${userId}_${featureId}`;
    
    if (!this.userFeatureUsage.has(userKey)) {
      this.userFeatureUsage.set(userKey, []);
    }
    
    this.userFeatureUsage.get(userKey).push(usage);
  }
  
  getUserFeatureUsage(userId, featureId, startTime = 0, endTime = Date.now()) {
    const userKey = `${userId}_${featureId}`;
    const usage = this.userFeatureUsage.get(userKey) || [];
    
    return usage.filter(u => u.timestamp >= startTime && u.timestamp <= endTime);
  }
  
  getUserFeatureUsageCount(userId, featureId, timeWindow = null) {
    const usage = this.getUserFeatureUsage(userId, featureId);
    
    if (!timeWindow) return usage.length;
    
    const cutoffTime = Date.now() - this.config.timeWindows[timeWindow];
    return usage.filter(u => u.timestamp >= cutoffTime).length;
  }
  
  checkAdoptionMilestones(userId, featureId) {
    const usageCount = this.getUserFeatureUsageCount(userId, featureId, 'medium');
    const thresholds = this.config.adoptionThresholds;
    
    // Check for milestone achievements
    if (usageCount === thresholds.trial) {
      this.analytics.track('Feature Trial', {
        feature_id: featureId,
        user_id: userId,
        usage_count: usageCount
      });
    } else if (usageCount === thresholds.adoption) {
      this.analytics.track('Feature Adopted', {
        feature_id: featureId,
        user_id: userId,
        usage_count: usageCount
      });
    } else if (usageCount === thresholds.engagement) {
      this.analytics.track('Feature Engaged', {
        feature_id: featureId,
        user_id: userId,
        usage_count: usageCount
      });
    } else if (usageCount === thresholds.power_user) {
      this.analytics.track('Power User', {
        feature_id: featureId,
        user_id: userId,
        usage_count: usageCount
      });
    }
  }
  
  analyzeUsagePatterns(userId, featureId, usage) {
    const recentUsage = this.getUserFeatureUsage(userId, featureId, Date.now() - this.config.timeWindows.short);
    
    // Detect patterns
    const patterns = [];
    
    // High frequency usage
    if (recentUsage.length >= 10) {
      patterns.push('high_frequency');
    }
    
    // Consistent usage
    const usageDays = new Set(recentUsage.map(u => new Date(u.timestamp).toDateString()));
    if (usageDays.size >= 5) {
      patterns.push('consistent_usage');
    }
    
    // Error prone usage
    const errorRate = recentUsage.filter(u => !u.success).length / recentUsage.length;
    if (errorRate > 0.3) {
      patterns.push('error_prone');
    }
    
    // Track patterns
    if (patterns.length > 0) {
      this.analytics.track('Usage Pattern Detected', {
        feature_id: featureId,
        user_id: userId,
        patterns: patterns,
        usage_count: recentUsage.length,
        error_rate: errorRate
      });
    }
  }
  
  setupPeriodicAnalysis() {
    // Run daily analysis
    setInterval(() => {
      this.features.forEach((feature, featureId) => {
        this.analyzeFeatureAdoption(featureId);
      });
    }, 24 * 60 * 60 * 1000);
  }
  
  sanitizeFeatureData(data) {
    const sanitized = {};
    
    // Remove sensitive data
    const allowedKeys = [
      'file_type', 'file_size', 'processing_time', 'word_count',
      'language', 'quality_score', 'confidence_score'
    ];
    
    for (const key of allowedKeys) {
      if (data[key] !== undefined) {
        sanitized[key] = data[key];
      }
    }
    
    return sanitized;
  }
  
  sanitizeContext(context) {
    const sanitized = {};
    
    const allowedKeys = [
      'device_type', 'browser', 'os', 'page_url', 'referrer',
      'user_tier', 'user_type', 'segments'
    ];
    
    for (const key of allowedKeys) {
      if (context[key] !== undefined) {
        sanitized[key] = context[key];
      }
    }
    
    return sanitized;
  }
  
  // Statistical utility methods
  calculateMean(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
  
  calculateMedian(values) {
    if (values.length === 0) return 0;
    
    const sorted = values.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0 ? 
      (sorted[mid - 1] + sorted[mid]) / 2 : 
      sorted[mid];
  }
  
  calculateStdDev(values) {
    if (values.length === 0) return 0;
    
    const mean = this.calculateMean(values);
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff = this.calculateMean(squaredDiffs);
    
    return Math.sqrt(avgSquaredDiff);
  }
  
  calculateStatisticalSignificance(controlMetrics, treatmentMetrics) {
    // Simplified statistical significance calculation
    // In production, use proper statistical libraries
    
    const controlMean = controlMetrics.mean;
    const treatmentMean = treatmentMetrics.mean;
    const controlStdDev = controlMetrics.std_dev;
    const treatmentStdDev = treatmentMetrics.std_dev;
    const controlCount = controlMetrics.count;
    const treatmentCount = treatmentMetrics.count;
    
    if (controlCount === 0 || treatmentCount === 0) {
      return { significant: false, p_value: 1, confidence: 0 };
    }
    
    // Calculate t-statistic (simplified)
    const pooledStdDev = Math.sqrt(
      ((controlCount - 1) * Math.pow(controlStdDev, 2) + 
       (treatmentCount - 1) * Math.pow(treatmentStdDev, 2)) / 
      (controlCount + treatmentCount - 2)
    );
    
    const standardError = pooledStdDev * Math.sqrt(1/controlCount + 1/treatmentCount);
    const tStatistic = Math.abs(treatmentMean - controlMean) / standardError;
    
    // Simplified p-value calculation (use proper statistical libraries in production)
    const pValue = tStatistic > 2 ? 0.05 : 0.1;
    
    return {
      significant: pValue < 0.05,
      p_value: pValue,
      confidence: 1 - pValue,
      t_statistic: tStatistic,
      effect_size: (treatmentMean - controlMean) / pooledStdDev
    };
  }
  
  generateABTestRecommendations(analysis) {
    const recommendations = [];
    
    // Check sample size
    const totalParticipants = Object.values(analysis.participants).reduce((sum, p) => sum + p.count, 0);
    if (totalParticipants < 100) {
      recommendations.push({
        type: 'sample_size',
        message: 'Increase sample size for more reliable results',
        priority: 'high'
      });
    }
    
    // Check statistical significance
    Object.entries(analysis.statistical_significance).forEach(([metric, significance]) => {
      if (significance.significant) {
        recommendations.push({
          type: 'significant_result',
          message: `Significant difference detected in ${metric}`,
          priority: 'high'
        });
      }
    });
    
    return recommendations;
  }
  
  // Helper methods for A/B testing
  assignVariant(userId, trafficSplit, variants) {
    const userHash = this.hashUserId(userId, 'variant_assignment');
    const percentile = userHash % 100;
    
    let cumulativePercentage = 0;
    for (let i = 0; i < variants.length; i++) {
      cumulativePercentage += trafficSplit[i] * 100;
      if (percentile < cumulativePercentage) {
        return variants[i];
      }
    }
    
    return variants[0]; // Fallback
  }
  
  getUserABTestAssignment(testId, userId) {
    const test = this.abTests.get(testId);
    if (!test) return null;
    
    for (const [variant, participants] of Object.entries(test.results.participants)) {
      if (participants.some(p => p.user_id === userId)) {
        return variant;
      }
    }
    
    return null;
  }
  
  hashUserId(userId, salt = '') {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(userId + salt).digest('hex');
    return parseInt(hash.substring(0, 8), 16);
  }
  
  evaluateCondition(condition, context) {
    const { key, operator, value } = condition;
    const contextValue = context[key];
    
    switch (operator) {
      case 'equals':
        return contextValue === value;
      case 'not_equals':
        return contextValue !== value;
      case 'greater_than':
        return contextValue > value;
      case 'less_than':
        return contextValue < value;
      case 'contains':
        return Array.isArray(contextValue) && contextValue.includes(value);
      case 'not_contains':
        return Array.isArray(contextValue) && !contextValue.includes(value);
      default:
        return false;
    }
  }
  
  getPeriodDuration(period) {
    const durations = {
      'daily': 24 * 60 * 60 * 1000,
      'weekly': 7 * 24 * 60 * 60 * 1000,
      'monthly': 30 * 24 * 60 * 60 * 1000
    };
    
    return durations[period] || durations.weekly;
  }
  
  getUsersWhoUsedFeature(featureId, cutoffTime = 0) {
    const users = new Set();
    
    this.userFeatureUsage.forEach((usage, userKey) => {
      const [userId, fId] = userKey.split('_');
      if (fId === featureId) {
        const recentUsage = usage.filter(u => u.timestamp >= cutoffTime);
        if (recentUsage.length > 0) {
          users.add(userId);
        }
      }
    });
    
    return Array.from(users);
  }
  
  getNewFeatureUsers(featureId, startTime, endTime = Date.now()) {
    const newUsers = [];
    
    this.userFeatureUsage.forEach((usage, userKey) => {
      const [userId, fId] = userKey.split('_');
      if (fId === featureId) {
        const firstUsage = usage.reduce((earliest, current) => 
          current.timestamp < earliest.timestamp ? current : earliest
        );
        
        if (firstUsage.timestamp >= startTime && firstUsage.timestamp < endTime) {
          newUsers.push(userId);
        }
      }
    });
    
    return newUsers;
  }
  
  updateFunnelAnalytics(featureId, step, funnelData) {
    // Implementation for funnel analytics
    // This would typically update a database or analytics store
  }
  
  updateAbandonmentStats(featureId, abandon) {
    const feature = this.features.get(featureId);
    if (feature) {
      // Update abandonment statistics
      // This would typically be stored in a database
    }
  }
  
  generateFunnelSessionId() {
    return 'funnel_' + crypto.randomBytes(8).toString('hex');
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  FeatureAdoptionTracker
};

