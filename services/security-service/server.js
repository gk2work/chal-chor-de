const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { MongoClient } = require("mongodb");
const Joi = require("joi");
const axios = require("axios");
const AuditLogger = require("./audit-logger");
const EncryptionService = require("./encryption-service");
const GDPRComplianceService = require("./gdpr-compliance");
const SecurityMonitor = require("./security-monitor");
require("dotenv").config();

const app = express();
const PORT = process.env.SECURITY_SERVICE_PORT || 3008;

// MongoDB connection
let db;
const mongoClient = new MongoClient(process.env.MONGODB_URI);

// Services
let auditLogger;
let encryptionService;
let gdprService;
let securityMonitor;

// Connect to MongoDB and initialize services
async function connectToDatabase() {
  try {
    await mongoClient.connect();
    db = mongoClient.db(process.env.MONGODB_DB_NAME || "officeshare_dev");

    // Initialize services
    auditLogger = new AuditLogger(
      process.env.MONGODB_URI,
      process.env.MONGODB_DB_NAME || "officeshare_dev"
    );
    encryptionService = new EncryptionService(
      process.env.ENCRYPTION_MASTER_KEY
    );
    gdprService = new GDPRComplianceService(db, encryptionService, auditLogger);
    securityMonitor = new SecurityMonitor(db, auditLogger);

    console.log("✅ Connected to MongoDB");
    console.log("✅ Security services initialized");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

// JWT middleware for authentication
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const response = await axios.post(
      `http://localhost:${process.env.USER_SERVICE_PORT || 3001}/api/users/verify-token`,
      { token: token }
    );

    if (response.data.valid) {
      req.user = response.data.user;
      next();
    } else {
      return res.status(403).json({ error: "Invalid token" });
    }
  } catch (error) {
    console.error("Token verification error:", error.message);
    return res.status(403).json({ error: "Token verification failed" });
  }
};

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "Security Service",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Audit Logging Endpoints

app.post(
  "/api/security/audit/authentication",
  authenticateToken,
  async (req, res) => {
    try {
      const { action, success, metadata } = req.body;

      const logEntry = auditLogger.logAuthentication(
        req.user.user_id,
        req.user.office_id,
        action,
        success,
        metadata
      );

      res.json({ success: true, log_entry: logEntry });
    } catch (error) {
      console.error("Audit logging error:", error);
      res.status(500).json({ error: "Failed to log audit event" });
    }
  }
);

app.post(
  "/api/security/audit/data-access",
  authenticateToken,
  async (req, res) => {
    try {
      const { resource, action, metadata } = req.body;

      const logEntry = auditLogger.logDataAccess(
        req.user.user_id,
        req.user.office_id,
        resource,
        action,
        metadata
      );

      res.json({ success: true, log_entry: logEntry });
    } catch (error) {
      console.error("Audit logging error:", error);
      res.status(500).json({ error: "Failed to log audit event" });
    }
  }
);

app.post(
  "/api/security/audit/security-event",
  authenticateToken,
  async (req, res) => {
    try {
      const { event_type, severity, details } = req.body;

      const logEntry = auditLogger.logSecurityEvent(
        req.user.user_id,
        req.user.office_id,
        event_type,
        severity,
        details
      );

      res.json({ success: true, log_entry: logEntry });
    } catch (error) {
      console.error("Audit logging error:", error);
      res.status(500).json({ error: "Failed to log security event" });
    }
  }
);

// Encryption Endpoints

app.post("/api/security/encrypt", authenticateToken, async (req, res) => {
  try {
    const { data, additional_data } = req.body;

    const encrypted = encryptionService.encrypt(data, additional_data);

    res.json({ encrypted: encrypted });
  } catch (error) {
    console.error("Encryption error:", error);
    res.status(500).json({ error: "Failed to encrypt data" });
  }
});

app.post("/api/security/decrypt", authenticateToken, async (req, res) => {
  try {
    const { encrypted_data, additional_data } = req.body;

    const decrypted = encryptionService.decrypt(
      encrypted_data,
      additional_data
    );

    res.json({ decrypted: decrypted });
  } catch (error) {
    console.error("Decryption error:", error);
    res.status(500).json({ error: "Failed to decrypt data" });
  }
});

