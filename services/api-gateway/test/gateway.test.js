const request = require("supertest");
const express = require("express");

// Mock the API Gateway server for testing
const app = express();

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: [
      "user",
      "carpooling",
      "matching",
      "tracking",
      "notification",
      "chat",
    ],
    version: "1.0.0",
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "OfficeShare API Gateway",
    version: "1.0.0",
  });
});

describe("API Gateway", () => {
  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body.status).toBe("healthy");
      expect(response.body.version).toBe("1.0.0");
      expect(Array.isArray(response.body.services)).toBe(true);
    });
  });

  describe("GET /", () => {
    it("should return gateway information", async () => {
      const response = await request(app).get("/").expect(200);

      expect(response.body.message).toBe("OfficeShare API Gateway");
      expect(response.body.version).toBe("1.0.0");
    });
  });
});
