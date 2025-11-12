// API Service - Mock API endpoints for backend integration
// Structured for easy replacement with real backend calls

export class ApiService {
  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    this.timeout = 30000; // 30 seconds
  }

  // Generic request handler
  async request(endpoint, options = {}) {
    const {
      method = 'GET',
      body = null,
      headers = {},
      useAuth = true
    } = options;

    try {
      const token = localStorage.getItem('auth_token');
      
      const requestHeaders = {
        'Content-Type': 'application/json',
        ...headers
      };

      if (useAuth && token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }

      const config = {
        method,
        headers: requestHeaders,
        signal: AbortSignal.timeout(this.timeout)
      };

      if (body) {
        config.body = JSON.stringify(body);
      }

      // For demo, simulate API calls with local storage
      // In production, uncomment the fetch call
      // const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      
      // Simulate network delay
      await this.delay(300 + Math.random() * 200);

      // Mock response
      return this.mockApiCall(endpoint, method, body);

    } catch (error) {
      return this.handleError(error);
    }
  }

  // Simulate network delay
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Mock API calls for demo
  async mockApiCall(endpoint, method, body) {
    // Simulate successful responses
    const response = {
      success: true,
      data: body || {},
      timestamp: Date.now()
    };

    // Simulate different responses based on endpoint
    if (endpoint.includes('/entries')) {
      const db = await import('../db/storage.js');
      
      if (method === 'GET') {
        response.data = await db.getAllEntries();
      } else if (method === 'POST') {
        response.data = await db.createEntry(body);
      } else if (method === 'PUT') {
        const id = parseInt(endpoint.split('/').pop());
        response.data = await db.updateEntry(id, body);
      } else if (method === 'DELETE') {
        const id = parseInt(endpoint.split('/').pop());
        await db.deleteEntry(id);
        response.data = { deleted: true };
      }
    }

    return response;
  }

  // Error handler
  handleError(error) {
    console.error('API Error:', error);

    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please try again');
    }

    if (error.message.includes('fetch')) {
      throw new Error('Network error - please check your connection');
    }

    throw error;
  }

  // ==================== ENTRIES API ====================
  
  // GET /api/entries - Get all entries
  async getEntries(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = `/entries${queryParams ? '?' + queryParams : ''}`;
    return this.request(endpoint);
  }

  // GET /api/entries/:id - Get single entry
  async getEntry(id) {
    return this.request(`/entries/${id}`);
  }

  // POST /api/entries - Create entry
  async createEntry(data) {
    return this.request('/entries', {
      method: 'POST',
      body: data
    });
  }

  // PUT /api/entries/:id - Update entry
  async updateEntry(id, data) {
    return this.request(`/entries/${id}`, {
      method: 'PUT',
      body: data
    });
  }

  // DELETE /api/entries/:id - Delete entry
  async deleteEntry(id) {
    return this.request(`/entries/${id}`, {
      method: 'DELETE'
    });
  }

  // POST /api/entries/bulk - Bulk create entries
  async bulkCreateEntries(entries) {
    return this.request('/entries/bulk', {
      method: 'POST',
      body: { entries }
    });
  }

  // ==================== QUARANTINE API ====================

  // GET /api/quarantine - Get quarantined entries
  async getQuarantinedEntries() {
    return this.request('/quarantine');
  }

  // POST /api/quarantine/:id/resolve - Resolve quarantined entry
  async resolveQuarantinedEntry(id, resolution) {
    return this.request(`/quarantine/${id}/resolve`, {
      method: 'POST',
      body: resolution
    });
  }

  // ==================== VALIDATION API ====================

  // POST /api/validate - Validate entry data
  async validateEntry(data) {
    return this.request('/validate', {
      method: 'POST',
      body: data
    });
  }

  // GET /api/validation/rules - Get validation rules
  async getValidationRules() {
    return this.request('/validation/rules');
  }

  // PUT /api/validation/rules - Update validation rules
  async updateValidationRules(rules) {
    return this.request('/validation/rules', {
      method: 'PUT',
      body: rules
    });
  }

  // ==================== SYNC API ====================

  // POST /api/sync - Sync local data to server
  async syncData(data) {
    return this.request('/sync', {
      method: 'POST',
      body: data
    });
  }

  // GET /api/sync/status - Get sync status
  async getSyncStatus() {
    return this.request('/sync/status');
  }

  // POST /api/sync/conflicts/resolve - Resolve sync conflicts
  async resolveSyncConflicts(conflicts) {
    return this.request('/sync/conflicts/resolve', {
      method: 'POST',
      body: conflicts
    });
  }

  // ==================== FILE UPLOAD API ====================

  // POST /api/files/upload - Upload file
  async uploadFile(file, metadata = {}) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify(metadata));

      const token = localStorage.getItem('auth_token');
      
      // In production, use actual fetch:
      /*
      const response = await fetch(`${this.baseUrl}/files/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      return await response.json();
      */

      // Mock file upload
      await this.delay(500);
      
      const fileData = {
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
        uploadedAt: Date.now(),
        ...metadata
      };

      // Store file reference
      const files = JSON.parse(localStorage.getItem('uploaded_files') || '[]');
      files.push(fileData);
      localStorage.setItem('uploaded_files', JSON.stringify(files));

      return {
        success: true,
        data: fileData
      };
    } catch (error) {
      throw new Error('File upload failed: ' + error.message);
    }
  }

  // GET /api/files - Get all files
  async getFiles(filters = {}) {
    const files = JSON.parse(localStorage.getItem('uploaded_files') || '[]');
    return {
      success: true,
      data: files
    };
  }

  // GET /api/files/:id - Get single file
  async getFile(id) {
    const files = JSON.parse(localStorage.getItem('uploaded_files') || '[]');
    const file = files.find(f => f.id === id);
    
    if (!file) {
      throw new Error('File not found');
    }

    return {
      success: true,
      data: file
    };
  }

  // DELETE /api/files/:id - Delete file
  async deleteFile(id) {
    const files = JSON.parse(localStorage.getItem('uploaded_files') || '[]');
    const filtered = files.filter(f => f.id !== id);
    localStorage.setItem('uploaded_files', JSON.stringify(filtered));

    return {
      success: true,
      data: { deleted: true }
    };
  }

  // ==================== USER API ====================

  // GET /api/users/me - Get current user
  async getCurrentUser() {
    return this.request('/users/me');
  }

  // PUT /api/users/me - Update current user
  async updateCurrentUser(data) {
    return this.request('/users/me', {
      method: 'PUT',
      body: data
    });
  }

  // POST /api/users/me/avatar - Upload avatar
  async uploadAvatar(file) {
    return this.uploadFile(file, { type: 'avatar' });
  }

  // ==================== ANALYTICS API ====================

  // GET /api/analytics/dashboard - Get dashboard stats
  async getDashboardStats() {
    return this.request('/analytics/dashboard');
  }

  // GET /api/analytics/entries - Get entry analytics
  async getEntryAnalytics(dateRange) {
    return this.request(`/analytics/entries?from=${dateRange.from}&to=${dateRange.to}`);
  }

  // ==================== AUDIT API ====================

  // GET /api/audit/logs - Get audit logs
  async getAuditLogs(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return this.request(`/audit/logs${queryParams ? '?' + queryParams : ''}`);
  }

  // GET /api/audit/entry/:id - Get entry audit trail
  async getEntryAuditTrail(entryId) {
    return this.request(`/audit/entry/${entryId}`);
  }

  // ==================== EXPORT API ====================

  // POST /api/export/csv - Export data to CSV
  async exportToCSV(filters = {}) {
    return this.request('/export/csv', {
      method: 'POST',
      body: filters
    });
  }

  // POST /api/export/json - Export data to JSON
  async exportToJSON(filters = {}) {
    return this.request('/export/json', {
      method: 'POST',
      body: filters
    });
  }
}

export default ApiService;
