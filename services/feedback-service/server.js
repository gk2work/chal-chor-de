const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const jwt = require("jsonwebtoken");
const { MongoClient, ObjectId } = require("mongodb");
const Joi = require("joi");
require("dotenv").config();

const app = express();
const PORT = process.env.FEEDBACK_SERVICE_PORT || 3009;

// MongoDB connection
let db;
let mongoClient;

// Initialize MongoDB client
function initializeMongoClient() {
  if (!mongoClient) {
    mongoClient = new MongoClient(process.env.MONGODB_URI);
  }
  return mongoClient;
}

// Connect to MongoDB
async function connectToDatabase() {
  try {
    mongoClient = initializeMongoClient();
    await mongoClient.connect();
    db = mongoClient.db(process.env.MONGODB_DB_NAME || "officeshare_dev");
    console.log("✅ Connected to MongoDB");

    // Create indexes
    await db
      .collection("user_feedback")
      .createIndex({ user_id: 1, office_id: 1 });
    await db.collection("ab_tests").createIndex({ test_id: 1, office_id: 1 });
    await db
      .collection("user_behavior")
      .createIndex({ user_id: 1, office_id: 1, timestamp: -1 });
    await db
      .collection("ux_metrics")
      .createIndex({ office_id: 1, metric_type: 1, timestamp: -1 });
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    if (require.main === module) {
      process.exit(1);
    }
  }
}

// Set database (for testing)
function setDatabase(database) {
  db = database;
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET || "officeshare-dev-secret-key-2024",
    (err, user) => {
      if (err) {
        return res.status(403).json({ error: "Invalid or expired token" });
      }
      req.user = user;
      next();
    }
  );
};

// Validation schemas
const feedbackSchema = Joi.object({
  category: Joi.string()
    .valid("bug", "feature_request", "improvement", "general", "ux_issue")
    .required(),
  rating: Joi.number().min(1).max(5),
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().min(10).max(2000).required(),
  module: Joi.string().valid(
    "carpooling",
    "bike_sharing",
    "book_sharing",
    "chat",
    "general"
  ),
  metadata: Joi.object(),
});

