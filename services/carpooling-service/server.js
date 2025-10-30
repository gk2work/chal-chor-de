const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { MongoClient, ObjectId } = require("mongodb");
const Joi = require("joi");
const axios = require("axios");
const cron = require("node-cron");
const CalendarIntegrationService = require("./calendar-integration");
require("dotenv").config();

const app = express();
const PORT = process.env.CARPOOLING_SERVICE_PORT || 3002;
const calendarService = new CalendarIntegrationService();

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
const createTripSchema = Joi.object({
  trip_type: Joi.string().valid("offer", "request").required(),
  direction: Joi.string().valid("to_office", "from_office").required(),
  departure_time: Joi.date().iso().required(),
  origin_location: Joi.object({
    type: Joi.string().valid("Point").required(),
    coordinates: Joi.array().items(Joi.number()).length(2).required(),
    address: Joi.string().required(),
  }).required(),
  destination_location: Joi.object({
    type: Joi.string().valid("Point").required(),
    coordinates: Joi.array().items(Joi.number()).length(2).required(),
    address: Joi.string().required(),
  }).required(),
  max_passengers: Joi.number().integer().min(1).max(4).when("trip_type", {
    is: "offer",
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  cost_per_passenger: Joi.number().min(0).when("trip_type", {
    is: "offer",
    then: Joi.optional(),
    otherwise: Joi.forbidden(),
  }),
  notes: Joi.string().max(500).allow(""),
  recurring: Joi.object({
    enabled: Joi.boolean().default(false),
    days_of_week: Joi.array()
      .items(Joi.number().min(0).max(6))
      .when("enabled", {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    end_date: Joi.date().iso().when("enabled", {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  }).default({ enabled: false }),
});

const joinTripSchema = Joi.object({
  pickup_location: Joi.object({
    type: Joi.string().valid("Point").required(),
    coordinates: Joi.array().items(Joi.number()).length(2).required(),
    address: Joi.string().required(),
  }).optional(),
  dropoff_location: Joi.object({
    type: Joi.string().valid("Point").required(),
    coordinates: Joi.array().items(Joi.number()).length(2).required(),
    address: Joi.string().required(),
  }).optional(),
  notes: Joi.string().max(200).allow(""),
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
    return res
      .status(503)
      .json({ error: "Authentication service unavailable" });
  }
};

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "Carpooling Service",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Create a new trip (offer or request)
app.post("/api/carpooling/trips", authenticateToken, async (req, res) => {
  try {
    const { error, value } = createTripSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }

    const tripData = {
      ...value,
      office_id: req.user.office_id,
      user_id: req.user.user_id,
      status: value.trip_type === "offer" ? "available" : "seeking",
      participants: [],
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Set default values for optional fields
    if (value.trip_type === "offer" && !tripData.max_passengers) {
      tripData.max_passengers = 3;
    }

    if (!tripData.notes) {
      tripData.notes = "";
    }

    if (!tripData.recurring) {
      tripData.recurring = { enabled: false };
    }

    // Calculate estimated cost if not provided
    if (tripData.trip_type === "offer" && !tripData.cost_per_passenger) {
      const distance = calculateDistance(
        tripData.origin_location.coordinates[1], // latitude
        tripData.origin_location.coordinates[0], // longitude
        tripData.destination_location.coordinates[1], // latitude
        tripData.destination_location.coordinates[0] // longitude
      );
      tripData.cost_per_passenger = calculateCostPerRider(distance);
    }

    const result = await db.collection("carpool_trips").insertOne(tripData);

    // If recurring trip, create future instances
    if (tripData.recurring && tripData.recurring.enabled) {
      // For now, just log that recurring trips would be created
      // This can be implemented later as a separate background job
      console.log(`Recurring trip created: ${result.insertedId.toString()}`);
    }

    res.status(201).json({
      message: "Trip created successfully",
      trip_id: result.insertedId.toString(),
      trip: {
        ...tripData,
        trip_id: result.insertedId.toString(),
      },
    });
  } catch (error) {
    console.error("Create trip error:", error);
    res.status(500).json({
      error: "Failed to create trip",
      message: "An error occurred while creating the trip",
    });
  }
});

// Get available trips for matching
app.get(
  "/api/carpooling/trips/available",
  authenticateToken,
  async (req, res) => {
    try {
      const {
        direction,
        departure_date,
        origin_lat,
        origin_lng,
        dest_lat,
        dest_lng,
        max_distance = 5000, // meters
      } = req.query;

      const query = {
        office_id: req.user.office_id,
        status: "available",
        user_id: { $ne: req.user.user_id }, // Exclude own trips
      };

      // Add date filtering if provided
      if (departure_date) {
        query.departure_time = {
          $gte: new Date(departure_date + "T00:00:00.000Z"),
          $lt: new Date(departure_date + "T23:59:59.999Z"),
        };
      }

      if (direction) {
        query.direction = direction;
      }

      // Add geospatial filtering if coordinates provided
      if (origin_lat && origin_lng) {
        query.origin_location = {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [parseFloat(origin_lng), parseFloat(origin_lat)],
            },
            $maxDistance: parseInt(max_distance),
          },
        };
      }

      const trips = await db
        .collection("carpool_trips")
        .find(query)
        .sort({ departure_time: 1 })
        .limit(20)
        .toArray();

      // Get user details for each trip
      const tripsWithUserInfo = await Promise.all(
        trips.map(async (trip) => {
          try {
            const userResponse = await axios.get(
              `http://localhost:${process.env.USER_SERVICE_PORT || 3001}/api/users/profile`,
              {
                headers: {
                  Authorization: `Bearer ${req.headers.authorization.split(" ")[1]}`,
                },
              }
            );

            return {
              trip_id: trip._id.toString(),
              trip_type: trip.trip_type,
              direction: trip.direction,
              departure_time: trip.departure_time,
              origin_location: trip.origin_location,
              destination_location: trip.destination_location,
              max_passengers: trip.max_passengers,
              current_passengers: trip.participants.length,
              cost_per_passenger: trip.cost_per_passenger,
              notes: trip.notes,
              driver: {
                user_id: trip.user_id,
                full_name: userResponse.data.user.full_name,
                reputation_score: userResponse.data.user.reputation_score,
              },
              created_at: trip.created_at,
            };
          } catch (error) {
            console.error("Error fetching user info:", error.message);
            return {
              ...trip,
              trip_id: trip._id.toString(),
              driver: {
                user_id: trip.user_id,
                full_name: "Unknown User",
                reputation_score: 0,
              },
            };
          }
        })
      );

      res.json({
        trips: tripsWithUserInfo,
        total_count: tripsWithUserInfo.length,
        filters: {
          direction,
          departure_date,
          max_distance: parseInt(max_distance),
        },
      });
    } catch (error) {
      console.error("Get available trips error:", error);
      res.status(500).json({
        error: "Failed to fetch trips",
        message: "An error occurred while fetching available trips",
      });
    }
  }
);

// Join a trip
app.post(
  "/api/carpooling/trips/:trip_id/join",
  authenticateToken,
  async (req, res) => {
    try {
      const { trip_id } = req.params;
      const { error, value } = joinTripSchema.validate(req.body);

      if (error) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.details.map((detail) => detail.message),
        });
      }

      // Find the trip
      const trip = await db.collection("carpool_trips").findOne({
        _id: new ObjectId(trip_id),
        office_id: req.user.office_id,
      });

      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }

      // Check if user is the driver
      if (trip.user_id === req.user.user_id) {
        return res.status(400).json({ error: "Cannot join your own trip" });
      }

      // Check if trip is full
      if (trip.participants.length >= trip.max_passengers) {
        return res.status(400).json({ error: "Trip is full" });
      }

      // Check if user already joined
      const alreadyJoined = trip.participants.some(
        (p) => p.user_id === req.user.user_id
      );
      if (alreadyJoined) {
        return res.status(400).json({ error: "Already joined this trip" });
      }

      // Add participant
      const participant = {
        user_id: req.user.user_id,
        pickup_location: value.pickup_location || trip.origin_location,
        dropoff_location: value.dropoff_location || trip.destination_location,
        notes: value.notes || "",
        joined_at: new Date(),
        status: "confirmed",
      };

      await db.collection("carpool_trips").updateOne(
        { _id: new ObjectId(trip_id) },
        {
          $push: { participants: participant },
          $set: { updated_at: new Date() },
        }
      );

      // Send notification to driver (mock for now)
      console.log(
        `Notification: User ${req.user.user_id} joined trip ${trip_id}`
      );

      res.json({
        message: "Successfully joined the trip",
        trip_id: trip_id,
        participant: participant,
      });
    } catch (error) {
      console.error("Join trip error:", error);
      res.status(500).json({
        error: "Failed to join trip",
        message: "An error occurred while joining the trip",
      });
    }
  }
);

