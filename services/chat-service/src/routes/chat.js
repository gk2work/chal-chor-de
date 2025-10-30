const express = require("express");
const { v4: uuidv4 } = require("uuid");
const ChatMessage = require("../models/ChatMessage");
const ChatThread = require("../models/ChatThread");
const { validate, schemas } = require("../middleware/validation");
const logger = require("../utils/logger");

const router = express.Router();

// Get messages for a thread
router.get("/:threadId/messages", async (req, res) => {
  try {
    const { threadId } = req.params;
    const { limit = 50, before, after } = req.query;
    const { user_id, office_id } = req.user;

    // Verify user has access to this thread
    const thread = await ChatThread.findOne({
      thread_id: threadId,
      office_id: office_id,
    });

    if (!thread) {
      return res.status(404).json({
        error: "Thread not found",
        message: "The requested chat thread does not exist",
      });
    }

    if (!thread.isParticipant(user_id)) {
      return res.status(403).json({
        error: "Access denied",
        message: "You are not a participant in this thread",
      });
    }

    // Build query
    const query = { thread_id: threadId };

    if (before) {
      query.created_at = { $lt: new Date(before) };
    } else if (after) {
      query.created_at = { $gt: new Date(after) };
    }

    const messages = await ChatMessage.find(query)
      .sort({ created_at: before ? -1 : 1 })
      .limit(parseInt(limit))
      .lean();

    // If we queried before a timestamp, reverse to get chronological order
    if (before) {
      messages.reverse();
    }

    logger.debug("Messages retrieved", {
      threadId,
      userId: user_id,
      count: messages.length,
      before,
      after,
    });

    res.json({
      messages,
      pagination: {
        limit: parseInt(limit),
        before,
        after,
        has_more: messages.length === parseInt(limit),
      },
    });
  } catch (error) {
    logger.error("Error retrieving messages:", error);
    res.status(500).json({
      error: "Failed to retrieve messages",
      message: error.message,
    });
  }
});

// Send a message
router.post(
  "/:threadId/messages",
  validate(schemas.sendMessage),
  async (req, res) => {
    try {
      const { threadId } = req.params;
      const { user_id, office_id, name } = req.user;
      const { message_type, content, reply_to, mentions, client_message_id } =
        req.body;

      // Verify user has access to this thread
      const thread = await ChatThread.findOne({
        thread_id: threadId,
        office_id: office_id,
      });

      if (!thread) {
        return res.status(404).json({
          error: "Thread not found",
          message: "The requested chat thread does not exist",
        });
      }

      if (!thread.isParticipant(user_id)) {
        return res.status(403).json({
          error: "Access denied",
          message: "You are not a participant in this thread",
        });
      }

      // Check if thread is active
      if (thread.status !== "active") {
        return res.status(403).json({
          error: "Thread not active",
          message: "Cannot send messages to an inactive thread",
        });
      }

      const messageId = uuidv4();
      const message = new ChatMessage({
        message_id: messageId,
        thread_id: threadId,
        office_id,
        sender: {
          user_id,
          name,
        },
        message_type,
        content,
        reply_to,
        mentions: mentions || [],
        metadata: {
          client_message_id,
          platform: req.headers["user-agent"]?.includes("Mobile")
            ? "mobile"
            : "web",
          ip_address: req.ip,
          user_agent: req.headers["user-agent"],
        },
      });

      await message.save();

      // Update thread's last message timestamp
      thread.last_message_at = new Date();
      await thread.save();

      logger.info("Message sent", {
        messageId,
        threadId,
        senderId: user_id,
        messageType: message_type,
        hasReply: !!reply_to,
        mentionCount: mentions?.length || 0,
      });

      res.status(201).json({
        message: message.toObject(),
        status: "Message sent successfully",
      });
    } catch (error) {
      logger.error("Error sending message:", error);
      res.status(500).json({
        error: "Failed to send message",
        message: error.message,
      });
    }
  }
);

// Edit a message
router.patch(
  "/messages/:messageId",
  validate(schemas.editMessage),
  async (req, res) => {
    try {
      const { messageId } = req.params;
      const { user_id, office_id } = req.user;
      const { content } = req.body;

      const message = await ChatMessage.findOne({
        message_id: messageId,
        office_id: office_id,
      });

      if (!message) {
        return res.status(404).json({
          error: "Message not found",
          message: "The requested message does not exist",
        });
      }

      // Only sender can edit their own messages
      if (message.sender.user_id !== user_id) {
        return res.status(403).json({
          error: "Access denied",
          message: "You can only edit your own messages",
        });
      }

      // Only text messages can be edited
      if (message.message_type !== "text") {
        return res.status(400).json({
          error: "Cannot edit message",
          message: "Only text messages can be edited",
        });
      }

      // Check if message is too old to edit (24 hours)
      const hoursSinceCreated =
        (new Date() - message.created_at) / (1000 * 60 * 60);
      if (hoursSinceCreated > 24) {
        return res.status(400).json({
          error: "Cannot edit message",
          message: "Messages can only be edited within 24 hours",
        });
      }

      message.editMessage(content);
      await message.save();

      logger.info("Message edited", {
        messageId,
        userId: user_id,
        threadId: message.thread_id,
      });

      res.json({
        message: message.toObject(),
        status: "Message edited successfully",
      });
    } catch (error) {
      logger.error("Error editing message:", error);
      res.status(500).json({
        error: "Failed to edit message",
        message: error.message,
      });
    }
  }
);

