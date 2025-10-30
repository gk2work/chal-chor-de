const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { MongoClient, ObjectId } = require("mongodb");
const Joi = require("joi");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
const PORT = process.env.NOTIFICATION_SERVICE_PORT || 3005;

// MongoDB connection
let db;
const mongoClient = new MongoClient(process.env.MONGODB_URI);

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await mongoClient.connect();
    db = mongoClient.db(process.env.MONGODB_DB_NAME || "officeshare_dev");
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

// Mock email transporter for development
const mockEmailTransporter = {
  sendMail: async (mailOptions) => {
    console.log("📧 MOCK EMAIL SENT:");
    console.log(`  To: ${mailOptions.to}`);
    console.log(`  Subject: ${mailOptions.subject}`);
    console.log(`  Body: ${mailOptions.text || mailOptions.html}`);
    console.log("  ─────────────────────────────────");
    return { messageId: `mock-${Date.now()}` };
  },
};

// Notification templates
const notificationTemplates = {
  // Carpooling notifications
  carpool_match_found: {
    title: "Carpool Match Found!",
    body: "A carpool match has been found for your trip on {date} at {time}.",
    email_subject: "OfficeShare: Carpool Match Found",
    email_body:
      "Hi {user_name},\n\nGreat news! We found a carpool match for your trip on {date} at {time}.\n\nTrip Details:\n- From: {origin}\n- To: {destination}\n- Driver: {driver_name}\n- Cost per rider: ${cost}\n\nPlease confirm your participation in the app.\n\nBest regards,\nOfficeShare Team",
  },
  carpool_booking_confirmed: {
    title: "Carpool Booking Confirmed",
    body: "Your carpool booking for {date} at {time} has been confirmed.",
    email_subject: "OfficeShare: Carpool Booking Confirmed",
    email_body:
      "Hi {user_name},\n\nYour carpool booking has been confirmed!\n\nTrip Details:\n- Date: {date}\n- Time: {time}\n- From: {origin}\n- To: {destination}\n- Driver: {driver_name}\n- Your cost: ${cost}\n\nPlease be ready at the pickup location on time.\n\nBest regards,\nOfficeShare Team",
  },
  carpool_cancelled: {
    title: "Carpool Trip Cancelled",
    body: "Your carpool trip on {date} at {time} has been cancelled.",
    email_subject: "OfficeShare: Carpool Trip Cancelled",
    email_body:
      "Hi {user_name},\n\nWe regret to inform you that your carpool trip on {date} at {time} has been cancelled.\n\nReason: {reason}\n\nPlease check the app for alternative options or reschedule your trip.\n\nBest regards,\nOfficeShare Team",
  },
  carpool_reminder: {
    title: "Carpool Reminder",
    body: "Reminder: Your carpool trip is scheduled for {time} today.",
    email_subject: "OfficeShare: Carpool Reminder",
    email_body:
      "Hi {user_name},\n\nThis is a friendly reminder that your carpool trip is scheduled for {time} today.\n\nTrip Details:\n- From: {origin}\n- To: {destination}\n- Driver: {driver_name}\n- Pickup time: {time}\n\nPlease be ready at the pickup location.\n\nBest regards,\nOfficeShare Team",
  },
  // Rating notifications
  rating_received: {
    title: "New Rating Received",
    body: "You received a {rating}-star rating from {rater_name}.",
    email_subject: "OfficeShare: New Rating Received",
    email_body:
      "Hi {user_name},\n\nYou received a {rating}-star rating from {rater_name} for your recent {transaction_type}.\n\nComment: {comment}\n\nYour current reputation score is {reputation_score}.\n\nBest regards,\nOfficeShare Team",
  },
  rating_reminder: {
    title: "Please Rate Your Experience",
    body: "Don't forget to rate your recent {transaction_type} experience.",
    email_subject: "OfficeShare: Please Rate Your Experience",
    email_body:
      "Hi {user_name},\n\nWe hope you had a great {transaction_type} experience! Please take a moment to rate your experience with {other_user_name}.\n\nYour feedback helps maintain the quality of our community.\n\nRate now in the app.\n\nBest regards,\nOfficeShare Team",
  },
};

// Validation schemas
const sendNotificationSchema = Joi.object({
  user_id: Joi.string().required(),
  office_id: Joi.string().required(),
  template_key: Joi.string()
    .valid(...Object.keys(notificationTemplates))
    .required(),
  data: Joi.object().default({}),
  channels: Joi.array()
    .items(Joi.string().valid("push", "email", "in_app"))
    .default(["in_app"]),
  priority: Joi.string()
    .valid("low", "normal", "high", "urgent")
    .default("normal"),
});

