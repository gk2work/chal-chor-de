import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth } from "../../context/AuthContext";
import { apiService } from "../../services/api";

const TripSchedulingScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [tripData, setTripData] = useState({
    origin: "",
    destination: "",
    date: new Date(),
    time: new Date(),
    availableSeats: 3,
    costPerSeat: "",
    isDriver: true,
    notes: "",
    isRecurring: false,
    recurringDays: [],
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const weekDays = [
    { key: "monday", label: "Mon" },
    { key: "tuesday", label: "Tue" },
    { key: "wednesday", label: "Wed" },
    { key: "thursday", label: "Thu" },
    { key: "friday", label: "Fri" },
    { key: "saturday", label: "Sat" },
    { key: "sunday", label: "Sun" },
  ];

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setTripData((prev) => ({ ...prev, date: selectedDate }));
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setTripData((prev) => ({ ...prev, time: selectedTime }));
    }
  };

  const toggleRecurringDay = (day) => {
    setTripData((prev) => ({
      ...prev,
      recurringDays: prev.recurringDays.includes(day)
        ? prev.recurringDays.filter((d) => d !== day)
        : [...prev.recurringDays, day],
    }));
  };

  const validateForm = () => {
    if (!tripData.origin.trim()) {
      Alert.alert("Error", "Please enter pickup location");
      return false;
    }
    if (!tripData.destination.trim()) {
      Alert.alert("Error", "Please enter destination");
      return false;
    }
    if (
      tripData.isDriver &&
      (!tripData.costPerSeat || parseFloat(tripData.costPerSeat) <= 0)
    ) {
      Alert.alert("Error", "Please enter a valid cost per seat");
      return false;
    }
    if (tripData.isDriver && tripData.availableSeats < 1) {
      Alert.alert("Error", "Please provide at least 1 available seat");
      return false;
    }
    return true;
  };

  const handleCreateTrip = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      // Combine date and time
      const tripDateTime = new Date(tripData.date);
      tripDateTime.setHours(tripData.time.getHours());
      tripDateTime.setMinutes(tripData.time.getMinutes());

      const tripPayload = {
        origin: tripData.origin.trim(),
        destination: tripData.destination.trim(),
        departure_time: tripDateTime.toISOString(),
        available_seats: tripData.isDriver ? tripData.availableSeats : 0,
        cost_per_seat: tripData.isDriver ? parseFloat(tripData.costPerSeat) : 0,
        is_driver: tripData.isDriver,
        notes: tripData.notes.trim(),
        office_id: user.office_id,
        is_recurring: tripData.isRecurring,
        recurring_days: tripData.isRecurring ? tripData.recurringDays : [],
      };

      const response = await apiService.carpool.createTrip(tripPayload);

      Alert.alert("Success", "Trip created successfully!", [
        {
          text: "OK",
          onPress: () => navigation.navigate("TripHistory"),
        },
      ]);
    } catch (error) {
      console.error("Create trip error:", error);
      Alert.alert("Error", "Failed to create trip. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Schedule a Trip</Text>

        {/* Driver/Rider Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              tripData.isDriver && styles.toggleButtonActive,
            ]}
            onPress={() => setTripData((prev) => ({ ...prev, isDriver: true }))}
          >
            <Text
              style={[
                styles.toggleButtonText,
                tripData.isDriver && styles.toggleButtonTextActive,
              ]}
            >
              I'm Driving
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              !tripData.isDriver && styles.toggleButtonActive,
            ]}
            onPress={() =>
              setTripData((prev) => ({ ...prev, isDriver: false }))
            }
          >
            <Text
              style={[
                styles.toggleButtonText,
                !tripData.isDriver && styles.toggleButtonTextActive,
              ]}
            >
              Need a Ride
            </Text>
          </TouchableOpacity>
        </View>

        {/* Location Inputs */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>From (Pickup Location)</Text>
          <TextInput
            style={styles.input}
            value={tripData.origin}
            onChangeText={(text) =>
              setTripData((prev) => ({ ...prev, origin: text }))
            }
            placeholder="Enter pickup location"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>To (Destination)</Text>
          <TextInput
            style={styles.input}
            value={tripData.destination}
            onChangeText={(text) =>
              setTripData((prev) => ({ ...prev, destination: text }))
            }
            placeholder="Enter destination"
            placeholderTextColor="#999"
          />
        </View>

        {/* Date and Time */}
        <View style={styles.dateTimeContainer}>
          <View style={styles.dateTimeItem}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateTimeText}>
                {tripData.date.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dateTimeItem}>
            <Text style={styles.label}>Time</Text>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.dateTimeText}>
                {tripData.time.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Driver-specific fields */}
        {tripData.isDriver && (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Available Seats</Text>
              <View style={styles.seatSelector}>
                {[1, 2, 3, 4, 5].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.seatButton,
                      tripData.availableSeats === num &&
                        styles.seatButtonActive,
                    ]}
                    onPress={() =>
                      setTripData((prev) => ({ ...prev, availableSeats: num }))
                    }
                  >
                    <Text
                      style={[
                        styles.seatButtonText,
                        tripData.availableSeats === num &&
                          styles.seatButtonTextActive,
                      ]}
                    >
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Cost per Seat ($)</Text>
              <TextInput
                style={styles.input}
                value={tripData.costPerSeat}
                onChangeText={(text) =>
                  setTripData((prev) => ({ ...prev, costPerSeat: text }))
                }
                placeholder="0.00"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
            </View>
          </>
        )}

        {/* Recurring Trip */}
        <View style={styles.recurringContainer}>
          <View style={styles.recurringHeader}>
            <Text style={styles.label}>Recurring Trip</Text>
            <Switch
              value={tripData.isRecurring}
              onValueChange={(value) =>
                setTripData((prev) => ({ ...prev, isRecurring: value }))
              }
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={tripData.isRecurring ? "#2196F3" : "#f4f3f4"}
            />
          </View>

          {tripData.isRecurring && (
            <View style={styles.weekDaysContainer}>
              <Text style={styles.subLabel}>Select Days</Text>
              <View style={styles.weekDays}>
                {weekDays.map((day) => (
                  <TouchableOpacity
                    key={day.key}
                    style={[
                      styles.dayButton,
                      tripData.recurringDays.includes(day.key) &&
                        styles.dayButtonActive,
                    ]}
                    onPress={() => toggleRecurringDay(day.key)}
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        tripData.recurringDays.includes(day.key) &&
                          styles.dayButtonTextActive,
                      ]}
                    >
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Notes */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={tripData.notes}
            onChangeText={(text) =>
              setTripData((prev) => ({ ...prev, notes: text }))
            }
            placeholder="Any additional information..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreateTrip}
          disabled={loading}
        >
          <Text style={styles.createButtonText}>
            {loading ? "Creating Trip..." : "Create Trip"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date/Time Pickers */}
      {showDatePicker && (
        <DateTimePicker
          value={tripData.date}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={tripData.time}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  formContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  toggleContainer: {
    flexDirection: "row",
    marginBottom: 20,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#e0e0e0",
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#e0e0e0",
  },
  toggleButtonActive: {
    backgroundColor: "#2196F3",
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  toggleButtonTextActive: {
    color: "white",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: "white",
    color: "#333",
  },
  notesInput: {
    height: 80,
    textAlignVertical: "top",
  },
  dateTimeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  dateTimeItem: {
    flex: 0.48,
  },
  dateTimeButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 15,
    backgroundColor: "white",
    alignItems: "center",
  },
  dateTimeText: {
    fontSize: 16,
    color: "#333",
  },
  seatSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  seatButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },
  seatButtonActive: {
    borderColor: "#2196F3",
    backgroundColor: "#2196F3",
  },
  seatButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
  },
  seatButtonTextActive: {
    color: "white",
  },
  recurringContainer: {
    marginBottom: 20,
  },
  recurringHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  weekDaysContainer: {
    marginTop: 10,
  },
  weekDays: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },
  dayButtonActive: {
    borderColor: "#2196F3",
    backgroundColor: "#2196F3",
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  dayButtonTextActive: {
    color: "white",
  },
  createButton: {
    backgroundColor: "#2196F3",
    padding: 18,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  createButtonDisabled: {
    backgroundColor: "#ccc",
  },
  createButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default TripSchedulingScreen;
