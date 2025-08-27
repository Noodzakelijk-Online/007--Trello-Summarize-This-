// GDPR and Privacy Compliance Module for Summarize This
// Comprehensive privacy regulation compliance (GDPR, CCPA, etc.)

const crypto = require('crypto');
const { EventEmitter } = require('events');

// =============================================================================
// GDPR COMPLIANCE MANAGER
// =============================================================================

class GDPRComplianceManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      // Legal basis for processing
      legalBasis: config.legalBasis || 'consent', // consent, contract, legitimate_interest
      
      // Data retention policies
      dataRetentionPeriods: {
        analytics: 365,        // 1 year
        user_data: 2555,       // 7 years (legal requirement)
        session_data: 30,      // 30 days
        error_logs: 90,        // 90 days
        performance_data: 180, // 6 months
        ...config.dataRetentionPeriods
      },
      
      // Privacy settings
      anonymizeData: config.anonymizeData !== false,
      pseudonymizeData: config.pseudonymizeData !== false,
      encryptSensitiveData: config.encryptSensitiveData !== false,
      
      // Consent management
      consentVersion: config.consentVersion || '1.0',
      consentLanguages: config.consentLanguages || ['en'],
      
      // Data subject rights
      enableDataExport: config.enableDataExport !== false,
      enableDataDeletion: config.enableDataDeletion !== false,
      enableDataRectification: config.enableDataRectification !== false,
      enableDataPortability: config.enableDataPortability !== false,
      
      // Breach notification
      breachNotificationEmail: config.breachNotificationEmail,
      breachNotificationWebhook: config.breachNotificationWebhook,
      
      // DPO contact
      dpoContact: config.dpoContact,
      
      ...config
    };
    
    this.consentRecords = new Map();
    this.dataProcessingLog = [];
    this.dataSubjects = new Map();
    this.encryptionKey = this.generateEncryptionKey();
    
    this.initialize();
  }
  
  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  
  initialize() {
    // Set up data retention cleanup
    this.setupDataRetentionCleanup();
    
    // Set up consent monitoring
    this.setupConsentMonitoring();
    
    // Set up data processing logging
    this.setupDataProcessingLogging();
    
    this.emit('initialized');
  }
  
  // ==========================================================================
  // CONSENT MANAGEMENT
  // ==========================================================================
  
  async recordConsent(userId, consentData) {
    const consentRecord = {
      userId: userId,
      timestamp: new Date().toISOString(),
      version: this.config.consentVersion,
      ipAddress: this.anonymizeIP(consentData.ipAddress),
      userAgent: consentData.userAgent,
      language: consentData.language || 'en',
      purposes: consentData.purposes || [],
      legitimate_interests: consentData.legitimateInterests || [],
      consent_method: consentData.method || 'explicit',
      consent_evidence: {
        checkbox_checked: consentData.checkboxChecked,
        button_clicked: consentData.buttonClicked,
        form_data: this.sanitizeFormData(consentData.formData)
      },
      withdrawal_method: null,
      is_active: true
    };
    
    // Store consent record
    const consentId = this.generateConsentId();
    this.consentRecords.set(consentId, consentRecord);
    
    // Log data processing activity
    this.logDataProcessing({
      activity: 'consent_recorded',
      userId: userId,
      legalBasis: 'consent',
      dataCategories: ['consent_data'],
      purposes: consentData.purposes,
      retention: this.config.dataRetentionPeriods.user_data
    });
    
    // Store in database
    await this.storeConsentRecord(consentId, consentRecord);
    
    this.emit('consent_recorded', { consentId, userId, consentRecord });
    
    return consentId;
  }
  
  async withdrawConsent(userId, withdrawalData) {
    // Find active consent records
    const userConsents = await this.getUserConsentRecords(userId);
    
    for (const [consentId, consent] of userConsents) {
      if (consent.is_active) {
        consent.is_active = false;
        consent.withdrawal_timestamp = new Date().toISOString();
        consent.withdrawal_method = withdrawalData.method || 'user_request';
        consent.withdrawal_evidence = {
          ip_address: this.anonymizeIP(withdrawalData.ipAddress),
          user_agent: withdrawalData.userAgent,
          form_data: this.sanitizeFormData(withdrawalData.formData)
        };
        
        // Update stored record
        await this.updateConsentRecord(consentId, consent);
        
        // Log withdrawal
        this.logDataProcessing({
          activity: 'consent_withdrawn',
          userId: userId,
          legalBasis: 'consent',
          dataCategories: ['consent_data'],
          purposes: ['consent_management']
        });
      }
    }
    
    // Trigger data deletion if required
    if (withdrawalData.deleteData) {
      await this.deleteUserData(userId, { reason: 'consent_withdrawal' });
    }
    
    this.emit('consent_withdrawn', { userId, withdrawalData });
  }
  
  async checkConsentValidity(userId, purpose) {
    const userConsents = await this.getUserConsentRecords(userId);
    
    for (const [consentId, consent] of userConsents) {
      if (consent.is_active && consent.purposes.includes(purpose)) {
        // Check if consent is still valid (not expired)
        const consentAge = Date.now() - new Date(consent.timestamp).getTime();
        const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year
        
        if (consentAge < maxAge) {
          return {
            valid: true,
            consentId: consentId,
            timestamp: consent.timestamp,
            version: consent.version
          };
        }
      }
    }
    
    return { valid: false, reason: 'no_valid_consent' };
  }
  
  // ==========================================================================
  // DATA SUBJECT RIGHTS (GDPR Articles 15-22)
  // ==========================================================================
  
  // Article 15: Right of access
  async exportUserData(userId, requestData) {
    if (!this.config.enableDataExport) {
      throw new Error('Data export is not enabled');
    }
    
    // Log the request
    this.logDataProcessing({
      activity: 'data_export_requested',
      userId: userId,
      legalBasis: 'legal_obligation',
      dataCategories: ['all_user_data'],
      purposes: ['data_subject_rights']
    });
    
    // Collect all user data
    const userData = await this.collectUserData(userId);
    
    // Create export package
    const exportPackage = {
      request_id: this.generateRequestId(),
      user_id: userId,
      export_timestamp: new Date().toISOString(),
      data_categories: Object.keys(userData),
      data: userData,
      metadata: {
        export_format: 'JSON',
        data_controller: 'Summarize This',
        retention_periods: this.config.dataRetentionPeriods,
        legal_basis: await this.getUserLegalBasis(userId)
      }
    };
    
    // Encrypt export if required
    if (this.config.encryptSensitiveData) {
      exportPackage.data = this.encryptData(JSON.stringify(exportPackage.data));
      exportPackage.encrypted = true;
    }
    
    this.emit('data_exported', { userId, exportPackage });
    
    return exportPackage;
  }
  
  // Article 16: Right to rectification
  async rectifyUserData(userId, rectificationData) {
    if (!this.config.enableDataRectification) {
      throw new Error('Data rectification is not enabled');
    }
    
    // Log the request
    this.logDataProcessing({
      activity: 'data_rectification_requested',
      userId: userId,
      legalBasis: 'legal_obligation',
      dataCategories: Object.keys(rectificationData.changes),
      purposes: ['data_subject_rights']
    });
    
    // Validate rectification request
    const validation = await this.validateRectificationRequest(userId, rectificationData);
    if (!validation.valid) {
      throw new Error(`Rectification request invalid: ${validation.reason}`);
    }
    
    // Apply changes
    const changes = [];
    for (const [field, newValue] of Object.entries(rectificationData.changes)) {
      const oldValue = await this.getUserDataField(userId, field);
      await this.updateUserDataField(userId, field, newValue);
      
      changes.push({
        field: field,
        old_value: this.anonymizeValue(oldValue),
        new_value: this.anonymizeValue(newValue),
        timestamp: new Date().toISOString()
      });
    }
    
    // Log changes
    await this.logDataRectification(userId, changes);
    
    this.emit('data_rectified', { userId, changes });
    
    return { success: true, changes: changes };
  }
  
  // Article 17: Right to erasure (Right to be forgotten)
  async deleteUserData(userId, deletionData = {}) {
    if (!this.config.enableDataDeletion) {
      throw new Error('Data deletion is not enabled');
    }
    
    // Check if deletion is legally required or permitted
    const deletionCheck = await this.checkDeletionPermission(userId, deletionData);
    if (!deletionCheck.permitted) {
      throw new Error(`Data deletion not permitted: ${deletionCheck.reason}`);
    }
    
    // Log the request
    this.logDataProcessing({
      activity: 'data_deletion_requested',
      userId: userId,
      legalBasis: 'legal_obligation',
      dataCategories: ['all_user_data'],
      purposes: ['data_subject_rights'],
      retention: 0 // Immediate deletion
    });
    
    // Collect data to be deleted (for audit trail)
    const dataToDelete = await this.collectUserData(userId);
    
    // Perform deletion
    const deletionResults = await this.performUserDataDeletion(userId);
    
    // Create deletion certificate
    const deletionCertificate = {
      certificate_id: this.generateCertificateId(),
      user_id: userId,
      deletion_timestamp: new Date().toISOString(),
      deletion_reason: deletionData.reason || 'user_request',
      data_categories_deleted: Object.keys(dataToDelete),
      deletion_method: 'secure_deletion',
      verification_hash: this.generateDeletionHash(userId, dataToDelete),
      retained_data: deletionResults.retainedData || [],
      retention_reasons: deletionResults.retentionReasons || []
    };
    
    // Store deletion certificate (required for audit)
    await this.storeDeletionCertificate(deletionCertificate);
    
    this.emit('data_deleted', { userId, deletionCertificate });
    
    return deletionCertificate;
  }
  
  // Article 20: Right to data portability
  async portUserData(userId, portabilityData) {
    if (!this.config.enableDataPortability) {
      throw new Error('Data portability is not enabled');
    }
    
    // Check if data portability applies
    const portabilityCheck = await this.checkDataPortabilityApplicability(userId);
    if (!portabilityCheck.applicable) {
      throw new Error(`Data portability not applicable: ${portabilityCheck.reason}`);
    }
    
    // Log the request
    this.logDataProcessing({
      activity: 'data_portability_requested',
      userId: userId,
      legalBasis: 'legal_obligation',
      dataCategories: ['portable_user_data'],
      purposes: ['data_subject_rights']
    });
    
    // Collect portable data (only data provided by user)
    const portableData = await this.collectPortableUserData(userId);
    
    // Format data in structured format
    const portabilityPackage = {
      request_id: this.generateRequestId(),
      user_id: userId,
      export_timestamp: new Date().toISOString(),
      format: portabilityData.format || 'JSON',
      data: this.formatPortableData(portableData, portabilityData.format),
      metadata: {
        data_controller: 'Summarize This',
        processing_basis: 'consent_or_contract',
        automated_processing: true
      }
    };
    
    this.emit('data_ported', { userId, portabilityPackage });
    
    return portabilityPackage;
  }
  
  // Article 21: Right to object
  async processObjection(userId, objectionData) {
    // Log the objection
    this.logDataProcessing({
      activity: 'processing_objection',
      userId: userId,
      legalBasis: 'legal_obligation',
      dataCategories: ['objection_data'],
      purposes: ['data_subject_rights']
    });
    
    // Check if objection is valid
    const objectionCheck = await this.validateObjection(userId, objectionData);
    if (!objectionCheck.valid) {
      return {
        objection_upheld: false,
        reason: objectionCheck.reason,
        continued_processing_basis: objectionCheck.legalBasis
      };
    }
    
    // Stop processing for objected purposes
    const stoppedProcessing = [];
    for (const purpose of objectionData.purposes) {
      await this.stopProcessingForPurpose(userId, purpose);
      stoppedProcessing.push(purpose);
    }
    
    // Record objection
    const objectionRecord = {
      user_id: userId,
      timestamp: new Date().toISOString(),
      objected_purposes: objectionData.purposes,
      objection_reason: objectionData.reason,
      objection_upheld: true,
      stopped_processing: stoppedProcessing
    };
    
    await this.storeObjectionRecord(objectionRecord);
    
    this.emit('objection_processed', { userId, objectionRecord });
    
    return {
      objection_upheld: true,
      stopped_processing: stoppedProcessing,
      objection_id: objectionRecord.objection_id
    };
  }
  
  // ==========================================================================
  // DATA PROCESSING LOGGING
  // ==========================================================================
  
  logDataProcessing(activity) {
    const logEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      activity: activity.activity,
      user_id: activity.userId,
      legal_basis: activity.legalBasis,
      data_categories: activity.dataCategories,
      purposes: activity.purposes,
      retention_period: activity.retention,
      processor: 'Summarize This',
      automated: activity.automated !== false,
      profiling: activity.profiling || false,
      third_party_sharing: activity.thirdPartySharing || false
    };
    
    this.dataProcessingLog.push(logEntry);
    
    // Persist to database
    this.storeProcessingLog(logEntry);
    
    this.emit('processing_logged', logEntry);
  }
  
  async generateProcessingReport(startDate, endDate) {
    const logs = this.dataProcessingLog.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    });
    
    const report = {
      report_id: this.generateReportId(),
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      total_activities: logs.length,
      activities_by_type: this.groupBy(logs, 'activity'),
      legal_basis_breakdown: this.groupBy(logs, 'legal_basis'),
      data_categories_processed: this.getUniqueValues(logs, 'data_categories'),
      purposes_breakdown: this.groupBy(logs, 'purposes'),
      automated_processing_count: logs.filter(log => log.automated).length,
      profiling_activities: logs.filter(log => log.profiling).length,
      third_party_sharing_count: logs.filter(log => log.third_party_sharing).length,
      compliance_issues: await this.identifyComplianceIssues(logs)
    };
    
    return report;
  }
  
  // ==========================================================================
  // DATA ANONYMIZATION AND PSEUDONYMIZATION
  // ==========================================================================
  
  anonymizeData(data, anonymizationLevel = 'standard') {
    if (typeof data !== 'object') {
      return this.anonymizeValue(data, anonymizationLevel);
    }
    
    const anonymized = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (this.isSensitiveField(key)) {
        anonymized[key] = this.anonymizeValue(value, anonymizationLevel);
      } else {
        anonymized[key] = value;
      }
    }
    
    return anonymized;
  }
  
  anonymizeValue(value, level = 'standard') {
    if (value === null || value === undefined) {
      return value;
    }
    
    const valueStr = String(value);
    
    switch (level) {
      case 'full':
        return '[REDACTED]';
        
      case 'partial':
        if (valueStr.length <= 4) {
          return '*'.repeat(valueStr.length);
        }
        return valueStr.substring(0, 2) + '*'.repeat(valueStr.length - 4) + valueStr.substring(valueStr.length - 2);
        
      case 'hash':
        return crypto.createHash('sha256').update(valueStr).digest('hex').substring(0, 8);
        
      default: // 'standard'
        if (this.isEmail(valueStr)) {
          return this.anonymizeEmail(valueStr);
        }
        if (this.isIP(valueStr)) {
          return this.anonymizeIP(valueStr);
        }
        return this.anonymizeGeneric(valueStr);
    }
  }
  
  pseudonymizeData(data, userId) {
    const pseudonymizationKey = this.generatePseudonymizationKey(userId);
    
    if (typeof data !== 'object') {
      return this.pseudonymizeValue(data, pseudonymizationKey);
    }
    
    const pseudonymized = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (this.isSensitiveField(key)) {
        pseudonymized[key] = this.pseudonymizeValue(value, pseudonymizationKey);
      } else {
        pseudonymized[key] = value;
      }
    }
    
    return pseudonymized;
  }
  
  pseudonymizeValue(value, key) {
    if (value === null || value === undefined) {
      return value;
    }
    
    // Create deterministic pseudonym
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(String(value));
    return hmac.digest('hex').substring(0, 16);
  }
  
  // ==========================================================================
  // DATA RETENTION AND CLEANUP
  // ==========================================================================
  
  setupDataRetentionCleanup() {
    // Run cleanup daily
    setInterval(() => {
      this.performDataRetentionCleanup();
    }, 24 * 60 * 60 * 1000); // 24 hours
    
    // Run initial cleanup
    setTimeout(() => {
      this.performDataRetentionCleanup();
    }, 60000); // 1 minute after startup
  }
  
  async performDataRetentionCleanup() {
    const now = new Date();
    
    for (const [category, retentionDays] of Object.entries(this.config.dataRetentionPeriods)) {
      const cutoffDate = new Date(now.getTime() - (retentionDays * 24 * 60 * 60 * 1000));
      
      try {
        const deletedCount = await this.deleteExpiredData(category, cutoffDate);
        
        if (deletedCount > 0) {
          this.logDataProcessing({
            activity: 'data_retention_cleanup',
            userId: null,
            legalBasis: 'legal_obligation',
            dataCategories: [category],
            purposes: ['data_retention'],
            retention: 0
          });
          
          this.emit('data_retention_cleanup', {
            category: category,
            cutoffDate: cutoffDate,
            deletedCount: deletedCount
          });
        }
        
      } catch (error) {
        console.error(`Failed to cleanup ${category} data:`, error);
        this.emit('cleanup_error', { category, error });
      }
    }
  }
  
  // ==========================================================================
  // BREACH DETECTION AND NOTIFICATION
  // ==========================================================================
  
  async reportDataBreach(breachData) {
    const breach = {
      breach_id: this.generateBreachId(),
      timestamp: new Date().toISOString(),
      severity: breachData.severity || 'high',
      affected_data_categories: breachData.dataCategories || [],
      affected_users_count: breachData.affectedUsersCount || 0,
      breach_description: breachData.description,
      containment_measures: breachData.containmentMeasures || [],
      notification_required: this.assessNotificationRequirement(breachData),
      risk_assessment: {
        likelihood: breachData.riskAssessment?.likelihood || 'unknown',
        impact: breachData.riskAssessment?.impact || 'unknown',
        overall_risk: breachData.riskAssessment?.overallRisk || 'high'
      }
    };
    
    // Store breach record
    await this.storeBreachRecord(breach);
    
    // Send notifications if required
    if (breach.notification_required) {
      await this.sendBreachNotifications(breach);
    }
    
    // Log the breach
    this.logDataProcessing({
      activity: 'data_breach_reported',
      userId: null,
      legalBasis: 'legal_obligation',
      dataCategories: breach.affected_data_categories,
      purposes: ['breach_management']
    });
    
    this.emit('data_breach', breach);
    
    return breach;
  }
  
  assessNotificationRequirement(breachData) {
    // GDPR Article 33 & 34 requirements
    const highRiskCategories = ['personal_data', 'financial_data', 'health_data', 'biometric_data'];
    const hasHighRiskData = breachData.dataCategories?.some(cat => highRiskCategories.includes(cat));
    
    return {
      supervisory_authority: true, // Always notify within 72 hours
      data_subjects: hasHighRiskData || breachData.affectedUsersCount > 100,
      reasoning: hasHighRiskData ? 'High risk data involved' : 'Large number of affected users'
    };
  }
  
  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================
  
  isSensitiveField(fieldName) {
    const sensitiveFields = [
      'email', 'phone', 'address', 'name', 'ip_address',
      'user_agent', 'location', 'device_id', 'session_id'
    ];
    
    return sensitiveFields.some(field => 
      fieldName.toLowerCase().includes(field)
    );
  }
  
  isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
  
  isIP(value) {
    return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(value) || 
           /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(value);
  }
  
  anonymizeEmail(email) {
    const [local, domain] = email.split('@');
    const anonymizedLocal = local.length > 2 ? 
      local.substring(0, 2) + '*'.repeat(local.length - 2) : 
      '*'.repeat(local.length);
    return `${anonymizedLocal}@${domain}`;
  }
  
  anonymizeIP(ip) {
    if (ip.includes(':')) {
      // IPv6
      const parts = ip.split(':');
      return parts.slice(0, 4).join(':') + '::';
    } else {
      // IPv4
      const parts = ip.split('.');
      return parts.slice(0, 3).join('.') + '.0';
    }
  }
  
  anonymizeGeneric(value) {
    if (value.length <= 4) {
      return '*'.repeat(value.length);
    }
    return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
  }
  
  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
  }
  
  encryptData(data) {
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }
  
  decryptData(encryptedData) {
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
  
  generateConsentId() {
    return 'consent_' + crypto.randomBytes(16).toString('hex');
  }
  
  generateRequestId() {
    return 'req_' + crypto.randomBytes(12).toString('hex');
  }
  
  generateCertificateId() {
    return 'cert_' + crypto.randomBytes(12).toString('hex');
  }
  
  generateLogId() {
    return 'log_' + crypto.randomBytes(8).toString('hex');
  }
  
  generateReportId() {
    return 'report_' + crypto.randomBytes(8).toString('hex');
  }
  
  generateBreachId() {
    return 'breach_' + crypto.randomBytes(8).toString('hex');
  }
  
  generatePseudonymizationKey(userId) {
    const hmac = crypto.createHmac('sha256', this.encryptionKey);
    hmac.update(userId);
    return hmac.digest('hex');
  }
  
  generateDeletionHash(userId, data) {
    const hash = crypto.createHash('sha256');
    hash.update(userId + JSON.stringify(data) + new Date().toISOString());
    return hash.digest('hex');
  }
  
  sanitizeFormData(formData) {
    if (!formData) return null;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(formData)) {
      if (!this.isSensitiveField(key)) {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  
  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key];
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  }
  
  getUniqueValues(array, key) {
    const values = array.flatMap(item => Array.isArray(item[key]) ? item[key] : [item[key]]);
    return [...new Set(values)];
  }
  
  // ==========================================================================
  // ABSTRACT METHODS (TO BE IMPLEMENTED BY SUBCLASS OR INJECTED)
  // ==========================================================================
  
  async storeConsentRecord(consentId, record) {
    // Implement database storage
    throw new Error('storeConsentRecord must be implemented');
  }
  
  async updateConsentRecord(consentId, record) {
    // Implement database update
    throw new Error('updateConsentRecord must be implemented');
  }
  
  async getUserConsentRecords(userId) {
    // Implement database query
    throw new Error('getUserConsentRecords must be implemented');
  }
  
  async collectUserData(userId) {
    // Implement user data collection
    throw new Error('collectUserData must be implemented');
  }
  
  async deleteExpiredData(category, cutoffDate) {
    // Implement data deletion
    throw new Error('deleteExpiredData must be implemented');
  }
  
  async storeBreachRecord(breach) {
    // Implement breach record storage
    throw new Error('storeBreachRecord must be implemented');
  }
  
  async sendBreachNotifications(breach) {
    // Implement breach notifications
    throw new Error('sendBreachNotifications must be implemented');
  }
}

