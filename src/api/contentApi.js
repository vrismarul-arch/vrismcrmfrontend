import axios from "../api/axios";

export const contentApi = {
  // Get all content with pagination
  getAllContent: async (params = {}) => {
    const { page = 1, pageSize = 10, month, status, search } = params;
    const queryParams = new URLSearchParams({
      page,
      pageSize,
      ...(month && { month }),
      ...(status && status !== 'all' && { status }),
      ...(search && { search }),
    });
    const response = await axios.get(`/api/monthly-content?${queryParams}`);
    return response.data;
  },

  // Get content by ID
  getContentById: async (id) => {
    const response = await axios.get(`/api/monthly-content/${id}`);
    return response.data;
  },

  // Create new content
  createContent: async (data) => {
    const response = await axios.post('/api/monthly-content', data);
    return response.data;
  },

  // Update content
  updateContent: async (id, data) => {
    const response = await axios.put(`/api/monthly-content/${id}`, data);
    return response.data;
  },

  // Delete content
  deleteContent: async (id) => {
    const response = await axios.delete(`/api/monthly-content/${id}`);
    return response.data;
  },

  // Update weekly progress
  updateWeeklyProgress: async (id, weeks) => {
    const response = await axios.put(`/api/monthly-content/${id}/weekly`, { weeks });
    return response.data;
  },

  // Get weekly summary
  getWeeklySummary: async (month) => {
    const response = await axios.get(`/api/monthly-content/weekly-summary?month=${month}`);
    return response.data;
  },

  // Get dashboard summary
  getDashboardSummary: async (month) => {
    const response = await axios.get(`/api/monthly-content/dashboard/summary?month=${month}`);
    return response.data;
  },

  // Get monthly trends
  getMonthlyTrends: async (clientId, months = 6) => {
    const params = new URLSearchParams();
    if (clientId) params.append('clientId', clientId);
    params.append('months', months);
    const response = await axios.get(`/api/monthly-content/trends?${params}`);
    return response.data;
  },

  // Get content by client ID
  getContentByClientId: async (clientId, month) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    const response = await axios.get(`/api/monthly-content/client/${clientId}?${params}`);
    return response.data;
  },

  // Get client stats
  getClientStats: async (clientId) => {
    const response = await axios.get(`/api/monthly-content/client/${clientId}/stats`);
    return response.data;
  },

  // Bulk update
  bulkUpdateContent: async (updates) => {
    const response = await axios.post('/api/monthly-content/bulk/update', { updates });
    return response.data;
  },

  // Bulk create
  bulkCreateContent: async (contents) => {
    const response = await axios.post('/api/monthly-content/bulk/create', { contents });
    return response.data;
  },
};

export default contentApi;