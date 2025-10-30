const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { MongoClient, ObjectId } = require("mongodb");
const Joi = require("joi");
require("dotenv").config();

const app = express();
const PORT = process.env.USER_SERVICE_PORT || 3001;

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

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  full_name: Joi.string().min(2).required(),
  office_id: Joi.string().default("office_001"),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const updateProfileSchema = Joi.object({
  full_name: Joi.string().min(2),
  preferences: Joi.object({
    notifications_enabled: Joi.boolean(),
    location_sharing: Joi.boolean(),
    email_notifications: Joi.boolean(),
  }),
});

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
    service: "User Service",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Register new user
app.post("/api/users/register", async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password, full_name, office_id } = value;

    // Check if user already exists
    const existingUser = await db.collection("users").findOne({
      office_id,
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res
        .status(409)
        .json({ error: "User already exists with this email" });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = {
      office_id,
      email: email.toLowerCase(),
      full_name,
      password_hash,
      reputation_score: 5.0,
      preferences: {
        notifications_enabled: true,
        location_sharing: true,
        email_notifications: true,
      },
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await db.collection("users").insertOne(newUser);

    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: result.insertedId.toString(),
        email: email.toLowerCase(),
        office_id,
      },
      process.env.JWT_SECRET || "officeshare-dev-secret-key-2024",
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );

    // Return user data (without password)
    const userResponse = {
      user_id: result.insertedId.toString(),
      office_id,
      email: email.toLowerCase(),
      full_name,
      reputation_score: 5.0,
      preferences: newUser.preferences,
      created_at: newUser.created_at,
    };

    res.status(201).json({
      message: "User registered successfully",
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login user
app.post("/api/users/login", async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password } = value;

    // Find user
    const user = await db.collection("users").findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: user._id.toString(),
        email: user.email,
        office_id: user.office_id,
      },
      process.env.JWT_SECRET || "officeshare-dev-secret-key-2024",
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );

    // Return user data (without password)
    const userResponse = {
      user_id: user._id.toString(),
      office_id: user.office_id,
      email: user.email,
      full_name: user.full_name,
      reputation_score: user.reputation_score,
      preferences: user.preferences,
      created_at: user.created_at,
    };

    res.json({
      message: "Login successful",
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get current user profile
app.get("/api/users/profile", authenticateToken, async (req, res) => {
  try {
    const user = await db
      .collection("users")
      .findOne(
        { _id: new ObjectId(req.user.user_id) },
        { projection: { password_hash: 0 } }
      );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userResponse = {
      user_id: user._id.toString(),
      office_id: user.office_id,
      email: user.email,
      full_name: user.full_name,
      reputation_score: user.reputation_score,
      preferences: user.preferences,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    res.json({ user: userResponse });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user profile
app.put("/api/users/profile", authenticateToken, async (req, res) => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const updateData = {
      ...value,
      updated_at: new Date(),
    };

    const result = await db
      .collection("users")
      .updateOne({ _id: new ObjectId(req.user.user_id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch updated user
    const updatedUser = await db
      .collection("users")
      .findOne(
        { _id: new ObjectId(req.user.user_id) },
        { projection: { password_hash: 0 } }
      );

    const userResponse = {
      user_id: updatedUser._id.toString(),
      office_id: updatedUser.office_id,
      email: updatedUser.email,
      full_name: updatedUser.full_name,
      reputation_score: updatedUser.reputation_score,
      preferences: updatedUser.preferences,
      created_at: updatedUser.created_at,
      updated_at: updatedUser.updated_at,
    };

    res.json({
      message: "Profile updated successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get users in same office (for admin/matching purposes)
app.get("/api/users/office/:office_id", authenticateToken, async (req, res) => {
  try {
    const { office_id } = req.params;

    // Ensure user can only access their own office data
    if (req.user.office_id !== office_id) {
      return res
        .status(403)
        .json({ error: "Access denied to this office data" });
    }

    const users = await db
      .collection("users")
      .find({ office_id }, { projection: { password_hash: 0 } })
      .toArray();

    const usersResponse = users.map((user) => ({
      user_id: user._id.toString(),
      office_id: user.office_id,
      email: user.email,
      full_name: user.full_name,
      reputation_score: user.reputation_score,
      created_at: user.created_at,
    }));

    res.json({ users: usersResponse });
  } catch (error) {
    console.error("Office users fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Submit rating for another user
app.post("/api/users/:user_id/rating", authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.params;
    const { rating, comment, transaction_type, transaction_id } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    // Can't rate yourself
    if (req.user.user_id === user_id) {
      return res.status(400).json({ error: "Cannot rate yourself" });
    }

    // Check if target user exists and is in same office
    const targetUser = await db.collection("users").findOne({
      _id: new ObjectId(user_id),
      office_id: req.user.office_id,
    });

    if (!targetUser) {
      return res.status(404).json({ error: "User not found in your office" });
    }

    // Create rating record
    const ratingRecord = {
      rated_user_id: user_id,
      rater_user_id: req.user.user_id,
      office_id: req.user.office_id,
      rating: parseInt(rating),
      comment: comment || "",
      transaction_type: transaction_type || "general",
      transaction_id: transaction_id || null,
      created_at: new Date(),
    };

    // Insert rating (you might want to create a separate ratings collection)
    await db.collection("user_ratings").insertOne(ratingRecord);

    // Recalculate user's average rating
    const ratings = await db
      .collection("user_ratings")
      .find({
        rated_user_id: user_id,
      })
      .toArray();

    const averageRating =
      ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

    // Update user's reputation score
    await db.collection("users").updateOne(
      { _id: new ObjectId(user_id) },
      {
        $set: {
          reputation_score: Math.round(averageRating * 10) / 10,
          updated_at: new Date(),
        },
      }
    );

    res.json({
      message: "Rating submitted successfully",
      new_average_rating: Math.round(averageRating * 10) / 10,
    });
  } catch (error) {
    console.error("Rating submission error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Verify token endpoint (for other services)
app.post("/api/users/verify-token", (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Token required" });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET || "officeshare-dev-secret-key-2024",
    (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: "Invalid token", valid: false });
      }

      res.json({
        valid: true,
        user: {
          user_id: decoded.user_id,
          email: decoded.email,
          office_id: decoded.office_id,
        },
      });
    }
  );
});

// Error handler
app.use((err, req, res, next) => {
  console.error("User Service Error:", err);
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
    console.log(`🚀 User Service running on http://localhost:${PORT}`);
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
