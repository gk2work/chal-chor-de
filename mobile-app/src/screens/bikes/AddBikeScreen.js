import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import api from "../../services/api";

export default function AddBikeScreen() {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    bike_type: "hybrid",
    brand: "",
    model: "",
    description: "",
    condition: "good",
    size: "m",
    features: [],
    special_instructions: "",
    smart_lock_info: {
      has_smart_lock: false,
      lock_type: "",
      instructions: "",
    },
  });
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);

  const bikeTypes = [
    "mountain",
    "road",
    "hybrid",
    "electric",
    "city",
    "folding",
  ];
  const conditions = ["excellent", "good", "fair"];
  const sizes = ["xs", "s", "m", "l", "xl"];
  const availableFeatures = [
    "helmet_included",
    "lock_included",
    "lights",
    "basket",
    "gears",
    "electric_assist",
    "adjustable_seat",
    "phone_mount",
  ];

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please grant camera roll permissions");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets) {
      setPhotos([...photos, ...result.assets.slice(0, 5 - photos.length)]);
    }
  };

  const toggleFeature = (feature) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }));
  };

  const handleSubmit = async () => {
    if (!formData.brand || !formData.model || !formData.description) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      const formDataToSend = new FormData();

      Object.keys(formData).forEach((key) => {
        if (key === "features") {
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else if (key === "smart_lock_info") {
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else {
          formDataToSend.append(key, formData[key]);
        }
      });

      // Add location (mock for now)
      formDataToSend.append(
        "location",
        JSON.stringify({
          type: "Point",
          coordinates: [-122.4194, 37.7749],
          address: "Office Location",
        })
      );

      photos.forEach((photo, index) => {
        formDataToSend.append("photos", {
          uri: photo.uri,
          type: "image/jpeg",
          name: `bike_${index}.jpg`,
        });
      });

      await api.post("/bike-sharing/listings", formDataToSend, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      Alert.alert("Success", "Your bike has been listed!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error("Error adding bike:", error);
      Alert.alert("Error", "Failed to list bike. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Bike Type *</Text>
        <View style={styles.optionsRow}>
          {bikeTypes.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.optionButton,
                formData.bike_type === type && styles.optionButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, bike_type: type })}
            >
              <Text
                style={[
                  styles.optionText,
                  formData.bike_type === type && styles.optionTextActive,
                ]}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Brand *</Text>
        <TextInput
          style={styles.input}
          value={formData.brand}
          onChangeText={(text) => setFormData({ ...formData, brand: text })}
          placeholder="e.g., Trek, Specialized, Giant"
        />

        <Text style={styles.sectionTitle}>Model *</Text>
        <TextInput
          style={styles.input}
          value={formData.model}
          onChangeText={(text) => setFormData({ ...formData, model: text })}
          placeholder="e.g., X-Caliber 8, Allez"
        />

        <Text style={styles.sectionTitle}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.description}
          onChangeText={(text) =>
            setFormData({ ...formData, description: text })
          }
          placeholder="Describe your bike..."
          multiline
          numberOfLines={4}
        />

        <Text style={styles.sectionTitle}>Condition *</Text>
        <View style={styles.optionsRow}>
          {conditions.map((condition) => (
            <TouchableOpacity
              key={condition}
              style={[
                styles.optionButton,
                formData.condition === condition && styles.optionButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, condition })}
            >
              <Text
                style={[
                  styles.optionText,
                  formData.condition === condition && styles.optionTextActive,
                ]}
              >
                {condition}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Size *</Text>
        <View style={styles.optionsRow}>
          {sizes.map((size) => (
            <TouchableOpacity
              key={size}
              style={[
                styles.optionButton,
                formData.size === size && styles.optionButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, size })}
            >
              <Text
                style={[
                  styles.optionText,
                  formData.size === size && styles.optionTextActive,
                ]}
              >
                {size.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Features</Text>
        <View style={styles.featuresContainer}>
          {availableFeatures.map((feature) => (
            <TouchableOpacity
              key={feature}
              style={[
                styles.featureButton,
                formData.features.includes(feature) &&
                  styles.featureButtonActive,
              ]}
              onPress={() => toggleFeature(feature)}
            >
              <Text
                style={[
                  styles.featureText,
                  formData.features.includes(feature) &&
                    styles.featureTextActive,
                ]}
              >
                {feature.replace(/_/g, " ")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Photos (up to 5)</Text>
        <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
          <Text style={styles.photoButtonText}>📷 Add Photos</Text>
        </TouchableOpacity>
        {photos.length > 0 && (
          <View style={styles.photosPreview}>
            {photos.map((photo, index) => (
              <Image
                key={index}
                source={{ uri: photo.uri }}
                style={styles.photoPreview}
              />
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Special Instructions</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.special_instructions}
          onChangeText={(text) =>
            setFormData({ ...formData, special_instructions: text })
          }
          placeholder="Any special instructions for borrowers..."
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? "Listing..." : "List My Bike"}
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
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
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  optionButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  optionButtonActive: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
  },
  optionText: {
    fontSize: 14,
    color: "#666",
    textTransform: "capitalize",
  },
  optionTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  featuresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  featureButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  featureButtonActive: {
    backgroundColor: "#E3F2FD",
    borderColor: "#2196F3",
  },
  featureText: {
    fontSize: 12,
    color: "#666",
    textTransform: "capitalize",
  },
  featureTextActive: {
    color: "#2196F3",
    fontWeight: "600",
  },
  photoButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  photoButtonText: {
    fontSize: 16,
    color: "#2196F3",
    fontWeight: "600",
  },
  photosPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
  },
  photoPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
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
