import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import api from "../../services/api";

export default function CheckOutScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { bookingId } = route.params;

  const [photos, setPhotos] = useState([]);
  const [conditionNotes, setConditionNotes] = useState("");
  const [damageReported, setDamageReported] = useState(false);
  const [damageDescription, setDamageDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please grant camera permissions");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets) {
      setPhotos([...photos, result.assets[0]]);
    }
  };

  const handleSubmit = async () => {
    if (photos.length === 0) {
      Alert.alert("Error", "Please take at least one photo of the bike");
      return;
    }

    if (damageReported && !damageDescription) {
      Alert.alert("Error", "Please describe the damage");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();

      formData.append("action", "check_out");
      formData.append(
        "location",
        JSON.stringify({
          type: "Point",
          coordinates: [-122.4194, 37.7749],
          address: "Pickup Location",
        })
      );
      formData.append("condition_notes", conditionNotes);
      formData.append("damage_reported", damageReported);
      if (damageReported) {
        formData.append("damage_description", damageDescription);
      }

      photos.forEach((photo, index) => {
        formData.append("photos", {
          uri: photo.uri,
          type: "image/jpeg",
          name: `checkout_${index}.jpg`,
        });
      });

      await api.post(
        `/bike-sharing/bookings/${bookingId}/check-out`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      Alert.alert(
        "Success",
        "Bike checked out successfully! Enjoy your ride.",
        [{ text: "OK", onPress: () => navigation.navigate("MyBikes") }]
      );
    } catch (error) {
      console.error("Error checking out:", error);
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to check out bike"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📸 Photo Documentation Required</Text>
          <Text style={styles.infoText}>
            Take photos of the bike's current condition before you start your
            ride. This protects both you and the owner.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Bike Photos * (Required)</Text>
        <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
          <Text style={styles.photoButtonText}>📷 Take Photo</Text>
        </TouchableOpacity>

        {photos.length > 0 && (
          <View style={styles.photosPreview}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image
                  source={{ uri: photo.uri }}
                  style={styles.photoPreview}
                />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() =>
                    setPhotos(photos.filter((_, i) => i !== index))
                  }
                >
                  <Text style={styles.removePhotoText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        <Text style={styles.photoCount}>{photos.length} photo(s) taken</Text>

        <Text style={styles.sectionTitle}>Condition Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={conditionNotes}
          onChangeText={setConditionNotes}
          placeholder="Note the current condition of the bike (e.g., 'Bike looks great, no visible damage')"
          multiline
          numberOfLines={4}
        />

        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setDamageReported(!damageReported)}
          >
            <View
              style={[
                styles.checkboxBox,
                damageReported && styles.checkboxBoxChecked,
              ]}
            >
              {damageReported && <Text style={styles.checkboxCheck}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Report existing damage</Text>
          </TouchableOpacity>
        </View>

        {damageReported && (
          <>
            <Text style={styles.sectionTitle}>Damage Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={damageDescription}
              onChangeText={setDamageDescription}
              placeholder="Describe any existing damage you noticed..."
              multiline
              numberOfLines={4}
            />
          </>
        )}

        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>⚠️ Important</Text>
          <Text style={styles.warningText}>By checking out, you agree to:</Text>
          <Text style={styles.warningText}>
            • Return the bike in the same condition
          </Text>
          <Text style={styles.warningText}>
            • Report any damage immediately
          </Text>
          <Text style={styles.warningText}>• Follow all safety guidelines</Text>
          <Text style={styles.warningText}>• Return on time</Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading || photos.length === 0}
        >
          <Text style={styles.submitButtonText}>
            {loading ? "Checking Out..." : "Confirm Check-Out"}
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
  infoBox: {
    backgroundColor: "#E3F2FD",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
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
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  photoButton: {
    backgroundColor: "#2196F3",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  photoButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  photosPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
  },
  photoContainer: {
    position: "relative",
    marginRight: 8,
    marginBottom: 8,
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#F44336",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  removePhotoText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  photoCount: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
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
    height: 100,
    textAlignVertical: "top",
  },
  checkboxContainer: {
    marginTop: 16,
  },
  checkbox: {
    flexDirection: "row",
    alignItems: "center",
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
  },
  checkboxBoxChecked: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
  },
  checkboxCheck: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#333",
  },
  warningBox: {
    backgroundColor: "#FFF3E0",
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  warningText: {
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
