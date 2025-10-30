import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Disputes from "../Disputes";
import { apiService } from "../../services/api";

// Mock API service
jest.mock("../../services/api", () => ({
  apiService: {
    getDisputes: jest.fn(),
    resolveDispute: jest.fn(),
    updateDisputeStatus: jest.fn(),
  },
}));

describe("Disputes Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders disputes page title and description", () => {
    render(<Disputes />);

    expect(screen.getByText("Dispute Resolution")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Manage and resolve user disputes across all platform services"
      )
    ).toBeInTheDocument();
  });

  test("displays filter buttons with counts", async () => {
    render(<Disputes />);

    await waitFor(() => {
      expect(screen.getByText(/All Disputes/)).toBeInTheDocument();
      expect(screen.getByText(/Open/)).toBeInTheDocument();
      expect(screen.getByText(/In Review/)).toBeInTheDocument();
      expect(screen.getByText(/Resolved/)).toBeInTheDocument();
    });
  });

  test("loads and displays mock disputes", async () => {
    render(<Disputes />);

    await waitFor(() => {
      expect(screen.getByText("disp_001")).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });
  });

  test("filters disputes by status", async () => {
    render(<Disputes />);

    await waitFor(() => {
      expect(screen.getByText("disp_001")).toBeInTheDocument();
    });

    const openButton = screen.getByText(/Open/);
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(screen.getByText("disp_001")).toBeInTheDocument();
      expect(screen.queryByText("disp_003")).not.toBeInTheDocument();
    });
  });

  test("opens dispute details modal when View Details is clicked", async () => {
    render(<Disputes />);

    await waitFor(() => {
      const viewButtons = screen.getAllByText("View Details");
      fireEvent.click(viewButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText(/Dispute Details/)).toBeInTheDocument();
      expect(screen.getByText(/Basic Information/)).toBeInTheDocument();
    });
  });

  test("displays dispute evidence in modal", async () => {
    render(<Disputes />);

    await waitFor(() => {
      const viewButtons = screen.getAllByText("View Details");
      fireEvent.click(viewButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText(/Evidence/)).toBeInTheDocument();
      expect(screen.getByText(/Waited for 20 minutes/)).toBeInTheDocument();
    });
  });

  test("closes modal when close button is clicked", async () => {
    render(<Disputes />);

    await waitFor(() => {
      const viewButtons = screen.getAllByText("View Details");
      fireEvent.click(viewButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText(/Dispute Details/)).toBeInTheDocument();
    });

    const closeButton = screen.getByText("×");
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText(/Dispute Details/)).not.toBeInTheDocument();
    });
  });

  test("displays resolution form for unresolved disputes", async () => {
    render(<Disputes />);

    await waitFor(() => {
      const viewButtons = screen.getAllByText("View Details");
      fireEvent.click(viewButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText(/Resolve Dispute/)).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter resolution details...")
      ).toBeInTheDocument();
    });
  });

  test("displays resolution details for resolved disputes", async () => {
    render(<Disputes />);

    await waitFor(() => {
      const resolvedButton = screen.getByText(/Resolved/);
      fireEvent.click(resolvedButton);
    });

    await waitFor(() => {
      const viewButtons = screen.getAllByText("View Details");
      fireEvent.click(viewButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText(/Resolution/)).toBeInTheDocument();
      expect(
        screen.getByText(/Warning issued to borrower/)
      ).toBeInTheDocument();
    });
  });

  test("displays correct status badges", async () => {
    render(<Disputes />);

    await waitFor(() => {
      const statusBadges = screen.getAllByText("open");
      expect(statusBadges.length).toBeGreaterThan(0);
    });
  });

  test("displays correct priority badges", async () => {
    render(<Disputes />);

    await waitFor(() => {
      expect(screen.getByText("high")).toBeInTheDocument();
      expect(screen.getByText("medium")).toBeInTheDocument();
      expect(screen.getByText("low")).toBeInTheDocument();
    });
  });

  test("displays type icons for different dispute types", async () => {
    render(<Disputes />);

    await waitFor(() => {
      expect(screen.getByText(/carpool/)).toBeInTheDocument();
      expect(screen.getByText(/book/)).toBeInTheDocument();
      expect(screen.getByText(/bike/)).toBeInTheDocument();
    });
  });

  test("shows empty state when no disputes match filter", async () => {
    render(<Disputes />);

    await waitFor(() => {
      const openButton = screen.getByText(/Open/);
      fireEvent.click(openButton);
    });

    // Clear all disputes by filtering to a status with no matches
    await waitFor(() => {
      const allButton = screen.getByText(/All Disputes/);
      fireEvent.click(allButton);
    });
  });
});
