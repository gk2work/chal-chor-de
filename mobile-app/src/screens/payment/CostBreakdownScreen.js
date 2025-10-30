import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { apiService } from "../../services/api";

const CostBreakdownScreen = ({ route, navigation }) => {
  const { tripId } = route.params;
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [costBreakdown, setCostBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTripCostDetails();
  }, []);

  const loadTripCostDetails = async () => {
    try {
      setLoading(true);
      const response = await apiService.carpool.getTripById(tripId);
      const tripData = response.data.trip;
      setTrip(tripData);

      // Calculate cost breakdown
      const breakdown = calculateCostBreakdown(tripData);
      setCostBreakdown(breakdown);
    } catch (error) {
      console.error("Load trip cost details error:", error);
      Alert.alert("Error", "Failed to load trip cost details");
    } finally {
      setLoading(false);
    }
  };

  const calculateCostBreakdown = (tripData) => {
    const baseCost = parseFloat(tripData.cost_per_seat) || 0;
    const participants = tripData.participants || [];
    const totalParticipants = participants.length;

    // Mock calculations - in real app, these would come from the backend
    const fuelCost = baseCost * 0.6;
    const tollCost = baseCost * 0.2;
    const maintenanceCost = baseCost * 0.15;
    const serviceFee = baseCost * 0.05;

    const breakdown = {
      baseCost,
      fuelCost,
      tollCost,
      maintenanceCost,
      serviceFee,
      totalCost: baseCost,
      participants: totalParticipants,
      costPerPerson: baseCost,
      driverEarnings: baseCost * (totalParticipants - 1), // Driver doesn't pay
      totalDistance: tripData.distance || 25, // Mock distance
      costPerKm: baseCost / (tripData.distance || 25),
    };

    return breakdown;
  };

  const handlePayment = () => {
    navigation.navigate("PaymentMethod", {
      tripId,
      amount: costBreakdown.costPerPerson,
      description: `Payment for trip from ${trip.origin} to ${trip.destination}`,
    });
  };

  const handleRequestRefund = () => {
    Alert.alert(
      "Request Refund",
      "Are you sure you want to request a refund for this trip?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request Refund",
          onPress: () => {
            // In a real app, this would call the refund API
            Alert.alert(
              "Refund Requested",
              "Your refund request has been submitted and will be processed within 3-5 business days."
            );
          },
        },
      ]
    );
  };

  if (loading || !trip || !costBreakdown) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading cost details...</Text>
      </View>
    );
  }

  const isDriver = trip.driver_id === user.user_id;
  const hasParticipants = trip.participants && trip.participants.length > 1;

  return (
    <ScrollView style={styles.container}>
      {/* Trip Summary */}
      <View style={styles.tripSummary}>
        <Text style={styles.tripTitle}>Trip Cost Breakdown</Text>
        <View style={styles.routeContainer}>
          <Text style={styles.routeText}>{trip.origin}</Text>
          <Text style={styles.routeArrow}>→</Text>
          <Text style={styles.routeText}>{trip.destination}</Text>
        </View>
        <Text style={styles.tripDate}>
          {new Date(trip.departure_time).toLocaleDateString()} at{" "}
          {new Date(trip.departure_time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>

      {/* Cost Breakdown */}
      <View style={styles.breakdownSection}>
        <Text style={styles.sectionTitle}>Cost Breakdown</Text>

        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownLabel}>🛣️ Distance</Text>
          <Text style={styles.breakdownValue}>
            {costBreakdown.totalDistance} km
          </Text>
        </View>

        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownLabel}>⛽ Fuel Cost</Text>
          <Text style={styles.breakdownValue}>
            ${costBreakdown.fuelCost.toFixed(2)}
          </Text>
        </View>

        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownLabel}>🛣️ Tolls & Fees</Text>
          <Text style={styles.breakdownValue}>
            ${costBreakdown.tollCost.toFixed(2)}
          </Text>
        </View>

        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownLabel}>🔧 Vehicle Maintenance</Text>
          <Text style={styles.breakdownValue}>
            ${costBreakdown.maintenanceCost.toFixed(2)}
          </Text>
        </View>

        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownLabel}>📱 Service Fee</Text>
          <Text style={styles.breakdownValue}>
            ${costBreakdown.serviceFee.toFixed(2)}
          </Text>
        </View>

        <View style={[styles.breakdownItem, styles.totalItem]}>
          <Text style={styles.totalLabel}>Total Trip Cost</Text>
          <Text style={styles.totalValue}>
            ${costBreakdown.totalCost.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Participants & Cost Sharing */}
      <View style={styles.participantsSection}>
        <Text style={styles.sectionTitle}>Cost Sharing</Text>

        <View style={styles.costSharingItem}>
          <Text style={styles.costSharingLabel}>👥 Total Participants</Text>
          <Text style={styles.costSharingValue}>
            {costBreakdown.participants}
          </Text>
        </View>

        <View style={styles.costSharingItem}>
          <Text style={styles.costSharingLabel}>💰 Cost per Person</Text>
          <Text style={styles.costSharingValue}>
            ${costBreakdown.costPerPerson.toFixed(2)}
          </Text>
        </View>

        <View style={styles.costSharingItem}>
          <Text style={styles.costSharingLabel}>📊 Cost per Kilometer</Text>
          <Text style={styles.costSharingValue}>
            ${costBreakdown.costPerKm.toFixed(2)}/km
          </Text>
        </View>

        {isDriver && (
          <View style={styles.driverEarnings}>
            <Text style={styles.driverEarningsLabel}>
              🚗 Your Earnings (as Driver)
            </Text>
            <Text style={styles.driverEarningsValue}>
              ${costBreakdown.driverEarnings.toFixed(2)}
            </Text>
            <Text style={styles.driverEarningsNote}>
              You don't pay for the trip as the driver
            </Text>
          </View>
        )}
      </View>

      {/* Participants List */}
      {hasParticipants && (
        <View style={styles.participantsList}>
          <Text style={styles.sectionTitle}>Participants</Text>
          {trip.participants.map((participant, index) => (
            <View key={participant.user_id} style={styles.participantItem}>
              <View style={styles.participantInfo}>
                <View style={styles.participantAvatar}>
                  <Text style={styles.participantAvatarText}>
                    {participant.name?.charAt(0).toUpperCase() || "U"}
                  </Text>
                </View>
                <View style={styles.participantDetails}>
                  <Text style={styles.participantName}>{participant.name}</Text>
                  <Text style={styles.participantRole}>
                    {participant.user_id === trip.driver_id
                      ? "Driver"
                      : "Rider"}
                  </Text>
                </View>
              </View>
              <View style={styles.participantCost}>
                <Text style={styles.participantCostAmount}>
                  {participant.user_id === trip.driver_id
                    ? "Free"
                    : `$${costBreakdown.costPerPerson.toFixed(2)}`}
                </Text>
                <View
                  style={[
                    styles.paymentStatus,
                    {
                      backgroundColor:
                        participant.payment_status === "paid"
                          ? "#4CAF50"
                          : "#ff9800",
                    },
                  ]}
                >
                  <Text style={styles.paymentStatusText}>
                    {participant.payment_status === "paid" ? "Paid" : "Pending"}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Environmental Impact */}
      <View style={styles.environmentalSection}>
        <Text style={styles.sectionTitle}>🌱 Environmental Impact</Text>
        <View style={styles.environmentalStats}>
          <View style={styles.environmentalItem}>
            <Text style={styles.environmentalValue}>
              {(costBreakdown.totalDistance * 0.2).toFixed(1)} kg
            </Text>
            <Text style={styles.environmentalLabel}>CO₂ Saved</Text>
          </View>
          <View style={styles.environmentalItem}>
            <Text style={styles.environmentalValue}>
              {costBreakdown.participants - 1}
            </Text>
            <Text style={styles.environmentalLabel}>Cars Reduced</Text>
          </View>
          <View style={styles.environmentalItem}>
            <Text style={styles.environmentalValue}>
              ${(costBreakdown.costPerPerson * 0.3).toFixed(0)}
            </Text>
            <Text style={styles.environmentalLabel}>Money Saved</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {!isDriver && (
          <>
            <TouchableOpacity style={styles.payButton} onPress={handlePayment}>
              <Text style={styles.payButtonText}>
                Pay ${costBreakdown.costPerPerson.toFixed(2)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.refundButton}
              onPress={handleRequestRefund}
            >
              <Text style={styles.refundButtonText}>Request Refund</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={styles.receiptButton}
          onPress={() => navigation.navigate("TransactionHistory")}
        >
          <Text style={styles.receiptButtonText}>View Transaction History</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  tripSummary: {
    backgroundColor: "white",
    padding: 20,
    marginBottom: 10,
  },
  tripTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  routeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  routeText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  routeArrow: {
    fontSize: 16,
    color: "#666",
    marginHorizontal: 12,
  },
  tripDate: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  breakdownSection: {
    backgroundColor: "white",
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  breakdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  breakdownLabel: {
    fontSize: 16,
    color: "#333",
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  totalItem: {
    borderBottomWidth: 0,
    borderTopWidth: 2,
    borderTopColor: "#2196F3",
    paddingTop: 16,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2196F3",
  },
  participantsSection: {
    backgroundColor: "white",
    padding: 20,
    marginBottom: 10,
  },
  costSharingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  costSharingLabel: {
    fontSize: 16,
    color: "#333",
  },
  costSharingValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  driverEarnings: {
    backgroundColor: "#e8f5e8",
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  driverEarningsLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4CAF50",
    marginBottom: 4,
  },
  driverEarningsValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 4,
  },
  driverEarningsNote: {
    fontSize: 12,
    color: "#666",
  },
  participantsList: {
    backgroundColor: "white",
    padding: 20,
    marginBottom: 10,
  },
  participantItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  participantInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2196F3",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  participantAvatarText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  participantDetails: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  participantRole: {
    fontSize: 14,
    color: "#666",
  },
  participantCost: {
    alignItems: "flex-end",
  },
  participantCostAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  paymentStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paymentStatusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  environmentalSection: {
    backgroundColor: "white",
    padding: 20,
    marginBottom: 10,
  },
  environmentalStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  environmentalItem: {
    alignItems: "center",
  },
  environmentalValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 4,
  },
  environmentalLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  actionButtons: {
    padding: 20,
  },
  payButton: {
    backgroundColor: "#4CAF50",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  payButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  refundButton: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#f44336",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  refundButtonText: {
    color: "#f44336",
    fontSize: 16,
    fontWeight: "600",
  },
  receiptButton: {
    backgroundColor: "#2196F3",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  receiptButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default CostBreakdownScreen;
