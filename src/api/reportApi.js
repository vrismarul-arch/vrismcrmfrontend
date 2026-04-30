import api from './axios';

const reportsAPI = {
  // Get all reports with filters
  getAllReports: (params = {}) => {
    return api.get('/api/reports', { params });
  },

  // Get single report by ID
  getReportById: (id) => {
    return api.get(`/api/reports/${id}`);
  },

  // Create or update report
  createOrUpdateReport: (data) => {
    return api.post('/api/reports', data);
  },

  // Update specific week
  updateWeek: (reportId, weekNumber, data) => {
    return api.put(`/api/reports/${reportId}/week/${weekNumber}`, data);
  },

  // Add post to week
  addPostToWeek: (reportId, weekNumber, postData) => {
    return api.post(`/api/reports/${reportId}/week/${weekNumber}/posts`, postData);
  },

  // Update post in week
  updatePostInWeek: (reportId, weekNumber, postIndex, postData) => {
    return api.put(`/api/reports/${reportId}/week/${weekNumber}/posts/${postIndex}`, postData);
  },

  // Delete post from week
  deletePostFromWeek: (reportId, weekNumber, postIndex) => {
    return api.delete(`/api/reports/${reportId}/week/${weekNumber}/posts/${postIndex}`);
  },

  // Delete report
  deleteReport: (id) => {
    return api.delete(`/api/reports/${id}`);
  },

  // Get reports by business account
  getReportsByBusinessAccount: (businessAccountId, params = {}) => {
    return api.get(`/api/reports/business/${businessAccountId}`, { params });
  },

  // Get business monthly summary
  getBusinessMonthlySummary: (businessAccountId, params = {}) => {
    return api.get(`/api/reports/summary/business/${businessAccountId}`, { params });
  }
};

export default reportsAPI;