const express = require("express");
const { v4: uuidv4 } = require("uuid");
const ChatThread = require("../models/ChatThread");
const ChatMessage = require("../models/ChatMessage");
const { validate, schemas } = require("../middleware/validation");
const logger = require("../utils/logger");

const router = express.Router();

// Get all threads for a user
router.get("/", async (req, res) => {
  try {
    const { status = "active", limit = 20, offset = 0 } = req.query;
    const { user_id, office_id } = req.user;

    const threads = await ChatThread.findByUser(user_id, office_id, status)
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    // Calculate unread counts for each thread
    const threadsWithUnread = await Promise.all(
      threads.map(async (thread) => {
        const participant = thread.participants.find(
          (p) => p.user_id === user_id
        );
        const lastReadAt = participant ? participant.last_read_at : new Date(0);

        const unreadCount = await ChatMessage.getUnreadCount(
          thread.thread_id,
          user_id,
          lastReadAt
        );

        return {
          ...thread,
          unread_count: unreadCount,
        };
      })
    );

    logger.info("Threads retrieved", {
      userId: user_id,
      officeId: office_id,
      count: threads.length,
      status,
    });

    res.json({
      threads: threadsWithUnread,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: threadsWithUnread.length,
      },
    });
  } catch (error) {
    logger.error("Error retrieving threads:", error);
    res.status(500).json({
      error: "Failed to retrieve threads",
      message: error.message,
    });
  }
});

// Get a specific thread
router.get("/:threadId", async (req, res) => {
  try {
    const { threadId } = req.params;
    const { user_id, office_id } = req.user;

    const thread = await ChatThread.findOne({
      thread_id: threadId,
      office_id: office_id,
    }).lean();

    if (!thread) {
      return res.status(404).json({
        error: "Thread not found",
        message: "The requested chat thread does not exist",
      });
    }

    // Check if user is a participant
    if (!thread.participants.some((p) => p.user_id === user_id)) {
      return res.status(403).json({
        error: "Access denied",
        message: "You are not a participant in this thread",
      });
    }

    // Get recent messages
    const messages = await ChatMessage.findByThread(threadId, 50)
      .sort({ created_at: 1 }) // Oldest first for display
      .lean();

    // Calculate unread count
    const participant = thread.participants.find((p) => p.user_id === user_id);
    const lastReadAt = participant ? participant.last_read_at : new Date(0);
    const unreadCount = await ChatMessage.getUnreadCount(
      threadId,
      user_id,
      lastReadAt
    );

    logger.info("Thread retrieved", {
      threadId,
      userId: user_id,
      messageCount: messages.length,
      unreadCount,
    });

    res.json({
      thread: {
        ...thread,
        unread_count: unreadCount,
      },
      messages,
    });
  } catch (error) {
    logger.error("Error retrieving thread:", error);
    res.status(500).json({
      error: "Failed to retrieve thread",
      message: error.message,
    });
  }
});

// Create a new thread
router.post("/", validate(schemas.createThread), async (req, res) => {
  try {
    const {
      transaction_type,
      transaction_id,
      title,
      description,
      participants,
      metadata,
    } = req.body;
    const { user_id, office_id, name } = req.user;

    // Check if thread already exists for this transaction
    const existingThread = await ChatThread.findByTransaction(
      transaction_type,
      transaction_id,
      office_id
    );

    if (existingThread) {
      return res.status(409).json({
        error: "Thread already exists",
        message: "A chat thread already exists for this transaction",
        thread_id: existingThread.thread_id,
      });
    }

    // Ensure creator is in participants list
    const allParticipants = [...participants];
    if (!allParticipants.some((p) => p.user_id === user_id)) {
      allParticipants.push({
        user_id,
        name,
        role: "owner",
      });
    }

    const threadId = uuidv4();
    const thread = new ChatThread({
      thread_id: threadId,
      office_id,
      transaction_type,
      transaction_id,
      title,
      description,
      participants: allParticipants.map((p) => ({
        ...p,
        joined_at: new Date(),
        last_read_at: new Date(),
      })),
      metadata,
      status: "active",
    });

    await thread.save();

    // Create system message for thread creation
    const systemMessage = new ChatMessage({
      message_id: uuidv4(),
      thread_id: threadId,
      office_id,
      sender: {
        user_id: "system",
        name: "System",
      },
      message_type: "system",
      content: {
        system: {
          action: "thread_created",
          data: {
            creator: name,
            title,
            transaction_type,
            participant_count: allParticipants.length,
          },
        },
      },
      metadata: {
        platform: "api",
      },
    });

    await systemMessage.save();

    logger.info("Thread created", {
      threadId,
      transactionType: transaction_type,
      transactionId: transaction_id,
      creatorId: user_id,
      participantCount: allParticipants.length,
    });

    res.status(201).json({
      thread: thread.toObject(),
      message: "Thread created successfully",
    });
  } catch (error) {
    logger.error("Error creating thread:", error);
    res.status(500).json({
      error: "Failed to create thread",
      message: error.message,
    });
  }
});

