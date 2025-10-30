const { v4: uuidv4 } = require("uuid");
const ChatMessage = require("../models/ChatMessage");
const ChatThread = require("../models/ChatThread");
const logger = require("../utils/logger");

// Store active user connections
const activeUsers = new Map();

const initializeHandlers = (io, socket) => {
  const { userId, officeId, userName } = socket;

  // Store user connection
  activeUsers.set(userId, {
    socketId: socket.id,
    userId,
    officeId,
    userName,
    connectedAt: new Date(),
    lastActivity: new Date(),
  });

  // Join user to their office room for office-wide broadcasts
  socket.join(`office:${officeId}`);

  // Emit user online status to office
  socket.to(`office:${officeId}`).emit("user_online", {
    user_id: userId,
    name: userName,
    timestamp: new Date(),
  });

  // Handle joining thread rooms
  socket.on("join_thread", async (data) => {
    try {
      const { thread_id } = data;

      // Verify user has access to this thread
      const thread = await ChatThread.findOne({
        thread_id,
        office_id: officeId,
      });

      if (!thread || !thread.isParticipant(userId)) {
        socket.emit("error", {
          event: "join_thread",
          message: "Access denied to thread",
        });
        return;
      }

      // Join the thread room
      socket.join(`thread:${thread_id}`);

      // Update user's last activity
      updateUserActivity(userId);

      // Notify other participants that user joined
      socket.to(`thread:${thread_id}`).emit("user_joined_thread", {
        thread_id,
        user_id: userId,
        name: userName,
        timestamp: new Date(),
      });

      socket.emit("thread_joined", {
        thread_id,
        message: "Successfully joined thread",
      });

      logger.debug("User joined thread", {
        userId,
        threadId: thread_id,
        socketId: socket.id,
      });
    } catch (error) {
      logger.error("Error joining thread:", error);
      socket.emit("error", {
        event: "join_thread",
        message: "Failed to join thread",
      });
    }
  });

  // Handle leaving thread rooms
  socket.on("leave_thread", (data) => {
    try {
      const { thread_id } = data;

      socket.leave(`thread:${thread_id}`);

      // Notify other participants that user left
      socket.to(`thread:${thread_id}`).emit("user_left_thread", {
        thread_id,
        user_id: userId,
        name: userName,
        timestamp: new Date(),
      });

      socket.emit("thread_left", {
        thread_id,
        message: "Successfully left thread",
      });

      logger.debug("User left thread", {
        userId,
        threadId: thread_id,
        socketId: socket.id,
      });
    } catch (error) {
      logger.error("Error leaving thread:", error);
      socket.emit("error", {
        event: "leave_thread",
        message: "Failed to leave thread",
      });
    }
  });

  // Handle real-time message sending
  socket.on("send_message", async (data) => {
    try {
      const {
        thread_id,
        message_type = "text",
        content,
        reply_to,
        mentions,
        client_message_id,
      } = data;

      // Verify user has access to this thread
      const thread = await ChatThread.findOne({
        thread_id,
        office_id: officeId,
      });

      if (!thread || !thread.isParticipant(userId)) {
        socket.emit("error", {
          event: "send_message",
          message: "Access denied to thread",
        });
        return;
      }

      if (thread.status !== "active") {
        socket.emit("error", {
          event: "send_message",
          message: "Cannot send messages to inactive thread",
        });
        return;
      }

      // Create and save message
      const messageId = uuidv4();
      const message = new ChatMessage({
        message_id: messageId,
        thread_id,
        office_id: officeId,
        sender: {
          user_id: userId,
          name: userName,
        },
        message_type,
        content,
        reply_to,
        mentions: mentions || [],
        metadata: {
          client_message_id,
          platform: "websocket",
        },
      });

      await message.save();

      // Update thread's last message timestamp
      thread.last_message_at = new Date();
      await thread.save();

      // Update user activity
      updateUserActivity(userId);

      // Broadcast message to all thread participants
      io.to(`thread:${thread_id}`).emit("new_message", {
        message: message.toObject(),
        thread_id,
      });

      // Send delivery confirmation to sender
      socket.emit("message_sent", {
        client_message_id,
        message_id: messageId,
        timestamp: message.created_at,
      });

      logger.info("Real-time message sent", {
        messageId,
        threadId: thread_id,
        senderId: userId,
        messageType: message_type,
      });
    } catch (error) {
      logger.error("Error sending real-time message:", error);
      socket.emit("error", {
        event: "send_message",
        message: "Failed to send message",
        client_message_id: data.client_message_id,
      });
    }
  });

  // Handle typing indicators
  socket.on("typing_start", (data) => {
    try {
      const { thread_id } = data;
      updateUserActivity(userId);

      socket.to(`thread:${thread_id}`).emit("user_typing", {
        thread_id,
        user_id: userId,
        name: userName,
        timestamp: new Date(),
      });

      logger.debug("User started typing", {
        userId,
        threadId: thread_id,
      });
    } catch (error) {
      logger.error("Error handling typing start:", error);
    }
  });

  socket.on("typing_stop", (data) => {
    try {
      const { thread_id } = data;
      updateUserActivity(userId);

      socket.to(`thread:${thread_id}`).emit("user_stopped_typing", {
        thread_id,
        user_id: userId,
        name: userName,
        timestamp: new Date(),
      });

      logger.debug("User stopped typing", {
        userId,
        threadId: thread_id,
      });
    } catch (error) {
      logger.error("Error handling typing stop:", error);
    }
  });

  // Handle message reactions in real-time
  socket.on("add_reaction", async (data) => {
    try {
      const { message_id, emoji } = data;

      const message = await ChatMessage.findOne({
        message_id,
        office_id: officeId,
      });

      if (!message) {
        socket.emit("error", {
          event: "add_reaction",
          message: "Message not found",
        });
        return;
      }

      // Verify user has access to the thread
      const thread = await ChatThread.findOne({
        thread_id: message.thread_id,
        office_id: officeId,
      });

      if (!thread || !thread.isParticipant(userId)) {
        socket.emit("error", {
          event: "add_reaction",
          message: "Access denied",
        });
        return;
      }

      message.addReaction(userId, emoji);
      await message.save();

      updateUserActivity(userId);

      // Broadcast reaction to thread participants
      io.to(`thread:${message.thread_id}`).emit("reaction_added", {
        message_id,
        user_id: userId,
        name: userName,
        emoji,
        timestamp: new Date(),
      });

      logger.debug("Reaction added via socket", {
        messageId: message_id,
        userId,
        emoji,
      });
    } catch (error) {
      logger.error("Error adding reaction via socket:", error);
      socket.emit("error", {
        event: "add_reaction",
        message: "Failed to add reaction",
      });
    }
  });

  // Handle message read receipts
  socket.on("mark_read", async (data) => {
    try {
      const { thread_id, message_id } = data;

      // Update thread read status
      const thread = await ChatThread.findOne({
        thread_id,
        office_id: officeId,
      });

      if (thread && thread.isParticipant(userId)) {
        thread.updateLastRead(userId);
        await thread.save();

        // If specific message provided, mark it as read too
        if (message_id) {
          const message = await ChatMessage.findOne({
            message_id,
            office_id: officeId,
          });

          if (message) {
            message.markAsRead(userId);
            await message.save();
          }
        }

        updateUserActivity(userId);

        // Notify other participants about read receipt
        socket.to(`thread:${thread_id}`).emit("message_read", {
          thread_id,
          message_id,
          user_id: userId,
          name: userName,
          timestamp: new Date(),
        });

        logger.debug("Messages marked as read via socket", {
          threadId: thread_id,
          messageId: message_id,
          userId,
        });
      }
    } catch (error) {
      logger.error("Error marking messages as read:", error);
    }
  });

  // Handle presence updates
  socket.on("update_presence", (data) => {
    try {
      const { status = "online" } = data;
      updateUserActivity(userId);

      // Update user presence in active users map
      const user = activeUsers.get(userId);
      if (user) {
        user.status = status;
        user.lastActivity = new Date();
      }

      // Broadcast presence update to office
      socket.to(`office:${officeId}`).emit("presence_update", {
        user_id: userId,
        name: userName,
        status,
        timestamp: new Date(),
      });

      logger.debug("User presence updated", {
        userId,
        status,
      });
    } catch (error) {
      logger.error("Error updating presence:", error);
    }
  });

  // Handle disconnect
  socket.on("disconnect", (reason) => {
    try {
      // Remove user from active users
      activeUsers.delete(userId);

      // Notify office that user went offline
      socket.to(`office:${officeId}`).emit("user_offline", {
        user_id: userId,
        name: userName,
        timestamp: new Date(),
        reason,
      });

      logger.info("User disconnected from chat", {
        userId,
        userName,
        socketId: socket.id,
        reason,
        duration: Date.now() - socket.connectedAt,
      });
    } catch (error) {
      logger.error("Error handling disconnect:", error);
    }
  });

  // Handle ping/pong for connection health
  socket.on("ping", () => {
    updateUserActivity(userId);
    socket.emit("pong", { timestamp: new Date() });
  });
};

