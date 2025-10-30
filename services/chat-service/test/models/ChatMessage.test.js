const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const ChatMessage = require("../../src/models/ChatMessage");

describe("ChatMessage Model", () => {
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
    await ChatMessage.deleteMany({});
  });

  describe("Schema Validation", () => {
    test("should create a valid text message", async () => {
      const messageData = {
        message_id: "msg-123",
        thread_id: "thread-456",
        office_id: "office-1",
        sender: {
          user_id: "user-1",
          name: "John Doe",
        },
        message_type: "text",
        content: {
          text: "Hello, this is a test message!",
        },
      };

      const message = new ChatMessage(messageData);
      const savedMessage = await message.save();

      expect(savedMessage.message_id).toBe(messageData.message_id);
      expect(savedMessage.thread_id).toBe(messageData.thread_id);
      expect(savedMessage.sender.user_id).toBe(messageData.sender.user_id);
      expect(savedMessage.content.text).toBe(messageData.content.text);
      expect(savedMessage.message_type).toBe("text");
    });

    test("should create a valid file message", async () => {
      const messageData = {
        message_id: "msg-124",
        thread_id: "thread-456",
        office_id: "office-1",
        sender: {
          user_id: "user-1",
          name: "John Doe",
        },
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

      const message = new ChatMessage(messageData);
      const savedMessage = await message.save();

      expect(savedMessage.message_type).toBe("file");
      expect(savedMessage.content.file.filename).toBe("document.pdf");
      expect(savedMessage.content.file.size).toBe(1024000);
    });

    test("should require mandatory fields", async () => {
      const message = new ChatMessage({});
      await expect(message.save()).rejects.toThrow();
    });

    test("should validate message_type enum", async () => {
      const messageData = {
        message_id: "msg-123",
        thread_id: "thread-456",
        office_id: "office-1",
        sender: {
          user_id: "user-1",
          name: "John Doe",
        },
        message_type: "invalid_type",
        content: {
          text: "Test message",
        },
      };

      const message = new ChatMessage(messageData);
      await expect(message.save()).rejects.toThrow();
    });

    test("should enforce text content max length", async () => {
      const longText = "a".repeat(2001); // Exceeds 2000 char limit

      const messageData = {
        message_id: "msg-123",
        thread_id: "thread-456",
        office_id: "office-1",
        sender: {
          user_id: "user-1",
          name: "John Doe",
        },
        message_type: "text",
        content: {
          text: longText,
        },
      };

      const message = new ChatMessage(messageData);
      await expect(message.save()).rejects.toThrow();
    });
  });

  describe("Instance Methods", () => {
    let message;

    beforeEach(async () => {
      message = new ChatMessage({
        message_id: "msg-123",
        thread_id: "thread-456",
        office_id: "office-1",
        sender: {
          user_id: "user-1",
          name: "John Doe",
        },
        message_type: "text",
        content: {
          text: "Original message content",
        },
      });
      await message.save();
    });

    test("should add reaction", () => {
      message.addReaction("user-2", "👍");

      expect(message.reactions).toHaveLength(1);
      expect(message.reactions[0].user_id).toBe("user-2");
      expect(message.reactions[0].emoji).toBe("👍");
    });

    test("should replace existing reaction from same user", () => {
      message.addReaction("user-2", "👍");
      message.addReaction("user-2", "👍"); // Same reaction again

      expect(message.reactions).toHaveLength(1);
    });

    test("should remove reaction", () => {
      message.addReaction("user-2", "👍");
      expect(message.reactions).toHaveLength(1);

      message.removeReaction("user-2", "👍");
      expect(message.reactions).toHaveLength(0);
    });

    test("should mark as read", () => {
      message.markAsRead("user-2");

      expect(message.delivery_status.read_by).toHaveLength(1);
      expect(message.delivery_status.read_by[0].user_id).toBe("user-2");
      expect(message.delivery_status.read_by[0].read_at).toBeInstanceOf(Date);
    });

    test("should not duplicate read receipts", () => {
      message.markAsRead("user-2");
      message.markAsRead("user-2");

      expect(message.delivery_status.read_by).toHaveLength(1);
    });

    test("should mark as delivered", () => {
      message.markAsDelivered("user-2");

      expect(message.delivery_status.delivered_to).toHaveLength(1);
      expect(message.delivery_status.delivered_to[0].user_id).toBe("user-2");
    });

    test("should edit message", () => {
      const newContent = "Edited message content";
      const originalContent = message.content.text;

      message.editMessage(newContent);

      expect(message.content.text).toBe(newContent);
      expect(message.edited.is_edited).toBe(true);
      expect(message.edited.original_content).toBe(originalContent);
      expect(message.edited.edited_at).toBeInstanceOf(Date);
    });
  });

  describe("Static Methods", () => {
    beforeEach(async () => {
      const messages = [
        {
          message_id: "msg-1",
          thread_id: "thread-1",
          office_id: "office-1",
          sender: { user_id: "user-1", name: "John" },
          content: { text: "First message" },
          created_at: new Date("2024-01-01T10:00:00Z"),
        },
        {
          message_id: "msg-2",
          thread_id: "thread-1",
          office_id: "office-1",
          sender: { user_id: "user-2", name: "Jane" },
          content: { text: "Second message" },
          created_at: new Date("2024-01-01T10:01:00Z"),
        },
        {
          message_id: "msg-3",
          thread_id: "thread-2",
          office_id: "office-1",
          sender: { user_id: "user-1", name: "John" },
          content: { text: "Different thread message" },
          created_at: new Date("2024-01-01T10:02:00Z"),
        },
      ];

      await ChatMessage.insertMany(messages);
    });

    test("should find messages by thread", async () => {
      const messages = await ChatMessage.findByThread("thread-1");

      expect(messages).toHaveLength(2);
      expect(messages[0].message_id).toBe("msg-2"); // Most recent first
      expect(messages[1].message_id).toBe("msg-1");
    });

    test("should limit messages by thread", async () => {
      const messages = await ChatMessage.findByThread("thread-1", 1);

      expect(messages).toHaveLength(1);
      expect(messages[0].message_id).toBe("msg-2");
    });

    test("should find messages before timestamp", async () => {
      const beforeTime = new Date("2024-01-01T10:01:30Z");
      const messages = await ChatMessage.findByThread(
        "thread-1",
        50,
        beforeTime
      );

      expect(messages).toHaveLength(1);
      expect(messages[0].message_id).toBe("msg-1");
    });

    test("should get unread count", async () => {
      const lastReadAt = new Date("2024-01-01T10:00:30Z"); // Between msg-1 and msg-2
      const unreadCount = await ChatMessage.getUnreadCount(
        "thread-1",
        "user-1",
        lastReadAt
      );

      expect(unreadCount).toBe(1); // Only msg-2 is unread for user-1
    });

    test("should search messages", async () => {
      // Create text index for search
      await ChatMessage.collection.createIndex({
        "content.text": "text",
        "sender.name": "text",
      });

      const results = await ChatMessage.searchMessages("thread-1", "Second");

      expect(results).toHaveLength(1);
      expect(results[0].message_id).toBe("msg-2");
    });
  });

  describe("Mentions and Replies", () => {
    test("should handle message mentions", async () => {
      const messageData = {
        message_id: "msg-123",
        thread_id: "thread-456",
        office_id: "office-1",
        sender: {
          user_id: "user-1",
          name: "John Doe",
        },
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

      const message = new ChatMessage(messageData);
      const savedMessage = await message.save();

      expect(savedMessage.mentions).toHaveLength(1);
      expect(savedMessage.mentions[0].user_id).toBe("user-2");
      expect(savedMessage.mentions[0].name).toBe("Jane Smith");
    });

    test("should handle reply to message", async () => {
      const messageData = {
        message_id: "msg-123",
        thread_id: "thread-456",
        office_id: "office-1",
        sender: {
          user_id: "user-1",
          name: "John Doe",
        },
        message_type: "text",
        content: {
          text: "This is a reply",
        },
        reply_to: {
          message_id: "msg-original",
          preview: "Original message preview",
        },
      };

      const message = new ChatMessage(messageData);
      const savedMessage = await message.save();

      expect(savedMessage.reply_to.message_id).toBe("msg-original");
      expect(savedMessage.reply_to.preview).toBe("Original message preview");
    });
  });
});
