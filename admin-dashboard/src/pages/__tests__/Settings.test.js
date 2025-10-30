import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Settings from "../Settings";

describe("Settings Component", () => {
  test("renders settings page title and description", () => {
    render(<Settings />);

    expect(screen.getByText("Platform Settings")).toBeInTheDocument();
    expect(
      screen.getByText("Configure platform behavior and features")
    ).toBeInTheDocument();
  });

  test("displays all setting sections", () => {
    render(<Settings />);

    expect(screen.getByText("Platform Configuration")).toBeInTheDocument();
    expect(screen.getByText("Carpooling Settings")).toBeInTheDocument();
    expect(screen.getByText("Book Sharing Settings")).toBeInTheDocument();
    expect(screen.getByText("Notification Settings")).toBeInTheDocument();
    expect(screen.getByText("Security Settings")).toBeInTheDocument();
    expect(screen.getByText("Feature Management")).toBeInTheDocument();
  });

  test("displays platform configuration fields", () => {
    render(<Settings />);

    expect(screen.getByDisplayValue("OfficeShare")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("123 Business Park Dr, Tech City, TC 12345")
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("8:00 AM - 6:00 PM")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Eastern Time")).toBeInTheDocument();
  });

  test("displays carpooling settings with correct values", () => {
    render(<Settings />);

    expect(screen.getByDisplayValue("8")).toBeInTheDocument(); // Max seats
    expect(screen.getByDisplayValue("5")).toBeInTheDocument(); // Default cost
    expect(screen.getByDisplayValue("0.404")).toBeInTheDocument(); // CO2 per mile
    expect(screen.getByDisplayValue("0.15")).toBeInTheDocument(); // Fuel cost per mile
  });

  test("displays book sharing settings", () => {
    render(<Settings />);

    expect(screen.getByDisplayValue("14")).toBeInTheDocument(); // Borrow days

    // Check checkboxes
    const requireApprovalCheckbox = screen.getByLabelText(
      "Require Approval for Borrowing"
    );
    const autoApproveCheckbox = screen.getByLabelText("Auto-approve Returns");

    expect(requireApprovalCheckbox).toBeChecked();
    expect(autoApproveCheckbox).not.toBeChecked();
  });

  test("displays notification settings", () => {
    render(<Settings />);

    const emailCheckbox = screen.getByLabelText("Email Notifications");
    const pushCheckbox = screen.getByLabelText("Push Notifications");
    const overdueCheckbox = screen.getByLabelText("Overdue Book Notifications");

    expect(emailCheckbox).toBeChecked();
    expect(pushCheckbox).toBeChecked();
    expect(overdueCheckbox).toBeChecked();

    expect(screen.getByDisplayValue("24")).toBeInTheDocument(); // Reminder hours
  });

  test("displays security settings", () => {
    render(<Settings />);

    expect(screen.getByDisplayValue("5")).toBeInTheDocument(); // Max login attempts
    expect(screen.getByDisplayValue("30")).toBeInTheDocument(); // Session timeout
  });

  test("displays feature management toggles", () => {
    render(<Settings />);

    const carpoolingCheckbox = screen.getByLabelText("Enable Carpooling");
    const bookSharingCheckbox = screen.getByLabelText("Enable Book Sharing");
    const bikeSharingCheckbox = screen.getByLabelText("Enable Bike Sharing");
    const chatCheckbox = screen.getByLabelText("Enable Chat");
    const ratingsCheckbox = screen.getByLabelText("Enable Ratings");

    expect(carpoolingCheckbox).toBeChecked();
    expect(bookSharingCheckbox).toBeChecked();
    expect(bikeSharingCheckbox).not.toBeChecked();
    expect(chatCheckbox).toBeChecked();
    expect(ratingsCheckbox).toBeChecked();
  });

  test("updates settings when form fields are changed", () => {
    render(<Settings />);

    const platformNameInput = screen.getByDisplayValue("OfficeShare");
    fireEvent.change(platformNameInput, { target: { value: "MyOfficeShare" } });

    expect(screen.getByDisplayValue("MyOfficeShare")).toBeInTheDocument();
  });

  test("toggles checkbox settings", () => {
    render(<Settings />);

    const bikeSharingCheckbox = screen.getByLabelText("Enable Bike Sharing");
    expect(bikeSharingCheckbox).not.toBeChecked();

    fireEvent.click(bikeSharingCheckbox);
    expect(bikeSharingCheckbox).toBeChecked();
  });

  test("displays action buttons", () => {
    render(<Settings />);

    expect(screen.getByText("Save Settings")).toBeInTheDocument();
    expect(screen.getByText("Reset to Defaults")).toBeInTheDocument();
    expect(screen.getByText("Export Configuration")).toBeInTheDocument();
    expect(screen.getByText("Import Configuration")).toBeInTheDocument();
  });

  test("handles save settings action", async () => {
    render(<Settings />);

    const saveButton = screen.getByText("Save Settings");
    fireEvent.click(saveButton);

    expect(screen.getByText("Saving...")).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText("Settings saved successfully!")
      ).toBeInTheDocument();
    });
  });

  test("handles reset settings action", () => {
    render(<Settings />);

    // Change a setting first
    const platformNameInput = screen.getByDisplayValue("OfficeShare");
    fireEvent.change(platformNameInput, { target: { value: "Changed" } });
    expect(screen.getByDisplayValue("Changed")).toBeInTheDocument();

    // Mock window.confirm to return true
    window.confirm = jest.fn(() => true);

    const resetButton = screen.getByText("Reset to Defaults");
    fireEvent.click(resetButton);

    expect(screen.getByDisplayValue("OfficeShare")).toBeInTheDocument();
    expect(screen.getByText("Settings reset to defaults.")).toBeInTheDocument();
  });

  test("displays system information", () => {
    render(<Settings />);

    expect(screen.getByText("System Information")).toBeInTheDocument();
    expect(screen.getByText("Version:")).toBeInTheDocument();
    expect(screen.getByText("1.0.0")).toBeInTheDocument();
    expect(screen.getByText("Environment:")).toBeInTheDocument();
    expect(screen.getByText("Development")).toBeInTheDocument();
    expect(screen.getByText("Database:")).toBeInTheDocument();
    expect(screen.getByText("MongoDB Atlas")).toBeInTheDocument();
  });

  test("updates numeric settings correctly", () => {
    render(<Settings />);

    const maxSeatsInput = screen.getByDisplayValue("8");
    fireEvent.change(maxSeatsInput, { target: { value: "6" } });

    expect(screen.getByDisplayValue("6")).toBeInTheDocument();
  });

  test("updates select dropdown settings", () => {
    render(<Settings />);

    const timezoneSelect = screen.getByDisplayValue("Eastern Time");
    fireEvent.change(timezoneSelect, {
      target: { value: "America/Los_Angeles" },
    });

    expect(screen.getByDisplayValue("Pacific Time")).toBeInTheDocument();
  });
});
