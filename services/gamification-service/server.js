const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const jwt = require("jsonwebtoken");
const { MongoClient, ObjectId } = require("mongodb");
const Joi = require("joi");
require("dotenv").config();

const app = express();
const PORT = process.env.GAMIFICATION_SERVICE_PORT || 3008;

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

// Badge definitions
const BADGE_DEFINITIONS = {
  FIRST_RIDE: {
    id: "first_ride",
    name: "First Ride",
    description: "Completed your first carpool trip",
    icon: "🚗",
    category: "carpooling",
    criteria: { carpoolTrips: 1 },
  },
  CARPOOLER_10: {
    id: "carpooler_10",
    name: "Carpooler",
    description: "Completed 10 carpool trips",
    icon: "🚙",
    category: "carpooling",
    criteria: { carpoolTrips: 10 },
  },
  CARPOOLER_50: {
    id: "carpooler_50",
    name: "Carpool Champion",
    description: "Completed 50 carpool trips",
    icon: "🏆",
    category: "carpooling",
    criteria: { carpoolTrips: 50 },
  },
  FIRST_BIKE: {
    id: "first_bike",
    name: "First Ride",
    description: "Shared or borrowed your first bike",
    icon: "🚴",
    category: "bike_sharing",
    criteria: { bikeTransactions: 1 },
  },
  BIKE_SHARER_10: {
    id: "bike_sharer_10",
    name: "Bike Enthusiast",
    description: "Completed 10 bike sharing transactions",
    icon: "🚲",
    category: "bike_sharing",
    criteria: { bikeTransactions: 10 },
  },
  FIRST_BOOK: {
    id: "first_book",
    name: "Bookworm",
    description: "Shared or borrowed your first book",
    icon: "📚",
    category: "book_sharing",
    criteria: { bookTransactions: 1 },
  },
  LIBRARIAN: {
    id: "librarian",
    name: "Librarian",
    description: "Shared 10 books with colleagues",
    icon: "📖",
    category: "book_sharing",
    criteria: { booksShared: 10 },
  },
  ECO_WARRIOR: {
    id: "eco_warrior",
    name: "Eco Warrior",
    description: "Saved 100kg of CO2 emissions",
    icon: "🌱",
    category: "environmental",
    criteria: { co2Saved: 100 },
  },
  ECO_CHAMPION: {
    id: "eco_champion",
    name: "Eco Champion",
    description: "Saved 500kg of CO2 emissions",
    icon: "🌍",
    category: "environmental",
    criteria: { co2Saved: 500 },
  },
  COMMUNITY_HERO: {
    id: "community_hero",
    name: "Community Hero",
    description: "Maintain a 4.5+ rating with 20+ transactions",
    icon: "⭐",
    category: "community",
    criteria: { rating: 4.5, totalTransactions: 20 },
  },
};

// Achievement milestones
const ACHIEVEMENT_MILESTONES = {
  carpoolTrips: [1, 5, 10, 25, 50, 100],
  bikeTransactions: [1, 5, 10, 25, 50],
  bookTransactions: [1, 5, 10, 25, 50],
  co2Saved: [10, 50, 100, 250, 500, 1000],
  totalTransactions: [5, 10, 20, 50, 100],
};