// Helper function to update user activity
const updateUserActivity = (userId) => {
  const user = activeUsers.get(userId);
  if (user) {
    user.lastActivity = new Date();
  }
};

// Get active users for a specific office
const getActiveUsers = (officeId) => {
  const users = [];
  for (const [userId, userData] of activeUsers.entries()) {
    if (userData.officeId === officeId) {
      users.push({
        user_id: userId,
        name: userData.userName,
        connected_at: userData.connectedAt,
        last_activity: userData.lastActivity,
        status: userData.status || "online",
      });
    }
  }
  return users;
};

// Broadcast system message to thread
const broadcastSystemMessage = async (io, threadId, action, data) => {
  try {
    const thread = await ChatThread.findOne({ thread_id: threadId });
    if (!thread) return;

    const systemMessage = new ChatMessage({
      message_id: uuidv4(),
      thread_id: threadId,
      office_id: thread.office_id,
      sender: {
        user_id: "system",
        name: "System",
      },
      message_type: "system",
      content: {
        system: {
          action,
          data,
        },
      },
    });

    await systemMessage.save();

    // Broadcast to thread participants
    io.to(`thread:${threadId}`).emit("new_message", {
      message: systemMessage.toObject(),
      thread_id: threadId,
    });

    logger.info("System message broadcasted", {
      threadId,
      action,
      messageId: systemMessage.message_id,
    });
  } catch (error) {
    logger.error("Error broadcasting system message:", error);
  }
};

module.exports = {
  initializeHandlers,
  getActiveUsers,
  broadcastSystemMessage,
};
