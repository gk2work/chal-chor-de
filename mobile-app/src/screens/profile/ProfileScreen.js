import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useAuth } from "../../context/AuthContext";

const ProfileScreen = () => {
  const { user, updateProfile, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [loading, setLoading] = useState(false);

  // Notification preferences
  const [preferences, setPreferences] = useState({
    notifications_enabled: user?.preferences?.notifications_enabled ?? true,
    location_sharing: user?.preferences?.location_sharing ?? true,
    email_notifications: user?.preferences?.email_notifications ?? true,
  });

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert("Error", "Please enter your full name");
      return;
    }

    setLoading(true);
    const result = await updateProfile({
      full_name: fullName.trim(),
      preferences,
    });
    setLoading(false);

    if (result.success) {
      setEditing(false);
      Alert.alert("Success", "Profile updated successfully");
    } else {
      Alert.alert("Error", result.error);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logout },
    ]);
  };

  const togglePreference = (key) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const renderProfileInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Profile Information</Text>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Full Name</Text>
        {editing ? (
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
            editable={!loading}
          />
        ) : (
          <Text style={styles.value}>{user?.full_name}</Text>
        )}
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Office</Text>
        <Text style={styles.value}>{user?.office_id}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Reputation Score</Text>
        <Text style={[styles.value, styles.reputationScore]}>
          {user?.reputation_score?.toFixed(1) || "5.0"} ⭐
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Member Since</Text>
        <Text style={styles.value}>
          {user?.created_at
            ? new Date(user.created_at).toLocaleDateString()
            : "N/A"}
        </Text>
      </View>
    </View>
  );

  const renderPreferences = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Preferences</Text>

      <TouchableOpacity
        style={styles.preferenceRow}
        onPress={() => editing && togglePreference("notifications_enabled")}
        disabled={!editing}
      >
        <Text style={styles.preferenceLabel}>Push Notifications</Text>
        <View
          style={[
            styles.toggle,
            preferences.notifications_enabled && styles.toggleActive,
          ]}
        >
          <View
            style={[
              styles.toggleThumb,
              preferences.notifications_enabled && styles.toggleThumbActive,
            ]}
          />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.preferenceRow}
        onPress={() => editing && togglePreference("email_notifications")}
        disabled={!editing}
      >
        <Text style={styles.preferenceLabel}>Email Notifications</Text>
        <View
          style={[
            styles.toggle,
            preferences.email_notifications && styles.toggleActive,
          ]}
        >
          <View
            style={[
              styles.toggleThumb,
              preferences.email_notifications && styles.toggleThumbActive,
            ]}
          />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.preferenceRow}
        onPress={() => editing && togglePreference("location_sharing")}
        disabled={!editing}
      >
        <Text style={styles.preferenceLabel}>Location Sharing</Text>
        <View
          style={[
            styles.toggle,
            preferences.location_sharing && styles.toggleActive,
          ]}
        >
          <View
            style={[
              styles.toggleThumb,
              preferences.location_sharing && styles.toggleThumbActive,
            ]}
          />
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderActions = () => (
    <View style={styles.section}>
      {editing ? (
        <View style={styles.editingActions}>
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSaveProfile}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Saving..." : "Save Changes"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => {
              setEditing(false);
              setFullName(user?.full_name || "");
              setPreferences({
                notifications_enabled:
                  user?.preferences?.notifications_enabled ?? true,
                location_sharing: user?.preferences?.location_sharing ?? true,
                email_notifications:
                  user?.preferences?.email_notifications ?? true,
              });
            }}
            disabled={loading}
          >
            <Text style={[styles.buttonText, styles.cancelButtonText]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.button, styles.editButton]}
          onPress={() => setEditing(true)}
        >
          <Text style={styles.buttonText}>Edit Profile</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.button, styles.logoutButton]}
        onPress={handleLogout}
        disabled={loading}
      >
        <Text style={[styles.buttonText, styles.logoutButtonText]}>Logout</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {renderProfileInfo()}
      {renderPreferences()}
      {renderActions()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  section: {
    backgroundColor: "white",
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  infoRow: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
    color: "#333",
  },
  reputationScore: {
    color: "#2196F3",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  preferenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  preferenceLabel: {
    fontSize: 16,
    color: "#333",
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#ccc",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: "#2196F3",
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },
  editingActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    flex: 0.48,
  },
  cancelButton: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    flex: 0.48,
  },
  editButton: {
    backgroundColor: "#2196F3",
  },
  logoutButton: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#f44336",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButtonText: {
    color: "#666",
  },
  logoutButtonText: {
    color: "#f44336",
  },
});

export default ProfileScreen;
