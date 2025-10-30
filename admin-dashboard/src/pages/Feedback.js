import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Analytics.css";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:3000";

const Feedback = () => {
  const [feedbackList, setFeedbackList] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    category: "",
    status: "",
    days: 30,
  });

  useEffect(() => {
    fetchFeedback();
    fetchStats();
  }, [filters]);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user"));

      const params = new URLSearchParams();
      if (filters.category) params.append("category", filters.category);
      if (filters.status) params.append("status", filters.status);
      params.append("limit", "50");

      const response = await axios.get(
        `${API_BASE_URL}/api/feedback/office/${user.office_id}?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setFeedbackList(response.data.feedback);
      setError(null);
    } catch (err) {
      console.error("Error fetching feedback:", err);
      setError("Failed to load feedback");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user"));

      const response = await axios.get(
        `${API_BASE_URL}/api/feedback/stats/office/${user.office_id}?days=${filters.days}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setStats(response.data.stats);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      bug: "#FF3B30",
      feature_request: "#007AFF",
      improvement: "#34C759",
      ux_issue: "#FF9500",
      general: "#8E8E93",
    };
    return colors[category] || "#8E8E93";
  };

  const getStatusBadge = (status) => {
    const badges = {
      new: { label: "New", color: "#007AFF" },
      in_progress: { label: "In Progress", color: "#FF9500" },
      resolved: { label: "Resolved", color: "#34C759" },
      closed: { label: "Closed", color: "#8E8E93" },
    };
    const badge = badges[status] || badges.new;
    return (
      <span
        style={{
          padding: "4px 12px",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: "600",
          backgroundColor: badge.color + "20",
          color: badge.color,
        }}
      >
        {badge.label}
      </span>
    );
  };

  if (loading && !stats) {
    return (
      <div className="analytics-container">
        <div className="loading">Loading feedback...</div>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h1>User Feedback</h1>
        <p>Monitor and respond to user feedback across all modules</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Statistics Overview */}
      {stats && (
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-value">{stats.total}</div>
            <div className="metric-label">Total Feedback</div>
            <div className="metric-sublabel">Last {filters.days} days</div>
          </div>

          <div className="metric-card">
            <div className="metric-value">{stats.avg_rating.toFixed(1)}</div>
            <div className="metric-label">Average Rating</div>
            <div className="metric-sublabel">
              {stats.avg_rating >= 4
                ? "😊 Excellent"
                : stats.avg_rating >= 3
                  ? "🙂 Good"
                  : "😟 Needs Attention"}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-value">{stats.by_category.bug || 0}</div>
            <div className="metric-label">Bug Reports</div>
            <div className="metric-sublabel">Requires attention</div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              {stats.by_category.feature_request || 0}
            </div>
            <div className="metric-label">Feature Requests</div>
            <div className="metric-sublabel">User suggestions</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Time Period:</label>
          <select
            value={filters.days}
            onChange={(e) => setFilters({ ...filters, days: e.target.value })}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Category:</label>
          <select
            value={filters.category}
            onChange={(e) =>
              setFilters({ ...filters, category: e.target.value })
            }
          >
            <option value="">All Categories</option>
            <option value="bug">Bug Report</option>
            <option value="feature_request">Feature Request</option>
            <option value="improvement">Improvement</option>
            <option value="ux_issue">UX Issue</option>
            <option value="general">General</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Status:</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Status</option>
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Category Distribution */}
      {stats && (
        <div className="chart-section">
          <h2>Feedback by Category</h2>
          <div className="category-bars">
            {Object.entries(stats.by_category).map(([category, count]) => (
              <div key={category} className="category-bar-item">
                <div className="category-bar-label">
                  <span style={{ color: getCategoryColor(category) }}>●</span>
                  {category.replace("_", " ")}
                </div>
                <div className="category-bar-container">
                  <div
                    className="category-bar-fill"
                    style={{
                      width: `${(count / stats.total) * 100}%`,
                      backgroundColor: getCategoryColor(category),
                    }}
                  />
                </div>
                <div className="category-bar-count">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rating Distribution */}
      {stats && (
        <div className="chart-section">
          <h2>Rating Distribution</h2>
          <div className="rating-bars">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="rating-bar-item">
                <div className="rating-bar-label">{"⭐".repeat(rating)}</div>
                <div className="rating-bar-container">
                  <div
                    className="rating-bar-fill"
                    style={{
                      width: `${(stats.rating_distribution[rating] / stats.total) * 100}%`,
                      backgroundColor:
                        rating >= 4
                          ? "#34C759"
                          : rating >= 3
                            ? "#FF9500"
                            : "#FF3B30",
                    }}
                  />
                </div>
                <div className="rating-bar-count">
                  {stats.rating_distribution[rating]}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feedback List */}
      <div className="feedback-list-section">
        <h2>Recent Feedback</h2>
        {feedbackList.length === 0 ? (
          <div className="no-data">
            No feedback found for the selected filters
          </div>
        ) : (
          <div className="feedback-list">
            {feedbackList.map((feedback) => (
              <div key={feedback._id} className="feedback-item">
                <div className="feedback-header">
                  <div className="feedback-title-row">
                    <h3>{feedback.title}</h3>
                    {getStatusBadge(feedback.status)}
                  </div>
                  <div className="feedback-meta">
                    <span
                      className="feedback-category"
                      style={{ color: getCategoryColor(feedback.category) }}
                    >
                      {feedback.category.replace("_", " ")}
                    </span>
                    {feedback.module && (
                      <span className="feedback-module">
                        {feedback.module.replace("_", " ")}
                      </span>
                    )}
                    {feedback.rating && (
                      <span className="feedback-rating">
                        {"⭐".repeat(feedback.rating)}
                      </span>
                    )}
                    <span className="feedback-date">
                      {new Date(feedback.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="feedback-description">
                  {feedback.description}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Feedback;
