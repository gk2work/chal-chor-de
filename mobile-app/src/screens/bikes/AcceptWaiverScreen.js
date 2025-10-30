import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import api from "../../services/api";

export default function AcceptWaiverScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { bookingId } = route.params;
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!accepted) {
      Alert.alert("Error", "Please accept the terms to continue");
      return;
    }

    try {
      setLoading(true);
      await api.post(`/bike-sharing/bookings/${bookingId}/accept-waiver`);

      Alert.alert(
        "Success",
        "Waiver accepted! You can now check out the bike.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error("Error accepting waiver:", error);
      Alert.alert("Error", "Failed to accept waiver");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Bike Sharing Agreement</Text>
        <Text style={styles.subtitle}>
          Please read and accept the following terms
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Responsibility</Text>
          <Text style={styles.sectionText}>
            You agree to take full responsibility for the bike during the rental
            period. You will treat the bike with care and return it in the same
            condition as received.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Damage and Loss</Text>
          <Text style={styles.sectionText}>
            You agree to report any damage immediately. You may be held
            responsible for damage that occurs during your rental period. Loss
            or theft must be reported to the owner and appropriate authorities
            immediately.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Safety</Text>
          <Text style={styles.sectionText}>
            You agree to follow all traffic laws and safety regulations. You
            will wear appropriate safety equipment including a helmet. You
            acknowledge that cycling carries inherent risks.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Photo Documentation</Text>
          <Text style={styles.sectionText}>
            You agree to provide photo documentation at check-out and check-in.
            These photos serve as evidence of the bike's condition and protect
            both parties.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Return Policy</Text>
          <Text style={styles.sectionText}>
            You agree to return the bike on time and to the agreed location.
            Late returns may affect your reputation score and future booking
            privileges.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Insurance</Text>
          <Text style={styles.sectionText}>
            This is a peer-to-peer sharing arrangement. Neither party is
            required to provide insurance, but you may wish to check your
            personal insurance coverage. The platform does not provide insurance
            coverage.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Dispute Resolution</Text>
          <Text style={styles.sectionText}>
            In case of disputes, both parties agree to work together in good
            faith to resolve issues. The platform admin may be involved to
            mediate disputes.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Liability Waiver</Text>
          <Text style={styles.sectionText}>
            You acknowledge that you use the bike at your own risk. The bike
            owner and the platform are not liable for any injuries, accidents,
            or damages that occur during your use of the bike.
          </Text>
        </View>

        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setAccepted(!accepted)}
          >
            <View
              style={[
                styles.checkboxBox,
                accepted && styles.checkboxBoxChecked,
              ]}
            >
              {accepted && <Text style={styles.checkboxCheck}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I have read and agree to all terms and conditions
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.acceptButton,
            (!accepted || loading) && styles.acceptButtonDisabled,
          ]}
          onPress={handleAccept}
          disabled={!accepted || loading}
        >
          <Text style={styles.acceptButtonText}>
            {loading ? "Processing..." : "Accept and Continue"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.declineButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
  },
  section: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  checkboxContainer: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 24,
  },
  checkbox: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#ddd",
    borderRadius: 4,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  checkboxBoxChecked: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  checkboxCheck: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  acceptButton: {
    backgroundColor: "#4CAF50",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  acceptButtonDisabled: {
    backgroundColor: "#ccc",
  },
  acceptButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  declineButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 32,
  },
  declineButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
});
