const Client = require("socket.io-client");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { server, io } = require("../../src/server");
const ChatThread = require("../../src/models/ChatThread");
const ChatMessage = require("../../src/models/ChatMessage");

describe("Socket Handlers", () => {
  let mongoServer;
  let clientSocket;
  let serverSocket;
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
    server.close();
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

    return new Promise((resolve) => {
      // Setup client socket
      clientSocket = new Client(
        `http://localhost:${process.env.PORT || 3006}`,
        {
          auth: {
            token: authToken,
          },
        }
      );

      // Setup server socket reference
      io.on("connection", (socket) => {
        serverSocket = socket;
      });

      clientSocket.on("connect", resolve);
    });
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe("Connection and Authentication", () => {
    test("should authenticate and connect user", (done) => {
      expect(clientSocket.connected).toBe(true);
      expect(serverSocket.userId).toBe("user-1");
      expect(serverSocket.officeId).toBe("office-1");
      done();
    });

    test("should reject connection without token", (done) => {
      const unauthorizedClient = new Client(
        `http://localhost:${process.env.PORT || 3006}`
      );

      unauthorizedClient.on("connect_error", (error) => {
        expect(error.message).toContain("Authentication error");
        unauthorizedClient.close();
        done();
      });
    });
  });

  describe("Thread Management", () => {
    test("should join thread room", (done) => {
      clientSocket.emit("join_thread", { thread_id: "thread-1" });

      clientSocket.on("thread_joined", (data) => {
        expect(data.thread_id).toBe("thread-1");
        expect(data.message).toBe("Successfully joined thread");
        done();
      });
    });

    test("should reject joining unauthorized thread", (done) => {
      // Create thread for different office
      const unauthorizedThread = new ChatThread({
        thread_id: "thread-unauthorized",
        office_id: "office-2",
        transaction_type: "carpool",
        transaction_id: "trip-2",
        title: "Unauthorized Thread",
        participants: [
          { user_id: "user-2", name: "Jane Smith", role: "owner" },
        ],
      });

      unauthorizedThread.save().then(() => {
        clientSocket.emit("join_thread", { thread_id: "thread-unauthorized" });

        clientSocket.on("error", (error) => {
          expect(error.event).toBe("join_thread");
          expect(error.message).toBe("Access denied to thread");
          done();
        });
      });
    });

    test("should leave thread room", (done) => {
      // First join the thread
      clientSocket.emit("join_thread", { thread_id: "thread-1" });

      clientSocket.on("thread_joined", () => {
        // Then leave the thread
        clientSocket.emit("leave_thread", { thread_id: "thread-1" });
      });

      clientSocket.on("thread_left", (data) => {
        expect(data.thread_id).toBe("thread-1");
        expect(data.message).toBe("Successfully left thread");
        done();
      });
    });
  });

  describe("Real-time Messaging", () => {
    beforeEach((done) => {
      // Join thread before testing messaging
      clientSocket.emit("join_thread", { thread_id: "thread-1" });
      clientSocket.on("thread_joined", () => done());
    });

    test("should send and receive message", (done) => {
      const messageData = {
        thread_id: "thread-1",
        message_type: "text",
        content: {
          text: "Hello from socket!",
        },
        client_message_id: "client-msg-1",
      };

      clientSocket.emit("send_message", messageData);

      clientSocket.on("new_message", (data) => {
        expect(data.message.content.text).toBe(messageData.content.text);
        expect(data.message.sender.user_id).toBe("user-1");
        expect(data.thread_id).toBe("thread-1");
        done();
      });
    });

    test("should confirm message sent", (done) => {
      const messageData = {
        thread_id: "thread-1",
        message_type: "text",
        content: {
          text: "Test message",
        },
        client_message_id: "client-msg-1",
      };

      clientSocket.emit("send_message", messageData);

      clientSocket.on("message_sent", (data) => {
        expect(data.client_message_id).toBe("client-msg-1");
        expect(data.message_id).toBeTruthy();
        expect(data.timestamp).toBeTruthy();
        done();
      });
    });

    test("should handle message with mentions", (done) => {
      const messageData = {
        thread_id: "thread-1",
        message_type: "text",
        content: {
          text: "Hey @jane, check this out!",
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

      clientSocket.emit("send_message", messageData);

      clientSocket.on("new_message", (data) => {
        expect(data.message.mentions).toHaveLength(1);
        expect(data.message.mentions[0].user_id).toBe("user-2");
        done();
      });
    });

    test("should reject message to unauthorized thread", (done) => {
      const messageData = {
        thread_id: "unauthorized-thread",
        message_type: "text",
        content: {
          text: "This should fail",
        },
      };

      clientSocket.emit("send_message", messageData);

      clientSocket.on("error", (error) => {
        expect(error.event).toBe("send_message");
        expect(error.message).toBe("Access denied to thread");
        done();
      });
    });
  });

  describe("Typing Indicators", () => {
    beforeEach((done) => {
      clientSocket.emit("join_thread", { thread_id: "thread-1" });
      clientSocket.on("thread_joined", () => done());
    });

    test("should broadcast typing start", (done) => {
      // Create second client to receive typing indicator
      const secondClient = new Client(
        `http://localhost:${process.env.PORT || 3006}`,
        {
          auth: { token: authToken },
        }
      );

      secondClient.on("connect", () => {
        secondClient.emit("join_thread", { thread_id: "thread-1" });
      });

      secondClient.on("thread_joined", () => {
        clientSocket.emit("typing_start", { thread_id: "thread-1" });
      });

      secondClient.on("user_typing", (data) => {
        expect(data.thread_id).toBe("thread-1");
        expect(data.user_id).toBe("user-1");
        expect(data.name).toBe("John Doe");
        secondClient.close();
        done();
      });
    });

    test("should broadcast typing stop", (done) => {
      const secondClient = new Client(
        `http://localhost:${process.env.PORT || 3006}`,
        {
          auth: { token: authToken },
        }
      );

      secondClient.on("connect", () => {
        secondClient.emit("join_thread", { thread_id: "thread-1" });
      });

      secondClient.on("thread_joined", () => {
        clientSocket.emit("typing_stop", { thread_id: "thread-1" });
      });

      secondClient.on("user_stopped_typing", (data) => {
        expect(data.thread_id).toBe("thread-1");
        expect(data.user_id).toBe("user-1");
        secondClient.close();
        done();
      });
    });
  });

  describe("Reactions", () => {
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

      return new Promise((done) => {
        clientSocket.emit("join_thread", { thread_id: "thread-1" });
        clientSocket.on("thread_joined", () => done());
      });
    });

    test("should add reaction via socket", (done) => {
      const reactionData = {
        message_id: "msg-1",
        emoji: "👍",
      };

      clientSocket.emit("add_reaction", reactionData);

      clientSocket.on("reaction_added", (data) => {
        expect(data.message_id).toBe("msg-1");
        expect(data.user_id).toBe("user-1");
        expect(data.emoji).toBe("👍");
        done();
      });
    });
  });

  describe("Read Receipts", () => {
    beforeEach((done) => {
      clientSocket.emit("join_thread", { thread_id: "thread-1" });
      clientSocket.on("thread_joined", () => done());
    });

    test("should handle mark read via socket", (done) => {
      const readData = {
        thread_id: "thread-1",
        message_id: "msg-1",
      };

      // Create second client to receive read receipt
      const secondClient = new Client(
        `http://localhost:${process.env.PORT || 3006}`,
        {
          auth: { token: authToken },
        }
      );

      secondClient.on("connect", () => {
        secondClient.emit("join_thread", { thread_id: "thread-1" });
      });

      secondClient.on("thread_joined", () => {
        clientSocket.emit("mark_read", readData);
      });

      secondClient.on("message_read", (data) => {
        expect(data.thread_id).toBe("thread-1");
        expect(data.message_id).toBe("msg-1");
        expect(data.user_id).toBe("user-1");
        secondClient.close();
        done();
      });
    });
  });

  describe("Presence", () => {
    test("should update user presence", (done) => {
      const presenceData = {
        status: "away",
      };

      // Create second client to receive presence update
      const secondClient = new Client(
        `http://localhost:${process.env.PORT || 3006}`,
        {
          auth: { token: authToken },
        }
      );

      secondClient.on("connect", () => {
        clientSocket.emit("update_presence", presenceData);
      });

      secondClient.on("presence_update", (data) => {
        expect(data.user_id).toBe("user-1");
        expect(data.status).toBe("away");
        secondClient.close();
        done();
      });
    });

    test("should handle ping/pong", (done) => {
      clientSocket.emit("ping");

      clientSocket.on("pong", (data) => {
        expect(data.timestamp).toBeTruthy();
        done();
      });
    });
  });

  describe("Disconnect Handling", () => {
    test("should broadcast user offline on disconnect", (done) => {
      // Create second client to receive offline notification
      const secondClient = new Client(
        `http://localhost:${process.env.PORT || 3006}`,
        {
          auth: { token: authToken },
        }
      );

      secondClient.on("connect", () => {
        clientSocket.disconnect();
      });

      secondClient.on("user_offline", (data) => {
        expect(data.user_id).toBe("user-1");
        expect(data.name).toBe("John Doe");
        secondClient.close();
        done();
      });
    });
  });
});
