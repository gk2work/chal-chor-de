// Mock axios module before any imports
jest.mock("axios", () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn(),
        handlers: {},
      },
      response: {
        use: jest.fn(),
        handlers: {},
      },
    },
  };

  // Set up interceptor handlers storage
  mockAxiosInstance.interceptors.request.use.mockImplementation(
    (successHandler, errorHandler) => {
      mockAxiosInstance.interceptors.request.handlers = {
        success: successHandler,
        error: errorHandler,
      };
    }
  );

  mockAxiosInstance.interceptors.response.use.mockImplementation(
    (successHandler, errorHandler) => {
      mockAxiosInstance.interceptors.response.handlers = {
        success: successHandler,
        error: errorHandler,
      };
    }
  );

  return {
    create: jest.fn(() => mockAxiosInstance),
    mockAxiosInstance, // Export for testing
  };
});

// Now import after mocking
import axios from "axios";
import { apiService } from "../api";

const mockedAxios = axios;
const mockAxiosInstance = axios.mockAxiosInstance;

describe("API Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test("creates axios instance with correct configuration", () => {
    expect(mockedAxios.create).toHaveBeenCalled();
  });

  test("apiService is defined and has expected methods", () => {
    expect(apiService).toBeDefined();
    expect(apiService.getDashboardStats).toBeDefined();
    expect(apiService.getUsers).toBeDefined();
    expect(apiService.getTrips).toBeDefined();
    expect(apiService.getBooks).toBeDefined();
  });

  describe("Dashboard APIs", () => {
    test("getDashboardStats calls correct endpoint", () => {
      apiService.getDashboardStats();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        "/admin/dashboard/stats"
      );
    });

    test("getRecentActivity calls correct endpoint", () => {
      apiService.getRecentActivity();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        "/admin/dashboard/activity"
      );
    });
  });

  describe("User Management APIs", () => {
    test("getUsers calls correct endpoint with params", () => {
      const params = { status: "active", page: 1 };
      apiService.getUsers(params);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/admin/users", {
        params,
      });
    });

    test("getUserById calls correct endpoint", () => {
      apiService.getUserById("user123");
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        "/admin/users/user123"
      );
    });

    test("updateUserStatus calls correct endpoint", () => {
      apiService.updateUserStatus("user123", "inactive");
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        "/admin/users/user123/status",
        {
          status: "inactive",
        }
      );
    });
  });

  describe("Carpool Management APIs", () => {
    test("getTrips calls correct endpoint", () => {
      const params = { status: "active" };
      apiService.getTrips(params);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/admin/trips", {
        params,
      });
    });

    test("cancelTrip calls correct endpoint", () => {
      apiService.cancelTrip("trip123");
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        "/admin/trips/trip123/cancel"
      );
    });
  });

  describe("Book Management APIs", () => {
    test("getBooks calls correct endpoint", () => {
      const params = { status: "available" };
      apiService.getBooks(params);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/admin/books", {
        params,
      });
    });

    test("markBookReturned calls correct endpoint", () => {
      apiService.markBookReturned("book123");
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        "/admin/books/book123/return"
      );
    });
  });

  describe("Analytics APIs", () => {
    test("getAnalytics calls correct endpoint with date range", () => {
      apiService.getAnalytics("30days");
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/admin/analytics", {
        params: { range: "30days" },
      });
    });
  });

  describe("Settings APIs", () => {
    test("getSettings calls correct endpoint", () => {
      apiService.getSettings();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/admin/settings");
    });

    test("updateSettings calls correct endpoint", () => {
      const settings = { platformName: "Test" };
      apiService.updateSettings(settings);
      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        "/admin/settings",
        settings
      );
    });
  });

  describe("Export APIs", () => {
    test("exportUsers calls correct endpoint with format", () => {
      apiService.exportUsers("csv");
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        "/admin/export/users?format=csv",
        {
          responseType: "blob",
        }
      );
    });

    test("exportAnalytics uses default PDF format", () => {
      apiService.exportAnalytics();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        "/admin/export/analytics?format=pdf",
        { responseType: "blob" }
      );
    });
  });
});
