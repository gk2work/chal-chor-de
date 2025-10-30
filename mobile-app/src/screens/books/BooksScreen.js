import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Image,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { apiService } from "../../services/api";

const BooksScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Mock books data for development
  const mockBooks = [
    {
      book_id: "1",
      isbn: "9780134685991",
      title: "Effective Java",
      author: "Joshua Bloch",
      cover_url: "https://covers.openlibrary.org/b/isbn/9780134685991-M.jpg",
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
      description: "The definitive guide to Java programming best practices.",
    },
    {
      book_id: "2",
      isbn: "9780321125217",
      title: "Domain-Driven Design",
      author: "Eric Evans",
      cover_url: "https://covers.openlibrary.org/b/isbn/9780321125217-M.jpg",
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
      description: "Tackling complexity in the heart of software.",
    },
    {
      book_id: "3",
      isbn: "9780596517748",
      title: "JavaScript: The Good Parts",
      author: "Douglas Crockford",
      cover_url: "https://covers.openlibrary.org/b/isbn/9780596517748-M.jpg",
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
      description: "Unearthing the excellence in JavaScript.",
    },
  ];

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setBooks(mockBooks);
    } catch (error) {
      console.error("Error loading books:", error);
      Alert.alert("Error", "Failed to load books");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBooks();
    setRefreshing(false);
  };

  const handleBookPress = (book) => {
    navigation.navigate("BookDetails", { book });
  };

  const handleBorrowRequest = async (book) => {
    try {
      Alert.alert(
        "Borrow Book",
        `Do you want to request to borrow "${book.title}" from ${book.owner_name}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Request",
            onPress: async () => {
              // Mock borrow request
              Alert.alert(
                "Success",
                "Borrow request sent! The owner will be notified."
              );
              // In a real app, this would call the library API
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error requesting book:", error);
      Alert.alert("Error", "Failed to send borrow request");
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

  const renderBookCard = (book) => (
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
          <Text style={styles.bookOwner} numberOfLines={1}>
            Owner: {book.owner_name}
          </Text>

          <View style={styles.bookMeta}>
            <View style={styles.statusContainer}>
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
              <Text
                style={[
                  styles.conditionBadge,
                  styles[
                    `condition${book.condition.charAt(0).toUpperCase() + book.condition.slice(1)}`
                  ],
                ]}
              >
                {book.condition}
              </Text>
            </View>

            <Text style={styles.location}>📍 {book.location}</Text>
          </View>

          {book.status === "borrowed" && book.due_date && (
            <Text style={styles.dueDate}>
              Due: {new Date(book.due_date).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>

      {book.status === "available" && book.owner_id !== user.user_id && (
        <TouchableOpacity
          style={styles.borrowButton}
          onPress={() => handleBorrowRequest(book)}
        >
          <Text style={styles.borrowButtonText}>Request to Borrow</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading books...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Office Library</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("AddBook")}
        >
          <Text style={styles.addButtonText}>+ Add Book</Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search books, authors, or owners..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {["all", "available", "borrowed"].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                filterStatus === status && styles.filterButtonActive,
              ]}
              onPress={() => setFilterStatus(status)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filterStatus === status && styles.filterButtonTextActive,
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Books List */}
      <ScrollView
        style={styles.booksList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredBooks.length > 0 ? (
          filteredBooks.map(renderBookCard)
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No books found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchTerm
                ? "Try adjusting your search"
                : "Be the first to add a book!"}
            </Text>
            {!searchTerm && (
              <TouchableOpacity
                style={styles.addFirstButton}
                onPress={() => navigation.navigate("AddBook")}
              >
                <Text style={styles.addFirstButtonText}>
                  Add Your First Book
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate("ScanBook")}
        >
          <Text style={styles.quickActionText}>📱 Scan ISBN</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate("MyBooks")}
        >
          <Text style={styles.quickActionText}>📚 My Books</Text>
        </TouchableOpacity>
      </View>
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
  searchContainer: {
    padding: 16,
    backgroundColor: "white",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  filterButtonActive: {
    backgroundColor: "#2196F3",
  },
  filterButtonText: {
    color: "#666",
    fontWeight: "500",
  },
  filterButtonTextActive: {
    color: "white",
  },
  booksList: {
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
    marginBottom: 4,
  },
  bookOwner: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  bookMeta: {
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: "row",
    marginBottom: 4,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
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
  conditionBadge: {
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    textTransform: "uppercase",
  },
  conditionExcellent: {
    backgroundColor: "#E8F5E8",
    color: "#4CAF50",
  },
  conditionGood: {
    backgroundColor: "#E3F2FD",
    color: "#2196F3",
  },
  conditionFair: {
    backgroundColor: "#FFF3E0",
    color: "#FF9800",
  },
  location: {
    fontSize: 12,
    color: "#666",
  },
  dueDate: {
    fontSize: 12,
    color: "#f44336",
    fontWeight: "500",
  },
  borrowButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  borrowButtonText: {
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
  quickActions: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: "center",
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
});

export default BooksScreen;
