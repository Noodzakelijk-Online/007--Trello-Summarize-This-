import axios from 'axios';

// Base API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

class AdminApiClient {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('admin_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('admin_token');
          window.location.href = '/login';
        }
        return Promise.reject(this.handleError(error));
      }
    );
  }

  handleError(error) {
    if (error.response) {
      // Server responded with error status
      return {
        message: error.response.data?.message || 'Server error occurred',
        status: error.response.status,
        data: error.response.data,
      };
    } else if (error.request) {
      // Network error
      return {
        message: 'Network error - please check your connection',
        status: 0,
        data: null,
      };
    } else {
      // Other error
      return {
        message: error.message || 'An unexpected error occurred',
        status: -1,
        data: null,
      };
    }
  }

  // Authentication
  async login(credentials) {
    const response = await this.client.post('/admin/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('admin_token', response.data.token);
    }
    return response.data;
  }

  async logout() {
    try {
      await this.client.post('/admin/auth/logout');
    } finally {
      localStorage.removeItem('admin_token');
    }
  }

  async refreshToken() {
    const response = await this.client.post('/admin/auth/refresh');
    if (response.data.token) {
      localStorage.setItem('admin_token', response.data.token);
    }
    return response.data;
  }

  async verifyToken() {
    const response = await this.client.get('/admin/auth/verify');
    return response.data;
  }

  // Dashboard metrics
  async getDashboardMetrics() {
    const response = await this.client.get('/admin/dashboard/metrics');
    return response.data;
  }

  async getSystemHealth() {
    const response = await this.client.get('/admin/system/health');
    return response.data;
  }

  async getRealtimeMetrics() {
    const response = await this.client.get('/admin/dashboard/realtime');
    return response.data;
  }

  // User management
  async getUsers(params = {}) {
    const response = await this.client.get('/admin/users', { params });
    return response.data;
  }

  async getUser(userId) {
    const response = await this.client.get(`/admin/users/${userId}`);
    return response.data;
  }

  async updateUser(userId, userData) {
    const response = await this.client.put(`/admin/users/${userId}`, userData);
    return response.data;
  }

  async deleteUser(userId) {
    const response = await this.client.delete(`/admin/users/${userId}`);
    return response.data;
  }

  async suspendUser(userId, reason) {
    const response = await this.client.post(`/admin/users/${userId}/suspend`, { reason });
    return response.data;
  }

  async unsuspendUser(userId) {
    const response = await this.client.post(`/admin/users/${userId}/unsuspend`);
    return response.data;
  }

  async getUserActivity(userId, params = {}) {
    const response = await this.client.get(`/admin/users/${userId}/activity`, { params });
    return response.data;
  }

  async getUserStats(params = {}) {
    const response = await this.client.get('/admin/users/stats', { params });
    return response.data;
  }

  // Credit management
  async getUserCredits(userId) {
    const response = await this.client.get(`/admin/users/${userId}/credits`);
    return response.data;
  }

  async adjustUserCredits(userId, adjustment) {
    const response = await this.client.post(`/admin/users/${userId}/credits/adjust`, adjustment);
    return response.data;
  }

  async getCreditTransactions(params = {}) {
    const response = await this.client.get('/admin/credits/transactions', { params });
    return response.data;
  }

  async getCreditStats(params = {}) {
    const response = await this.client.get('/admin/credits/stats', { params });
    return response.data;
  }

  async bulkCreditAdjustment(adjustments) {
    const response = await this.client.post('/admin/credits/bulk-adjust', { adjustments });
    return response.data;
  }

  // Transaction monitoring
  async getTransactions(params = {}) {
    const response = await this.client.get('/admin/transactions', { params });
    return response.data;
  }

  async getTransaction(transactionId) {
    const response = await this.client.get(`/admin/transactions/${transactionId}`);
    return response.data;
  }

  async refundTransaction(transactionId, reason) {
    const response = await this.client.post(`/admin/transactions/${transactionId}/refund`, { reason });
    return response.data;
  }

  async getTransactionStats(params = {}) {
    const response = await this.client.get('/admin/transactions/stats', { params });
    return response.data;
  }

  async getFraudAlerts(params = {}) {
    const response = await this.client.get('/admin/transactions/fraud-alerts', { params });
    return response.data;
  }

  async markTransactionReviewed(transactionId, notes) {
    const response = await this.client.post(`/admin/transactions/${transactionId}/review`, { notes });
    return response.data;
  }

  // System monitoring
  async getServerStatus() {
    const response = await this.client.get('/admin/system/servers');
    return response.data;
  }

  async getSystemLogs(params = {}) {
    const response = await this.client.get('/admin/system/logs', { params });
    return response.data;
  }

  async getPerformanceMetrics(params = {}) {
    const response = await this.client.get('/admin/system/performance', { params });
    return response.data;
  }

  async getAlerts(params = {}) {
    const response = await this.client.get('/admin/system/alerts', { params });
    return response.data;
  }

  async acknowledgeAlert(alertId) {
    const response = await this.client.post(`/admin/system/alerts/${alertId}/acknowledge`);
    return response.data;
  }

  async restartService(serviceName) {
    const response = await this.client.post(`/admin/system/services/${serviceName}/restart`);
    return response.data;
  }

  // Settings management
  async getSettings() {
    const response = await this.client.get('/admin/settings');
    return response.data;
  }

  async updateSettings(settings) {
    const response = await this.client.put('/admin/settings', settings);
    return response.data;
  }

  async getSettingsHistory(params = {}) {
    const response = await this.client.get('/admin/settings/history', { params });
    return response.data;
  }

  async exportSettings() {
    const response = await this.client.get('/admin/settings/export', {
      responseType: 'blob'
    });
    return response.data;
  }

  async importSettings(settingsFile) {
    const formData = new FormData();
    formData.append('settings', settingsFile);
    const response = await this.client.post('/admin/settings/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Analytics
  async getAnalytics(params = {}) {
    const response = await this.client.get('/admin/analytics', { params });
    return response.data;
  }

  async getUserAnalytics(params = {}) {
    const response = await this.client.get('/admin/analytics/users', { params });
    return response.data;
  }

  async getRevenueAnalytics(params = {}) {
    const response = await this.client.get('/admin/analytics/revenue', { params });
    return response.data;
  }

  async getUsageAnalytics(params = {}) {
    const response = await this.client.get('/admin/analytics/usage', { params });
    return response.data;
  }

  // Reports
  async generateReport(reportType, params = {}) {
    const response = await this.client.post('/admin/reports/generate', {
      type: reportType,
      parameters: params
    });
    return response.data;
  }

  async getReports(params = {}) {
    const response = await this.client.get('/admin/reports', { params });
    return response.data;
  }

  async downloadReport(reportId) {
    const response = await this.client.get(`/admin/reports/${reportId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async deleteReport(reportId) {
    const response = await this.client.delete(`/admin/reports/${reportId}`);
    return response.data;
  }

  // Audit logs
  async getAuditLogs(params = {}) {
    const response = await this.client.get('/admin/audit', { params });
    return response.data;
  }

  async exportAuditLogs(params = {}) {
    const response = await this.client.get('/admin/audit/export', {
      params,
      responseType: 'blob'
    });
    return response.data;
  }

  // Backup and maintenance
  async createBackup(type = 'full') {
    const response = await this.client.post('/admin/backup/create', { type });
    return response.data;
  }

  async getBackups() {
    const response = await this.client.get('/admin/backup/list');
    return response.data;
  }

  async restoreBackup(backupId) {
    const response = await this.client.post(`/admin/backup/${backupId}/restore`);
    return response.data;
  }

  async deleteBackup(backupId) {
    const response = await this.client.delete(`/admin/backup/${backupId}`);
    return response.data;
  }

  async scheduleMaintenanceWindow(maintenanceData) {
    const response = await this.client.post('/admin/maintenance/schedule', maintenanceData);
    return response.data;
  }

  async getMaintenanceWindows() {
    const response = await this.client.get('/admin/maintenance/windows');
    return response.data;
  }

  // File uploads
  async uploadFile(file, category = 'general') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    
    const response = await this.client.post('/admin/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        // You can emit progress events here if needed
        console.log(`Upload progress: ${percentCompleted}%`);
      },
    });
    return response.data;
  }

  async deleteFile(fileId) {
    const response = await this.client.delete(`/admin/files/${fileId}`);
    return response.data;
  }

  // WebSocket connection for real-time updates
  connectWebSocket(onMessage, onError, onClose) {
    const token = localStorage.getItem('admin_token');
    const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/admin/ws?token=${token}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('Admin WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (onError) onError(error);
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      if (onClose) onClose(event);
    };
    
    return ws;
  }
}

// Create singleton instance
const adminApi = new AdminApiClient();

export default adminApi;

// Export individual methods for easier imports
export const {
  login,
  logout,
  refreshToken,
  verifyToken,
  getDashboardMetrics,
  getSystemHealth,
  getRealtimeMetrics,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  suspendUser,
  unsuspendUser,
  getUserActivity,
  getUserStats,
  getUserCredits,
  adjustUserCredits,
  getCreditTransactions,
  getCreditStats,
  bulkCreditAdjustment,
  getTransactions,
  getTransaction,
  refundTransaction,
  getTransactionStats,
  getFraudAlerts,
  markTransactionReviewed,
  getServerStatus,
  getSystemLogs,
  getPerformanceMetrics,
  getAlerts,
  acknowledgeAlert,
  restartService,
  getSettings,
  updateSettings,
  getSettingsHistory,
  exportSettings,
  importSettings,
  getAnalytics,
  getUserAnalytics,
  getRevenueAnalytics,
  getUsageAnalytics,
  generateReport,
  getReports,
  downloadReport,
  deleteReport,
  getAuditLogs,
  exportAuditLogs,
  createBackup,
  getBackups,
  restoreBackup,
  deleteBackup,
  scheduleMaintenanceWindow,
  getMaintenanceWindows,
  uploadFile,
  deleteFile,
  connectWebSocket
} = adminApi;

