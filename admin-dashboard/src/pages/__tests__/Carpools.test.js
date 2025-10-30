import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Carpools from "../Carpools";

describe("Carpools Component", () => {
  test("renders carpools page title and description", () => {
    render(<Carpools />);

    expect(screen.getByText("Carpool Management")).toBeInTheDocument();
    expect(
      screen.getByText("Monitor and manage carpool trips across the platform")
    ).toBeInTheDocument();
  });

  test("displays loading state initially", () => {
    render(<Carpools />);

    expect(screen.getByText("Loading carpool trips...")).toBeInTheDocument();
  });

  test("displays stats cards after loading", async () => {
    render(<Carpools />);

    await waitFor(() => {
      expect(screen.getByText("Active Trips")).toBeInTheDocument();
      expect(screen.getByText("Completed")).toBeInTheDocument();
      expect(screen.getByText("Cancelled")).toBeInTheDocument();
      expect(screen.getByText("Total Riders")).toBeInTheDocument();
    });
  });

  test("displays trips table after loading", async () => {
    render(<Carpools />);

    await waitFor(() => {
      expect(screen.getByText("Carpool Trips (4)")).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Sarah Wilson")).toBeInTheDocument();
      expect(screen.getByText("Mike Johnson")).toBeInTheDocument();
      expect(screen.getByText("David Lee")).toBeInTheDocument();
    });
  });

  test("displays trip routes correctly", async () => {
    render(<Carpools />);

    await waitFor(() => {
      expect(screen.getByText("Downtown Plaza")).toBeInTheDocument();
      expect(screen.getByText("→ Tech Office Park")).toBeInTheDocument();
      expect(screen.getByText("Suburb Area")).toBeInTheDocument();
      expect(screen.getByText("→ Business District")).toBeInTheDocument();
    });
  });

  test("filters trips by status", async () => {
    render(<Carpools />);

    await waitFor(() => {
      const statusFilter = screen.getByDisplayValue("All Status");
      fireEvent.change(statusFilter, { target: { value: "active" } });

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Sarah Wilson")).toBeInTheDocument();
      expect(screen.queryByText("Mike Johnson")).not.toBeInTheDocument(); // completed trip
    });
  });

  test("opens trip modal when view button is clicked", async () => {
    render(<Carpools />);

    await waitFor(() => {
      const viewButtons = screen.getAllByText("View");
      fireEvent.click(viewButtons[0]);

      expect(screen.getByText("Trip Details")).toBeInTheDocument();
      expect(
        screen.getByText("Downtown Plaza → Tech Office Park")
      ).toBeInTheDocument();
    });
  });

  test("handles trip cancellation", async () => {
    render(<Carpools />);

    await waitFor(() => {
      const cancelButtons = screen.getAllByText("Cancel");
      fireEvent.click(cancelButtons[0]);

      // Trip should be marked as cancelled
      expect(screen.getByText("cancelled")).toBeInTheDocument();
    });
  });

  test("displays correct trip statistics", async () => {
    render(<Carpools />);

    await waitFor(() => {
      expect(screen.getByText("2 / 4")).toBeInTheDocument(); // John's trip seats
      expect(screen.getByText("1 / 3")).toBeInTheDocument(); // Sarah's trip seats
      expect(screen.getByText("$5.00")).toBeInTheDocument(); // John's trip cost
      expect(screen.getByText("$7.50")).toBeInTheDocument(); // Sarah's trip cost
    });
  });

  test("shows rider count for each trip", async () => {
    render(<Carpools />);

    await waitFor(() => {
      const riderCounts = screen.getAllByText("2");
      expect(riderCounts.length).toBeGreaterThan(0); // Multiple trips with 2 riders
    });
  });
});
