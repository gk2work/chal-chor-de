import axios from "axios";

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:3000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem("admin_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  // Dashboard APIs
  getDashboardStats: () => api.get("/admin/dashboard/stats"),
  getRecentActivity: () => api.get("/admin/dashboard/activity"),

  // User Management APIs
  getUsers: (params) => api.get("/admin/users", { params }),
  getUserById: (userId) => api.get(`/admin/users/${userId}`),
  updateUserStatus: (userId, status) =>
    api.patch(`/admin/users/${userId}/status`, { status }),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),

  // Carpool Management APIs
  getTrips: (params) => api.get("/admin/trips", { params }),
  getTripById: (tripId) => api.get(`/admin/trips/${tripId}`),
  cancelTrip: (tripId) => api.patch(`/admin/trips/${tripId}/cancel`),
  getTripAnalytics: () => api.get("/admin/trips/analytics"),

  // Book Management APIs
  getBooks: (params) => api.get("/admin/books", { params }),
  getBookById: (bookId) => api.get(`/admin/books/${bookId}`),
  updateBookStatus: (bookId, status) =>
    api.patch(`/admin/books/${bookId}/status`, { status }),
  markBookReturned: (bookId) => api.patch(`/admin/books/${bookId}/return`),
  removeBook: (bookId) => api.delete(`/admin/books/${bookId}`),

  // Book Analytics APIs
  getLibraryStats: (officeId) =>
    api.get(`http://localhost:3008/api/library/stats?office_id=${officeId}`),
  getPopularBooks: (officeId, limit = 10) =>
    api.get(
      `http://localhost:3008/api/books/popular?office_id=${officeId}&limit=${limit}`
    ),
  getOverdueBooks: (officeId) =>
    api.get(`http://localhost:3008/api/books/overdue?office_id=${officeId}`),
  getDueSoonBooks: (officeId, days = 3) =>
    api.get(
      `http://localhost:3008/api/books/due-soon?office_id=${officeId}&days_ahead=${days}`
    ),
  getLibraryActivity: (officeId, limit = 20) =>
    api.get(
      `http://localhost:3008/api/library/activity?office_id=${officeId}&limit=${limit}`
    ),
  getBorrowHistory: (params) =>
    api.get("/library/api/borrow-requests", { params }),

  // Analytics APIs
  getAnalytics: (dateRange) =>
    api.get("/admin/analytics", { params: { range: dateRange } }),
  getUserGrowth: () => api.get("/admin/analytics/user-growth"),
  getServiceUsage: () => api.get("/admin/analytics/service-usage"),
  getEnvironmentalImpact: () => api.get("/admin/analytics/environmental"),

  // Settings APIs
  getSettings: () => api.get("/admin/settings"),
  updateSettings: (settings) => api.put("/admin/settings", settings),
  resetSettings: () => api.post("/admin/settings/reset"),

  // Export APIs
  exportUsers: (format = "csv") =>
    api.get(`/admin/export/users?format=${format}`, { responseType: "blob" }),
  exportTrips: (format = "csv") =>
    api.get(`/admin/export/trips?format=${format}`, { responseType: "blob" }),
  exportBooks: (format = "csv") =>
    api.get(`/admin/export/books?format=${format}`, { responseType: "blob" }),
  exportAnalytics: (format = "pdf") =>
    api.get(`/admin/export/analytics?format=${format}`, {
      responseType: "blob",
    }),

  // System APIs
  getSystemHealth: () => api.get("/admin/system/health"),
  getSystemLogs: (params) => api.get("/admin/system/logs", { params }),
  performMaintenance: (action) =>
    api.post("/admin/system/maintenance", { action }),

  // Dispute Resolution APIs
  getDisputes: (officeId, status = "all") =>
    api.get(`/admin/disputes?office_id=${officeId}&status=${status}`),
  getDisputeById: (disputeId) => api.get(`/admin/disputes/${disputeId}`),
  updateDisputeStatus: (disputeId, status) =>
    api.patch(`/admin/disputes/${disputeId}/status`, { status }),
  resolveDispute: (disputeId, resolution) =>
    api.post(`/admin/disputes/${disputeId}/resolve`, resolution),
  getDisputeEvidence: (disputeId) =>
    api.get(`/admin/disputes/${disputeId}/evidence`),

  // Bike Sharing Analytics APIs
  getBikeStats: (officeId) =>
    api.get(`/admin/bikes/stats?office_id=${officeId}`),
  getBikeUsageAnalytics: (officeId, dateRange) =>
    api.get(`/admin/bikes/analytics?office_id=${officeId}&range=${dateRange}`),
  getPopularBikes: (officeId, limit = 10) =>
    api.get(`/admin/bikes/popular?office_id=${officeId}&limit=${limit}`),

  // Environmental Impact APIs
  getEnvironmentalMetrics: (officeId, dateRange) =>
    api.get(
      `/admin/environmental/metrics?office_id=${officeId}&range=${dateRange}`
    ),
  getCO2Savings: (officeId) =>
    api.get(`/admin/environmental/co2?office_id=${officeId}`),

  // User Behavior Analytics APIs
  getUserBehaviorAnalytics: (officeId, dateRange) =>
    api.get(
      `/admin/analytics/user-behavior?office_id=${officeId}&range=${dateRange}`
    ),
  getUserEngagementMetrics: (officeId) =>
    api.get(`/admin/analytics/engagement?office_id=${officeId}`),
  getPredictiveAnalytics: (officeId, type) =>
    api.get(`/admin/analytics/predictive?office_id=${officeId}&type=${type}`),
};

export default api;
