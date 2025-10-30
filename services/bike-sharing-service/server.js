const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const multer = require("multer");
const { MongoClient, ObjectId } = require("mongodb");
const Joi = require("joi");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.BIKE_SHARING_SERVICE_PORT || 3008;

// MongoDB connection
let db;
const mongoClient = new MongoClient(process.env.MONGODB_URI);

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await mongoClient.connect();
    db = mongoClient.db(process.env.MONGODB_DB_NAME || "officeshare_dev");
    console.log("✅ Connected to MongoDB");

    // Create indexes for bike listings
    await db.collection("bike_listings").createIndex({ office_id: 1 });
    await db.collection("bike_listings").createIndex({ owner_id: 1 });
    await db.collection("bike_listings").createIndex({
      location: "2dsphere",
    });
    await db.collection("bike_listings").createIndex({
      office_id: 1,
      available: 1,
    });

    // Create indexes for bike bookings
    await db.collection("bike_bookings").createIndex({ office_id: 1 });
    await db.collection("bike_bookings").createIndex({ listing_id: 1 });
    await db.collection("bike_bookings").createIndex({ borrower_id: 1 });
    await db.collection("bike_bookings").createIndex({
      office_id: 1,
      status: 1,
    });

    console.log("✅ Database indexes created");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
}

// Configure multer for photo uploads (in-memory storage for development)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

