const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const ChatThread = require("../../src/models/ChatThread");

describe("ChatThread Model", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await ChatThread.deleteMany({});
  });

  describe("Schema Validation", () => {
    test("should create a valid chat thread", async () => {
      const threadData = {
        thread_id: "thread-123",
        office_id: "office-1",
        transaction_type: "carpool",
        transaction_id: "trip-456",
        title: "Downtown to Office Carpool",
        participants: [
          {
            user_id: "user-1",
            name: "John Doe",
            role: "owner",
          },
          {
            user_id: "user-2",
            name: "Jane Smith",
            role: "participant",
          },
        ],
      };

      const thread = new ChatThread(threadData);
      const savedThread = await thread.save();

      expect(savedThread.thread_id).toBe(threadData.thread_id);
      expect(savedThread.office_id).toBe(threadData.office_id);
      expect(savedThread.transaction_type).toBe(threadData.transaction_type);
      expect(savedThread.participants).toHaveLength(2);
      expect(savedThread.status).toBe("active");
    });

    test("should require mandatory fields", async () => {
      const thread = new ChatThread({});

      await expect(thread.save()).rejects.toThrow();
    });

    test("should validate transaction_type enum", async () => {
      const threadData = {
        thread_id: "thread-123",
        office_id: "office-1",
        transaction_type: "invalid_type",
        transaction_id: "trip-456",
        title: "Test Thread",
        participants: [],
      };

      const thread = new ChatThread(threadData);
      await expect(thread.save()).rejects.toThrow();
    });
  });

  describe("Instance Methods", () => {
    let thread;

    beforeEach(async () => {
      thread = new ChatThread({
        thread_id: "thread-123",
        office_id: "office-1",
        transaction_type: "carpool",
        transaction_id: "trip-456",
        title: "Test Thread",
        participants: [
          {
            user_id: "user-1",
            name: "John Doe",
            role: "owner",
          },
        ],
      });
      await thread.save();
    });

    test("should add participant", () => {
      thread.addParticipant("user-2", "Jane Smith", "participant");

      expect(thread.participants).toHaveLength(2);
      expect(thread.participants[1].user_id).toBe("user-2");
      expect(thread.participants[1].name).toBe("Jane Smith");
      expect(thread.participants[1].role).toBe("participant");
    });

    test("should not add duplicate participant", () => {
      thread.addParticipant("user-1", "John Doe", "participant");

      expect(thread.participants).toHaveLength(1);
    });

    test("should remove participant", () => {
      thread.addParticipant("user-2", "Jane Smith", "participant");
      expect(thread.participants).toHaveLength(2);

      thread.removeParticipant("user-2");
      expect(thread.participants).toHaveLength(1);
      expect(thread.participants[0].user_id).toBe("user-1");
    });

    test("should update last read timestamp", () => {
      const originalTimestamp = thread.participants[0].last_read_at;

      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        thread.updateLastRead("user-1");
        expect(thread.participants[0].last_read_at).not.toEqual(
          originalTimestamp
        );
      }, 10);
    });

    test("should check if user is participant", () => {
      expect(thread.isParticipant("user-1")).toBe(true);
      expect(thread.isParticipant("user-999")).toBe(false);
    });

    test("should get participant role", () => {
      expect(thread.getParticipantRole("user-1")).toBe("owner");
      expect(thread.getParticipantRole("user-999")).toBeNull();
    });
  });

  describe("Static Methods", () => {
    beforeEach(async () => {
      const threads = [
        {
          thread_id: "thread-1",
          office_id: "office-1",
          transaction_type: "carpool",
          transaction_id: "trip-1",
          title: "Carpool Thread",
          participants: [{ user_id: "user-1", name: "John", role: "owner" }],
        },
        {
          thread_id: "thread-2",
          office_id: "office-1",
          transaction_type: "book_sharing",
          transaction_id: "book-1",
          title: "Book Thread",
          participants: [{ user_id: "user-2", name: "Jane", role: "owner" }],
        },
        {
          thread_id: "thread-3",
          office_id: "office-2",
          transaction_type: "carpool",
          transaction_id: "trip-2",
          title: "Another Carpool",
          participants: [
            { user_id: "user-1", name: "John", role: "participant" },
          ],
        },
      ];

      await ChatThread.insertMany(threads);
    });

    test("should find thread by transaction", async () => {
      const thread = await ChatThread.findByTransaction(
        "carpool",
        "trip-1",
        "office-1"
      );

      expect(thread).toBeTruthy();
      expect(thread.thread_id).toBe("thread-1");
      expect(thread.transaction_type).toBe("carpool");
      expect(thread.transaction_id).toBe("trip-1");
    });

    test("should find threads by user", async () => {
      const threads = await ChatThread.findByUser("user-1", "office-1");

      expect(threads).toHaveLength(1);
      expect(threads[0].thread_id).toBe("thread-1");
    });

    test("should find threads by user across offices", async () => {
      const threadsOffice1 = await ChatThread.findByUser("user-1", "office-1");
      const threadsOffice2 = await ChatThread.findByUser("user-1", "office-2");

      expect(threadsOffice1).toHaveLength(1);
      expect(threadsOffice2).toHaveLength(1);
      expect(threadsOffice1[0].office_id).toBe("office-1");
      expect(threadsOffice2[0].office_id).toBe("office-2");
    });

    test("should return empty array for non-existent user", async () => {
      const threads = await ChatThread.findByUser("user-999", "office-1");
      expect(threads).toHaveLength(0);
    });
  });

  describe("Indexes", () => {
    test("should have unique thread_id", async () => {
      const threadData = {
        thread_id: "duplicate-thread",
        office_id: "office-1",
        transaction_type: "carpool",
        transaction_id: "trip-1",
        title: "First Thread",
        participants: [],
      };

      await new ChatThread(threadData).save();

      const duplicateThread = new ChatThread({
        ...threadData,
        title: "Duplicate Thread",
      });

      await expect(duplicateThread.save()).rejects.toThrow();
    });
  });
});
