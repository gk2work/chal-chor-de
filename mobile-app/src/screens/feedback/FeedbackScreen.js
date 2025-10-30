import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { apiService } from "../../services/api";

const FeedbackScreen = ({ navigation }) => {
  const [category, setCategory] = useState("general");
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [module, setModule] = useState("general");
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    { value: "bug", label: "Bug Report" },
    { value: "feature_request", label: "Feature Request" },
    { value: "improvement", label: "Improvement" },
    { value: "ux_issue", label: "UX Issue" },
    { value: "general", label: "General Feedback" },
  ];

  const modules = [
    { value: "general", label: "General" },
    { value: "carpooling", label: "Carpooling" },
    { value: "bike_sharing", label: "Bike Sharing" },
    { value: "book_sharing", label: "Book Sharing" },
    { value: "chat", label: "Chat" },
  ];

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (title.length < 3) {
      Alert.alert("Error", "Title must be at least 3 characters");
      return;
    }

    if (description.length < 10) {
      Alert.alert("Error", "Description must be at least 10 characters");
      return;
    }

    setSubmitting(true);

    try {
      const feedbackData = {
        category,
        rating: rating > 0 ? rating : undefined,
        title: title.trim(),
        description: description.trim(),
        module,
      };

      await apiService.feedback.submitFeedback(feedbackData);

      Alert.alert(
        "Success",
        "Thank you for your feedback! We appreciate your input.",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );

      // Reset form
      setCategory("general");
      setRating(0);
      setTitle("");
      setDescription("");
      setModule("general");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      Alert.alert(
        "Error",
        "Failed to submit feedback. Please try again later."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.header}>Share Your Feedback</Text>
        <Text style={styles.subheader}>
          Help us improve OfficeShare by sharing your thoughts
        </Text>

        {/* Category Selection */}
        <Text style={styles.label}>Category *</Text>
        <View style={styles.categoryContainer}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.categoryButton,
                category === cat.value && styles.categoryButtonActive,
              ]}
              onPress={() => setCategory(cat.value)}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  category === cat.value && styles.categoryButtonTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Module Selection */}
        <Text style={styles.label}>Module</Text>
        <View style={styles.moduleContainer}>
          {modules.map((mod) => (
            <TouchableOpacity
              key={mod.value}
              style={[
                styles.moduleButton,
                module === mod.value && styles.moduleButtonActive,
              ]}
              onPress={() => setModule(mod.value)}
            >
              <Text
                style={[
                  styles.moduleButtonText,
                  module === mod.value && styles.moduleButtonTextActive,
                ]}
              >
                {mod.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Rating */}
        <Text style={styles.label}>Rating (Optional)</Text>
        <View style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              style={styles.starButton}
            >
              <Text style={styles.star}>{star <= rating ? "⭐" : "☆"}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Title */}
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Brief summary of your feedback"
          maxLength={200}
        />
        <Text style={styles.charCount}>{title.length}/200</Text>

        {/* Description */}
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Please provide detailed feedback..."
          multiline
          numberOfLines={6}
          maxLength={2000}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{description.length}/2000</Text>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            submitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? "Submitting..." : "Submit Feedback"}
          </Text>
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
  content: {
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subheader: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 16,
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 8,
  },
  categoryButtonActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  categoryButtonText: {
    fontSize: 14,
    color: "#333",
  },
  categoryButtonTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  moduleContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  moduleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 8,
  },
  moduleButtonActive: {
    backgroundColor: "#34C759",
    borderColor: "#34C759",
  },
  moduleButtonText: {
    fontSize: 12,
    color: "#666",
  },
  moduleButtonTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  ratingContainer: {
    flexDirection: "row",
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  star: {
    fontSize: 32,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    color: "#999",
    textAlign: "right",
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default FeedbackScreen;