// Validation schemas
const createBikeListingSchema = Joi.object({
  bike_type: Joi.string()
    .valid("mountain", "road", "hybrid", "electric", "city", "folding")
    .required(),
  brand: Joi.string().max(50).required(),
  model: Joi.string().max(50).required(),
  description: Joi.string().max(500).required(),
  location: Joi.object({
    type: Joi.string().valid("Point").required(),
    coordinates: Joi.array().items(Joi.number()).length(2).required(),
    address: Joi.string().required(),
  }).required(),
  features: Joi.array()
    .items(
      Joi.string().valid(
        "helmet_included",
        "lock_included",
        "lights",
        "basket",
        "gears",
        "electric_assist",
        "adjustable_seat",
        "phone_mount"
      )
    )
    .default([]),
  condition: Joi.string().valid("excellent", "good", "fair").required(),
  size: Joi.string().valid("xs", "s", "m", "l", "xl").required(),
  availability_schedule: Joi.object({
    monday: Joi.array()
      .items(
        Joi.object({
          start_time: Joi.string()
            .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .required(),
          end_time: Joi.string()
            .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .required(),
        })
      )
      .default([]),
    tuesday: Joi.array()
      .items(
        Joi.object({
          start_time: Joi.string()
            .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .required(),
          end_time: Joi.string()
            .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .required(),
        })
      )
      .default([]),
    wednesday: Joi.array()
      .items(
        Joi.object({
          start_time: Joi.string()
            .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .required(),
          end_time: Joi.string()
            .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .required(),
        })
      )
      .default([]),
    thursday: Joi.array()
      .items(
        Joi.object({
          start_time: Joi.string()
            .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .required(),
          end_time: Joi.string()
            .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .required(),
        })
      )
      .default([]),
    friday: Joi.array()
      .items(
        Joi.object({
          start_time: Joi.string()
            .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .required(),
          end_time: Joi.string()
            .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .required(),
        })
      )
      .default([]),
    saturday: Joi.array()
      .items(
        Joi.object({
          start_time: Joi.string()
            .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .required(),
          end_time: Joi.string()
            .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .required(),
        })
      )
      .default([]),
    sunday: Joi.array()
      .items(
        Joi.object({
          start_time: Joi.string()
            .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .required(),
          end_time: Joi.string()
            .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .required(),
        })
      )
      .default([]),
  }).default({}),
  special_instructions: Joi.string().max(300).allow("").default(""),
  smart_lock_info: Joi.object({
    has_smart_lock: Joi.boolean().default(false),
    lock_type: Joi.string().when("has_smart_lock", {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    instructions: Joi.string().when("has_smart_lock", {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  }).default({ has_smart_lock: false }),
});

const createBookingSchema = Joi.object({
  start_time: Joi.date().iso().min("now").required(),
  end_time: Joi.date().iso().greater(Joi.ref("start_time")).required(),
  purpose: Joi.string().max(200).required(),
  pickup_location: Joi.object({
    type: Joi.string().valid("Point").required(),
    coordinates: Joi.array().items(Joi.number()).length(2).required(),
    address: Joi.string().required(),
  }).optional(),
  return_location: Joi.object({
    type: Joi.string().valid("Point").required(),
    coordinates: Joi.array().items(Joi.number()).length(2).required(),
    address: Joi.string().required(),
  }).optional(),
  notes: Joi.string().max(300).allow("").default(""),
});

const checkInOutSchema = Joi.object({
  action: Joi.string().valid("check_in", "check_out").required(),
  location: Joi.object({
    type: Joi.string().valid("Point").required(),
    coordinates: Joi.array().items(Joi.number()).length(2).required(),
    address: Joi.string().required(),
  }).required(),
  condition_notes: Joi.string().max(500).allow("").default(""),
  damage_reported: Joi.boolean().default(false),
  damage_description: Joi.string().when("damage_reported", {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
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
    service: "Bike Sharing Service",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Create a new bike listing
app.post(
  "/api/bike-sharing/listings",
  authenticateToken,
  upload.array("photos", 5),
  async (req, res) => {
    try {
      const { error, value } = createBikeListingSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.details.map((detail) => detail.message),
        });
      }

      // Process uploaded photos (for development, we'll store as base64)
      const photos = [];
      if (req.files && req.files.length > 0) {
        req.files.forEach((file, index) => {
          photos.push({
            filename: `bike_${Date.now()}_${index}.${file.mimetype.split("/")[1]}`,
            data: file.buffer.toString("base64"),
            mimetype: file.mimetype,
            size: file.size,
            uploaded_at: new Date(),
          });
        });
      }

      const listingData = {
        ...value,
        office_id: req.user.office_id,
        owner_id: req.user.user_id,
        photos: photos,
        available: true,
        total_bookings: 0,
        rating_average: 0,
        rating_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = await db
        .collection("bike_listings")
        .insertOne(listingData);

      res.status(201).json({
        message: "Bike listing created successfully",
        listing_id: result.insertedId.toString(),
        listing: {
          ...listingData,
          listing_id: result.insertedId.toString(),
          photos: photos.map((photo) => ({
            filename: photo.filename,
            mimetype: photo.mimetype,
            size: photo.size,
            uploaded_at: photo.uploaded_at,
          })), // Don't return base64 data in response
        },
      });
    } catch (error) {
      console.error("Create bike listing error:", error);
      res.status(500).json({
        error: "Failed to create bike listing",
        message: "An error occurred while creating the bike listing",
      });
    }
  }
);

// Get available bike listings with location-based filtering
app.get(
  "/api/bike-sharing/listings/available",
  authenticateToken,
  async (req, res) => {
    try {
      const {
        bike_type,
        lat,
        lng,
        max_distance = 5000, // meters
        start_time,
        end_time,
        features,
        condition,
        size,
        page = 1,
        limit = 20,
      } = req.query;

      const query = {
        office_id: req.user.office_id,
        available: true,
        owner_id: { $ne: req.user.user_id }, // Exclude own bikes
      };

      // Add filters
      if (bike_type) {
        query.bike_type = bike_type;
      }

      if (condition) {
        query.condition = condition;
      }

      if (size) {
        query.size = size;
      }

      if (features) {
        const featureArray = Array.isArray(features) ? features : [features];
        query.features = { $in: featureArray };
      }

      // Add geospatial filtering if coordinates provided
      if (lat && lng) {
        query.location = {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [parseFloat(lng), parseFloat(lat)],
            },
            $maxDistance: parseInt(max_distance),
          },
        };
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const listings = await db
        .collection("bike_listings")
        .find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

      const totalCount = await db
        .collection("bike_listings")
        .countDocuments(query);

      // Check availability for specific time slots if provided
      let availableListings = listings;
      if (start_time && end_time) {
        availableListings = await Promise.all(
          listings.map(async (listing) => {
            const isAvailable = await checkBikeAvailability(
              listing._id.toString(),
              new Date(start_time),
              new Date(end_time)
            );
            return isAvailable ? listing : null;
          })
        );
        availableListings = availableListings.filter(
          (listing) => listing !== null
        );
      }

      // Get owner details for each listing
      const listingsWithOwnerInfo = await Promise.all(
        availableListings.map(async (listing) => {
          try {
            const userResponse = await axios.get(
              `http://localhost:${process.env.USER_SERVICE_PORT || 3001}/api/users/${listing.owner_id}`,
              {
                headers: {
                  Authorization: `Bearer ${req.headers.authorization.split(" ")[1]}`,
                },
              }
            );

            return {
              listing_id: listing._id.toString(),
              bike_type: listing.bike_type,
              brand: listing.brand,
              model: listing.model,
              description: listing.description,
              location: listing.location,
              features: listing.features,
              condition: listing.condition,
              size: listing.size,
              availability_schedule: listing.availability_schedule,
              special_instructions: listing.special_instructions,
              smart_lock_info: listing.smart_lock_info,
              photos: listing.photos.map((photo) => ({
                filename: photo.filename,
                mimetype: photo.mimetype,
                size: photo.size,
              })),
              rating_average: listing.rating_average,
              rating_count: listing.rating_count,
              total_bookings: listing.total_bookings,
              owner: {
                user_id: listing.owner_id,
                full_name: userResponse.data.user.full_name,
                reputation_score: userResponse.data.user.reputation_score,
              },
              created_at: listing.created_at,
            };
          } catch (error) {
            console.error("Error fetching owner info:", error.message);
            return {
              ...listing,
              listing_id: listing._id.toString(),
              owner: {
                user_id: listing.owner_id,
                full_name: "Unknown User",
                reputation_score: 0,
              },
            };
          }
        })
      );

      res.json({
        listings: listingsWithOwnerInfo,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalCount / parseInt(limit)),
          total_count: totalCount,
          per_page: parseInt(limit),
        },
        filters: {
          bike_type,
          max_distance: parseInt(max_distance),
          start_time,
          end_time,
          features,
          condition,
          size,
        },
      });
    } catch (error) {
      console.error("Get available bike listings error:", error);
      res.status(500).json({
        error: "Failed to fetch bike listings",
        message: "An error occurred while fetching available bike listings",
      });
    }
  }
);

// Get a specific bike listing with photos
app.get(
  "/api/bike-sharing/listings/:listing_id",
  authenticateToken,
  async (req, res) => {
    try {
      const { listing_id } = req.params;

      const listing = await db.collection("bike_listings").findOne({
        _id: new ObjectId(listing_id),
        office_id: req.user.office_id,
      });

      if (!listing) {
        return res.status(404).json({ error: "Bike listing not found" });
      }

      // Get owner details
      try {
        const userResponse = await axios.get(
          `http://localhost:${process.env.USER_SERVICE_PORT || 3001}/api/users/${listing.owner_id}`,
          {
            headers: {
              Authorization: `Bearer ${req.headers.authorization.split(" ")[1]}`,
            },
          }
        );

        const listingWithDetails = {
          listing_id: listing._id.toString(),
          bike_type: listing.bike_type,
          brand: listing.brand,
          model: listing.model,
          description: listing.description,
          location: listing.location,
          features: listing.features,
          condition: listing.condition,
          size: listing.size,
          availability_schedule: listing.availability_schedule,
          special_instructions: listing.special_instructions,
          smart_lock_info: listing.smart_lock_info,
          photos: listing.photos, // Include full photo data for detail view
          rating_average: listing.rating_average,
          rating_count: listing.rating_count,
          total_bookings: listing.total_bookings,
          available: listing.available,
          owner: {
            user_id: listing.owner_id,
            full_name: userResponse.data.user.full_name,
            reputation_score: userResponse.data.user.reputation_score,
          },
          created_at: listing.created_at,
          updated_at: listing.updated_at,
        };

        res.json({ listing: listingWithDetails });
      } catch (error) {
        console.error("Error fetching owner info:", error.message);
        res.json({
          listing: {
            ...listing,
            listing_id: listing._id.toString(),
            owner: {
              user_id: listing.owner_id,
              full_name: "Unknown User",
              reputation_score: 0,
            },
          },
        });
      }
    } catch (error) {
      console.error("Get bike listing error:", error);
      res.status(500).json({
        error: "Failed to fetch bike listing",
        message: "An error occurred while fetching the bike listing",
      });
    }
  }
);

// Helper function to check bike availability for a specific time period
async function checkBikeAvailability(listingId, startTime, endTime) {
  try {
    // Check for conflicting bookings
    const conflictingBookings = await db.collection("bike_bookings").findOne({
      listing_id: listingId,
      status: { $in: ["pending", "approved", "active"] },
      $or: [
        {
          start_time: { $lt: endTime },
          end_time: { $gt: startTime },
        },
      ],
    });

    return !conflictingBookings;
  } catch (error) {
    console.error("Error checking bike availability:", error);
    return false;
  }
}

// Get user's own bike listings
app.get(
  "/api/bike-sharing/listings/my-listings",
  authenticateToken,
  async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;

      const query = {
        office_id: req.user.office_id,
        owner_id: req.user.user_id,
      };

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const listings = await db
        .collection("bike_listings")
        .find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

      const totalCount = await db
        .collection("bike_listings")
        .countDocuments(query);

      const listingsWithDetails = listings.map((listing) => ({
        listing_id: listing._id.toString(),
        bike_type: listing.bike_type,
        brand: listing.brand,
        model: listing.model,
        description: listing.description,
        location: listing.location,
        features: listing.features,
        condition: listing.condition,
        size: listing.size,
        availability_schedule: listing.availability_schedule,
        special_instructions: listing.special_instructions,
        smart_lock_info: listing.smart_lock_info,
        photos: listing.photos.map((photo) => ({
          filename: photo.filename,
          mimetype: photo.mimetype,
          size: photo.size,
        })),
        rating_average: listing.rating_average,
        rating_count: listing.rating_count,
        total_bookings: listing.total_bookings,
        available: listing.available,
        created_at: listing.created_at,
        updated_at: listing.updated_at,
      }));

      res.json({
        listings: listingsWithDetails,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalCount / parseInt(limit)),
          total_count: totalCount,
          per_page: parseInt(limit),
        },
      });
    } catch (error) {
      console.error("Get my bike listings error:", error);
      res.status(500).json({
        error: "Failed to fetch bike listings",
        message: "An error occurred while fetching your bike listings",
      });
    }
  }
);

