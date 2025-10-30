import React, { useState, useEffect } from "react";
import { apiService } from "../services/api";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Mock users data
  const mockUsers = [
    {
      user_id: "1",
      name: "John Doe",
      email: "john.doe@company.com",
      office_id: "office1",
      role: "employee",
      status: "active",
      created_at: "2024-01-15T08:00:00Z",
      last_login: "2024-01-20T14:30:00Z",
      trips_completed: 15,
      books_shared: 3,
      rating: 4.8,
    },
    {
      user_id: "2",
      name: "Jane Smith",
      email: "jane.smith@company.com",
      office_id: "office1",
      role: "employee",
      status: "active",
      created_at: "2024-01-10T09:15:00Z",
      last_login: "2024-01-20T16:45:00Z",
      trips_completed: 22,
      books_shared: 7,
      rating: 4.9,
    },
    {
      user_id: "3",
      name: "Mike Johnson",
      email: "mike.johnson@company.com",
      office_id: "office1",
      role: "admin",
      status: "active",
      created_at: "2024-01-05T10:00:00Z",
      last_login: "2024-01-20T18:00:00Z",
      trips_completed: 8,
      books_shared: 12,
      rating: 4.7,
    },
    {
      user_id: "4",
      name: "Sarah Wilson",
      email: "sarah.wilson@company.com",
      office_id: "office1",
      role: "employee",
      status: "inactive",
      created_at: "2024-01-12T11:30:00Z",
      last_login: "2024-01-18T12:00:00Z",
      trips_completed: 5,
      books_shared: 1,
      rating: 4.5,
    },
  ];

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      setUsers(mockUsers);
    } catch (err) {
      console.error("Error loading users:", err);
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId, action) => {
    try {
      console.log(`Performing ${action} on user ${userId}`);

      if (action === "deactivate") {
        setUsers(
          users.map((user) =>
            user.user_id === userId ? { ...user, status: "inactive" } : user
          )
        );
      } else if (action === "activate") {
        setUsers(
          users.map((user) =>
            user.user_id === userId ? { ...user, status: "active" } : user
          )
        );
      }

      // In a real app, this would be an API call
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`Error performing ${action}:`, err);
      setError(`Failed to ${action} user`);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === "all" || user.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const UserModal = ({ user, onClose }) => {
    if (!user) return null;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>User Details</h3>
            <button className="modal-close" onClick={onClose}>
              ×
            </button>
          </div>

          <div className="modal-body">
            <div className="user-details">
              <div className="detail-row">
                <strong>Name:</strong> {user.name}
              </div>
              <div className="detail-row">
                <strong>Email:</strong> {user.email}
              </div>
              <div className="detail-row">
                <strong>Role:</strong>
                <span className={`role-badge role-${user.role}`}>
                  {user.role}
                </span>
              </div>
              <div className="detail-row">
                <strong>Status:</strong>
                <span className={`status-badge status-${user.status}`}>
                  {user.status}
                </span>
              </div>
              <div className="detail-row">
                <strong>Member Since:</strong> {formatDate(user.created_at)}
              </div>
              <div className="detail-row">
                <strong>Last Login:</strong> {formatDate(user.last_login)}
              </div>
              <div className="detail-row">
                <strong>Trips Completed:</strong> {user.trips_completed}
              </div>
              <div className="detail-row">
                <strong>Books Shared:</strong> {user.books_shared}
              </div>
              <div className="detail-row">
                <strong>Rating:</strong> ⭐ {user.rating}/5.0
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            <button
              className={`btn ${user.status === "active" ? "btn-danger" : "btn-primary"}`}
              onClick={() => {
                handleUserAction(
                  user.user_id,
                  user.status === "active" ? "deactivate" : "activate"
                );
                onClose();
              }}
            >
              {user.status === "active" ? "Deactivate" : "Activate"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading users...</div>
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
            onClick={loadUsers}
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
        <h2>User Management</h2>
        <p>Manage platform users and their activities</p>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              className="form-control"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-controls">
            <select
              className="form-control"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <button className="btn btn-primary">📊 Export Users</button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="table-header">
          <h3>Users ({filteredUsers.length})</h3>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Trips</th>
              <th>Books</th>
              <th>Rating</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.user_id}>
                <td>
                  <div className="user-info">
                    <strong>{user.name}</strong>
                  </div>
                </td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge role-${user.role}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <span className={`status-badge status-${user.status}`}>
                    {user.status}
                  </span>
                </td>
                <td>{user.trips_completed}</td>
                <td>{user.books_shared}</td>
                <td>⭐ {user.rating}</td>
                <td>{formatDate(user.last_login)}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowUserModal(true);
                      }}
                    >
                      View
                    </button>
                    <button
                      className={`btn btn-sm ${user.status === "active" ? "btn-danger" : "btn-primary"}`}
                      onClick={() =>
                        handleUserAction(
                          user.user_id,
                          user.status === "active" ? "deactivate" : "activate"
                        )
                      }
                    >
                      {user.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="empty-state">
            <p>No users found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* User Modal */}
      {showUserModal && (
        <UserModal
          user={selectedUser}
          onClose={() => {
            setShowUserModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
};

export default Users;
