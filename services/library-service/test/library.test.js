const request = require("supertest");
const express = require("express");

// Mock MongoDB
const mockDb = {
  books: [],
  borrow_requests: [],
};

// Mock MongoDB client
jest.mock("mongodb", () => ({
  MongoClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(),
    db: jest.fn().mockReturnValue({
      collection: jest.fn().mockImplementation((collectionName) => ({
        findOne: jest.fn().mockImplementation((query) => {
          if (collectionName === "books") {
            return Promise.resolve(
              mockDb.books.find((book) => {
                if (query._id && query._id.toString) {
                  return book._id.toString() === query._id.toString();
                }
                if (query.office_id) {
                  return book.office_id === query.office_id;
                }
                return false;
              })
            );
          }
          if (collectionName === "borrow_requests") {
            return Promise.resolve(
              mockDb.borrow_requests.find((request) => {
                if (query._id && query._id.toString) {
                  return request._id.toString() === query._id.toString();
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
          mockDb[collectionName].push(newDoc);
          return Promise.resolve({ insertedId: id });
        }),
        updateOne: jest
          .fn()
          .mockResolvedValue({ matchedCount: 1, modifiedCount: 1 }),
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
        find: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          toArray: jest.fn().mockImplementation(() => {
            if (collectionName === "books") {
              return Promise.resolve(mockDb.books);
            }
            if (collectionName === "borrow_requests") {
              return Promise.resolve(mockDb.borrow_requests);
            }
            return Promise.resolve([]);
          }),
        }),
        countDocuments: jest.fn().mockImplementation(() => {
          if (collectionName === "books") {
            return Promise.resolve(mockDb.books.length);
          }
          if (collectionName === "borrow_requests") {
            return Promise.resolve(mockDb.borrow_requests.length);
          }
          return Promise.resolve(0);
        }),
        aggregate: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([
            {
              total_books: mockDb.books.length,
              available_books: mockDb.books.filter(
                (b) => b.availability_status === "available"
              ).length,
              borrowed_books: mockDb.books.filter(
                (b) => b.availability_status === "borrowed"
              ).length,
              reserved_books: mockDb.books.filter(
                (b) => b.availability_status === "reserved"
              ).length,
              by_condition: mockDb.books.map((b) => b.condition),
              unique_authors: [...new Set(mockDb.books.map((b) => b.author))],
              popular_tags: mockDb.books.map((b) => b.tags).flat(),
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

// Mock axios for Open Library API
jest.mock("axios", () => ({
  get: jest.fn().mockImplementation((url) => {
    if (url.includes("openlibrary.org")) {
      return Promise.resolve({
        data: {
          "ISBN:9780134685991": {
            title: "Effective Java",
            authors: [{ name: "Joshua Bloch" }],
            excerpts: [
              {
                text: "A comprehensive guide to Java programming best practices.",
              },
            ],
            publishers: [{ name: "Addison-Wesley" }],
            publish_date: "2017",
            number_of_pages: 416,
            cover: { medium: "https://covers.openlibrary.org/b/id/123-M.jpg" },
            subjects: [
              { name: "Java Programming" },
              { name: "Software Development" },
            ],
          },
        },
      });
    }
    return Promise.reject(new Error("API not found"));
  }),
}));

// Mock multer
jest.mock("multer", () => () => ({
  single: () => (req, res, next) => next(),
}));

// Mock sharp
jest.mock("sharp", () => () => ({
  resize: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  toFile: jest.fn().mockResolvedValue(),
}));

// Create a test app with library routes
const app = express();
app.use(express.json());

// Mock routes for testing
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "Library Service",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

app.get("/api/books", async (req, res) => {
  try {
    const { office_id, search, limit = 50, offset = 0 } = req.query;

    if (!office_id) {
      return res
        .status(400)
        .json({ error: "office_id query parameter required" });
    }

    let books = mockDb.books.filter((book) => book.office_id === office_id);

    if (search) {
      books = books.filter(
        (book) =>
          book.title.toLowerCase().includes(search.toLowerCase()) ||
          book.author.toLowerCase().includes(search.toLowerCase())
      );
    }

    const booksResponse = books
      .slice(parseInt(offset), parseInt(offset) + parseInt(limit))
      .map((book) => ({
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
      }));

    res.json({
      books: booksResponse,
      total_count: books.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/books", async (req, res) => {
  try {
    const {
      isbn,
      title,
      author,
      description,
      condition = "good",
      owner_id,
      office_id,
    } = req.body;

    if (!title || !author || !owner_id || !office_id) {
      return res
        .status(400)
        .json({ error: "title, author, owner_id, and office_id are required" });
    }

    const newBook = {
      _id: { toString: () => "mock-book-id" },
      isbn: isbn || null,
      title,
      author,
      description: description || "",
      condition,
      availability_status: "available",
      owner_id,
      office_id,
      tags: [],
      metadata: null,
      cover_image_url: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockDb.books.push(newBook);

    res.status(201).json({
      message: "Book added successfully",
      book: {
        book_id: newBook._id.toString(),
        ...newBook,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/isbn/:isbn", async (req, res) => {
  try {
    const { isbn } = req.params;

    if (!/^(?:\d{10}|\d{13})$/.test(isbn)) {
      return res
        .status(400)
        .json({ error: "Invalid ISBN format. Must be 10 or 13 digits." });
    }

    // Mock metadata response
    const metadata = {
      title: "Effective Java",
      author: "Joshua Bloch",
      description: "A comprehensive guide to Java programming best practices.",
      publisher: "Addison-Wesley",
      publish_date: "2017",
      pages: 416,
      cover_url: "https://covers.openlibrary.org/b/id/123-M.jpg",
      subjects: ["Java Programming", "Software Development"],
    };

    res.json({
      isbn,
      metadata,
      message: "Book metadata retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/books/:book_id/borrow", async (req, res) => {
  try {
    const { book_id } = req.params;
    const {
      borrower_id,
      office_id,
      requested_duration_days = 14,
      notes,
    } = req.body;

    if (!borrower_id || !office_id) {
      return res
        .status(400)
        .json({ error: "borrower_id and office_id are required" });
    }

    const book = mockDb.books.find(
      (b) =>
        b._id.toString() === book_id &&
        b.office_id === office_id &&
        b.availability_status === "available"
    );

    if (!book) {
      return res.status(404).json({ error: "Book not found or not available" });
    }

    const existingRequest = mockDb.borrow_requests.find(
      (r) =>
        r.book_id === book_id &&
        r.borrower_id === borrower_id &&
        ["pending", "approved", "borrowed"].includes(r.status)
    );

    if (existingRequest) {
      return res
        .status(400)
        .json({ error: "You already have an active request for this book" });
    }

    const borrowRequest = {
      _id: { toString: () => "mock-request-id" },
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

    mockDb.borrow_requests.push(borrowRequest);
    book.availability_status = "reserved";

    res.status(201).json({
      message: "Borrow request created successfully",
      request_id: borrowRequest._id.toString(),
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

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

    const request = mockDb.borrow_requests.find(
      (r) =>
        r._id.toString() === request_id &&
        r.owner_id === owner_id &&
        r.office_id === office_id &&
        r.status === "pending"
    );

    if (!request) {
      return res
        .status(404)
        .json({ error: "Borrow request not found or already processed" });
    }

    request.status = action === "approve" ? "approved" : "rejected";
    request.updated_at = new Date();

    if (action === "approve") {
      request.approved_at = new Date();
      request.due_date = new Date(
        Date.now() + request.requested_duration_days * 24 * 60 * 60 * 1000
      );

      const book = mockDb.books.find(
        (b) => b._id.toString() === request.book_id
      );
      if (book) {
        book.availability_status = "borrowed";
      }
    } else {
      const book = mockDb.books.find(
        (b) => b._id.toString() === request.book_id
      );
      if (book) {
        book.availability_status = "available";
      }
    }

    res.json({
      message: `Borrow request ${action === "approve" ? "approved" : "rejected"} successfully`,
      status: request.status,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/library/stats", async (req, res) => {
  try {
    const { office_id } = req.query;

    if (!office_id) {
      return res
        .status(400)
        .json({ error: "office_id query parameter required" });
    }

    const officeBooks = mockDb.books.filter((b) => b.office_id === office_id);
    const officeRequests = mockDb.borrow_requests.filter(
      (r) => r.office_id === office_id
    );

    const stats = {
      library_stats: {
        total_books: officeBooks.length,
        available_books: officeBooks.filter(
          (b) => b.availability_status === "available"
        ).length,
        borrowed_books: officeBooks.filter(
          (b) => b.availability_status === "borrowed"
        ).length,
        reserved_books: officeBooks.filter(
          (b) => b.availability_status === "reserved"
        ).length,
        unique_authors: [...new Set(officeBooks.map((b) => b.author))].length,
        by_condition: {},
        popular_tags: [],
      },
      borrow_stats: {
        total_requests: officeRequests.length,
        pending_requests: officeRequests.filter((r) => r.status === "pending")
          .length,
        approved_requests: officeRequests.filter((r) => r.status === "approved")
          .length,
        completed_borrows: officeRequests.filter((r) => r.status === "returned")
          .length,
        completion_rate:
          officeRequests.length > 0
            ? (
                (officeRequests.filter((r) => r.status === "returned").length /
                  officeRequests.length) *
                100
              ).toFixed(1) + "%"
            : "0%",
      },
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

describe("Library Service", () => {
  beforeEach(() => {
    // Clear mock database before each test
    mockDb.books = [];
    mockDb.borrow_requests = [];
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body.status).toBe("healthy");
      expect(response.body.service).toBe("Library Service");
      expect(response.body.version).toBe("1.0.0");
    });
  });

  describe("Book Management", () => {
    describe("POST /api/books", () => {
      it("should add a new book successfully", async () => {
        const bookData = {
          title: "Clean Code",
          author: "Robert C. Martin",
          description: "A handbook of agile software craftsmanship",
          condition: "excellent",
          owner_id: "user123",
          office_id: "office_001",
        };

        const response = await request(app)
          .post("/api/books")
          .send(bookData)
          .expect(201);

        expect(response.body.message).toBe("Book added successfully");
        expect(response.body.book.title).toBe("Clean Code");
        expect(response.body.book.author).toBe("Robert C. Martin");
        expect(response.body.book.availability_status).toBe("available");
        expect(mockDb.books).toHaveLength(1);
      });

      it("should return error for missing required fields", async () => {
        const bookData = {
          title: "Clean Code",
          // missing author, owner_id, office_id
        };

        const response = await request(app)
          .post("/api/books")
          .send(bookData)
          .expect(400);

        expect(response.body.error).toBe(
          "title, author, owner_id, and office_id are required"
        );
      });
    });

    describe("GET /api/books", () => {
      beforeEach(() => {
        // Add test books
        mockDb.books.push(
          {
            _id: { toString: () => "book1" },
            title: "Clean Code",
            author: "Robert C. Martin",
            description: "A handbook of agile software craftsmanship",
            condition: "excellent",
            availability_status: "available",
            owner_id: "user123",
            office_id: "office_001",
            tags: ["programming", "software"],
            created_at: new Date(),
          },
          {
            _id: { toString: () => "book2" },
            title: "Effective Java",
            author: "Joshua Bloch",
            description: "Best practices for Java programming",
            condition: "good",
            availability_status: "borrowed",
            owner_id: "user456",
            office_id: "office_001",
            tags: ["java", "programming"],
            created_at: new Date(),
          }
        );
      });

      it("should get all books in office", async () => {
        const response = await request(app)
          .get("/api/books?office_id=office_001")
          .expect(200);

        expect(response.body.books).toHaveLength(2);
        expect(response.body.total_count).toBe(2);
        expect(response.body.books[0].title).toBe("Clean Code");
        expect(response.body.books[1].title).toBe("Effective Java");
      });

      it("should filter books by search term", async () => {
        const response = await request(app)
          .get("/api/books?office_id=office_001&search=java")
          .expect(200);

        expect(response.body.books).toHaveLength(1);
        expect(response.body.books[0].title).toBe("Effective Java");
      });

      it("should return error for missing office_id", async () => {
        const response = await request(app).get("/api/books").expect(400);

        expect(response.body.error).toBe("office_id query parameter required");
      });
    });
  });

  describe("ISBN Lookup", () => {
    describe("GET /api/isbn/:isbn", () => {
      it("should return book metadata for valid ISBN", async () => {
        const response = await request(app)
          .get("/api/isbn/9780134685991")
          .expect(200);

        expect(response.body.isbn).toBe("9780134685991");
        expect(response.body.metadata.title).toBe("Effective Java");
        expect(response.body.metadata.author).toBe("Joshua Bloch");
        expect(response.body.message).toBe(
          "Book metadata retrieved successfully"
        );
      });

      it("should return error for invalid ISBN format", async () => {
        const response = await request(app)
          .get("/api/isbn/invalid-isbn")
          .expect(400);

        expect(response.body.error).toBe(
          "Invalid ISBN format. Must be 10 or 13 digits."
        );
      });
    });
  });

  describe("Borrowing System", () => {
    beforeEach(() => {
      // Add test book
      mockDb.books.push({
        _id: { toString: () => "book1" },
        title: "Clean Code",
        author: "Robert C. Martin",
        condition: "excellent",
        availability_status: "available",
        owner_id: "user123",
        office_id: "office_001",
        created_at: new Date(),
      });
    });

    describe("POST /api/books/:book_id/borrow", () => {
      it("should create borrow request successfully", async () => {
        const borrowData = {
          borrower_id: "user456",
          office_id: "office_001",
          requested_duration_days: 14,
          notes: "Need this for a project",
        };

        const response = await request(app)
          .post("/api/books/book1/borrow")
          .send(borrowData)
          .expect(201);

        expect(response.body.message).toBe(
          "Borrow request created successfully"
        );
        expect(response.body.request_id).toBeDefined();
        expect(mockDb.borrow_requests).toHaveLength(1);
        expect(mockDb.books[0].availability_status).toBe("reserved");
      });

      it("should return error for missing required fields", async () => {
        const borrowData = {
          borrower_id: "user456",
          // missing office_id
        };

        const response = await request(app)
          .post("/api/books/book1/borrow")
          .send(borrowData)
          .expect(400);

        expect(response.body.error).toBe(
          "borrower_id and office_id are required"
        );
      });

      it("should return error for unavailable book", async () => {
        mockDb.books[0].availability_status = "borrowed";

        const borrowData = {
          borrower_id: "user456",
          office_id: "office_001",
        };

        const response = await request(app)
          .post("/api/books/book1/borrow")
          .send(borrowData)
          .expect(404);

        expect(response.body.error).toBe("Book not found or not available");
      });

      it("should return error for duplicate request", async () => {
        // Add existing request
        mockDb.borrow_requests.push({
          book_id: "book1",
          borrower_id: "user456",
          status: "pending",
        });

        const borrowData = {
          borrower_id: "user456",
          office_id: "office_001",
        };

        const response = await request(app)
          .post("/api/books/book1/borrow")
          .send(borrowData)
          .expect(400);

        expect(response.body.error).toBe(
          "You already have an active request for this book"
        );
      });
    });

    describe("PUT /api/borrow-requests/:request_id", () => {
      beforeEach(() => {
        // Add test borrow request
        mockDb.borrow_requests.push({
          _id: { toString: () => "request1" },
          book_id: "book1",
          borrower_id: "user456",
          owner_id: "user123",
          office_id: "office_001",
          requested_duration_days: 14,
          status: "pending",
          created_at: new Date(),
        });
      });

      it("should approve borrow request successfully", async () => {
        const approvalData = {
          action: "approve",
          owner_id: "user123",
          office_id: "office_001",
        };

        const response = await request(app)
          .put("/api/borrow-requests/request1")
          .send(approvalData)
          .expect(200);

        expect(response.body.message).toBe(
          "Borrow request approved successfully"
        );
        expect(response.body.status).toBe("approved");
        expect(mockDb.borrow_requests[0].status).toBe("approved");
        expect(mockDb.books[0].availability_status).toBe("borrowed");
      });

      it("should reject borrow request successfully", async () => {
        const rejectionData = {
          action: "reject",
          owner_id: "user123",
          office_id: "office_001",
        };

        const response = await request(app)
          .put("/api/borrow-requests/request1")
          .send(rejectionData)
          .expect(200);

        expect(response.body.message).toBe(
          "Borrow request rejected successfully"
        );
        expect(response.body.status).toBe("rejected");
        expect(mockDb.borrow_requests[0].status).toBe("rejected");
        expect(mockDb.books[0].availability_status).toBe("available");
      });

      it("should return error for invalid action", async () => {
        const invalidData = {
          action: "invalid",
          owner_id: "user123",
          office_id: "office_001",
        };

        const response = await request(app)
          .put("/api/borrow-requests/request1")
          .send(invalidData)
          .expect(400);

        expect(response.body.error).toBe(
          "action must be 'approve' or 'reject'"
        );
      });

      it("should return error for non-existent request", async () => {
        const approvalData = {
          action: "approve",
          owner_id: "user123",
          office_id: "office_001",
        };

        const response = await request(app)
          .put("/api/borrow-requests/nonexistent")
          .send(approvalData)
          .expect(404);

        expect(response.body.error).toBe(
          "Borrow request not found or already processed"
        );
      });
    });
  });

  describe("Library Statistics", () => {
    beforeEach(() => {
      // Add test data
      mockDb.books.push(
        {
          _id: { toString: () => "book1" },
          office_id: "office_001",
          availability_status: "available",
          author: "Author 1",
        },
        {
          _id: { toString: () => "book2" },
          office_id: "office_001",
          availability_status: "borrowed",
          author: "Author 2",
        }
      );

      mockDb.borrow_requests.push(
        {
          office_id: "office_001",
          status: "pending",
        },
        {
          office_id: "office_001",
          status: "returned",
        }
      );
    });

    describe("GET /api/library/stats", () => {
      it("should return library statistics", async () => {
        const response = await request(app)
          .get("/api/library/stats?office_id=office_001")
          .expect(200);

        expect(response.body.library_stats.total_books).toBe(2);
        expect(response.body.library_stats.available_books).toBe(1);
        expect(response.body.library_stats.borrowed_books).toBe(1);
        expect(response.body.borrow_stats.total_requests).toBe(2);
        expect(response.body.borrow_stats.pending_requests).toBe(1);
        expect(response.body.borrow_stats.completed_borrows).toBe(1);
        expect(response.body.borrow_stats.completion_rate).toBe("50.0%");
      });

      it("should return error for missing office_id", async () => {
        const response = await request(app)
          .get("/api/library/stats")
          .expect(400);

        expect(response.body.error).toBe("office_id query parameter required");
      });
    });
  });
});
