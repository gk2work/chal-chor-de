import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Dashboard from "../pages/Dashboard";
import { apiService } from "../services/api";

// Mock API service
jest.mock("../services/api", () => ({
  apiService: {
    analytics: {
      getDashboardStats: jest.fn(),
    },
  },
}));

// Mock Ant Design components that might cause issues
jest.mock("antd", () => ({
  ...jest.requireActual("antd"),
  message: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("Dashboard Component", () => {
  const mockStatsData = {
    users: {
      users: [
        {
          user_id: "1",
          full_name: "John Doe",
          email: "john@company.com",
          reputation_score: 4.8,
          created_at: new Date().toISOString(),
        },
        {
          user_id: "2",
          full_name: "Jane Smith",
          email: "jane@company.com",
          reputation_score: 4.9,
          created_at: new Date().toISOString(),
        },
      ],
    },
    notifications: {
      total_notifications: 150,
      delivered_notifications: 142,
      failed_notifications: 8,
      delivery_rate: "94.7%",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    apiService.analytics.getDashboardStats.mockResolvedValue(mockStatsData);
  });

  it("should render dashboard title", async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("Dashboard Overview")).toBeInTheDocument();
    });
  });

  it("should load and display dashboard statistics", async () => {
    render(<Dashboard />);

    // Should call API to load stats
    await waitFor(() => {
      expect(apiService.analytics.getDashboardStats).toHaveBeenCalled();
    });

    // Should display user statistics
    await waitFor(() => {
      expect(screen.getByText("Total Users")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument(); // Total users count
    });

    // Should display notification statistics
    expect(screen.getByText("Total Notifications")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("Delivered Notifications")).toBeInTheDocument();
    expect(screen.getByText("142")).toBeInTheDocument();
    expect(screen.getByText("Delivery Rate")).toBeInTheDocument();
    expect(screen.getByText("94.7%")).toBeInTheDocument();
  });

  it("should display recent users table", async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("Recent Users")).toBeInTheDocument();
    });

    // Should display user data in table
    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("jane@company.com")).toBeInTheDocument();
      expect(screen.getByText("4.8")).toBeInTheDocument();
      expect(screen.getByText("4.9")).toBeInTheDocument();
    });
  });

  it("should handle API error gracefully", async () => {
    const mockError = new Error("API Error");
    apiService.analytics.getDashboardStats.mockRejectedValue(mockError);

    render(<Dashboard />);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText("Connection Error")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Failed to load dashboard data. Please check if the services are running."
        )
      ).toBeInTheDocument();
    });
  });

  it("should handle refresh button click", async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("Refresh")).toBeInTheDocument();
    });

    const refreshButton = screen.getByText("Refresh");
    fireEvent.click(refreshButton);

    // Should call API again
    await waitFor(() => {
      expect(apiService.analytics.getDashboardStats).toHaveBeenCalledTimes(2);
    });
  });

  it("should display system status indicators", async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("System Status")).toBeInTheDocument();
    });

    // Should show service status
    expect(screen.getByText("User Service")).toBeInTheDocument();
    expect(screen.getByText("Notification Service")).toBeInTheDocument();
    expect(screen.getByText("Carpool Service")).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
    expect(screen.getByText("Development")).toBeInTheDocument();
  });

  it("should display quick actions", async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("Quick Actions")).toBeInTheDocument();
    });

    // Should show action buttons
    expect(screen.getByText("Manage Users")).toBeInTheDocument();
    expect(screen.getByText("View Analytics")).toBeInTheDocument();
    expect(screen.getByText("Send Notification")).toBeInTheDocument();
  });

  it("should handle empty user data", async () => {
    const emptyStatsData = {
      users: { users: [] },
      notifications: {
        total_notifications: 0,
        delivered_notifications: 0,
        failed_notifications: 0,
        delivery_rate: "0%",
      },
    };

    apiService.analytics.getDashboardStats.mockResolvedValue(emptyStatsData);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("0")).toBeInTheDocument(); // Should show 0 for empty stats
    });

    // Should show empty state for users table
    expect(screen.getByText("No users found")).toBeInTheDocument();
    expect(
      screen.getByText("Users will appear here once they register")
    ).toBeInTheDocument();
  });

  it("should show loading state initially", () => {
    render(<Dashboard />);

    // Should show loading spinner initially
    expect(screen.getByRole("img", { name: /loading/i })).toBeInTheDocument();
  });

  it("should handle notification composer click", async () => {
    // Mock window.alert for the notification composer
    window.alert = jest.fn();

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("Send Notification")).toBeInTheDocument();
    });

    const notificationButton = screen.getByText("Send Notification");
    fireEvent.click(notificationButton);

    // Should show alert (mock implementation)
    expect(window.alert).toHaveBeenCalledWith(
      "Notification composer coming soon!"
    );
  });
});
