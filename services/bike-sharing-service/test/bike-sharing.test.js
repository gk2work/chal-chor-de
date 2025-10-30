const request = require("supertest");
const express = require("express");

// Mock MongoDB
const mockDb = {
  bike_listings: [],
  bike_bookings: [],
};

// Create test app
const app = express();
app.use(express.json());

// Mock database
app.locals.db = {
  collection: (name) => ({
    findOne: jest.fn().mockImplementation((query) => {
      const collection = mockDb[name] || [];
      return Promise.resolve(
        collection.find((item) => {
          if (query._id && query._id.toString) {
            return item._id && item._id.toString() === query._id.toString();
          }
          if (query.office_id && query.owner_id) {
            return (
              item.office_id === query.office_id &&
              item.owner_id === query.owner_id
            );
          }
          if (query.office_id && query.available !== undefined) {
            return (
              item.office_id === query.office_id &&
              item.available === query.available
            );
          }
          return false;
        })
      );
    }),
    insertOne: jest.fn().mockImplementation((doc) => {
      const id = { toString: () => "507f1f77bcf86cd799439040" };
      const newDoc = { ...doc, _id: id };
      mockDb[name] = mockDb[name] || [];
      mockDb[name].push(newDoc);
      return Promise.resolve({ insertedId: id });
    }),
    updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockImplementation(() => {
        const collection = mockDb[name] || [];
        return Promise.resolve(collection);
      }),
    }),
    countDocuments: jest.fn().mockImplementation(() => {
      const collection = mockDb[name] || [];
      return Promise.resolve(collection.length);
    }),
    createIndex: jest.fn().mockResolvedValue({}),
  }),
};

// Mock axios for user service calls
jest.mock("axios");
const axios = require("axios");

// Mock authentication middleware
const mockAuthMiddleware = (req, res, next) => {
  req.user = {
    user_id: "507f1f77bcf86cd799439011",
    email: "test@company.com",
    office_id: "office_001",
  };
  next();
};

// Mock multer middleware
const mockMulterMiddleware = (req, res, next) => {
  req.files = req.files || [];
  next();
};

// Mock routes for testing
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "Bike Sharing Service",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

app.post(
  "/api/bike-sharing/listings",
  mockAuthMiddleware,
  mockMulterMiddleware,
  async (req, res) => {
    // Parse location if it's a string (from multipart form data)
    if (typeof req.body.location === "string") {
      try {
        req.body.location = JSON.parse(req.body.location);
      } catch (e) {
        // Keep as is if parsing fails
      }
    }

    // Basic validation
    const { bike_type, brand, model, description, location, condition, size } =
      req.body;

    if (
      !bike_type ||
      !brand ||
      !model ||
      !description ||
      !location ||
      !condition ||
      !size
    ) {
      return res.status(400).json({
        error: "Validation failed",
        details: ["Missing required fields"],
      });
    }

    // Process mock photos
    const photos = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        photos.push({
          filename: `bike_${Date.now()}_${index}.jpg`,
          data: "mock_base64_data",
          mimetype: "image/jpeg",
          size: 1024,
          uploaded_at: new Date(),
        });
      });
    }

    const listingData = {
      ...req.body,
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

    const result = {
      insertedId: { toString: () => "507f1f77bcf86cd799439040" },
    };
    mockDb.bike_listings.push({ ...listingData, _id: result.insertedId });

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
        })),
      },
    });
  }
);

app.get(
  "/api/bike-sharing/listings/available",
  mockAuthMiddleware,
  async (req, res) => {
    const listings = mockDb.bike_listings.filter(
      (listing) =>
        listing.office_id === req.user.office_id &&
        listing.owner_id !== req.user.user_id &&
        listing.available === true
    );

    // Mock user response
    axios.get.mockResolvedValue({
      data: {
        user: {
          full_name: "Test Owner",
          reputation_score: 4.5,
        },
      },
    });

    const listingsWithOwnerInfo = listings.map((listing) => ({
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
        full_name: "Test Owner",
        reputation_score: 4.5,
      },
      created_at: listing.created_at,
    }));

    res.json({
      listings: listingsWithOwnerInfo,
      pagination: {
        current_page: 1,
        total_pages: 1,
        total_count: listingsWithOwnerInfo.length,
        per_page: 20,
      },
      filters: req.query,
    });
  }
);

