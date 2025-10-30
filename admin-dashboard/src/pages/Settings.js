import React, { useState } from "react";

const Settings = () => {
  const [settings, setSettings] = useState({
    // Platform Settings
    platformName: "OfficeShare",
    maxCarpoolSeats: 8,
    defaultTripCost: 5.0,
    bookBorrowDays: 14,

    // Notification Settings
    emailNotifications: true,
    pushNotifications: true,
    reminderHours: 24,
    overdueNotifications: true,

    // Security Settings
    requireApproval: true,
    autoApproveReturns: false,
    maxLoginAttempts: 5,
    sessionTimeout: 30,

    // Feature Flags
    carpoolingEnabled: true,
    bookSharingEnabled: true,
    bikeSharingEnabled: false,
    chatEnabled: true,
    ratingsEnabled: true,

    // Environmental Settings
    co2PerMile: 0.404,
    fuelCostPerMile: 0.15,

    // Office Settings
    officeAddress: "123 Business Park Dr, Tech City, TC 12345",
    workingHours: "8:00 AM - 6:00 PM",
    timeZone: "America/New_York",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSettingChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      setMessage(null);

      // Simulate API call
      console.log("Saving settings:", settings);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setMessage({ type: "success", text: "Settings saved successfully!" });
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({
        type: "error",
        text: "Failed to save settings. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetSettings = () => {
    if (
      window.confirm("Are you sure you want to reset all settings to defaults?")
    ) {
      // Reset to default values
      setSettings({
        platformName: "OfficeShare",
        maxCarpoolSeats: 8,
        defaultTripCost: 5.0,
        bookBorrowDays: 14,
        emailNotifications: true,
        pushNotifications: true,
        reminderHours: 24,
        overdueNotifications: true,
        requireApproval: true,
        autoApproveReturns: false,
        maxLoginAttempts: 5,
        sessionTimeout: 30,
        carpoolingEnabled: true,
        bookSharingEnabled: true,
        bikeSharingEnabled: false,
        chatEnabled: true,
        ratingsEnabled: true,
        co2PerMile: 0.404,
        fuelCostPerMile: 0.15,
        officeAddress: "123 Business Park Dr, Tech City, TC 12345",
        workingHours: "8:00 AM - 6:00 PM",
        timeZone: "America/New_York",
      });
      setMessage({ type: "success", text: "Settings reset to defaults." });
    }
  };

  const SettingSection = ({ title, children }) => (
    <div className="card">
      <h3>{title}</h3>
      <div className="settings-grid">{children}</div>
    </div>
  );

  const SettingField = ({
    label,
    type = "text",
    value,
    onChange,
    options,
    disabled = false,
  }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {type === "select" ? (
        <select
          className="form-control"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : type === "checkbox" ? (
        <label className="checkbox-container">
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
          />
          <span className="checkmark"></span>
        </label>
      ) : (
        <input
          type={type}
          className="form-control"
          value={value}
          onChange={(e) =>
            onChange(
              type === "number"
                ? parseFloat(e.target.value) || 0
                : e.target.value
            )
          }
          disabled={disabled}
        />
      )}
    </div>
  );

  return (
    <div className="container">
      <div className="page-header">
        <h2>Platform Settings</h2>
        <p>Configure platform behavior and features</p>
      </div>

      {message && (
        <div className={message.type === "success" ? "success" : "error"}>
          {message.text}
        </div>
      )}

      {/* Platform Settings */}
      <SettingSection title="Platform Configuration">
        <SettingField
          label="Platform Name"
          value={settings.platformName}
          onChange={(value) => handleSettingChange("platformName", value)}
        />
        <SettingField
          label="Office Address"
          value={settings.officeAddress}
          onChange={(value) => handleSettingChange("officeAddress", value)}
        />
        <SettingField
          label="Working Hours"
          value={settings.workingHours}
          onChange={(value) => handleSettingChange("workingHours", value)}
        />
        <SettingField
          label="Time Zone"
          type="select"
          value={settings.timeZone}
          onChange={(value) => handleSettingChange("timeZone", value)}
          options={[
            { value: "America/New_York", label: "Eastern Time" },
            { value: "America/Chicago", label: "Central Time" },
            { value: "America/Denver", label: "Mountain Time" },
            { value: "America/Los_Angeles", label: "Pacific Time" },
          ]}
        />
      </SettingSection>

      {/* Carpool Settings */}
      <SettingSection title="Carpooling Settings">
        <SettingField
          label="Maximum Seats per Carpool"
          type="number"
          value={settings.maxCarpoolSeats}
          onChange={(value) => handleSettingChange("maxCarpoolSeats", value)}
        />
        <SettingField
          label="Default Trip Cost ($)"
          type="number"
          value={settings.defaultTripCost}
          onChange={(value) => handleSettingChange("defaultTripCost", value)}
        />
        <SettingField
          label="CO₂ per Mile (kg)"
          type="number"
          value={settings.co2PerMile}
          onChange={(value) => handleSettingChange("co2PerMile", value)}
        />
        <SettingField
          label="Fuel Cost per Mile ($)"
          type="number"
          value={settings.fuelCostPerMile}
          onChange={(value) => handleSettingChange("fuelCostPerMile", value)}
        />
      </SettingSection>

      {/* Book Sharing Settings */}
      <SettingSection title="Book Sharing Settings">
        <SettingField
          label="Default Borrow Period (days)"
          type="number"
          value={settings.bookBorrowDays}
          onChange={(value) => handleSettingChange("bookBorrowDays", value)}
        />
        <SettingField
          label="Require Approval for Borrowing"
          type="checkbox"
          value={settings.requireApproval}
          onChange={(value) => handleSettingChange("requireApproval", value)}
        />
        <SettingField
          label="Auto-approve Returns"
          type="checkbox"
          value={settings.autoApproveReturns}
          onChange={(value) => handleSettingChange("autoApproveReturns", value)}
        />
      </SettingSection>

      {/* Notification Settings */}
      <SettingSection title="Notification Settings">
        <SettingField
          label="Email Notifications"
          type="checkbox"
          value={settings.emailNotifications}
          onChange={(value) => handleSettingChange("emailNotifications", value)}
        />
        <SettingField
          label="Push Notifications"
          type="checkbox"
          value={settings.pushNotifications}
          onChange={(value) => handleSettingChange("pushNotifications", value)}
        />
        <SettingField
          label="Reminder Hours Before Trip"
          type="number"
          value={settings.reminderHours}
          onChange={(value) => handleSettingChange("reminderHours", value)}
        />
        <SettingField
          label="Overdue Book Notifications"
          type="checkbox"
          value={settings.overdueNotifications}
          onChange={(value) =>
            handleSettingChange("overdueNotifications", value)
          }
        />
      </SettingSection>

      {/* Security Settings */}
      <SettingSection title="Security Settings">
        <SettingField
          label="Maximum Login Attempts"
          type="number"
          value={settings.maxLoginAttempts}
          onChange={(value) => handleSettingChange("maxLoginAttempts", value)}
        />
        <SettingField
          label="Session Timeout (minutes)"
          type="number"
          value={settings.sessionTimeout}
          onChange={(value) => handleSettingChange("sessionTimeout", value)}
        />
      </SettingSection>

      {/* Feature Flags */}
      <SettingSection title="Feature Management">
        <SettingField
          label="Enable Carpooling"
          type="checkbox"
          value={settings.carpoolingEnabled}
          onChange={(value) => handleSettingChange("carpoolingEnabled", value)}
        />
        <SettingField
          label="Enable Book Sharing"
          type="checkbox"
          value={settings.bookSharingEnabled}
          onChange={(value) => handleSettingChange("bookSharingEnabled", value)}
        />
        <SettingField
          label="Enable Bike Sharing"
          type="checkbox"
          value={settings.bikeSharingEnabled}
          onChange={(value) => handleSettingChange("bikeSharingEnabled", value)}
        />
        <SettingField
          label="Enable Chat"
          type="checkbox"
          value={settings.chatEnabled}
          onChange={(value) => handleSettingChange("chatEnabled", value)}
        />
        <SettingField
          label="Enable Ratings"
          type="checkbox"
          value={settings.ratingsEnabled}
          onChange={(value) => handleSettingChange("ratingsEnabled", value)}
        />
      </SettingSection>

      {/* Action Buttons */}
      <div className="card">
        <div className="settings-actions">
          <button
            className={`btn btn-primary ${loading ? "loading" : ""}`}
            onClick={handleSaveSettings}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Settings"}
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleResetSettings}
            disabled={loading}
          >
            Reset to Defaults
          </button>

          <button className="btn btn-secondary" disabled={loading}>
            Export Configuration
          </button>

          <button className="btn btn-secondary" disabled={loading}>
            Import Configuration
          </button>
        </div>
      </div>

      {/* System Information */}
      <div className="card">
        <h3>System Information</h3>
        <div className="system-info">
          <div className="info-row">
            <strong>Version:</strong> 1.0.0
          </div>
          <div className="info-row">
            <strong>Environment:</strong> Development
          </div>
          <div className="info-row">
            <strong>Database:</strong> MongoDB Atlas
          </div>
          <div className="info-row">
            <strong>Last Updated:</strong> {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
