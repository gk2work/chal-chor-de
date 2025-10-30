import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { chatService } from "../../services/chatService";

const ChatListScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Mock chat threads data
  const mockThreads = [
    {
      thread_id: "thread-1",
      title: "Carpool: Downtown → Office Park",
      transaction_type: "carpool",
      last_message: {
        text: "See you at 8 AM tomorrow!",
        sender_name: "John Doe",
        timestamp: "2024-01-20T16:30:00Z",
      },
      participants: [
        { user_id: "user1", name: "John Doe" },
        { user_id: "user2", name: "Jane Smith" },
        { user_id: "user3", name: "Mike Johnson" },
      ],
      unread_count: 2,
      status: "active",
    },
    {
      thread_id: "thread-2",
      title: "Book: Effective Java",
      transaction_type: "book_sharing",
      last_message: {
        text: "Thanks for letting me borrow this!",
        sender_name: "Alice Brown",
        timestamp: "2024-01-20T14:15:00Z",
      },
      participants: [
        { user_id: "user1", name: "John Doe" },
        { user_id: "user4", name: "Alice Brown" },
      ],
      unread_count: 0,
      status: "active",
    },
    {
      thread_id: "thread-3",
      title: "Bike: Mountain Bike Sharing",
      transaction_type: "bike_sharing",
      last_message: {
        text: "The bike is ready for pickup",
        sender_name: "Bob Wilson",
        timestamp: "2024-01-19T18:45:00Z",
      },
      participants: [
        { user_id: "user5", name: "Bob Wilson" },
        { user_id: "user1", name: "John Doe" },
      ],
      unread_count: 1,
      status: "active",
    },
  ];

  useEffect(() => {
    loadThreads();
  }, []);

  const loadThreads = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setThreads(mockThreads);
    } catch (error) {
      console.error("Error loading chat threads:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadThreads();
    setRefreshing(false);
  };

  const handleThreadPress = (thread) => {
    navigation.navigate("ChatThread", {
      threadId: thread.thread_id,
      title: thread.title,
    });
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case "carpool":
        return "🚗";
      case "book_sharing":
        return "📚";
      case "bike_sharing":
        return "🚲";
      default:
        return "💬";
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderThreadItem = ({ item }) => (
    <TouchableOpacity
      style={styles.threadItem}
      onPress={() => handleThreadPress(item)}
    >
      <View style={styles.threadIcon}>
        <Text style={styles.iconText}>
          {getTransactionIcon(item.transaction_type)}
        </Text>
      </View>

      <View style={styles.threadContent}>
        <View style={styles.threadHeader}>
          <Text style={styles.threadTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.timestamp}>
            {formatTimestamp(item.last_message.timestamp)}
          </Text>
        </View>

        <View style={styles.threadMeta}>
          <Text style={styles.participantCount}>
            {item.participants.length} participant
            {item.participants.length !== 1 ? "s" : ""}
          </Text>
          {item.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{item.unread_count}</Text>
            </View>
          )}
        </View>

        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.last_message.sender_name}: {item.last_message.text}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={threads}
        keyExtractor={(item) => item.thread_id}
        renderItem={renderThreadItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No conversations yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Start sharing rides, books, or bikes to begin chatting with
              colleagues!
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  threadItem: {
    flexDirection: "row",
    backgroundColor: "white",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  threadIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  iconText: {
    fontSize: 24,
  },
  threadContent: {
    flex: 1,
  },
  threadHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  threadTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    color: "#666",
  },
  threadMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  participantCount: {
    fontSize: 12,
    color: "#666",
  },
  unreadBadge: {
    backgroundColor: "#2196F3",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  lastMessage: {
    fontSize: 14,
    color: "#666",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default ChatListScreen;
