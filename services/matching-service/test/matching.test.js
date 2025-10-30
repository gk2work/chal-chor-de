const request = require("supertest");
const express = require("express");
const geolib = require("geolib");

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
    find: jest.fn().mockImplementation((query) => ({
      toArray: jest.fn().mockResolvedValue(
        mockDb[name]?.filter((item) => {
          if (query.office_id && item.office_id !== query.office_id)
            return false;
          if (query.role && item.role !== query.role) return false;
          if (query.trip_type && item.trip_type !== query.trip_type)
            return false;
          if (query.direction && item.direction !== query.direction)
            return false;
          if (query.status && !query.status.$in?.includes(item.status))
            return false;
          if (query.user_id && query.user_id.$ne === item.user_id) return false;
          return true;
        }) || []
      ),
    })),
  }),
};

// Mock axios for service calls
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
    service: "Matching Service",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

app.post("/api/matching/find-matches", mockAuthMiddleware, async (req, res) => {
  const {
    trip_id,
    max_matches = 5,
    max_detour_km = 5,
    max_detour_minutes = 15,
  } = req.body;

  if (!trip_id) {
    return res.status(400).json({
      error: "Validation failed",
      details: ["trip_id is required"],
    });
  }

  // Mock trip lookup
  const trip = mockDb.carpool_trips.find((t) => t._id.toString() === trip_id);
  if (!trip) {
    return res.status(404).json({ error: "Trip not found" });
  }

  // Mock matching algorithm
  const matches = mockDb.carpool_trips
    .filter(
      (t) =>
        t._id.toString() !== trip_id &&
        t.office_id === trip.office_id &&
        t.role !== trip.role &&
        t.trip_type === trip.trip_type &&
        t.direction === trip.direction
    )
    .map((candidate) => {
      // Calculate mock match score
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

      const matchScore = Math.max(0, 100 - distance / 100); // Simple scoring

      return {
        trip_id: candidate._id.toString(),
        user_id: candidate.user_id,
        match_score: Math.round(matchScore * 100) / 100,
        route_analysis: {
          isCompatible: distance <= max_detour_km * 1000,
          detour_distance_km: Math.round((distance / 1000) * 100) / 100,
          detour_time_minutes:
            Math.round((((distance / 1000) * 60) / 60) * 100) / 100,
          efficiency_ratio: 0.85,
        },
        trip_details: {
          trip_type: candidate.trip_type,
          direction: candidate.direction,
          departure_time: candidate.departure_time,
          origin_location: candidate.origin_location,
          destination_location: candidate.destination_location,
          max_passengers: candidate.max_passengers,
          cost_per_passenger: candidate.cost_per_passenger,
        },
      };
    })
    .filter((match) => match.route_analysis.isCompatible)
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, max_matches);

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
});

app.post(
  "/api/matching/calculate-route",
  mockAuthMiddleware,
  async (req, res) => {
    const { origin, destination, waypoints = [] } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({
        error: "Validation failed",
        details: ["origin and destination are required"],
      });
    }

    // Mock route calculation
    let totalDistance = 0;
    let totalDuration = 0;
    const routePoints = [origin, ...waypoints, destination];

    for (let i = 0; i < routePoints.length - 1; i++) {
      const distance = geolib.getDistance(
        { latitude: routePoints[i].lat, longitude: routePoints[i].lng },
        { latitude: routePoints[i + 1].lat, longitude: routePoints[i + 1].lng }
      );

      totalDistance += distance / 1000; // Convert to kilometers
      totalDuration += (distance / 1000) * 60; // Assume 1 km per minute
    }

    res.json({
      route: {
        total_distance: Math.round(totalDistance * 100) / 100,
        total_duration: Math.round(totalDuration),
        waypoints_count: waypoints.length,
        route_points: routePoints,
        calculation_method: "haversine_distance",
      },
      calculation_time: new Date().toISOString(),
    });
  }
);

