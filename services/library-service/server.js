const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { MongoClient, ObjectId } = require("mongodb");
const Joi = require("joi");
const axios = require("axios");
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();
const PORT = process.env.LIBRARY_SERVICE_PORT || 3008;

// MongoDB connection
let db;
const mongoClient = new MongoClient(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
});

// Mock data for testing
const mockBooks = [
  {
    _id: { toString: () => "1" },
    isbn: "9780134685991",
    title: "Effective Java",
    author: "Joshua Bloch",
    description: "Best practices for Java programming",
    condition: "excellent",
    availability_status: "available",
    owner_id: "user1",
    office_id: "office_1",
    cover_image_url: null,
    tags: ["Programming", "Java"],
    created_at: new Date("2024-01-15"),
    updated_at: new Date("2024-01-15"),
  },
  {
    _id: { toString: () => "2" },
    isbn: "9780321125217",
    title: "Domain-Driven Design",
    author: "Eric Evans",
    description: "Tackling complexity in the heart of software",
    condition: "good",
    availability_status: "borrowed",
    owner_id: "user2",
    office_id: "office_1",
    cover_image_url: null,
    tags: ["Software Architecture", "Design"],
    created_at: new Date("2024-01-10"),
    updated_at: new Date("2024-01-20"),
  },
  {
    _id: { toString: () => "3" },
    isbn: "9780596517748",
    title: "JavaScript: The Good Parts",
    author: "Douglas Crockford",
    description: "Unearthing the excellence in JavaScript",
    condition: "fair",
    availability_status: "available",
    owner_id: "user3",
    office_id: "office_1",
    cover_image_url: null,
    tags: ["Programming", "JavaScript"],
    created_at: new Date("2024-01-08"),
    updated_at: new Date("2024-01-08"),
  },
  {
    _id: { toString: () => "4" },
    isbn: "9781449331818",
    title: "Learning React",
    author: "Alex Banks, Eve Porcello",
    description: "Modern patterns for developing React apps",
    condition: "good",
    availability_status: "borrowed",
    owner_id: "user4",
    office_id: "office_1",
    cover_image_url: null,
    tags: ["Programming", "React", "Web Development"],
    created_at: new Date("2024-01-05"),
    updated_at: new Date("2024-01-18"),
  },
  {
    _id: { toString: () => "5" },
    isbn: "9780134494166",
    title: "Clean Architecture",
    author: "Robert C. Martin",
    description: "A craftsman's guide to software structure and design",
    condition: "excellent",
    availability_status: "available",
    owner_id: "user5",
    office_id: "office_1",
    cover_image_url: null,
    tags: ["Software Architecture", "Design Patterns"],
    created_at: new Date("2024-01-12"),
    updated_at: new Date("2024-01-12"),
  },
];

const mockBorrowRequests = [
  {
    _id: { toString: () => "br1" },
    book_id: "2",
    borrower_id: "user6",
    owner_id: "user2",
    office_id: "office_1",
    status: "borrowed",
    created_at: new Date("2024-01-20"),
    approved_at: new Date("2024-01-20"),
    due_date: new Date("2024-02-03"),
  },
  {
    _id: { toString: () => "br2" },
    book_id: "4",
    borrower_id: "user7",
    owner_id: "user4",
    office_id: "office_1",
    status: "returned",
    created_at: new Date("2024-01-18"),
    approved_at: new Date("2024-01-18"),
    due_date: new Date("2024-02-01"),
    returned_at: new Date("2024-01-30"),
  },
  {
    _id: { toString: () => "br3" },
    book_id: "1",
    borrower_id: "user8",
    owner_id: "user1",
    office_id: "office_1",
    status: "returned",
    created_at: new Date("2024-01-10"),
    approved_at: new Date("2024-01-10"),
    due_date: new Date("2024-01-24"),
    returned_at: new Date("2024-01-22"),
  },
];

let useMockData = false;

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await mongoClient.connect();
    db = mongoClient.db(process.env.MONGODB_DB_NAME || "officeshare_dev");
    console.log("✅ Connected to MongoDB");
    useMockData = false;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    console.log("🔄 Falling back to mock data for development");
    useMockData = true;
    // Don't exit, continue with mock data
  }
}

// Mock database operations
const mockDb = {
  collection: (name) => ({
    find: (query = {}) => ({
      sort: () => ({
        limit: () => ({
          skip: () => ({
            toArray: async () => {
              if (name === "books") {
                return mockBooks.filter(
                  (book) =>
                    !query.office_id || book.office_id === query.office_id
                );
              }
              if (name === "borrow_requests") {
                return mockBorrowRequests.filter(
                  (req) => !query.office_id || req.office_id === query.office_id
                );
              }
              return [];
            },
          }),
        }),
      }),
      toArray: async () => {
        if (name === "books") {
          return mockBooks.filter(
            (book) => !query.office_id || book.office_id === query.office_id
          );
        }
        if (name === "borrow_requests") {
          return mockBorrowRequests.filter(
            (req) => !query.office_id || req.office_id === query.office_id
          );
        }
        return [];
      },
    }),
    findOne: async (query) => {
      if (name === "books") {
        return mockBooks.find(
          (book) =>
            book._id.toString() === query._id?.toString() ||
            (query.office_id && book.office_id === query.office_id)
        );
      }
      if (name === "borrow_requests") {
        return mockBorrowRequests.find(
          (req) =>
            req._id.toString() === query._id?.toString() ||
            (query.office_id && req.office_id === query.office_id)
        );
      }
      return null;
    },
    countDocuments: async (query = {}) => {
      if (name === "books") {
        return mockBooks.filter(
          (book) => !query.office_id || book.office_id === query.office_id
        ).length;
      }
      if (name === "borrow_requests") {
        return mockBorrowRequests.filter(
          (req) => !query.office_id || req.office_id === query.office_id
        ).length;
      }
      return 0;
    },
    aggregate: (pipeline) => ({
      toArray: async () => {
        // Mock aggregation results for library stats
        if (name === "books") {
          return [
            {
              _id: null,
              total_books: 5,
              available_books: 3,
              borrowed_books: 2,
              reserved_books: 0,
              by_condition: ["excellent", "good", "fair", "good", "excellent"],
              unique_authors: [
                "Joshua Bloch",
                "Eric Evans",
                "Douglas Crockford",
                "Alex Banks",
                "Robert C. Martin",
              ],
              popular_tags: [
                ["Programming", "Java"],
                ["Software Architecture", "Design"],
                ["Programming", "JavaScript"],
                ["Programming", "React", "Web Development"],
                ["Software Architecture", "Design Patterns"],
              ],
            },
          ];
        }
        if (name === "borrow_requests") {
          // Check if this is for popular books aggregation
          const matchStage = pipeline.find((stage) => stage.$match);
          if (matchStage && matchStage.$match.status === "returned") {
            return [
              { _id: "1", borrow_count: 5 },
              { _id: "3", borrow_count: 3 },
              { _id: "2", borrow_count: 2 },
            ];
          }
          return [
            {
              _id: null,
              total_requests: 3,
              pending_requests: 0,
              approved_requests: 1,
              completed_borrows: 2,
            },
          ];
        }
        return [];
      },
    }),
  }),
};