// Connect to MongoDB
async function connectToDatabase() {
  try {
    mongoClient = initializeMongoClient();
    await mongoClient.connect();
    db = mongoClient.db(process.env.MONGODB_DB_NAME || "officeshare_dev");
    console.log("✅ Connected to MongoDB");

    // Create indexes
    await db
      .collection("user_achievements")
      .createIndex({ user_id: 1, office_id: 1 });
    await db
      .collection("user_badges")
      .createIndex({ user_id: 1, office_id: 1 });
    await db
      .collection("leaderboards")
      .createIndex({ office_id: 1, period: 1, category: 1 });
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

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "Gamification Service",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Get all badge definitions
app.get(
  "/api/gamification/badges/definitions",
  authenticateToken,
  (req, res) => {
    res.json({
      badges: Object.values(BADGE_DEFINITIONS),
    });
  }
);

// Get user's badges
app.get(
  "/api/gamification/badges/:user_id",
  authenticateToken,
  async (req, res) => {
    try {
      const { user_id } = req.params;

      const userBadges = await db
        .collection("user_badges")
        .find({
          user_id,
          office_id: req.user.office_id,
        })
        .sort({ earned_at: -1 })
        .toArray();

      res.json({
        user_id,
        badges: userBadges.map((badge) => ({
          badge_id: badge.badge_id,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          category: badge.category,
          earned_at: badge.earned_at,
        })),
        total_badges: userBadges.length,
      });
    } catch (error) {
      console.error("Error fetching user badges:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Get user's achievements and progress
app.get(
  "/api/gamification/achievements/:user_id",
  authenticateToken,
  async (req, res) => {
    try {
      const { user_id } = req.params;

      let achievements = await db.collection("user_achievements").findOne({
        user_id,
        office_id: req.user.office_id,
      });

      if (!achievements) {
        // Initialize achievements for new user
        achievements = {
          user_id,
          office_id: req.user.office_id,
          carpoolTrips: 0,
          bikeTransactions: 0,
          bookTransactions: 0,
          booksShared: 0,
          co2Saved: 0,
          totalTransactions: 0,
          created_at: new Date(),
          updated_at: new Date(),
        };
        await db.collection("user_achievements").insertOne(achievements);
      }

      // Calculate progress for each milestone
      const progress = {};
      for (const [key, milestones] of Object.entries(ACHIEVEMENT_MILESTONES)) {
        const currentValue = achievements[key] || 0;
        const nextMilestone =
          milestones.find((m) => m > currentValue) ||
          milestones[milestones.length - 1];
        const previousMilestone =
          milestones.filter((m) => m <= currentValue).pop() || 0;

        progress[key] = {
          current: currentValue,
          nextMilestone,
          previousMilestone,
          progress:
            previousMilestone > 0
              ? ((currentValue - previousMilestone) /
                  (nextMilestone - previousMilestone)) *
                100
              : (currentValue / nextMilestone) * 100,
          completed: milestones.filter((m) => m <= currentValue).length,
          total: milestones.length,
        };
      }

      res.json({
        user_id,
        achievements: {
          carpoolTrips: achievements.carpoolTrips,
          bikeTransactions: achievements.bikeTransactions,
          bookTransactions: achievements.bookTransactions,
          booksShared: achievements.booksShared,
          co2Saved: achievements.co2Saved,
          totalTransactions: achievements.totalTransactions,
        },
        progress,
        updated_at: achievements.updated_at,
      });
    } catch (error) {
      console.error("Error fetching achievements:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Update user achievements (called by other services)
app.post(
  "/api/gamification/achievements/update",
  authenticateToken,
  async (req, res) => {
    try {
      const { user_id, updates } = req.body;

      if (!user_id || !updates) {
        return res
          .status(400)
          .json({ error: "user_id and updates are required" });
      }

      // Get current achievements
      let achievements = await db.collection("user_achievements").findOne({
        user_id,
        office_id: req.user.office_id,
      });

      if (!achievements) {
        achievements = {
          user_id,
          office_id: req.user.office_id,
          carpoolTrips: 0,
          bikeTransactions: 0,
          bookTransactions: 0,
          booksShared: 0,
          co2Saved: 0,
          totalTransactions: 0,
          created_at: new Date(),
        };
      }

      // Apply updates
      const updateData = { ...updates, updated_at: new Date() };

      await db
        .collection("user_achievements")
        .updateOne(
          { user_id, office_id: req.user.office_id },
          { $set: updateData, $setOnInsert: { created_at: new Date() } },
          { upsert: true }
        );

      // Check for new badges
      const newBadges = await checkAndAwardBadges(user_id, req.user.office_id);

      res.json({
        message: "Achievements updated successfully",
        new_badges: newBadges,
      });
    } catch (error) {
      console.error("Error updating achievements:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Increment achievement counters
app.post(
  "/api/gamification/achievements/increment",
  authenticateToken,
  async (req, res) => {
    try {
      const { user_id, field, amount = 1 } = req.body;

      if (!user_id || !field) {
        return res
          .status(400)
          .json({ error: "user_id and field are required" });
      }

      const validFields = [
        "carpoolTrips",
        "bikeTransactions",
        "bookTransactions",
        "booksShared",
        "co2Saved",
        "totalTransactions",
      ];
      if (!validFields.includes(field)) {
        return res.status(400).json({ error: "Invalid field" });
      }

      // Check if document exists
      const existing = await db.collection("user_achievements").findOne({
        user_id,
        office_id: req.user.office_id,
      });

      if (!existing) {
        // Create new document with initial values
        const initialDoc = {
          user_id,
          office_id: req.user.office_id,
          carpoolTrips: 0,
          bikeTransactions: 0,
          bookTransactions: 0,
          booksShared: 0,
          co2Saved: 0,
          totalTransactions: 0,
          created_at: new Date(),
          updated_at: new Date(),
        };
        initialDoc[field] = amount;
        await db.collection("user_achievements").insertOne(initialDoc);
      } else {
        // Increment the field
        await db.collection("user_achievements").updateOne(
          { user_id, office_id: req.user.office_id },
          {
            $inc: { [field]: amount },
            $set: { updated_at: new Date() },
          }
        );
      }

      // Check for new badges
      const newBadges = await checkAndAwardBadges(user_id, req.user.office_id);

      res.json({
        message: "Achievement incremented successfully",
        field,
        amount,
        new_badges: newBadges,
      });
    } catch (error) {
      console.error("Error incrementing achievement:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Check and award badges based on achievements
async function checkAndAwardBadges(user_id, office_id) {
  const achievements = await db.collection("user_achievements").findOne({
    user_id,
    office_id,
  });

  if (!achievements) return [];

  const existingBadges = await db
    .collection("user_badges")
    .find({ user_id, office_id })
    .toArray();

  const existingBadgeIds = new Set(existingBadges.map((b) => b.badge_id));
  const newBadges = [];

  // Check each badge definition
  for (const badge of Object.values(BADGE_DEFINITIONS)) {
    if (existingBadgeIds.has(badge.id)) continue;

    let shouldAward = true;
    for (const [key, value] of Object.entries(badge.criteria)) {
      if (achievements[key] < value) {
        shouldAward = false;
        break;
      }
    }

    if (shouldAward) {
      const badgeRecord = {
        user_id,
        office_id,
        badge_id: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        category: badge.category,
        earned_at: new Date(),
      };

      await db.collection("user_badges").insertOne(badgeRecord);
      newBadges.push(badgeRecord);
    }
  }

  return newBadges;
}

// Get office-wide leaderboard
app.get(
  "/api/gamification/leaderboard/:category",
  authenticateToken,
  async (req, res) => {
    try {
      const { category } = req.params;
      const { period = "all_time", limit = 10 } = req.query;

      const validCategories = [
        "carpoolTrips",
        "bikeTransactions",
        "bookTransactions",
        "co2Saved",
        "totalTransactions",
      ];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: "Invalid category" });
      }

      // Get top users for this category
      const topUsers = await db
        .collection("user_achievements")
        .find({ office_id: req.user.office_id })
        .sort({ [category]: -1 })
        .limit(parseInt(limit))
        .toArray();

      // Get user details
      const userIds = topUsers.map((u) => new ObjectId(u.user_id));
      const users = await db
        .collection("users")
        .find({ _id: { $in: userIds } })
        .toArray();

      const userMap = {};
      users.forEach((u) => {
        userMap[u._id.toString()] = u;
      });

      const leaderboard = topUsers.map((achievement, index) => {
        const user = userMap[achievement.user_id];
        return {
          rank: index + 1,
          user_id: achievement.user_id,
          full_name: user ? user.full_name : "Unknown User",
          value: achievement[category],
          badge_count: 0, // Will be populated separately if needed
        };
      });

      res.json({
        category,
        period,
        office_id: req.user.office_id,
        leaderboard,
        updated_at: new Date(),
      });
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Get environmental impact for user
app.get(
  "/api/gamification/environmental-impact/:user_id",
  authenticateToken,
  async (req, res) => {
    try {
      const { user_id } = req.params;

      const achievements = await db.collection("user_achievements").findOne({
        user_id,
        office_id: req.user.office_id,
      });

      if (!achievements) {
        return res.json({
          user_id,
          co2_saved_kg: 0,
          trees_equivalent: 0,
          miles_not_driven: 0,
          carpoolTrips: 0,
        });
      }

      // Calculate environmental impact metrics
      const co2SavedKg = achievements.co2Saved || 0;
      const treesEquivalent = Math.round((co2SavedKg / 21) * 10) / 10; // Average tree absorbs ~21kg CO2/year
      const milesNotDriven = Math.round((co2SavedKg / 0.404) * 10) / 10; // Average car emits ~0.404kg CO2/mile

      res.json({
        user_id,
        co2_saved_kg: co2SavedKg,
        trees_equivalent: treesEquivalent,
        miles_not_driven: milesNotDriven,
        carpoolTrips: achievements.carpoolTrips || 0,
        bikeTransactions: achievements.bikeTransactions || 0,
        updated_at: achievements.updated_at,
      });
    } catch (error) {
      console.error("Error fetching environmental impact:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Get office-wide environmental impact
app.get(
  "/api/gamification/environmental-impact/office/:office_id",
  authenticateToken,
  async (req, res) => {
    try {
      const { office_id } = req.params;

      // Ensure user can only access their own office data
      if (req.user.office_id !== office_id) {
        return res
          .status(403)
          .json({ error: "Access denied to this office data" });
      }

      const achievements = await db
        .collection("user_achievements")
        .find({ office_id })
        .toArray();

      const totalCo2Saved = achievements.reduce(
        (sum, a) => sum + (a.co2Saved || 0),
        0
      );
      const totalCarpoolTrips = achievements.reduce(
        (sum, a) => sum + (a.carpoolTrips || 0),
        0
      );
      const totalBikeTransactions = achievements.reduce(
        (sum, a) => sum + (a.bikeTransactions || 0),
        0
      );
      const activeUsers = achievements.filter(
        (a) => a.totalTransactions > 0
      ).length;

      const treesEquivalent = Math.round((totalCo2Saved / 21) * 10) / 10;
      const milesNotDriven = Math.round((totalCo2Saved / 0.404) * 10) / 10;

      res.json({
        office_id,
        total_co2_saved_kg: totalCo2Saved,
        trees_equivalent: treesEquivalent,
        miles_not_driven: milesNotDriven,
        total_carpool_trips: totalCarpoolTrips,
        total_bike_transactions: totalBikeTransactions,
        active_users: activeUsers,
        updated_at: new Date(),
      });
    } catch (error) {
      console.error("Error fetching office environmental impact:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Get user's rank in a specific category
app.get(
  "/api/gamification/rank/:user_id/:category",
  authenticateToken,
  async (req, res) => {
    try {
      const { user_id, category } = req.params;

      const validCategories = [
        "carpoolTrips",
        "bikeTransactions",
        "bookTransactions",
        "co2Saved",
        "totalTransactions",
      ];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: "Invalid category" });
      }

      const userAchievement = await db.collection("user_achievements").findOne({
        user_id,
        office_id: req.user.office_id,
      });

      if (!userAchievement) {
        return res.json({
          user_id,
          category,
          rank: null,
          value: 0,
          total_users: 0,
        });
      }

      const userValue = userAchievement[category] || 0;

      // Count users with higher values
      const higherCount = await db
        .collection("user_achievements")
        .countDocuments({
          office_id: req.user.office_id,
          [category]: { $gt: userValue },
        });

      const totalUsers = await db
        .collection("user_achievements")
        .countDocuments({
          office_id: req.user.office_id,
        });

      res.json({
        user_id,
        category,
        rank: higherCount + 1,
        value: userValue,
        total_users: totalUsers,
      });
    } catch (error) {
      console.error("Error fetching user rank:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Error handler
app.use((err, req, res, next) => {
  console.error("Gamification Service Error:", err);
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
    console.log(`🚀 Gamification Service running on http://localhost:${PORT}`);
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
  await mongoClient.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  await mongoClient.close();
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
