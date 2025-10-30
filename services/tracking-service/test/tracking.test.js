const request = require("supertest");
const express = require("express");
const geolib = require("geolib");

// Mock MongoDB
const mockDb = {
  carpool_trips: [],
  tracking_sessions: [],
  location_updates: [],
  geofences: [],
  geofence_events: [],
};

// Create test app
const app = express();
app.use(express.json());

// Mock in-memory storage
const mockActiveSessions = new Map();
const mockGeofences = new Map();
const mockUserLocations = new Map();

// Mock routes for testing
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "Tracking Service",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    active_sessions: mockActiveSessions.size,
    active_geofences: mockGeofences.size,
  });
});

app.post("/api/tracking/start", async (req, res) => {
  const { trip_id, tracking_type, privacy_level = "full" } = req.body;
  const user_id = req.headers["x-user-id"];

  if (!user_id) {
    return res.status(401).json({ error: "User ID required" });
  }

  if (!trip_id || !tracking_type) {
    return res.status(400).json({
      error: "Validation failed",
      details: ["trip_id and tracking_type are required"],
    });
  }

  // Mock trip verification
  const trip = mockDb.carpool_trips.find(
    (t) =>
      t._id.toString() === trip_id &&
      (t.user_id === user_id ||
        t.participants?.some((p) => p.user_id === user_id))
  );

  if (!trip) {
    return res.status(404).json({ error: "Trip not found or access denied" });
  }

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

  mockActiveSessions.set(user_id, session);

  res.json({
    message: "Tracking session started",
    session_id: user_id,
    session: session,
  });
});

app.post("/api/tracking/stop", async (req, res) => {
  const user_id = req.headers["x-user-id"];

  if (!user_id) {
    return res.status(401).json({ error: "User ID required" });
  }

  const session = mockActiveSessions.get(user_id);
  if (!session) {
    return res.status(404).json({ error: "No active tracking session found" });
  }

  session.status = "completed";
  session.ended_at = new Date();

  mockActiveSessions.delete(user_id);
  mockUserLocations.delete(user_id);

  res.json({
    message: "Tracking session stopped",
    session: session,
  });
});

app.get("/api/tracking/session/:user_id", async (req, res) => {
  const { user_id } = req.params;

  const session = mockActiveSessions.get(user_id);
  if (!session) {
    return res.status(404).json({ error: "No active tracking session found" });
  }

  const location = mockUserLocations.get(user_id);

  res.json({
    session: session,
    current_location: location,
    last_update: session.last_update,
  });
});

app.post("/api/tracking/geofence", async (req, res) => {
  const { name, center, radius, trip_id, event_type = "both" } = req.body;

  if (!name || !center || !radius || !trip_id) {
    return res.status(400).json({
      error: "Validation failed",
      details: ["name, center, radius, and trip_id are required"],
    });
  }

  if (radius < 10 || radius > 5000) {
    return res.status(400).json({
      error: "Validation failed",
      details: ["radius must be between 10 and 5000 meters"],
    });
  }

  const geofenceId = "507f1f77bcf86cd799439030";
  const geofence = {
    id: geofenceId,
    name,
    center,
    radius,
    trip_id,
    event_type,
    created_at: new Date(),
    triggered_users: new Set(),
  };

  mockGeofences.set(geofenceId, geofence);

  res.json({
    message: "Geofence created",
    geofence_id: geofenceId,
    geofence: {
      id: geofenceId,
      name,
      center,
      radius,
      trip_id,
      event_type,
    },
  });
});

app.get("/api/tracking/history/:trip_id", async (req, res) => {
  const { trip_id } = req.params;
  const { user_id } = req.query;

  // Mock location history
  const locations = mockDb.location_updates.filter((loc) => {
    if (loc.trip_id !== trip_id) return false;
    if (user_id && loc.user_id !== user_id) return false;
    return true;
  });

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
});