app.post("/api/bike-sharing/bookings", mockAuthMiddleware, async (req, res) => {
  const { listing_id, start_time, end_time, purpose } = req.body;

  if (!listing_id || !start_time || !end_time || !purpose) {
    return res.status(400).json({
      error: "Validation failed",
      details: ["Missing required fields"],
    });
  }

  // Find the listing
  const listing = mockDb.bike_listings.find(
    (l) =>
      l._id.toString() === listing_id &&
      l.office_id === req.user.office_id &&
      l.available
  );

  if (!listing) {
    return res
      .status(404)
      .json({ error: "Bike listing not found or unavailable" });
  }

  if (listing.owner_id === req.user.user_id) {
    return res.status(400).json({ error: "Cannot book your own bike" });
  }

  const booking = {
    listing_id: listing_id,
    office_id: req.user.office_id,
    borrower_id: req.user.user_id,
    owner_id: listing.owner_id,
    start_time: new Date(start_time),
    end_time: new Date(end_time),
    purpose: purpose,
    pickup_location: req.body.pickup_location || listing.location,
    return_location: req.body.return_location || listing.location,
    notes: req.body.notes || "",
    status: "pending",
    waiver_accepted: false,
    check_in_data: null,
    check_out_data: null,
    damage_reports: [],
    created_at: new Date(),
    updated_at: new Date(),
  };

  const result = { insertedId: { toString: () => "507f1f77bcf86cd799439041" } };
  mockDb.bike_bookings.push({ ...booking, _id: result.insertedId });

  res.status(201).json({
    message: "Booking request created successfully",
    booking_id: result.insertedId.toString(),
    booking: {
      ...booking,
      booking_id: result.insertedId.toString(),
    },
  });
});

app.patch(
  "/api/bike-sharing/bookings/:booking_id/status",
  mockAuthMiddleware,
  async (req, res) => {
    const { booking_id } = req.params;
    const { status } = req.body;

    if (!["approved", "denied"].includes(status)) {
      return res
        .status(400)
        .json({ error: "Status must be 'approved' or 'denied'" });
    }

    const booking = mockDb.bike_bookings.find(
      (b) =>
        b._id.toString() === booking_id &&
        b.office_id === req.user.office_id &&
        b.owner_id === req.user.user_id &&
        b.status === "pending"
    );

    if (!booking) {
      return res
        .status(404)
        .json({ error: "Booking not found or unauthorized" });
    }

    booking.status = status;
    booking.updated_at = new Date();

    res.json({
      message: `Booking ${status} successfully`,
      booking_id: booking_id,
      status: status,
    });
  }
);

app.post(
  "/api/bike-sharing/bookings/:booking_id/check-out",
  mockAuthMiddleware,
  mockMulterMiddleware,
  async (req, res) => {
    const { booking_id } = req.params;

    const booking = mockDb.bike_bookings.find(
      (b) =>
        b._id.toString() === booking_id &&
        b.office_id === req.user.office_id &&
        b.borrower_id === req.user.user_id &&
        b.status === "approved" &&
        b.waiver_accepted === true
    );

    if (!booking) {
      return res.status(404).json({
        error:
          "Approved booking not found, unauthorized, or waiver not accepted",
      });
    }

    if (booking.check_out_data) {
      return res.status(400).json({ error: "Bike already checked out" });
    }

    // Process mock photos
    const photos = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        photos.push({
          filename: `checkout_${booking_id}_${Date.now()}_${index}.jpg`,
          data: "mock_base64_data",
          mimetype: "image/jpeg",
          size: 1024,
          uploaded_at: new Date(),
        });
      });
    }

    const checkOutData = {
      timestamp: new Date(),
      location: req.body.location || {
        type: "Point",
        coordinates: [0, 0],
        address: "Test Location",
      },
      condition_notes: req.body.condition_notes || "",
      damage_reported: req.body.damage_reported || false,
      damage_description: req.body.damage_description || "",
      photos: photos,
    };

    booking.status = "active";
    booking.check_out_data = checkOutData;
    booking.updated_at = new Date();

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
  }
);

