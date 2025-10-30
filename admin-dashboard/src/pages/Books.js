import React, { useState, useEffect } from "react";
import { apiService } from "../services/api";

const Books = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedBook, setSelectedBook] = useState(null);
  const [showBookModal, setShowBookModal] = useState(false);

  // Mock books data
  const mockBooks = [
    {
      book_id: "1",
      isbn: "9780134685991",
      title: "Effective Java",
      author: "Joshua Bloch",
      owner_name: "John Doe",
      owner_id: "user1",
      status: "available",
      condition: "excellent",
      location: "Desk 42A",
      added_date: "2024-01-15T10:00:00Z",
      borrowed_count: 3,
      current_borrower: null,
      due_date: null,
      category: "Programming",
    },
    {
      book_id: "2",
      isbn: "9780321125217",
      title: "Domain-Driven Design",
      author: "Eric Evans",
      owner_name: "Jane Smith",
      owner_id: "user2",
      status: "borrowed",
      condition: "good",
      location: "Shelf B-3",
      added_date: "2024-01-10T14:30:00Z",
      borrowed_count: 7,
      current_borrower: "Mike Johnson",
      due_date: "2024-01-25T00:00:00Z",
      category: "Software Architecture",
    },
    {
      book_id: "3",
      isbn: "9780596517748",
      title: "JavaScript: The Good Parts",
      author: "Douglas Crockford",
      owner_name: "Sarah Wilson",
      owner_id: "user4",
      status: "available",
      condition: "fair",
      location: "Common Area",
      added_date: "2024-01-08T09:15:00Z",
      borrowed_count: 12,
      current_borrower: null,
      due_date: null,
      category: "Programming",
    },
    {
      book_id: "4",
      isbn: "9781449331818",
      title: "Learning React",
      author: "Alex Banks, Eve Porcello",
      owner_name: "Mike Johnson",
      owner_id: "user3",
      status: "overdue",
      condition: "good",
      location: "Desk 15C",
      added_date: "2024-01-05T16:45:00Z",
      borrowed_count: 5,
      current_borrower: "Alice Brown",
      due_date: "2024-01-18T00:00:00Z",
      category: "Web Development",
    },
    {
      book_id: "5",
      isbn: "9780134494166",
      title: "Clean Architecture",
      author: "Robert C. Martin",
      owner_name: "David Lee",
      owner_id: "user8",
      status: "maintenance",
      condition: "damaged",
      location: "Admin Office",
      added_date: "2024-01-12T11:20:00Z",
      borrowed_count: 8,
      current_borrower: null,
      due_date: null,
      category: "Software Architecture",
    },
  ];

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      setLoading(true);
      setError(null);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      setBooks(mockBooks);
    } catch (err) {
      console.error("Error loading books:", err);
      setError("Failed to load books");
    } finally {
      setLoading(false);
    }
  };

  const handleBookAction = async (bookId, action) => {
    try {
      console.log(`Performing ${action} on book ${bookId}`);

      if (action === "mark_returned") {
        setBooks(
          books.map((book) =>
            book.book_id === bookId
              ? {
                  ...book,
                  status: "available",
                  current_borrower: null,
                  due_date: null,
                }
              : book
          )
        );
      } else if (action === "remove") {
        setBooks(books.filter((book) => book.book_id !== bookId));
      }

      // In a real app, this would be an API call
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`Error performing ${action}:`, err);
      setError(`Failed to ${action} book`);
    }
  };

  const filteredBooks = books.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.owner_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === "all" || book.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "available":
        return "#4CAF50";
      case "borrowed":
        return "#2196F3";
      case "overdue":
        return "#f44336";
      case "maintenance":
        return "#FF9800";
      default:
        return "#666";
    }
  };

  const getConditionColor = (condition) => {
    switch (condition) {
      case "excellent":
        return "#4CAF50";
      case "good":
        return "#2196F3";
      case "fair":
        return "#FF9800";
      case "damaged":
        return "#f44336";
      default:
        return "#666";
    }
  };

  const BookModal = ({ book, onClose }) => {
    if (!book) return null;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content large-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h3>Book Details</h3>
            <button className="modal-close" onClick={onClose}>
              ×
            </button>
          </div>

          <div className="modal-body">
            <div className="book-details">
              <div className="detail-section">
                <h4>Book Information</h4>
                <div className="detail-row">
                  <strong>Title:</strong> {book.title}
                </div>
                <div className="detail-row">
                  <strong>Author:</strong> {book.author}
                </div>
                <div className="detail-row">
                  <strong>ISBN:</strong> {book.isbn}
                </div>
                <div className="detail-row">
                  <strong>Category:</strong> {book.category}
                </div>
                <div className="detail-row">
                  <strong>Owner:</strong> {book.owner_name}
                </div>
                <div className="detail-row">
                  <strong>Location:</strong> {book.location}
                </div>
                <div className="detail-row">
                  <strong>Added:</strong> {formatDate(book.added_date)}
                </div>
                <div className="detail-row">
                  <strong>Times Borrowed:</strong> {book.borrowed_count}
                </div>
              </div>

              <div className="detail-section">
                <h4>Current Status</h4>
                <div className="detail-row">
                  <strong>Status:</strong>
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor: getStatusColor(book.status),
                      color: "white",
                    }}
                  >
                    {book.status}
                  </span>
                </div>
                <div className="detail-row">
                  <strong>Condition:</strong>
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor: getConditionColor(book.condition),
                      color: "white",
                    }}
                  >
                    {book.condition}
                  </span>
                </div>
                {book.current_borrower && (
                  <>
                    <div className="detail-row">
                      <strong>Current Borrower:</strong> {book.current_borrower}
                    </div>
                    <div className="detail-row">
                      <strong>Due Date:</strong> {formatDate(book.due_date)}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            {book.status === "borrowed" || book.status === "overdue" ? (
              <button
                className="btn btn-primary"
                onClick={() => {
                  handleBookAction(book.book_id, "mark_returned");
                  onClose();
                }}
              >
                Mark as Returned
              </button>
            ) : null}
            <button
              className="btn btn-danger"
              onClick={() => {
                if (
                  window.confirm("Are you sure you want to remove this book?")
                ) {
                  handleBookAction(book.book_id, "remove");
                  onClose();
                }
              }}
            >
              Remove Book
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading books...</div>
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
            onClick={loadBooks}
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
        <h2>Book Library Management</h2>
        <p>Manage the shared book library and track borrowing activity</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value" style={{ color: "#4CAF50" }}>
            {books.filter((b) => b.status === "available").length}
          </div>
          <div className="stat-label">Available</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "#2196F3" }}>
            {books.filter((b) => b.status === "borrowed").length}
          </div>
          <div className="stat-label">Borrowed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "#f44336" }}>
            {books.filter((b) => b.status === "overdue").length}
          </div>
          <div className="stat-label">Overdue</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "#FF9800" }}>
            {books.reduce((sum, book) => sum + book.borrowed_count, 0)}
          </div>
          <div className="stat-label">Total Borrows</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              className="form-control"
              placeholder="Search books by title, author, or owner..."
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
              <option value="available">Available</option>
              <option value="borrowed">Borrowed</option>
              <option value="overdue">Overdue</option>
              <option value="maintenance">Maintenance</option>
            </select>

            <button className="btn btn-primary">📊 Export Library</button>
          </div>
        </div>
      </div>

      {/* Books Table */}
      <div className="card">
        <div className="table-header">
          <h3>Library Books ({filteredBooks.length})</h3>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>Owner</th>
              <th>Status</th>
              <th>Condition</th>
              <th>Location</th>
              <th>Borrower</th>
              <th>Due Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBooks.map((book) => (
              <tr key={book.book_id}>
                <td>
                  <div className="book-info">
                    <strong>{book.title}</strong>
                    <div style={{ color: "#666", fontSize: "0.9em" }}>
                      {book.category}
                    </div>
                  </div>
                </td>
                <td>{book.author}</td>
                <td>{book.owner_name}</td>
                <td>
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor: getStatusColor(book.status),
                      color: "white",
                    }}
                  >
                    {book.status}
                  </span>
                </td>
                <td>
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor: getConditionColor(book.condition),
                      color: "white",
                    }}
                  >
                    {book.condition}
                  </span>
                </td>
                <td>{book.location}</td>
                <td>{book.current_borrower || "-"}</td>
                <td>
                  {book.due_date ? (
                    <span
                      className={book.status === "overdue" ? "text-danger" : ""}
                    >
                      {formatDate(book.due_date)}
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setSelectedBook(book);
                        setShowBookModal(true);
                      }}
                    >
                      View
                    </button>
                    {(book.status === "borrowed" ||
                      book.status === "overdue") && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() =>
                          handleBookAction(book.book_id, "mark_returned")
                        }
                      >
                        Return
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredBooks.length === 0 && (
          <div className="empty-state">
            <p>No books found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Book Modal */}
      {showBookModal && (
        <BookModal
          book={selectedBook}
          onClose={() => {
            setShowBookModal(false);
            setSelectedBook(null);
          }}
        />
      )}
    </div>
  );
};

export default Books;