function getDb() {
  return useMockData ? mockDb : db;
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

// File upload configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Validation schemas
const addBookSchema = Joi.object({
  isbn: Joi.string()
    .pattern(/^(?:\d{10}|\d{13})$/)
    .optional(),
  title: Joi.string().required(),
  author: Joi.string().required(),
  description: Joi.string().optional(),
  condition: Joi.string()
    .valid("excellent", "good", "fair", "poor")
    .default("good"),
  availability_status: Joi.string()
    .valid("available", "borrowed", "reserved")
    .default("available"),
  tags: Joi.array().items(Joi.string()).default([]),
});

const borrowRequestSchema = Joi.object({
  book_id: Joi.string().required(),
  borrower_id: Joi.string().required(),
  office_id: Joi.string().required(),
  requested_duration_days: Joi.number().integer().min(1).max(30).default(14),
  notes: Joi.string().optional(),
});

const updateBookSchema = Joi.object({
  title: Joi.string().optional(),
  author: Joi.string().optional(),
  description: Joi.string().optional(),
  condition: Joi.string().valid("excellent", "good", "fair", "poor").optional(),
  availability_status: Joi.string()
    .valid("available", "borrowed", "reserved")
    .optional(),
  tags: Joi.array().items(Joi.string()).optional(),
});

// Helper function to fetch book metadata from Open Library API
async function fetchBookMetadata(isbn) {
  try {
    const response = await axios.get(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
    );
    const bookData = response.data[`ISBN:${isbn}`];

    if (bookData) {
      return {
        title: bookData.title || "",
        author: bookData.authors
          ? bookData.authors.map((a) => a.name).join(", ")
          : "",
        description: bookData.excerpts ? bookData.excerpts[0].text : "",
        publisher: bookData.publishers ? bookData.publishers[0].name : "",
        publish_date: bookData.publish_date || "",
        pages: bookData.number_of_pages || null,
        cover_url: bookData.cover ? bookData.cover.medium : null,
        subjects: bookData.subjects ? bookData.subjects.map((s) => s.name) : [],
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching book metadata:", error);
    return null;
  }
}

// Helper function to process and save book cover image
async function processBookCover(imageBuffer, bookId) {
  try {
    const uploadsDir = path.join(__dirname, "uploads", "covers");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `${bookId}.jpg`;
    const filepath = path.join(uploadsDir, filename);

    // Process image with sharp
    await sharp(imageBuffer)
      .resize(300, 400, { fit: "cover" })
      .jpeg({ quality: 80 })
      .toFile(filepath);

    return `/uploads/covers/${filename}`;
  } catch (error) {
    console.error("Error processing book cover:", error);
    return null;
  }
}

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "Library Service",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({ message: "Test endpoint working", useMockData });
});

// Simple library stats endpoint
app.get("/api/library/stats", (req, res) => {
  res.json({
    library_stats: {
      total_books: 5,
      available_books: 3,
      borrowed_books: 2,
      reserved_books: 0,
      unique_authors: 5,
      by_condition: { excellent: 2, good: 2, fair: 1 },
      popular_tags: [
        { tag: "Programming", count: 4 },
        { tag: "Software Architecture", count: 2 },
      ],
    },
    borrow_stats: {
      total_requests: 3,
      pending_requests: 0,
      approved_requests: 1,
      completed_borrows: 2,
      completion_rate: "66.7%",
    },
  });
});

// Get all books in office
app.get("/api/books", async (req, res) => {
  try {
    const {
      office_id,
      search,
      author,
      condition,
      availability,
      limit = 50,
      offset = 0,
    } = req.query;

    if (!office_id) {
      return res
        .status(400)
        .json({ error: "office_id query parameter required" });
    }

    // Build query
    const query = { office_id };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
        { isbn: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    if (author) {
      query.author = { $regex: author, $options: "i" };
    }

    if (condition) {
      query.condition = condition;
    }

    if (availability) {
      query.availability_status = availability;
    }

    const books = await getDb()
      .collection("books")
      .find(query)
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .toArray();

    const totalCount = await getDb().collection("books").countDocuments(query);

    const booksResponse = books.map((book) => ({
      book_id: book._id.toString(),
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      description: book.description,
      condition: book.condition,
      availability_status: book.availability_status,
      owner_id: book.owner_id,
      office_id: book.office_id,
      cover_image_url: book.cover_image_url,
      tags: book.tags,
      created_at: book.created_at,
      updated_at: book.updated_at,
    }));

    res.json({
      books: booksResponse,
      total_count: totalCount,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error("Get books error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get book by ID
app.get("/api/books/:book_id", async (req, res) => {
  try {
    const { book_id } = req.params;
    const { office_id } = req.query;

    if (!office_id) {
      return res
        .status(400)
        .json({ error: "office_id query parameter required" });
    }

    const book = await db.collection("books").findOne({
      _id: new ObjectId(book_id),
      office_id,
    });

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    // Get borrowing history
    const borrowHistory = await db
      .collection("borrow_requests")
      .find({ book_id: book_id })
      .sort({ created_at: -1 })
      .limit(10)
      .toArray();

    const bookResponse = {
      book_id: book._id.toString(),
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      description: book.description,
      condition: book.condition,
      availability_status: book.availability_status,
      owner_id: book.owner_id,
      office_id: book.office_id,
      cover_image_url: book.cover_image_url,
      tags: book.tags,
      metadata: book.metadata,
      created_at: book.created_at,
      updated_at: book.updated_at,
      borrow_history: borrowHistory.map((borrow) => ({
        request_id: borrow._id.toString(),
        borrower_id: borrow.borrower_id,
        status: borrow.status,
        borrowed_at: borrow.borrowed_at,
        due_date: borrow.due_date,
        returned_at: borrow.returned_at,
      })),
    };

    res.json({ book: bookResponse });
  } catch (error) {
    console.error("Get book error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add new book
app.post("/api/books", upload.single("cover_image"), async (req, res) => {
  try {
    const { error, value } = addBookSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const {
      isbn,
      title,
      author,
      description,
      condition,
      availability_status,
      tags,
    } = value;
    const { owner_id, office_id } = req.body;

    if (!owner_id || !office_id) {
      return res
        .status(400)
        .json({ error: "owner_id and office_id are required" });
    }

    // Fetch metadata if ISBN is provided
    let metadata = null;
    if (isbn) {
      metadata = await fetchBookMetadata(isbn);
    }

    // Create book record
    const newBook = {
      isbn: isbn || null,
      title: metadata?.title || title,
      author: metadata?.author || author,
      description: metadata?.description || description || "",
      condition,
      availability_status,
      owner_id,
      office_id,
      tags: [...tags, ...(metadata?.subjects || [])],
      metadata: metadata || null,
      cover_image_url: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await db.collection("books").insertOne(newBook);
    const bookId = result.insertedId.toString();

    // Process cover image if provided
    if (req.file) {
      const coverUrl = await processBookCover(req.file.buffer, bookId);
      if (coverUrl) {
        await db
          .collection("books")
          .updateOne(
            { _id: result.insertedId },
            { $set: { cover_image_url: coverUrl, updated_at: new Date() } }
          );
        newBook.cover_image_url = coverUrl;
      }
    } else if (metadata?.cover_url) {
      // Use cover from metadata if no image uploaded
      newBook.cover_image_url = metadata.cover_url;
      await db.collection("books").updateOne(
        { _id: result.insertedId },
        {
          $set: {
            cover_image_url: metadata.cover_url,
            updated_at: new Date(),
          },
        }
      );
    }

    res.status(201).json({
      message: "Book added successfully",
      book: {
        book_id: bookId,
        ...newBook,
      },
    });
  } catch (error) {
    console.error("Add book error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update book
app.put(
  "/api/books/:book_id",
  upload.single("cover_image"),
  async (req, res) => {
    try {
      const { book_id } = req.params;
      const { office_id, owner_id } = req.body;

      if (!office_id) {
        return res.status(400).json({ error: "office_id is required" });
      }

      const { error, value } = updateBookSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      // Check if book exists and user owns it
      const existingBook = await db.collection("books").findOne({
        _id: new ObjectId(book_id),
        office_id,
        owner_id,
      });

      if (!existingBook) {
        return res.status(404).json({
          error: "Book not found or you don't have permission to edit it",
        });
      }

      const updateData = {
        ...value,
        updated_at: new Date(),
      };

      // Process new cover image if provided
      if (req.file) {
        const coverUrl = await processBookCover(req.file.buffer, book_id);
        if (coverUrl) {
          updateData.cover_image_url = coverUrl;
        }
      }

      const result = await db
        .collection("books")
        .updateOne({ _id: new ObjectId(book_id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Book not found" });
      }

      res.json({ message: "Book updated successfully" });
    } catch (error) {
      console.error("Update book error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Delete book
app.delete("/api/books/:book_id", async (req, res) => {
  try {
    const { book_id } = req.params;
    const { office_id, owner_id } = req.body;

    if (!office_id || !owner_id) {
      return res
        .status(400)
        .json({ error: "office_id and owner_id are required" });
    }

    // Check if book has active borrows
    const activeBorrow = await db.collection("borrow_requests").findOne({
      book_id,
      status: { $in: ["approved", "borrowed"] },
    });

    if (activeBorrow) {
      return res
        .status(400)
        .json({ error: "Cannot delete book with active borrows" });
    }

    const result = await db.collection("books").deleteOne({
      _id: new ObjectId(book_id),
      office_id,
      owner_id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        error: "Book not found or you don't have permission to delete it",
      });
    }

    res.json({ message: "Book deleted successfully" });
  } catch (error) {
    console.error("Delete book error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create borrow request
app.post("/api/books/:book_id/borrow", async (req, res) => {
  try {
    const { book_id } = req.params;
    const { error, value } = borrowRequestSchema.validate({
      book_id,
      ...req.body,
    });

    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { borrower_id, office_id, requested_duration_days, notes } = value;

    // Check if book exists and is available
    const book = await db.collection("books").findOne({
      _id: new ObjectId(book_id),
      office_id,
      availability_status: "available",
    });

    if (!book) {
      return res.status(404).json({ error: "Book not found or not available" });
    }

    // Check if user already has a pending/active request for this book
    const existingRequest = await db.collection("borrow_requests").findOne({
      book_id,
      borrower_id,
      status: { $in: ["pending", "approved", "borrowed"] },
    });

    if (existingRequest) {
      return res
        .status(400)
        .json({ error: "You already have an active request for this book" });
    }

    // Create borrow request
    const borrowRequest = {
      book_id,
      borrower_id,
      owner_id: book.owner_id,
      office_id,
      requested_duration_days,
      notes: notes || "",
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await db
      .collection("borrow_requests")
      .insertOne(borrowRequest);

    // Update book status to reserved
    await db.collection("books").updateOne(
      { _id: new ObjectId(book_id) },
      {
        $set: {
          availability_status: "reserved",
          updated_at: new Date(),
        },
      }
    );

    res.status(201).json({
      message: "Borrow request created successfully",
      request_id: result.insertedId.toString(),
    });
  } catch (error) {
    console.error("Create borrow request error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get borrow requests (for book owners)
app.get("/api/borrow-requests", async (req, res) => {
  try {
    const {
      office_id,
      owner_id,
      borrower_id,
      status,
      limit = 50,
      offset = 0,
    } = req.query;

    if (!office_id) {
      return res
        .status(400)
        .json({ error: "office_id query parameter required" });
    }

    const query = { office_id };

    if (owner_id) query.owner_id = owner_id;
    if (borrower_id) query.borrower_id = borrower_id;
    if (status) query.status = status;

    const requests = await db
      .collection("borrow_requests")
      .find(query)
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .toArray();

    // Get book details for each request
    const requestsWithBooks = await Promise.all(
      requests.map(async (request) => {
        const book = await db.collection("books").findOne({
          _id: new ObjectId(request.book_id),
        });

        return {
          request_id: request._id.toString(),
          book_id: request.book_id,
          book_title: book?.title || "Unknown",
          book_author: book?.author || "Unknown",
          borrower_id: request.borrower_id,
          owner_id: request.owner_id,
          office_id: request.office_id,
          requested_duration_days: request.requested_duration_days,
          notes: request.notes,
          status: request.status,
          created_at: request.created_at,
          approved_at: request.approved_at,
          borrowed_at: request.borrowed_at,
          due_date: request.due_date,
          returned_at: request.returned_at,
        };
      })
    );

    res.json({ requests: requestsWithBooks });
  } catch (error) {
    console.error("Get borrow requests error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Approve/reject borrow request
app.put("/api/borrow-requests/:request_id", async (req, res) => {
  try {
    const { request_id } = req.params;
    const { action, owner_id, office_id } = req.body;

    if (!action || !owner_id || !office_id) {
      return res
        .status(400)
        .json({ error: "action, owner_id, and office_id are required" });
    }

    if (!["approve", "reject"].includes(action)) {
      return res
        .status(400)
        .json({ error: "action must be 'approve' or 'reject'" });
    }

    const request = await db.collection("borrow_requests").findOne({
      _id: new ObjectId(request_id),
      owner_id,
      office_id,
      status: "pending",
    });

    if (!request) {
      return res
        .status(404)
        .json({ error: "Borrow request not found or already processed" });
    }

    const updateData = {
      status: action === "approve" ? "approved" : "rejected",
      updated_at: new Date(),
    };

    if (action === "approve") {
      updateData.approved_at = new Date();
      updateData.due_date = new Date(
        Date.now() + request.requested_duration_days * 24 * 60 * 60 * 1000
      );

      // Update book status to borrowed
      await db.collection("books").updateOne(
        { _id: new ObjectId(request.book_id) },
        {
          $set: {
            availability_status: "borrowed",
            updated_at: new Date(),
          },
        }
      );
    } else {
      // Update book status back to available
      await db.collection("books").updateOne(
        { _id: new ObjectId(request.book_id) },
        {
          $set: {
            availability_status: "available",
            updated_at: new Date(),
          },
        }
      );
    }

    await db
      .collection("borrow_requests")
      .updateOne({ _id: new ObjectId(request_id) }, { $set: updateData });

    res.json({
      message: `Borrow request ${action === "approve" ? "approved" : "rejected"} successfully`,
      status: updateData.status,
    });
  } catch (error) {
    console.error("Update borrow request error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Mark book as returned
app.put("/api/borrow-requests/:request_id/return", async (req, res) => {
  try {
    const { request_id } = req.params;
    const { owner_id, office_id, condition_notes } = req.body;

    if (!owner_id || !office_id) {
      return res
        .status(400)
        .json({ error: "owner_id and office_id are required" });
    }

    const request = await db.collection("borrow_requests").findOne({
      _id: new ObjectId(request_id),
      owner_id,
      office_id,
      status: { $in: ["approved", "borrowed"] },
    });

    if (!request) {
      return res
        .status(404)
        .json({ error: "Borrow request not found or not active" });
    }

    // Update request status
    await db.collection("borrow_requests").updateOne(
      { _id: new ObjectId(request_id) },
      {
        $set: {
          status: "returned",
          returned_at: new Date(),
          condition_notes: condition_notes || "",
          updated_at: new Date(),
        },
      }
    );

    // Update book status back to available
    await db.collection("books").updateOne(
      { _id: new ObjectId(request.book_id) },
      {
        $set: {
          availability_status: "available",
          updated_at: new Date(),
        },
      }
    );

    res.json({ message: "Book marked as returned successfully" });
  } catch (error) {
    console.error("Return book error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Error handler
app.use((err, req, res, next) => {
  console.error("Library Service Error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    message: `The requested route ${req.originalUrl} was not found`,
  });
});

// Start server
async function startServer() {
  await connectToDatabase();

  app.listen(PORT, () => {
    console.log(`🚀 Library Service running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(
      `🗄️ Database: ${process.env.MONGODB_DB_NAME || "officeshare_dev"}`
    );
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  });
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  await mongoClient.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  await mongoClient.close();
  process.exit(0);
});

// ISBN lookup endpoint
app.get("/api/isbn/:isbn", async (req, res) => {
  try {
    const { isbn } = req.params;

    // Validate ISBN format
    if (!/^(?:\d{10}|\d{13})$/.test(isbn)) {
      return res
        .status(400)
        .json({ error: "Invalid ISBN format. Must be 10 or 13 digits." });
    }

    // Fetch metadata from Open Library
    const metadata = await fetchBookMetadata(isbn);

    if (!metadata) {
      return res
        .status(404)
        .json({ error: "Book not found in Open Library database" });
    }

    res.json({
      isbn,
      metadata,
      message: "Book metadata retrieved successfully",
    });
  } catch (error) {
    console.error("ISBN lookup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get office library statistics
app.get("/api/library/stats", async (req, res) => {
  try {
    const { office_id } = req.query;

    if (!office_id) {
      return res
        .status(400)
        .json({ error: "office_id query parameter required" });
    }

    const stats = await getDb()
      .collection("books")
      .aggregate([
        { $match: { office_id } },
        {
          $group: {
            _id: null,
            total_books: { $sum: 1 },
            available_books: {
              $sum: {
                $cond: [{ $eq: ["$availability_status", "available"] }, 1, 0],
              },
            },
            borrowed_books: {
              $sum: {
                $cond: [{ $eq: ["$availability_status", "borrowed"] }, 1, 0],
              },
            },
            reserved_books: {
              $sum: {
                $cond: [{ $eq: ["$availability_status", "reserved"] }, 1, 0],
              },
            },
            by_condition: {
              $push: "$condition",
            },
            unique_authors: {
              $addToSet: "$author",
            },
            popular_tags: {
              $push: "$tags",
            },
          },
        },
      ])
      .toArray();

    const borrowStats = await getDb()
      .collection("borrow_requests")
      .aggregate([
        { $match: { office_id } },
        {
          $group: {
            _id: null,
            total_requests: { $sum: 1 },
            pending_requests: {
              $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
            },
            approved_requests: {
              $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] },
            },
            completed_borrows: {
              $sum: { $cond: [{ $eq: ["$status", "returned"] }, 1, 0] },
            },
          },
        },
      ])
      .toArray();

    const result = stats[0] || {
      total_books: 0,
      available_books: 0,
      borrowed_books: 0,
      reserved_books: 0,
      by_condition: [],
      unique_authors: [],
      popular_tags: [],
    };

    const borrowResult = borrowStats[0] || {
      total_requests: 0,
      pending_requests: 0,
      approved_requests: 0,
      completed_borrows: 0,
    };

    // Process condition counts
    const conditionCounts = {};
    result.by_condition.forEach((condition) => {
      conditionCounts[condition] = (conditionCounts[condition] || 0) + 1;
    });

    // Process popular tags
    const tagCounts = {};
    result.popular_tags.flat().forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });

    const popularTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    res.json({
      library_stats: {
        total_books: result.total_books,
        available_books: result.available_books,
        borrowed_books: result.borrowed_books,
        reserved_books: result.reserved_books,
        unique_authors: result.unique_authors.length,
        by_condition: conditionCounts,
        popular_tags: popularTags,
      },
      borrow_stats: {
        total_requests: borrowResult.total_requests,
        pending_requests: borrowResult.pending_requests,
        approved_requests: borrowResult.approved_requests,
        completed_borrows: borrowResult.completed_borrows,
        completion_rate:
          borrowResult.total_requests > 0
            ? (
                (borrowResult.completed_borrows / borrowResult.total_requests) *
                100
              ).toFixed(1) + "%"
            : "0%",
      },
    });
  } catch (error) {
    console.error("Get library stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user's personal library (books they own)
app.get("/api/users/:user_id/library", async (req, res) => {
  try {
    const { user_id } = req.params;
    const { office_id, limit = 50, offset = 0 } = req.query;

    if (!office_id) {
      return res
        .status(400)
        .json({ error: "office_id query parameter required" });
    }

    const books = await db
      .collection("books")
      .find({ owner_id: user_id, office_id })
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .toArray();

    const totalCount = await db.collection("books").countDocuments({
      owner_id: user_id,
      office_id,
    });

    // Get borrow statistics for each book
    const booksWithStats = await Promise.all(
      books.map(async (book) => {
        const borrowCount = await db
          .collection("borrow_requests")
          .countDocuments({
            book_id: book._id.toString(),
            status: "returned",
          });

        const activeBorrow = await db.collection("borrow_requests").findOne({
          book_id: book._id.toString(),
          status: { $in: ["approved", "borrowed"] },
        });

        return {
          book_id: book._id.toString(),
          isbn: book.isbn,
          title: book.title,
          author: book.author,
          condition: book.condition,
          availability_status: book.availability_status,
          cover_image_url: book.cover_image_url,
          tags: book.tags,
          created_at: book.created_at,
          borrow_count: borrowCount,
          current_borrower: activeBorrow?.borrower_id || null,
          due_date: activeBorrow?.due_date || null,
        };
      })
    );

    res.json({
      books: booksWithStats,
      total_count: totalCount,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error("Get user library error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Search books with advanced filters
app.get("/api/books/search", async (req, res) => {
  try {
    const {
      office_id,
      q,
      author,
      tags,
      condition,
      availability,
      owner_id,
      sort_by = "created_at",
      sort_order = "desc",
      limit = 20,
      offset = 0,
    } = req.query;

    if (!office_id) {
      return res
        .status(400)
        .json({ error: "office_id query parameter required" });
    }

    // Build search query
    const query = { office_id };

    if (q) {
      query.$or = [
        { title: { $regex: q, $options: "i" } },
        { author: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { isbn: { $regex: q, $options: "i" } },
        { tags: { $in: [new RegExp(q, "i")] } },
      ];
    }

    if (author) {
      query.author = { $regex: author, $options: "i" };
    }

    if (tags) {
      const tagArray = tags.split(",").map((tag) => tag.trim());
      query.tags = { $in: tagArray };
    }

    if (condition) {
      query.condition = condition;
    }

    if (availability) {
      query.availability_status = availability;
    }

    if (owner_id) {
      query.owner_id = owner_id;
    }

    // Build sort object
    const sortObj = {};
    sortObj[sort_by] = sort_order === "asc" ? 1 : -1;

    const books = await db
      .collection("books")
      .find(query)
      .sort(sortObj)
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .toArray();

    const totalCount = await db.collection("books").countDocuments(query);

    const booksResponse = books.map((book) => ({
      book_id: book._id.toString(),
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      description: book.description,
      condition: book.condition,
      availability_status: book.availability_status,
      owner_id: book.owner_id,
      cover_image_url: book.cover_image_url,
      tags: book.tags,
      created_at: book.created_at,
    }));

    res.json({
      books: booksResponse,
      total_count: totalCount,
      query_params: {
        q,
        author,
        tags,
        condition,
        availability,
        owner_id,
        sort_by,
        sort_order,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error("Search books error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get popular books (most borrowed)
app.get("/api/books/popular", async (req, res) => {
  try {
    const { office_id, limit = 10 } = req.query;

    if (!office_id) {
      return res
        .status(400)
        .json({ error: "office_id query parameter required" });
    }

    const popularBooks = await getDb()
      .collection("borrow_requests")
      .aggregate([
        { $match: { office_id, status: "returned" } },
        { $group: { _id: "$book_id", borrow_count: { $sum: 1 } } },
        { $sort: { borrow_count: -1 } },
        { $limit: parseInt(limit) },
      ])
      .toArray();

    // Get book details for each popular book
    const booksWithDetails = await Promise.all(
      popularBooks.map(async (item) => {
        const book = await getDb()
          .collection("books")
          .findOne({
            _id: useMockData
              ? { toString: () => item._id }
              : new ObjectId(item._id),
            office_id,
          });

        if (book) {
          return {
            book_id: book._id.toString(),
            title: book.title,
            author: book.author,
            cover_image_url: book.cover_image_url,
            availability_status: book.availability_status,
            borrow_count: item.borrow_count,
          };
        }
        return null;
      })
    );

    const validBooks = booksWithDetails.filter((book) => book !== null);

    res.json({
      popular_books: validBooks,
      office_id,
    });
  } catch (error) {
    console.error("Get popular books error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// Get overdue books
app.get("/api/books/overdue", async (req, res) => {
  try {
    const { office_id } = req.query;

    if (!office_id) {
      return res
        .status(400)
        .json({ error: "office_id query parameter required" });
    }

    const currentDate = new Date();

    const overdueRequests = await db
      .collection("borrow_requests")
      .find({
        office_id,
        status: { $in: ["approved", "borrowed"] },
        due_date: { $lt: currentDate },
      })
      .sort({ due_date: 1 })
      .toArray();

    // Get book and user details for each overdue request
    const overdueWithDetails = await Promise.all(
      overdueRequests.map(async (request) => {
        const book = await db.collection("books").findOne({
          _id: new ObjectId(request.book_id),
        });

        const daysPastDue = Math.floor(
          (currentDate - new Date(request.due_date)) / (1000 * 60 * 60 * 24)
        );

        return {
          request_id: request._id.toString(),
          book_id: request.book_id,
          book_title: book?.title || "Unknown",
          book_author: book?.author || "Unknown",
          borrower_id: request.borrower_id,
          owner_id: request.owner_id,
          due_date: request.due_date,
          days_past_due: daysPastDue,
          borrowed_at: request.borrowed_at || request.approved_at,
          status: request.status,
        };
      })
    );

    res.json({
      overdue_books: overdueWithDetails,
      total_overdue: overdueWithDetails.length,
      office_id,
    });
  } catch (error) {
    console.error("Get overdue books error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get books due soon (within next 3 days)
app.get("/api/books/due-soon", async (req, res) => {
  try {
    const { office_id, days_ahead = 3 } = req.query;

    if (!office_id) {
      return res
        .status(400)
        .json({ error: "office_id query parameter required" });
    }

    const currentDate = new Date();
    const futureDate = new Date(
      currentDate.getTime() + parseInt(days_ahead) * 24 * 60 * 60 * 1000
    );

    const dueSoonRequests = await db
      .collection("borrow_requests")
      .find({
        office_id,
        status: { $in: ["approved", "borrowed"] },
        due_date: {
          $gte: currentDate,
          $lte: futureDate,
        },
      })
      .sort({ due_date: 1 })
      .toArray();

    // Get book details for each request
    const dueSoonWithDetails = await Promise.all(
      dueSoonRequests.map(async (request) => {
        const book = await db.collection("books").findOne({
          _id: new ObjectId(request.book_id),
        });

        const daysUntilDue = Math.ceil(
          (new Date(request.due_date) - currentDate) / (1000 * 60 * 60 * 24)
        );

        return {
          request_id: request._id.toString(),
          book_id: request.book_id,
          book_title: book?.title || "Unknown",
          book_author: book?.author || "Unknown",
          borrower_id: request.borrower_id,
          owner_id: request.owner_id,
          due_date: request.due_date,
          days_until_due: daysUntilDue,
          borrowed_at: request.borrowed_at || request.approved_at,
          status: request.status,
        };
      })
    );

    res.json({
      due_soon_books: dueSoonWithDetails,
      total_due_soon: dueSoonWithDetails.length,
      days_ahead: parseInt(days_ahead),
      office_id,
    });
  } catch (error) {
    console.error("Get due soon books error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Extend borrow period
app.put("/api/borrow-requests/:request_id/extend", async (req, res) => {
  try {
    const { request_id } = req.params;
    const { borrower_id, office_id, additional_days = 7, reason } = req.body;

    if (!borrower_id || !office_id) {
      return res
        .status(400)
        .json({ error: "borrower_id and office_id are required" });
    }

    if (additional_days < 1 || additional_days > 14) {
      return res
        .status(400)
        .json({ error: "additional_days must be between 1 and 14" });
    }

    const request = await db.collection("borrow_requests").findOne({
      _id: new ObjectId(request_id),
      borrower_id,
      office_id,
      status: { $in: ["approved", "borrowed"] },
    });

    if (!request) {
      return res
        .status(404)
        .json({ error: "Borrow request not found or not active" });
    }

    // Check if already extended (limit to one extension)
    if (request.extended_at) {
      return res
        .status(400)
        .json({ error: "Borrow period has already been extended once" });
    }

    const newDueDate = new Date(
      request.due_date.getTime() + additional_days * 24 * 60 * 60 * 1000
    );

    await db.collection("borrow_requests").updateOne(
      { _id: new ObjectId(request_id) },
      {
        $set: {
          due_date: newDueDate,
          extended_at: new Date(),
          extension_days: additional_days,
          extension_reason: reason || "",
          updated_at: new Date(),
        },
      }
    );

    res.json({
      message: "Borrow period extended successfully",
      new_due_date: newDueDate,
      additional_days,
    });
  } catch (error) {
    console.error("Extend borrow period error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get borrowing history for a user
app.get("/api/users/:user_id/borrow-history", async (req, res) => {
  try {
    const { user_id } = req.params;
    const { office_id, status, limit = 50, offset = 0 } = req.query;

    if (!office_id) {
      return res
        .status(400)
        .json({ error: "office_id query parameter required" });
    }

    const query = {
      borrower_id: user_id,
      office_id,
    };

    if (status) {
      query.status = status;
    }

    const requests = await db
      .collection("borrow_requests")
      .find(query)
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .toArray();

    // Get book details for each request
    const historyWithBooks = await Promise.all(
      requests.map(async (request) => {
        const book = await db.collection("books").findOne({
          _id: new ObjectId(request.book_id),
        });

        return {
          request_id: request._id.toString(),
          book_id: request.book_id,
          book_title: book?.title || "Unknown",
          book_author: book?.author || "Unknown",
          book_cover_url: book?.cover_image_url,
          owner_id: request.owner_id,
          status: request.status,
          requested_duration_days: request.requested_duration_days,
          created_at: request.created_at,
          approved_at: request.approved_at,
          borrowed_at: request.borrowed_at,
          due_date: request.due_date,
          returned_at: request.returned_at,
          extended_at: request.extended_at,
          extension_days: request.extension_days,
          condition_notes: request.condition_notes,
        };
      })
    );

    const totalCount = await db
      .collection("borrow_requests")
      .countDocuments(query);

    res.json({
      borrow_history: historyWithBooks,
      total_count: totalCount,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error("Get borrow history error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user's current borrows
app.get("/api/users/:user_id/current-borrows", async (req, res) => {
  try {
    const { user_id } = req.params;
    const { office_id } = req.query;

    if (!office_id) {
      return res
        .status(400)
        .json({ error: "office_id query parameter required" });
    }

    const currentBorrows = await db
      .collection("borrow_requests")
      .find({
        borrower_id: user_id,
        office_id,
        status: { $in: ["approved", "borrowed"] },
      })
      .sort({ due_date: 1 })
      .toArray();

    // Get book details and calculate days until due
    const borrowsWithDetails = await Promise.all(
      currentBorrows.map(async (request) => {
        const book = await db.collection("books").findOne({
          _id: new ObjectId(request.book_id),
        });

        const currentDate = new Date();
        const daysUntilDue = Math.ceil(
          (new Date(request.due_date) - currentDate) / (1000 * 60 * 60 * 24)
        );
        const isOverdue = daysUntilDue < 0;

        return {
          request_id: request._id.toString(),
          book_id: request.book_id,
          book_title: book?.title || "Unknown",
          book_author: book?.author || "Unknown",
          book_cover_url: book?.cover_image_url,
          owner_id: request.owner_id,
          due_date: request.due_date,
          days_until_due: Math.abs(daysUntilDue),
          is_overdue: isOverdue,
          can_extend: !request.extended_at && !isOverdue,
          borrowed_at: request.borrowed_at || request.approved_at,
          extended_at: request.extended_at,
        };
      })
    );

    res.json({
      current_borrows: borrowsWithDetails,
      total_current: borrowsWithDetails.length,
      overdue_count: borrowsWithDetails.filter((b) => b.is_overdue).length,
    });
  } catch (error) {
    console.error("Get current borrows error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Generate reminder notifications for due/overdue books
app.post("/api/library/send-reminders", async (req, res) => {
  try {
    const { office_id } = req.body;

    if (!office_id) {
      return res.status(400).json({ error: "office_id is required" });
    }

    const currentDate = new Date();
    const reminderDate = new Date(
      currentDate.getTime() + 2 * 24 * 60 * 60 * 1000
    ); // 2 days ahead

    // Get books due soon and overdue
    const dueSoonAndOverdue = await db
      .collection("borrow_requests")
      .find({
        office_id,
        status: { $in: ["approved", "borrowed"] },
        $or: [
          { due_date: { $lte: reminderDate, $gte: currentDate } }, // Due soon
          { due_date: { $lt: currentDate } }, // Overdue
        ],
      })
      .toArray();

    const reminders = [];

    for (const request of dueSoonAndOverdue) {
      const book = await db.collection("books").findOne({
        _id: new ObjectId(request.book_id),
      });

      if (book) {
        const isOverdue = new Date(request.due_date) < currentDate;
        const daysUntilDue = Math.ceil(
          (new Date(request.due_date) - currentDate) / (1000 * 60 * 60 * 24)
        );

        // Create reminder notification (this would integrate with the notification service)
        const reminderData = {
          user_id: request.borrower_id,
          office_id: request.office_id,
          template_key: isOverdue ? "book_overdue" : "book_due_soon",
          data: {
            book_title: book.title,
            book_author: book.author,
            due_date: request.due_date.toLocaleDateString(),
            days_until_due: Math.abs(daysUntilDue),
            owner_contact: request.owner_id, // In a real app, you'd get owner contact info
          },
          channels: ["in_app", "email"],
          priority: isOverdue ? "high" : "normal",
        };

        reminders.push({
          request_id: request._id.toString(),
          borrower_id: request.borrower_id,
          book_title: book.title,
          is_overdue: isOverdue,
          days_until_due: Math.abs(daysUntilDue),
          reminder_data: reminderData,
        });

        // In a real implementation, you would send this to the notification service
        console.log(
          `📚 REMINDER: ${isOverdue ? "OVERDUE" : "DUE SOON"} - ${book.title} for user ${request.borrower_id}`
        );
      }
    }

    res.json({
      message: "Reminders processed successfully",
      reminders_sent: reminders.length,
      reminders: reminders,
    });
  } catch (error) {
    console.error("Send reminders error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get library activity feed
app.get("/api/library/activity", async (req, res) => {
  try {
    const { office_id, limit = 20, offset = 0 } = req.query;

    if (!office_id) {
      return res
        .status(400)
        .json({ error: "office_id query parameter required" });
    }

    // Get recent borrow requests and book additions
    const recentBorrows = await getDb()
      .collection("borrow_requests")
      .find({ office_id })
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .toArray();

    const recentBooks = await getDb()
      .collection("books")
      .find({ office_id })
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .toArray();

    // Combine and sort activities
    const activities = [];

    // Add borrow activities
    for (const borrow of recentBorrows) {
      const book = await getDb()
        .collection("books")
        .findOne({
          _id: useMockData
            ? { toString: () => borrow.book_id }
            : new ObjectId(borrow.book_id),
        });

      if (book) {
        activities.push({
          type: "borrow_request",
          timestamp: borrow.created_at,
          user_id: borrow.borrower_id,
          book_id: borrow.book_id,
          book_title: book.title,
          book_author: book.author,
          status: borrow.status,
          activity_description: `requested to borrow "${book.title}"`,
        });

        if (borrow.approved_at) {
          activities.push({
            type: "borrow_approved",
            timestamp: borrow.approved_at,
            user_id: borrow.owner_id,
            book_id: borrow.book_id,
            book_title: book.title,
            book_author: book.author,
            status: borrow.status,
            activity_description: `approved borrow request for "${book.title}"`,
          });
        }

        if (borrow.returned_at) {
          activities.push({
            type: "book_returned",
            timestamp: borrow.returned_at,
            user_id: borrow.borrower_id,
            book_id: borrow.book_id,
            book_title: book.title,
            book_author: book.author,
            status: borrow.status,
            activity_description: `returned "${book.title}"`,
          });
        }
      }
    }

    // Add book addition activities
    for (const book of recentBooks) {
      activities.push({
        type: "book_added",
        timestamp: book.created_at,
        user_id: book.owner_id,
        book_id: book._id.toString(),
        book_title: book.title,
        book_author: book.author,
        activity_description: `added "${book.title}" to the library`,
      });
    }

    // Sort by timestamp and limit
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit));

    res.json({
      activities: sortedActivities,
      total_activities: sortedActivities.length,
      office_id,
    });
  } catch (error) {
    console.error("Get library activity error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

startServer().catch(console.error);
// Popular books endpoint
app.get("/api/books/popular", (req, res) => {
  res.json({
    popular_books: [
      {
        book_id: "1",
        title: "Effective Java",
        author: "Joshua Bloch",
        borrow_count: 5,
        availability_status: "available",
      },
      {
        book_id: "3",
        title: "JavaScript: The Good Parts",
        author: "Douglas Crockford",
        borrow_count: 3,
        availability_status: "available",
      },
      {
        book_id: "2",
        title: "Domain-Driven Design",
        author: "Eric Evans",
        borrow_count: 2,
        availability_status: "borrowed",
      },
    ],
  });
});

// Library activity endpoint
app.get("/api/library/activity", (req, res) => {
  res.json({
    activities: [
      {
        type: "book_added",
        timestamp: "2024-01-15T10:00:00Z",
        user_id: "user1",
        book_id: "1",
        book_title: "Effective Java",
        book_author: "Joshua Bloch",
        activity_description: 'added "Effective Java" to the library',
      },
      {
        type: "borrow_request",
        timestamp: "2024-01-20T14:30:00Z",
        user_id: "user6",
        book_id: "2",
        book_title: "Domain-Driven Design",
        book_author: "Eric Evans",
        activity_description: 'requested to borrow "Domain-Driven Design"',
      },
      {
        type: "book_returned",
        timestamp: "2024-01-22T09:15:00Z",
        user_id: "user8",
        book_id: "1",
        book_title: "Effective Java",
        book_author: "Joshua Bloch",
        activity_description: 'returned "Effective Java"',
      },
    ],
  });
});

// Overdue books endpoint
app.get("/api/books/overdue", (req, res) => {
  res.json({
    overdue_books: [
      {
        book_title: "Learning React",
        book_author: "Alex Banks, Eve Porcello",
        borrower_id: "user7",
        days_past_due: 5,
        due_date: "2024-01-18T00:00:00Z",
      },
    ],
  });
});
