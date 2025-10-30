const request = require("supertest");
const { MongoClient } = require("mongodb");
const jwt = require("jsonwebtoken");

// Mock environment variables
process.env.MONGODB_URI = "mongodb://localhost:27017";
process.env.MONGODB_DB_NAME = "officeshare_test";
process.env.JWT_SECRET = "test-secret-key";
process.env.GAMIFICATION_SERVICE_PORT = "3008";

let app;
let mongoClient;
let db;
let authToken;
let testUserId;
let testOfficeId = "office_test_001";

beforeAll(async () => {
  // Connect to test database
  mongoClient = new MongoClient(process.env.MONGODB_URI);
  await mongoClient.connect();
  db = mongoClient.db(process.env.MONGODB_DB_NAME);

  // Import app and set database
  const serverModule = require("../server");
  app = serverModule.app;
  serverModule.setDatabase(db);

  // Clear test collections
  await db.collection("user_achievements").deleteMany({});
  await db.collection("user_badges").deleteMany({});
  await db.collection("users").deleteMany({});

  // Create test user
  const testUser = {
    email: "test@example.com",
    full_name: "Test User",
    office_id: testOfficeId,
    reputation_score: 5.0,
    created_at: new Date(),
  };
  const result = await db.collection("users").insertOne(testUser);
  testUserId = result.insertedId.toString();

  // Generate test token
  authToken = jwt.sign(
    {
      user_id: testUserId,
      email: "test@example.com",
      office_id: testOfficeId,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
});

afterAll(async () => {
  // Clean up
  await db.collection("user_achievements").deleteMany({});
  await db.collection("user_badges").deleteMany({});
  await db.collection("users").deleteMany({});
  await mongoClient.close();
});

describe("Gamification Service", () => {
  describe("Health Check", () => {
    test("should return healthy status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("healthy");
      expect(response.body.service).toBe("Gamification Service");
    });
  });

  describe("Badge System", () => {
    test("should get all badge definitions", async () => {
      const response = await request(app)
        .get("/api/gamification/badges/definitions")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.badges).toBeDefined();
      expect(Array.isArray(response.body.badges)).toBe(true);
      expect(response.body.badges.length).toBeGreaterThan(0);

      // Check badge structure
      const firstBadge = response.body.badges[0];
      expect(firstBadge).toHaveProperty("id");
      expect(firstBadge).toHaveProperty("name");
      expect(firstBadge).toHaveProperty("description");
      expect(firstBadge).toHaveProperty("icon");
      expect(firstBadge).toHaveProperty("category");
      expect(firstBadge).toHaveProperty("criteria");
    });

    test("should get user badges (empty initially)", async () => {
      const response = await request(app)
        .get(`/api/gamification/badges/${testUserId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user_id).toBe(testUserId);
      expect(response.body.badges).toBeDefined();
      expect(Array.isArray(response.body.badges)).toBe(true);
      expect(response.body.total_badges).toBe(0);
    });

    test("should award badge when criteria met", async () => {
      // Increment carpool trips to trigger first badge
      const incrementResponse = await request(app)
        .post("/api/gamification/achievements/increment")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          user_id: testUserId,
          field: "carpoolTrips",
          amount: 1,
        });

      expect(incrementResponse.status).toBe(200);
      expect(incrementResponse.body.new_badges).toBeDefined();
      expect(incrementResponse.body.new_badges.length).toBeGreaterThan(0);

      // Verify badge was awarded
      const badgesResponse = await request(app)
        .get(`/api/gamification/badges/${testUserId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(badgesResponse.status).toBe(200);
      expect(badgesResponse.body.total_badges).toBeGreaterThan(0);
      expect(badgesResponse.body.badges[0].badge_id).toBe("first_ride");
    });
  });

  describe("Achievement Tracking", () => {
    test("should initialize achievements for new user", async () => {
      const response = await request(app)
        .get(`/api/gamification/achievements/${testUserId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user_id).toBe(testUserId);
      expect(response.body.achievements).toBeDefined();
      expect(response.body.progress).toBeDefined();
    });

    test("should increment achievement counter", async () => {
      const response = await request(app)
        .post("/api/gamification/achievements/increment")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          user_id: testUserId,
          field: "bikeTransactions",
          amount: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe(
        "Achievement incremented successfully"
      );
      expect(response.body.field).toBe("bikeTransactions");

      // Verify increment
      const achievementsResponse = await request(app)
        .get(`/api/gamification/achievements/${testUserId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(achievementsResponse.body.achievements.bikeTransactions).toBe(1);
    });

    test("should calculate progress correctly", async () => {
      // Set specific achievement values
      await request(app)
        .post("/api/gamification/achievements/increment")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          user_id: testUserId,
          field: "bookTransactions",
          amount: 3,
        });

      const response = await request(app)
        .get(`/api/gamification/achievements/${testUserId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.progress.bookTransactions).toBeDefined();
      expect(response.body.progress.bookTransactions.current).toBe(3);
      expect(
        response.body.progress.bookTransactions.nextMilestone
      ).toBeGreaterThan(3);
    });

    test("should reject invalid field in increment", async () => {
      const response = await request(app)
        .post("/api/gamification/achievements/increment")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          user_id: testUserId,
          field: "invalidField",
          amount: 1,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid field");
    });
  });

  describe("Leaderboard System", () => {
    beforeAll(async () => {
      // Create additional test users with achievements
      const users = [
        { name: "User A", carpoolTrips: 50 },
        { name: "User B", carpoolTrips: 30 },
        { name: "User C", carpoolTrips: 20 },
      ];

      for (const userData of users) {
        const user = await db.collection("users").insertOne({
          email: `${userData.name.toLowerCase().replace(" ", "")}@example.com`,
          full_name: userData.name,
          office_id: testOfficeId,
          reputation_score: 5.0,
          created_at: new Date(),
        });

        await db.collection("user_achievements").insertOne({
          user_id: user.insertedId.toString(),
          office_id: testOfficeId,
          carpoolTrips: userData.carpoolTrips,
          bikeTransactions: 0,
          bookTransactions: 0,
          booksShared: 0,
          co2Saved: userData.carpoolTrips * 5,
          totalTransactions: userData.carpoolTrips,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    });

    test("should get leaderboard for category", async () => {
      const response = await request(app)
        .get("/api/gamification/leaderboard/carpoolTrips")
        .set("Authorization", `Bearer ${authToken}`)
        .query({ limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.category).toBe("carpoolTrips");
      expect(response.body.leaderboard).toBeDefined();
      expect(Array.isArray(response.body.leaderboard)).toBe(true);
      expect(response.body.leaderboard.length).toBeGreaterThan(0);

      // Check ranking order
      const leaderboard = response.body.leaderboard;
      for (let i = 0; i < leaderboard.length - 1; i++) {
        expect(leaderboard[i].value).toBeGreaterThanOrEqual(
          leaderboard[i + 1].value
        );
        expect(leaderboard[i].rank).toBe(i + 1);
      }
    });

    test("should reject invalid category", async () => {
      const response = await request(app)
        .get("/api/gamification/leaderboard/invalidCategory")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid category");
    });

    test("should get user rank in category", async () => {
      const response = await request(app)
        .get(`/api/gamification/rank/${testUserId}/carpoolTrips`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user_id).toBe(testUserId);
      expect(response.body.category).toBe("carpoolTrips");
      expect(response.body.rank).toBeDefined();
      expect(response.body.value).toBeDefined();
      expect(response.body.total_users).toBeGreaterThan(0);
    });
  });

  describe("Environmental Impact", () => {
    test("should calculate user environmental impact", async () => {
      // Set CO2 savings
      await request(app)
        .post("/api/gamification/achievements/increment")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          user_id: testUserId,
          field: "co2Saved",
          amount: 100,
        });

      const response = await request(app)
        .get(`/api/gamification/environmental-impact/${testUserId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user_id).toBe(testUserId);
      expect(response.body.co2_saved_kg).toBeGreaterThan(0);
      expect(response.body.trees_equivalent).toBeGreaterThan(0);
      expect(response.body.miles_not_driven).toBeGreaterThan(0);
    });

    test("should calculate office-wide environmental impact", async () => {
      const response = await request(app)
        .get(`/api/gamification/environmental-impact/office/${testOfficeId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.office_id).toBe(testOfficeId);
      expect(response.body.total_co2_saved_kg).toBeGreaterThan(0);
      expect(response.body.trees_equivalent).toBeGreaterThan(0);
      expect(response.body.miles_not_driven).toBeGreaterThan(0);
      expect(response.body.active_users).toBeGreaterThan(0);
    });

    test("should deny access to other office data", async () => {
      const response = await request(app)
        .get("/api/gamification/environmental-impact/office/other_office_id")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Access denied to this office data");
    });
  });

  describe("Badge Awarding Logic", () => {
    test("should award multiple badges as milestones are reached", async () => {
      // Create a new test user for this test
      const newUser = await db.collection("users").insertOne({
        email: "badgetest@example.com",
        full_name: "Badge Test User",
        office_id: testOfficeId,
        reputation_score: 5.0,
        created_at: new Date(),
      });
      const newUserId = newUser.insertedId.toString();

      // Increment to trigger first badge
      let response = await request(app)
        .post("/api/gamification/achievements/increment")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          user_id: newUserId,
          field: "carpoolTrips",
          amount: 1,
        });

      expect(response.body.new_badges.length).toBe(1);
      expect(response.body.new_badges[0].badge_id).toBe("first_ride");

      // Increment to 10 to trigger second badge
      response = await request(app)
        .post("/api/gamification/achievements/increment")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          user_id: newUserId,
          field: "carpoolTrips",
          amount: 9,
        });

      expect(response.body.new_badges.length).toBe(1);
      expect(response.body.new_badges[0].badge_id).toBe("carpooler_10");

      // Verify total badges
      const badgesResponse = await request(app)
        .get(`/api/gamification/badges/${newUserId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(badgesResponse.body.total_badges).toBe(2);
    });

    test("should not award same badge twice", async () => {
      // Create a new test user
      const newUser = await db.collection("users").insertOne({
        email: "duplicate@example.com",
        full_name: "Duplicate Test User",
        office_id: testOfficeId,
        reputation_score: 5.0,
        created_at: new Date(),
      });
      const newUserId = newUser.insertedId.toString();

      // Award first badge
      await request(app)
        .post("/api/gamification/achievements/increment")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          user_id: newUserId,
          field: "bikeTransactions",
          amount: 1,
        });

      // Try to trigger same badge again
      const response = await request(app)
        .post("/api/gamification/achievements/increment")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          user_id: newUserId,
          field: "bikeTransactions",
          amount: 0,
        });

      expect(response.body.new_badges.length).toBe(0);
    });
  });

  describe("Authentication", () => {
    test("should reject requests without token", async () => {
      const response = await request(app).get(
        "/api/gamification/badges/definitions"
      );

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Access token required");
    });

    test("should reject requests with invalid token", async () => {
      const response = await request(app)
        .get("/api/gamification/badges/definitions")
        .set("Authorization", "Bearer invalid_token");

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Invalid or expired token");
    });
  });
});
