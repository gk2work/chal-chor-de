import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import Dashboard from "../Dashboard";

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
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
}));

describe("Dashboard Component", () => {
  test("renders dashboard title and description", () => {
    render(<Dashboard />);

    expect(screen.getByText("Dashboard Overview")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Monitor your OfficeShare platform performance and usage"
      )
    ).toBeInTheDocument();
  });

  test("displays loading state initially", () => {
    render(<Dashboard />);

    expect(screen.getByText("Loading carpools...")).toBeInTheDocument();
  });

  test("displays stats cards after loading", async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("Total Users")).toBeInTheDocument();
      expect(screen.getByText("Active Carpools")).toBeInTheDocument();
      expect(screen.getByText("Books Available")).toBeInTheDocument();
      expect(screen.getByText("Completed Trips")).toBeInTheDocument();
    });
  });

  test("displays mock statistics", async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("156")).toBeInTheDocument(); // Total Users
      expect(screen.getByText("23")).toBeInTheDocument(); // Active Trips
      expect(screen.getByText("89")).toBeInTheDocument(); // Total Books
      expect(screen.getByText("342")).toBeInTheDocument(); // Completed Trips
    });
  });

  test("renders charts section", async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("Weekly Trip Activity")).toBeInTheDocument();
      expect(
        screen.getByText("Service Usage Distribution")
      ).toBeInTheDocument();
      expect(screen.getAllByTestId("responsive-container")).toHaveLength(2);
    });
  });

  test("displays recent activity section", async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
      expect(screen.getByText("New carpool created")).toBeInTheDocument();
      expect(screen.getByText("New user registered")).toBeInTheDocument();
      expect(screen.getByText("Book shared")).toBeInTheDocument();
      expect(screen.getByText("Trip completed")).toBeInTheDocument();
    });
  });

  test("displays quick actions section", async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("Quick Actions")).toBeInTheDocument();
      expect(screen.getByText("📊 Generate Report")).toBeInTheDocument();
      expect(screen.getByText("📧 Send Notifications")).toBeInTheDocument();
      expect(screen.getByText("🔧 System Maintenance")).toBeInTheDocument();
      expect(screen.getByText("📋 Export Data")).toBeInTheDocument();
    });
  });
});
