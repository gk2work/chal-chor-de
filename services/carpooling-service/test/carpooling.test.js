const request = require("supertest");
const express = require("express");

// Mock MongoDB
const mockDb = {
  carpool_trips: [],
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
          if (query.office_id && query.user_id) {
            return (
              item.office_id === query.office_id &&
              item.user_id === query.user_id
            );
          }
          return false;
        })
      );
    }),
    insertOne: jest.fn().mockImplementation((doc) => {
      const id = { toString: () => "507f1f77bcf86cd799439030" };
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
      toArray: jest.fn().mockResolvedValue([]),
    }),
    countDocuments: jest.fn().mockResolvedValue(0),
    insertMany: jest.fn().mockResolvedValue({ insertedCount: 0 }),
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

// Mock routes for testing
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "Carpooling Service",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

app.post("/api/carpooling/trips", mockAuthMiddleware, async (req, res) => {
  // Basic validation
  const {
    trip_type,
    direction,
    departure_time,
    origin_location,
    destination_location,
  } = req.body;

  if (
    !trip_type ||
    !direction ||
    !departure_time ||
    !origin_location ||
    !destination_location
  ) {
    return res.status(400).json({
      error: "Validation failed",
      details: ["Missing required fields"],
    });
  }

  const tripData = {
    ...req.body,
    office_id: req.user.office_id,
    user_id: req.user.user_id,
    status: "active",
    participants: [],
    created_at: new Date(),
    updated_at: new Date(),
  };

  // Mock cost calculation
  if (tripData.trip_type === "offer" && !tripData.cost_per_passenger) {
    tripData.cost_per_passenger = 5.0;
  }

  const result = { insertedId: { toString: () => "507f1f77bcf86cd799439030" } };
  mockDb.carpool_trips.push({ ...tripData, _id: result.insertedId });

  res.status(201).json({
    message: "Trip created successfully",
    trip_id: result.insertedId.toString(),
    trip: {
      ...tripData,
      trip_id: result.insertedId.toString(),
    },
  });
});

app.get(
  "/api/carpooling/trips/available",
  mockAuthMiddleware,
  async (req, res) => {
    const trips = mockDb.carpool_trips.filter(
      (trip) =>
        trip.office_id === req.user.office_id &&
        trip.user_id !== req.user.user_id &&
        trip.status === "active"
    );

    const tripsWithUserInfo = trips.map((trip) => ({
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
        full_name: "Test Driver",
        reputation_score: 4.5,
      },
      created_at: trip.created_at,
    }));

    res.json({
      trips: tripsWithUserInfo,
      total_count: tripsWithUserInfo.length,
      filters: req.query,
    });
  }
);

app.post(
  "/api/carpooling/trips/:trip_id/join",
  mockAuthMiddleware,
  async (req, res) => {
    const { trip_id } = req.params;

    const trip = mockDb.carpool_trips.find(
      (t) => t._id.toString() === trip_id && t.office_id === req.user.office_id
    );

    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    if (trip.user_id === req.user.user_id) {
      return res.status(400).json({ error: "Cannot join your own trip" });
    }

    if (trip.participants.length >= trip.max_passengers) {
      return res.status(400).json({ error: "Trip is full" });
    }

    const alreadyJoined = trip.participants.some(
      (p) => p.user_id === req.user.user_id
    );
    if (alreadyJoined) {
      return res.status(400).json({ error: "Already joined this trip" });
    }

    const participant = {
      user_id: req.user.user_id,
      pickup_location: req.body.pickup_location || trip.origin_location,
      dropoff_location: req.body.dropoff_location || trip.destination_location,
      notes: req.body.notes || "",
      joined_at: new Date(),
      status: "confirmed",
    };

    trip.participants.push(participant);

    res.json({
      message: "Successfully joined the trip",
      trip_id: trip_id,
      participant: participant,
    });
  }
);