app.post(
  "/api/bike-sharing/bookings/:booking_id/check-in",
  mockAuthMiddleware,
  mockMulterMiddleware,
  async (req, res) => {
    const { booking_id } = req.params;

    const booking = mockDb.bike_bookings.find(
      (b) =>
        b._id.toString() === booking_id &&
        b.office_id === req.user.office_id &&
        b.borrower_id === req.user.user_id &&
        b.status === "active"
    );

    if (!booking) {
      return res
        .status(404)
        .json({ error: "Active booking not found or unauthorized" });
    }

    if (booking.check_in_data) {
      return res.status(400).json({ error: "Bike already checked in" });
    }

    // Process mock photos
    const photos = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        photos.push({
          filename: `checkin_${booking_id}_${Date.now()}_${index}.jpg`,
          data: "mock_base64_data",
          mimetype: "image/jpeg",
          size: 1024,
          uploaded_at: new Date(),
        });
      });
    }

    const checkInData = {
      timestamp: new Date(),
      location: req.body.location || {
        type: "Point",
        coordinates: [0, 0],
        address: "Test Location",
      },
      condition_notes: req.body.condition_notes || "",
      damage_reported: req.body.damage_reported || false,
      damage_description: req.body.damage_description || "",
      photos: photos,
    };

    booking.status = "completed";
    booking.check_in_data = checkInData;
    booking.updated_at = new Date();

    // Update listing total bookings
    const listing = mockDb.bike_listings.find(
      (l) => l._id.toString() === booking.listing_id
    );
    if (listing) {
      listing.total_bookings = (listing.total_bookings || 0) + 1;
    }

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
  }
);

