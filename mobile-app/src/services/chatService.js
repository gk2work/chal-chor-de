import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiService } from "./api";

class ChatService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  async connect() {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        throw new Error("No authentication token found");
      }

      this.socket = io("http://localhost:3006", {
        auth: {
          token: token,
        },
        transports: ["websocket"],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
      });

      this.setupEventListeners();

      return new Promise((resolve, reject) => {
        this.socket.on("connect", () => {
          console.log("Chat service connected");
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on("connect_error", (error) => {
          console.error("Chat connection error:", error);
          this.isConnected = false;
          reject(error);
        });
      });
    } catch (error) {
      console.error("Error connecting to chat service:", error);
      throw error;
    }
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on("disconnect", (reason) => {
      console.log("Chat service disconnected:", reason);
      this.isConnected = false;
      this.emit("disconnected", reason);
    });

    this.socket.on("reconnect", (attemptNumber) => {
      console.log("Chat service reconnected after", attemptNumber, "attempts");
      this.isConnected = true;
      this.emit("reconnected", attemptNumber);
    });

    this.socket.on("reconnect_error", (error) => {
      console.error("Chat reconnection error:", error);
      this.reconnectAttempts++;
      this.emit("reconnect_error", error);
    });

    // Chat-specific events
    this.socket.on("new_message", (data) => {
      this.emit("new_message", data);
    });

    this.socket.on("message_sent", (data) => {
      this.emit("message_sent", data);
    });

    this.socket.on("user_typing", (data) => {
      this.emit("user_typing", data);
    });

    this.socket.on("user_stopped_typing", (data) => {
      this.emit("user_stopped_typing", data);
    });

    this.socket.on("reaction_added", (data) => {
      this.emit("reaction_added", data);
    });

    this.socket.on("message_read", (data) => {
      this.emit("message_read", data);
    });

    this.socket.on("user_online", (data) => {
      this.emit("user_online", data);
    });

    this.socket.on("user_offline", (data) => {
      this.emit("user_offline", data);
    });

    this.socket.on("thread_joined", (data) => {
      this.emit("thread_joined", data);
    });

    this.socket.on("error", (error) => {
      console.error("Chat socket error:", error);
      this.emit("error", error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
    this.listeners.clear();
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error("Error in chat event callback:", error);
        }
      });
    }
  }

  // Thread management
  joinThread(threadId) {
    if (this.socket && this.isConnected) {
      this.socket.emit("join_thread", { thread_id: threadId });
    }
  }

  leaveThread(threadId) {
    if (this.socket && this.isConnected) {
      this.socket.emit("leave_thread", { thread_id: threadId });
    }
  }

  // Messaging
  sendMessage(threadId, messageData) {
    if (this.socket && this.isConnected) {
      this.socket.emit("send_message", {
        thread_id: threadId,
        ...messageData,
      });
    }
  }

  // Typing indicators
  startTyping(threadId) {
    if (this.socket && this.isConnected) {
      this.socket.emit("typing_start", { thread_id: threadId });
    }
  }

  stopTyping(threadId) {
    if (this.socket && this.isConnected) {
      this.socket.emit("typing_stop", { thread_id: threadId });
    }
  }

  // Reactions
  addReaction(messageId, emoji) {
    if (this.socket && this.isConnected) {
      this.socket.emit("add_reaction", {
        message_id: messageId,
        emoji: emoji,
      });
    }
  }

  // Read receipts
  markAsRead(threadId, messageId = null) {
    if (this.socket && this.isConnected) {
      this.socket.emit("mark_read", {
        thread_id: threadId,
        message_id: messageId,
      });
    }
  }

  // Presence
  updatePresence(status = "online") {
    if (this.socket && this.isConnected) {
      this.socket.emit("update_presence", { status });
    }
  }

  // REST API methods
  async getThreads(params = {}) {
    try {
      const response = await apiService.get("/threads", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching threads:", error);
      throw error;
    }
  }

  async getThread(threadId) {
    try {
      const response = await apiService.get(`/threads/${threadId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching thread:", error);
      throw error;
    }
  }

  async getMessages(threadId, params = {}) {
    try {
      const response = await apiService.get(`/chat/${threadId}/messages`, {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching messages:", error);
      throw error;
    }
  }

  async sendMessageHTTP(threadId, messageData) {
    try {
      const response = await apiService.post(
        `/chat/${threadId}/messages`,
        messageData
      );
      return response.data;
    } catch (error) {
      console.error("Error sending message via HTTP:", error);
      throw error;
    }
  }

  async createThread(threadData) {
    try {
      const response = await apiService.post("/threads", threadData);
      return response.data;
    } catch (error) {
      console.error("Error creating thread:", error);
      throw error;
    }
  }

  async addReactionHTTP(messageId, emoji) {
    try {
      const response = await apiService.post(
        `/chat/messages/${messageId}/reactions`,
        { emoji }
      );
      return response.data;
    } catch (error) {
      console.error("Error adding reaction via HTTP:", error);
      throw error;
    }
  }

  async removeReaction(messageId, emoji) {
    try {
      const response = await apiService.delete(
        `/chat/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`
      );
      return response.data;
    } catch (error) {
      console.error("Error removing reaction:", error);
      throw error;
    }
  }

  async searchMessages(threadId, query, limit = 20) {
    try {
      const response = await apiService.post(`/chat/${threadId}/search`, {
        query,
        limit,
      });
      return response.data;
    } catch (error) {
      console.error("Error searching messages:", error);
      throw error;
    }
  }

  async markThreadAsRead(threadId) {
    try {
      const response = await apiService.post(`/threads/${threadId}/read`);
      return response.data;
    } catch (error) {
      console.error("Error marking thread as read:", error);
      throw error;
    }
  }

  // Utility methods
  isSocketConnected() {
    return this.socket && this.isConnected;
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      socketId: this.socket?.id,
    };
  }

  // Auto-create thread for transactions
  async getOrCreateThreadForTransaction(
    transactionType,
    transactionId,
    transactionData
  ) {
    try {
      // First try to find existing thread
      const threads = await this.getThreads({
        transaction_type: transactionType,
        transaction_id: transactionId,
      });

      if (threads.threads && threads.threads.length > 0) {
        return threads.threads[0];
      }

      // Create new thread if none exists
      const threadData = {
        transaction_type: transactionType,
        transaction_id: transactionId,
        title: this.generateThreadTitle(transactionType, transactionData),
        description: this.generateThreadDescription(
          transactionType,
          transactionData
        ),
        participants: this.getRelevantParticipants(
          transactionType,
          transactionData
        ),
        metadata: this.generateThreadMetadata(transactionType, transactionData),
      };

      const newThread = await this.createThread(threadData);
      return newThread.thread;
    } catch (error) {
      console.error("Error getting or creating thread:", error);
      throw error;
    }
  }

  generateThreadTitle(transactionType, data) {
    switch (transactionType) {
      case "carpool":
        return `Carpool: ${data.origin} → ${data.destination}`;
      case "book_sharing":
        return `Book: ${data.title}`;
      case "bike_sharing":
        return `Bike: ${data.model || "Bike Sharing"}`;
      default:
        return "Discussion";
    }
  }

  generateThreadDescription(transactionType, data) {
    switch (transactionType) {
      case "carpool":
        return `Discussion for carpool on ${data.date} at ${data.departure_time}`;
      case "book_sharing":
        return `Discussion about "${data.title}" by ${data.author}`;
      case "bike_sharing":
        return `Discussion about ${data.model} bike sharing`;
      default:
        return "General discussion";
    }
  }

  getRelevantParticipants(transactionType, data) {
    const participants = [];

    switch (transactionType) {
      case "carpool":
        if (data.driver_id && data.driver_name) {
          participants.push({
            user_id: data.driver_id,
            name: data.driver_name,
            role: "owner",
          });
        }
        if (data.riders) {
          data.riders.forEach((rider) => {
            participants.push({
              user_id: rider.user_id,
              name: rider.name,
              role: "participant",
            });
          });
        }
        break;

      case "book_sharing":
        if (data.owner_id && data.owner_name) {
          participants.push({
            user_id: data.owner_id,
            name: data.owner_name,
            role: "owner",
          });
        }
        if (data.borrower_id && data.borrower_name) {
          participants.push({
            user_id: data.borrower_id,
            name: data.borrower_name,
            role: "participant",
          });
        }
        break;

      case "bike_sharing":
        if (data.owner_id && data.owner_name) {
          participants.push({
            user_id: data.owner_id,
            name: data.owner_name,
            role: "owner",
          });
        }
        if (data.borrower_id && data.borrower_name) {
          participants.push({
            user_id: data.borrower_id,
            name: data.borrower_name,
            role: "participant",
          });
        }
        break;
    }

    return participants;
  }

  generateThreadMetadata(transactionType, data) {
    const metadata = {};

    switch (transactionType) {
      case "carpool":
        metadata.carpool = {
          trip_id: data.trip_id,
          origin: data.origin,
          destination: data.destination,
          date: data.date,
          departure_time: data.departure_time,
        };
        break;

      case "book_sharing":
        metadata.book = {
          book_id: data.book_id,
          title: data.title,
          author: data.author,
          isbn: data.isbn,
        };
        break;

      case "bike_sharing":
        metadata.bike = {
          bike_id: data.bike_id,
          model: data.model,
          location: data.location,
        };
        break;
    }

    return metadata;
  }
}

// Create and export singleton instance
export const chatService = new ChatService();
export default chatService;