const updatePreferencesSchema = Joi.object({
  user_id: Joi.string().required(),
  preferences: Joi.object({
    push_notifications: Joi.boolean(),
    email_notifications: Joi.boolean(),
    in_app_notifications: Joi.boolean(),
    carpool_notifications: Joi.boolean(),
    rating_notifications: Joi.boolean(),
    reminder_notifications: Joi.boolean(),
  }).required(),
});

// Helper function to render template
function renderTemplate(template, data) {
  let rendered = { ...template };

  Object.keys(rendered).forEach((key) => {
    if (typeof rendered[key] === "string") {
      rendered[key] = rendered[key].replace(
        /\{(\w+)\}/g,
        (match, placeholder) => {
          return data[placeholder] || match;
        }
      );
    }
  });

  return rendered;
}

// Helper function to get user preferences
async function getUserPreferences(user_id, office_id) {
  try {
    const preferences = await db
      .collection("notification_preferences")
      .findOne({
        user_id,
        office_id,
      });

    // Default preferences if none exist
    return (
      preferences?.preferences || {
        push_notifications: true,
        email_notifications: true,
        in_app_notifications: true,
        carpool_notifications: true,
        rating_notifications: true,
        reminder_notifications: true,
      }
    );
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    // Return default preferences on error
    return {
      push_notifications: true,
      email_notifications: true,
      in_app_notifications: true,
      carpool_notifications: true,
      rating_notifications: true,
      reminder_notifications: true,
    };
  }
}

