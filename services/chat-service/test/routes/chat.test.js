const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const jwt = require("jsonwebtoken");
const { app } = require("../../src/server");
const ChatThread = require("../../src/models/ChatThread");
const ChatMessage = require("../../src/models/ChatMessage");

describe("Chat Routes", () => {
  let mongoServer;
  let authToken;
  let testUser;
  let testThread;

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

    // Create test thread
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

  describe("GET /api/chat/:threadId/messages", () => {
    beforeEach(async () => {
      const messages = [
        {
          message_id: "msg-1",
          thread_id: "thread-1",
          office_id: "office-1",
          sender: { user_id: "user-1", name: "John Doe" },
          content: { text: "First message" },
          created_at: new Date("2024-01-01T10:00:00Z"),
        },
        {
          message_id: "msg-2",
          thread_id: "thread-1",
          office_id: "office-1",
          sender: { user_id: "user-1", name: "John Doe" },
          content: { text: "Second message" },
          created_at: new Date("2024-01-01T10:01:00Z"),
        },
        {
          message_id: "msg-3",
          thread_id: "thread-1",
          office_id: "office-1",
          sender: { user_id: "user-1", name: "John Doe" },
          content: { text: "Third message" },
          created_at: new Date("2024-01-01T10:02:00Z"),
        },
      ];

      await ChatMessage.insertMany(messages);
    });

    test("should get messages for thread", async () => {
      const response = await request(app)
        .get("/api/chat/thread-1/messages")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.messages).toHaveLength(3);
      expect(response.body.messages[0].message_id).toBe("msg-1"); // Chronological order
      expect(response.body.messages[2].message_id).toBe("msg-3");
    });

    test("should limit messages", async () => {
      const response = await request(app)
        .get("/api/chat/thread-1/messages?limit=2")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.messages).toHaveLength(2);
      expect(response.body.pagination.has_more).toBe(true);
    });

    test("should get messages before timestamp", async () => {
      const beforeTime = "2024-01-01T10:01:30Z";
      const response = await request(app)
        .get(`/api/chat/thread-1/messages?before=${beforeTime}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.messages).toHaveLength(2);
      expect(response.body.messages[1].message_id).toBe("msg-2");
    });

    test("should require thread access", async () => {
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
        .get("/api/chat/thread-1/messages")
        .set("Authorization", `Bearer ${otherUserToken}`)
        .expect(403);
    });
  });

  describe("POST /api/chat/:threadId/messages", () => {
    test("should send text message", async () => {
      const messageData = {
        message_type: "text",
        content: {
          text: "Hello, this is a test message!",
        },
      };

      const response = await request(app)
        .post("/api/chat/thread-1/messages")
        .set("Authorization", `Bearer ${authToken}`)
        .send(messageData)
        .expect(201);

      expect(response.body.message.content.text).toBe(messageData.content.text);
      expect(response.body.message.sender.user_id).toBe("user-1");
    });

    test("should send file message", async () => {
      const messageData = {
        message_type: "file",
        content: {
          file: {
            url: "https://example.com/file.pdf",
            filename: "document.pdf",
            size: 1024000,
            mime_type: "application/pdf",
          },
        },
      };

      const response = await request(app)
        .post("/api/chat/thread-1/messages")
        .set("Authorization", `Bearer ${authToken}`)
        .send(messageData)
        .expect(201);

      expect(response.body.message.message_type).toBe("file");
      expect(response.body.message.content.file.filename).toBe("document.pdf");
    });

    test("should handle message with mentions", async () => {
      const messageData = {
        message_type: "text",
        content: {
          text: "Hey @jane, can you check this?",
        },
        mentions: [
          {
            user_id: "user-2",
            name: "Jane Smith",
            start_index: 4,
            end_index: 9,
          },
        ],
      };

      const response = await request(app)
        .post("/api/chat/thread-1/messages")
        .set("Authorization", `Bearer ${authToken}`)
        .send(messageData)
        .expect(201);

      expect(response.body.message.mentions).toHaveLength(1);
      expect(response.body.message.mentions[0].user_id).toBe("user-2");
    });

    test("should handle reply to message", async () => {
      const messageData = {
        message_type: "text",
        content: {
          text: "This is a reply",
        },
        reply_to: {
          message_id: "msg-original",
          preview: "Original message preview",
        },
      };

      const response = await request(app)
        .post("/api/chat/thread-1/messages")
        .set("Authorization", `Bearer ${authToken}`)
        .send(messageData)
        .expect(201);

      expect(response.body.message.reply_to.message_id).toBe("msg-original");
    });

    test("should validate message content", async () => {
      const invalidData = {
        message_type: "text",
        // Missing content
      };

      await request(app)
        .post("/api/chat/thread-1/messages")
        .set("Authorization", `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });

    test("should prevent sending to inactive thread", async () => {
      // Update thread status to closed
      await ChatThread.updateOne(
        { thread_id: "thread-1" },
        { status: "closed" }
      );

      const messageData = {
        message_type: "text",
        content: {
          text: "This should fail",
        },
      };

      await request(app)
        .post("/api/chat/thread-1/messages")
        .set("Authorization", `Bearer ${authToken}`)
        .send(messageData)
        .expect(403);
    });
  });

  describe("PATCH /api/chat/messages/:messageId", () => {
    let testMessage;

    beforeEach(async () => {
      testMessage = new ChatMessage({
        message_id: "msg-1",
        thread_id: "thread-1",
        office_id: "office-1",
        sender: { user_id: "user-1", name: "John Doe" },
        message_type: "text",
        content: { text: "Original message" },
      });
      await testMessage.save();
    });

    test("should edit own message", async () => {
      const editData = {
        content: "Edited message content",
      };

      const response = await request(app)
        .patch("/api/chat/messages/msg-1")
        .set("Authorization", `Bearer ${authToken}`)
        .send(editData)
        .expect(200);

      expect(response.body.message.content.text).toBe(editData.content);
      expect(response.body.message.edited.is_edited).toBe(true);
    });

    test("should prevent editing others messages", async () => {
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
        .patch("/api/chat/messages/msg-1")
        .set("Authorization", `Bearer ${otherUserToken}`)
        .send({ content: "Unauthorized edit" })
        .expect(403);
    });

    test("should prevent editing non-text messages", async () => {
      // Create file message
      const fileMessage = new ChatMessage({
        message_id: "msg-file",
        thread_id: "thread-1",
        office_id: "office-1",
        sender: { user_id: "user-1", name: "John Doe" },
        message_type: "file",
        content: {
          file: {
            url: "https://example.com/file.pdf",
            filename: "document.pdf",
            size: 1024,
            mime_type: "application/pdf",
          },
        },
      });
      await fileMessage.save();

      await request(app)
        .patch("/api/chat/messages/msg-file")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ content: "Cannot edit file message" })
        .expect(400);
    });
  });

  describe("POST /api/chat/messages/:messageId/reactions", () => {
    let testMessage;

    beforeEach(async () => {
      testMessage = new ChatMessage({
        message_id: "msg-1",
        thread_id: "thread-1",
        office_id: "office-1",
        sender: { user_id: "user-1", name: "John Doe" },
        content: { text: "Test message" },
      });
      await testMessage.save();
    });

    test("should add reaction to message", async () => {
      const reactionData = {
        emoji: "👍",
      };

      const response = await request(app)
        .post("/api/chat/messages/msg-1/reactions")
        .set("Authorization", `Bearer ${authToken}`)
        .send(reactionData)
        .expect(200);

      expect(response.body.message.reactions).toHaveLength(1);
      expect(response.body.message.reactions[0].emoji).toBe("👍");
      expect(response.body.message.reactions[0].user_id).toBe("user-1");
    });

    test("should validate emoji", async () => {
      const invalidData = {
        emoji: "", // Empty emoji
      };

      await request(app)
        .post("/api/chat/messages/msg-1/reactions")
        .set("Authorization", `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe("DELETE /api/chat/messages/:messageId/reactions/:emoji", () => {
    let testMessage;

    beforeEach(async () => {
      testMessage = new ChatMessage({
        message_id: "msg-1",
        thread_id: "thread-1",
        office_id: "office-1",
        sender: { user_id: "user-1", name: "John Doe" },
        content: { text: "Test message" },
        reactions: [
          {
            user_id: "user-1",
            emoji: "👍",
            created_at: new Date(),
          },
        ],
      });
      await testMessage.save();
    });

    test("should remove reaction from message", async () => {
      const response = await request(app)
        .delete("/api/chat/messages/msg-1/reactions/👍")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message.reactions).toHaveLength(0);
    });
  });

  describe("POST /api/chat/:threadId/search", () => {
    beforeEach(async () => {
      const messages = [
        {
          message_id: "msg-1",
          thread_id: "thread-1",
          office_id: "office-1",
          sender: { user_id: "user-1", name: "John Doe" },
          content: { text: "Hello world" },
        },
        {
          message_id: "msg-2",
          thread_id: "thread-1",
          office_id: "office-1",
          sender: { user_id: "user-1", name: "John Doe" },
          content: { text: "Goodbye world" },
        },
      ];

      await ChatMessage.insertMany(messages);

      // Create text index for search
      await ChatMessage.collection.createIndex({
        "content.text": "text",
        "sender.name": "text",
      });
    });

    test("should search messages in thread", async () => {
      const searchData = {
        query: "Hello",
        limit: 10,
      };

      const response = await request(app)
        .post("/api/chat/thread-1/search")
        .set("Authorization", `Bearer ${authToken}`)
        .send(searchData)
        .expect(200);

      expect(response.body.messages).toHaveLength(1);
      expect(response.body.messages[0].content.text).toBe("Hello world");
    });

    test("should validate search query", async () => {
      const invalidData = {
        query: "", // Empty query
        limit: 10,
      };

      await request(app)
        .post("/api/chat/thread-1/search")
        .set("Authorization", `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe("POST /api/chat/messages/:messageId/read", () => {
    let testMessage;

    beforeEach(async () => {
      testMessage = new ChatMessage({
        message_id: "msg-1",
        thread_id: "thread-1",
        office_id: "office-1",
        sender: { user_id: "user-2", name: "Jane Smith" },
        content: { text: "Test message" },
      });
      await testMessage.save();
    });

    test("should mark message as read", async () => {
      await request(app)
        .post("/api/chat/messages/msg-1/read")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      const updatedMessage = await ChatMessage.findOne({ message_id: "msg-1" });
      expect(updatedMessage.delivery_status.read_by).toHaveLength(1);
      expect(updatedMessage.delivery_status.read_by[0].user_id).toBe("user-1");
    });
  });
});
