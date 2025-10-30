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
import { apiService } from "../../services/api";

const TripHistoryScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all"); // all, driving, riding, upcoming, completed

  useEffect(() => {
    loadTrips();
  }, [filter]);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const response = await apiService.carpool.getTrips({
        office_id: user.office_id,
        user_id: user.user_id,
        status:
          filter === "upcoming"
            ? "active"
            : filter === "completed"
              ? "completed"
              : undefined,
        role:
          filter === "driving"
            ? "driver"
            : filter === "riding"
              ? "rider"
              : undefined,
      });
      setTrips(response.data.trips || []);
    } catch (error) {
      console.error("Load trips error:", error);
      Alert.alert("Error", "Failed to load trips");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTrips();
    setRefreshing(false);
  };

  const handleTripPress = (trip) => {
    navigation.navigate("TripDetails", { tripId: trip.trip_id });
  };

  const handleCancelTrip = async (tripId) => {
    Alert.alert("Cancel Trip", "Are you sure you want to cancel this trip?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: async () => {
          try {
            await apiService.carpool.updateTrip(tripId, {
              status: "cancelled",
            });
            loadTrips();
            Alert.alert("Success", "Trip cancelled successfully");
          } catch (error) {
            Alert.alert("Error", "Failed to cancel trip");
          }
        },
      },
    ]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "#4CAF50";
      case "completed":
        return "#2196F3";
      case "cancelled":
        return "#f44336";
      default:
        return "#666";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "active":
        return "Active";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  const renderTripItem = ({ item }) => {
    const isDriver = item.driver_id === user.user_id;
    const departureTime = new Date(item.departure_time);
    const isUpcoming = departureTime > new Date();

    return (
      <TouchableOpacity
        style={styles.tripCard}
        onPress={() => handleTripPress(item)}
      >
        <View style={styles.tripHeader}>
          <View style={styles.roleContainer}>
            <Text
              style={[
                styles.roleText,
                { color: isDriver ? "#4CAF50" : "#2196F3" },
              ]}
            >
              {isDriver ? "🚗 Driving" : "🎒 Riding"}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(item.status) },
              ]}
            >
              <Text style={styles.statusText}>
                {getStatusText(item.status)}
              </Text>
            </View>
          </View>
          <Text style={styles.tripDate}>
            {departureTime.toLocaleDateString()} at{" "}
            {departureTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>

        <View style={styles.tripRoute}>
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: "#4CAF50" }]} />
            <Text style={styles.routeText} numberOfLines={1}>
              {item.origin}
            </Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: "#f44336" }]} />
            <Text style={styles.routeText} numberOfLines={1}>
              {item.destination}
            </Text>
          </View>
        </View>

        <View style={styles.tripDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Seats</Text>
            <Text style={styles.detailValue}>
              {item.occupied_seats || 0}/{item.available_seats || 0}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Cost</Text>
            <Text style={styles.detailValue}>${item.cost_per_seat || 0}</Text>
          </View>
          {item.participants && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Riders</Text>
              <Text style={styles.detailValue}>{item.participants.length}</Text>
            </View>
          )}
        </View>

        {isUpcoming && item.status === "active" && isDriver && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancelTrip(item.trip_id)}
          >
            <Text style={styles.cancelButtonText}>Cancel Trip</Text>
          </TouchableOpacity>
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

  return (
    <View style={styles.container}>
      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {renderFilterButton("all", "All")}
        {renderFilterButton("upcoming", "Upcoming")}
        {renderFilterButton("completed", "Completed")}
        {renderFilterButton("driving", "Driving")}
        {renderFilterButton("riding", "Riding")}
      </View>

      {/* Trips List */}
      <FlatList
        data={trips}
        renderItem={renderTripItem}
        keyExtractor={(item) => item.trip_id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {loading ? "Loading trips..." : "No trips found"}
            </Text>
            <Text style={styles.emptySubtext}>
              {!loading && "Create your first trip to get started!"}
            </Text>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("TripScheduling")}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
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
  tripCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
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
  tripHeader: {
    marginBottom: 12,
  },
  roleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  roleText: {
    fontSize: 16,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  tripDate: {
    fontSize: 14,
    color: "#666",
  },
  tripRoute: {
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: "#e0e0e0",
    marginLeft: 3,
    marginVertical: 2,
  },
  routeText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  tripDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  detailItem: {
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#ffebee",
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  cancelButtonText: {
    color: "#f44336",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2196F3",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  fabText: {
    fontSize: 24,
    color: "white",
    fontWeight: "bold",
  },
});

export default TripHistoryScreen;
