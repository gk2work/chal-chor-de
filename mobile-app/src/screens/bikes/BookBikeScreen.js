import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import api from "../../services/api";

export default function BookBikeScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { bikeId, bike } = route.params;

  const [formData, setFormData] = useState({
    start_time: new Date(),
    end_time: new Date(Date.now() + 3600000 * 4), // 4 hours later
    purpose: "",
    notes: "",
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.purpose) {
      Alert.alert("Error", "Please provide a purpose for borrowing");
      return;
    }

    if (formData.end_time <= formData.start_time) {
      Alert.alert("Error", "End time must be after start time");
      return;
    }

    try {
      setLoading(true);
      await api.post("/bike-sharing/bookings", {
        listing_id: bikeId,
        start_time: formData.start_time.toISOString(),
        end_time: formData.end_time.toISOString(),
        purpose: formData.purpose,
        notes: formData.notes,
      });

      Alert.alert(
        "Success",
        "Booking request sent! The owner will review your request.",
        [{ text: "OK", onPress: () => navigation.navigate("BikesMain") }]
      );
    } catch (error) {
      console.error("Error creating booking:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to create booking"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.bikeInfo}>
          <Text style={styles.bikeName}>
            {bike.brand} {bike.model}
          </Text>
          <Text style={styles.bikeType}>
            {bike.bike_type} • {bike.size.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Booking Period</Text>

        <Text style={styles.label}>Start Time *</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowStartPicker(true)}
        >
          <Text style={styles.dateText}>
            {formData.start_time.toLocaleString()}
          </Text>
        </TouchableOpacity>
        {showStartPicker && (
          <DateTimePicker
            value={formData.start_time}
            mode="datetime"
            display="default"
            onChange={(event, date) => {
              setShowStartPicker(false);
              if (date) setFormData({ ...formData, start_time: date });
            }}
            minimumDate={new Date()}
          />
        )}

        <Text style={styles.label}>End Time *</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowEndPicker(true)}
        >
          <Text style={styles.dateText}>
            {formData.end_time.toLocaleString()}
          </Text>
        </TouchableOpacity>
        {showEndPicker && (
          <DateTimePicker
            value={formData.end_time}
            mode="datetime"
            display="default"
            onChange={(event, date) => {
              setShowEndPicker(false);
              if (date) setFormData({ ...formData, end_time: date });
            }}
            minimumDate={formData.start_time}
          />
        )}

        <View style={styles.durationInfo}>
          <Text style={styles.durationText}>
            Duration:{" "}
            {Math.round((formData.end_time - formData.start_time) / 3600000)}{" "}
            hours
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Purpose *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.purpose}
          onChangeText={(text) => setFormData({ ...formData, purpose: text })}
          placeholder="Why do you need the bike? (e.g., commuting, errands, exercise)"
          multiline
          numberOfLines={3}
        />

        <Text style={styles.sectionTitle}>Additional Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.notes}
          onChangeText={(text) => setFormData({ ...formData, notes: text })}
          placeholder="Any additional information for the owner..."
          multiline
          numberOfLines={3}
        />

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📋 Next Steps:</Text>
          <Text style={styles.infoText}>1. Owner will review your request</Text>
          <Text style={styles.infoText}>
            2. You'll be notified of approval/denial
          </Text>
          <Text style={styles.infoText}>3. Accept the digital waiver</Text>
          <Text style={styles.infoText}>4. Check out the bike with photos</Text>
          <Text style={styles.infoText}>
            5. Return and check in with photos
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? "Sending Request..." : "Send Booking Request"}
          </Text>
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
  bikeInfo: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  bikeName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  bikeType: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    textTransform: "capitalize",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginTop: 12,
    marginBottom: 4,
  },
  dateButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
  },
  dateText: {
    fontSize: 14,
    color: "#333",
  },
  durationInfo: {
    backgroundColor: "#E3F2FD",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  durationText: {
    fontSize: 14,
    color: "#2196F3",
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  infoBox: {
    backgroundColor: "#FFF3E0",
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  submitButton: {
    backgroundColor: "#4CAF50",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
