#!/usr/bin/env node

const { MongoClient } = require("mongodb");
require("dotenv").config();

const connectionString =
  process.env.MONGODB_URI ||
  "mongodb+srv://gkt2work_db_user:a0T824d9ek4rA9ou@cluster0.cmae5by.mongodb.net/";
const dbName = process.env.MONGODB_DB_NAME || "officeshare_dev";

async function initializeDatabase() {
  let client;

  try {
    console.log("🔗 Connecting to MongoDB Atlas...");
    client = new MongoClient(connectionString);
    await client.connect();
    console.log("✅ Connected to MongoDB Atlas successfully!");

    const db = client.db(dbName);
    console.log(`📊 Using database: ${dbName}`);

    // Initialize collections with schema validation and indexes
    await initializeCollections(db);

    // Create initial office data
    await createInitialData(db);

    console.log("🎉 Database initialization completed successfully!");
  } catch (error) {
    console.error("❌ Database initialization failed:", error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log("🔌 Database connection closed");
    }
  }
}

async function initializeCollections(db) {
  console.log("\n📋 Initializing collections...");

  // Users collection
  console.log("  Creating users collection...");
  await db.createCollection("users", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["office_id", "email", "full_name"],
        properties: {
          office_id: { bsonType: "string" },
          email: { bsonType: "string" },
          full_name: { bsonType: "string" },
          password_hash: { bsonType: "string" },
          reputation_score: { bsonType: "number", minimum: 0, maximum: 5 },
          preferences: { bsonType: "object" },
          created_at: { bsonType: "date" },
          updated_at: { bsonType: "date" },
        },
      },
    },
  });

  // Create indexes for users
  await db
    .collection("users")
    .createIndexes([
      { key: { office_id: 1, email: 1 }, unique: true },
      { key: { office_id: 1 } },
      { key: { email: 1 } },
    ]);

  // Carpool trips collection
  console.log("  Creating carpool_trips collection...");
  await db.createCollection("carpool_trips", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: [
          "office_id",
          "driver_id",
          "origin_location",
          "destination_location",
          "departure_time",
        ],
        properties: {
          office_id: { bsonType: "string" },
          driver_id: { bsonType: "string" },
          origin_location: {
            bsonType: "object",
            required: ["type", "coordinates"],
            properties: {
              type: { enum: ["Point"] },
              coordinates: { bsonType: "array" },
            },
          },
          destination_location: {
            bsonType: "object",
            required: ["type", "coordinates"],
            properties: {
              type: { enum: ["Point"] },
              coordinates: { bsonType: "array" },
            },
          },
          departure_time: { bsonType: "date" },
          cost_per_rider: { bsonType: "number", minimum: 0 },
          max_riders: { bsonType: "int", minimum: 1, maximum: 4 },
          status: { enum: ["scheduled", "active", "completed", "cancelled"] },
        },
      },
    },
  });

  // Create geospatial indexes for carpool trips
  await db
    .collection("carpool_trips")
    .createIndexes([
      { key: { office_id: 1 } },
      { key: { driver_id: 1 } },
      { key: { origin_location: "2dsphere" } },
      { key: { destination_location: "2dsphere" } },
      { key: { departure_time: 1 } },
      { key: { status: 1 } },
    ]);

  // Bike listings collection
  console.log("  Creating bike_listings collection...");
  await db.createCollection("bike_listings", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["office_id", "owner_id", "bike_type", "location"],
        properties: {
          office_id: { bsonType: "string" },
          owner_id: { bsonType: "string" },
          bike_type: { bsonType: "string" },
          description: { bsonType: "string" },
          location: {
            bsonType: "object",
            required: ["type", "coordinates"],
            properties: {
              type: { enum: ["Point"] },
              coordinates: { bsonType: "array" },
            },
          },
          available: { bsonType: "bool" },
          photos: { bsonType: "array" },
        },
      },
    },
  });

  // Create indexes for bike listings
  await db
    .collection("bike_listings")
    .createIndexes([
      { key: { office_id: 1 } },
      { key: { owner_id: 1 } },
      { key: { location: "2dsphere" } },
      { key: { available: 1 } },
    ]);

  // Book listings collection
  console.log("  Creating book_listings collection...");
  await db.createCollection("book_listings", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["office_id", "owner_id", "title", "author"],
        properties: {
          office_id: { bsonType: "string" },
          owner_id: { bsonType: "string" },
          isbn: { bsonType: "string" },
          title: { bsonType: "string" },
          author: { bsonType: "string" },
          genre: { bsonType: "string" },
          description: { bsonType: "string" },
          cover_image: { bsonType: "string" },
          availability_status: {
            enum: ["available", "borrowed", "unavailable"],
          },
        },
      },
    },
  });

  // Create indexes for book listings
  await db
    .collection("book_listings")
    .createIndexes([
      { key: { office_id: 1 } },
      { key: { owner_id: 1 } },
      { key: { isbn: 1 } },
      { key: { title: "text", author: "text", description: "text" } },
      { key: { availability_status: 1 } },
    ]);

  // Chat messages collection
  console.log("  Creating chat_messages collection...");
  await db.createCollection("chat_messages", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: [
          "office_id",
          "sender_id",
          "transaction_id",
          "message",
          "timestamp",
        ],
        properties: {
          office_id: { bsonType: "string" },
          sender_id: { bsonType: "string" },
          transaction_id: { bsonType: "string" },
          transaction_type: { enum: ["carpool", "bike", "book"] },
          message: { bsonType: "string" },
          timestamp: { bsonType: "date" },
          read_by: { bsonType: "array" },
        },
      },
    },
  });

  // Create indexes for chat messages
  await db
    .collection("chat_messages")
    .createIndexes([
      { key: { office_id: 1 } },
      { key: { transaction_id: 1, timestamp: 1 } },
      { key: { sender_id: 1 } },
    ]);

  // Notifications collection
  console.log("  Creating notifications collection...");
  await db.createCollection("notifications", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["office_id", "user_id", "type", "message", "created_at"],
        properties: {
          office_id: { bsonType: "string" },
          user_id: { bsonType: "string" },
          type: { enum: ["carpool", "bike", "book", "system"] },
          message: { bsonType: "string" },
          data: { bsonType: "object" },
          read: { bsonType: "bool" },
          created_at: { bsonType: "date" },
        },
      },
    },
  });

  // Create indexes for notifications
  await db
    .collection("notifications")
    .createIndexes([
      { key: { office_id: 1, user_id: 1 } },
      { key: { created_at: -1 } },
      { key: { read: 1 } },
    ]);

  // Location updates collection (for GPS tracking)
  console.log("  Creating location_updates collection...");
  await db.createCollection("location_updates", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["office_id", "user_id", "trip_id", "location", "timestamp"],
        properties: {
          office_id: { bsonType: "string" },
          user_id: { bsonType: "string" },
          trip_id: { bsonType: "string" },
          location: {
            bsonType: "object",
            required: ["type", "coordinates"],
            properties: {
              type: { enum: ["Point"] },
              coordinates: { bsonType: "array" },
            },
          },
          timestamp: { bsonType: "date" },
          accuracy: { bsonType: "number" },
        },
      },
    },
  });

  // Create indexes for location updates
  await db.collection("location_updates").createIndexes([
    { key: { office_id: 1 } },
    { key: { trip_id: 1, timestamp: 1 } },
    { key: { location: "2dsphere" } },
    { key: { timestamp: 1 }, expireAfterSeconds: 86400 }, // Expire after 24 hours
  ]);

  // Offices collection
  console.log("  Creating offices collection...");
  await db.createCollection("offices", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["office_id", "name", "domain"],
        properties: {
          office_id: { bsonType: "string" },
          name: { bsonType: "string" },
          domain: { bsonType: "string" },
          address: { bsonType: "string" },
          location: {
            bsonType: "object",
            properties: {
              type: { enum: ["Point"] },
              coordinates: { bsonType: "array" },
            },
          },
          settings: { bsonType: "object" },
          created_at: { bsonType: "date" },
        },
      },
    },
  });

  // Create indexes for offices
  await db
    .collection("offices")
    .createIndexes([
      { key: { office_id: 1 }, unique: true },
      { key: { domain: 1 } },
    ]);

  console.log("✅ All collections created with schema validation and indexes");
}

