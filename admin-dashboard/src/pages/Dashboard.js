import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { apiService } from "../services/api";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeTrips: 0,
    totalBooks: 0,
    completedTrips: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mock data for charts
  const weeklyTripsData = [
    { day: "Mon", trips: 12 },
    { day: "Tue", trips: 19 },
    { day: "Wed", trips: 15 },
    { day: "Thu", trips: 22 },
    { day: "Fri", trips: 18 },
    { day: "Sat", trips: 8 },
    { day: "Sun", trips: 5 },
  ];

  const serviceUsageData = [
    { name: "Carpooling", value: 65, color: "#2196F3" },
    { name: "Book Sharing", value: 25, color: "#4CAF50" },
    { name: "Bike Sharing", value: 10, color: "#FF9800" },
  ];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // In a real app, these would be actual API calls
      // For now, we'll use mock data
      const mockStats = {
        totalUsers: 156,
        activeTrips: 23,
        totalBooks: 89,
        completedTrips: 342,
      };

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setStats(mockStats);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color = "#2196F3" }) => (
    <div className="stat-card">
      <div className="stat-icon" style={{ color }}>
        {icon}
      </div>
      <div className="stat-info">
        <div className="stat-value" style={{ color }}>
          {loading ? "..." : value.toLocaleString()}
        </div>
        <div className="stat-label">{title}</div>
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="container">
        <div className="error">
          {error}
          <button
            className="btn btn-primary"
            onClick={loadDashboardData}
            style={{ marginLeft: "10px" }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h2>Dashboard Overview</h2>
        <p>Monitor your OfficeShare platform performance and usage</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon="👥"
          color="#2196F3"
        />
        <StatCard
          title="Active Carpools"
          value={stats.activeTrips}
          icon="🚗"
          color="#4CAF50"
        />
        <StatCard
          title="Books Available"
          value={stats.totalBooks}
          icon="📚"
          color="#FF9800"
        />
        <StatCard
          title="Completed Trips"
          value={stats.completedTrips}
          icon="✅"
          color="#9C27B0"
        />
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <div className="chart-row">
          {/* Weekly Trips Chart */}
          <div className="card chart-card">
            <h3>Weekly Trip Activity</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weeklyTripsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="trips"
                    stroke="#2196F3"
                    strokeWidth={2}
                    dot={{ fill: "#2196F3", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Service Usage Chart */}
          <div className="card chart-card">
            <h3>Service Usage Distribution</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={serviceUsageData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {serviceUsageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3>Recent Activity</h3>
        <div className="activity-list">
          <div className="activity-item">
            <div className="activity-icon">🚗</div>
            <div className="activity-content">
              <div className="activity-title">New carpool created</div>
              <div className="activity-time">
                John Doe created a trip from Downtown to Tech Park
              </div>
              <div className="activity-timestamp">2 minutes ago</div>
            </div>
          </div>

          <div className="activity-item">
            <div className="activity-icon">👤</div>
            <div className="activity-content">
              <div className="activity-title">New user registered</div>
              <div className="activity-time">
                Jane Smith joined the platform
              </div>
              <div className="activity-timestamp">15 minutes ago</div>
            </div>
          </div>

          <div className="activity-item">
            <div className="activity-icon">📚</div>
            <div className="activity-content">
              <div className="activity-title">Book shared</div>
              <div className="activity-time">
                Mike Johnson shared "Clean Code" by Robert Martin
              </div>
              <div className="activity-timestamp">1 hour ago</div>
            </div>
          </div>

          <div className="activity-item">
            <div className="activity-icon">✅</div>
            <div className="activity-content">
              <div className="activity-title">Trip completed</div>
              <div className="activity-time">
                Carpool from Suburb to Office completed successfully
              </div>
              <div className="activity-timestamp">2 hours ago</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3>Quick Actions</h3>
        <div className="quick-actions">
          <button className="btn btn-primary">📊 Generate Report</button>
          <button className="btn btn-secondary">📧 Send Notifications</button>
          <button className="btn btn-secondary">🔧 System Maintenance</button>
          <button className="btn btn-secondary">📋 Export Data</button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