// =============================================================================
// CCPA COMPLIANCE MANAGER
// =============================================================================

class CCPAComplianceManager extends GDPRComplianceManager {
  constructor(config = {}) {
    super({
      ...config,
      legalBasis: 'business_purpose', // CCPA uses different terminology
      enableDataSale: config.enableDataSale || false,
      doNotSellSignal: config.doNotSellSignal || true
    });
  }
  
  // CCPA-specific methods
  async processDoNotSellRequest(userId, requestData) {
    // Log the request
    this.logDataProcessing({
      activity: 'do_not_sell_request',
      userId: userId,
      legalBasis: 'legal_obligation',
      dataCategories: ['sale_opt_out'],
      purposes: ['consumer_rights']
    });
    
    // Record opt-out
    const optOutRecord = {
      user_id: userId,
      timestamp: new Date().toISOString(),
      request_method: requestData.method || 'user_request',
      ip_address: this.anonymizeIP(requestData.ipAddress),
      user_agent: requestData.userAgent,
      is_active: true
    };
    
    await this.storeDoNotSellRecord(optOutRecord);
    
    // Stop any data sales
    await this.stopDataSales(userId);
    
    this.emit('do_not_sell_recorded', { userId, optOutRecord });
    
    return optOutRecord;
  }
  
  async processDataSaleDisclosure(userId) {
    // Collect information about data sales
    const salesDisclosure = {
      user_id: userId,
      disclosure_timestamp: new Date().toISOString(),
      categories_sold: await this.getDataCategoriesSold(userId),
      third_parties: await this.getThirdPartiesDataSoldTo(userId),
      business_purposes: await this.getBusinessPurposesForSales(userId),
      opt_out_available: true,
      opt_out_method: 'user_dashboard'
    };
    
    return salesDisclosure;
  }
  
  // Abstract methods for CCPA
  async storeDoNotSellRecord(record) {
    throw new Error('storeDoNotSellRecord must be implemented');
  }
  
  async stopDataSales(userId) {
    throw new Error('stopDataSales must be implemented');
  }
  
  async getDataCategoriesSold(userId) {
    throw new Error('getDataCategoriesSold must be implemented');
  }
  
  async getThirdPartiesDataSoldTo(userId) {
    throw new Error('getThirdPartiesDataSoldTo must be implemented');
  }
  
  async getBusinessPurposesForSales(userId) {
    throw new Error('getBusinessPurposesForSales must be implemented');
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  GDPRComplianceManager,
  CCPAComplianceManager
};