describe("Tracking Service", () => {
  beforeEach(() => {
    // Clear mock data
    Object.keys(mockDb).forEach((key) => {
      mockDb[key] = [];
    });
    mockActiveSessions.clear();
    mockGeofences.clear();
    mockUserLocations.clear();
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body.status).toBe("healthy");
      expect(response.body.service).toBe("Tracking Service");
      expect(response.body.version).toBe("1.0.0");
      expect(typeof response.body.active_sessions).toBe("number");
      expect(typeof response.body.active_geofences).toBe("number");
    });
  });

  describe("POST /api/tracking/start", () => {
    beforeEach(() => {
      // Add test trip
      mockDb.carpool_trips.push({
        _id: { toString: () => "507f1f77bcf86cd799439031" },
        user_id: "507f1f77bcf86cd799439011",
        trip_type: "offer",
        status: "active",
        participants: [],
      });
    });

    it("should start tracking session successfully", async () => {
      const response = await request(app)
        .post("/api/tracking/start")
        .set("x-user-id", "507f1f77bcf86cd799439011")
        .send({
          trip_id: "507f1f77bcf86cd799439031",
          tracking_type: "driver",
          privacy_level: "full",
        })
        .expect(200);

      expect(response.body.message).toBe("Tracking session started");
      expect(response.body.session_id).toBe("507f1f77bcf86cd799439011");
      expect(response.body.session.tracking_type).toBe("driver");
      expect(response.body.session.privacy_level).toBe("full");
      expect(response.body.session.status).toBe("active");
    });

    it("should return error for missing user ID", async () => {
      const response = await request(app)
        .post("/api/tracking/start")
        .send({
          trip_id: "507f1f77bcf86cd799439031",
          tracking_type: "driver",
        })
        .expect(401);

      expect(response.body.error).toBe("User ID required");
    });

    it("should return validation error for missing fields", async () => {
      const response = await request(app)
        .post("/api/tracking/start")
        .set("x-user-id", "507f1f77bcf86cd799439011")
        .send({
          trip_id: "507f1f77bcf86cd799439031",
        })
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toContain(
        "trip_id and tracking_type are required"
      );
    });

    it("should return error for non-existent trip", async () => {
      const response = await request(app)
        .post("/api/tracking/start")
        .set("x-user-id", "507f1f77bcf86cd799439011")
        .send({
          trip_id: "507f1f77bcf86cd799439999",
          tracking_type: "driver",
        })
        .expect(404);

      expect(response.body.error).toBe("Trip not found or access denied");
    });
  });

  describe("POST /api/tracking/stop", () => {
    beforeEach(() => {
      // Add active session
      mockActiveSessions.set("507f1f77bcf86cd799439011", {
        user_id: "507f1f77bcf86cd799439011",
        trip_id: "507f1f77bcf86cd799439031",
        tracking_type: "driver",
        status: "active",
        total_distance: 5.2,
      });
    });

    it("should stop tracking session successfully", async () => {
      const response = await request(app)
        .post("/api/tracking/stop")
        .set("x-user-id", "507f1f77bcf86cd799439011")
        .expect(200);

      expect(response.body.message).toBe("Tracking session stopped");
      expect(response.body.session.status).toBe("completed");
      expect(response.body.session.ended_at).toBeDefined();
    });

    it("should return error for missing user ID", async () => {
      const response = await request(app)
        .post("/api/tracking/stop")
        .expect(401);

      expect(response.body.error).toBe("User ID required");
    });

    it("should return error for no active session", async () => {
      const response = await request(app)
        .post("/api/tracking/stop")
        .set("x-user-id", "507f1f77bcf86cd799439999")
        .expect(404);

      expect(response.body.error).toBe("No active tracking session found");
    });
  });

  describe("GET /api/tracking/session/:user_id", () => {
    beforeEach(() => {
      mockActiveSessions.set("507f1f77bcf86cd799439011", {
        user_id: "507f1f77bcf86cd799439011",
        trip_id: "507f1f77bcf86cd799439031",
        tracking_type: "driver",
        status: "active",
        total_distance: 2.5,
      });

      mockUserLocations.set("507f1f77bcf86cd799439011", {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10,
        timestamp: new Date(),
      });
    });

    it("should return session status and location", async () => {
      const response = await request(app)
        .get("/api/tracking/session/507f1f77bcf86cd799439011")
        .expect(200);

      expect(response.body.session).toBeDefined();
      expect(response.body.session.user_id).toBe("507f1f77bcf86cd799439011");
      expect(response.body.session.status).toBe("active");
      expect(response.body.current_location).toBeDefined();
      expect(response.body.current_location.latitude).toBe(37.7749);
    });

    it("should return error for non-existent session", async () => {
      const response = await request(app)
        .get("/api/tracking/session/507f1f77bcf86cd799439999")
        .expect(404);

      expect(response.body.error).toBe("No active tracking session found");
    });
  });

  describe("POST /api/tracking/geofence", () => {
    it("should create geofence successfully", async () => {
      const response = await request(app)
        .post("/api/tracking/geofence")
        .send({
          name: "Office Pickup",
          center: {
            latitude: 37.7849,
            longitude: -122.4094,
          },
          radius: 100,
          trip_id: "507f1f77bcf86cd799439031",
          event_type: "enter",
        })
        .expect(200);

      expect(response.body.message).toBe("Geofence created");
      expect(response.body.geofence_id).toBeDefined();
      expect(response.body.geofence.name).toBe("Office Pickup");
      expect(response.body.geofence.radius).toBe(100);
      expect(response.body.geofence.event_type).toBe("enter");
    });

    it("should return validation error for missing fields", async () => {
      const response = await request(app)
        .post("/api/tracking/geofence")
        .send({
          name: "Office Pickup",
          radius: 100,
        })
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toContain(
        "name, center, radius, and trip_id are required"
      );
    });

    it("should return validation error for invalid radius", async () => {
      const response = await request(app)
        .post("/api/tracking/geofence")
        .send({
          name: "Office Pickup",
          center: { latitude: 37.7849, longitude: -122.4094 },
          radius: 5,
          trip_id: "507f1f77bcf86cd799439031",
        })
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toContain(
        "radius must be between 10 and 5000 meters"
      );
    });
  });

  describe("GET /api/tracking/history/:trip_id", () => {
    beforeEach(() => {
      mockDb.location_updates = [
        {
          user_id: "507f1f77bcf86cd799439011",
          trip_id: "507f1f77bcf86cd799439031",
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10,
          speed: 25,
          timestamp: new Date("2025-10-30T08:00:00Z"),
        },
        {
          user_id: "507f1f77bcf86cd799439011",
          trip_id: "507f1f77bcf86cd799439031",
          latitude: 37.7799,
          longitude: -122.4144,
          accuracy: 8,
          speed: 30,
          timestamp: new Date("2025-10-30T08:05:00Z"),
        },
      ];
    });

    it("should return location history for trip", async () => {
      const response = await request(app)
        .get("/api/tracking/history/507f1f77bcf86cd799439031")
        .expect(200);

      expect(response.body.trip_id).toBe("507f1f77bcf86cd799439031");
      expect(response.body.total_points).toBe(2);
      expect(response.body.locations).toHaveLength(2);
      expect(response.body.locations[0].latitude).toBe(37.7749);
      expect(response.body.locations[1].speed).toBe(30);
    });

    it("should filter by user_id when provided", async () => {
      const response = await request(app)
        .get(
          "/api/tracking/history/507f1f77bcf86cd799439031?user_id=507f1f77bcf86cd799439011"
        )
        .expect(200);

      expect(response.body.locations).toHaveLength(2);
      expect(
        response.body.locations.every(
          (loc) => loc.user_id === "507f1f77bcf86cd799439011"
        )
      ).toBe(true);
    });

    it("should return empty array for non-existent trip", async () => {
      const response = await request(app)
        .get("/api/tracking/history/507f1f77bcf86cd799439999")
        .expect(200);

      expect(response.body.total_points).toBe(0);
      expect(response.body.locations).toHaveLength(0);
    });
  });

  describe("Geospatial calculations", () => {
    it("should calculate distance correctly using geolib", () => {
      const distance = geolib.getDistance(
        { latitude: 37.7749, longitude: -122.4194 },
        { latitude: 37.7849, longitude: -122.4094 }
      );

      expect(distance).toBeGreaterThan(0);
      expect(typeof distance).toBe("number");
    });

    it("should handle same location distance", () => {
      const distance = geolib.getDistance(
        { latitude: 37.7749, longitude: -122.4194 },
        { latitude: 37.7749, longitude: -122.4194 }
      );

      expect(distance).toBe(0);
    });
  });
});