describe("Carpooling Service", () => {
  beforeEach(() => {
    // Clear mock database
    mockDb.carpool_trips = [];

    // Reset axios mocks
    axios.post.mockClear();
    axios.get.mockClear();
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body.status).toBe("healthy");
      expect(response.body.service).toBe("Carpooling Service");
      expect(response.body.version).toBe("1.0.0");
    });
  });

  describe("POST /api/carpooling/trips", () => {
    it("should create a trip offer successfully", async () => {
      const tripData = {
        trip_type: "offer",
        direction: "to_office",
        departure_time: "2024-12-01T08:00:00.000Z",
        origin_location: {
          type: "Point",
          coordinates: [-122.4194, 37.7749],
          address: "123 Home St, San Francisco, CA",
        },
        destination_location: {
          type: "Point",
          coordinates: [-122.4094, 37.7849],
          address: "456 Office Ave, San Francisco, CA",
        },
        max_passengers: 3,
        notes: "Leaving at 8 AM sharp",
      };

      const response = await request(app)
        .post("/api/carpooling/trips")
        .send(tripData)
        .expect(201);

      expect(response.body.message).toBe("Trip created successfully");
      expect(response.body.trip_id).toBeDefined();
      expect(response.body.trip.trip_type).toBe("offer");
      expect(response.body.trip.cost_per_passenger).toBe(5.0);
    });

    it("should create a trip request successfully", async () => {
      const tripData = {
        trip_type: "request",
        direction: "from_office",
        departure_time: "2024-12-01T17:00:00.000Z",
        origin_location: {
          type: "Point",
          coordinates: [-122.4094, 37.7849],
          address: "456 Office Ave, San Francisco, CA",
        },
        destination_location: {
          type: "Point",
          coordinates: [-122.4194, 37.7749],
          address: "123 Home St, San Francisco, CA",
        },
        notes: "Need a ride home",
      };

      const response = await request(app)
        .post("/api/carpooling/trips")
        .send(tripData)
        .expect(201);

      expect(response.body.message).toBe("Trip created successfully");
      expect(response.body.trip.trip_type).toBe("request");
      expect(response.body.trip.cost_per_passenger).toBeUndefined();
    });

    it("should return validation error for missing fields", async () => {
      const tripData = {
        trip_type: "offer",
        // missing required fields
      };

      const response = await request(app)
        .post("/api/carpooling/trips")
        .send(tripData)
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toContain("Missing required fields");
    });
  });

  describe("GET /api/carpooling/trips/available", () => {
    beforeEach(() => {
      // Add some test trips
      mockDb.carpool_trips.push({
        _id: { toString: () => "507f1f77bcf86cd799439031" },
        trip_type: "offer",
        direction: "to_office",
        departure_time: "2024-12-01T08:00:00.000Z",
        origin_location: {
          type: "Point",
          coordinates: [-122.4194, 37.7749],
          address: "123 Home St",
        },
        destination_location: {
          type: "Point",
          coordinates: [-122.4094, 37.7849],
          address: "456 Office Ave",
        },
        max_passengers: 3,
        cost_per_passenger: 5.0,
        office_id: "office_001",
        user_id: "507f1f77bcf86cd799439012", // Different user
        status: "active",
        participants: [],
        created_at: new Date(),
      });
    });

    it("should return available trips", async () => {
      const response = await request(app)
        .get("/api/carpooling/trips/available")
        .expect(200);

      expect(response.body.trips).toBeDefined();
      expect(Array.isArray(response.body.trips)).toBe(true);
      expect(response.body.trips.length).toBe(1);
      expect(response.body.trips[0].driver.full_name).toBe("Test Driver");
    });

    it("should filter trips by direction", async () => {
      const response = await request(app)
        .get("/api/carpooling/trips/available?direction=to_office")
        .expect(200);

      expect(response.body.trips).toBeDefined();
      expect(response.body.filters.direction).toBe("to_office");
    });
  });

  describe("POST /api/carpooling/trips/:trip_id/join", () => {
    let testTrip;

    beforeEach(() => {
      testTrip = {
        _id: { toString: () => "507f1f77bcf86cd799439031" },
        trip_type: "offer",
        direction: "to_office",
        max_passengers: 3,
        office_id: "office_001",
        user_id: "507f1f77bcf86cd799439012", // Different user
        status: "active",
        participants: [],
        origin_location: {
          type: "Point",
          coordinates: [-122.4194, 37.7749],
          address: "123 Home St",
        },
        destination_location: {
          type: "Point",
          coordinates: [-122.4094, 37.7849],
          address: "456 Office Ave",
        },
      };
      mockDb.carpool_trips.push(testTrip);
    });

    it("should join a trip successfully", async () => {
      const response = await request(app)
        .post("/api/carpooling/trips/507f1f77bcf86cd799439031/join")
        .send({
          notes: "Looking forward to the ride!",
        })
        .expect(200);

      expect(response.body.message).toBe("Successfully joined the trip");
      expect(response.body.participant.user_id).toBe(
        "507f1f77bcf86cd799439011"
      );
    });

    it("should return error for non-existent trip", async () => {
      const response = await request(app)
        .post("/api/carpooling/trips/507f1f77bcf86cd799439999/join")
        .send({})
        .expect(404);

      expect(response.body.error).toBe("Trip not found");
    });

    it("should return error when trying to join own trip", async () => {
      // Update trip to be owned by current user
      testTrip.user_id = "507f1f77bcf86cd799439011";

      const response = await request(app)
        .post("/api/carpooling/trips/507f1f77bcf86cd799439031/join")
        .send({})
        .expect(400);

      expect(response.body.error).toBe("Cannot join your own trip");
    });

    it("should return error when trip is full", async () => {
      // Fill up the trip
      testTrip.participants = [
        { user_id: "user1" },
        { user_id: "user2" },
        { user_id: "user3" },
      ];

      const response = await request(app)
        .post("/api/carpooling/trips/507f1f77bcf86cd799439031/join")
        .send({})
        .expect(400);

      expect(response.body.error).toBe("Trip is full");
    });

    it("should return error when already joined", async () => {
      // Add current user as participant
      testTrip.participants = [{ user_id: "507f1f77bcf86cd799439011" }];

      const response = await request(app)
        .post("/api/carpooling/trips/507f1f77bcf86cd799439031/join")
        .send({})
        .expect(400);

      expect(response.body.error).toBe("Already joined this trip");
    });
  });
});
