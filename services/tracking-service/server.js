const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { MongoClient, ObjectId } = require("mongodb");
const Joi = require("joi");
const geolib = require("geolib");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.TRACKING_SERVICE_PORT || 3004;

// MongoDB connection
let db;
const mongoClient = new MongoClient(process.env.MONGODB_URI);

// In-memory storage for active tracking sessions and geofences
const activeSessions = new Map(); // user_id -> session data
const geofences = new Map(); // geofence_id -> geofence data
const userLocations = new Map(); // user_id -> latest location

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
const locationUpdateSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  accuracy: Joi.number().min(0).default(10),
  altitude: Joi.number().optional(),
  speed: Joi.number().min(0).optional(),
  heading: Joi.number().min(0).max(360).optional(),
  timestamp: Joi.date()
    .iso()
    .default(() => new Date()),
});

const startTrackingSchema = Joi.object({
  trip_id: Joi.string().required(),
  tracking_type: Joi.string().valid("driver", "rider").required(),
  privacy_level: Joi.string()
    .valid("full", "approximate", "minimal")
    .default("full"),
});

const geofenceSchema = Joi.object({
  name: Joi.string().required(),
  center: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
  }).required(),
  radius: Joi.number().min(10).max(5000).required(), // 10m to 5km
  trip_id: Joi.string().required(),
  event_type: Joi.string().valid("enter", "exit", "both").default("both"),
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "Tracking Service",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    active_sessions: activeSessions.size,
    active_geofences: geofences.size,
  });
});

// Start tracking session
app.post("/api/tracking/start", async (req, res) => {
  try {
    const { error, value } = startTrackingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }

    const { trip_id, tracking_type, privacy_level } = value;
    const user_id = req.headers["x-user-id"]; // Simplified auth for tracking

    if (!user_id) {
      return res.status(401).json({ error: "User ID required" });
    }

    // Verify trip exists and user has permission
    const trip = await db.collection("carpool_trips").findOne({
      _id: new ObjectId(trip_id),
      $or: [{ user_id: user_id }, { "participants.user_id": user_id }],
    });

    if (!trip) {
      return res.status(404).json({ error: "Trip not found or access denied" });
    }

    // Create tracking session
    const session = {
      user_id,
      trip_id,
      tracking_type,
      privacy_level,
      started_at: new Date(),
      last_update: null,
      total_distance: 0,
      status: "active",
    };

    activeSessions.set(user_id, session);

    // Store session in database
    await db.collection("tracking_sessions").insertOne({
      ...session,
      _id: new ObjectId(),
    });

    res.json({
      message: "Tracking session started",
      session_id: user_id,
      session: session,
    });
  } catch (error) {
    console.error("Start tracking error:", error);
    res.status(500).json({
      error: "Failed to start tracking",
      message: "An error occurred while starting the tracking session",
    });
  }
});

// Stop tracking session
app.post("/api/tracking/stop", async (req, res) => {
  try {
    const user_id = req.headers["x-user-id"];

    if (!user_id) {
      return res.status(401).json({ error: "User ID required" });
    }

    const session = activeSessions.get(user_id);
    if (!session) {
      return res
        .status(404)
        .json({ error: "No active tracking session found" });
    }

    // Update session status
    session.status = "completed";
    session.ended_at = new Date();

    // Update in database
    await db.collection("tracking_sessions").updateOne(
      { user_id: user_id, status: "active" },
      {
        $set: {
          status: "completed",
          ended_at: new Date(),
          total_distance: session.total_distance,
        },
      }
    );

    // Remove from active sessions
    activeSessions.delete(user_id);
    userLocations.delete(user_id);

    // Notify other participants that tracking stopped
    io.to(`trip_${session.trip_id}`).emit("tracking_stopped", {
      user_id: user_id,
      trip_id: session.trip_id,
    });

    res.json({
      message: "Tracking session stopped",
      session: session,
    });
  } catch (error) {
    console.error("Stop tracking error:", error);
    res.status(500).json({
      error: "Failed to stop tracking",
      message: "An error occurred while stopping the tracking session",
    });
  }
});

// Get tracking session status
app.get("/api/tracking/session/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;

    const session = activeSessions.get(user_id);
    if (!session) {
      return res
        .status(404)
        .json({ error: "No active tracking session found" });
    }

    const location = userLocations.get(user_id);

    res.json({
      session: session,
      current_location: location,
      last_update: session.last_update,
    });
  } catch (error) {
    console.error("Get session error:", error);
    res.status(500).json({
      error: "Failed to get session",
      message: "An error occurred while retrieving the session",
    });
  }
});