// Delete a message
router.delete("/messages/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params;
    const { user_id, office_id, role } = req.user;

    const message = await ChatMessage.findOne({
      message_id: messageId,
      office_id: office_id,
    });

    if (!message) {
      return res.status(404).json({
        error: "Message not found",
        message: "The requested message does not exist",
      });
    }

    // Only sender or admin can delete messages
    const canDelete = message.sender.user_id === user_id || role === "admin";
    if (!canDelete) {
      return res.status(403).json({
        error: "Access denied",
        message: "You can only delete your own messages",
      });
    }

    await ChatMessage.deleteOne({ message_id: messageId });

    logger.info("Message deleted", {
      messageId,
      deletedBy: user_id,
      originalSender: message.sender.user_id,
      threadId: message.thread_id,
    });

    res.json({
      message: "Message deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting message:", error);
    res.status(500).json({
      error: "Failed to delete message",
      message: error.message,
    });
  }
});

// Add reaction to message
router.post(
  "/messages/:messageId/reactions",
  validate(schemas.addReaction),
  async (req, res) => {
    try {
      const { messageId } = req.params;
      const { user_id, office_id } = req.user;
      const { emoji } = req.body;

      const message = await ChatMessage.findOne({
        message_id: messageId,
        office_id: office_id,
      });

      if (!message) {
        return res.status(404).json({
          error: "Message not found",
          message: "The requested message does not exist",
        });
      }

      // Verify user has access to the thread
      const thread = await ChatThread.findOne({
        thread_id: message.thread_id,
        office_id: office_id,
      });

      if (!thread || !thread.isParticipant(user_id)) {
        return res.status(403).json({
          error: "Access denied",
          message: "You are not a participant in this thread",
        });
      }

      message.addReaction(user_id, emoji);
      await message.save();

      logger.debug("Reaction added", {
        messageId,
        userId: user_id,
        emoji,
        threadId: message.thread_id,
      });

      res.json({
        message: message.toObject(),
        status: "Reaction added successfully",
      });
    } catch (error) {
      logger.error("Error adding reaction:", error);
      res.status(500).json({
        error: "Failed to add reaction",
        message: error.message,
      });
    }
  }
);

// Remove reaction from message
router.delete("/messages/:messageId/reactions/:emoji", async (req, res) => {
  try {
    const { messageId, emoji } = req.params;
    const { user_id, office_id } = req.user;

    const message = await ChatMessage.findOne({
      message_id: messageId,
      office_id: office_id,
    });

    if (!message) {
      return res.status(404).json({
        error: "Message not found",
        message: "The requested message does not exist",
      });
    }

    message.removeReaction(user_id, decodeURIComponent(emoji));
    await message.save();

    logger.debug("Reaction removed", {
      messageId,
      userId: user_id,
      emoji: decodeURIComponent(emoji),
      threadId: message.thread_id,
    });

    res.json({
      message: message.toObject(),
      status: "Reaction removed successfully",
    });
  } catch (error) {
    logger.error("Error removing reaction:", error);
    res.status(500).json({
      error: "Failed to remove reaction",
      message: error.message,
    });
  }
});

// Search messages in a thread
router.post(
  "/:threadId/search",
  validate(schemas.searchMessages),
  async (req, res) => {
    try {
      const { threadId } = req.params;
      const { user_id, office_id } = req.user;
      const { query, limit } = req.body;

      // Verify user has access to this thread
      const thread = await ChatThread.findOne({
        thread_id: threadId,
        office_id: office_id,
      });

      if (!thread) {
        return res.status(404).json({
          error: "Thread not found",
          message: "The requested chat thread does not exist",
        });
      }

      if (!thread.isParticipant(user_id)) {
        return res.status(403).json({
          error: "Access denied",
          message: "You are not a participant in this thread",
        });
      }

      const messages = await ChatMessage.searchMessages(threadId, query, limit);

      logger.info("Message search performed", {
        threadId,
        userId: user_id,
        query,
        resultCount: messages.length,
      });

      res.json({
        messages,
        query,
        total_results: messages.length,
      });
    } catch (error) {
      logger.error("Error searching messages:", error);
      res.status(500).json({
        error: "Failed to search messages",
        message: error.message,
      });
    }
  }
);

// Mark messages as read
router.post("/messages/:messageId/read", async (req, res) => {
  try {
    const { messageId } = req.params;
    const { user_id, office_id } = req.user;

    const message = await ChatMessage.findOne({
      message_id: messageId,
      office_id: office_id,
    });

    if (!message) {
      return res.status(404).json({
        error: "Message not found",
        message: "The requested message does not exist",
      });
    }

    // Verify user has access to the thread
    const thread = await ChatThread.findOne({
      thread_id: message.thread_id,
      office_id: office_id,
    });

    if (!thread || !thread.isParticipant(user_id)) {
      return res.status(403).json({
        error: "Access denied",
        message: "You are not a participant in this thread",
      });
    }

    message.markAsRead(user_id);
    await message.save();

    // Also update thread's last read timestamp
    thread.updateLastRead(user_id);
    await thread.save();

    logger.debug("Message marked as read", {
      messageId,
      userId: user_id,
      threadId: message.thread_id,
    });

    res.json({
      message: "Message marked as read",
    });
  } catch (error) {
    logger.error("Error marking message as read:", error);
    res.status(500).json({
      error: "Failed to mark message as read",
      message: error.message,
    });
  }
});

module.exports = router;