// Update thread
router.patch("/:threadId", validate(schemas.updateThread), async (req, res) => {
  try {
    const { threadId } = req.params;
    const { user_id, office_id } = req.user;
    const updates = req.body;

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

    // Check if user has permission to update (owner or admin)
    const userRole = thread.getParticipantRole(user_id);
    if (!userRole || (userRole !== "owner" && userRole !== "admin")) {
      return res.status(403).json({
        error: "Access denied",
        message: "You do not have permission to update this thread",
      });
    }

    // Apply updates
    Object.keys(updates).forEach((key) => {
      thread[key] = updates[key];
    });

    await thread.save();

    logger.info("Thread updated", {
      threadId,
      userId: user_id,
      updates: Object.keys(updates),
    });

    res.json({
      thread: thread.toObject(),
      message: "Thread updated successfully",
    });
  } catch (error) {
    logger.error("Error updating thread:", error);
    res.status(500).json({
      error: "Failed to update thread",
      message: error.message,
    });
  }
});

// Add participant to thread
router.post(
  "/:threadId/participants",
  validate(schemas.addParticipant),
  async (req, res) => {
    try {
      const { threadId } = req.params;
      const { user_id: currentUserId, office_id } = req.user;
      const { user_id, name, role } = req.body;

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

      // Check if current user has permission to add participants
      const currentUserRole = thread.getParticipantRole(currentUserId);
      if (
        !currentUserRole ||
        (currentUserRole !== "owner" && currentUserRole !== "admin")
      ) {
        return res.status(403).json({
          error: "Access denied",
          message: "You do not have permission to add participants",
        });
      }

      // Check if user is already a participant
      if (thread.isParticipant(user_id)) {
        return res.status(409).json({
          error: "User already participant",
          message: "User is already a participant in this thread",
        });
      }

      thread.addParticipant(user_id, name, role);
      await thread.save();

      // Create system message
      const systemMessage = new ChatMessage({
        message_id: uuidv4(),
        thread_id: threadId,
        office_id,
        sender: {
          user_id: "system",
          name: "System",
        },
        message_type: "system",
        content: {
          system: {
            action: "participant_added",
            data: {
              added_user: name,
              added_by: req.user.name,
            },
          },
        },
      });

      await systemMessage.save();

      logger.info("Participant added to thread", {
        threadId,
        addedUserId: user_id,
        addedBy: currentUserId,
        role,
      });

      res.json({
        thread: thread.toObject(),
        message: "Participant added successfully",
      });
    } catch (error) {
      logger.error("Error adding participant:", error);
      res.status(500).json({
        error: "Failed to add participant",
        message: error.message,
      });
    }
  }
);

// Remove participant from thread
router.delete("/:threadId/participants/:userId", async (req, res) => {
  try {
    const { threadId, userId } = req.params;
    const { user_id: currentUserId, office_id } = req.user;

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

    // Check permissions (owner/admin can remove others, users can remove themselves)
    const currentUserRole = thread.getParticipantRole(currentUserId);
    const canRemove =
      currentUserId === userId ||
      (currentUserRole &&
        (currentUserRole === "owner" || currentUserRole === "admin"));

    if (!canRemove) {
      return res.status(403).json({
        error: "Access denied",
        message: "You do not have permission to remove this participant",
      });
    }

    const participant = thread.participants.find((p) => p.user_id === userId);
    if (!participant) {
      return res.status(404).json({
        error: "Participant not found",
        message: "User is not a participant in this thread",
      });
    }

    thread.removeParticipant(userId);
    await thread.save();

    // Create system message
    const systemMessage = new ChatMessage({
      message_id: uuidv4(),
      thread_id: threadId,
      office_id,
      sender: {
        user_id: "system",
        name: "System",
      },
      message_type: "system",
      content: {
        system: {
          action: "participant_removed",
          data: {
            removed_user: participant.name,
            removed_by:
              currentUserId === userId ? participant.name : req.user.name,
          },
        },
      },
    });

    await systemMessage.save();

    logger.info("Participant removed from thread", {
      threadId,
      removedUserId: userId,
      removedBy: currentUserId,
    });

    res.json({
      message: "Participant removed successfully",
    });
  } catch (error) {
    logger.error("Error removing participant:", error);
    res.status(500).json({
      error: "Failed to remove participant",
      message: error.message,
    });
  }
});

// Mark thread as read
router.post("/:threadId/read", async (req, res) => {
  try {
    const { threadId } = req.params;
    const { user_id, office_id } = req.user;

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

    thread.updateLastRead(user_id);
    await thread.save();

    logger.debug("Thread marked as read", {
      threadId,
      userId: user_id,
    });

    res.json({
      message: "Thread marked as read",
    });
  } catch (error) {
    logger.error("Error marking thread as read:", error);
    res.status(500).json({
      error: "Failed to mark thread as read",
      message: error.message,
    });
  }
});

module.exports = router;
