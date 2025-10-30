const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { MongoClient, ObjectId } = require("mongodb");
const Joi = require("joi");
const axios = require("axios");
const geolib = require("geolib");
const MLMatchingService = require("./ml-matching");
require("dotenv").config();

const app = express();
const PORT = process.env.MATCHING_SERVICE_PORT || 3003;

// MongoDB connection
let db;
const mongoClient = new MongoClient(process.env.MONGODB_URI);
let mlMatchingService;

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await mongoClient.connect();
    db = mongoClient.db(process.env.MONGODB_DB_NAME || "officeshare_dev");
    mlMatchingService = new MLMatchingService(db);
    console.log("✅ Connected to MongoDB");
    console.log("✅ ML Matching Service initialized");
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
const findMatchesSchema = Joi.object({
  trip_id: Joi.string().required(),
  max_matches: Joi.number().integer().min(1).max(10).default(5),
  max_detour_km: Joi.number().min(0).max(20).default(5),
  max_detour_minutes: Joi.number().min(0).max(30).default(15),
});

const calculateRouteSchema = Joi.object({
  origin: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required(),
  }).required(),
  destination: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required(),
  }).required(),
  waypoints: Joi.array()
    .items(
      Joi.object({
        lat: Joi.number().required(),
        lng: Joi.number().required(),
      })
    )
    .default([]),
});

// JWT middleware for authentication
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    // Verify token with User Service
    const response = await axios.post(
      `http://localhost:${process.env.USER_SERVICE_PORT || 3001}/api/users/verify-token`,
      {
        token: token,
      }
    );

    if (response.data.valid) {
      req.user = response.data.user;
      next();
    } else {
      return res.status(403).json({ error: "Invalid token" });
    }
  } catch (error) {
    console.error("Token verification error:", error.message);
    return res.status(403).json({ error: "Token verification failed" });
  }
};

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "Matching Service",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Find matches for a trip (main matching endpoint)
app.post("/api/matching/find-matches", authenticateToken, async (req, res) => {
  try {
    const { error, value } = findMatchesSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }

    const { trip_id, max_matches, max_detour_km, max_detour_minutes } = value;

    // Get the trip details
    const trip = await db.collection("carpool_trips").findOne({
      _id: new ObjectId(trip_id),
      office_id: req.user.office_id,
    });

    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    // Determine what we're matching (driver looking for riders, or rider looking for drivers)
    const isDriverTrip = trip.role === "driver";
    const matchingRole = isDriverTrip ? "rider" : "driver";

    // Find potential matches using the two-phase algorithm
    const matches = await findPotentialMatches(
      trip,
      matchingRole,
      max_matches,
      max_detour_km,
      max_detour_minutes
    );

    res.json({
      trip_id: trip_id,
      trip_type: trip.role,
      matches: matches,
      matching_criteria: {
        max_matches,
        max_detour_km,
        max_detour_minutes,
      },
      total_matches: matches.length,
    });
  } catch (error) {
    console.error("Find matches error:", error);
    res.status(500).json({
      error: "Matching failed",
      message: "An error occurred while finding matches",
    });
  }
});

// Calculate route with waypoints
app.post(
  "/api/matching/calculate-route",
  authenticateToken,
  async (req, res) => {
    try {
      const { error, value } = calculateRouteSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.details.map((detail) => detail.message),
        });
      }

      const { origin, destination, waypoints } = value;

      // Calculate route with waypoints
      const routeData = await calculateOptimalRoute(
        origin,
        destination,
        waypoints
      );

      res.json({
        route: routeData,
        calculation_time: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Route calculation error:", error);
      res.status(500).json({
        error: "Route calculation failed",
        message: "An error occurred while calculating the route",
      });
    }
  }
);