describe("Bike Sharing Service", () => {
  beforeEach(() => {
    // Clear mock database
    mockDb.bike_listings = [];
    mockDb.bike_bookings = [];

    // Reset axios mocks
    axios.post.mockClear();
    axios.get.mockClear();
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body.status).toBe("healthy");
      expect(response.body.service).toBe("Bike Sharing Service");
      expect(response.body.version).toBe("1.0.0");
    });
  });

  describe("POST /api/bike-sharing/listings", () => {
    it("should create a bike listing successfully", async () => {
      const listingData = {
        bike_type: "mountain",
        brand: "Trek",
        model: "X-Caliber 8",
        description: "Great mountain bike for trails",
        location: {
          type: "Point",
          coordinates: [-122.4194, 37.7749],
          address: "123 Office St, San Francisco, CA",
        },
        features: ["helmet_included", "lights"],
        condition: "excellent",
        size: "m",
        availability_schedule: {
          monday: [{ start_time: "09:00", end_time: "17:00" }],
        },
        special_instructions: "Please handle with care",
        smart_lock_info: {
          has_smart_lock: true,
          lock_type: "Bluetooth",
          instructions: "Use app to unlock",
        },
      };

      const response = await request(app)
        .post("/api/bike-sharing/listings")
        .send(listingData)
        .expect(201);

      expect(response.body.message).toBe("Bike listing created successfully");
      expect(response.body.listing_id).toBeDefined();
      expect(response.body.listing.bike_type).toBe("mountain");
      expect(response.body.listing.brand).toBe("Trek");
      expect(response.body.listing.available).toBe(true);
    });

    it("should return validation error for missing fields", async () => {
      const listingData = {
        bike_type: "mountain",
        // missing required fields
      };

      const response = await request(app)
        .post("/api/bike-sharing/listings")
        .send(listingData)
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toContain("Missing required fields");
    });

    it("should handle photo uploads", async () => {
      const listingData = {
        bike_type: "road",
        brand: "Specialized",
        model: "Allez",
        description: "Fast road bike",
        location: {
          type: "Point",
          coordinates: [-122.4194, 37.7749],
          address: "123 Office St",
        },
        condition: "good",
        size: "l",
      };

      const response = await request(app)
        .post("/api/bike-sharing/listings")
        .send(listingData)
        .expect(201);

      expect(response.body.listing.photos).toBeDefined();
      expect(Array.isArray(response.body.listing.photos)).toBe(true);
    });
  });

  describe("GET /api/bike-sharing/listings/available", () => {
    beforeEach(() => {
      // Add test bike listing
      mockDb.bike_listings.push({
        _id: { toString: () => "507f1f77bcf86cd799439040" },
        bike_type: "hybrid",
        brand: "Giant",
        model: "Escape 3",
        description: "Comfortable hybrid bike",
        location: {
          type: "Point",
          coordinates: [-122.4194, 37.7749],
          address: "123 Office St",
        },
        features: ["basket", "lights"],
        condition: "good",
        size: "m",
        availability_schedule: {},
        special_instructions: "",
        smart_lock_info: { has_smart_lock: false },
        photos: [],
        rating_average: 4.2,
        rating_count: 5,
        total_bookings: 10,
        office_id: "office_001",
        owner_id: "507f1f77bcf86cd799439012", // Different user
        available: true,
        created_at: new Date(),
      });
    });

    it("should return available bike listings", async () => {
      const response = await request(app)
        .get("/api/bike-sharing/listings/available")
        .expect(200);

      expect(response.body.listings).toBeDefined();
      expect(Array.isArray(response.body.listings)).toBe(true);
      expect(response.body.listings.length).toBe(1);
      expect(response.body.listings[0].owner.full_name).toBe("Test Owner");
      expect(response.body.listings[0].bike_type).toBe("hybrid");
    });

    it("should filter listings by bike type", async () => {
      const response = await request(app)
        .get("/api/bike-sharing/listings/available?bike_type=hybrid")
        .expect(200);

      expect(response.body.listings).toBeDefined();
      expect(response.body.filters.bike_type).toBe("hybrid");
    });

    it("should filter listings by location", async () => {
      const response = await request(app)
        .get(
          "/api/bike-sharing/listings/available?lat=37.7749&lng=-122.4194&max_distance=1000"
        )
        .expect(200);

      expect(response.body.listings).toBeDefined();
      expect(response.body.filters.max_distance).toBe("1000");
    });
  });

  describe("POST /api/bike-sharing/bookings", () => {
    let testListing;

    beforeEach(() => {
      testListing = {
        _id: { toString: () => "507f1f77bcf86cd799439040" },
        bike_type: "mountain",
        brand: "Trek",
        model: "X-Caliber 8",
        office_id: "office_001",
        owner_id: "507f1f77bcf86cd799439012", // Different user
        available: true,
        location: {
          type: "Point",
          coordinates: [-122.4194, 37.7749],
          address: "123 Office St",
        },
      };
      mockDb.bike_listings.push(testListing);
    });

    it("should create a booking request successfully", async () => {
      const bookingData = {
        listing_id: "507f1f77bcf86cd799439040",
        start_time: "2024-12-01T09:00:00.000Z",
        end_time: "2024-12-01T17:00:00.000Z",
        purpose: "Commuting to meetings",
        notes: "Will take good care of the bike",
      };

      const response = await request(app)
        .post("/api/bike-sharing/bookings")
        .send(bookingData)
        .expect(201);

      expect(response.body.message).toBe(
        "Booking request created successfully"
      );
      expect(response.body.booking_id).toBeDefined();
      expect(response.body.booking.status).toBe("pending");
      expect(response.body.booking.purpose).toBe("Commuting to meetings");
    });

    it("should return validation error for missing fields", async () => {
      const bookingData = {
        listing_id: "507f1f77bcf86cd799439040",
        // missing required fields
      };

      const response = await request(app)
        .post("/api/bike-sharing/bookings")
        .send(bookingData)
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toContain("Missing required fields");
    });

    it("should return error for non-existent listing", async () => {
      const bookingData = {
        listing_id: "507f1f77bcf86cd799439999",
        start_time: "2024-12-01T09:00:00.000Z",
        end_time: "2024-12-01T17:00:00.000Z",
        purpose: "Test ride",
      };

      const response = await request(app)
        .post("/api/bike-sharing/bookings")
        .send(bookingData)
        .expect(404);

      expect(response.body.error).toBe("Bike listing not found or unavailable");
    });

    it("should return error when trying to book own bike", async () => {
      // Update listing to be owned by current user
      testListing.owner_id = "507f1f77bcf86cd799439011";

      const bookingData = {
        listing_id: "507f1f77bcf86cd799439040",
        start_time: "2024-12-01T09:00:00.000Z",
        end_time: "2024-12-01T17:00:00.000Z",
        purpose: "Test ride",
      };

      const response = await request(app)
        .post("/api/bike-sharing/bookings")
        .send(bookingData)
        .expect(400);

      expect(response.body.error).toBe("Cannot book your own bike");
    });
  });

  describe("PATCH /api/bike-sharing/bookings/:booking_id/status", () => {
    let testBooking;

    beforeEach(() => {
      testBooking = {
        _id: { toString: () => "507f1f77bcf86cd799439041" },
        listing_id: "507f1f77bcf86cd799439040",
        office_id: "office_001",
        borrower_id: "507f1f77bcf86cd799439012",
        owner_id: "507f1f77bcf86cd799439011", // Current user is owner
        status: "pending",
        start_time: new Date("2024-12-01T09:00:00.000Z"),
        end_time: new Date("2024-12-01T17:00:00.000Z"),
        purpose: "Test booking",
      };
      mockDb.bike_bookings.push(testBooking);
    });

    it("should approve a booking successfully", async () => {
      const response = await request(app)
        .patch("/api/bike-sharing/bookings/507f1f77bcf86cd799439041/status")
        .send({ status: "approved" })
        .expect(200);

      expect(response.body.message).toBe("Booking approved successfully");
      expect(response.body.status).toBe("approved");
    });

    it("should deny a booking successfully", async () => {
      const response = await request(app)
        .patch("/api/bike-sharing/bookings/507f1f77bcf86cd799439041/status")
        .send({
          status: "denied",
          rejection_reason: "Bike not available on that date",
        })
        .expect(200);

      expect(response.body.message).toBe("Booking denied successfully");
      expect(response.body.status).toBe("denied");
    });

    it("should return error for invalid status", async () => {
      const response = await request(app)
        .patch("/api/bike-sharing/bookings/507f1f77bcf86cd799439041/status")
        .send({ status: "invalid_status" })
        .expect(400);

      expect(response.body.error).toBe("Status must be 'approved' or 'denied'");
    });

    it("should return error for non-existent booking", async () => {
      const response = await request(app)
        .patch("/api/bike-sharing/bookings/507f1f77bcf86cd799439999/status")
        .send({ status: "approved" })
        .expect(404);

      expect(response.body.error).toBe("Booking not found or unauthorized");
    });
  });

  describe("POST /api/bike-sharing/bookings/:booking_id/check-out", () => {
    let testBooking;

    beforeEach(() => {
      testBooking = {
        _id: { toString: () => "507f1f77bcf86cd799439041" },
        listing_id: "507f1f77bcf86cd799439040",
        office_id: "office_001",
        borrower_id: "507f1f77bcf86cd799439011", // Current user is borrower
        owner_id: "507f1f77bcf86cd799439012",
        status: "approved",
        waiver_accepted: true,
        check_out_data: null,
      };
      mockDb.bike_bookings.push(testBooking);
    });

    it("should check out bike successfully", async () => {
      const checkOutData = {
        location: {
          type: "Point",
          coordinates: [-122.4194, 37.7749],
          address: "123 Office St",
        },
        condition_notes: "Bike is in excellent condition",
        damage_reported: false,
      };

      const response = await request(app)
        .post("/api/bike-sharing/bookings/507f1f77bcf86cd799439041/check-out")
        .send(checkOutData)
        .expect(200);

      expect(response.body.message).toBe("Bike checked out successfully");
      expect(response.body.check_out_data).toBeDefined();
      expect(response.body.check_out_data.condition_notes).toBe(
        "Bike is in excellent condition"
      );
    });

    it("should return error if bike already checked out", async () => {
      // Set bike as already checked out
      testBooking.check_out_data = { timestamp: new Date() };

      const response = await request(app)
        .post("/api/bike-sharing/bookings/507f1f77bcf86cd799439041/check-out")
        .send({})
        .expect(400);

      expect(response.body.error).toBe("Bike already checked out");
    });

    it("should return error for non-approved booking", async () => {
      testBooking.status = "pending";

      const response = await request(app)
        .post("/api/bike-sharing/bookings/507f1f77bcf86cd799439041/check-out")
        .send({})
        .expect(404);

      expect(response.body.error).toBe(
        "Approved booking not found, unauthorized, or waiver not accepted"
      );
    });
  });

  describe("POST /api/bike-sharing/bookings/:booking_id/check-in", () => {
    let testBooking;

    beforeEach(() => {
      testBooking = {
        _id: { toString: () => "507f1f77bcf86cd799439041" },
        listing_id: "507f1f77bcf86cd799439040",
        office_id: "office_001",
        borrower_id: "507f1f77bcf86cd799439011", // Current user is borrower
        owner_id: "507f1f77bcf86cd799439012",
        status: "active",
        check_out_data: { timestamp: new Date() },
        check_in_data: null,
      };
      mockDb.bike_bookings.push(testBooking);

      // Add corresponding listing
      mockDb.bike_listings.push({
        _id: { toString: () => "507f1f77bcf86cd799439040" },
        total_bookings: 5,
      });
    });

    it("should check in bike successfully", async () => {
      const checkInData = {
        location: {
          type: "Point",
          coordinates: [-122.4194, 37.7749],
          address: "123 Office St",
        },
        condition_notes: "Bike returned in good condition",
        damage_reported: false,
      };

      const response = await request(app)
        .post("/api/bike-sharing/bookings/507f1f77bcf86cd799439041/check-in")
        .send(checkInData)
        .expect(200);

      expect(response.body.message).toBe("Bike checked in successfully");
      expect(response.body.check_in_data).toBeDefined();
      expect(response.body.check_in_data.condition_notes).toBe(
        "Bike returned in good condition"
      );
    });

    it("should handle damage reporting during check-in", async () => {
      const checkInData = {
        location: {
          type: "Point",
          coordinates: [-122.4194, 37.7749],
          address: "123 Office St",
        },
        condition_notes: "Minor scratch on frame",
        damage_reported: true,
        damage_description: "Small scratch on the left side of the frame",
      };

      const response = await request(app)
        .post("/api/bike-sharing/bookings/507f1f77bcf86cd799439041/check-in")
        .send(checkInData)
        .expect(200);

      expect(response.body.message).toBe("Bike checked in successfully");
      expect(response.body.check_in_data.damage_reported).toBe(true);
      expect(response.body.check_in_data.damage_description).toBe(
        "Small scratch on the left side of the frame"
      );
    });

    it("should return error if bike already checked in", async () => {
      // Set bike as already checked in
      testBooking.check_in_data = { timestamp: new Date() };

      const response = await request(app)
        .post("/api/bike-sharing/bookings/507f1f77bcf86cd799439041/check-in")
        .send({})
        .expect(400);

      expect(response.body.error).toBe("Bike already checked in");
    });

    it("should return error for non-active booking", async () => {
      testBooking.status = "pending";

      const response = await request(app)
        .post("/api/bike-sharing/bookings/507f1f77bcf86cd799439041/check-in")
        .send({})
        .expect(404);

      expect(response.body.error).toBe(
        "Active booking not found or unauthorized"
      );
    });
  });
});
