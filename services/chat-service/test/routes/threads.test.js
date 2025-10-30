const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const jwt = require("jsonwebtoken");
const { app } = require("../../src/server");
const ChatThread = require("../../src/models/ChatThread");
const ChatMessage = require("../../src/models/ChatMessage");

describe("Threads Routes", () => {
  let mongoServer;
  let authToken;
  let testUser;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test user and auth token
    testUser = {
      user_id: "user-1",
      office_id: "office-1",
      name: "John Doe",
      email: "john@example.com",
      role: "employee",
    };

    authToken = jwt.sign(testUser, process.env.JWT_SECRET || "test-secret");
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await ChatThread.deleteMany({});
    await ChatMessage.deleteMany({});
  });

  describe("GET /api/threads", () => {
    beforeEach(async () => {
      const threads = [
        {
          thread_id: "thread-1",
          office_id: "office-1",
          transaction_type: "carpool",
          transaction_id: "trip-1",
          title: "Carpool Thread",
          participants: [
            { user_id: "user-1", name: "John Doe", role: "owner" },
          ],
        },
        {
          thread_id: "thread-2",
          office_id: "office-1",
          transaction_type: "book_sharing",
          transaction_id: "book-1",
          title: "Book Thread",
          participants: [
            { user_id: "user-2", name: "Jane Smith", role: "owner" },
          ],
        },
      ];

      await ChatThread.insertMany(threads);
    });

    test("should get threads for authenticated user", async () => {
      const response = await request(app)
        .get("/api/threads")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.threads).toHaveLength(1);
      expect(response.body.threads[0].thread_id).toBe("thread-1");
    });

    test("should require authentication", async () => {
      await request(app).get("/api/threads").expect(401);
    });

    test("should filter by status", async () => {
      // Update one thread to archived
      await ChatThread.updateOne(
        { thread_id: "thread-1" },
        { status: "archived" }
      );

      const response = await request(app)
        .get("/api/threads?status=archived")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.threads).toHaveLength(1);
      expect(response.body.threads[0].status).toBe("archived");
    });

    test("should handle pagination", async () => {
      const response = await request(app)
        .get("/api/threads?limit=1&offset=0")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.pagination.limit).toBe(1);
      expect(response.body.pagination.offset).toBe(0);
    });
  });

  describe("GET /api/threads/:threadId", () => {
    let testThread;

    beforeEach(async () => {
      testThread = new ChatThread({
        thread_id: "thread-1",
        office_id: "office-1",
        transaction_type: "carpool",
        transaction_id: "trip-1",
        title: "Test Thread",
        participants: [{ user_id: "user-1", name: "John Doe", role: "owner" }],
      });
      await testThread.save();

      // Add some messages
      const messages = [
        {
          message_id: "msg-1",
          thread_id: "thread-1",
          office_id: "office-1",
          sender: { user_id: "user-1", name: "John Doe" },
          content: { text: "Hello" },
        },
        {
          message_id: "msg-2",
          thread_id: "thread-1",
          office_id: "office-1",
          sender: { user_id: "user-1", name: "John Doe" },
          content: { text: "World" },
        },
      ];
      await ChatMessage.insertMany(messages);
    });

    test("should get thread with messages", async () => {
      const response = await request(app)
        .get("/api/threads/thread-1")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.thread.thread_id).toBe("thread-1");
      expect(response.body.messages).toHaveLength(2);
    });

    test("should return 404 for non-existent thread", async () => {
      await request(app)
        .get("/api/threads/non-existent")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
    });

    test("should return 403 for non-participant", async () => {
      const otherUserToken = jwt.sign(
        {
          user_id: "user-999",
          office_id: "office-1",
          name: "Other User",
          email: "other@example.com",
          role: "employee",
        },
        process.env.JWT_SECRET || "test-secret"
      );

      await request(app)
        .get("/api/threads/thread-1")
        .set("Authorization", `Bearer ${otherUserToken}`)
        .expect(403);
    });
  });

  describe("POST /api/threads", () => {
    test("should create new thread", async () => {
      const threadData = {
        transaction_type: "carpool",
        transaction_id: "trip-123",
        title: "New Carpool Thread",
        description: "Discussion for carpool trip",
        participants: [
          {
            user_id: "user-2",
            name: "Jane Smith",
            role: "participant",
          },
        ],
      };

      const response = await request(app)
        .post("/api/threads")
        .set("Authorization", `Bearer ${authToken}`)
        .send(threadData)
        .expect(201);

      expect(response.body.thread.title).toBe(threadData.title);
      expect(response.body.thread.participants).toHaveLength(2); // Creator + participant
    });

    test("should prevent duplicate threads for same transaction", async () => {
      const threadData = {
        transaction_type: "carpool",
        transaction_id: "trip-123",
        title: "First Thread",
        participants: [],
      };

      // Create first thread
      await request(app)
        .post("/api/threads")
        .set("Authorization", `Bearer ${authToken}`)
        .send(threadData)
        .expect(201);

      // Try to create duplicate
      await request(app)
        .post("/api/threads")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ ...threadData, title: "Duplicate Thread" })
        .expect(409);
    });

    test("should validate required fields", async () => {
      const invalidData = {
        transaction_type: "carpool",
        // Missing required fields
      };

      await request(app)
        .post("/api/threads")
        .set("Authorization", `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe("PATCH /api/threads/:threadId", () => {
    let testThread;

    beforeEach(async () => {
      testThread = new ChatThread({
        thread_id: "thread-1",
        office_id: "office-1",
        transaction_type: "carpool",
        transaction_id: "trip-1",
        title: "Original Title",
        participants: [{ user_id: "user-1", name: "John Doe", role: "owner" }],
      });
      await testThread.save();
    });

    test("should update thread as owner", async () => {
      const updates = {
        title: "Updated Title",
        description: "Updated description",
      };

      const response = await request(app)
        .patch("/api/threads/thread-1")
        .set("Authorization", `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.thread.title).toBe(updates.title);
      expect(response.body.thread.description).toBe(updates.description);
    });

    test("should prevent non-owner from updating", async () => {
      // Add user as participant (not owner)
      testThread.addParticipant("user-2", "Jane Smith", "participant");
      await testThread.save();

      const otherUserToken = jwt.sign(
        {
          user_id: "user-2",
          office_id: "office-1",
          name: "Jane Smith",
          email: "jane@example.com",
          role: "employee",
        },
        process.env.JWT_SECRET || "test-secret"
      );

      await request(app)
        .patch("/api/threads/thread-1")
        .set("Authorization", `Bearer ${otherUserToken}`)
        .send({ title: "Unauthorized Update" })
        .expect(403);
    });
  });

  describe("POST /api/threads/:threadId/participants", () => {
    let testThread;

    beforeEach(async () => {
      testThread = new ChatThread({
        thread_id: "thread-1",
        office_id: "office-1",
        transaction_type: "carpool",
        transaction_id: "trip-1",
        title: "Test Thread",
        participants: [{ user_id: "user-1", name: "John Doe", role: "owner" }],
      });
      await testThread.save();
    });

    test("should add participant as owner", async () => {
      const participantData = {
        user_id: "user-2",
        name: "Jane Smith",
        role: "participant",
      };

      const response = await request(app)
        .post("/api/threads/thread-1/participants")
        .set("Authorization", `Bearer ${authToken}`)
        .send(participantData)
        .expect(200);

      expect(response.body.thread.participants).toHaveLength(2);
    });

    test("should prevent duplicate participants", async () => {
      const participantData = {
        user_id: "user-1", // Same as owner
        name: "John Doe",
        role: "participant",
      };

      await request(app)
        .post("/api/threads/thread-1/participants")
        .set("Authorization", `Bearer ${authToken}`)
        .send(participantData)
        .expect(409);
    });
  });

  describe("POST /api/threads/:threadId/read", () => {
    let testThread;

    beforeEach(async () => {
      testThread = new ChatThread({
        thread_id: "thread-1",
        office_id: "office-1",
        transaction_type: "carpool",
        transaction_id: "trip-1",
        title: "Test Thread",
        participants: [{ user_id: "user-1", name: "John Doe", role: "owner" }],
      });
      await testThread.save();
    });

    test("should mark thread as read", async () => {
      await request(app)
        .post("/api/threads/thread-1/read")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      const updatedThread = await ChatThread.findOne({ thread_id: "thread-1" });
      const participant = updatedThread.participants.find(
        (p) => p.user_id === "user-1"
      );
      expect(participant.last_read_at).toBeInstanceOf(Date);
    });

    test("should require participant access", async () => {
      const otherUserToken = jwt.sign(
        {
          user_id: "user-999",
          office_id: "office-1",
          name: "Other User",
          email: "other@example.com",
          role: "employee",
        },
        process.env.JWT_SECRET || "test-secret"
      );

      await request(app)
        .post("/api/threads/thread-1/read")
        .set("Authorization", `Bearer ${otherUserToken}`)
        .expect(403);
    });
  });
});