// Get matching statistics for a trip
app.get("/api/matching/stats/:trip_id", authenticateToken, async (req, res) => {
  try {
    const { trip_id } = req.params;

    const trip = await db.collection("carpool_trips").findOne({
      _id: new ObjectId(trip_id),
      office_id: req.user.office_id,
    });

    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    // Get statistics about potential matches
    const stats = await getMatchingStatistics(trip);

    res.json({
      trip_id: trip_id,
      statistics: stats,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      error: "Failed to get statistics",
      message: "An error occurred while getting matching statistics",
    });
  }
});

// Batch matching for multiple trips (used by scheduled jobs)
app.post("/api/matching/batch-match", authenticateToken, async (req, res) => {
  try {
    const { office_id } = req.body;

    if (!office_id || office_id !== req.user.office_id) {
      return res.status(400).json({ error: "Invalid office_id" });
    }

    // Find all trips that need matching
    const tripsNeedingMatching = await db
      .collection("carpool_trips")
      .find({
        office_id: office_id,
        status: "seeking",
        departure_time: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next 24 hours
        },
      })
      .toArray();

    const matchingResults = [];

    for (const trip of tripsNeedingMatching) {
      try {
        const matches = await findPotentialMatches(
          trip,
          trip.role === "driver" ? "rider" : "driver",
          5,
          5,
          15
        );

        if (matches.length > 0) {
          // Notify users about matches
          await notifyUsersAboutMatches(trip, matches);

          matchingResults.push({
            trip_id: trip._id.toString(),
            matches_found: matches.length,
            top_match_score: matches[0]?.match_score || 0,
          });
        }
      } catch (error) {
        console.error(`Error matching trip ${trip._id}:`, error);
      }
    }

    res.json({
      processed_trips: tripsNeedingMatching.length,
      successful_matches: matchingResults.length,
      results: matchingResults,
    });
  } catch (error) {
    console.error("Batch matching error:", error);
    res.status(500).json({
      error: "Batch matching failed",
      message: "An error occurred during batch matching",
    });
  }
});

// ML-Enhanced Matching Endpoints

// Get ML-enhanced matches with user preference learning
app.post(
  "/api/matching/ml-find-matches",
  authenticateToken,
  async (req, res) => {
    try {
      const { error, value } = findMatchesSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.details.map((detail) => detail.message),
        });
      }

      const { trip_id, max_matches, max_detour_km, max_detour_minutes } = value;

      // Get the trip details
      const trip = await db.collection("carpool_trips").findOne({
        _id: new ObjectId(trip_id),
        office_id: req.user.office_id,
      });

      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }

      // Learn user preferences
      const userPreferences = await mlMatchingService.learnUserPreferences(
        req.user.user_id,
        req.user.office_id
      );

      // Find potential matches
      const isDriverTrip = trip.role === "driver";
      const matchingRole = isDriverTrip ? "rider" : "driver";

      const candidates = await findCandidates(trip, matchingRole);
      const mlMatches = [];

      for (const candidate of candidates) {
        try {
          const routeAnalysis = await analyzeRouteCompatibility(
            trip,
            candidate,
            max_detour_km,
            max_detour_minutes
          );

          if (routeAnalysis.isCompatible) {
            const mlScore = await mlMatchingService.calculateMLMatchScore(
              trip,
              candidate,
              routeAnalysis,
              req.user.user_id
            );

            mlMatches.push({
              trip_id: candidate._id.toString(),
              user_id: candidate.user_id,
              ml_match_score: mlScore,
              route_analysis: routeAnalysis,
              trip_details: {
                trip_type: candidate.trip_type,
                direction: candidate.direction,
                departure_time: candidate.departure_time,
                origin_location: candidate.origin_location,
                destination_location: candidate.destination_location,
                max_passengers: candidate.max_passengers,
                cost_per_passenger: candidate.cost_per_passenger,
              },
            });
          }
        } catch (error) {
          console.error(`Error analyzing candidate ${candidate._id}:`, error);
        }
      }

      // Sort by ML score
      const rankedMatches = mlMatches
        .sort((a, b) => b.ml_match_score - a.ml_match_score)
        .slice(0, max_matches);

      res.json({
        trip_id: trip_id,
        matches: rankedMatches,
        user_preferences: userPreferences,
        total_matches: rankedMatches.length,
        matching_algorithm: "ml_enhanced",
      });
    } catch (error) {
      console.error("ML matching error:", error);
      res.status(500).json({
        error: "ML matching failed",
        message: error.message,
      });
    }
  }
);