// Helper function to get user details
async function getUserDetails(user_id, office_id) {
  try {
    const user = await db.collection("users").findOne({
      _id: new ObjectId(user_id),
      office_id,
    });
    return user;
  } catch (error) {
    console.error("Error fetching user details:", error);
    return null;
  }
}

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "Notification Service",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Send notification
app.post("/api/notifications/send", async (req, res) => {
  try {
    const { error, value } = sendNotificationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { user_id, office_id, template_key, data, channels, priority } =
      value;

    // Get user details and preferences
    const [user, preferences] = await Promise.all([
      getUserDetails(user_id, office_id),
      getUserPreferences(user_id, office_id),
    ]);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get template and render with data
    const template = notificationTemplates[template_key];
    const renderedTemplate = renderTemplate(template, {
      user_name: user.full_name,
      ...data,
    });

    // Create notification record
    const notification = {
      user_id,
      office_id,
      template_key,
      title: renderedTemplate.title,
      body: renderedTemplate.body,
      data,
      channels,
      priority,
      status: "pending",
      delivery_attempts: [],
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Insert notification into database
    const result = await db.collection("notifications").insertOne(notification);
    notification._id = result.insertedId;

    // Process delivery channels
    const deliveryResults = [];

    for (const channel of channels) {
      try {
        let delivered = false;
        let delivery_info = {};

        switch (channel) {
          case "in_app":
            if (preferences.in_app_notifications) {
              // For development, just log to console
              console.log("📱 IN-APP NOTIFICATION:");
              console.log(`  User: ${user.full_name} (${user_id})`);
              console.log(`  Title: ${renderedTemplate.title}`);
              console.log(`  Body: ${renderedTemplate.body}`);
              console.log(`  Priority: ${priority}`);
              console.log("  ─────────────────────────────────");
              delivered = true;
              delivery_info = { method: "console_log" };
            }
            break;

          case "email":
            if (preferences.email_notifications && user.email) {
              const emailResult = await mockEmailTransporter.sendMail({
                to: user.email,
                subject: renderedTemplate.email_subject,
                text: renderedTemplate.email_body,
              });
              delivered = true;
              delivery_info = { messageId: emailResult.messageId };
            }
            break;

          case "push":
            if (preferences.push_notifications) {
              // Mock push notification for development
              console.log("🔔 PUSH NOTIFICATION:");
              console.log(`  User: ${user.full_name} (${user_id})`);
              console.log(`  Title: ${renderedTemplate.title}`);
              console.log(`  Body: ${renderedTemplate.body}`);
              console.log(`  Priority: ${priority}`);
              console.log("  ─────────────────────────────────");
              delivered = true;
              delivery_info = { method: "mock_push" };
            }
            break;
        }

        deliveryResults.push({
          channel,
          delivered,
          delivery_info,
          timestamp: new Date(),
        });
      } catch (channelError) {
        console.error(
          `Error delivering ${channel} notification:`,
          channelError
        );
        deliveryResults.push({
          channel,
          delivered: false,
          error: channelError.message,
          timestamp: new Date(),
        });
      }
    }

    // Update notification with delivery results
    await db.collection("notifications").updateOne(
      { _id: result.insertedId },
      {
        $set: {
          status: deliveryResults.some((r) => r.delivered)
            ? "delivered"
            : "failed",
          delivery_attempts: deliveryResults,
          updated_at: new Date(),
        },
      }
    );

    res.json({
      message: "Notification processed",
      notification_id: result.insertedId.toString(),
      delivery_results: deliveryResults,
    });
  } catch (error) {
    console.error("Send notification error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user notifications
app.get("/api/notifications/user/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;
    const { office_id, limit = 50, offset = 0, unread_only } = req.query;

    if (!office_id) {
      return res
        .status(400)
        .json({ error: "office_id query parameter required" });
    }

    const query = { user_id, office_id };
    if (unread_only === "true") {
      query.read_at = { $exists: false };
    }

    const notifications = await db
      .collection("notifications")
      .find(query)
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .toArray();

    const notificationsResponse = notifications.map((notification) => ({
      notification_id: notification._id.toString(),
      title: notification.title,
      body: notification.body,
      priority: notification.priority,
      status: notification.status,
      read_at: notification.read_at || null,
      created_at: notification.created_at,
    }));

    res.json({ notifications: notificationsResponse });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Mark notification as read
app.put("/api/notifications/:notification_id/read", async (req, res) => {
  try {
    const { notification_id } = req.params;
    const { user_id, office_id } = req.body;

    if (!user_id || !office_id) {
      return res.status(400).json({ error: "user_id and office_id required" });
    }

    const result = await db.collection("notifications").updateOne(
      {
        _id: new ObjectId(notification_id),
        user_id,
        office_id,
      },
      {
        $set: {
          read_at: new Date(),
          updated_at: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user notification preferences
app.get("/api/notifications/preferences/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;
    const { office_id } = req.query;

    if (!office_id) {
      return res
        .status(400)
        .json({ error: "office_id query parameter required" });
    }

    const preferences = await getUserPreferences(user_id, office_id);
    res.json({ preferences });
  } catch (error) {
    console.error("Get preferences error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user notification preferences
app.put("/api/notifications/preferences", async (req, res) => {
  try {
    const { error, value } = updatePreferencesSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { user_id, preferences } = value;
    const { office_id } = req.query;

    if (!office_id) {
      return res
        .status(400)
        .json({ error: "office_id query parameter required" });
    }

    // Upsert preferences
    await db.collection("notification_preferences").updateOne(
      { user_id, office_id },
      {
        $set: {
          user_id,
          office_id,
          preferences,
          updated_at: new Date(),
        },
        $setOnInsert: {
          created_at: new Date(),
        },
      },
      { upsert: true }
    );

    res.json({
      message: "Notification preferences updated successfully",
      preferences,
    });
  } catch (error) {
    console.error("Update preferences error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get notification statistics (for admin dashboard)
app.get("/api/notifications/stats", async (req, res) => {
  try {
    const { office_id, start_date, end_date } = req.query;

    if (!office_id) {
      return res
        .status(400)
        .json({ error: "office_id query parameter required" });
    }

    const dateFilter = {};
    if (start_date) dateFilter.$gte = new Date(start_date);
    if (end_date) dateFilter.$lte = new Date(end_date);

    const matchStage = { office_id };
    if (Object.keys(dateFilter).length > 0) {
      matchStage.created_at = dateFilter;
    }

    const stats = await db
      .collection("notifications")
      .aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            total_notifications: { $sum: 1 },
            delivered_notifications: {
              $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
            },
            failed_notifications: {
              $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
            },
            by_template: {
              $push: "$template_key",
            },
            by_priority: {
              $push: "$priority",
            },
          },
        },
      ])
      .toArray();

    const result = stats[0] || {
      total_notifications: 0,
      delivered_notifications: 0,
      failed_notifications: 0,
      by_template: [],
      by_priority: [],
    };

    // Count by template
    const templateCounts = {};
    result.by_template.forEach((template) => {
      templateCounts[template] = (templateCounts[template] || 0) + 1;
    });

    // Count by priority
    const priorityCounts = {};
    result.by_priority.forEach((priority) => {
      priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
    });

    res.json({
      total_notifications: result.total_notifications,
      delivered_notifications: result.delivered_notifications,
      failed_notifications: result.failed_notifications,
      delivery_rate:
        result.total_notifications > 0
          ? (
              (result.delivered_notifications / result.total_notifications) *
              100
            ).toFixed(2) + "%"
          : "0%",
      by_template: templateCounts,
      by_priority: priorityCounts,
    });
  } catch (error) {
    console.error("Get notification stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Notification Service Error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    message: `The requested route ${req.originalUrl} was not found`,
  });
});

// Start server
async function startServer() {
  await connectToDatabase();

  app.listen(PORT, () => {
    console.log(`🚀 Notification Service running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(
      `🗄️ Database: ${process.env.MONGODB_DB_NAME || "officeshare_dev"}`
    );
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  });
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  await mongoClient.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  await mongoClient.close();
  process.exit(0);
});

startServer().catch(console.error);
