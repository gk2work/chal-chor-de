import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { apiService } from "../../services/api";

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [recentTrips, setRecentTrips] = useState([]);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      // Load recent notifications
      await loadNotifications();
      // Load recent trips (when carpool service is available)
      // await loadRecentTrips();
    } catch (error) {
      console.error("Error loading home data:", error);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await apiService.notifications.getUserNotifications(
        user.user_id,
        { office_id: user.office_id, limit: 5 }
      );
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification) => {
    try {
      // Mark notification as read
      await apiService.notifications.markAsRead(notification.notification_id, {
        user_id: user.user_id,
        office_id: user.office_id,
      });

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === notification.notification_id
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const renderQuickActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() =>
            Alert.alert(
              "Coming Soon",
              "Carpooling feature will be available soon!"
            )
          }
        >
          <Text style={styles.quickActionIcon}>🚗</Text>
          <Text style={styles.quickActionText}>Find Carpool</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() =>
            Alert.alert(
              "Coming Soon",
              "Book sharing feature will be available soon!"
            )
          }
        >
          <Text style={styles.quickActionIcon}>📚</Text>
          <Text style={styles.quickActionText}>Share Books</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() =>
            Alert.alert(
              "Coming Soon",
              "Bike sharing feature will be available soon!"
            )
          }
        >
          <Text style={styles.quickActionIcon}>🚲</Text>
          <Text style={styles.quickActionText}>Bike Share</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate("Profile")}
        >
          <Text style={styles.quickActionIcon}>👤</Text>
          <Text style={styles.quickActionText}>My Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderNotifications = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recent Notifications</Text>
      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No notifications yet</Text>
        </View>
      ) : (
        notifications.map((notification) => (
          <TouchableOpacity
            key={notification.notification_id}
            style={[
              styles.notificationItem,
              !notification.read_at && styles.unreadNotification,
            ]}
            onPress={() => handleNotificationPress(notification)}
          >
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>{notification.title}</Text>
              <Text style={styles.notificationBody}>{notification.body}</Text>
              <Text style={styles.notificationTime}>
                {new Date(notification.created_at).toLocaleDateString()}
              </Text>
            </View>
            {!notification.read_at && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const renderWelcomeSection = () => (
    <View style={styles.welcomeSection}>
      <Text style={styles.welcomeText}>Welcome back, {user?.full_name}!</Text>
      <Text style={styles.officeText}>Office: {user?.office_id}</Text>
      <Text style={styles.reputationText}>
        Reputation Score: {user?.reputation_score?.toFixed(1) || "5.0"} ⭐
      </Text>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {renderWelcomeSection()}
      {renderQuickActions()}
      {renderNotifications()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  welcomeSection: {
    backgroundColor: "white",
    padding: 20,
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  officeText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 5,
  },
  reputationText: {
    fontSize: 16,
    color: "#2196F3",
    fontWeight: "600",
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
  quickActionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  quickActionButton: {
    width: "48%",
    backgroundColor: "#f8f9fa",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  quickActionIcon: {
    fontSize: 30,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  notificationItem: {
    flexDirection: "row",
    padding: 15,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  unreadNotification: {
    backgroundColor: "#e3f2fd",
    borderColor: "#2196F3",
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: "#999",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2196F3",
    marginTop: 8,
  },
  emptyState: {
    padding: 20,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    fontStyle: "italic",
  },
});

export default HomeScreen;
