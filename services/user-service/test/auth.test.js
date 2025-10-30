const request = require("supertest");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Mock MongoDB
const mockDb = {
  users: [],
  refresh_tokens: [],
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
        collection.find((user) => {
          if (query._id && query._id.toString) {
            return user._id.toString() === query._id.toString();
          }
          if (query.email) {
            return user.email === query.email;
          }
          if (query.office_id && query.email) {
            return (
              user.office_id === query.office_id && user.email === query.email
            );
          }
          if (query.user_id && query.token) {
            return user.user_id === query.user_id && user.token === query.token;
          }
          return false;
        })
      );
    }),
    insertOne: jest.fn().mockImplementation((doc) => {
      const id = { toString: () => "507f1f77bcf86cd799439011" };
      const newDoc = { ...doc, _id: id };
      if (mockDb[name]) {
        mockDb[name].push(newDoc);
      }
      return Promise.resolve({ insertedId: id });
    }),
    updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
    deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
  }),
};

// Import routes
const authRoutes = require("../routes/auth");
app.use("/api/auth", authRoutes);

describe("Authentication Routes - Simple", () => {
  beforeEach(() => {
    // Clear mock database
    mockDb.users = [];
    mockDb.refresh_tokens = [];

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe("POST /api/auth/register", () => {
    it("should register a new user successfully", async () => {
      const userData = {
        email: "test@company.com",
        password: "Password123",
        full_name: "Test User",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(201);

      expect(response.body.message).toBe("User registered successfully");
      expect(response.body.user.email).toBe("test@company.com");
      expect(response.body.user.full_name).toBe("Test User");
      expect(response.body.user.reputation_score).toBe(5.0);
      expect(response.body.tokens.access_token).toBeDefined();
      expect(response.body.tokens.refresh_token).toBeDefined();
    });

    it("should return validation error for weak password", async () => {
      const userData = {
        email: "test@company.com",
        password: "weak",
        full_name: "Test User",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toContain(
        "Password must be at least 8 characters long"
      );
    });

    it("should return validation error for invalid email", async () => {
      const userData = {
        email: "invalid-email",
        password: "Password123",
        full_name: "Test User",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toContain(
        "Please provide a valid email address"
      );
    });

    it("should return error for duplicate email", async () => {
      const userData = {
        email: "test@company.com",
        password: "Password123",
        full_name: "Test User",
      };

      // Mock existing user
      mockDb.users.push({
        _id: { toString: () => "507f1f77bcf86cd799439010" },
        office_id: "office_001",
        email: "test@company.com",
        full_name: "Existing User",
      });

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(409);

      expect(response.body.error).toBe("User already exists");
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      // Create a test user
      const hashedPassword = await bcrypt.hash("Password123", 12);
      mockDb.users.push({
        _id: { toString: () => "507f1f77bcf86cd799439011" },
        office_id: "office_001",
        email: "test@company.com",
        full_name: "Test User",
        password_hash: hashedPassword,
        reputation_score: 5.0,
        is_admin: false,
        preferences: {
          notifications_enabled: true,
          location_sharing: true,
          email_notifications: true,
        },
        security: {
          login_attempts: 0,
          account_locked: false,
        },
        created_at: new Date(),
      });
    });

    it("should login successfully with correct credentials", async () => {
      const loginData = {
        email: "test@company.com",
        password: "Password123",
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(200);

      expect(response.body.message).toBe("Login successful");
      expect(response.body.user.email).toBe("test@company.com");
      expect(response.body.tokens.access_token).toBeDefined();
      expect(response.body.tokens.refresh_token).toBeDefined();
    });

    it("should return error for invalid email", async () => {
      const loginData = {
        email: "nonexistent@company.com",
        password: "Password123",
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe("Invalid credentials");
    });

    it("should return error for invalid password", async () => {
      const loginData = {
        email: "test@company.com",
        password: "WrongPassword",
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe("Invalid credentials");
    });

    it("should return validation error for missing fields", async () => {
      const loginData = {
        email: "test@company.com",
        // missing password
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(400);

      expect(response.body.error).toBe("Validation failed");
      expect(response.body.details).toContain("Password is required");
    });
  });

  describe("POST /api/auth/logout", () => {
    let validAccessToken;

    beforeEach(() => {
      validAccessToken = jwt.sign(
        {
          user_id: "507f1f77bcf86cd799439011",
          email: "test@company.com",
          office_id: "office_001",
        },
        "officeshare-dev-secret-key-2024",
        { expiresIn: "24h" }
      );
    });

    it("should logout successfully", async () => {
      const response = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${validAccessToken}`)
        .expect(200);

      expect(response.body.message).toBe("Logout successful");
    });

    it("should return error for missing token", async () => {
      const response = await request(app).post("/api/auth/logout").expect(401);

      expect(response.body.error).toBe("Access token required");
    });
  });
});
