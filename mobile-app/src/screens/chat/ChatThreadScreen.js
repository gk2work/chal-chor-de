import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { chatService } from "../../services/chatService";

const ChatThreadScreen = ({ route, navigation }) => {
  const { threadId, title } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState([]);
  const flatListRef = useRef(null);

  // Mock messages data
  const mockMessages = [
    {
      message_id: "msg-1",
      sender: {
        user_id: "user2",
        name: "Jane Smith",
      },
      message_type: "text",
      content: {
        text: "Hey everyone! Looking forward to our carpool tomorrow.",
      },
      created_at: "2024-01-20T14:00:00Z",
      reactions: [],
      edited: { is_edited: false },
    },
    {
      message_id: "msg-2",
      sender: {
        user_id: "user1",
        name: "John Doe",
      },
      message_type: "text",
      content: {
        text: "Great! I'll pick everyone up at 8 AM sharp. Please be ready!",
      },
      created_at: "2024-01-20T14:15:00Z",
      reactions: [
        { user_id: "user2", emoji: "👍" },
        { user_id: "user3", emoji: "👍" },
      ],
      edited: { is_edited: false },
    },
    {
      message_id: "msg-3",
      sender: {
        user_id: "user3",
        name: "Mike Johnson",
      },
      message_type: "text",
      content: {
        text: "Perfect! Should I bring coffee for everyone?",
      },
      created_at: "2024-01-20T14:30:00Z",
      reactions: [
        { user_id: "user1", emoji: "☕" },
        { user_id: "user2", emoji: "❤️" },
      ],
      edited: { is_edited: false },
    },
    {
      message_id: "msg-4",
      sender: {
        user_id: "user1",
        name: "John Doe",
      },
      message_type: "system",
      content: {
        system: {
          action: "trip_reminder",
          data: {
            message: "Reminder: Trip starts in 30 minutes!",
          },
        },
      },
      created_at: "2024-01-20T16:30:00Z",
      reactions: [],
      edited: { is_edited: false },
    },
  ];

  useEffect(() => {
    navigation.setOptions({ title });
    loadMessages();
  }, [threadId, title]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setMessages(mockMessages);
    } catch (error) {
      console.error("Error loading messages:", error);
      Alert.alert("Error", "Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    setSending(true);

    try {
      // Create optimistic message
      const optimisticMessage = {
        message_id: `temp-${Date.now()}`,
        sender: {
          user_id: user.user_id,
          name: user.name,
        },
        message_type: "text",
        content: {
          text: messageText,
        },
        created_at: new Date().toISOString(),
        reactions: [],
        edited: { is_edited: false },
        sending: true,
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update with real message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.message_id === optimisticMessage.message_id
            ? { ...msg, message_id: `msg-${Date.now()}`, sending: false }
            : msg
        )
      );

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message");
      // Remove failed message
      setMessages((prev) =>
        prev.filter((msg) => msg.message_id !== optimisticMessage.message_id)
      );
    } finally {
      setSending(false);
    }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      // Optimistically update reactions
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.message_id === messageId) {
            const existingReaction = msg.reactions.find(
              (r) => r.user_id === user.user_id && r.emoji === emoji
            );
            if (existingReaction) {
              // Remove reaction
              return {
                ...msg,
                reactions: msg.reactions.filter(
                  (r) => !(r.user_id === user.user_id && r.emoji === emoji)
                ),
              };
            } else {
              // Add reaction
              return {
                ...msg,
                reactions: [...msg.reactions, { user_id: user.user_id, emoji }],
              };
            }
          }
          return msg;
        })
      );

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error("Error updating reaction:", error);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const renderMessage = ({ item, index }) => {
    const isOwnMessage = item.sender.user_id === user.user_id;
    const showSender =
      index === 0 || messages[index - 1].sender.user_id !== item.sender.user_id;

    if (item.message_type === "system") {
      return (
        <View style={styles.systemMessage}>
          <Text style={styles.systemMessageText}>
            {item.content.system.data.message}
          </Text>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage && styles.ownMessageContainer,
        ]}
      >
        {showSender && !isOwnMessage && (
          <Text style={styles.senderName}>{item.sender.name}</Text>
        )}

        <View
          style={[
            styles.messageBubble,
            isOwnMessage && styles.ownMessageBubble,
          ]}
        >
          <Text
            style={[styles.messageText, isOwnMessage && styles.ownMessageText]}
          >
            {item.content.text}
          </Text>

          {item.reactions.length > 0 && (
            <View style={styles.reactionsContainer}>
              {item.reactions
                .reduce((acc, reaction) => {
                  const existing = acc.find((r) => r.emoji === reaction.emoji);
                  if (existing) {
                    existing.count++;
                    existing.users.push(reaction.user_id);
                  } else {
                    acc.push({
                      emoji: reaction.emoji,
                      count: 1,
                      users: [reaction.user_id],
                    });
                  }
                  return acc;
                }, [])
                .map((reaction, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.reactionBubble,
                      reaction.users.includes(user.user_id) &&
                        styles.ownReaction,
                    ]}
                    onPress={() =>
                      handleReaction(item.message_id, reaction.emoji)
                    }
                  >
                    <Text style={styles.reactionText}>
                      {reaction.emoji} {reaction.count}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          )}
        </View>

        <View style={styles.messageFooter}>
          <Text style={styles.timestamp}>
            {formatTimestamp(item.created_at)}
          </Text>
          {item.sending && (
            <Text style={styles.sendingIndicator}>Sending...</Text>
          )}
        </View>

        {/* Quick reactions */}
        <View style={styles.quickReactions}>
          {["👍", "❤️", "😊", "👏"].map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={styles.quickReactionButton}
              onPress={() => handleReaction(item.message_id, emoji)}
            >
              <Text style={styles.quickReactionEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.message_id}
        renderItem={renderMessage}
        style={styles.messagesList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {typing.length > 0 && (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>
            {typing.join(", ")} {typing.length === 1 ? "is" : "are"} typing...
          </Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!newMessage.trim() || sending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || sending}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messageContainer: {
    marginVertical: 4,
    alignItems: "flex-start",
  },
  ownMessageContainer: {
    alignItems: "flex-end",
  },
  senderName: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    marginLeft: 12,
  },
  messageBubble: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: "80%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ownMessageBubble: {
    backgroundColor: "#2196F3",
  },
  messageText: {
    fontSize: 16,
    color: "#333",
    lineHeight: 20,
  },
  ownMessageText: {
    color: "white",
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    paddingHorizontal: 12,
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
  },
  sendingIndicator: {
    fontSize: 12,
    color: "#999",
    marginLeft: 8,
    fontStyle: "italic",
  },
  reactionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  reactionBubble: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 4,
    marginBottom: 4,
  },
  ownReaction: {
    backgroundColor: "#e3f2fd",
  },
  reactionText: {
    fontSize: 12,
    color: "#333",
  },
  quickReactions: {
    flexDirection: "row",
    marginTop: 4,
    opacity: 0.7,
  },
  quickReactionButton: {
    padding: 4,
    marginRight: 8,
  },
  quickReactionEmoji: {
    fontSize: 16,
  },
  systemMessage: {
    alignItems: "center",
    marginVertical: 8,
  },
  systemMessageText: {
    fontSize: 14,
    color: "#666",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    textAlign: "center",
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  typingText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: "#ccc",
  },
  sendButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ChatThreadScreen;
