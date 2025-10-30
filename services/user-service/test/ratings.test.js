const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");

// Mock MongoDB with proper ObjectId handling
const mockDb = {
  users: [],
  user_ratings: [],
};

// Create test app
const app = express();
app.use(express.json());

// Mock database with proper ObjectId validation
app.locals.db = {
  collection: (name) => ({
    findOne: jest.fn().mockImplementation((query) => {
      const collection = mockDb[name] || [];
      return Promise.resolve(
        collection.find((item) => {
          if (query._id && query._id.toString) {
            return item._id && item._id.toString() === query._id.toString();
          }
          if (query.email) {
            return item.email === query.email;
          }
          if (query.office_id && query.email) {
            return (
              item.office_id === query.office_id && item.email === query.email
            );
          }
          if (
            query.rated_user_id &&
            query.rater_user_id &&
            query.transaction_id
          ) {
            return (
              item.rated_user_id === query.rated_user_id &&
              item.rater_user_id === query.rater_user_id &&
              item.transaction_id === query.transaction_id
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
    deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    find: jest.fn().mockImplementation((query) => ({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockImplementation(() => {
        const collection = mockDb[name] || [];
        return Promise.resolve(
          collection.filter((item) => {
            if (query.rated_user_id) {
              return item.rated_user_id === query.rated_user_id;
            }
            return true;
          })
        );
      }),
    })),
    countDocuments: jest.fn().mockImplementation((query) => {
      const collection = mockDb[name] || [];
      return Promise.resolve(
        collection.filter((item) => {
          if (query.rated_user_id) {
            return item.rated_user_id === query.rated_user_id;
          }
          return true;
        }).length
      );
    }),
  }),
};

// Import routes
const ratingsRoutes = require("../routes/ratings");
app.use("/api/users", ratingsRoutes);

describe("Ratings Routes - Fixed", () => {
  let validAccessToken;
  let testUser;
  let targetUser;

  beforeEach(() => {
    // Clear mock database
    mockDb.users = [];
    mockDb.user_ratings = [];

    // Create test users with valid ObjectId format
    testUser = {
      _id: { toString: () => "507f1f77bcf86cd799439011" },
      office_id: "office_001",
      email: "test@company.com",
      full_name: "Test User",
      reputation_score: 5.0,
    };

    targetUser = {
      _id: { toString: () => "507f1f77bcf86cd799439012" },
      office_id: "office_001",
      email: "target@company.com",
      full_name: "Target User",
      reputation_score: 4.5,
    };

    mockDb.users.push(testUser, targetUser);

    // Create valid access token
    validAccessToken = jwt.sign(
      {
        user_id: "507f1f77bcf86cd799439011",
        email: "test@company.com",
        office_id: "office_001",
      },
      "officeshare-dev-secret-key-2024",
      { expiresIn: "24h" }
    );

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe("POST /api/users/:user_id/rating", () => {
    it("should submit rating successfully", async () => {
      const ratingData = {
        rating: 5,
        comment: "Great colleague!",
        transaction_type: "carpool",
        transaction_id: "trip-123",
      };

      const response = await request(app)
        .post("/api/users/507f1f77bcf86cd799439012/rating")
        .set("Authorization", `Bearer ${validAccessToken}`)
        .send(ratingData)
        .expect(201);

      expect(response.body.message).toBe("Rating submitted successfully");
      expect(response.body.rating_id).toBeDefined();
      expect(response.body.new_reputation_score).toBeDefined();
    });

    it("should return validation error for invalid rating", async () => {
      const ratingData = {
        rating: 6, // Invalid - should be 1-5
        comment: "Great colleague!",
      };

      const response = await request(app)
        .post("/api/users/507f1f77bcf86cd799439012/rating")
        .set("Authorization", `Bearer ${validAccessToken}`)
        .send(ratingData)
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toContain("Rating cannot exceed 5");
    });

    it("should return error for self-rating", async () => {
      const ratingData = {
        rating: 5,
        comment: "Great colleague!",
      };

      const response = await request(app)
        .post("/api/users/507f1f77bcf86cd799439011/rating")
        .set("Authorization", `Bearer ${validAccessToken}`)
        .send(ratingData)
        .expect(400);

      expect(response.body.error).toBe("Self-rating not allowed");
    });

    it("should return error for user not found", async () => {
      const ratingData = {
        rating: 5,
        comment: "Great colleague!",
      };

      const response = await request(app)
        .post("/api/users/507f1f77bcf86cd799439999/rating")
        .set("Authorization", `Bearer ${validAccessToken}`)
        .send(ratingData)
        .expect(404);

      expect(response.body.error).toBe("User not found");
    });

    it("should return error for missing authorization", async () => {
      const ratingData = {
        rating: 5,
        comment: "Great colleague!",
      };

      const response = await request(app)
        .post("/api/users/507f1f77bcf86cd799439012/rating")
        .send(ratingData)
        .expect(401);

      expect(response.body.error).toBe("Access token required");
    });
  });

  describe("GET /api/users/:user_id/ratings", () => {
    beforeEach(() => {
      // Add some test ratings with valid ObjectIds
      mockDb.user_ratings.push(
        {
          _id: { toString: () => "507f1f77bcf86cd799439021" },
          rated_user_id: "507f1f77bcf86cd799439012",
          rater_user_id: "507f1f77bcf86cd799439011",
          office_id: "office_001",
          rating: 5,
          comment: "Excellent!",
          transaction_type: "carpool",
          created_at: new Date("2024-01-01"),
        },
        {
          _id: { toString: () => "507f1f77bcf86cd799439022" },
          rated_user_id: "507f1f77bcf86cd799439012",
          rater_user_id: "507f1f77bcf86cd799439013",
          office_id: "office_001",
          rating: 4,
          comment: "Good experience",
          transaction_type: "bike",
          created_at: new Date("2024-01-02"),
        }
      );
    });

    it("should get ratings successfully", async () => {
      const response = await request(app)
        .get("/api/users/507f1f77bcf86cd799439012/ratings")
        .set("Authorization", `Bearer ${validAccessToken}`)
        .expect(200);

      expect(response.body.ratings).toBeDefined();
      expect(response.body.pagination).toBeDefined();
      expect(response.body.statistics).toBeDefined();
      expect(Array.isArray(response.body.ratings)).toBe(true);
    });

    it("should return error for missing authorization", async () => {
      const response = await request(app)
        .get("/api/users/507f1f77bcf86cd799439012/ratings")
        .expect(401);

      expect(response.body.error).toBe("Access token required");
    });
  });

  describe("GET /api/users/:user_id/rating-stats", () => {
    beforeEach(() => {
      // Add some test ratings for statistics
      mockDb.user_ratings.push(
        {
          rated_user_id: "507f1f77bcf86cd799439012",
          rating: 5,
          transaction_type: "carpool",
          created_at: new Date(),
        },
        {
          rated_user_id: "507f1f77bcf86cd799439012",
          rating: 4,
          transaction_type: "bike",
          created_at: new Date(),
        }
      );
    });

    it("should get rating statistics successfully", async () => {
      const response = await request(app)
        .get("/api/users/507f1f77bcf86cd799439012/rating-stats")
        .set("Authorization", `Bearer ${validAccessToken}`)
        .expect(200);

      expect(response.body.user_id).toBe("507f1f77bcf86cd799439012");
      expect(response.body.current_reputation_score).toBe(4.5);
      expect(response.body.statistics).toBeDefined();
    });

    it("should return error for missing authorization", async () => {
      const response = await request(app)
        .get("/api/users/507f1f77bcf86cd799439012/rating-stats")
        .expect(401);

      expect(response.body.error).toBe("Access token required");
    });
  });
});
