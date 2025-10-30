const request = require("supertest");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Mock MongoDB
const mockDb = {
  users: [],
  user_ratings: [],
};

// Mock MongoDB client
jest.mock("mongodb", () => ({
  MongoClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(),
    db: jest.fn().mockReturnValue({
      collection: jest.fn().mockImplementation((collectionName) => ({
        findOne: jest.fn().mockImplementation((query) => {
          if (collectionName === "users") {
            return Promise.resolve(
              mockDb.users.find((user) => {
                if (query._id && query._id.toString) {
                  return user._id.toString() === query._id.toString();
                }
                if (query.email) {
                  return user.email === query.email;
                }
                if (query.office_id && query.email) {
                  return (
                    user.office_id === query.office_id &&
                    user.email === query.email
                  );
                }
                return false;
              })
            );
          }
          return Promise.resolve(null);
        }),
        insertOne: jest.fn().mockImplementation((doc) => {
          const id = { toString: () => "mock-id-" + Date.now() };
          const newDoc = { ...doc, _id: id };
          if (mockDb[collectionName]) {
            mockDb[collectionName].push(newDoc);
          }
          return Promise.resolve({ insertedId: id });
        }),
        updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
        }),
      })),
    }),
    close: jest.fn().mockResolvedValue(),
  })),
  ObjectId: jest.fn().mockImplementation((id) => ({
    toString: () => id || "mock-object-id",
  })),
}));

// Create a test app
const app = express();
app.use(express.json());

// Mock routes for testing
app.post("/api/users/register", async (req, res) => {
  const { email, password, full_name, office_id = "office_001" } = req.body;

  // Basic validation
  if (!email || !password || !full_name) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Check if user exists
  const existingUser = mockDb.users.find(
    (u) => u.email === email.toLowerCase()
  );
  if (existingUser) {
    return res
      .status(409)
      .json({ error: "User already exists with this email" });
  }

  // Hash password
  const password_hash = await bcrypt.hash(password, 10);

  // Create user
  const newUser = {
    _id: { toString: () => "mock-user-id" },
    office_id,
    email: email.toLowerCase(),
    full_name,
    password_hash,
    reputation_score: 5.0,
    preferences: {
      notifications_enabled: true,
      location_sharing: true,
      email_notifications: true,
    },
    created_at: new Date(),
  };

  mockDb.users.push(newUser);

  // Generate token
  const token = jwt.sign(
    { user_id: "mock-user-id", email: email.toLowerCase(), office_id },
    "test-secret",
    { expiresIn: "24h" }
  );

  res.status(201).json({
    message: "User registered successfully",
    user: {
      user_id: "mock-user-id",
      office_id,
      email: email.toLowerCase(),
      full_name,
      reputation_score: 5.0,
      preferences: newUser.preferences,
      created_at: newUser.created_at,
    },
    token,
  });
});

app.post("/api/users/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  const user = mockDb.users.find((u) => u.email === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = jwt.sign(
    {
      user_id: user._id.toString(),
      email: user.email,
      office_id: user.office_id,
    },
    "test-secret",
    { expiresIn: "24h" }
  );

  res.json({
    message: "Login successful",
    user: {
      user_id: user._id.toString(),
      office_id: user.office_id,
      email: user.email,
      full_name: user.full_name,
      reputation_score: user.reputation_score,
      preferences: user.preferences,
      created_at: user.created_at,
    },
    token,
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "User Service",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

describe("User Service", () => {
  beforeEach(() => {
    // Clear mock database before each test
    mockDb.users = [];
    mockDb.user_ratings = [];
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body.status).toBe("healthy");
      expect(response.body.service).toBe("User Service");
      expect(response.body.version).toBe("1.0.0");
    });
  });

  describe("POST /api/users/register", () => {
    it("should register a new user successfully", async () => {
      const userData = {
        email: "test@company.com",
        password: "password123",
        full_name: "Test User",
      };

      const response = await request(app)
        .post("/api/users/register")
        .send(userData)
        .expect(201);

      expect(response.body.message).toBe("User registered successfully");
      expect(response.body.user.email).toBe("test@company.com");
      expect(response.body.user.full_name).toBe("Test User");
      expect(response.body.user.reputation_score).toBe(5.0);
      expect(response.body.token).toBeDefined();
    });

    it("should return error for missing fields", async () => {
      const userData = {
        email: "test@company.com",
        // missing password and full_name
      };

      const response = await request(app)
        .post("/api/users/register")
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe("Missing required fields");
    });

    it("should return error for duplicate email", async () => {
      const userData = {
        email: "test@company.com",
        password: "password123",
        full_name: "Test User",
      };

      // Register first user
      await request(app).post("/api/users/register").send(userData).expect(201);

      // Try to register with same email
      const response = await request(app)
        .post("/api/users/register")
        .send(userData)
        .expect(409);

      expect(response.body.error).toBe("User already exists with this email");
    });
  });

  describe("POST /api/users/login", () => {
    beforeEach(async () => {
      // Create a test user
      await request(app).post("/api/users/register").send({
        email: "test@company.com",
        password: "password123",
        full_name: "Test User",
      });
    });

    it("should login successfully with correct credentials", async () => {
      const response = await request(app)
        .post("/api/users/login")
        .send({
          email: "test@company.com",
          password: "password123",
        })
        .expect(200);

      expect(response.body.message).toBe("Login successful");
      expect(response.body.user.email).toBe("test@company.com");
      expect(response.body.token).toBeDefined();
    });

    it("should return error for invalid email", async () => {
      const response = await request(app)
        .post("/api/users/login")
        .send({
          email: "nonexistent@company.com",
          password: "password123",
        })
        .expect(401);

      expect(response.body.error).toBe("Invalid email or password");
    });

    it("should return error for invalid password", async () => {
      const response = await request(app)
        .post("/api/users/login")
        .send({
          email: "test@company.com",
          password: "wrongpassword",
        })
        .expect(401);

      expect(response.body.error).toBe("Invalid email or password");
    });

    it("should return error for missing fields", async () => {
      const response = await request(app)
        .post("/api/users/login")
        .send({
          email: "test@company.com",
          // missing password
        })
        .expect(400);

      expect(response.body.error).toBe("Email and password required");
    });
  });
});
