import axios from "axios";

// API Configuration
const API_BASE_URL = __DEV__
  ? "http://localhost:3000" // Development - API Gateway
  : "https://api.officeshare.com"; // Production

// Create axios instances for different services
export const authAPI = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const carpoolAPI = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const notificationAPI = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const feedbackAPI = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
const addAuthInterceptor = (apiInstance) => {
  apiInstance.interceptors.request.use(
    (config) => {
      // Token will be set by AuthContext
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
};

// Response interceptor for error handling
const addResponseInterceptor = (apiInstance) => {
  apiInstance.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      if (error.response?.status === 401) {
        // Handle unauthorized access
        console.log("Unauthorized access - redirecting to login");
        // This could trigger a logout in the auth context
      }
      return Promise.reject(error);
    }
  );
};

// Apply interceptors to all API instances
[authAPI, carpoolAPI, notificationAPI, feedbackAPI].forEach((api) => {
  addAuthInterceptor(api);
  addResponseInterceptor(api);
});

// API Service Functions
export const apiService = {
  // Auth services
  auth: {
    login: (email, password) =>
      authAPI.post("/api/users/login", { email, password }),
    register: (email, password, full_name) =>
      authAPI.post("/api/users/register", { email, password, full_name }),
    getProfile: () => authAPI.get("/api/users/profile"),
    updateProfile: (data) => authAPI.put("/api/users/profile", data),
  },

  // Carpool services
  carpool: {
    createTrip: (tripData) => carpoolAPI.post("/api/trips", tripData),
    getTrips: (params) => carpoolAPI.get("/api/trips", { params }),
    getTripById: (tripId) => carpoolAPI.get(`/api/trips/${tripId}`),
    updateTrip: (tripId, data) => carpoolAPI.put(`/api/trips/${tripId}`, data),
    deleteTrip: (tripId) => carpoolAPI.delete(`/api/trips/${tripId}`),
    joinTrip: (tripId) => carpoolAPI.post(`/api/trips/${tripId}/join`),
    leaveTrip: (tripId) => carpoolAPI.post(`/api/trips/${tripId}/leave`),
    getMatches: (tripId) => carpoolAPI.get(`/api/trips/${tripId}/matches`),
  },

  // Tracking services
  tracking: {
    updateLocation: (data) => carpoolAPI.post("/api/tracking/location", data),
    getLocationHistory: (tripId) =>
      carpoolAPI.get(`/api/tracking/trip/${tripId}/history`),
    startTracking: (tripId) =>
      carpoolAPI.post(`/api/tracking/trip/${tripId}/start`),
    stopTracking: (tripId) =>
      carpoolAPI.post(`/api/tracking/trip/${tripId}/stop`),
  },

  // Notification services
  notifications: {
    getUserNotifications: (userId, params) =>
      notificationAPI.get(`/api/notifications/user/${userId}`, { params }),
    markAsRead: (notificationId, data) =>
      notificationAPI.put(`/api/notifications/${notificationId}/read`, data),
    getPreferences: (userId, params) =>
      notificationAPI.get(`/api/notifications/preferences/${userId}`, {
        params,
      }),
    updatePreferences: (data, params) =>
      notificationAPI.put("/api/notifications/preferences", data, { params }),
  },

  // Feedback and analytics services
  feedback: {
    submitFeedback: (data) => feedbackAPI.post("/api/feedback", data),
    getUserFeedback: (userId, params) =>
      feedbackAPI.get(`/api/feedback/user/${userId}`, { params }),
    trackBehavior: (data) => feedbackAPI.post("/api/analytics/behavior", data),
    trackUXMetric: (data) =>
      feedbackAPI.post("/api/analytics/ux-metrics", data),
    getABTestVariant: (testId) =>
      feedbackAPI.get(`/api/ab-tests/${testId}/variant`),
    trackConversion: (testId, data) =>
      feedbackAPI.post(`/api/ab-tests/${testId}/conversion`, data),
  },

  // Utility functions
  setAuthToken: (token) => {
    if (token) {
      authAPI.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      carpoolAPI.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      notificationAPI.defaults.headers.common["Authorization"] =
        `Bearer ${token}`;
      feedbackAPI.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete authAPI.defaults.headers.common["Authorization"];
      delete carpoolAPI.defaults.headers.common["Authorization"];
      delete notificationAPI.defaults.headers.common["Authorization"];
      delete feedbackAPI.defaults.headers.common["Authorization"];
    }
  },
};