// Get user preferences
app.get(
  "/api/matching/user-preferences",
  authenticateToken,
  async (req, res) => {
    try {
      const preferences = await mlMatchingService.learnUserPreferences(
        req.user.user_id,
        req.user.office_id
      );

      res.json({
        user_id: req.user.user_id,
        preferences: preferences,
        last_updated: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Get preferences error:", error);
      res.status(500).json({
        error: "Failed to get user preferences",
        message: error.message,
      });
    }
  }
);

// Predict demand for carpooling
app.post(
  "/api/matching/predict-demand",
  authenticateToken,
  async (req, res) => {
    try {
      const { target_date, direction } = req.body;

      if (!target_date || !direction) {
        return res.status(400).json({
          error: "Missing required fields: target_date and direction",
        });
      }

      const forecast = await mlMatchingService.predictDemand(
        req.user.office_id,
        target_date,
        direction
      );

      res.json({
        office_id: req.user.office_id,
        target_date: target_date,
        direction: direction,
        forecast: forecast,
        generated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Demand prediction error:", error);
      res.status(500).json({
        error: "Failed to predict demand",
        message: error.message,
      });
    }
  }
);

// Calculate dynamic pricing
app.post(
  "/api/matching/dynamic-pricing",
  authenticateToken,
  async (req, res) => {
    try {
      const { base_price, target_date, direction } = req.body;

      if (!base_price || !target_date || !direction) {
        return res.status(400).json({
          error:
            "Missing required fields: base_price, target_date, and direction",
        });
      }

      const pricing = await mlMatchingService.calculateDynamicPrice(
        parseFloat(base_price),
        req.user.office_id,
        target_date,
        direction
      );

      res.json({
        office_id: req.user.office_id,
        target_date: target_date,
        direction: direction,
        pricing: pricing,
        calculated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Dynamic pricing error:", error);
      res.status(500).json({
        error: "Failed to calculate dynamic pricing",
        message: error.message,
      });
    }
  }
);

// Core matching algorithm - Two-phase approach
async function findPotentialMatches(
  trip,
  matchingRole,
  maxMatches,
  maxDetourKm,
  maxDetourMinutes
) {
  try {
    // Phase 1: Candidate Filtering
    const candidates = await findCandidates(trip, matchingRole);

    if (candidates.length === 0) {
      return [];
    }

    // Phase 2: Route Optimization and Ranking
    const rankedMatches = [];

    for (const candidate of candidates) {
      try {
        // Calculate route optimization
        const routeAnalysis = await analyzeRouteCompatibility(
          trip,
          candidate,
          maxDetourKm,
          maxDetourMinutes
        );

        if (routeAnalysis.isCompatible) {
          const matchScore = calculateMatchScore(
            trip,
            candidate,
            routeAnalysis
          );

          rankedMatches.push({
            trip_id: candidate._id.toString(),
            user_id: candidate.user_id,
            match_score: matchScore,
            route_analysis: routeAnalysis,
            trip_details: {
              trip_type: candidate.trip_type,
              direction: candidate.direction,
              departure_time: candidate.departure_time,
              origin_location: candidate.origin_location,
              destination_location: candidate.destination_location,
              max_passengers: candidate.max_passengers,
              cost_per_passenger: candidate.cost_per_passenger,
              notes: candidate.notes,
            },
          });
        }
      } catch (error) {
        console.error(`Error analyzing candidate ${candidate._id}:`, error);
      }
    }

    // Sort by match score (highest first) and limit results
    return rankedMatches
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, maxMatches);
  } catch (error) {
    console.error("Error in findPotentialMatches:", error);
    return [];
  }
}

// Phase 1: Find candidates using geospatial and temporal filtering
async function findCandidates(trip, matchingRole) {
  const maxDistance = 5000; // 5km in meters
  const timeWindow = 60 * 60 * 1000; // 1 hour in milliseconds

  const query = {
    office_id: trip.office_id,
    role: matchingRole,
    trip_type: trip.trip_type,
    direction: trip.direction,
    status: { $in: ["available", "seeking"] },
    user_id: { $ne: trip.user_id },
    departure_time: {
      $gte: new Date(trip.departure_time.getTime() - timeWindow),
      $lte: new Date(trip.departure_time.getTime() + timeWindow),
    },
  };

  // Add geospatial filtering for origin proximity
  if (trip.origin_location && trip.origin_location.coordinates) {
    query.origin_location = {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: trip.origin_location.coordinates,
        },
        $maxDistance: maxDistance,
      },
    };
  }

  return await db.collection("carpool_trips").find(query).toArray();
}

// Phase 2: Analyze route compatibility
async function analyzeRouteCompatibility(
  trip1,
  trip2,
  maxDetourKm,
  maxDetourMinutes
) {
  try {
    // Calculate direct route for trip1
    const directRoute = await calculateOptimalRoute(
      {
        lat: trip1.origin_location.coordinates[1],
        lng: trip1.origin_location.coordinates[0],
      },
      {
        lat: trip1.destination_location.coordinates[1],
        lng: trip1.destination_location.coordinates[0],
      },
      []
    );

    // Calculate route with trip2 as waypoints
    const waypointRoute = await calculateOptimalRoute(
      {
        lat: trip1.origin_location.coordinates[1],
        lng: trip1.origin_location.coordinates[0],
      },
      {
        lat: trip1.destination_location.coordinates[1],
        lng: trip1.destination_location.coordinates[0],
      },
      [
        {
          lat: trip2.origin_location.coordinates[1],
          lng: trip2.origin_location.coordinates[0],
        },
        {
          lat: trip2.destination_location.coordinates[1],
          lng: trip2.destination_location.coordinates[0],
        },
      ]
    );

    // Calculate detour metrics
    const detourDistance =
      waypointRoute.total_distance - directRoute.total_distance;
    const detourTime =
      waypointRoute.total_duration - directRoute.total_duration;

    const isCompatible =
      detourDistance <= maxDetourKm && detourTime <= maxDetourMinutes * 60;

    return {
      isCompatible,
      direct_route: directRoute,
      waypoint_route: waypointRoute,
      detour_distance_km: Math.round(detourDistance * 100) / 100,
      detour_time_minutes: Math.round((detourTime / 60) * 100) / 100,
      efficiency_ratio:
        directRoute.total_distance / waypointRoute.total_distance,
    };
  } catch (error) {
    console.error("Error in route analysis:", error);
    return {
      isCompatible: false,
      error: error.message,
    };
  }
}

// Calculate match score based on multiple factors
function calculateMatchScore(trip1, trip2, routeAnalysis) {
  let score = 0;

  // Time compatibility (0-30 points)
  const timeDiff = Math.abs(
    trip1.departure_time.getTime() - trip2.departure_time.getTime()
  );
  const timeScore = Math.max(0, 30 - timeDiff / (60 * 1000)); // Subtract 1 point per minute difference
  score += timeScore;

  // Route efficiency (0-25 points)
  const efficiencyScore = routeAnalysis.efficiency_ratio * 25;
  score += efficiencyScore;

  // Distance proximity (0-20 points)
  const originDistance = geolib.getDistance(
    {
      latitude: trip1.origin_location.coordinates[1],
      longitude: trip1.origin_location.coordinates[0],
    },
    {
      latitude: trip2.origin_location.coordinates[1],
      longitude: trip2.origin_location.coordinates[0],
    }
  );
  const distanceScore = Math.max(0, 20 - originDistance / 100); // Subtract 1 point per 100m
  score += distanceScore;

  // Detour penalty (0-15 points)
  const detourPenalty = Math.max(0, 15 - routeAnalysis.detour_distance_km);
  score += detourPenalty;

  // User reputation bonus (0-10 points)
  // This would be implemented when user reputation data is available
  const reputationScore = 5; // Default neutral score
  score += reputationScore;

  return Math.round(score * 100) / 100;
}

// Calculate optimal route using basic distance calculations
async function calculateOptimalRoute(origin, destination, waypoints = []) {
  try {
    // For development, use simple distance calculations
    // In production, this would integrate with mapping APIs like MapBox or OpenStreetMap

    let totalDistance = 0;
    let totalDuration = 0;
    const routePoints = [origin, ...waypoints, destination];

    // Calculate distance between consecutive points
    for (let i = 0; i < routePoints.length - 1; i++) {
      const distance = geolib.getDistance(
        { latitude: routePoints[i].lat, longitude: routePoints[i].lng },
        { latitude: routePoints[i + 1].lat, longitude: routePoints[i + 1].lng }
      );

      totalDistance += distance / 1000; // Convert to kilometers
      totalDuration += (distance / 1000) * 60; // Assume 1 km per minute average speed
    }

    return {
      total_distance: Math.round(totalDistance * 100) / 100,
      total_duration: Math.round(totalDuration),
      waypoints_count: waypoints.length,
      route_points: routePoints,
      calculation_method: "haversine_distance",
    };
  } catch (error) {
    console.error("Route calculation error:", error);
    throw new Error("Failed to calculate route");
  }
}

// Get matching statistics for a trip
async function getMatchingStatistics(trip) {
  try {
    const matchingRole = trip.role === "driver" ? "rider" : "driver";

    // Get all potential candidates
    const candidates = await findCandidates(trip, matchingRole);

    // Calculate proximity statistics
    const proximityStats = candidates.map((candidate) => {
      const distance = geolib.getDistance(
        {
          latitude: trip.origin_location.coordinates[1],
          longitude: trip.origin_location.coordinates[0],
        },
        {
          latitude: candidate.origin_location.coordinates[1],
          longitude: candidate.origin_location.coordinates[0],
        }
      );
      return distance / 1000; // Convert to km
    });

    return {
      total_candidates: candidates.length,
      average_distance_km:
        proximityStats.length > 0
          ? Math.round(
              (proximityStats.reduce((a, b) => a + b, 0) /
                proximityStats.length) *
                100
            ) / 100
          : 0,
      closest_match_km:
        proximityStats.length > 0 ? Math.min(...proximityStats) : null,
      furthest_match_km:
        proximityStats.length > 0 ? Math.max(...proximityStats) : null,
      time_window_matches: candidates.filter(
        (c) =>
          Math.abs(
            c.departure_time.getTime() - trip.departure_time.getTime()
          ) <=
          30 * 60 * 1000
      ).length,
    };
  } catch (error) {
    console.error("Error calculating statistics:", error);
    return {
      total_candidates: 0,
      error: error.message,
    };
  }
}

// Notify users about matches
async function notifyUsersAboutMatches(trip, matches) {
  try {
    for (const match of matches.slice(0, 3)) {
      // Notify about top 3 matches
      await axios.post(
        `http://localhost:${process.env.NOTIFICATION_SERVICE_PORT || 3005}/api/notifications`,
        {
          user_id: trip.user_id,
          type: "match_found",
          message: `Found a potential carpool match with ${match.match_score.toFixed(1)} compatibility score`,
          data: {
            trip_id: trip._id.toString(),
            match_trip_id: match.trip_id,
            match_score: match.match_score,
          },
        }
      );
    }
  } catch (error) {
    console.error("Error sending match notifications:", error);
  }
}

// Error handler
app.use((err, req, res, next) => {
  console.error("Matching Service Error:", err);
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
    console.log(`🚀 Matching Service running on http://localhost:${PORT}`);
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
