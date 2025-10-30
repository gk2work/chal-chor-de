import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { apiService } from "../../services/api";

const SettingsScreen = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState({
    push_notifications: true,
    email_notifications: true,
    in_app_notifications: true,
    carpool_notifications: true,
    rating_notifications: true,
    reminder_notifications: true,
  });

  useEffect(() => {
    loadNotificationPreferences();
  }, []);

  const loadNotificationPreferences = async () => {
    try {
      const response = await apiService.notifications.getPreferences(
        user.user_id,
        { office_id: user.office_id }
      );
      setNotificationPreferences(response.data.preferences);
    } catch (error) {
      console.error("Error loading notification preferences:", error);
    }
  };

  const updateNotificationPreferences = async (newPreferences) => {
    try {
      setLoading(true);
      await apiService.notifications.updatePreferences(
        {
          user_id: user.user_id,
          preferences: newPreferences,
        },
        { office_id: user.office_id }
      );
      setNotificationPreferences(newPreferences);
      Alert.alert("Success", "Notification preferences updated successfully");
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      Alert.alert("Error", "Failed to update notification preferences");
    } finally {
      setLoading(false);
    }
  };

  const togglePreference = (key) => {
    const newPreferences = {
      ...notificationPreferences,
      [key]: !notificationPreferences[key],
    };
    updateNotificationPreferences(newPreferences);
  };

  const renderNotificationSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Notification Settings</Text>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Push Notifications</Text>
          <Text style={styles.settingDescription}>
            Receive push notifications on your device
          </Text>
        </View>
        <Switch
          value={notificationPreferences.push_notifications}
          onValueChange={() => togglePreference("push_notifications")}
          disabled={loading}
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={
            notificationPreferences.push_notifications ? "#2196F3" : "#f4f3f4"
          }
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Email Notifications</Text>
          <Text style={styles.settingDescription}>
            Receive notifications via email
          </Text>
        </View>
        <Switch
          value={notificationPreferences.email_notifications}
          onValueChange={() => togglePreference("email_notifications")}
          disabled={loading}
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={
            notificationPreferences.email_notifications ? "#2196F3" : "#f4f3f4"
          }
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>In-App Notifications</Text>
          <Text style={styles.settingDescription}>
            Show notifications within the app
          </Text>
        </View>
        <Switch
          value={notificationPreferences.in_app_notifications}
          onValueChange={() => togglePreference("in_app_notifications")}
          disabled={loading}
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={
            notificationPreferences.in_app_notifications ? "#2196F3" : "#f4f3f4"
          }
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Carpool Notifications</Text>
          <Text style={styles.settingDescription}>
            Notifications about carpool matches and updates
          </Text>
        </View>
        <Switch
          value={notificationPreferences.carpool_notifications}
          onValueChange={() => togglePreference("carpool_notifications")}
          disabled={loading}
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={
            notificationPreferences.carpool_notifications
              ? "#2196F3"
              : "#f4f3f4"
          }
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Rating Notifications</Text>
          <Text style={styles.settingDescription}>
            Notifications about ratings and reviews
          </Text>
        </View>
        <Switch
          value={notificationPreferences.rating_notifications}
          onValueChange={() => togglePreference("rating_notifications")}
          disabled={loading}
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={
            notificationPreferences.rating_notifications ? "#2196F3" : "#f4f3f4"
          }
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Reminder Notifications</Text>
          <Text style={styles.settingDescription}>
            Reminders about upcoming trips and activities
          </Text>
        </View>
        <Switch
          value={notificationPreferences.reminder_notifications}
          onValueChange={() => togglePreference("reminder_notifications")}
          disabled={loading}
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={
            notificationPreferences.reminder_notifications
              ? "#2196F3"
              : "#f4f3f4"
          }
        />
      </View>
    </View>
  );

  const renderAppInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>App Information</Text>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Version</Text>
        <Text style={styles.infoValue}>1.0.0</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Build</Text>
        <Text style={styles.infoValue}>Development</Text>
      </View>

      <TouchableOpacity
        style={styles.linkRow}
        onPress={() =>
          Alert.alert(
            "Privacy Policy",
            "Privacy policy will be available soon."
          )
        }
      >
        <Text style={styles.linkText}>Privacy Policy</Text>
        <Text style={styles.linkArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkRow}
        onPress={() =>
          Alert.alert(
            "Terms of Service",
            "Terms of service will be available soon."
          )
        }
      >
        <Text style={styles.linkText}>Terms of Service</Text>
        <Text style={styles.linkArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkRow}
        onPress={() =>
          Alert.alert(
            "Support",
            "For support, please contact your office administrator."
          )
        }
      >
        <Text style={styles.linkText}>Help & Support</Text>
        <Text style={styles.linkArrow}>›</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDeveloperInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Development Info</Text>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>User ID</Text>
        <Text style={styles.infoValue}>{user?.user_id}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Office ID</Text>
        <Text style={styles.infoValue}>{user?.office_id}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>API Base URL</Text>
        <Text style={styles.infoValue}>localhost:3000</Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {renderNotificationSettings()}
      {renderAppInfo()}
      {__DEV__ && renderDeveloperInfo()}
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
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: "#666",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoLabel: {
    fontSize: 16,
    color: "#333",
  },
  infoValue: {
    fontSize: 16,
    color: "#666",
    fontFamily: "monospace",
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  linkText: {
    fontSize: 16,
    color: "#2196F3",
  },
  linkArrow: {
    fontSize: 20,
    color: "#ccc",
  },
});

export default SettingsScreen;
