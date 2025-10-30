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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useAuth } from "../../context/AuthContext";

const AddBookScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    isbn: "",
    title: "",
    author: "",
    category: "",
    condition: "good",
    location: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [bookData, setBookData] = useState(null);

  const conditions = [
    { value: "excellent", label: "Excellent", color: "#4CAF50" },
    { value: "good", label: "Good", color: "#2196F3" },
    { value: "fair", label: "Fair", color: "#FF9800" },
    { value: "poor", label: "Poor", color: "#f44336" },
  ];

  const categories = [
    "Programming",
    "Software Architecture",
    "Web Development",
    "Data Science",
    "Business",
    "Design",
    "Management",
    "Fiction",
    "Non-Fiction",
    "Biography",
    "Self-Help",
    "Other",
  ];

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleISBNLookup = async () => {
    if (!formData.isbn.trim()) {
      Alert.alert("Error", "Please enter an ISBN first");
      return;
    }

    try {
      setLoading(true);

      // Mock API call to book service (Open Library API)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock book data response
      const mockBookData = {
        title: "Clean Code: A Handbook of Agile Software Craftsmanship",
        author: "Robert C. Martin",
        cover_url: "https://covers.openlibrary.org/b/isbn/9780132350884-M.jpg",
        category: "Programming",
        description:
          "Even bad code can function. But if code isn't clean, it can bring a development organization to its knees.",
        publisher: "Prentice Hall",
        published_date: "2008-08-01",
        pages: 464,
      };

      setBookData(mockBookData);
      setFormData((prev) => ({
        ...prev,
        title: mockBookData.title,
        author: mockBookData.author,
        category: mockBookData.category,
        description: mockBookData.description,
      }));

      Alert.alert(
        "Success",
        "Book information found and filled automatically!"
      );
    } catch (error) {
      console.error("Error looking up ISBN:", error);
      Alert.alert(
        "Error",
        "Could not find book information. Please fill in manually."
      );
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const { title, author, condition, location } = formData;

    if (!title.trim()) {
      Alert.alert("Error", "Please enter a book title");
      return false;
    }

    if (!author.trim()) {
      Alert.alert("Error", "Please enter the author name");
      return false;
    }

    if (!location.trim()) {
      Alert.alert("Error", "Please specify where the book is located");
      return false;
    }

    return true;
  };

  const handleAddBook = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const bookToAdd = {
        ...formData,
        owner_id: user.user_id,
        owner_name: user.name,
        office_id: user.office_id,
        cover_url: bookData?.cover_url || null,
        status: "available",
        added_date: new Date().toISOString(),
        borrowed_count: 0,
      };

      console.log("Adding book:", bookToAdd);

      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      Alert.alert(
        "Success!",
        `"${formData.title}" has been added to the office library. Other colleagues can now discover and borrow your book.`,
        [
          {
            text: "Add Another",
            onPress: () => {
              setFormData({
                isbn: "",
                title: "",
                author: "",
                category: "",
                condition: "good",
                location: "",
                description: "",
              });
              setBookData(null);
            },
          },
          {
            text: "Done",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error("Error adding book:", error);
      Alert.alert("Error", "Failed to add book. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleScanISBN = () => {
    navigation.navigate("ScanBook", {
      onScanComplete: (isbn) => {
        setFormData((prev) => ({ ...prev, isbn }));
        handleISBNLookup();
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.form}>
          <Text style={styles.title}>Add Book to Library</Text>
          <Text style={styles.subtitle}>Share your books with colleagues</Text>

          {/* ISBN Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📚 Book Information</Text>

            <View style={styles.isbnContainer}>
              <View style={styles.isbnInputContainer}>
                <Text style={styles.label}>ISBN (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.isbn}
                  onChangeText={(value) => handleInputChange("isbn", value)}
                  placeholder="Enter ISBN for auto-fill"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.isbnActions}>
                <TouchableOpacity
                  style={styles.scanButton}
                  onPress={handleScanISBN}
                >
                  <Text style={styles.scanButtonText}>📱 Scan</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.lookupButton,
                    loading && styles.disabledButton,
                  ]}
                  onPress={handleISBNLookup}
                  disabled={loading}
                >
                  <Text style={styles.lookupButtonText}>
                    {loading ? "Looking up..." : "🔍 Lookup"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {bookData && (
              <View style={styles.bookPreview}>
                <Image
                  source={{ uri: bookData.cover_url }}
                  style={styles.previewCover}
                />
                <View style={styles.previewInfo}>
                  <Text style={styles.previewTitle}>{bookData.title}</Text>
                  <Text style={styles.previewAuthor}>by {bookData.author}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Manual Entry */}
          <View style={styles.section}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                value={formData.title}
                onChangeText={(value) => handleInputChange("title", value)}
                placeholder="Enter book title"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Author *</Text>
              <TextInput
                style={styles.input}
                value={formData.author}
                onChangeText={(value) => handleInputChange("author", value)}
                placeholder="Enter author name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoryContainer}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryButton,
                        formData.category === category &&
                          styles.categoryButtonActive,
                      ]}
                      onPress={() => handleInputChange("category", category)}
                    >
                      <Text
                        style={[
                          styles.categoryButtonText,
                          formData.category === category &&
                            styles.categoryButtonTextActive,
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>

          {/* Condition and Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Physical Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Condition *</Text>
              <View style={styles.conditionContainer}>
                {conditions.map((condition) => (
                  <TouchableOpacity
                    key={condition.value}
                    style={[
                      styles.conditionButton,
                      formData.condition === condition.value &&
                        styles.conditionButtonActive,
                      { borderColor: condition.color },
                    ]}
                    onPress={() =>
                      handleInputChange("condition", condition.value)
                    }
                  >
                    <Text
                      style={[
                        styles.conditionButtonText,
                        formData.condition === condition.value && {
                          color: condition.color,
                        },
                      ]}
                    >
                      {condition.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location *</Text>
              <TextInput
                style={styles.input}
                value={formData.location}
                onChangeText={(value) => handleInputChange("location", value)}
                placeholder="e.g., My desk, Shelf A-2, Common area"
              />
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(value) =>
                  handleInputChange("description", value)
                }
                placeholder="Brief description or personal notes about the book..."
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Guidelines */}
          <View style={styles.guidelinesSection}>
            <Text style={styles.guidelinesTitle}>📋 Sharing Guidelines</Text>
            <Text style={styles.guideline}>
              • Keep your book in the specified location
            </Text>
            <Text style={styles.guideline}>
              • Respond promptly to borrow requests
            </Text>
            <Text style={styles.guideline}>
              • Update the location if you move the book
            </Text>
            <Text style={styles.guideline}>
              • You can remove the book anytime
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleAddBook}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? "Adding Book..." : "Add to Library"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  section: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  isbnContainer: {
    marginBottom: 16,
  },
  isbnInputContainer: {
    marginBottom: 12,
  },
  isbnActions: {
    flexDirection: "row",
    gap: 8,
  },
  scanButton: {
    flex: 1,
    backgroundColor: "#2196F3",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  scanButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  lookupButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  lookupButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  bookPreview: {
    flexDirection: "row",
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  previewCover: {
    width: 60,
    height: 90,
    borderRadius: 4,
    marginRight: 12,
  },
  previewInfo: {
    flex: 1,
    justifyContent: "center",
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  previewAuthor: {
    fontSize: 14,
    color: "#666",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "white",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  categoryContainer: {
    flexDirection: "row",
    paddingVertical: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  categoryButtonActive: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
  },
  categoryButtonText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  categoryButtonTextActive: {
    color: "white",
  },
  conditionContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  conditionButton: {
    flex: 1,
    minWidth: "22%",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
    backgroundColor: "white",
  },
  conditionButtonActive: {
    backgroundColor: "#f9f9f9",
  },
  conditionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  guidelinesSection: {
    backgroundColor: "#e8f5e8",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  guidelinesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2e7d32",
    marginBottom: 12,
  },
  guideline: {
    fontSize: 14,
    color: "#2e7d32",
    marginBottom: 6,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  submitButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
});

export default AddBookScreen;
