import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import api from "../../services/api";

export default function BikeDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { bikeId } = route.params;
  const [bike, setBike] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);

  useEffect(() => {
    fetchBikeDetails();
  }, [bikeId]);

  const fetchBikeDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/bike-sharing/listings/${bikeId}`);
      setBike(response.data.listing);
    } catch (error) {
      console.error("Error fetching bike details:", error);
      Alert.alert("Error", "Failed to load bike details.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleBookBike = () => {
    setBookingModalVisible(true);
  };

  const confirmBooking = () => {
    setBookingModalVisible(false);
    navigation.navigate("BookBike", { bikeId: bike.listing_id, bike });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (!bike) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Bike not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {bike.photos && bike.photos.length > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.imageCarousel}
        >
          {bike.photos.map((photo, index) => (
            <Image
              key={index}
              source={{ uri: `data:${photo.mimetype};base64,${photo.data}` }}
              style={styles.bikeImage}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.placeholderImage}>
          <Text style={styles.placeholderText}>🚲</Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.bikeBrand}>
              {bike.brand} {bike.model}
            </Text>
            <Text style={styles.bikeType}>
              {bike.bike_type.charAt(0).toUpperCase() + bike.bike_type.slice(1)}{" "}
              Bike
            </Text>
          </View>
          <View style={styles.conditionBadge}>
            <Text style={styles.conditionText}>
              {bike.condition.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{bike.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specifications</Text>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Size:</Text>
            <Text style={styles.specValue}>{bike.size.toUpperCase()}</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Condition:</Text>
            <Text style={styles.specValue}>{bike.condition}</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Total Bookings:</Text>
            <Text style={styles.specValue}>{bike.total_bookings}</Text>
          </View>
          {bike.rating_count > 0 && (
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Rating:</Text>
              <Text style={styles.specValue}>
                ⭐ {bike.rating_average.toFixed(1)} ({bike.rating_count}{" "}
                reviews)
              </Text>
            </View>
          )}
        </View>

        {bike.features && bike.features.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Features</Text>
            <View style={styles.featuresContainer}>
              {bike.features.map((feature, index) => (
                <View key={index} style={styles.featureBadge}>
                  <Text style={styles.featureText}>
                    {feature.replace(/_/g, " ")}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {bike.smart_lock_info && bike.smart_lock_info.has_smart_lock && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Smart Lock Information</Text>
            <View style={styles.smartLockCard}>
              <Text style={styles.smartLockType}>
                🔒 {bike.smart_lock_info.lock_type}
              </Text>
              <Text style={styles.smartLockInstructions}>
                {bike.smart_lock_info.instructions}
              </Text>
            </View>
          </View>
        )}

        {bike.special_instructions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Instructions</Text>
            <Text style={styles.instructions}>{bike.special_instructions}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Owner Information</Text>
          <View style={styles.ownerCard}>
            <View>
              <Text style={styles.ownerName}>{bike.owner.full_name}</Text>
              <Text style={styles.ownerRating}>
                ⭐ {bike.owner.reputation_score.toFixed(1)} reputation
              </Text>
            </View>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() =>
                navigation.navigate("Chat", {
                  screen: "ChatThread",
                  params: {
                    recipientId: bike.owner.user_id,
                    recipientName: bike.owner.full_name,
                  },
                })
              }
            >
              <Text style={styles.chatButtonText}>💬 Chat</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.bookButton} onPress={handleBookBike}>
          <Text style={styles.bookButtonText}>Request to Book</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={bookingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBookingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Book this bike?</Text>
            <Text style={styles.modalText}>
              You'll need to provide booking details and wait for owner
              approval.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setBookingModalVisible(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmBooking}
              >
                <Text style={styles.modalButtonTextConfirm}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 18,
    color: "#999",
  },
  imageCarousel: {
    height: 300,
  },
  bikeImage: {
    width: 400,
    height: 300,
  },
  placeholderImage: {
    width: "100%",
    height: 300,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 100,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  bikeBrand: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  bikeType: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
  },
  conditionBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  conditionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  specLabel: {
    fontSize: 14,
    color: "#666",
  },
  specValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  featuresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  featureBadge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  featureText: {
    color: "#2196F3",
    fontSize: 12,
    textTransform: "capitalize",
  },
  smartLockCard: {
    backgroundColor: "#FFF3E0",
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
  },
  smartLockType: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  smartLockInstructions: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  instructions: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
  },
  ownerCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  ownerRating: {
    fontSize: 14,
    color: "#FF9800",
    marginTop: 4,
  },
  chatButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chatButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  bookButton: {
    backgroundColor: "#4CAF50",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 32,
  },
  bookButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    width: "80%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
  modalButtonCancel: {
    backgroundColor: "#f0f0f0",
  },
  modalButtonConfirm: {
    backgroundColor: "#4CAF50",
  },
  modalButtonTextCancel: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  modalButtonTextConfirm: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