const behaviorEventSchema = Joi.object({
  event_type: Joi.string().required(),
  module: Joi.string().required(),
  screen: Joi.string(),
  action: Joi.string().required(),
  metadata: Joi.object(),
  duration_ms: Joi.number(),
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "Feedback Service",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Submit user feedback
app.post("/api/feedback", authenticateToken, async (req, res) => {
  try {
    const { error, value } = feedbackSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const feedback = {
      ...value,
      user_id: req.user.user_id,
      office_id: req.user.office_id,
      status: "new",
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await db.collection("user_feedback").insertOne(feedback);

    res.status(201).json({
      message: "Feedback submitted successfully",
      feedback_id: result.insertedId.toString(),
    });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user's feedback history
app.get("/api/feedback/user/:user_id", authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.params;
    const { limit = 20, skip = 0 } = req.query;

    // Ensure user can only access their own feedback
    if (req.user.user_id !== user_id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const feedbackList = await db
      .collection("user_feedback")
      .find({ user_id, office_id: req.user.office_id })
      .sort({ created_at: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .toArray();

    const total = await db
      .collection("user_feedback")
      .countDocuments({ user_id, office_id: req.user.office_id });

    res.json({
      feedback: feedbackList.map((f) => ({
        feedback_id: f._id.toString(),
        category: f.category,
        rating: f.rating,
        title: f.title,
        description: f.description,
        module: f.module,
        status: f.status,
        created_at: f.created_at,
      })),
      total,
      limit: parseInt(limit),
      skip: parseInt(skip),
    });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all feedback for office (admin only)
app.get(
  "/api/feedback/office/:office_id",
  authenticateToken,
  async (req, res) => {
    try {
      const { office_id } = req.params;
      const { category, status, limit = 50, skip = 0 } = req.query;

      // Ensure user can only access their own office data
      if (req.user.office_id !== office_id) {
        return res
          .status(403)
          .json({ error: "Access denied to this office data" });
      }

      const query = { office_id };
      if (category) query.category = category;
      if (status) query.status = status;

      const feedbackList = await db
        .collection("user_feedback")
        .find(query)
        .sort({ created_at: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .toArray();

      const total = await db.collection("user_feedback").countDocuments(query);

      res.json({
        feedback: feedbackList,
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
      });
    } catch (error) {
      console.error("Error fetching office feedback:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Track user behavior event
app.post("/api/analytics/behavior", authenticateToken, async (req, res) => {
  try {
    const { error, value } = behaviorEventSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const behaviorEvent = {
      ...value,
      user_id: req.user.user_id,
      office_id: req.user.office_id,
      timestamp: new Date(),
    };

    await db.collection("user_behavior").insertOne(behaviorEvent);

    res.status(201).json({
      message: "Behavior event tracked successfully",
    });
  } catch (error) {
    console.error("Error tracking behavior:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user behavior analytics
app.get(
  "/api/analytics/behavior/user/:user_id",
  authenticateToken,
  async (req, res) => {
    try {
      const { user_id } = req.params;
      const { days = 30 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const events = await db
        .collection("user_behavior")
        .find({
          user_id,
          office_id: req.user.office_id,
          timestamp: { $gte: startDate },
        })
        .sort({ timestamp: -1 })
        .toArray();

      // Aggregate by module and event type
      const moduleStats = {};
      const eventTypeStats = {};

      events.forEach((event) => {
        // Module stats
        if (!moduleStats[event.module]) {
          moduleStats[event.module] = { count: 0, events: [] };
        }
        moduleStats[event.module].count++;
        moduleStats[event.module].events.push(event.event_type);

        // Event type stats
        if (!eventTypeStats[event.event_type]) {
          eventTypeStats[event.event_type] = 0;
        }
        eventTypeStats[event.event_type]++;
      });

      res.json({
        user_id,
        period_days: parseInt(days),
        total_events: events.length,
        module_stats: moduleStats,
        event_type_stats: eventTypeStats,
        recent_events: events.slice(0, 20),
      });
    } catch (error) {
      console.error("Error fetching behavior analytics:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Create A/B test
app.post("/api/ab-tests", authenticateToken, async (req, res) => {
  try {
    const { test_name, description, variants, module, target_metric } =
      req.body;

    if (!test_name || !variants || variants.length < 2) {
      return res.status(400).json({ error: "Invalid A/B test configuration" });
    }

    const abTest = {
      test_id: `test_${Date.now()}`,
      test_name,
      description,
      variants: variants.map((v) => ({
        variant_id: v.variant_id,
        name: v.name,
        description: v.description,
        config: v.config || {},
        allocation_percentage: v.allocation_percentage || 100 / variants.length,
      })),
      module,
      target_metric,
      office_id: req.user.office_id,
      status: "active",
      created_at: new Date(),
      started_at: new Date(),
    };

    await db.collection("ab_tests").insertOne(abTest);

    res.status(201).json({
      message: "A/B test created successfully",
      test_id: abTest.test_id,
    });
  } catch (error) {
    console.error("Error creating A/B test:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user's A/B test variant
app.get(
  "/api/ab-tests/:test_id/variant",
  authenticateToken,
  async (req, res) => {
    try {
      const { test_id } = req.params;

      const test = await db.collection("ab_tests").findOne({
        test_id,
        office_id: req.user.office_id,
        status: "active",
      });

      if (!test) {
        return res.status(404).json({ error: "A/B test not found" });
      }

      // Check if user already has a variant assignment
      let assignment = await db.collection("ab_test_assignments").findOne({
        test_id,
        user_id: req.user.user_id,
      });

      if (!assignment) {
        // Assign variant based on allocation percentages
        const random = Math.random() * 100;
        let cumulative = 0;
        let selectedVariant = test.variants[0];

        for (const variant of test.variants) {
          cumulative += variant.allocation_percentage;
          if (random <= cumulative) {
            selectedVariant = variant;
            break;
          }
        }

        assignment = {
          test_id,
          user_id: req.user.user_id,
          office_id: req.user.office_id,
          variant_id: selectedVariant.variant_id,
          assigned_at: new Date(),
        };

        await db.collection("ab_test_assignments").insertOne(assignment);
      }

      const variant = test.variants.find(
        (v) => v.variant_id === assignment.variant_id
      );

      res.json({
        test_id,
        variant_id: assignment.variant_id,
        variant_name: variant.name,
        config: variant.config,
      });
    } catch (error) {
      console.error("Error getting A/B test variant:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Track A/B test conversion
app.post(
  "/api/ab-tests/:test_id/conversion",
  authenticateToken,
  async (req, res) => {
    try {
      const { test_id } = req.params;
      const { metric_value, metadata } = req.body;

      const assignment = await db.collection("ab_test_assignments").findOne({
        test_id,
        user_id: req.user.user_id,
      });

      if (!assignment) {
        return res.status(404).json({ error: "No variant assignment found" });
      }

      const conversion = {
        test_id,
        user_id: req.user.user_id,
        office_id: req.user.office_id,
        variant_id: assignment.variant_id,
        metric_value,
        metadata,
        timestamp: new Date(),
      };

      await db.collection("ab_test_conversions").insertOne(conversion);

      res.json({
        message: "Conversion tracked successfully",
      });
    } catch (error) {
      console.error("Error tracking conversion:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Get A/B test results
app.get(
  "/api/ab-tests/:test_id/results",
  authenticateToken,
  async (req, res) => {
    try {
      const { test_id } = req.params;

      const test = await db.collection("ab_tests").findOne({
        test_id,
        office_id: req.user.office_id,
      });

      if (!test) {
        return res.status(404).json({ error: "A/B test not found" });
      }

      const results = {};

      for (const variant of test.variants) {
        const assignments = await db
          .collection("ab_test_assignments")
          .countDocuments({
            test_id,
            variant_id: variant.variant_id,
          });

        const conversions = await db
          .collection("ab_test_conversions")
          .find({
            test_id,
            variant_id: variant.variant_id,
          })
          .toArray();

        const totalConversions = conversions.length;
        const avgMetricValue =
          conversions.length > 0
            ? conversions.reduce((sum, c) => sum + (c.metric_value || 0), 0) /
              conversions.length
            : 0;

        results[variant.variant_id] = {
          variant_name: variant.name,
          assignments,
          conversions: totalConversions,
          conversion_rate:
            assignments > 0 ? (totalConversions / assignments) * 100 : 0,
          avg_metric_value: avgMetricValue,
        };
      }

      res.json({
        test_id,
        test_name: test.test_name,
        status: test.status,
        started_at: test.started_at,
        results,
      });
    } catch (error) {
      console.error("Error fetching A/B test results:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Track UX metric
app.post("/api/analytics/ux-metrics", authenticateToken, async (req, res) => {
  try {
    const { metric_type, value, screen, module, metadata } = req.body;

    if (!metric_type || value === undefined) {
      return res
        .status(400)
        .json({ error: "metric_type and value are required" });
    }

    const metric = {
      metric_type,
      value,
      screen,
      module,
      metadata,
      user_id: req.user.user_id,
      office_id: req.user.office_id,
      timestamp: new Date(),
    };

    await db.collection("ux_metrics").insertOne(metric);

    res.status(201).json({
      message: "UX metric tracked successfully",
    });
  } catch (error) {
    console.error("Error tracking UX metric:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get UX metrics summary
app.get(
  "/api/analytics/ux-metrics/summary",
  authenticateToken,
  async (req, res) => {
    try {
      const { days = 7, metric_type, module } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const query = {
        office_id: req.user.office_id,
        timestamp: { $gte: startDate },
      };

      if (metric_type) query.metric_type = metric_type;
      if (module) query.module = module;

      const metrics = await db.collection("ux_metrics").find(query).toArray();

      // Aggregate by metric type
      const summary = {};

      metrics.forEach((metric) => {
        if (!summary[metric.metric_type]) {
          summary[metric.metric_type] = {
            count: 0,
            total: 0,
            min: Infinity,
            max: -Infinity,
            values: [],
          };
        }

        summary[metric.metric_type].count++;
        summary[metric.metric_type].total += metric.value;
        summary[metric.metric_type].min = Math.min(
          summary[metric.metric_type].min,
          metric.value
        );
        summary[metric.metric_type].max = Math.max(
          summary[metric.metric_type].max,
          metric.value
        );
        summary[metric.metric_type].values.push(metric.value);
      });

      // Calculate averages and percentiles
      Object.keys(summary).forEach((key) => {
        const stats = summary[key];
        stats.average = stats.total / stats.count;

        // Calculate median (p50)
        stats.values.sort((a, b) => a - b);
        const mid = Math.floor(stats.values.length / 2);
        stats.median =
          stats.values.length % 2 === 0
            ? (stats.values[mid - 1] + stats.values[mid]) / 2
            : stats.values[mid];

        // Calculate p95
        const p95Index = Math.floor(stats.values.length * 0.95);
        stats.p95 = stats.values[p95Index] || stats.max;

        delete stats.values; // Remove raw values from response
      });

      res.json({
        period_days: parseInt(days),
        total_metrics: metrics.length,
        summary,
      });
    } catch (error) {
      console.error("Error fetching UX metrics summary:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Get feedback statistics
app.get(
  "/api/feedback/stats/office/:office_id",
  authenticateToken,
  async (req, res) => {
    try {
      const { office_id } = req.params;
      const { days = 30 } = req.query;

      if (req.user.office_id !== office_id) {
        return res
          .status(403)
          .json({ error: "Access denied to this office data" });
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const feedback = await db
        .collection("user_feedback")
        .find({
          office_id,
          created_at: { $gte: startDate },
        })
        .toArray();

      const stats = {
        total: feedback.length,
        by_category: {},
        by_status: {},
        by_module: {},
        avg_rating: 0,
        rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };

      let ratingSum = 0;
      let ratingCount = 0;

      feedback.forEach((f) => {
        // Category stats
        stats.by_category[f.category] =
          (stats.by_category[f.category] || 0) + 1;

        // Status stats
        stats.by_status[f.status] = (stats.by_status[f.status] || 0) + 1;

        // Module stats
        if (f.module) {
          stats.by_module[f.module] = (stats.by_module[f.module] || 0) + 1;
        }

        // Rating stats
        if (f.rating) {
          ratingSum += f.rating;
          ratingCount++;
          stats.rating_distribution[f.rating]++;
        }
      });

      stats.avg_rating =
        ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : 0;

      res.json({
        office_id,
        period_days: parseInt(days),
        stats,
      });
    } catch (error) {
      console.error("Error fetching feedback stats:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Error handler
app.use((err, req, res, next) => {
  console.error("Feedback Service Error:", err);
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

  const server = app.listen(PORT, () => {
    console.log(`🚀 Feedback Service running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(
      `🗄️ Database: ${process.env.MONGODB_DB_NAME || "officeshare_dev"}`
    );
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  });

  return server;
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  if (mongoClient) await mongoClient.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  if (mongoClient) await mongoClient.close();
  process.exit(0);
});

// Only start server if not in test mode
if (require.main === module) {
  startServer().catch(console.error);
}

module.exports = {
  app,
  connectToDatabase,
  setDatabase,
  mongoClient: () => mongoClient,
};