// Update bike listing availability
app.patch(
  "/api/bike-sharing/listings/:listing_id/availability",
  authenticateToken,
  async (req, res) => {
    try {
      const { listing_id } = req.params;
      const { available } = req.body;

      if (typeof available !== "boolean") {
        return res
          .status(400)
          .json({ error: "Available must be a boolean value" });
      }

      const result = await db.collection("bike_listings").updateOne(
        {
          _id: new ObjectId(listing_id),
          office_id: req.user.office_id,
          owner_id: req.user.user_id,
        },
        {
          $set: {
            available: available,
            updated_at: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        return res
          .status(404)
          .json({ error: "Bike listing not found or unauthorized" });
      }

      res.json({
        message: "Bike availability updated successfully",
        listing_id: listing_id,
        available: available,
      });
    } catch (error) {
      console.error("Update bike availability error:", error);
      res.status(500).json({
        error: "Failed to update bike availability",
        message: "An error occurred while updating bike availability",
      });
    }
  }
);

// Error handler
app.use((err, req, res, next) => {
  console.error("Bike Sharing Service Error:", err);
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
    console.log(`🚀 Bike Sharing Service running on http://localhost:${PORT}`);
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
// Create a booking request
app.post("/api/bike-sharing/bookings", authenticateToken, async (req, res) => {
  try {
    const { listing_id, ...bookingData } = req.body;
    const { error, value } = createBookingSchema.validate(bookingData);

    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }

    if (!listing_id) {
      return res.status(400).json({ error: "Listing ID is required" });
    }

    // Check if listing exists and is available
    const listing = await db.collection("bike_listings").findOne({
      _id: new ObjectId(listing_id),
      office_id: req.user.office_id,
      available: true,
    });

    if (!listing) {
      return res
        .status(404)
        .json({ error: "Bike listing not found or unavailable" });
    }

    // Check if user is trying to book their own bike
    if (listing.owner_id === req.user.user_id) {
      return res.status(400).json({ error: "Cannot book your own bike" });
    }

    // Check availability for the requested time period
    const isAvailable = await checkBikeAvailability(
      listing_id,
      new Date(value.start_time),
      new Date(value.end_time)
    );

    if (!isAvailable) {
      return res
        .status(409)
        .json({ error: "Bike is not available for the requested time period" });
    }

    const booking = {
      listing_id: listing_id,
      office_id: req.user.office_id,
      borrower_id: req.user.user_id,
      owner_id: listing.owner_id,
      start_time: new Date(value.start_time),
      end_time: new Date(value.end_time),
      purpose: value.purpose,
      pickup_location: value.pickup_location || listing.location,
      return_location: value.return_location || listing.location,
      notes: value.notes,
      status: "pending",
      waiver_accepted: false,
      check_in_data: null,
      check_out_data: null,
      damage_reports: [],
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await db.collection("bike_bookings").insertOne(booking);

    // Send notification to bike owner (mock for now)
    console.log(
      `Notification: New booking request for bike ${listing_id} from user ${req.user.user_id}`
    );

    res.status(201).json({
      message: "Booking request created successfully",
      booking_id: result.insertedId.toString(),
      booking: {
        ...booking,
        booking_id: result.insertedId.toString(),
      },
    });
  } catch (error) {
    console.error("Create booking error:", error);
    res.status(500).json({
      error: "Failed to create booking",
      message: "An error occurred while creating the booking request",
    });
  }
});

// Approve or deny a booking request (bike owner only)
app.patch(
  "/api/bike-sharing/bookings/:booking_id/status",
  authenticateToken,
  async (req, res) => {
    try {
      const { booking_id } = req.params;
      const { status, rejection_reason } = req.body;

      if (!["approved", "denied"].includes(status)) {
        return res
          .status(400)
          .json({ error: "Status must be 'approved' or 'denied'" });
      }

      const booking = await db.collection("bike_bookings").findOne({
        _id: new ObjectId(booking_id),
        office_id: req.user.office_id,
        owner_id: req.user.user_id, // Only owner can approve/deny
        status: "pending",
      });

      if (!booking) {
        return res
          .status(404)
          .json({ error: "Booking not found or unauthorized" });
      }

      const updateData = {
        status: status,
        updated_at: new Date(),
      };

      if (status === "denied" && rejection_reason) {
        updateData.rejection_reason = rejection_reason;
      }

      await db
        .collection("bike_bookings")
        .updateOne({ _id: new ObjectId(booking_id) }, { $set: updateData });

      // Send notification to borrower (mock for now)
      console.log(
        `Notification: Booking ${booking_id} ${status} for user ${booking.borrower_id}`
      );

      res.json({
        message: `Booking ${status} successfully`,
        booking_id: booking_id,
        status: status,
      });
    } catch (error) {
      console.error("Update booking status error:", error);
      res.status(500).json({
        error: "Failed to update booking status",
        message: "An error occurred while updating the booking status",
      });
    }
  }
);

// Accept waiver for approved booking
app.post(
  "/api/bike-sharing/bookings/:booking_id/accept-waiver",
  authenticateToken,
  async (req, res) => {
    try {
      const { booking_id } = req.params;

      const booking = await db.collection("bike_bookings").findOne({
        _id: new ObjectId(booking_id),
        office_id: req.user.office_id,
        borrower_id: req.user.user_id,
        status: "approved",
      });

      if (!booking) {
        return res
          .status(404)
          .json({ error: "Approved booking not found or unauthorized" });
      }

      if (booking.waiver_accepted) {
        return res.status(400).json({ error: "Waiver already accepted" });
      }

      await db.collection("bike_bookings").updateOne(
        { _id: new ObjectId(booking_id) },
        {
          $set: {
            waiver_accepted: true,
            waiver_accepted_at: new Date(),
            updated_at: new Date(),
          },
        }
      );

      res.json({
        message: "Waiver accepted successfully",
        booking_id: booking_id,
      });
    } catch (error) {
      console.error("Accept waiver error:", error);
      res.status(500).json({
        error: "Failed to accept waiver",
        message: "An error occurred while accepting the waiver",
      });
    }
  }
);

// Check-out bike (start rental)
app.post(
  "/api/bike-sharing/bookings/:booking_id/check-out",
  authenticateToken,
  upload.array("photos", 3),
  async (req, res) => {
    try {
      const { booking_id } = req.params;
      const { error, value } = checkInOutSchema.validate({
        ...req.body,
        action: "check_out",
      });

      if (error) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.details.map((detail) => detail.message),
        });
      }

      const booking = await db.collection("bike_bookings").findOne({
        _id: new ObjectId(booking_id),
        office_id: req.user.office_id,
        borrower_id: req.user.user_id,
        status: "approved",
        waiver_accepted: true,
      });

      if (!booking) {
        return res
          .status(404)
          .json({
            error:
              "Approved booking not found, unauthorized, or waiver not accepted",
          });
      }

      if (booking.check_out_data) {
        return res.status(400).json({ error: "Bike already checked out" });
      }

      // Process check-out photos
      const photos = [];
      if (req.files && req.files.length > 0) {
        req.files.forEach((file, index) => {
          photos.push({
            filename: `checkout_${booking_id}_${Date.now()}_${index}.${file.mimetype.split("/")[1]}`,
            data: file.buffer.toString("base64"),
            mimetype: file.mimetype,
            size: file.size,
            uploaded_at: new Date(),
          });
        });
      }

      const checkOutData = {
        timestamp: new Date(),
        location: value.location,
        condition_notes: value.condition_notes,
        damage_reported: value.damage_reported,
        damage_description: value.damage_description,
        photos: photos,
      };

      await db.collection("bike_bookings").updateOne(
        { _id: new ObjectId(booking_id) },
        {
          $set: {
            status: "active",
            check_out_data: checkOutData,
            updated_at: new Date(),
          },
        }
      );

      // Send notification to owner (mock for now)
      console.log(`Notification: Bike checked out for booking ${booking_id}`);

      res.json({
        message: "Bike checked out successfully",
        booking_id: booking_id,
        check_out_data: {
          ...checkOutData,
          photos: photos.map((photo) => ({
            filename: photo.filename,
            mimetype: photo.mimetype,
            size: photo.size,
            uploaded_at: photo.uploaded_at,
          })),
        },
      });
    } catch (error) {
      console.error("Check-out bike error:", error);
      res.status(500).json({
        error: "Failed to check out bike",
        message: "An error occurred while checking out the bike",
      });
    }
  }
);

// Check-in bike (end rental)
app.post(
  "/api/bike-sharing/bookings/:booking_id/check-in",
  authenticateToken,
  upload.array("photos", 3),
  async (req, res) => {
    try {
      const { booking_id } = req.params;
      const { error, value } = checkInOutSchema.validate({
        ...req.body,
        action: "check_in",
      });

      if (error) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.details.map((detail) => detail.message),
        });
      }

      const booking = await db.collection("bike_bookings").findOne({
        _id: new ObjectId(booking_id),
        office_id: req.user.office_id,
        borrower_id: req.user.user_id,
        status: "active",
      });

      if (!booking) {
        return res
          .status(404)
          .json({ error: "Active booking not found or unauthorized" });
      }

      if (booking.check_in_data) {
        return res.status(400).json({ error: "Bike already checked in" });
      }

      // Process check-in photos
      const photos = [];
      if (req.files && req.files.length > 0) {
        req.files.forEach((file, index) => {
          photos.push({
            filename: `checkin_${booking_id}_${Date.now()}_${index}.${file.mimetype.split("/")[1]}`,
            data: file.buffer.toString("base64"),
            mimetype: file.mimetype,
            size: file.size,
            uploaded_at: new Date(),
          });
        });
      }

      const checkInData = {
        timestamp: new Date(),
        location: value.location,
        condition_notes: value.condition_notes,
        damage_reported: value.damage_reported,
        damage_description: value.damage_description,
        photos: photos,
      };

      // Update booking status
      const updateData = {
        status: "completed",
        check_in_data: checkInData,
        updated_at: new Date(),
      };

      // If damage reported, add to damage reports
      if (value.damage_reported) {
        updateData.$push = {
          damage_reports: {
            reported_by: req.user.user_id,
            description: value.damage_description,
            photos: photos,
            reported_at: new Date(),
            status: "pending_review",
          },
        };
      }

      await db
        .collection("bike_bookings")
        .updateOne({ _id: new ObjectId(booking_id) }, { $set: updateData });

      // Update bike listing total bookings
      await db
        .collection("bike_listings")
        .updateOne(
          { _id: new ObjectId(booking.listing_id) },
          { $inc: { total_bookings: 1 } }
        );

      // Send notification to owner (mock for now)
      console.log(
        `Notification: Bike checked in for booking ${booking_id}${value.damage_reported ? " with damage reported" : ""}`
      );

      res.json({
        message: "Bike checked in successfully",
        booking_id: booking_id,
        check_in_data: {
          ...checkInData,
          photos: photos.map((photo) => ({
            filename: photo.filename,
            mimetype: photo.mimetype,
            size: photo.size,
            uploaded_at: photo.uploaded_at,
          })),
        },
      });
    } catch (error) {
      console.error("Check-in bike error:", error);
      res.status(500).json({
        error: "Failed to check in bike",
        message: "An error occurred while checking in the bike",
      });
    }
  }
);

