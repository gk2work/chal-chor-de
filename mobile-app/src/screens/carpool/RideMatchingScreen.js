import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { apiService } from "../../services/api";

const RideMatchingScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [availableTrips, setAvailableTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all"); // all, morning, evening, today

  useEffect(() => {
    loadAvailableTrips();
  }, [filter]);

  const loadAvailableTrips = async () => {
    try {
      setLoading(true);
      const response = await apiService.carpool.getTrips({
        office_id: user.office_id,
        status: "active",
        available_seats_gt: 0,
        exclude_user: user.user_id, // Don't show user's own trips
        time_filter:
          filter === "morning" ? "am" : filter === "evening" ? "pm" : undefined,
        date_filter: filter === "today" ? "today" : undefined,
      });
      setAvailableTrips(response.data.trips || []);
    } catch (error) {
      console.error("Load trips error:", error);
      Alert.alert("Error", "Failed to load available trips");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAvailableTrips();
    setRefreshing(false);
  };

  const handleJoinTrip = async (trip) => {
    Alert.alert(
      "Join Trip",
      `Do you want to join ${trip.driver_name}'s trip from ${trip.origin} to ${trip.destination}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Join",
          onPress: async () => {
            try {
              await apiService.carpool.joinTrip(trip.trip_id);
              Alert.alert(
                "Success",
                "Trip join request sent! The driver will be notified.",
                [
                  {
                    text: "OK",
                    onPress: () => navigation.navigate("TripHistory"),
                  },
                ]
              );
            } catch (error) {
              Alert.alert("Error", "Failed to join trip. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleViewProfile = (driverId) => {
    // In a real app, this would show driver profile
    Alert.alert("Driver Profile", "Driver profile feature coming soon!");
  };

  const calculateDistance = (trip) => {
    // Mock distance calculation - in real app, use geolocation
    return Math.floor(Math.random() * 20) + 5; // 5-25 km
  };

  const getTimeCategory = (departureTime) => {
    const hour = new Date(departureTime).getHours();
    if (hour < 12) return "Morning";
    if (hour < 17) return "Afternoon";
    return "Evening";
  };

  const renderTripItem = ({ item }) => {
    const departureTime = new Date(item.departure_time);
    const distance = calculateDistance(item);
    const timeCategory = getTimeCategory(item.departure_time);
    const availableSeats = item.available_seats - (item.occupied_seats || 0);

    return (
      <View style={styles.tripCard}>
        {/* Driver Info */}
        <View style={styles.driverSection}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverAvatarText}>
              {item.driver_name?.charAt(0).toUpperCase() || "D"}
            </Text>
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>
              {item.driver_name || "Driver"}
            </Text>
            <View style={styles.ratingContainer}>
              <Text style={styles.rating}>
                ⭐ {item.driver_rating?.toFixed(1) || "5.0"}
              </Text>
              <Text style={styles.ratingCount}>
                ({item.driver_trip_count || 0} trips)
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => handleViewProfile(item.driver_id)}
          >
            <Text style={styles.profileButtonText}>View</Text>
          </TouchableOpacity>
        </View>

        {/* Trip Route */}
        <View style={styles.routeSection}>
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

        {/* Trip Details */}
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>🕐 Time</Text>
              <Text style={styles.detailValue}>
                {departureTime.toLocaleDateString()} at{" "}
                {departureTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              <Text style={styles.detailSubtext}>{timeCategory}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>💺 Seats</Text>
              <Text style={styles.detailValue}>{availableSeats} available</Text>
              <Text style={styles.detailSubtext}>
                of {item.available_seats} total
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>💰 Cost</Text>
              <Text style={styles.detailValue}>${item.cost_per_seat}</Text>
              <Text style={styles.detailSubtext}>per person</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>📍 Distance</Text>
              <Text style={styles.detailValue}>{distance} km</Text>
              <Text style={styles.detailSubtext}>approx.</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {item.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>📝 Notes:</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.joinButton}
            onPress={() => handleJoinTrip(item)}
          >
            <Text style={styles.joinButtonText}>Join Trip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() =>
              navigation.navigate("TripDetails", { tripId: item.trip_id })
            }
          >
            <Text style={styles.detailsButtonText}>Details</Text>
          </TouchableOpacity>
        </View>
      </View>
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find a Ride</Text>
        <Text style={styles.headerSubtitle}>
          Join available trips in your office
        </Text>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {renderFilterButton("all", "All")}
        {renderFilterButton("today", "Today")}
        {renderFilterButton("morning", "Morning")}
        {renderFilterButton("evening", "Evening")}
      </View>

      {/* Trips List */}
      <FlatList
        data={availableTrips}
        renderItem={renderTripItem}
        keyExtractor={(item) => item.trip_id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🚗</Text>
            <Text style={styles.emptyText}>
              {loading ? "Loading available trips..." : "No trips available"}
            </Text>
            <Text style={styles.emptySubtext}>
              {!loading && "Check back later or create your own trip!"}
            </Text>
            {!loading && (
              <TouchableOpacity
                style={styles.createTripButton}
                onPress={() => navigation.navigate("TripScheduling")}
              >
                <Text style={styles.createTripButtonText}>Create Trip</Text>
              </TouchableOpacity>
            )}
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
  header: {
    backgroundColor: "white",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#666",
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
  driverSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#2196F3",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  driverAvatarText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  rating: {
    fontSize: 14,
    color: "#666",
    marginRight: 8,
  },
  ratingCount: {
    fontSize: 12,
    color: "#999",
  },
  profileButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#e3f2fd",
    borderRadius: 6,
  },
  profileButtonText: {
    color: "#2196F3",
    fontSize: 14,
    fontWeight: "600",
  },
  routeSection: {
    marginBottom: 16,
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
  detailsSection: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  detailSubtext: {
    fontSize: 11,
    color: "#999",
  },
  notesSection: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: "#333",
  },
  actionSection: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  joinButton: {
    flex: 0.65,
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginRight: 8,
  },
  joinButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  detailsButton: {
    flex: 0.3,
    backgroundColor: "#e0e0e0",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  detailsButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
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
    marginBottom: 20,
  },
  createTripButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createTripButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default RideMatchingScreen;
