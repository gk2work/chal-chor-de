import React, { useState, useEffect } from "react";
import { apiService } from "../services/api";

const Carpools = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showTripModal, setShowTripModal] = useState(false);

  // Mock trips data
  const mockTrips = [
    {
      trip_id: "1",
      driver_name: "John Doe",
      driver_id: "user1",
      origin: "Downtown Plaza",
      destination: "Tech Office Park",
      date: "2024-01-22",
      departure_time: "08:00",
      available_seats: 2,
      total_seats: 4,
      cost_per_rider: 5.0,
      status: "active",
      created_at: "2024-01-20T10:00:00Z",
      riders: [
        { user_id: "user2", name: "Jane Smith", status: "confirmed" },
        { user_id: "user3", name: "Mike Johnson", status: "pending" },
      ],
    },
    {
      trip_id: "2",
      driver_name: "Sarah Wilson",
      driver_id: "user4",
      origin: "Suburb Area",
      destination: "Business District",
      date: "2024-01-22",
      departure_time: "08:30",
      available_seats: 1,
      total_seats: 3,
      cost_per_rider: 7.5,
      status: "active",
      created_at: "2024-01-20T11:30:00Z",
      riders: [
        { user_id: "user5", name: "Bob Davis", status: "confirmed" },
        { user_id: "user6", name: "Alice Brown", status: "confirmed" },
      ],
    },
    {
      trip_id: "3",
      driver_name: "Mike Johnson",
      driver_id: "user3",
      origin: "North Side",
      destination: "Corporate Center",
      date: "2024-01-21",
      departure_time: "17:30",
      available_seats: 3,
      total_seats: 4,
      cost_per_rider: 6.0,
      status: "completed",
      created_at: "2024-01-19T14:00:00Z",
      riders: [{ user_id: "user7", name: "Carol White", status: "completed" }],
    },
    {
      trip_id: "4",
      driver_name: "David Lee",
      driver_id: "user8",
      origin: "East District",
      destination: "Main Office",
      date: "2024-01-21",
      departure_time: "08:15",
      available_seats: 0,
      total_seats: 2,
      cost_per_rider: 4.5,
      status: "cancelled",
      created_at: "2024-01-19T16:45:00Z",
      riders: [
        { user_id: "user9", name: "Emma Taylor", status: "cancelled" },
        { user_id: "user10", name: "Frank Miller", status: "cancelled" },
      ],
    },
  ];

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      setLoading(true);
      setError(null);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      setTrips(mockTrips);
    } catch (err) {
      console.error("Error loading trips:", err);
      setError("Failed to load carpool trips");
    } finally {
      setLoading(false);
    }
  };

  const handleTripAction = async (tripId, action) => {
    try {
      console.log(`Performing ${action} on trip ${tripId}`);

      if (action === "cancel") {
        setTrips(
          trips.map((trip) =>
            trip.trip_id === tripId ? { ...trip, status: "cancelled" } : trip
          )
        );
      }

      // In a real app, this would be an API call
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`Error performing ${action}:`, err);
      setError(`Failed to ${action} trip`);
    }
  };

  const filteredTrips = trips.filter((trip) => {
    return filterStatus === "all" || trip.status === filterStatus;
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeString) => {
    return new Date(`2024-01-01T${timeString}:00`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "#4CAF50";
      case "completed":
        return "#2196F3";
      case "cancelled":
        return "#f44336";
      case "pending":
        return "#FF9800";
      default:
        return "#666";
    }
  };

  const TripModal = ({ trip, onClose }) => {
    if (!trip) return null;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content large-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h3>Trip Details</h3>
            <button className="modal-close" onClick={onClose}>
              ×
            </button>
          </div>

          <div className="modal-body">
            <div className="trip-details">
              <div className="detail-section">
                <h4>Trip Information</h4>
                <div className="detail-row">
                  <strong>Driver:</strong> {trip.driver_name}
                </div>
                <div className="detail-row">
                  <strong>Route:</strong> {trip.origin} → {trip.destination}
                </div>
                <div className="detail-row">
                  <strong>Date & Time:</strong> {formatDate(trip.date)} at{" "}
                  {formatTime(trip.departure_time)}
                </div>
                <div className="detail-row">
                  <strong>Status:</strong>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(trip.status) }}
                  >
                    {trip.status}
                  </span>
                </div>
                <div className="detail-row">
                  <strong>Cost per Rider:</strong> $
                  {trip.cost_per_rider.toFixed(2)}
                </div>
                <div className="detail-row">
                  <strong>Available Seats:</strong> {trip.available_seats} /{" "}
                  {trip.total_seats}
                </div>
              </div>

              <div className="detail-section">
                <h4>Riders ({trip.riders.length})</h4>
                {trip.riders.length > 0 ? (
                  <div className="riders-list">
                    {trip.riders.map((rider) => (
                      <div key={rider.user_id} className="rider-item">
                        <span className="rider-name">{rider.name}</span>
                        <span className={`status-badge status-${rider.status}`}>
                          {rider.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No riders yet</p>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            {trip.status === "active" && (
              <button
                className="btn btn-danger"
                onClick={() => {
                  handleTripAction(trip.trip_id, "cancel");
                  onClose();
                }}
              >
                Cancel Trip
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading carpool trips...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">
          {error}
          <button
            className="btn btn-primary"
            onClick={loadTrips}
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
        <h2>Carpool Management</h2>
        <p>Monitor and manage carpool trips across the platform</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value" style={{ color: "#4CAF50" }}>
            {trips.filter((t) => t.status === "active").length}
          </div>
          <div className="stat-label">Active Trips</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "#2196F3" }}>
            {trips.filter((t) => t.status === "completed").length}
          </div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "#f44336" }}>
            {trips.filter((t) => t.status === "cancelled").length}
          </div>
          <div className="stat-label">Cancelled</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "#FF9800" }}>
            {trips.reduce((sum, trip) => sum + trip.riders.length, 0)}
          </div>
          <div className="stat-label">Total Riders</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="filters-section">
          <div className="filter-controls">
            <select
              className="form-control"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <button className="btn btn-primary">📊 Export Trips</button>
          </div>
        </div>
      </div>

      {/* Trips Table */}
      <div className="card">
        <div className="table-header">
          <h3>Carpool Trips ({filteredTrips.length})</h3>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Driver</th>
              <th>Route</th>
              <th>Date & Time</th>
              <th>Seats</th>
              <th>Cost</th>
              <th>Riders</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrips.map((trip) => (
              <tr key={trip.trip_id}>
                <td>
                  <strong>{trip.driver_name}</strong>
                </td>
                <td>
                  <div className="route-info">
                    <div>{trip.origin}</div>
                    <div style={{ color: "#666", fontSize: "0.9em" }}>
                      → {trip.destination}
                    </div>
                  </div>
                </td>
                <td>
                  <div>
                    <div>{formatDate(trip.date)}</div>
                    <div style={{ color: "#666", fontSize: "0.9em" }}>
                      {formatTime(trip.departure_time)}
                    </div>
                  </div>
                </td>
                <td>
                  <span
                    className={trip.available_seats === 0 ? "text-danger" : ""}
                  >
                    {trip.available_seats} / {trip.total_seats}
                  </span>
                </td>
                <td>${trip.cost_per_rider.toFixed(2)}</td>
                <td>{trip.riders.length}</td>
                <td>
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor: getStatusColor(trip.status),
                      color: "white",
                    }}
                  >
                    {trip.status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setSelectedTrip(trip);
                        setShowTripModal(true);
                      }}
                    >
                      View
                    </button>
                    {trip.status === "active" && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleTripAction(trip.trip_id, "cancel")}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredTrips.length === 0 && (
          <div className="empty-state">
            <p>No trips found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Trip Modal */}
      {showTripModal && (
        <TripModal
          trip={selectedTrip}
          onClose={() => {
            setShowTripModal(false);
            setSelectedTrip(null);
          }}
        />
      )}
    </div>
  );
};

export default Carpools;