// Get user's bookings (as borrower)
app.get(
  "/api/bike-sharing/bookings/my-bookings",
  authenticateToken,
  async (req, res) => {
    try {
      const { status, page = 1, limit = 10 } = req.query;

      const query = {
        office_id: req.user.office_id,
        borrower_id: req.user.user_id,
      };

      if (status) {
        query.status = status;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const bookings = await db
        .collection("bike_bookings")
        .find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

      const totalCount = await db
        .collection("bike_bookings")
        .countDocuments(query);

      // Get bike listing details for each booking
      const bookingsWithDetails = await Promise.all(
        bookings.map(async (booking) => {
          try {
            const listing = await db.collection("bike_listings").findOne({
              _id: new ObjectId(booking.listing_id),
            });

            return {
              booking_id: booking._id.toString(),
              listing: listing
                ? {
                    listing_id: listing._id.toString(),
                    bike_type: listing.bike_type,
                    brand: listing.brand,
                    model: listing.model,
                    location: listing.location,
                  }
                : null,
              start_time: booking.start_time,
              end_time: booking.end_time,
              purpose: booking.purpose,
              pickup_location: booking.pickup_location,
              return_location: booking.return_location,
              notes: booking.notes,
              status: booking.status,
              waiver_accepted: booking.waiver_accepted,
              check_out_data: booking.check_out_data,
              check_in_data: booking.check_in_data,
              damage_reports: booking.damage_reports || [],
              rejection_reason: booking.rejection_reason,
              created_at: booking.created_at,
              updated_at: booking.updated_at,
            };
          } catch (error) {
            console.error("Error fetching listing details:", error.message);
            return {
              ...booking,
              booking_id: booking._id.toString(),
              listing: null,
            };
          }
        })
      );

      res.json({
        bookings: bookingsWithDetails,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalCount / parseInt(limit)),
          total_count: totalCount,
          per_page: parseInt(limit),
        },
      });
    } catch (error) {
      console.error("Get my bookings error:", error);
      res.status(500).json({
        error: "Failed to fetch bookings",
        message: "An error occurred while fetching your bookings",
      });
    }
  }
);

