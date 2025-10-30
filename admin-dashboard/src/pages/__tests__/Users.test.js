import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Users from "../Users";

describe("Users Component", () => {
  test("renders users page title and description", () => {
    render(<Users />);

    expect(screen.getByText("User Management")).toBeInTheDocument();
    expect(
      screen.getByText("Manage platform users and their activities")
    ).toBeInTheDocument();
  });

  test("displays loading state initially", () => {
    render(<Users />);

    expect(screen.getByText("Loading users...")).toBeInTheDocument();
  });

  test("displays search and filter controls", async () => {
    render(<Users />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Search users by name or email...")
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue("All Status")).toBeInTheDocument();
      expect(screen.getByText("📊 Export Users")).toBeInTheDocument();
    });
  });

  test("displays users table after loading", async () => {
    render(<Users />);

    await waitFor(() => {
      expect(screen.getByText("Users (4)")).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText("Mike Johnson")).toBeInTheDocument();
      expect(screen.getByText("Sarah Wilson")).toBeInTheDocument();
    });
  });

  test("filters users by search term", async () => {
    render(<Users />);

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(
        "Search users by name or email..."
      );
      fireEvent.change(searchInput, { target: { value: "John" } });

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
    });
  });

  test("filters users by status", async () => {
    render(<Users />);

    await waitFor(() => {
      const statusFilter = screen.getByDisplayValue("All Status");
      fireEvent.change(statusFilter, { target: { value: "inactive" } });

      expect(screen.getByText("Sarah Wilson")).toBeInTheDocument();
      expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
    });
  });

  test("opens user modal when view button is clicked", async () => {
    render(<Users />);

    await waitFor(() => {
      const viewButtons = screen.getAllByText("View");
      fireEvent.click(viewButtons[0]);

      expect(screen.getByText("User Details")).toBeInTheDocument();
      expect(screen.getByText("john.doe@company.com")).toBeInTheDocument();
    });
  });

  test("handles user activation/deactivation", async () => {
    render(<Users />);

    await waitFor(() => {
      const deactivateButton = screen.getAllByText("Deactivate")[0];
      fireEvent.click(deactivateButton);

      // Should change to Activate button after deactivation
      expect(screen.getByText("Activate")).toBeInTheDocument();
    });
  });

  test("displays correct user statistics", async () => {
    render(<Users />);

    await waitFor(() => {
      expect(screen.getByText("15")).toBeInTheDocument(); // John's trips
      expect(screen.getByText("22")).toBeInTheDocument(); // Jane's trips
      expect(screen.getByText("⭐ 4.8")).toBeInTheDocument(); // John's rating
      expect(screen.getByText("⭐ 4.9")).toBeInTheDocument(); // Jane's rating
    });
  });
});
