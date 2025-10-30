import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Analytics from "../Analytics";

// Mock recharts components
jest.mock("recharts", () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  AreaChart: ({ children }) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  ComposedChart: ({ children }) => (
    <div data-testid="composed-chart">{children}</div>
  ),
}));

// Mock API service
jest.mock("../../services/api", () => ({
  apiService: {
    getLibraryStats: jest.fn(),
    getPopularBooks: jest.fn(),
    getOverdueBooks: jest.fn(),
    getLibraryActivity: jest.fn(),
  },
}));

describe("Analytics Component", () => {
  test("renders analytics page title and description", () => {
    render(<Analytics />);

    expect(screen.getByText("Analytics & Insights")).toBeInTheDocument();
    expect(
      screen.getByText("Track platform performance and user engagement metrics")
    ).toBeInTheDocument();
  });

  test("displays date range selector", () => {
    render(<Analytics />);

    expect(screen.getByDisplayValue("Last 30 Days")).toBeInTheDocument();
    expect(screen.getByText("📊 Export Report")).toBeInTheDocument();
  });

  test("changes date range when selector is updated", () => {
    render(<Analytics />);

    const dateRangeSelect = screen.getByDisplayValue("Last 30 Days");
    fireEvent.change(dateRangeSelect, { target: { value: "7days" } });

    expect(screen.getByDisplayValue("Last 7 Days")).toBeInTheDocument();
  });

  test("displays key metrics cards", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText("Total Users")).toBeInTheDocument();
      expect(screen.getByText("CO₂ Saved")).toBeInTheDocument();
      expect(screen.getByText("Miles Saved")).toBeInTheDocument();
      expect(screen.getByText("Books Circulated")).toBeInTheDocument();
    });
  });

  test("displays metric values and trends", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText("156")).toBeInTheDocument(); // Total Users
      expect(screen.getByText("248 kg")).toBeInTheDocument(); // CO₂ Saved
      expect(screen.getByText("940")).toBeInTheDocument(); // Miles Saved
      expect(screen.getByText("89")).toBeInTheDocument(); // Books Circulated

      // Check for trend indicators
      expect(screen.getByText("↗ 12%")).toBeInTheDocument();
      expect(screen.getByText("↗ 8%")).toBeInTheDocument();
      expect(screen.getByText("↗ 15%")).toBeInTheDocument();
      expect(screen.getByText("↘ 3%")).toBeInTheDocument();
    });
  });

  test("renders all chart sections", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText("User Growth Over Time")).toBeInTheDocument();
      expect(
        screen.getByText("Weekly Activity by Service")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Service Usage Distribution")
      ).toBeInTheDocument();
      expect(screen.getByText("Environmental Impact")).toBeInTheDocument();
    });
  });

  test("displays chart components", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(screen.getAllByTestId("responsive-container")).toHaveLength(7); // Updated for book analytics charts
      expect(screen.getByTestId("area-chart")).toBeInTheDocument();
      expect(screen.getAllByTestId("bar-chart")).toHaveLength(2); // Multiple bar charts now
      expect(screen.getAllByTestId("pie-chart")).toHaveLength(2); // Multiple pie charts now
      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
      expect(screen.getByTestId("composed-chart")).toBeInTheDocument();
    });
  });

  test("displays top users table", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText("Top Active Users")).toBeInTheDocument();
      expect(screen.getByText("#1")).toBeInTheDocument();
      expect(screen.getByText("#2")).toBeInTheDocument();
      expect(screen.getByText("#3")).toBeInTheDocument();
      expect(screen.getByText("#4")).toBeInTheDocument();
      expect(screen.getByText("#5")).toBeInTheDocument();

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText("Mike Johnson")).toBeInTheDocument();
      expect(screen.getByText("Sarah Wilson")).toBeInTheDocument();
      expect(screen.getByText("David Lee")).toBeInTheDocument();
    });
  });

  test("displays insights and recommendations", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText("📈 Key Insights")).toBeInTheDocument();
      expect(screen.getByText("🎯 Recommendations")).toBeInTheDocument();

      expect(
        screen.getByText("User growth increased by 12% this month")
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Carpooling remains the most popular service at 65% usage"
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText("Environmental impact: 248kg CO₂ saved this month")
      ).toBeInTheDocument();

      expect(
        screen.getByText("Promote book sharing with incentives or gamification")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Consider expanding carpool capacity on Thursdays")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Implement bike sharing to diversify service usage")
      ).toBeInTheDocument();
    });
  });

  test("displays user statistics in top users table", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText("28")).toBeInTheDocument(); // John's trips
      expect(screen.getByText("25")).toBeInTheDocument(); // Jane's trips
      expect(screen.getByText("22")).toBeInTheDocument(); // Mike's trips

      expect(screen.getByText("⭐ 4.9")).toBeInTheDocument(); // John's rating
      expect(screen.getAllByText("⭐ 4.8")).toHaveLength(2); // Jane's and David's rating (both have 4.8)
      expect(screen.getByText("⭐ 4.7")).toBeInTheDocument(); // Mike's rating
    });
  });

  // Book Analytics Tests
  test("displays book sharing metrics in key stats", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText("Active Borrows")).toBeInTheDocument();
      expect(screen.getByText("Completion Rate")).toBeInTheDocument();
      expect(screen.getByText("Overdue Books")).toBeInTheDocument();
    });
  });

  test("renders book analytics charts", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(
        screen.getByText("Library Circulation Trends")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Book Category Distribution")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Monthly Borrow Status Breakdown")
      ).toBeInTheDocument();
    });
  });

  test("displays popular books table", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText("Most Popular Books")).toBeInTheDocument();
      expect(screen.getByText("Times Borrowed")).toBeInTheDocument();
      expect(screen.getByText("Availability")).toBeInTheDocument();
    });
  });

  test("shows library health metrics", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText("Library Health Metrics")).toBeInTheDocument();
      expect(screen.getByText("Active Borrowers")).toBeInTheDocument();
      expect(screen.getByText("Avg. Books per User")).toBeInTheDocument();
      expect(screen.getByText("Return Rate")).toBeInTheDocument();
      expect(screen.getByText("Avg. Borrow Duration")).toBeInTheDocument();
    });
  });

  test("displays library activity feed", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText("Recent Library Activity")).toBeInTheDocument();
    });
  });

  test("shows library-specific insights", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText("📚 Library Insights")).toBeInTheDocument();
      expect(
        screen.getByText(/books currently available for borrowing/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/unique authors in the collection/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/active borrowers this month/)
      ).toBeInTheDocument();
    });
  });

  test("renders composed chart for circulation trends", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(screen.getByTestId("composed-chart")).toBeInTheDocument();
    });
  });

  test("displays book condition metrics", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText(/Book condition:/)).toBeInTheDocument();
    });
  });

  test("shows completion rate percentage", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText(/83.3%/)).toBeInTheDocument();
    });
  });

  test("displays category distribution with percentages", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(
        screen.getByText(/Programming books are most popular category/)
      ).toBeInTheDocument();
    });
  });

  // Bike Sharing Analytics Tests
  test("displays bike sharing metrics", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText("Total Bikes")).toBeInTheDocument();
      expect(screen.getByText("Available Bikes")).toBeInTheDocument();
      expect(screen.getByText("Active Bookings")).toBeInTheDocument();
    });
  });

  test("renders bike usage trends chart", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText("Bike Usage Trends")).toBeInTheDocument();
    });
  });

  test("displays booking patterns by day", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText("Booking Patterns by Day")).toBeInTheDocument();
    });
  });

  // Environmental Impact Tests
  test("displays comprehensive environmental metrics", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText("Total CO₂ Saved")).toBeInTheDocument();
      expect(screen.getByText("Miles Not Driven")).toBeInTheDocument();
      expect(screen.getByText("Trees Equivalent")).toBeInTheDocument();
    });
  });

  test("renders CO2 savings by service chart", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText("CO₂ Savings by Service")).toBeInTheDocument();
    });
  });

  test("displays environmental impact growth chart", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(
        screen.getByText("Environmental Impact Growth")
      ).toBeInTheDocument();
    });
  });

  // User Behavior Analytics Tests
  test("displays user behavior metrics", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText("Engagement Score")).toBeInTheDocument();
      expect(screen.getByText("Retention Rate")).toBeInTheDocument();
      expect(screen.getByText("Active Users")).toBeInTheDocument();
      expect(screen.getByText("Churn Rate")).toBeInTheDocument();
    });
  });

  test("renders feature adoption rates chart", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText("Feature Adoption Rates")).toBeInTheDocument();
    });
  });

  test("displays user segmentation chart", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText("User Segmentation")).toBeInTheDocument();
    });
  });

  // Predictive Analytics Tests
  test("displays demand forecast chart", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText("4-Week Demand Forecast")).toBeInTheDocument();
    });
  });

  test("renders peak usage times chart", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText("Peak Usage Times")).toBeInTheDocument();
    });
  });

  test("displays AI-powered recommendations", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(
        screen.getByText("🤖 AI-Powered Recommendations")
      ).toBeInTheDocument();
    });
  });

  test("shows recommendations with impact levels", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText(/carpool capacity/i)).toBeInTheDocument();
      expect(screen.getByText(/bike sharing/i)).toBeInTheDocument();
    });
  });

  // Section Headers Tests
  test("displays all analytics section headers", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText("🚴 Bike Sharing Analytics")).toBeInTheDocument();
      expect(
        screen.getByText("🌱 Comprehensive Environmental Impact")
      ).toBeInTheDocument();
      expect(
        screen.getByText("👤 Advanced User Behavior Analytics")
      ).toBeInTheDocument();
      expect(
        screen.getByText("🔮 Predictive Usage & Demand Forecasting")
      ).toBeInTheDocument();
    });
  });

  // Updated Insights Tests
  test("displays updated insights with bike sharing data", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText(/Bike sharing has/)).toBeInTheDocument();
      expect(screen.getByText(/User engagement score is/)).toBeInTheDocument();
    });
  });

  test("displays updated recommendations with bike sharing", async () => {
    render(<Analytics />);

    await waitFor(() => {
      expect(
        screen.getByText(/Promote bike sharing during lunch hours/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Increase bike availability during peak times/)
      ).toBeInTheDocument();
    });
  });
});
