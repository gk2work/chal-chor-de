import React, { useState, useEffect } from "react";
import { apiService } from "../services/api";

const Disputes = () => {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [resolution, setResolution] = useState("");
  const [actionTaken, setActionTaken] = useState("");

  useEffect(() => {
    loadDisputes();
  }, [filter]);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      const officeId = "office_1";
      const response = await apiService.getDisputes(officeId, filter);
      setDisputes(response.data.disputes || []);
    } catch (error) {
      console.error("Error loading disputes:", error);
      // Fallback to mock data
      loadMockDisputes();
    } finally {
      setLoading(false);
    }
  };

  const loadMockDisputes = () => {
    const mockDisputes = [
      {
        dispute_id: "disp_001",
        type: "carpool",
        transaction_id: "trip_123",
        reporter_id: "user_001",
        reporter_name: "John Doe",
        reported_user_id: "user_002",
        reported_user_name: "Jane Smith",
        status: "open",
        priority: "high",
        category: "no_show",
        description: "Driver did not show up at the agreed pickup location",
        evidence: [
          { type: "message", content: "Waited for 20 minutes, no response" },
          { type: "location", content: "GPS shows I was at pickup point" },
        ],
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        dispute_id: "disp_002",
        type: "book",
        transaction_id: "borrow_456",
        reporter_id: "user_003",
        reporter_name: "Mike Johnson",
        reported_user_id: "user_004",
        reported_user_name: "Sarah Wilson",
        status: "in_review",
        priority: "medium",
        category: "damaged_item",
        description: "Book returned with water damage and torn pages",
        evidence: [
          { type: "photo", content: "photo_evidence_1.jpg" },
          { type: "photo", content: "photo_evidence_2.jpg" },
        ],
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      },
      {
        dispute_id: "disp_003",
        type: "bike",
        transaction_id: "bike_789",
        reporter_id: "user_005",
        reporter_name: "David Lee",
        reported_user_id: "user_006",
        reported_user_name: "Emily Brown",
        status: "resolved",
        priority: "low",
        category: "late_return",
        description: "Bike returned 3 days late without prior notice",
        evidence: [
          { type: "message", content: "Multiple reminder messages sent" },
        ],
        resolution:
          "Warning issued to borrower. Future late returns may result in suspension.",
        resolved_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      },
    ];
    setDisputes(mockDisputes);
  };

  const handleResolveDispute = async () => {
    if (!selectedDispute || !resolution) return;

    try {
      await apiService.resolveDispute(selectedDispute.dispute_id, {
        resolution,
        action_taken: actionTaken,
      });

      // Update local state
      setDisputes(
        disputes.map((d) =>
          d.dispute_id === selectedDispute.dispute_id
            ? {
                ...d,
                status: "resolved",
                resolution,
                resolved_at: new Date().toISOString(),
              }
            : d
        )
      );

      setShowModal(false);
      setSelectedDispute(null);
      setResolution("");
      setActionTaken("");
    } catch (error) {
      console.error("Error resolving dispute:", error);
      alert("Failed to resolve dispute. Please try again.");
    }
  };

  const handleUpdateStatus = async (disputeId, newStatus) => {
    try {
      await apiService.updateDisputeStatus(disputeId, newStatus);
      setDisputes(
        disputes.map((d) =>
          d.dispute_id === disputeId ? { ...d, status: newStatus } : d
        )
      );
    } catch (error) {
      console.error("Error updating dispute status:", error);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "open":
        return "#f44336";
      case "in_review":
        return "#FF9800";
      case "resolved":
        return "#4CAF50";
      case "closed":
        return "#9E9E9E";
      default:
        return "#2196F3";
    }
  };

  const getPriorityBadgeColor = (priority) => {
    switch (priority) {
      case "high":
        return "#f44336";
      case "medium":
        return "#FF9800";
      case "low":
        return "#4CAF50";
      default:
        return "#2196F3";
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "carpool":
        return "🚗";
      case "book":
        return "📚";
      case "bike":
        return "🚴";
      default:
        return "📋";
    }
  };

  const filteredDisputes = disputes.filter((d) => {
    if (filter === "all") return true;
    return d.status === filter;
  });

  return (
    <div className="container">
      <div className="page-header">
        <h2>Dispute Resolution</h2>
        <p>Manage and resolve user disputes across all platform services</p>
      </div>

      {/* Filters and Stats */}
      <div className="card">
        <div className="filters-section">
          <div className="filter-controls">
            <button
              className={`filter-btn ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
            >
              All Disputes ({disputes.length})
            </button>
            <button
              className={`filter-btn ${filter === "open" ? "active" : ""}`}
              onClick={() => setFilter("open")}
            >
              Open ({disputes.filter((d) => d.status === "open").length})
            </button>
            <button
              className={`filter-btn ${filter === "in_review" ? "active" : ""}`}
              onClick={() => setFilter("in_review")}
            >
              In Review (
              {disputes.filter((d) => d.status === "in_review").length})
            </button>
            <button
              className={`filter-btn ${filter === "resolved" ? "active" : ""}`}
              onClick={() => setFilter("resolved")}
            >
              Resolved ({disputes.filter((d) => d.status === "resolved").length}
              )
            </button>
          </div>
        </div>
      </div>

      {/* Disputes List */}
      <div className="card">
        {loading ? (
          <div className="loading">Loading disputes...</div>
        ) : filteredDisputes.length === 0 ? (
          <div className="empty-state">
            <p>No disputes found</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Reporter</th>
                <th>Reported User</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDisputes.map((dispute) => (
                <tr key={dispute.dispute_id}>
                  <td>
                    <strong>{dispute.dispute_id}</strong>
                  </td>
                  <td>
                    <span className="type-badge">
                      {getTypeIcon(dispute.type)} {dispute.type}
                    </span>
                  </td>
                  <td>{dispute.reporter_name}</td>
                  <td>{dispute.reported_user_name}</td>
                  <td>{dispute.category.replace(/_/g, " ")}</td>
                  <td>
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: getPriorityBadgeColor(
                          dispute.priority
                        ),
                      }}
                    >
                      {dispute.priority}
                    </span>
                  </td>
                  <td>
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: getStatusBadgeColor(dispute.status),
                      }}
                    >
                      {dispute.status}
                    </span>
                  </td>
                  <td>{new Date(dispute.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        setSelectedDispute(dispute);
                        setShowModal(true);
                      }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Dispute Details Modal */}
      {showModal && selectedDispute && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Dispute Details - {selectedDispute.dispute_id}</h3>
              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="dispute-details">
                <div className="detail-section">
                  <h4>Basic Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Type:</label>
                      <span>
                        {getTypeIcon(selectedDispute.type)}{" "}
                        {selectedDispute.type}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label>Transaction ID:</label>
                      <span>{selectedDispute.transaction_id}</span>
                    </div>
                    <div className="detail-item">
                      <label>Priority:</label>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: getPriorityBadgeColor(
                            selectedDispute.priority
                          ),
                        }}
                      >
                        {selectedDispute.priority}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label>Status:</label>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: getStatusBadgeColor(
                            selectedDispute.status
                          ),
                        }}
                      >
                        {selectedDispute.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Parties Involved</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Reporter:</label>
                      <span>
                        {selectedDispute.reporter_name} (
                        {selectedDispute.reporter_id})
                      </span>
                    </div>
                    <div className="detail-item">
                      <label>Reported User:</label>
                      <span>
                        {selectedDispute.reported_user_name} (
                        {selectedDispute.reported_user_id})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Description</h4>
                  <p>{selectedDispute.description}</p>
                </div>

                <div className="detail-section">
                  <h4>Evidence</h4>
                  <ul className="evidence-list">
                    {selectedDispute.evidence.map((item, index) => (
                      <li key={index}>
                        <strong>{item.type}:</strong> {item.content}
                      </li>
                    ))}
                  </ul>
                </div>

                {selectedDispute.status === "resolved" &&
                  selectedDispute.resolution && (
                    <div className="detail-section">
                      <h4>Resolution</h4>
                      <p>{selectedDispute.resolution}</p>
                      <p className="resolution-date">
                        Resolved on:{" "}
                        {new Date(selectedDispute.resolved_at).toLocaleString()}
                      </p>
                    </div>
                  )}

                {selectedDispute.status !== "resolved" && (
                  <div className="detail-section">
                    <h4>Resolve Dispute</h4>
                    <div className="form-group">
                      <label>Resolution Notes:</label>
                      <textarea
                        className="form-control"
                        rows="4"
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value)}
                        placeholder="Enter resolution details..."
                      />
                    </div>
                    <div className="form-group">
                      <label>Action Taken:</label>
                      <select
                        className="form-control"
                        value={actionTaken}
                        onChange={(e) => setActionTaken(e.target.value)}
                      >
                        <option value="">Select action...</option>
                        <option value="warning">Warning Issued</option>
                        <option value="suspension">User Suspended</option>
                        <option value="refund">Refund Processed</option>
                        <option value="no_action">No Action Required</option>
                        <option value="mediation">Mediation Arranged</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              {selectedDispute.status !== "resolved" && (
                <>
                  <button
                    className="btn btn-secondary"
                    onClick={() =>
                      handleUpdateStatus(
                        selectedDispute.dispute_id,
                        "in_review"
                      )
                    }
                  >
                    Mark In Review
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={handleResolveDispute}
                    disabled={!resolution}
                  >
                    Resolve Dispute
                  </button>
                </>
              )}
              <button
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Disputes;
