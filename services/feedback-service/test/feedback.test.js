const request = require("supertest");
const { MongoClient } = require("mongodb");
const jwt = require("jsonwebtoken");
const { app, setDatabase } = require("../server");

describe("Feedback Service Integration Tests", () => {
  let db;
  let mongoClient;
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Connect to test database
    mongoClient = new MongoClient(
      process.env.MONGODB_URI || "mongodb://localhost:27017"
    );
    await mongoClient.connect();
    db = mongoClient.db("officeshare_test");
    setDatabase(db);

    // Create test user
    testUser = {
      user_id: "test_user_123",
      email: "test@example.com",
      office_id: "office_001",
    };

    // Generate test token
    authToken = jwt.sign(
      testUser,
      process.env.JWT_SECRET || "officeshare-dev-secret-key-2024",
      { expiresIn: "1h" }
    );

    // Clean up test data
    await db
      .collection("user_feedback")
      .deleteMany({ office_id: "office_001" });
    await db
      .collection("user_behavior")
      .deleteMany({ office_id: "office_001" });
    await db.collection("ab_tests").deleteMany({ office_id: "office_001" });
  });

  afterAll(async () => {
    await mongoClient.close();
  });

  describe("Feedback Submission", () => {
    test("should submit feedback successfully", async () => {
      const feedbackData = {
        category: "bug",
        rating: 4,
        title: "App crashes on startup",
        description: "The app crashes when I try to open it on iOS 17",
        module: "general",
      };

      const response = await request(app)
        .post("/api/feedback")
        .set("Authorization", `Bearer ${authToken}`)
        .send(feedbackData)
        .expect(201);

      expect(response.body.message).toBe("Feedback submitted successfully");
      expect(response.body.feedback_id).toBeDefined();
    });

    test("should reject feedback with invalid data", async () => {
      const invalidData = {
        category: "invalid_category",
        title: "ab", // Too short
        description: "short", // Too short
      };

      await request(app)
        .post("/api/feedback")
        .set("Authorization", `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });

    test("should require authentication", async () => {
      const feedbackData = {
        category: "bug",
        title: "Test feedback",
        description: "This is a test feedback",
      };

      await request(app).post("/api/feedback").send(feedbackData).expect(401);
    });
  });

  describe("Feedback Retrieval", () => {
    beforeAll(async () => {
      // Insert test feedback
      await db.collection("user_feedback").insertMany([
        {
          user_id: testUser.user_id,
          office_id: testUser.office_id,
          category: "bug",
          rating: 3,
          title: "Test Bug 1",
          description: "Description for test bug 1",
          status: "new",
          created_at: new Date(),
        },
        {
          user_id: testUser.user_id,
          office_id: testUser.office_id,
          category: "feature_request",
          rating: 5,
          title: "Test Feature",
          description: "Description for test feature",
          status: "new",
          created_at: new Date(),
        },
      ]);
    });

    test("should retrieve user feedback", async () => {
      const response = await request(app)
        .get(`/api/feedback/user/${testUser.user_id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.feedback).toBeInstanceOf(Array);
      expect(response.body.feedback.length).toBeGreaterThan(0);
      expect(response.body.total).toBeGreaterThan(0);
    });

    test("should retrieve office feedback", async () => {
      const response = await request(app)
        .get(`/api/feedback/office/${testUser.office_id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.feedback).toBeInstanceOf(Array);
      expect(response.body.total).toBeGreaterThan(0);
    });

    test("should filter feedback by category", async () => {
      const response = await request(app)
        .get(`/api/feedback/office/${testUser.office_id}?category=bug`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.feedback).toBeInstanceOf(Array);
      response.body.feedback.forEach((f) => {
        expect(f.category).toBe("bug");
      });
    });
  });

  describe("Behavior Analytics", () => {
    test("should track behavior event", async () => {
      const eventData = {
        event_type: "screen_view",
        module: "carpooling",
        screen: "TripSchedulingScreen",
        action: "view",
        metadata: { source: "navigation" },
      };

      const response = await request(app)
        .post("/api/analytics/behavior")
        .set("Authorization", `Bearer ${authToken}`)
        .send(eventData)
        .expect(201);

      expect(response.body.message).toBe("Behavior event tracked successfully");
    });

    test("should retrieve user behavior analytics", async () => {
      const response = await request(app)
        .get(`/api/analytics/behavior/user/${testUser.user_id}?days=30`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.user_id).toBe(testUser.user_id);
      expect(response.body.total_events).toBeGreaterThanOrEqual(0);
      expect(response.body.module_stats).toBeDefined();
    });
  });

  describe("A/B Testing", () => {
    let testId;

    test("should create A/B test", async () => {
      const testData = {
        test_name: "New Booking Flow",
        description: "Testing simplified booking",
        variants: [
          {
            variant_id: "control",
            name: "Original",
            description: "Current flow",
            allocation_percentage: 50,
          },
          {
            variant_id: "variant_a",
            name: "Simplified",
            description: "New flow",
            allocation_percentage: 50,
          },
        ],
        module: "carpooling",
        target_metric: "completion_rate",
      };

      const response = await request(app)
        .post("/api/ab-tests")
        .set("Authorization", `Bearer ${authToken}`)
        .send(testData)
        .expect(201);

      expect(response.body.test_id).toBeDefined();
      testId = response.body.test_id;
    });

    test("should assign user to variant", async () => {
      const response = await request(app)
        .get(`/api/ab-tests/${testId}/variant`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.variant_id).toBeDefined();
      expect(["control", "variant_a"]).toContain(response.body.variant_id);
    });

    test("should track conversion", async () => {
      const conversionData = {
        metric_value: 1,
        metadata: { time_to_complete: 45 },
      };

      const response = await request(app)
        .post(`/api/ab-tests/${testId}/conversion`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(conversionData)
        .expect(200);

      expect(response.body.message).toBe("Conversion tracked successfully");
    });

    test("should retrieve A/B test results", async () => {
      const response = await request(app)
        .get(`/api/ab-tests/${testId}/results`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.test_id).toBe(testId);
      expect(response.body.results).toBeDefined();
    });
  });

  describe("UX Metrics", () => {
    test("should track UX metric", async () => {
      const metricData = {
        metric_type: "page_load_time",
        value: 1250,
        screen: "HomeScreen",
        module: "general",
      };

      const response = await request(app)
        .post("/api/analytics/ux-metrics")
        .set("Authorization", `Bearer ${authToken}`)
        .send(metricData)
        .expect(201);

      expect(response.body.message).toBe("UX metric tracked successfully");
    });

    test("should retrieve UX metrics summary", async () => {
      const response = await request(app)
        .get("/api/analytics/ux-metrics/summary?days=7")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.period_days).toBe(7);
      expect(response.body.summary).toBeDefined();
    });
  });

  describe("Feedback Statistics", () => {
    test("should retrieve feedback statistics", async () => {
      const response = await request(app)
        .get(`/api/feedback/stats/office/${testUser.office_id}?days=30`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.total).toBeGreaterThanOrEqual(0);
      expect(response.body.stats.by_category).toBeDefined();
      expect(response.body.stats.avg_rating).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Health Check", () => {
    test("should return healthy status", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body.status).toBe("healthy");
      expect(response.body.service).toBe("Feedback Service");
    });
  });
});
