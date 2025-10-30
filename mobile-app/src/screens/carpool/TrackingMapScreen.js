import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { useAuth } from "../../context/AuthContext";
import { apiService } from "../../services/api";

const { width, height } = Dimensions.get("window");

const TrackingMapScreen = ({ route, navigation }) => {
  const { tripId } = route.params;
  const { user } = useAuth();
  const mapRef = useRef(null);

  const [trip, setTrip] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState(null);

  useEffect(() => {
    loadTripDetails();
    requestLocationPermission();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required for tracking"
        );
        return;
      }

      getCurrentLocation();
    } catch (error) {
      console.error("Location permission error:", error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch (error) {
      console.error("Get location error:", error);
    }
  };

  const loadTripDetails = async () => {
    try {
      const response = await apiService.carpool.getTripById(tripId);
      setTrip(response.data.trip);

      // Load participants with their locations
      if (response.data.trip.participants) {
        setParticipants(response.data.trip.participants);
      }

      // Generate route coordinates (mock data for demo)
      generateRouteCoordinates(response.data.trip);
    } catch (error) {
      console.error("Load trip error:", error);
      Alert.alert("Error", "Failed to load trip details");
    }
  };

  const generateRouteCoordinates = (tripData) => {
    // In a real app, you would use a routing service like Google Directions API
    // For demo purposes, we'll create a simple route
    const origin = tripData.origin_coordinates || {
      latitude: 37.7749,
      longitude: -122.4194,
    };
    const destination = tripData.destination_coordinates || {
      latitude: 37.7849,
      longitude: -122.4094,
    };

    const route = [
      origin,
      {
        latitude:
          origin.latitude + (destination.latitude - origin.latitude) * 0.3,
        longitude:
          origin.longitude + (destination.longitude - origin.longitude) * 0.3,
      },
      {
        latitude:
          origin.latitude + (destination.latitude - origin.latitude) * 0.7,
        longitude:
          origin.longitude + (destination.longitude - origin.longitude) * 0.7,
      },
      destination,
    ];

    setRouteCoordinates(route);
  };

  const startTracking = async () => {
    try {
      setIsTracking(true);

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          const newLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };

          setCurrentLocation(newLocation);

          // Send location update to tracking service
          sendLocationUpdate(newLocation);
        }
      );

      setLocationSubscription(subscription);
    } catch (error) {
      console.error("Start tracking error:", error);
      Alert.alert("Error", "Failed to start location tracking");
    }
  };

  const stopTracking = () => {
    setIsTracking(false);
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
  };

  const sendLocationUpdate = async (location) => {
    try {
      // Send location to tracking service
      await apiService.tracking.updateLocation({
        trip_id: tripId,
        user_id: user.user_id,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Send location error:", error);
    }
  };

  const fitMapToRoute = () => {
    if (mapRef.current && routeCoordinates.length > 0) {
      mapRef.current.fitToCoordinates(routeCoordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  const handleEmergency = () => {
    Alert.alert("Emergency", "Do you need emergency assistance?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Call Emergency",
        style: "destructive",
        onPress: () => {
          // In a real app, this would call emergency services
          Alert.alert("Emergency", "Emergency services would be contacted");
        },
      },
    ]);
  };

  if (!trip || !currentLocation) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading trip details...</Text>
      </View>
    );
  }

  const isDriver = trip.driver_id === user.user_id;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={currentLocation}
        showsUserLocation={true}
        showsMyLocationButton={false}
        followsUserLocation={isTracking}
      >
        {/* Route Polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#2196F3"
            strokeWidth={4}
            lineDashPattern={[5, 5]}
          />
        )}

        {/* Origin Marker */}
        {routeCoordinates.length > 0 && (
          <Marker
            coordinate={routeCoordinates[0]}
            title="Pickup Location"
            description={trip.origin}
            pinColor="green"
          />
        )}

        {/* Destination Marker */}
        {routeCoordinates.length > 0 && (
          <Marker
            coordinate={routeCoordinates[routeCoordinates.length - 1]}
            title="Destination"
            description={trip.destination}
            pinColor="red"
          />
        )}

        {/* Participant Markers */}
        {participants.map(
          (participant, index) =>
            participant.current_location && (
              <Marker
                key={participant.user_id}
                coordinate={participant.current_location}
                title={participant.name}
                description={
                  participant.user_id === trip.driver_id ? "Driver" : "Rider"
                }
              >
                <View
                  style={[
                    styles.participantMarker,
                    {
                      backgroundColor:
                        participant.user_id === trip.driver_id
                          ? "#4CAF50"
                          : "#2196F3",
                    },
                  ]}
                >
                  <Text style={styles.participantMarkerText}>
                    {participant.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              </Marker>
            )
        )}
      </MapView>

      {/* Trip Info Header */}
      <View style={styles.tripInfoHeader}>
        <View style={styles.tripInfo}>
          <Text style={styles.tripTitle}>
            {isDriver ? "🚗 Driving" : "🎒 Riding"}
          </Text>
          <Text style={styles.tripRoute}>
            {trip.origin} → {trip.destination}
          </Text>
          <Text style={styles.tripTime}>
            Departure:{" "}
            {new Date(trip.departure_time).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>

      {/* Control Buttons */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.controlButton} onPress={fitMapToRoute}>
          <Text style={styles.controlButtonText}>📍 Fit Route</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton,
            styles.trackingButton,
            { backgroundColor: isTracking ? "#f44336" : "#4CAF50" },
          ]}
          onPress={isTracking ? stopTracking : startTracking}
        >
          <Text style={styles.controlButtonText}>
            {isTracking ? "⏹ Stop Tracking" : "▶ Start Tracking"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.emergencyButton]}
          onPress={handleEmergency}
        >
          <Text style={styles.controlButtonText}>🚨 Emergency</Text>
        </TouchableOpacity>
      </View>

      {/* Participants List */}
      <View style={styles.participantsContainer}>
        <Text style={styles.participantsTitle}>
          Trip Participants ({participants.length})
        </Text>
        {participants.map((participant, index) => (
          <View key={participant.user_id} style={styles.participantItem}>
            <View
              style={[
                styles.participantAvatar,
                {
                  backgroundColor:
                    participant.user_id === trip.driver_id
                      ? "#4CAF50"
                      : "#2196F3",
                },
              ]}
            >
              <Text style={styles.participantAvatarText}>
                {participant.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.participantInfo}>
              <Text style={styles.participantName}>{participant.name}</Text>
              <Text style={styles.participantRole}>
                {participant.user_id === trip.driver_id ? "Driver" : "Rider"}
              </Text>
            </View>
            <View
              style={[
                styles.participantStatus,
                {
                  backgroundColor: participant.current_location
                    ? "#4CAF50"
                    : "#999",
                },
              ]}
            >
              <Text style={styles.participantStatusText}>
                {participant.current_location ? "Online" : "Offline"}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  tripInfoHeader: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tripInfo: {
    alignItems: "center",
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  tripRoute: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  tripTime: {
    fontSize: 14,
    color: "#999",
  },
  controlsContainer: {
    position: "absolute",
    bottom: 200,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  controlButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 0.3,
    alignItems: "center",
  },
  trackingButton: {
    flex: 0.4,
  },
  emergencyButton: {
    backgroundColor: "#f44336",
  },
  controlButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  participantsContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    maxHeight: 150,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  participantsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  participantItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  participantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  participantAvatarText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  participantRole: {
    fontSize: 12,
    color: "#666",
  },
  participantStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  participantStatusText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
  },
  participantMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  participantMarkerText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
});

export default TrackingMapScreen;
