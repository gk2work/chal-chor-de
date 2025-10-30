const request = require("supertest");
const express = require("express");

// Mock MongoDB
const mockDb = {
  notifications: [],
  notification_preferences: [],
  users: [],
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
                return false;
              })
            );
          }
          if (collectionName === "notification_preferences") {
            return Promise.resolve(
              mockDb.notification_preferences.find(
                (pref) =>
                  pref.user_id === query.user_id &&
                  pref.office_id === query.office_id
              )
            );
          }
          return Promise.resolve(null);
        }),
        insertOne: jest.fn().mockImplementation((doc) => {
          const id = { toString: () => "mock-id-" + Date.now() };
          const newDoc = { ...doc, _id: id };
          mockDb[collectionName].push(newDoc);
          return Promise.resolve({ insertedId: id });
        }),
        updateOne: jest.fn().mockImplementation((filter, update, options) => {
          if (
            collectionName === "notification_preferences" &&
            options?.upsert
          ) {
            const existing = mockDb.notification_preferences.find(
              (pref) =>
                pref.user_id === filter.user_id &&
                pref.office_id === filter.office_id
            );
            if (!existing) {
              const newDoc = {
                ...filter,
                ...update.$set,
                ...update.$setOnInsert,
                _id: { toString: () => "mock-pref-id" },
              };
              mockDb.notification_preferences.push(newDoc);
            }
          }
          return Promise.resolve({ matchedCount: 1, modifiedCount: 1 });
        }),
        find: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          toArray: jest.fn().mockImplementation(() => {
            if (collectionName === "notifications") {
              return Promise.resolve(mockDb.notifications);
            }
            return Promise.resolve([]);
          }),
        }),
        aggregate: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([
            {
              total_notifications: mockDb.notifications.length,
              delivered_notifications: mockDb.notifications.filter(
                (n) => n.status === "delivered"
              ).length,
              failed_notifications: mockDb.notifications.filter(
                (n) => n.status === "failed"
              ).length,
              by_template: mockDb.notifications.map((n) => n.template_key),
              by_priority: mockDb.notifications.map((n) => n.priority),
            },
          ]),
        }),
      })),
    }),
    close: jest.fn().mockResolvedValue(),
  })),
  ObjectId: jest.fn().mockImplementation((id) => ({
    toString: () => id || "mock-object-id",
  })),
}));

// Mock nodemailer
jest.mock("nodemailer", () => ({
  createTransporter: jest.fn(),
}));

// Create a test app with notification routes
const app = express();
app.use(express.json());

// Mock notification templates
const notificationTemplates = {
  carpool_match_found: {
    title: "Carpool Match Found!",
    body: "A carpool match has been found for your trip on {date} at {time}.",
    email_subject: "OfficeShare: Carpool Match Found",
    email_body:
      "Hi {user_name}, Great news! We found a carpool match for your trip on {date} at {time}.",
  },
  rating_received: {
    title: "New Rating Received",
    body: "You received a {rating}-star rating from {rater_name}.",
    email_subject: "OfficeShare: New Rating Received",
    email_body:
      "Hi {user_name}, You received a {rating}-star rating from {rater_name}.",
  },
};

// Helper functions
function renderTemplate(template, data) {
  let rendered = { ...template };

  Object.keys(rendered).forEach((key) => {
    if (typeof rendered[key] === "string") {
      rendered[key] = rendered[key].replace(
        /\{(\w+)\}/g,
        (match, placeholder) => {
          return data[placeholder] || match;
        }
      );
    }
  });

  return rendered;
}

async function getUserPreferences(user_id, office_id) {
  const preferences = mockDb.notification_preferences.find(
    (pref) => pref.user_id === user_id && pref.office_id === office_id
  );

  return (
    preferences?.preferences || {
      push_notifications: true,
      email_notifications: true,
      in_app_notifications: true,
      carpool_notifications: true,
      rating_notifications: true,
      reminder_notifications: true,
    }
  );
}

async function getUserDetails(user_id, office_id) {
  return mockDb.users.find(
    (user) => user._id.toString() === user_id && user.office_id === office_id
  );
}

// Mock routes for testing
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "Notification Service",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

