import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { useAuth } from "../../context/AuthContext";

const TransactionHistoryScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all"); // all, payments, earnings, refunds

  useEffect(() => {
    loadTransactions();
  }, [filter]);

  const loadTransactions = async () => {
    try {
      setLoading(true);

      // Mock transaction data - in real app, this would come from API
      const mockTransactions = [
        {
          id: "1",
          type: "payment",
          amount: 15.5,
          description: "Trip payment: Downtown → Office Park",
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          status: "completed",
          trip_id: "trip_1",
          payment_method: "Visa •••• 4242",
          driver_name: "John Doe",
        },
        {
          id: "2",
          type: "earning",
          amount: 45.0,
          description: "Driver earnings: Office Park → Downtown",
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          status: "completed",
          trip_id: "trip_2",
          riders: ["Alice Smith", "Bob Johnson", "Carol Wilson"],
        },
        {
          id: "3",
          type: "payment",
          amount: 12.75,
          description: "Trip payment: Home → Shopping Mall",
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          status: "completed",
          trip_id: "trip_3",
          payment_method: "Mastercard •••• 8888",
          driver_name: "Sarah Lee",
        },
        {
          id: "4",
          type: "refund",
          amount: 18.25,
          description: "Refund: Cancelled trip to Airport",
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          status: "completed",
          trip_id: "trip_4",
          refund_reason: "Trip cancelled by driver",
        },
        {
          id: "5",
          type: "earning",
          amount: 32.5,
          description: "Driver earnings: Airport → Downtown",
          date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          status: "pending",
          trip_id: "trip_5",
          riders: ["Mike Brown", "Lisa Davis"],
        },
        {
          id: "6",
          type: "payment",
          amount: 8.0,
          description: "Trip payment: Coffee Shop → Office",
          date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          status: "failed",
          trip_id: "trip_6",
          payment_method: "Visa •••• 4242",
          driver_name: "Tom Wilson",
          failure_reason: "Insufficient funds",
        },
      ];

      // Filter transactions based on selected filter
      let filteredTransactions = mockTransactions;
      if (filter !== "all") {
        filteredTransactions = mockTransactions.filter((t) => {
          if (filter === "payments") return t.type === "payment";
          if (filter === "earnings") return t.type === "earning";
          if (filter === "refunds") return t.type === "refund";
          return true;
        });
      }

      setTransactions(filteredTransactions);
    } catch (error) {
      console.error("Load transactions error:", error);
      Alert.alert("Error", "Failed to load transaction history");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const handleTransactionPress = (transaction) => {
    navigation.navigate("TransactionDetails", {
      transactionId: transaction.id,
    });
  };

  const handleRetryPayment = (transaction) => {
    Alert.alert(
      "Retry Payment",
      `Retry payment of $${transaction.amount.toFixed(2)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Retry",
          onPress: () => {
            navigation.navigate("PaymentMethod", {
              tripId: transaction.trip_id,
              amount: transaction.amount,
              description: transaction.description,
            });
          },
        },
      ]
    );
  };

  const getTransactionIcon = (type, status) => {
    if (status === "failed") return "❌";
    if (status === "pending") return "⏳";

    switch (type) {
      case "payment":
        return "💳";
      case "earning":
        return "💰";
      case "refund":
        return "↩️";
      default:
        return "💸";
    }
  };

  const getTransactionColor = (type, status) => {
    if (status === "failed") return "#f44336";
    if (status === "pending") return "#ff9800";

    switch (type) {
      case "payment":
        return "#f44336";
      case "earning":
        return "#4CAF50";
      case "refund":
        return "#2196F3";
      default:
        return "#666";
    }
  };

  const getAmountPrefix = (type) => {
    switch (type) {
      case "payment":
        return "-";
      case "earning":
        return "+";
      case "refund":
        return "+";
      default:
        return "";
    }
  };

  const renderTransaction = ({ item }) => {
    const icon = getTransactionIcon(item.type, item.status);
    const color = getTransactionColor(item.type, item.status);
    const prefix = getAmountPrefix(item.type);

    return (
      <TouchableOpacity
        style={styles.transactionCard}
        onPress={() => handleTransactionPress(item)}
      >
        <View style={styles.transactionHeader}>
          <View style={styles.transactionIcon}>
            <Text style={styles.transactionIconText}>{icon}</Text>
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionDescription} numberOfLines={2}>
              {item.description}
            </Text>
            <Text style={styles.transactionDate}>
              {item.date.toLocaleDateString()} at{" "}
              {item.date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            {item.payment_method && (
              <Text style={styles.transactionMethod}>
                Paid with {item.payment_method}
              </Text>
            )}
            {item.driver_name && (
              <Text style={styles.transactionDriver}>
                Driver: {item.driver_name}
              </Text>
            )}
            {item.riders && (
              <Text style={styles.transactionRiders}>
                Riders: {item.riders.join(", ")}
              </Text>
            )}
          </View>
          <View style={styles.transactionAmount}>
            <Text style={[styles.amountText, { color }]}>
              {prefix}${item.amount.toFixed(2)}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: color }]}>
              <Text style={styles.statusText}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        {item.status === "failed" && (
          <View style={styles.failedTransactionFooter}>
            <Text style={styles.failureReason}>
              Failed: {item.failure_reason}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => handleRetryPayment(item)}
            >
              <Text style={styles.retryButtonText}>Retry Payment</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status === "pending" && item.type === "earning" && (
          <View style={styles.pendingTransactionFooter}>
            <Text style={styles.pendingNote}>
              Earnings will be processed within 2-3 business days
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderFilterButton = (filterKey, label) => (
    <TouchableOpacity
      key={filterKey}
      style={[
        styles.filterButton,
        filter === filterKey && styles.filterButtonActive,
      ]}
      onPress={() => setFilter(filterKey)}
    >
      <Text
        style={[
          styles.filterButtonText,
          filter === filterKey && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const calculateTotals = () => {
    const totals = transactions.reduce(
      (acc, transaction) => {
        if (transaction.status === "completed") {
          switch (transaction.type) {
            case "payment":
              acc.totalSpent += transaction.amount;
              break;
            case "earning":
              acc.totalEarned += transaction.amount;
              break;
            case "refund":
              acc.totalRefunded += transaction.amount;
              break;
          }
        }
        return acc;
      },
      { totalSpent: 0, totalEarned: 0, totalRefunded: 0 }
    );

    return totals;
  };

  const totals = calculateTotals();

  return (
    <View style={styles.container}>
      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryAmount}>
            -${totals.totalSpent.toFixed(2)}
          </Text>
          <Text style={styles.summaryLabel}>Total Spent</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryAmount, { color: "#4CAF50" }]}>
            +${totals.totalEarned.toFixed(2)}
          </Text>
          <Text style={styles.summaryLabel}>Total Earned</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryAmount, { color: "#2196F3" }]}>
            +${totals.totalRefunded.toFixed(2)}
          </Text>
          <Text style={styles.summaryLabel}>Total Refunded</Text>
        </View>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {renderFilterButton("all", "All")}
        {renderFilterButton("payments", "Payments")}
        {renderFilterButton("earnings", "Earnings")}
        {renderFilterButton("refunds", "Refunds")}
      </View>

      {/* Transactions List */}
      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💳</Text>
            <Text style={styles.emptyText}>
              {loading ? "Loading transactions..." : "No transactions found"}
            </Text>
            <Text style={styles.emptySubtext}>
              {!loading && "Your transaction history will appear here"}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  summaryContainer: {
    flexDirection: "row",
    padding: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  summaryCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#f44336",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  filterButtonActive: {
    backgroundColor: "#2196F3",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  filterButtonTextActive: {
    color: "white",
  },
  listContainer: {
    padding: 20,
  },
  transactionCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  transactionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  transactionIconText: {
    fontSize: 20,
  },
  transactionInfo: {
    flex: 1,
    marginRight: 12,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  transactionMethod: {
    fontSize: 12,
    color: "#999",
    marginBottom: 2,
  },
  transactionDriver: {
    fontSize: 12,
    color: "#999",
    marginBottom: 2,
  },
  transactionRiders: {
    fontSize: 12,
    color: "#999",
  },
  transactionAmount: {
    alignItems: "flex-end",
  },
  amountText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
  },
  failedTransactionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  failureReason: {
    fontSize: 12,
    color: "#f44336",
    flex: 1,
  },
  retryButton: {
    backgroundColor: "#f44336",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  pendingTransactionFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  pendingNote: {
    fontSize: 12,
    color: "#ff9800",
    fontStyle: "italic",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});

export default TransactionHistoryScreen;
