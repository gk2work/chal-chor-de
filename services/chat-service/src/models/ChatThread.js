const mongoose = require("mongoose");

const chatThreadSchema = new mongoose.Schema(
  {
    thread_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    office_id: {
      type: String,
      required: true,
      index: true,
    },
    transaction_type: {
      type: String,
      required: true,
      enum: ["carpool", "book_sharing", "bike_sharing", "general"],
      index: true,
    },
    transaction_id: {
      type: String,
      required: true,
      index: true,
    },
    participants: [
      {
        user_id: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        role: {
          type: String,
          enum: ["owner", "participant", "admin"],
          default: "participant",
        },
        joined_at: {
          type: Date,
          default: Date.now,
        },
        last_read_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    status: {
      type: String,
      enum: ["active", "archived", "closed"],
      default: "active",
      index: true,
    },
    metadata: {
      carpool: {
        trip_id: String,
        origin: String,
        destination: String,
        date: Date,
      },
      book: {
        book_id: String,
        title: String,
        author: String,
        isbn: String,
      },
      bike: {
        bike_id: String,
        model: String,
        location: String,
      },
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
    last_message_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Compound indexes for efficient queries
chatThreadSchema.index({ office_id: 1, transaction_type: 1 });
chatThreadSchema.index({ office_id: 1, status: 1, last_message_at: -1 });
chatThreadSchema.index({ "participants.user_id": 1, status: 1 });

// Virtual for message count (populated separately)
chatThreadSchema.virtual("message_count", {
  ref: "ChatMessage",
  localField: "thread_id",
  foreignField: "thread_id",
  count: true,
});

// Virtual for unread count per user (calculated in application logic)
chatThreadSchema.virtual("unread_count");

// Methods
chatThreadSchema.methods.addParticipant = function (
  userId,
  name,
  role = "participant"
) {
  const existingParticipant = this.participants.find(
    (p) => p.user_id === userId
  );
  if (!existingParticipant) {
    this.participants.push({
      user_id: userId,
      name: name,
      role: role,
      joined_at: new Date(),
      last_read_at: new Date(),
    });
  }
  return this;
};

chatThreadSchema.methods.removeParticipant = function (userId) {
  this.participants = this.participants.filter((p) => p.user_id !== userId);
  return this;
};

chatThreadSchema.methods.updateLastRead = function (userId) {
  const participant = this.participants.find((p) => p.user_id === userId);
  if (participant) {
    participant.last_read_at = new Date();
  }
  return this;
};

chatThreadSchema.methods.isParticipant = function (userId) {
  return this.participants.some((p) => p.user_id === userId);
};

chatThreadSchema.methods.getParticipantRole = function (userId) {
  const participant = this.participants.find((p) => p.user_id === userId);
  return participant ? participant.role : null;
};

// Static methods
chatThreadSchema.statics.findByTransaction = function (
  transactionType,
  transactionId,
  officeId
) {
  return this.findOne({
    transaction_type: transactionType,
    transaction_id: transactionId,
    office_id: officeId,
  });
};

chatThreadSchema.statics.findByUser = function (
  userId,
  officeId,
  status = "active"
) {
  return this.find({
    "participants.user_id": userId,
    office_id: officeId,
    status: status,
  }).sort({ last_message_at: -1 });
};

module.exports = mongoose.model("ChatThread", chatThreadSchema);