// Create geofence
app.post("/api/tracking/geofence", async (req, res) => {
  try {
    const { error, value } = geofenceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }

    const geofenceId = new ObjectId().toString();
    const geofence = {
      id: geofenceId,
      ...value,
      created_at: new Date(),
      triggered_users: new Set(),
    };

    geofences.set(geofenceId, geofence);

    // Store in database
    await db.collection("geofences").insertOne({
      _id: new ObjectId(geofenceId),
      ...value,
      created_at: new Date(),
    });

    res.json({
      message: "Geofence created",
      geofence_id: geofenceId,
      geofence: {
        id: geofenceId,
        name: value.name,
        center: value.center,
        radius: value.radius,
        trip_id: value.trip_id,
        event_type: value.event_type,
      },
    });
  } catch (error) {
    console.error("Create geofence error:", error);
    res.status(500).json({
      error: "Failed to create geofence",
      message: "An error occurred while creating the geofence",
    });
  }
});

// Get location history
app.get("/api/tracking/history/:trip_id", async (req, res) => {
  try {
    const { trip_id } = req.params;
    const { start_time, end_time, user_id } = req.query;

    const query = { trip_id: trip_id };

    if (user_id) {
      query.user_id = user_id;
    }

    if (start_time || end_time) {
      query.timestamp = {};
      if (start_time) query.timestamp.$gte = new Date(start_time);
      if (end_time) query.timestamp.$lte = new Date(end_time);
    }

    const locations = await db
      .collection("location_updates")
      .find(query)
      .sort({ timestamp: 1 })
      .limit(1000) // Limit to prevent large responses
      .toArray();

    res.json({
      trip_id: trip_id,
      total_points: locations.length,
      locations: locations.map((loc) => ({
        user_id: loc.user_id,
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
        speed: loc.speed,
        timestamp: loc.timestamp,
      })),
    });
  } catch (error) {
    console.error("Get history error:", error);
    res.status(500).json({
      error: "Failed to get location history",
      message: "An error occurred while retrieving location history",
    });
  }
});

// WebSocket connection handling
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Join trip room for real-time updates
  socket.on("join_trip", (data) => {
    const { trip_id, user_id } = data;
    socket.join(`trip_${trip_id}`);
    socket.user_id = user_id;
    socket.trip_id = trip_id;

    console.log(`User ${user_id} joined trip ${trip_id} room`);

    // Notify others in the trip
    socket.to(`trip_${trip_id}`).emit("user_joined", {
      user_id: user_id,
      timestamp: new Date().toISOString(),
    });
  });

  // Handle location updates
  socket.on("location_update", async (data) => {
    try {
      const { error, value } = locationUpdateSchema.validate(data);
      if (error) {
        socket.emit("error", { message: "Invalid location data" });
        return;
      }

      const user_id = socket.user_id;
      if (!user_id) {
        socket.emit("error", { message: "User not authenticated" });
        return;
      }

      const session = activeSessions.get(user_id);
      if (!session) {
        socket.emit("error", { message: "No active tracking session" });
        return;
      }

      // Process location update
      const processedLocation = await processLocationUpdate(
        user_id,
        value,
        session
      );

      // Update user's latest location
      userLocations.set(user_id, processedLocation);

      // Update session
      session.last_update = new Date();
      if (processedLocation.distance_traveled) {
        session.total_distance += processedLocation.distance_traveled;
      }

      // Store in database
      await db.collection("location_updates").insertOne({
        user_id: user_id,
        trip_id: session.trip_id,
        ...processedLocation,
        session_id: user_id,
        created_at: new Date(),
      });

      // Apply privacy filtering
      const publicLocation = applyPrivacyFilter(
        processedLocation,
        session.privacy_level
      );

      // Broadcast to trip participants
      socket.to(`trip_${session.trip_id}`).emit("location_update", {
        user_id: user_id,
        ...publicLocation,
        timestamp: processedLocation.timestamp,
      });

      // Check geofences
      await checkGeofences(user_id, processedLocation, session.trip_id);

      // Acknowledge the update
      socket.emit("location_ack", {
        timestamp: processedLocation.timestamp,
        distance_traveled: processedLocation.distance_traveled,
      });
    } catch (error) {
      console.error("Location update error:", error);
      socket.emit("error", { message: "Failed to process location update" });
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);

    if (socket.user_id && socket.trip_id) {
      // Notify others in the trip
      socket.to(`trip_${socket.trip_id}`).emit("user_left", {
        user_id: socket.user_id,
        timestamp: new Date().toISOString(),
      });
    }
  });
});