// Get user's trips
app.get(
  "/api/carpooling/trips/my-trips",
  authenticateToken,
  async (req, res) => {
    try {
      const { status, direction, page = 1, limit = 10 } = req.query;

      const query = {
        office_id: req.user.office_id,
        $or: [
          { user_id: req.user.user_id }, // Trips created by user
          { "participants.user_id": req.user.user_id }, // Trips joined by user
        ],
      };

      if (status) {
        query.status = status;
      }

      if (direction) {
        query.direction = direction;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const trips = await db
        .collection("carpool_trips")
        .find(query)
        .sort({ departure_time: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

      const totalCount = await db
        .collection("carpool_trips")
        .countDocuments(query);

      const tripsWithDetails = trips.map((trip) => ({
        trip_id: trip._id.toString(),
        trip_type: trip.trip_type,
        direction: trip.direction,
        departure_time: trip.departure_time,
        origin_location: trip.origin_location,
        destination_location: trip.destination_location,
        max_passengers: trip.max_passengers,
        current_passengers: trip.participants.length,
        cost_per_passenger: trip.cost_per_passenger,
        notes: trip.notes,
        status: trip.status,
        is_driver: trip.user_id === req.user.user_id,
        participants: trip.participants,
        created_at: trip.created_at,
        updated_at: trip.updated_at,
      }));

      res.json({
        trips: tripsWithDetails,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalCount / parseInt(limit)),
          total_count: totalCount,
          per_page: parseInt(limit),
        },
      });
    } catch (error) {
      console.error("Get my trips error:", error);
      res.status(500).json({
        error: "Failed to fetch trips",
        message: "An error occurred while fetching your trips",
      });
    }
  }
);

// Cancel a trip
app.delete(
  "/api/carpooling/trips/:trip_id",
  authenticateToken,
  async (req, res) => {
    try {
      const { trip_id } = req.params;

      const trip = await db.collection("carpool_trips").findOne({
        _id: new ObjectId(trip_id),
        office_id: req.user.office_id,
        user_id: req.user.user_id, // Only trip creator can cancel
      });

      if (!trip) {
        return res
          .status(404)
          .json({ error: "Trip not found or unauthorized" });
      }

      // Update trip status to cancelled
      await db.collection("carpool_trips").updateOne(
        { _id: new ObjectId(trip_id) },
        {
          $set: {
            status: "cancelled",
            updated_at: new Date(),
          },
        }
      );

      // Notify participants (mock for now)
      trip.participants.forEach((participant) => {
        console.log(
          `Notification: Trip ${trip_id} cancelled for user ${participant.user_id}`
        );
      });

      res.json({
        message: "Trip cancelled successfully",
        trip_id: trip_id,
      });
    } catch (error) {
      console.error("Cancel trip error:", error);
      res.status(500).json({
        error: "Failed to cancel trip",
        message: "An error occurred while cancelling the trip",
      });
    }
  }
);

// Calendar Integration Endpoints

// Get calendar events
app.post(
  "/api/carpooling/calendar/events",
  authenticateToken,
  async (req, res) => {
    try {
      const { provider, access_token, start_date, end_date } = req.body;

      if (!provider || !access_token) {
        return res.status(400).json({
          error: "Missing required fields: provider and access_token",
        });
      }

      const startDate = start_date ? new Date(start_date) : new Date();
      const endDate = end_date
        ? new Date(end_date)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      const events = await calendarService.getCalendarEvents(
        provider,
        access_token,
        startDate,
        endDate
      );

      res.json({
        events: events,
        count: events.length,
        date_range: {
          start: startDate,
          end: endDate,
        },
      });
    } catch (error) {
      console.error("Get calendar events error:", error);
      res.status(500).json({
        error: "Failed to fetch calendar events",
        message: error.message,
      });
    }
  }
);

// Check availability for a proposed trip time
app.post(
  "/api/carpooling/calendar/check-availability",
  authenticateToken,
  async (req, res) => {
    try {
      const { provider, access_token, proposed_time, time_window } = req.body;

      if (!provider || !access_token || !proposed_time) {
        return res.status(400).json({
          error:
            "Missing required fields: provider, access_token, and proposed_time",
        });
      }

      const proposedDate = new Date(proposed_time);
      const windowMinutes = time_window || 60;

      // Get events around the proposed time
      const startDate = new Date(proposedDate.getTime() - 2 * 60 * 60 * 1000);
      const endDate = new Date(proposedDate.getTime() + 2 * 60 * 60 * 1000);

      const events = await calendarService.getCalendarEvents(
        provider,
        access_token,
        startDate,
        endDate
      );

      const availability = calendarService.detectAvailability(
        events,
        proposedDate,
        windowMinutes
      );

      res.json({
        proposed_time: proposedDate,
        time_window_minutes: windowMinutes,
        availability: availability,
      });
    } catch (error) {
      console.error("Check availability error:", error);
      res.status(500).json({
        error: "Failed to check availability",
        message: error.message,
      });
    }
  }
);

// Generate automatic trip suggestions based on calendar
app.post(
  "/api/carpooling/calendar/suggest-trips",
  authenticateToken,
  async (req, res) => {
    try {
      const {
        provider,
        access_token,
        office_location,
        home_location,
        days_ahead,
      } = req.body;

      if (!provider || !access_token || !office_location) {
        return res.status(400).json({
          error:
            "Missing required fields: provider, access_token, and office_location",
        });
      }

      const daysToCheck = days_ahead || 7;
      const startDate = new Date();
      const endDate = new Date(Date.now() + daysToCheck * 24 * 60 * 60 * 1000);

      // Get calendar events
      const events = await calendarService.getCalendarEvents(
        provider,
        access_token,
        startDate,
        endDate
      );

      // Generate trip suggestions
      const suggestions = await calendarService.generateTripSuggestions(
        events,
        office_location,
        home_location
      );

      res.json({
        suggestions: suggestions,
        total_suggestions: suggestions.length,
        date_range: {
          start: startDate,
          end: endDate,
        },
        events_analyzed: events.length,
      });
    } catch (error) {
      console.error("Generate trip suggestions error:", error);
      res.status(500).json({
        error: "Failed to generate trip suggestions",
        message: error.message,
      });
    }
  }
);

// Check for meeting conflicts with a trip
app.post(
  "/api/carpooling/calendar/check-conflicts",
  authenticateToken,
  async (req, res) => {
    try {
      const { provider, access_token, departure_time, estimated_duration } =
        req.body;

      if (!provider || !access_token || !departure_time) {
        return res.status(400).json({
          error:
            "Missing required fields: provider, access_token, and departure_time",
        });
      }

      const departureDate = new Date(departure_time);
      const duration = estimated_duration || 60; // Default 60 minutes

      const conflictCheck = await calendarService.checkMeetingConflicts(
        provider,
        access_token,
        departureDate,
        duration
      );

      res.json({
        departure_time: departureDate,
        estimated_duration: duration,
        conflict_check: conflictCheck,
      });
    } catch (error) {
      console.error("Check conflicts error:", error);
      res.status(500).json({
        error: "Failed to check meeting conflicts",
        message: error.message,
      });
    }
  }
);

// Helper function to calculate estimated cost
async function calculateEstimatedCost(origin, destination) {
  try {
    // Simple distance-based calculation (in a real app, use mapping service)
    const distance = calculateDistance(
      origin.coordinates[1],
      origin.coordinates[0],
      destination.coordinates[1],
      destination.coordinates[0]
    );

    // Base cost calculation: $0.50 per km + base fee
    const costPerKm = 0.5;
    const baseFee = 2.0;
    const estimatedCost = Math.max(baseFee, distance * costPerKm);

    return Math.round(estimatedCost * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error("Cost calculation error:", error);
    return 5.0; // Default cost
  }
}

// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper function to calculate cost per rider based on distance
function calculateCostPerRider(distanceKm) {
  const baseFee = parseFloat(process.env.BASE_TRIP_FEE) || 2.0;
  const costPerKm = parseFloat(process.env.DEFAULT_COST_PER_KM) || 0.5;

  // Calculate total cost: base fee + (distance * cost per km)
  const totalCost = baseFee + distanceKm * costPerKm;

  // Round to 2 decimal places
  return Math.round(totalCost * 100) / 100;
}

// Helper function to create recurring trips
async function createRecurringTrips(tripData, originalTripId) {
  try {
    const { recurring, departure_time } = tripData;
    const startDate = new Date(departure_time);
    const endDate = new Date(recurring.end_date);
    const recurringTrips = [];

    let currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + 1); // Start from next day

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();

      if (recurring.days_of_week.includes(dayOfWeek)) {
        const recurringTrip = {
          ...tripData,
          departure_time: new Date(currentDate),
          parent_trip_id: originalTripId.toString(),
          participants: [],
          created_at: new Date(),
          updated_at: new Date(),
        };

        delete recurringTrip._id;
        recurringTrips.push(recurringTrip);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (recurringTrips.length > 0) {
      await db.collection("carpool_trips").insertMany(recurringTrips);
      console.log(`Created ${recurringTrips.length} recurring trips`);
    }
  } catch (error) {
    console.error("Error creating recurring trips:", error);
  }
}

// Cron job to clean up old trips (runs daily at midnight)
cron.schedule("0 0 * * *", async () => {
  try {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const result = await db.collection("carpool_trips").updateMany(
      {
        departure_time: { $lt: oneDayAgo },
        status: "active",
      },
      {
        $set: {
          status: "completed",
          updated_at: new Date(),
        },
      }
    );

    console.log(`Updated ${result.modifiedCount} trips to completed status`);
  } catch (error) {
    console.error("Cron job error:", error);
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Carpooling Service Error:", err);
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
    console.log(`🚀 Carpooling Service running on http://localhost:${PORT}`);
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