// Get booking requests for user's bikes (as owner)
app.get(
  "/api/bike-sharing/bookings/requests",
  authenticateToken,
  async (req, res) => {
    try {
      const { status, page = 1, limit = 10 } = req.query;

      const query = {
        office_id: req.user.office_id,
        owner_id: req.user.user_id,
      };

      if (status) {
        query.status = status;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const bookings = await db
        .collection("bike_bookings")
        .find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

      const totalCount = await db
        .collection("bike_bookings")
        .countDocuments(query);

      // Get bike listing and borrower details for each booking
      const bookingsWithDetails = await Promise.all(
        bookings.map(async (booking) => {
          try {
            const [listing, borrowerResponse] = await Promise.all([
              db.collection("bike_listings").findOne({
                _id: new ObjectId(booking.listing_id),
              }),
              axios.get(
                `http://localhost:${process.env.USER_SERVICE_PORT || 3001}/api/users/${booking.borrower_id}`,
                {
                  headers: {
                    Authorization: `Bearer ${req.headers.authorization.split(" ")[1]}`,
                  },
                }
              ),
            ]);

            return {
              booking_id: booking._id.toString(),
              listing: listing
                ? {
                    listing_id: listing._id.toString(),
                    bike_type: listing.bike_type,
                    brand: listing.brand,
                    model: listing.model,
                    location: listing.location,
                  }
                : null,
              borrower: {
                user_id: booking.borrower_id,
                full_name: borrowerResponse.data.user.full_name,
                reputation_score: borrowerResponse.data.user.reputation_score,
              },
              start_time: booking.start_time,
              end_time: booking.end_time,
              purpose: booking.purpose,
              pickup_location: booking.pickup_location,
              return_location: booking.return_location,
              notes: booking.notes,
              status: booking.status,
              waiver_accepted: booking.waiver_accepted,
              check_out_data: booking.check_out_data,
              check_in_data: booking.check_in_data,
              damage_reports: booking.damage_reports || [],
              rejection_reason: booking.rejection_reason,
              created_at: booking.created_at,
              updated_at: booking.updated_at,
            };
          } catch (error) {
            console.error("Error fetching booking details:", error.message);
            return {
              ...booking,
              booking_id: booking._id.toString(),
              listing: null,
              borrower: {
                user_id: booking.borrower_id,
                full_name: "Unknown User",
                reputation_score: 0,
              },
            };
          }
        })
      );

      res.json({
        bookings: bookingsWithDetails,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalCount / parseInt(limit)),
          total_count: totalCount,
          per_page: parseInt(limit),
        },
      });
    } catch (error) {
      console.error("Get booking requests error:", error);
      res.status(500).json({
        error: "Failed to fetch booking requests",
        message: "An error occurred while fetching booking requests",
      });
    }
  }
);