async function createInitialData(db) {
  console.log("\n🏢 Creating initial office data...");

  const defaultOffice = {
    office_id: "office_001",
    name: "Main Office",
    domain: "company.com",
    address: "123 Business Street, City, State 12345",
    location: {
      type: "Point",
      coordinates: [-122.4194, 37.7749], // San Francisco coordinates as example
    },
    settings: {
      max_carpool_distance: 50, // km
      default_carpool_cost_per_km: 0.5,
      bike_sharing_enabled: true,
      book_sharing_enabled: true,
      chat_enabled: true,
    },
    created_at: new Date(),
  };

  // Insert office if it doesn't exist
  const existingOffice = await db
    .collection("offices")
    .findOne({ office_id: defaultOffice.office_id });
  if (!existingOffice) {
    await db.collection("offices").insertOne(defaultOffice);
    console.log("✅ Default office created");
  } else {
    console.log("✅ Default office already exists");
  }

  // Create a test user for development
  const testUser = {
    office_id: "office_001",
    email: "test@company.com",
    full_name: "Test User",
    password_hash: "$2a$10$example.hash.for.development", // This would be properly hashed in real implementation
    reputation_score: 5.0,
    preferences: {
      notifications_enabled: true,
      location_sharing: true,
      email_notifications: true,
    },
    created_at: new Date(),
    updated_at: new Date(),
  };

  const existingUser = await db.collection("users").findOne({
    office_id: testUser.office_id,
    email: testUser.email,
  });

  if (!existingUser) {
    await db.collection("users").insertOne(testUser);
    console.log("✅ Test user created (test@company.com)");
  } else {
    console.log("✅ Test user already exists");
  }
}

// Run the initialization
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
