import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Layout from "../Layout";

const MockLayout = ({ children }) => (
  <BrowserRouter>
    <Layout>{children}</Layout>
  </BrowserRouter>
);

describe("Layout Component", () => {
  test("renders layout with sidebar and main content", () => {
    render(
      <MockLayout>
        <div>Test Content</div>
      </MockLayout>
    );

    expect(screen.getByText("OfficeShare Admin")).toBeInTheDocument();
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  test("renders all navigation items", () => {
    render(
      <MockLayout>
        <div>Test Content</div>
      </MockLayout>
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Carpools")).toBeInTheDocument();
    expect(screen.getByText("Books")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  test("toggles sidebar when toggle button is clicked", () => {
    render(
      <MockLayout>
        <div>Test Content</div>
      </MockLayout>
    );

    const toggleButton = screen.getByText("←");
    const sidebar = toggleButton.closest(".sidebar");

    expect(sidebar).toHaveClass("open");

    fireEvent.click(toggleButton);
    expect(sidebar).toHaveClass("closed");

    fireEvent.click(toggleButton);
    expect(sidebar).toHaveClass("open");
  });

  test("displays header with correct title", () => {
    render(
      <MockLayout>
        <div>Test Content</div>
      </MockLayout>
    );

    expect(
      screen.getByText("OfficeShare Platform Administration")
    ).toBeInTheDocument();
    expect(screen.getByText("Admin User")).toBeInTheDocument();
    expect(screen.getByText("Logout")).toBeInTheDocument();
  });
});