// Report damage or issue
app.post(
  "/api/bike-sharing/bookings/:booking_id/report-damage",
  authenticateToken,
  upload.array("photos", 5),
  async (req, res) => {
    try {
      const { booking_id } = req.params;
      const { description, severity } = req.body;

      if (!description) {
        return res
          .status(400)
          .json({ error: "Damage description is required" });
      }

      const booking = await db.collection("bike_bookings").findOne({
        _id: new ObjectId(booking_id),
        office_id: req.user.office_id,
        $or: [
          { borrower_id: req.user.user_id },
          { owner_id: req.user.user_id },
        ],
      });

      if (!booking) {
        return res
          .status(404)
          .json({ error: "Booking not found or unauthorized" });
      }

      // Process damage report photos
      const photos = [];
      if (req.files && req.files.length > 0) {
        req.files.forEach((file, index) => {
          photos.push({
            filename: `damage_${booking_id}_${Date.now()}_${index}.${file.mimetype.split("/")[1]}`,
            data: file.buffer.toString("base64"),
            mimetype: file.mimetype,
            size: file.size,
            uploaded_at: new Date(),
          });
        });
      }

      const damageReport = {
        reported_by: req.user.user_id,
        description: description,
        severity: severity || "medium",
        photos: photos,
        reported_at: new Date(),
        status: "pending_review",
      };

      await db.collection("bike_bookings").updateOne(
        { _id: new ObjectId(booking_id) },
        {
          $push: { damage_reports: damageReport },
          $set: { updated_at: new Date() },
        }
      );

      // Send notification to both parties (mock for now)
      console.log(
        `Notification: Damage reported for booking ${booking_id} by user ${req.user.user_id}`
      );

      res.json({
        message: "Damage report submitted successfully",
        booking_id: booking_id,
        damage_report: {
          ...damageReport,
          photos: photos.map((photo) => ({
            filename: photo.filename,
            mimetype: photo.mimetype,
            size: photo.size,
            uploaded_at: photo.uploaded_at,
          })),
        },
      });
    } catch (error) {
      console.error("Report damage error:", error);
      res.status(500).json({
        error: "Failed to report damage",
        message: "An error occurred while reporting damage",
      });
    }
  }
);
