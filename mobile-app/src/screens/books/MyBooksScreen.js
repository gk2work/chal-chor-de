import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
} from "react-native";
import { useAuth } from "../../context/AuthContext";

const MyBooksScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [myBooks, setMyBooks] = useState([]);
  const [borrowedBooks, setBorrowedBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("owned"); // 'owned' or 'borrowed'

  // Mock data for user's books
  const mockOwnedBooks = [
    {
      book_id: "1",
      title: "Effective Java",
      author: "Joshua Bloch",
      cover_url: "https://covers.openlibrary.org/b/isbn/9780134685991-M.jpg",
      status: "available",
      condition: "excellent",
      location: "My desk",
      borrowed_count: 3,
      current_borrower: null,
      pending_requests: 2,
    },
    {
      book_id: "4",
      title: "Clean Architecture",
      author: "Robert C. Martin",
      cover_url: "https://covers.openlibrary.org/b/isbn/9780134494166-M.jpg",
      status: "borrowed",
      condition: "good",
      location: "Shelf A-1",
      borrowed_count: 1,
      current_borrower: "Alice Johnson",
      due_date: "2024-01-28T00:00:00Z",
      pending_requests: 0,
    },
  ];

  const mockBorrowedBooks = [
    {
      book_id: "2",
      title: "Domain-Driven Design",
      author: "Eric Evans",
      cover_url: "https://covers.openlibrary.org/b/isbn/9780321125217-M.jpg",
      owner_name: "Jane Smith",
      borrowed_date: "2024-01-15T00:00:00Z",
      due_date: "2024-01-29T00:00:00Z",
      condition: "good",
      location: "Shelf B-3",
      status: "borrowed",
    },
  ];

  useEffect(() => {
    loadMyBooks();
  }, []);

  const loadMyBooks = async () => {
    try {
      setLoading(true);
      // Simulate API calls
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setMyBooks(mockOwnedBooks);
      setBorrowedBooks(mockBorrowedBooks);
    } catch (error) {
      console.error("Error loading my books:", error);
      Alert.alert("Error", "Failed to load your books");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMyBooks();
    setRefreshing(false);
  };

  const handleBookPress = (book) => {
    navigation.navigate("BookDetails", { book });
  };

  const handleEditBook = (book) => {
    navigation.navigate("EditBook", { book });
  };

  const handleViewRequests = (book) => {
    Alert.alert(
      "Borrow Requests",
      `You have ${book.pending_requests} pending request${book.pending_requests !== 1 ? "s" : ""} for "${book.title}".`,
      [
        { text: "Later", style: "cancel" },
        {
          text: "View Requests",
          onPress: () => {
            // Navigate to requests screen
            Alert.alert(
              "Feature Coming Soon",
              "Request management will be available soon!"
            );
          },
        },
      ]
    );
  };

  const handleReturnBook = (book) => {
    Alert.alert(
      "Return Book",
      `Are you ready to return "${book.title}" to ${book.owner_name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark as Returned",
          onPress: () => {
            Alert.alert(
              "Book Returned!",
              "The book has been marked as returned. Thank you!"
            );
            // Remove from borrowed books
            setBorrowedBooks((prev) =>
              prev.filter((b) => b.book_id !== book.book_id)
            );
          },
        },
      ]
    );
  };

  const getDaysUntilDue = (dueDateString) => {
    const dueDate = new Date(dueDateString);
    const today = new Date();
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const renderOwnedBook = (book) => {
    const daysUntilDue = book.due_date ? getDaysUntilDue(book.due_date) : null;

    return (
      <TouchableOpacity
        key={book.book_id}
        style={styles.bookCard}
        onPress={() => handleBookPress(book)}
      >
        <View style={styles.bookContent}>
          <Image source={{ uri: book.cover_url }} style={styles.bookCover} />

          <View style={styles.bookInfo}>
            <Text style={styles.bookTitle} numberOfLines={2}>
              {book.title}
            </Text>
            <Text style={styles.bookAuthor} numberOfLines={1}>
              by {book.author}
            </Text>

            <View style={styles.bookMeta}>
              <Text
                style={[
                  styles.statusBadge,
                  styles[
                    `status${book.status.charAt(0).toUpperCase() + book.status.slice(1)}`
                  ],
                ]}
              >
                {book.status}
              </Text>
              <Text style={styles.borrowCount}>
                📚 Borrowed {book.borrowed_count} times
              </Text>
            </View>

            {book.current_borrower && (
              <Text style={styles.borrowerInfo}>
                📤 Borrowed by {book.current_borrower}
                {daysUntilDue !== null && (
                  <Text
                    style={[
                      styles.dueInfo,
                      daysUntilDue <= 3 && styles.dueSoon,
                      daysUntilDue < 0 && styles.overdue,
                    ]}
                  >
                    {daysUntilDue > 0
                      ? ` (${daysUntilDue} days left)`
                      : daysUntilDue === 0
                        ? " (Due today!)"
                        : ` (${Math.abs(daysUntilDue)} days overdue)`}
                  </Text>
                )}
              </Text>
            )}

            {book.pending_requests > 0 && (
              <TouchableOpacity
                style={styles.requestsAlert}
                onPress={() => handleViewRequests(book)}
              >
                <Text style={styles.requestsText}>
                  🔔 {book.pending_requests} pending request
                  {book.pending_requests !== 1 ? "s" : ""}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.bookActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditBook(book)}
          >
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>

          {book.pending_requests > 0 && (
            <TouchableOpacity
              style={[styles.actionButton, styles.requestsButton]}
              onPress={() => handleViewRequests(book)}
            >
              <Text style={styles.requestsButtonText}>Requests</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderBorrowedBook = (book) => {
    const daysUntilDue = getDaysUntilDue(book.due_date);

    return (
      <TouchableOpacity
        key={book.book_id}
        style={styles.bookCard}
        onPress={() => handleBookPress(book)}
      >
        <View style={styles.bookContent}>
          <Image source={{ uri: book.cover_url }} style={styles.bookCover} />

          <View style={styles.bookInfo}>
            <Text style={styles.bookTitle} numberOfLines={2}>
              {book.title}
            </Text>
            <Text style={styles.bookAuthor} numberOfLines={1}>
              by {book.author}
            </Text>

            <Text style={styles.ownerInfo}>
              📤 Borrowed from {book.owner_name}
            </Text>

            <Text style={styles.borrowedDate}>
              📅 Borrowed: {new Date(book.borrowed_date).toLocaleDateString()}
            </Text>

            <Text
              style={[
                styles.dueDate,
                daysUntilDue <= 3 && styles.dueSoon,
                daysUntilDue < 0 && styles.overdue,
              ]}
            >
              ⏰ Due: {new Date(book.due_date).toLocaleDateString()}
              {daysUntilDue > 0
                ? ` (${daysUntilDue} days left)`
                : daysUntilDue === 0
                  ? " (Due today!)"
                  : ` (${Math.abs(daysUntilDue)} days overdue)`}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.returnButton}
          onPress={() => handleReturnBook(book)}
        >
          <Text style={styles.returnButtonText}>Mark as Returned</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your books...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Books</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("AddBook")}
        >
          <Text style={styles.addButtonText}>+ Add Book</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "owned" && styles.activeTab]}
          onPress={() => setActiveTab("owned")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "owned" && styles.activeTabText,
            ]}
          >
            My Books ({myBooks.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "borrowed" && styles.activeTab]}
          onPress={() => setActiveTab("borrowed")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "borrowed" && styles.activeTabText,
            ]}
          >
            Borrowed ({borrowedBooks.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === "owned" ? (
          myBooks.length > 0 ? (
            myBooks.map(renderOwnedBook)
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No books shared yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Share your books with colleagues to get started!
              </Text>
              <TouchableOpacity
                style={styles.addFirstButton}
                onPress={() => navigation.navigate("AddBook")}
              >
                <Text style={styles.addFirstButtonText}>
                  Add Your First Book
                </Text>
              </TouchableOpacity>
            </View>
          )
        ) : borrowedBooks.length > 0 ? (
          borrowedBooks.map(renderBorrowedBook)
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No borrowed books</Text>
            <Text style={styles.emptyStateSubtext}>
              Browse the library to find books to borrow!
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => navigation.navigate("Books")}
            >
              <Text style={styles.browseButtonText}>Browse Library</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  addButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: "white",
    fontWeight: "600",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#4CAF50",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
  },
  activeTabText: {
    color: "#4CAF50",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  bookCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bookContent: {
    flexDirection: "row",
    padding: 16,
  },
  bookCover: {
    width: 80,
    height: 120,
    borderRadius: 8,
    marginRight: 16,
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  bookMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
    textTransform: "uppercase",
  },
  statusAvailable: {
    backgroundColor: "#E8F5E8",
    color: "#4CAF50",
  },
  statusBorrowed: {
    backgroundColor: "#E3F2FD",
    color: "#2196F3",
  },
  borrowCount: {
    fontSize: 12,
    color: "#666",
  },
  borrowerInfo: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  dueInfo: {
    fontSize: 12,
    color: "#666",
  },
  dueSoon: {
    color: "#FF9800",
  },
  overdue: {
    color: "#f44336",
  },
  ownerInfo: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  borrowedDate: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  dueDate: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  requestsAlert: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  requestsText: {
    fontSize: 12,
    color: "#F57C00",
    fontWeight: "600",
  },
  bookActions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "500",
  },
  requestsButton: {
    backgroundColor: "#FFF3E0",
  },
  requestsButtonText: {
    color: "#F57C00",
    fontSize: 14,
    fontWeight: "600",
  },
  returnButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  returnButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
  },
  addFirstButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  browseButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default MyBooksScreen;