// GDPR Compliance Endpoints

app.get(
  "/api/security/gdpr/export-data",
  authenticateToken,
  async (req, res) => {
    try {
      const exportData = await gdprService.exportUserData(
        req.user.user_id,
        req.user.office_id
      );

      res.json(exportData);
    } catch (error) {
      console.error("Data export error:", error);
      res.status(500).json({ error: "Failed to export user data" });
    }
  }
);

app.post(
  "/api/security/gdpr/delete-data",
  authenticateToken,
  async (req, res) => {
    try {
      const { reason } = req.body;

      const result = await gdprService.deleteUserData(
        req.user.user_id,
        req.user.office_id,
        reason
      );

      res.json(result);
    } catch (error) {
      console.error("Data deletion error:", error);
      res.status(500).json({ error: "Failed to delete user data" });
    }
  }
);

app.post("/api/security/gdpr/consent", authenticateToken, async (req, res) => {
  try {
    const { consent_type, granted, metadata } = req.body;

    const consent = await gdprService.recordConsent(
      req.user.user_id,
      req.user.office_id,
      consent_type,
      granted,
      metadata
    );

    res.json({ success: true, consent: consent });
  } catch (error) {
    console.error("Consent recording error:", error);
    res.status(500).json({ error: "Failed to record consent" });
  }
});

app.get(
  "/api/security/gdpr/consent/:consent_type",
  authenticateToken,
  async (req, res) => {
    try {
      const { consent_type } = req.params;

      const consent = await gdprService.verifyConsent(
        req.user.user_id,
        req.user.office_id,
        consent_type
      );

      res.json(consent);
    } catch (error) {
      console.error("Consent verification error:", error);
      res.status(500).json({ error: "Failed to verify consent" });
    }
  }
);

// Security Monitoring Endpoints

app.post("/api/security/monitor/failed-login", async (req, res) => {
  try {
    const { user_id, office_id, ip_address } = req.body;

    const result = await securityMonitor.monitorFailedLogins(
      user_id,
      office_id,
      ip_address
    );

    res.json(result);
  } catch (error) {
    console.error("Failed login monitoring error:", error);
    res.status(500).json({ error: "Failed to monitor login attempts" });
  }
});

app.post(
  "/api/security/monitor/rate-limit",
  authenticateToken,
  async (req, res) => {
    try {
      const { endpoint } = req.body;

      const result = await securityMonitor.monitorAPIRateLimit(
        req.user.user_id,
        req.user.office_id,
        endpoint
      );

      res.json(result);
    } catch (error) {
      console.error("Rate limit monitoring error:", error);
      res.status(500).json({ error: "Failed to monitor rate limit" });
    }
  }
);

app.get("/api/security/monitor/alerts", authenticateToken, async (req, res) => {
  try {
    const { severity } = req.query;

    const alerts = await securityMonitor.getActiveAlerts(
      req.user.office_id,
      severity
    );

    res.json({ alerts: alerts, count: alerts.length });
  } catch (error) {
    console.error("Get alerts error:", error);
    res.status(500).json({ error: "Failed to get alerts" });
  }
});

app.post(
  "/api/security/monitor/acknowledge-alert",
  authenticateToken,
  async (req, res) => {
    try {
      const { alert_id } = req.body;

      await securityMonitor.acknowledgeAlert(alert_id, req.user.user_id);

      res.json({ success: true });
    } catch (error) {
      console.error("Acknowledge alert error:", error);
      res.status(500).json({ error: "Failed to acknowledge alert" });
    }
  }
);

app.get("/api/security/monitor/report", authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const report = await securityMonitor.generateSecurityReport(
      req.user.office_id,
      new Date(start_date),
      new Date(end_date)
    );

    res.json(report);
  } catch (error) {
    console.error("Security report error:", error);
    res.status(500).json({ error: "Failed to generate security report" });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Security Service Error:", err);
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
    console.log(`🚀 Security Service running on http://localhost:${PORT}`);
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

startServer().catch(console.error);
