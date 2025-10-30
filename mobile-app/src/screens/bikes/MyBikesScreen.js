import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import api from "../../services/api";

export default function MyBikesScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState("myListings");
  const [myListings, setMyListings] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [bookingRequests, setBookingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === "myListings") {
        const response = await api.get("/bike-sharing/listings/my-listings");
        setMyListings(response.data.listings || []);
      } else if (activeTab === "myBookings") {
        const response = await api.get("/bike-sharing/bookings/my-bookings");
        setMyBookings(response.data.bookings || []);
      } else if (activeTab === "requests") {
        const response = await api.get("/bike-sharing/bookings/requests");
        setBookingRequests(response.data.bookings || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      Alert.alert("Error", "Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const toggleAvailability = async (listingId, currentStatus) => {
    try {
      await api.patch(`/bike-sharing/listings/${listingId}/availability`, {
        available: !currentStatus,
      });
      Alert.alert("Success", "Bike availability updated");
      fetchData();
    } catch (error) {
      console.error("Error updating availability:", error);
      Alert.alert("Error", "Failed to update availability");
    }
  };

  const handleBookingAction = async (bookingId, action) => {
    try {
      await api.patch(`/bike-sharing/bookings/${bookingId}/status`, {
        status: action,
      });
      Alert.alert("Success", `Booking ${action}`);
      fetchData();
    } catch (error) {
      console.error("Error updating booking:", error);
      Alert.alert("Error", "Failed to update booking");
    }
  };

  const renderListingItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>
            {item.brand} {item.model}
          </Text>
          <Text style={styles.cardSubtitle}>
            {item.bike_type} • {item.size.toUpperCase()}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.statusBadge,
            item.available ? styles.statusAvailable : styles.statusUnavailable,
          ]}
          onPress={() => toggleAvailability(item.listing_id, item.available)}
        >
          <Text style={styles.statusText}>
            {item.available ? "Available" : "Unavailable"}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.cardStats}>
        <Text style={styles.statText}>📊 {item.total_bookings} bookings</Text>
        {item.rating_count > 0 && (
          <Text style={styles.statText}>
            ⭐ {item.rating_average.toFixed(1)}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.viewButton}
        onPress={() =>
          navigation.navigate("BikeDetails", { bikeId: item.listing_id })
        }
      >
        <Text style={styles.viewButtonText}>View Details</Text>
      </TouchableOpacity>
    </View>
  );

  const renderBookingItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>
            {item.listing?.brand} {item.listing?.model}
          </Text>
          <Text style={styles.cardSubtitle}>
            {new Date(item.start_time).toLocaleDateString()} -{" "}
            {new Date(item.end_time).toLocaleDateString()}
          </Text>
        </View>
        <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.purposeText}>Purpose: {item.purpose}</Text>
      {item.status === "approved" && !item.waiver_accepted && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() =>
            navigation.navigate("AcceptWaiver", { bookingId: item.booking_id })
          }
        >
          <Text style={styles.actionButtonText}>Accept Waiver</Text>
        </TouchableOpacity>
      )}
      {item.status === "approved" &&
        item.waiver_accepted &&
        !item.check_out_data && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              navigation.navigate("CheckOut", { bookingId: item.booking_id })
            }
          >
            <Text style={styles.actionButtonText}>Check Out Bike</Text>
          </TouchableOpacity>
        )}
      {item.status === "active" && !item.check_in_data && (
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonPrimary]}
          onPress={() =>
            navigation.navigate("CheckIn", { bookingId: item.booking_id })
          }
        >
          <Text style={styles.actionButtonText}>Check In Bike</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderRequestItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>
            {item.listing?.brand} {item.listing?.model}
          </Text>
          <Text style={styles.cardSubtitle}>
            Borrower: {item.borrower.full_name} (⭐{" "}
            {item.borrower.reputation_score.toFixed(1)})
          </Text>
          <Text style={styles.cardSubtitle}>
            {new Date(item.start_time).toLocaleDateString()} -{" "}
            {new Date(item.end_time).toLocaleDateString()}
          </Text>
        </View>
        <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.purposeText}>Purpose: {item.purpose}</Text>
      {item.notes && <Text style={styles.notesText}>Notes: {item.notes}</Text>}
      {item.status === "pending" && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonApprove]}
            onPress={() => handleBookingAction(item.booking_id, "approved")}
          >
            <Text style={styles.actionButtonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonDeny]}
            onPress={() => handleBookingAction(item.booking_id, "denied")}
          >
            <Text style={styles.actionButtonText}>Deny</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const getStatusStyle = (status) => {
    switch (status) {
      case "pending":
        return styles.statusPending;
      case "approved":
        return styles.statusApproved;
      case "active":
        return styles.statusActive;
      case "completed":
        return styles.statusCompleted;
      case "denied":
        return styles.statusDenied;
      default:
        return {};
    }
  };

  const TabButton = ({ label, value }) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === value && styles.tabButtonActive]}
      onPress={() => setActiveTab(value)}
    >
      <Text
        style={[styles.tabText, activeTab === value && styles.tabTextActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TabButton label="My Bikes" value="myListings" />
        <TabButton label="My Bookings" value="myBookings" />
        <TabButton label="Requests" value="requests" />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : (
        <FlatList
          data={
            activeTab === "myListings"
              ? myListings
              : activeTab === "myBookings"
                ? myBookings
                : bookingRequests
          }
          renderItem={
            activeTab === "myListings"
              ? renderListingItem
              : activeTab === "myBookings"
                ? renderBookingItem
                : renderRequestItem
          }
          keyExtractor={(item) =>
            activeTab === "myListings" ? item.listing_id : item.booking_id
          }
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {activeTab === "myListings"
                  ? "No bikes listed"
                  : activeTab === "myBookings"
                    ? "No bookings yet"
                    : "No booking requests"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  tabButtonActive: {
    borderBottomWidth: 3,
    borderBottomColor: "#2196F3",
  },
  tabText: {
    fontSize: 14,
    color: "#666",
  },
  tabTextActive: {
    color: "#2196F3",
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textTransform: "capitalize",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusAvailable: {
    backgroundColor: "#4CAF50",
  },
  statusUnavailable: {
    backgroundColor: "#999",
  },
  statusPending: {
    backgroundColor: "#FF9800",
  },
  statusApproved: {
    backgroundColor: "#2196F3",
  },
  statusActive: {
    backgroundColor: "#4CAF50",
  },
  statusCompleted: {
    backgroundColor: "#9E9E9E",
  },
  statusDenied: {
    backgroundColor: "#F44336",
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  cardStats: {
    flexDirection: "row",
    marginBottom: 12,
  },
  statText: {
    fontSize: 12,
    color: "#666",
    marginRight: 16,
  },
  purposeText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  notesText: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
    marginBottom: 8,
  },
  viewButton: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  viewButtonText: {
    color: "#2196F3",
    fontSize: 14,
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginRight: 8,
  },
  actionButtonPrimary: {
    backgroundColor: "#4CAF50",
  },
  actionButtonApprove: {
    backgroundColor: "#4CAF50",
  },
  actionButtonDeny: {
    backgroundColor: "#F44336",
    marginRight: 0,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
});
