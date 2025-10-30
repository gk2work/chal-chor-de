const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    message_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    thread_id: {
      type: String,
      required: true,
      index: true,
    },
    office_id: {
      type: String,
      required: true,
      index: true,
    },
    sender: {
      user_id: {
        type: String,
        required: true,
        index: true,
      },
      name: {
        type: String,
        required: true,
      },
      avatar_url: {
        type: String,
      },
    },
    message_type: {
      type: String,
      enum: ["text", "image", "file", "system", "location"],
      default: "text",
      index: true,
    },
    content: {
      text: {
        type: String,
        maxlength: 2000,
      },
      file: {
        url: String,
        filename: String,
        size: Number,
        mime_type: String,
      },
      location: {
        latitude: Number,
        longitude: Number,
        address: String,
      },
      system: {
        action: String,
        data: mongoose.Schema.Types.Mixed,
      },
    },
    reply_to: {
      message_id: String,
      preview: String,
    },
    reactions: [
      {
        user_id: {
          type: String,
          required: true,
        },
        emoji: {
          type: String,
          required: true,
        },
        created_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    mentions: [
      {
        user_id: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        start_index: Number,
        end_index: Number,
      },
    ],
    edited: {
      is_edited: {
        type: Boolean,
        default: false,
      },
      edited_at: Date,
      original_content: String,
    },
    delivery_status: {
      sent_at: {
        type: Date,
        default: Date.now,
      },
      delivered_to: [
        {
          user_id: String,
          delivered_at: Date,
        },
      ],
      read_by: [
        {
          user_id: String,
          read_at: Date,
        },
      ],
    },
    metadata: {
      client_message_id: String,
      platform: {
        type: String,
        enum: ["web", "mobile", "api"],
        default: "web",
      },
      ip_address: String,
      user_agent: String,
    },
    created_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Compound indexes for efficient queries
chatMessageSchema.index({ thread_id: 1, created_at: -1 });
chatMessageSchema.index({ office_id: 1, created_at: -1 });
chatMessageSchema.index({ "sender.user_id": 1, created_at: -1 });
chatMessageSchema.index({ thread_id: 1, message_type: 1 });

// Text index for message search
chatMessageSchema.index({
  "content.text": "text",
  "sender.name": "text",
});

// Methods
chatMessageSchema.methods.addReaction = function (userId, emoji) {
  // Remove existing reaction from this user for this emoji
  this.reactions = this.reactions.filter(
    (r) => !(r.user_id === userId && r.emoji === emoji)
  );

  // Add new reaction
  this.reactions.push({
    user_id: userId,
    emoji: emoji,
    created_at: new Date(),
  });

  return this;
};

chatMessageSchema.methods.removeReaction = function (userId, emoji) {
  this.reactions = this.reactions.filter(
    (r) => !(r.user_id === userId && r.emoji === emoji)
  );
  return this;
};

chatMessageSchema.methods.markAsRead = function (userId) {
  const existingRead = this.delivery_status.read_by.find(
    (r) => r.user_id === userId
  );
  if (!existingRead) {
    this.delivery_status.read_by.push({
      user_id: userId,
      read_at: new Date(),
    });
  }
  return this;
};

chatMessageSchema.methods.markAsDelivered = function (userId) {
  const existingDelivery = this.delivery_status.delivered_to.find(
    (d) => d.user_id === userId
  );
  if (!existingDelivery) {
    this.delivery_status.delivered_to.push({
      user_id: userId,
      delivered_at: new Date(),
    });
  }
  return this;
};

chatMessageSchema.methods.editMessage = function (newContent) {
  this.edited.original_content = this.content.text;
  this.edited.is_edited = true;
  this.edited.edited_at = new Date();
  this.content.text = newContent;
  return this;
};

// Static methods
chatMessageSchema.statics.findByThread = function (
  threadId,
  limit = 50,
  before = null
) {
  const query = { thread_id: threadId };

  if (before) {
    query.created_at = { $lt: new Date(before) };
  }

  return this.find(query).sort({ created_at: -1 }).limit(limit);
};

chatMessageSchema.statics.searchMessages = function (
  threadId,
  searchTerm,
  limit = 20
) {
  return this.find({
    thread_id: threadId,
    $text: { $search: searchTerm },
  })
    .sort({ score: { $meta: "textScore" }, created_at: -1 })
    .limit(limit);
};

chatMessageSchema.statics.getUnreadCount = function (
  threadId,
  userId,
  lastReadAt
) {
  return this.countDocuments({
    thread_id: threadId,
    "sender.user_id": { $ne: userId },
    created_at: { $gt: lastReadAt },
  });
};

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
