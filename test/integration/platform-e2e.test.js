const request = require("supertest");
const { MongoClient } = require("mongodb");

/**
 * End-to-End Platform Integration Tests
 * Tests complete user journeys across all modules
 */

describe("OfficeShare Platform E2E Tests", () => {
  let db;
  let mongoClient;
  let authToken;
  let userId;
  let officeId = "office_001";

  const API_GATEWAY = process.env.API_GATEWAY_URL || "http://localhost:3000";
  const USER_SERVICE = process.env.USER_SERVICE_URL || "http://localhost:3001";
  const CARPOOL_SERVICE =
    process.env.CARPOOL_SERVICE_URL || "http://localhost:3002";
  const FEEDBACK_SERVICE =
    process.env.FEEDBACK_SERVICE_URL || "http://localhost:3009";

  beforeAll(async () => {
    // Connect to test database
    mongoClient = new MongoClient(
      process.env.MONGODB_URI || "mongodb://localhost:27017"
    );
    await mongoClient.connect();
    db = mongoClient.db("officeshare_test");

    // Clean up test data
    await db.collection("users").deleteMany({ email: /test.*@example\.com/ });
    await db.collection("carpool_trips").deleteMany({ office_id: officeId });
    await db.collection("user_feedback").deleteMany({ office_id: officeId });
  });

  afterAll(async () => {
    await mongoClient.close();
  });

  describe("User Authentication Flow", () => {
    test("should register a new user", async () => {
      const userData = {
        email: "test.user@example.com",
        password: "SecurePass123!",
        full_name: "Test User",
        office_id: officeId,
      };

      const response = await request(USER_SERVICE)
        .post("/api/users/register")
        .send(userData)
        .expect(201);

      expect(response.body.user).toBeDefined();
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(userData.email);

      authToken = response.body.token;
      userId = response.body.user.user_id;
    });

    test("should login with credentials", async () => {
      const loginData = {
        email: "test.user@example.com",
        password: "SecurePass123!",
      };

      const response = await request(USER_SERVICE)
        .post("/api/users/login")
        .send(loginData)
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.token).toBeDefined();
    });

    test("should get user profile", async () => {
      const response = await request(USER_SERVICE)
        .get("/api/users/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.user.email).toBe("test.user@example.com");
      expect(response.body.user.reputation_score).toBe(5.0);
    });

    test("should update user profile", async () => {
      const updateData = {
        full_name: "Updated Test User",
        preferences: {
          notifications_enabled: false,
          location_sharing: true,
        },
      };

      const response = await request(USER_SERVICE)
        .put("/api/users/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.user.full_name).toBe(updateData.full_name);
    });
  });

  describe("Carpooling Complete Journey", () => {
    let tripId;
    let secondUserId;
    let secondUserToken;

    beforeAll(async () => {
      // Create second user for ride matching
      const secondUser = {
        email: "test.rider@example.com",
        password: "SecurePass123!",
        full_name: "Test Rider",
        office_id: officeId,
      };

      const response = await request(USER_SERVICE)
        .post("/api/users/register")
        .send(secondUser)
        .expect(201);

      secondUserId = response.body.user.user_id;
      secondUserToken = response.body.token;
    });

    test("should create a carpool trip", async () => {
      const tripData = {
        trip_type: "driver",
        origin: {
          address: "123 Main St, City",
          coordinates: { lat: 40.7128, lng: -74.006 },
        },
        destination: {
          address: "456 Office Blvd, City",
          coordinates: { lat: 40.7589, lng: -73.9851 },
        },
        departure_time: new Date(Date.now() + 86400000).toISOString(),
        available_seats: 3,
        cost_per_rider: 5.0,
      };

      const response = await request(CARPOOL_SERVICE)
        .post("/api/trips")
        .set("Authorization", `Bearer ${authToken}`)
        .send(tripData)
        .expect(201);

      expect(response.body.trip).toBeDefined();
      tripId = response.body.trip.trip_id;
    });

    test("should find available trips", async () => {
      const response = await request(CARPOOL_SERVICE)
        .get("/api/trips?status=scheduled")
        .set("Authorization", `Bearer ${secondUserToken}`)
        .expect(200);

      expect(response.body.trips).toBeInstanceOf(Array);
      expect(response.body.trips.length).toBeGreaterThan(0);
    });

    test("should join a trip as rider", async () => {
      const response = await request(CARPOOL_SERVICE)
        .post(`/api/trips/${tripId}/join`)
        .set("Authorization", `Bearer ${secondUserToken}`)
        .expect(200);

      expect(response.body.message).toContain("joined");
    });

    test("should get trip details", async () => {
      const response = await request(CARPOOL_SERVICE)
        .get(`/api/trips/${tripId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.trip.trip_id).toBe(tripId);
      expect(response.body.trip.participants).toBeInstanceOf(Array);
    });

    test("should rate trip participant", async () => {
      const ratingData = {
        rating: 5,
        comment: "Great ride!",
        transaction_type: "carpool",
        transaction_id: tripId,
      };

      const response = await request(USER_SERVICE)
        .post(`/api/users/${userId}/rating`)
        .set("Authorization", `Bearer ${secondUserToken}`)
        .send(ratingData)
        .expect(200);

      expect(response.body.message).toContain("successfully");
    });
  });

  describe("Feedback and Analytics Journey", () => {
    test("should submit user feedback", async () => {
      const feedbackData = {
        category: "improvement",
        rating: 4,
        title: "Great carpooling feature",
        description:
          "The carpooling feature works well but could use better notifications",
        module: "carpooling",
      };

      const response = await request(FEEDBACK_SERVICE)
        .post("/api/feedback")
        .set("Authorization", `Bearer ${authToken}`)
        .send(feedbackData)
        .expect(201);

      expect(response.body.feedback_id).toBeDefined();
    });

    test("should track user behavior", async () => {
      const behaviorData = {
        event_type: "feature_used",
        module: "carpooling",
        screen: "TripSchedulingScreen",
        action: "create_trip",
        metadata: { trip_type: "driver" },
      };

      const response = await request(FEEDBACK_SERVICE)
        .post("/api/analytics/behavior")
        .set("Authorization", `Bearer ${authToken}`)
        .send(behaviorData)
        .expect(201);

      expect(response.body.message).toContain("successfully");
    });

    test("should track UX metrics", async () => {
      const metricData = {
        metric_type: "page_load_time",
        value: 850,
        screen: "TripSchedulingScreen",
        module: "carpooling",
      };

      const response = await request(FEEDBACK_SERVICE)
        .post("/api/analytics/ux-metrics")
        .set("Authorization", `Bearer ${authToken}`)
        .send(metricData)
        .expect(201);

      expect(response.body.message).toContain("successfully");
    });

    test("should retrieve user feedback history", async () => {
      const response = await request(FEEDBACK_SERVICE)
        .get(`/api/feedback/user/${userId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.feedback).toBeInstanceOf(Array);
      expect(response.body.total).toBeGreaterThan(0);
    });

    test("should retrieve behavior analytics", async () => {
      const response = await request(FEEDBACK_SERVICE)
        .get(`/api/analytics/behavior/user/${userId}?days=30`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.user_id).toBe(userId);
      expect(response.body.module_stats).toBeDefined();
    });
  });

  describe("Cross-Module Integration", () => {
    test("should verify user reputation updates across modules", async () => {
      const response = await request(USER_SERVICE)
        .get("/api/users/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.user.reputation_score).toBeGreaterThan(0);
    });

    test("should verify office-level data isolation", async () => {
      const response = await request(USER_SERVICE)
        .get(`/api/users/office/${officeId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.users).toBeInstanceOf(Array);
      response.body.users.forEach((user) => {
        expect(user.office_id).toBe(officeId);
      });
    });

    test("should verify feedback statistics aggregation", async () => {
      const response = await request(FEEDBACK_SERVICE)
        .get(`/api/feedback/stats/office/${officeId}?days=30`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.total).toBeGreaterThan(0);
    });
  });

  describe("Error Handling and Edge Cases", () => {
    test("should handle invalid authentication token", async () => {
      await request(USER_SERVICE)
        .get("/api/users/profile")
        .set("Authorization", "Bearer invalid_token")
        .expect(403);
    });

    test("should handle missing authentication", async () => {
      await request(USER_SERVICE).get("/api/users/profile").expect(401);
    });

    test("should handle invalid data submission", async () => {
      const invalidData = {
        category: "invalid",
        title: "ab", // Too short
      };

      await request(FEEDBACK_SERVICE)
        .post("/api/feedback")
        .set("Authorization", `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });

    test("should handle non-existent resource", async () => {
      await request(CARPOOL_SERVICE)
        .get("/api/trips/nonexistent_trip_id")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
    });

    test("should prevent cross-office data access", async () => {
      await request(USER_SERVICE)
        .get("/api/users/office/different_office_id")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(403);
    });
  });

  describe("Service Health Checks", () => {
    test("User Service should be healthy", async () => {
      const response = await request(USER_SERVICE).get("/health").expect(200);

      expect(response.body.status).toBe("healthy");
    });

    test("Carpool Service should be healthy", async () => {
      const response = await request(CARPOOL_SERVICE)
        .get("/health")
        .expect(200);

      expect(response.body.status).toBe("healthy");
    });

    test("Feedback Service should be healthy", async () => {
      const response = await request(FEEDBACK_SERVICE)
        .get("/health")
        .expect(200);

      expect(response.body.status).toBe("healthy");
    });
  });

  describe("Performance and Load", () => {
    test("should handle concurrent user registrations", async () => {
      const registrations = Array.from({ length: 5 }, (_, i) => ({
        email: `concurrent.user${i}@example.com`,
        password: "SecurePass123!",
        full_name: `Concurrent User ${i}`,
        office_id: officeId,
      }));

      const promises = registrations.map((userData) =>
        request(USER_SERVICE).post("/api/users/register").send(userData)
      );

      const results = await Promise.all(promises);

      results.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body.user).toBeDefined();
      });
    });

    test("should handle concurrent feedback submissions", async () => {
      const feedbacks = Array.from({ length: 5 }, (_, i) => ({
        category: "general",
        rating: 4,
        title: `Concurrent Feedback ${i}`,
        description: `This is concurrent feedback number ${i} for testing`,
        module: "general",
      }));

      const promises = feedbacks.map((feedbackData) =>
        request(FEEDBACK_SERVICE)
          .post("/api/feedback")
          .set("Authorization", `Bearer ${authToken}`)
          .send(feedbackData)
      );

      const results = await Promise.all(promises);

      results.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body.feedback_id).toBeDefined();
      });
    });
  });
});