// Process location update with validation and distance calculation
async function processLocationUpdate(user_id, locationData, session) {
  const processedLocation = {
    latitude: locationData.latitude,
    longitude: locationData.longitude,
    accuracy: locationData.accuracy,
    altitude: locationData.altitude,
    speed: locationData.speed,
    heading: locationData.heading,
    timestamp: locationData.timestamp,
  };

  // Calculate distance traveled since last update
  const lastLocation = userLocations.get(user_id);
  if (lastLocation) {
    const distance = geolib.getDistance(
      { latitude: lastLocation.latitude, longitude: lastLocation.longitude },
      { latitude: locationData.latitude, longitude: locationData.longitude }
    );

    // Only count significant movements (> 5 meters) to filter out GPS noise
    if (distance > 5) {
      processedLocation.distance_traveled = distance / 1000; // Convert to kilometers
    } else {
      processedLocation.distance_traveled = 0;
    }
  } else {
    processedLocation.distance_traveled = 0;
  }

  // Validate location accuracy and flag suspicious data
  if (locationData.accuracy > 100) {
    processedLocation.low_accuracy = true;
  }

  // Calculate speed if not provided
  if (!locationData.speed && lastLocation) {
    const timeDiff =
      (new Date(locationData.timestamp) - new Date(lastLocation.timestamp)) /
      1000; // seconds
    if (timeDiff > 0 && processedLocation.distance_traveled > 0) {
      processedLocation.calculated_speed =
        (processedLocation.distance_traveled * 1000) / timeDiff; // m/s
    }
  }

  return processedLocation;
}

// Apply privacy filtering based on user preferences
function applyPrivacyFilter(location, privacyLevel) {
  switch (privacyLevel) {
    case "minimal":
      // Only share approximate location (rounded to ~100m)
      return {
        latitude: Math.round(location.latitude * 1000) / 1000,
        longitude: Math.round(location.longitude * 1000) / 1000,
        timestamp: location.timestamp,
      };

    case "approximate":
      // Share location with reduced precision (~10m)
      return {
        latitude: Math.round(location.latitude * 10000) / 10000,
        longitude: Math.round(location.longitude * 10000) / 10000,
        speed: location.speed,
        timestamp: location.timestamp,
      };

    case "full":
    default:
      // Share full location data
      return location;
  }
}

// Check if user entered/exited any geofences
async function checkGeofences(user_id, location, trip_id) {
  for (const [geofenceId, geofence] of geofences) {
    if (geofence.trip_id !== trip_id) continue;

    const distance = geolib.getDistance(
      { latitude: location.latitude, longitude: location.longitude },
      {
        latitude: geofence.center.latitude,
        longitude: geofence.center.longitude,
      }
    );

    const isInside = distance <= geofence.radius;
    const wasInside = geofence.triggered_users.has(user_id);

    let eventTriggered = false;
    let eventType = null;

    if (
      isInside &&
      !wasInside &&
      (geofence.event_type === "enter" || geofence.event_type === "both")
    ) {
      // User entered geofence
      geofence.triggered_users.add(user_id);
      eventTriggered = true;
      eventType = "enter";
    } else if (
      !isInside &&
      wasInside &&
      (geofence.event_type === "exit" || geofence.event_type === "both")
    ) {
      // User exited geofence
      geofence.triggered_users.delete(user_id);
      eventTriggered = true;
      eventType = "exit";
    }

    if (eventTriggered) {
      // Store geofence event
      await db.collection("geofence_events").insertOne({
        geofence_id: geofenceId,
        user_id: user_id,
        trip_id: trip_id,
        event_type: eventType,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        distance_from_center: distance,
        timestamp: new Date(),
      });

      // Notify trip participants
      io.to(`trip_${trip_id}`).emit("geofence_event", {
        geofence_id: geofenceId,
        geofence_name: geofence.name,
        user_id: user_id,
        event_type: eventType,
        timestamp: new Date().toISOString(),
      });

      console.log(
        `Geofence ${eventType} event: User ${user_id} ${eventType}ed ${geofence.name}`
      );
    }
  }
}

// Error handler
app.use((err, req, res, next) => {
  console.error("Tracking Service Error:", err);
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

  server.listen(PORT, () => {
    console.log(`🚀 Tracking Service running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(
      `🗄️ Database: ${process.env.MONGODB_DB_NAME || "officeshare_dev"}`
    );
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`🔌 WebSocket server ready for real-time tracking`);
  });
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");

  // Stop all active tracking sessions
  for (const [user_id, session] of activeSessions) {
    session.status = "interrupted";
    await db
      .collection("tracking_sessions")
      .updateOne(
        { user_id: user_id, status: "active" },
        { $set: { status: "interrupted", ended_at: new Date() } }
      );
  }

  await mongoClient.close();
  server.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");

  // Stop all active tracking sessions
  for (const [user_id, session] of activeSessions) {
    session.status = "interrupted";
    await db
      .collection("tracking_sessions")
      .updateOne(
        { user_id: user_id, status: "active" },
        { $set: { status: "interrupted", ended_at: new Date() } }
      );
  }

  await mongoClient.close();
  server.close();
  process.exit(0);
});

startServer().catch(console.error);
