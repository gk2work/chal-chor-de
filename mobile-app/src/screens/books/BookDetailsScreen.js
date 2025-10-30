import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
} from "react-native";
import { useAuth } from "../../context/AuthContext";

const BookDetailsScreen = ({ route, navigation }) => {
  const { book } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const isOwner = book.owner_id === user.user_id;
  const canBorrow = book.status === "available" && !isOwner;
  const isBorrower = book.current_borrower === user.name;

  const handleBorrowRequest = async () => {
    try {
      setLoading(true);

      Alert.alert(
        "Borrow Request",
        `Do you want to request to borrow "${book.title}" from ${book.owner_name}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Send Request",
            onPress: async () => {
              // Mock API call
              await new Promise((resolve) => setTimeout(resolve, 1000));
              Alert.alert(
                "Request Sent!",
                `Your borrow request has been sent to ${book.owner_name}. They will be notified and can approve or decline your request.`,
                [
                  {
                    text: "OK",
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error sending borrow request:", error);
      Alert.alert("Error", "Failed to send borrow request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReturnBook = async () => {
    try {
      setLoading(true);

      Alert.alert(
        "Return Book",
        `Are you ready to return "${book.title}" to ${book.owner_name}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Mark as Returned",
            onPress: async () => {
              // Mock API call
              await new Promise((resolve) => setTimeout(resolve, 1000));
              Alert.alert(
                "Book Returned!",
                `"${book.title}" has been marked as returned. Thank you for using the office library!`,
                [
                  {
                    text: "OK",
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error returning book:", error);
      Alert.alert("Error", "Failed to return book. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleContactOwner = () => {
    Alert.alert(
      "Contact Owner",
      `How would you like to contact ${book.owner_name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Message",
          onPress: () => {
            // Navigate to chat or messaging
            Alert.alert(
              "Feature Coming Soon",
              "Direct messaging will be available soon!"
            );
          },
        },
        {
          text: "Email",
          onPress: () => {
            // Open email client
            Linking.openURL(
              `mailto:${book.owner_name.toLowerCase().replace(" ", ".")}@company.com`
            );
          },
        },
      ]
    );
  };

  const handleEditBook = () => {
    navigation.navigate("EditBook", { book });
  };

  const handleDeleteBook = () => {
    Alert.alert(
      "Delete Book",
      `Are you sure you want to remove "${book.title}" from the library?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Book Deleted",
              "The book has been removed from the library."
            );
            navigation.goBack();
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getDaysUntilDue = () => {
    if (!book.due_date) return null;
    const dueDate = new Date(book.due_date);
    const today = new Date();
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilDue = getDaysUntilDue();

  return (
    <ScrollView style={styles.container}>
      {/* Book Header */}
      <View style={styles.bookHeader}>
        <Image source={{ uri: book.cover_url }} style={styles.bookCover} />

        <View style={styles.bookHeaderInfo}>
          <Text style={styles.bookTitle}>{book.title}</Text>
          <Text style={styles.bookAuthor}>by {book.author}</Text>

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

          <Text style={styles.category}>📂 {book.category}</Text>
        </View>
      </View>

      {/* Book Details */}
      <View style={styles.detailsSection}>
        <Text style={styles.sectionTitle}>Book Details</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>ISBN:</Text>
          <Text style={styles.detailValue}>{book.isbn}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Owner:</Text>
          <Text style={styles.detailValue}>{book.owner_name}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Location:</Text>
          <Text style={styles.detailValue}>📍 {book.location}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Added:</Text>
          <Text style={styles.detailValue}>{formatDate(book.added_date)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Times Borrowed:</Text>
          <Text style={styles.detailValue}>{book.borrowed_count}</Text>
        </View>

        {book.current_borrower && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current Borrower:</Text>
            <Text style={styles.detailValue}>{book.current_borrower}</Text>
          </View>
        )}

        {book.due_date && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Due Date:</Text>
            <Text
              style={[
                styles.detailValue,
                daysUntilDue <= 3 && styles.dueSoon,
                daysUntilDue < 0 && styles.overdue,
              ]}
            >
              {formatDate(book.due_date)}
              {daysUntilDue !== null && (
                <Text style={styles.daysRemaining}>
                  {daysUntilDue > 0
                    ? ` (${daysUntilDue} days left)`
                    : daysUntilDue === 0
                      ? " (Due today!)"
                      : ` (${Math.abs(daysUntilDue)} days overdue)`}
                </Text>
              )}
            </Text>
          </View>
        )}
      </View>

      {/* Description */}
      {book.description && (
        <View style={styles.descriptionSection}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{book.description}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsSection}>
        {canBorrow && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.borrowButton,
              loading && styles.disabledButton,
            ]}
            onPress={handleBorrowRequest}
            disabled={loading}
          >
            <Text style={styles.borrowButtonText}>
              {loading ? "Sending Request..." : "Request to Borrow"}
            </Text>
          </TouchableOpacity>
        )}

        {isBorrower && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.returnButton,
              loading && styles.disabledButton,
            ]}
            onPress={handleReturnBook}
            disabled={loading}
          >
            <Text style={styles.returnButtonText}>
              {loading ? "Processing..." : "Mark as Returned"}
            </Text>
          </TouchableOpacity>
        )}

        {!isOwner && (
          <TouchableOpacity
            style={[styles.actionButton, styles.contactButton]}
            onPress={handleContactOwner}
          >
            <Text style={styles.contactButtonText}>Contact Owner</Text>
          </TouchableOpacity>
        )}

        {isOwner && (
          <View style={styles.ownerActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={handleEditBook}
            >
              <Text style={styles.editButtonText}>Edit Book</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDeleteBook}
            >
              <Text style={styles.deleteButtonText}>Remove Book</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Borrowing History */}
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Borrowing Tips</Text>
        <View style={styles.tipsContainer}>
          <Text style={styles.tip}>📚 Please handle the book with care</Text>
          <Text style={styles.tip}>⏰ Return on time to help others</Text>
          <Text style={styles.tip}>
            💬 Contact the owner if you need an extension
          </Text>
          <Text style={styles.tip}>
            ⭐ Rate your experience after returning
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  bookHeader: {
    flexDirection: "row",
    padding: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  bookCover: {
    width: 120,
    height: 180,
    borderRadius: 8,
    marginRight: 20,
  },
  bookHeaderInfo: {
    flex: 1,
    justifyContent: "center",
  },
  bookTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  bookAuthor: {
    fontSize: 16,
    color: "#666",
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: "row",
    marginBottom: 8,
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
  category: {
    fontSize: 14,
    color: "#666",
  },
  detailsSection: {
    backgroundColor: "white",
    marginTop: 8,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  detailLabel: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 16,
    color: "#333",
    flex: 1,
    textAlign: "right",
  },
  dueSoon: {
    color: "#FF9800",
  },
  overdue: {
    color: "#f44336",
  },
  daysRemaining: {
    fontSize: 14,
    fontWeight: "500",
  },
  descriptionSection: {
    backgroundColor: "white",
    marginTop: 8,
    padding: 20,
  },
  description: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
  },
  actionsSection: {
    backgroundColor: "white",
    marginTop: 8,
    padding: 20,
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  borrowButton: {
    backgroundColor: "#4CAF50",
  },
  borrowButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  returnButton: {
    backgroundColor: "#2196F3",
  },
  returnButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  contactButton: {
    backgroundColor: "#FF9800",
  },
  contactButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  ownerActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  editButton: {
    backgroundColor: "#2196F3",
    flex: 0.48,
  },
  editButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#f44336",
    flex: 0.48,
  },
  deleteButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  historySection: {
    backgroundColor: "white",
    marginTop: 8,
    marginBottom: 20,
    padding: 20,
  },
  tipsContainer: {
    backgroundColor: "#f9f9f9",
    padding: 16,
    borderRadius: 8,
  },
  tip: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    lineHeight: 20,
  },
});

export default BookDetailsScreen;
