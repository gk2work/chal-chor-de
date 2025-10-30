import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Books from "../Books";

describe("Books Component", () => {
  test("renders books page title and description", () => {
    render(<Books />);

    expect(screen.getByText("Book Library Management")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Manage the shared book library and track borrowing activity"
      )
    ).toBeInTheDocument();
  });

  test("displays loading state initially", () => {
    render(<Books />);

    expect(screen.getByText("Loading books...")).toBeInTheDocument();
  });

  test("displays stats cards after loading", async () => {
    render(<Books />);

    await waitFor(() => {
      expect(screen.getByText("Available")).toBeInTheDocument();
      expect(screen.getByText("Borrowed")).toBeInTheDocument();
      expect(screen.getByText("Overdue")).toBeInTheDocument();
      expect(screen.getByText("Total Borrows")).toBeInTheDocument();
    });
  });

  test("displays books table after loading", async () => {
    render(<Books />);

    await waitFor(() => {
      expect(screen.getByText("Library Books (5)")).toBeInTheDocument();
      expect(screen.getByText("Effective Java")).toBeInTheDocument();
      expect(screen.getByText("Domain-Driven Design")).toBeInTheDocument();
      expect(
        screen.getByText("JavaScript: The Good Parts")
      ).toBeInTheDocument();
      expect(screen.getByText("Learning React")).toBeInTheDocument();
      expect(screen.getByText("Clean Architecture")).toBeInTheDocument();
    });
  });

  test("displays book authors correctly", async () => {
    render(<Books />);

    await waitFor(() => {
      expect(screen.getByText("Joshua Bloch")).toBeInTheDocument();
      expect(screen.getByText("Eric Evans")).toBeInTheDocument();
      expect(screen.getByText("Douglas Crockford")).toBeInTheDocument();
      expect(screen.getByText("Alex Banks, Eve Porcello")).toBeInTheDocument();
      expect(screen.getByText("Robert C. Martin")).toBeInTheDocument();
    });
  });

  test("filters books by search term", async () => {
    render(<Books />);

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(
        "Search books by title, author, or owner..."
      );
      fireEvent.change(searchInput, { target: { value: "Java" } });

      expect(screen.getByText("Effective Java")).toBeInTheDocument();
      expect(
        screen.getByText("JavaScript: The Good Parts")
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Domain-Driven Design")
      ).not.toBeInTheDocument();
    });
  });

  test("filters books by status", async () => {
    render(<Books />);

    await waitFor(() => {
      const statusFilter = screen.getByDisplayValue("All Status");
      fireEvent.change(statusFilter, { target: { value: "available" } });

      expect(screen.getByText("Effective Java")).toBeInTheDocument();
      expect(
        screen.getByText("JavaScript: The Good Parts")
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Domain-Driven Design")
      ).not.toBeInTheDocument(); // borrowed
    });
  });

  test("opens book modal when view button is clicked", async () => {
    render(<Books />);

    await waitFor(() => {
      const viewButtons = screen.getAllByText("View");
      fireEvent.click(viewButtons[0]);

      expect(screen.getByText("Book Details")).toBeInTheDocument();
      expect(screen.getByText("9780134685991")).toBeInTheDocument(); // ISBN
    });
  });

  test("handles book return action", async () => {
    render(<Books />);

    await waitFor(() => {
      const returnButtons = screen.getAllByText("Return");
      expect(returnButtons.length).toBeGreaterThan(0);

      fireEvent.click(returnButtons[0]);

      // Book should be marked as available after return
      expect(screen.getByText("available")).toBeInTheDocument();
    });
  });

  test("displays book conditions correctly", async () => {
    render(<Books />);

    await waitFor(() => {
      expect(screen.getByText("excellent")).toBeInTheDocument();
      expect(screen.getByText("good")).toBeInTheDocument();
      expect(screen.getByText("fair")).toBeInTheDocument();
      expect(screen.getByText("damaged")).toBeInTheDocument();
    });
  });

  test("shows current borrower information", async () => {
    render(<Books />);

    await waitFor(() => {
      expect(screen.getByText("Mike Johnson")).toBeInTheDocument(); // borrower
      expect(screen.getByText("Alice Brown")).toBeInTheDocument(); // borrower
    });
  });

  test("displays book locations", async () => {
    render(<Books />);

    await waitFor(() => {
      expect(screen.getByText("Desk 42A")).toBeInTheDocument();
      expect(screen.getByText("Shelf B-3")).toBeInTheDocument();
      expect(screen.getByText("Common Area")).toBeInTheDocument();
      expect(screen.getByText("Desk 15C")).toBeInTheDocument();
      expect(screen.getByText("Admin Office")).toBeInTheDocument();
    });
  });
});