app.get(
  "/api/matching/stats/:trip_id",
  mockAuthMiddleware,
  async (req, res) => {
    const { trip_id } = req.params;

    const trip = mockDb.carpool_trips.find((t) => t._id.toString() === trip_id);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    // Mock statistics calculation
    const candidates = mockDb.carpool_trips.filter(
      (t) =>
        t._id.toString() !== trip_id &&
        t.office_id === trip.office_id &&
        t.role !== trip.role
    );

    const distances = candidates.map((candidate) => {
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

    res.json({
      trip_id: trip_id,
      statistics: {
        total_candidates: candidates.length,
        average_distance_km:
          distances.length > 0
            ? Math.round(
                (distances.reduce((a, b) => a + b, 0) / distances.length) * 100
              ) / 100
            : 0,
        closest_match_km: distances.length > 0 ? Math.min(...distances) : null,
        furthest_match_km: distances.length > 0 ? Math.max(...distances) : null,
        time_window_matches: candidates.length,
      },
    });
  }
);

describe("Matching Service", () => {
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
      expect(response.body.service).toBe("Matching Service");
      expect(response.body.version).toBe("1.0.0");
    });
  });

  describe("POST /api/matching/find-matches", () => {
    beforeEach(() => {
      // Add test trips
      mockDb.carpool_trips = [
        {
          _id: { toString: () => "507f1f77bcf86cd799439031" },
          office_id: "office_001",
          user_id: "507f1f77bcf86cd799439011",
          role: "driver",
          trip_type: "offer",
          direction: "to_office",
          status: "available",
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
          departure_time: new Date("2025-10-30T08:00:00.000Z"),
          max_passengers: 3,
          cost_per_passenger: 5.0,
        },
        {
          _id: { toString: () => "507f1f77bcf86cd799439032" },
          office_id: "office_001",
          user_id: "507f1f77bcf86cd799439012",
          role: "rider",
          trip_type: "request",
          direction: "to_office",
          status: "seeking",
          origin_location: {
            type: "Point",
            coordinates: [-122.42, 37.775],
            address: "124 Home St",
          },
          destination_location: {
            type: "Point",
            coordinates: [-122.41, 37.785],
            address: "457 Office Ave",
          },
          departure_time: new Date("2025-10-30T08:05:00.000Z"),
        },
      ];
    });

    it("should find matches for a driver trip", async () => {
      const response = await request(app)
        .post("/api/matching/find-matches")
        .send({
          trip_id: "507f1f77bcf86cd799439031",
          max_matches: 5,
          max_detour_km: 5,
          max_detour_minutes: 15,
        })
        .expect(200);

      expect(response.body.trip_id).toBe("507f1f77bcf86cd799439031");
      expect(response.body.trip_type).toBe("driver");
      expect(Array.isArray(response.body.matches)).toBe(true);
      expect(response.body.total_matches).toBeGreaterThanOrEqual(0);
    });

    it("should return validation error for missing trip_id", async () => {
      const response = await request(app)
        .post("/api/matching/find-matches")
        .send({
          max_matches: 5,
        })
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toContain("trip_id is required");
    });

    it("should return 404 for non-existent trip", async () => {
      const response = await request(app)
        .post("/api/matching/find-matches")
        .send({
          trip_id: "507f1f77bcf86cd799439999",
        })
        .expect(404);

      expect(response.body.error).toBe("Trip not found");
    });

    it("should limit matches to max_matches parameter", async () => {
      // Add more test trips
      for (let i = 0; i < 10; i++) {
        mockDb.carpool_trips.push({
          _id: { toString: () => `507f1f77bcf86cd79943903${i}` },
          office_id: "office_001",
          user_id: `507f1f77bcf86cd79943901${i}`,
          role: "rider",
          trip_type: "request",
          direction: "to_office",
          status: "seeking",
          origin_location: {
            type: "Point",
            coordinates: [-122.42 + i * 0.001, 37.775 + i * 0.001],
            address: `${124 + i} Home St`,
          },
          destination_location: {
            type: "Point",
            coordinates: [-122.41, 37.785],
            address: "457 Office Ave",
          },
          departure_time: new Date("2025-10-30T08:05:00.000Z"),
        });
      }

      const response = await request(app)
        .post("/api/matching/find-matches")
        .send({
          trip_id: "507f1f77bcf86cd799439031",
          max_matches: 3,
        })
        .expect(200);

      expect(response.body.matches.length).toBeLessThanOrEqual(3);
    });
  });

  describe("POST /api/matching/calculate-route", () => {
    it("should calculate route with waypoints", async () => {
      const response = await request(app)
        .post("/api/matching/calculate-route")
        .send({
          origin: { lat: 37.7749, lng: -122.4194 },
          destination: { lat: 37.7849, lng: -122.4094 },
          waypoints: [{ lat: 37.7799, lng: -122.4144 }],
        })
        .expect(200);

      expect(response.body.route).toBeDefined();
      expect(response.body.route.total_distance).toBeGreaterThan(0);
      expect(response.body.route.total_duration).toBeGreaterThan(0);
      expect(response.body.route.waypoints_count).toBe(1);
      expect(response.body.route.calculation_method).toBe("haversine_distance");
    });

    it("should calculate direct route without waypoints", async () => {
      const response = await request(app)
        .post("/api/matching/calculate-route")
        .send({
          origin: { lat: 37.7749, lng: -122.4194 },
          destination: { lat: 37.7849, lng: -122.4094 },
        })
        .expect(200);

      expect(response.body.route.waypoints_count).toBe(0);
      expect(response.body.route.route_points.length).toBe(2);
    });

    it("should return validation error for missing origin", async () => {
      const response = await request(app)
        .post("/api/matching/calculate-route")
        .send({
          destination: { lat: 37.7849, lng: -122.4094 },
        })
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toContain(
        "origin and destination are required"
      );
    });
  });

  describe("GET /api/matching/stats/:trip_id", () => {
    beforeEach(() => {
      mockDb.carpool_trips = [
        {
          _id: { toString: () => "507f1f77bcf86cd799439031" },
          office_id: "office_001",
          user_id: "507f1f77bcf86cd799439011",
          role: "driver",
          trip_type: "offer",
          direction: "to_office",
          status: "available",
          origin_location: {
            type: "Point",
            coordinates: [-122.4194, 37.7749],
          },
          destination_location: {
            type: "Point",
            coordinates: [-122.4094, 37.7849],
          },
        },
        {
          _id: { toString: () => "507f1f77bcf86cd799439032" },
          office_id: "office_001",
          user_id: "507f1f77bcf86cd799439012",
          role: "rider",
          trip_type: "request",
          direction: "to_office",
          status: "seeking",
          origin_location: {
            type: "Point",
            coordinates: [-122.42, 37.775],
          },
          destination_location: {
            type: "Point",
            coordinates: [-122.41, 37.785],
          },
        },
      ];
    });

    it("should return matching statistics", async () => {
      const response = await request(app)
        .get("/api/matching/stats/507f1f77bcf86cd799439031")
        .expect(200);

      expect(response.body.trip_id).toBe("507f1f77bcf86cd799439031");
      expect(response.body.statistics).toBeDefined();
      expect(response.body.statistics.total_candidates).toBeGreaterThanOrEqual(
        0
      );
      expect(typeof response.body.statistics.average_distance_km).toBe(
        "number"
      );
    });

    it("should return 404 for non-existent trip", async () => {
      const response = await request(app)
        .get("/api/matching/stats/507f1f77bcf86cd799439999")
        .expect(404);

      expect(response.body.error).toBe("Trip not found");
    });

    it("should handle trips with no candidates", async () => {
      // Remove all potential candidates
      mockDb.carpool_trips = [
        {
          _id: { toString: () => "507f1f77bcf86cd799439031" },
          office_id: "office_001",
          user_id: "507f1f77bcf86cd799439011",
          role: "driver",
          trip_type: "offer",
          direction: "to_office",
          status: "available",
          origin_location: {
            type: "Point",
            coordinates: [-122.4194, 37.7749],
          },
          destination_location: {
            type: "Point",
            coordinates: [-122.4094, 37.7849],
          },
        },
      ];

      const response = await request(app)
        .get("/api/matching/stats/507f1f77bcf86cd799439031")
        .expect(200);

      expect(response.body.statistics.total_candidates).toBe(0);
      expect(response.body.statistics.average_distance_km).toBe(0);
      expect(response.body.statistics.closest_match_km).toBeNull();
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