app.post("/api/notifications/send", async (req, res) => {
  try {
    const {
      user_id,
      office_id,
      template_key,
      data = {},
      channels = ["in_app"],
      priority = "normal",
    } = req.body;

    // Basic validation
    if (!user_id || !office_id || !template_key) {
      return res
        .status(400)
        .json({ error: "user_id, office_id, and template_key are required" });
    }

    if (!notificationTemplates[template_key]) {
      return res.status(400).json({ error: "Invalid template_key" });
    }

    // Get user details and preferences
    const user = await getUserDetails(user_id, office_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const preferences = await getUserPreferences(user_id, office_id);
    const template = notificationTemplates[template_key];
    const renderedTemplate = renderTemplate(template, {
      user_name: user.full_name,
      ...data,
    });

    // Create notification record
    const notification = {
      user_id,
      office_id,
      template_key,
      title: renderedTemplate.title,
      body: renderedTemplate.body,
      data,
      channels,
      priority,
      status: "pending",
      delivery_attempts: [],
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Mock delivery
    const deliveryResults = channels.map((channel) => ({
      channel,
      delivered: true,
      delivery_info: { method: "mock" },
      timestamp: new Date(),
    }));

    notification.status = "delivered";
    notification.delivery_attempts = deliveryResults;

    const id = { toString: () => "mock-notification-id" };
    notification._id = id;
    mockDb.notifications.push(notification);

    res.json({
      message: "Notification processed",
      notification_id: id.toString(),
      delivery_results: deliveryResults,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/notifications/user/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;
    const { office_id } = req.query;

    if (!office_id) {
      return res
        .status(400)
        .json({ error: "office_id query parameter required" });
    }

    const notifications = mockDb.notifications.filter(
      (n) => n.user_id === user_id && n.office_id === office_id
    );

    const notificationsResponse = notifications.map((notification) => ({
      notification_id: notification._id.toString(),
      title: notification.title,
      body: notification.body,
      priority: notification.priority,
      status: notification.status,
      read_at: notification.read_at || null,
      created_at: notification.created_at,
    }));

    res.json({ notifications: notificationsResponse });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/notifications/:notification_id/read", async (req, res) => {
  try {
    const { notification_id } = req.params;
    const { user_id, office_id } = req.body;

    if (!user_id || !office_id) {
      return res.status(400).json({ error: "user_id and office_id required" });
    }

    const notification = mockDb.notifications.find(
      (n) =>
        n._id.toString() === notification_id &&
        n.user_id === user_id &&
        n.office_id === office_id
    );

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    notification.read_at = new Date();
    notification.updated_at = new Date();

    res.json({ message: "Notification marked as read" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/notifications/preferences/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;
    const { office_id } = req.query;

    if (!office_id) {
      return res
        .status(400)
        .json({ error: "office_id query parameter required" });
    }

    const preferences = await getUserPreferences(user_id, office_id);
    res.json({ preferences });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/notifications/preferences", async (req, res) => {
  try {
    const { user_id, preferences } = req.body;
    const { office_id } = req.query;

    if (!office_id || !user_id || !preferences) {
      return res
        .status(400)
        .json({ error: "office_id, user_id, and preferences required" });
    }

    // Update or create preferences
    const existingPref = mockDb.notification_preferences.find(
      (pref) => pref.user_id === user_id && pref.office_id === office_id
    );

    if (existingPref) {
      existingPref.preferences = preferences;
      existingPref.updated_at = new Date();
    } else {
      mockDb.notification_preferences.push({
        user_id,
        office_id,
        preferences,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    res.json({
      message: "Notification preferences updated successfully",
      preferences,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/notifications/stats", async (req, res) => {
  try {
    const { office_id } = req.query;

    if (!office_id) {
      return res
        .status(400)
        .json({ error: "office_id query parameter required" });
    }

    const officeNotifications = mockDb.notifications.filter(
      (n) => n.office_id === office_id
    );

    const stats = {
      total_notifications: officeNotifications.length,
      delivered_notifications: officeNotifications.filter(
        (n) => n.status === "delivered"
      ).length,
      failed_notifications: officeNotifications.filter(
        (n) => n.status === "failed"
      ).length,
    };

    stats.delivery_rate =
      stats.total_notifications > 0
        ? (
            (stats.delivered_notifications / stats.total_notifications) *
            100
          ).toFixed(2) + "%"
        : "0%";

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

describe("Notification Service", () => {
  beforeEach(() => {
    // Clear mock database before each test
    mockDb.notifications = [];
    mockDb.notification_preferences = [];
    mockDb.users = [];

    // Add a test user
    mockDb.users.push({
      _id: { toString: () => "test-user-id" },
      office_id: "office_001",
      email: "test@company.com",
      full_name: "Test User",
    });
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body.status).toBe("healthy");
      expect(response.body.service).toBe("Notification Service");
      expect(response.body.version).toBe("1.0.0");
    });
  });

  describe("POST /api/notifications/send", () => {
    it("should send notification successfully", async () => {
      const notificationData = {
        user_id: "test-user-id",
        office_id: "office_001",
        template_key: "carpool_match_found",
        data: {
          date: "2024-01-15",
          time: "8:00 AM",
        },
        channels: ["in_app", "email"],
        priority: "high",
      };

      const response = await request(app)
        .post("/api/notifications/send")
        .send(notificationData)
        .expect(200);

      expect(response.body.message).toBe("Notification processed");
      expect(response.body.notification_id).toBeDefined();
      expect(response.body.delivery_results).toHaveLength(2);
      expect(mockDb.notifications).toHaveLength(1);
    });

    it("should return error for missing required fields", async () => {
      const notificationData = {
        user_id: "test-user-id",
        // missing office_id and template_key
      };

      const response = await request(app)
        .post("/api/notifications/send")
        .send(notificationData)
        .expect(400);

      expect(response.body.error).toBe(
        "user_id, office_id, and template_key are required"
      );
    });

    it("should return error for invalid template", async () => {
      const notificationData = {
        user_id: "test-user-id",
        office_id: "office_001",
        template_key: "invalid_template",
      };

      const response = await request(app)
        .post("/api/notifications/send")
        .send(notificationData)
        .expect(400);

      expect(response.body.error).toBe("Invalid template_key");
    });

    it("should return error for non-existent user", async () => {
      const notificationData = {
        user_id: "non-existent-user",
        office_id: "office_001",
        template_key: "carpool_match_found",
      };

      const response = await request(app)
        .post("/api/notifications/send")
        .send(notificationData)
        .expect(404);

      expect(response.body.error).toBe("User not found");
    });
  });

  describe("Template rendering", () => {
    it("should render carpool match template correctly", () => {
      const template = notificationTemplates.carpool_match_found;
      const data = {
        user_name: "John Doe",
        date: "2024-01-15",
        time: "8:00 AM",
      };

      const rendered = renderTemplate(template, data);

      expect(rendered.title).toBe("Carpool Match Found!");
      expect(rendered.body).toBe(
        "A carpool match has been found for your trip on 2024-01-15 at 8:00 AM."
      );
      expect(rendered.email_body).toContain("John Doe");
      expect(rendered.email_body).toContain("2024-01-15");
      expect(rendered.email_body).toContain("8:00 AM");
    });

    it("should render rating template correctly", () => {
      const template = notificationTemplates.rating_received;
      const data = {
        user_name: "Jane Smith",
        rating: "5",
        rater_name: "Bob Johnson",
      };

      const rendered = renderTemplate(template, data);

      expect(rendered.title).toBe("New Rating Received");
      expect(rendered.body).toBe(
        "You received a 5-star rating from Bob Johnson."
      );
      expect(rendered.email_body).toContain("Jane Smith");
      expect(rendered.email_body).toContain("5-star rating");
      expect(rendered.email_body).toContain("Bob Johnson");
    });

    it("should handle missing placeholders gracefully", () => {
      const template = notificationTemplates.carpool_match_found;
      const data = {
        user_name: "John Doe",
        // missing date and time
      };

      const rendered = renderTemplate(template, data);

      expect(rendered.body).toContain("{date}");
      expect(rendered.body).toContain("{time}");
      expect(rendered.email_body).toContain("John Doe");
    });
  });

  describe("GET /api/notifications/user/:user_id", () => {
    beforeEach(() => {
      // Add test notifications
      mockDb.notifications.push({
        _id: { toString: () => "notification-1" },
        user_id: "test-user-id",
        office_id: "office_001",
        title: "Test Notification 1",
        body: "Test body 1",
        priority: "normal",
        status: "delivered",
        created_at: new Date(),
      });
      mockDb.notifications.push({
        _id: { toString: () => "notification-2" },
        user_id: "test-user-id",
        office_id: "office_001",
        title: "Test Notification 2",
        body: "Test body 2",
        priority: "high",
        status: "delivered",
        read_at: new Date(),
        created_at: new Date(),
      });
    });

    it("should get user notifications successfully", async () => {
      const response = await request(app)
        .get("/api/notifications/user/test-user-id?office_id=office_001")
        .expect(200);

      expect(response.body.notifications).toHaveLength(2);
      expect(response.body.notifications[0].title).toBe("Test Notification 1");
      expect(response.body.notifications[1].read_at).toBeDefined();
    });

    it("should return error for missing office_id", async () => {
      const response = await request(app)
        .get("/api/notifications/user/test-user-id")
        .expect(400);

      expect(response.body.error).toBe("office_id query parameter required");
    });
  });

  describe("PUT /api/notifications/:notification_id/read", () => {
    beforeEach(() => {
      mockDb.notifications.push({
        _id: { toString: () => "notification-1" },
        user_id: "test-user-id",
        office_id: "office_001",
        title: "Test Notification",
        body: "Test body",
        priority: "normal",
        status: "delivered",
        created_at: new Date(),
      });
    });

    it("should mark notification as read successfully", async () => {
      const response = await request(app)
        .put("/api/notifications/notification-1/read")
        .send({
          user_id: "test-user-id",
          office_id: "office_001",
        })
        .expect(200);

      expect(response.body.message).toBe("Notification marked as read");
      expect(mockDb.notifications[0].read_at).toBeDefined();
    });

    it("should return error for missing fields", async () => {
      const response = await request(app)
        .put("/api/notifications/notification-1/read")
        .send({
          user_id: "test-user-id",
          // missing office_id
        })
        .expect(400);

      expect(response.body.error).toBe("user_id and office_id required");
    });

    it("should return error for non-existent notification", async () => {
      const response = await request(app)
        .put("/api/notifications/non-existent/read")
        .send({
          user_id: "test-user-id",
          office_id: "office_001",
        })
        .expect(404);

      expect(response.body.error).toBe("Notification not found");
    });
  });

  describe("Notification preferences", () => {
    describe("GET /api/notifications/preferences/:user_id", () => {
      it("should return default preferences for new user", async () => {
        const response = await request(app)
          .get(
            "/api/notifications/preferences/test-user-id?office_id=office_001"
          )
          .expect(200);

        expect(response.body.preferences).toEqual({
          push_notifications: true,
          email_notifications: true,
          in_app_notifications: true,
          carpool_notifications: true,
          rating_notifications: true,
          reminder_notifications: true,
        });
      });

      it("should return saved preferences", async () => {
        // Add saved preferences
        mockDb.notification_preferences.push({
          user_id: "test-user-id",
          office_id: "office_001",
          preferences: {
            push_notifications: false,
            email_notifications: true,
            in_app_notifications: true,
            carpool_notifications: false,
            rating_notifications: true,
            reminder_notifications: false,
          },
        });

        const response = await request(app)
          .get(
            "/api/notifications/preferences/test-user-id?office_id=office_001"
          )
          .expect(200);

        expect(response.body.preferences.push_notifications).toBe(false);
        expect(response.body.preferences.carpool_notifications).toBe(false);
        expect(response.body.preferences.email_notifications).toBe(true);
      });
    });

    describe("PUT /api/notifications/preferences", () => {
      it("should update preferences successfully", async () => {
        const preferences = {
          push_notifications: false,
          email_notifications: true,
          in_app_notifications: true,
          carpool_notifications: false,
          rating_notifications: true,
          reminder_notifications: false,
        };

        const response = await request(app)
          .put("/api/notifications/preferences?office_id=office_001")
          .send({
            user_id: "test-user-id",
            preferences,
          })
          .expect(200);

        expect(response.body.message).toBe(
          "Notification preferences updated successfully"
        );
        expect(response.body.preferences).toEqual(preferences);
        expect(mockDb.notification_preferences).toHaveLength(1);
      });

      it("should return error for missing fields", async () => {
        const response = await request(app)
          .put("/api/notifications/preferences?office_id=office_001")
          .send({
            user_id: "test-user-id",
            // missing preferences
          })
          .expect(400);

        expect(response.body.error).toBe(
          "office_id, user_id, and preferences required"
        );
      });
    });
  });

  describe("GET /api/notifications/stats", () => {
    beforeEach(() => {
      // Add test notifications with different statuses
      mockDb.notifications.push(
        {
          office_id: "office_001",
          status: "delivered",
          template_key: "carpool_match_found",
          priority: "high",
        },
        {
          office_id: "office_001",
          status: "delivered",
          template_key: "rating_received",
          priority: "normal",
        },
        {
          office_id: "office_001",
          status: "failed",
          template_key: "carpool_match_found",
          priority: "normal",
        }
      );
    });

    it("should return notification statistics", async () => {
      const response = await request(app)
        .get("/api/notifications/stats?office_id=office_001")
        .expect(200);

      expect(response.body.total_notifications).toBe(3);
      expect(response.body.delivered_notifications).toBe(2);
      expect(response.body.failed_notifications).toBe(1);
      expect(response.body.delivery_rate).toBe("66.67%");
    });

    it("should return error for missing office_id", async () => {
      const response = await request(app)
        .get("/api/notifications/stats")
        .expect(400);

      expect(response.body.error).toBe("office_id query parameter required");
    });
  });
});
