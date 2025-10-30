const request = require("supertest");
const { MongoClient } = require("mongodb");
const AuditLogger = require("../audit-logger");
const EncryptionService = require("../encryption-service");
const GDPRComplianceService = require("../gdpr-compliance");
const SecurityMonitor = require("../security-monitor");

describe("Security Service Integration Tests", () => {
  let db;
  let mongoClient;
  let auditLogger;
  let encryptionService;
  let gdprService;
  let securityMonitor;

  beforeAll(async () => {
    // Connect to test database
    mongoClient = new MongoClient(
      process.env.MONGODB_URI || "mongodb://localhost:27017"
    );
    await mongoClient.connect();
    db = mongoClient.db("officeshare_test");

    // Initialize services
    auditLogger = new AuditLogger(
      process.env.MONGODB_URI || "mongodb://localhost:27017",
      "officeshare_test"
    );
    encryptionService = new EncryptionService("test-master-key-32-characters!");
    gdprService = new GDPRComplianceService(db, encryptionService, auditLogger);
    securityMonitor = new SecurityMonitor(db, auditLogger);
  });

  afterAll(async () => {
    // Cleanup
    await db.dropDatabase();
    await mongoClient.close();
  });

  describe("Audit Logging", () => {
    it("should log authentication events", () => {
      const logEntry = auditLogger.logAuthentication(
        "user_123",
        "office_001",
        "LOGIN",
        true,
        {
          ip_address: "192.168.1.1",
          user_agent: "Mozilla/5.0",
        }
      );

      expect(logEntry).toBeDefined();
      expect(logEntry.category).toBe("AUTHENTICATION");
      expect(logEntry.success).toBe(true);
    });

    it("should log data access events", () => {
      const logEntry = auditLogger.logDataAccess(
        "user_123",
        "office_001",
        { type: "USER_PROFILE", id: "user_456" },
        "READ"
      );

      expect(logEntry).toBeDefined();
      expect(logEntry.category).toBe("DATA_ACCESS");
    });

    it("should log security events", () => {
      const logEntry = auditLogger.logSecurityEvent(
        "user_123",
        "office_001",
        "UNAUTHORIZED_ACCESS",
        "HIGH",
        { resource: "admin_panel" }
      );

      expect(logEntry).toBeDefined();
      expect(logEntry.severity).toBe("HIGH");
    });
  });

  describe("Encryption", () => {
    it("should encrypt and decrypt data correctly", () => {
      const plaintext = "sensitive information";
      const encrypted = encryptionService.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);

      const decrypted = encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("should encrypt with additional authenticated data", () => {
      const plaintext = "secret data";
      const aad = "context";

      const encrypted = encryptionService.encrypt(plaintext, aad);
      const decrypted = encryptionService.decrypt(encrypted, aad);

      expect(decrypted).toBe(plaintext);
    });

    it("should fail decryption with wrong AAD", () => {
      const plaintext = "secret data";
      const encrypted = encryptionService.encrypt(plaintext, "context1");

      expect(() => {
        encryptionService.decrypt(encrypted, "context2");
      }).toThrow();
    });

    it("should hash and verify data", () => {
      const data = "password123";
      const { hash, salt } = encryptionService.hash(data);

      expect(hash).toBeDefined();
      expect(salt).toBeDefined();

      const isValid = encryptionService.verifyHash(data, hash, salt);
      expect(isValid).toBe(true);

      const isInvalid = encryptionService.verifyHash("wrong", hash, salt);
      expect(isInvalid).toBe(false);
    });

    it("should encrypt and decrypt object fields", () => {
      const obj = {
        name: "John Doe",
        email: "john@example.com",
        ssn: "123-45-6789",
      };

      const encrypted = encryptionService.encryptObject(obj, ["email", "ssn"]);

      expect(encrypted.name).toBe("John Doe");
      expect(encrypted.email).not.toBe("john@example.com");
      expect(encrypted.ssn).not.toBe("123-45-6789");

      const decrypted = encryptionService.decryptObject(encrypted, [
        "email",
        "ssn",
      ]);

      expect(decrypted.email).toBe("john@example.com");
      expect(decrypted.ssn).toBe("123-45-6789");
    });
  });

  describe("GDPR Compliance", () => {
    beforeEach(async () => {
      // Setup test data
      await db.collection("users").insertOne({
        user_id: "test_user_123",
        office_id: "office_001",
        email: "test@example.com",
        full_name: "Test User",
      });

      await db.collection("carpool_trips").insertOne({
        trip_id: "trip_123",
        office_id: "office_001",
        user_id: "test_user_123",
        status: "completed",
      });
    });

    afterEach(async () => {
      // Cleanup test data
      await db.collection("users").deleteMany({ user_id: "test_user_123" });
      await db
        .collection("carpool_trips")
        .deleteMany({ user_id: "test_user_123" });
      await db
        .collection("consent_records")
        .deleteMany({ user_id: "test_user_123" });
    });

    it("should export user data (Right to Access)", async () => {
      const exportData = await gdprService.exportUserData(
        "test_user_123",
        "office_001"
      );

      expect(exportData).toBeDefined();
      expect(exportData.user_id).toBe("test_user_123");
      expect(exportData.data.user_profile).toBeDefined();
      expect(exportData.data.carpool_trips).toBeDefined();
    });

    it("should delete user data (Right to be Forgotten)", async () => {
      const result = await gdprService.deleteUserData(
        "test_user_123",
        "office_001",
        "USER_REQUEST"
      );

      expect(result).toBeDefined();
      expect(result.status).toBe("COMPLETED");

      // Verify user is anonymized
      const user = await db
        .collection("users")
        .findOne({ user_id: "test_user_123" });
      expect(user.status).toBe("DELETED");
    });

    it("should record and verify consent", async () => {
      const consent = await gdprService.recordConsent(
        "test_user_123",
        "office_001",
        "DATA_PROCESSING",
        true,
        { ip_address: "192.168.1.1" }
      );

      expect(consent).toBeDefined();
      expect(consent.granted).toBe(true);

      const verification = await gdprService.verifyConsent(
        "test_user_123",
        "office_001",
        "DATA_PROCESSING"
      );

      expect(verification.has_consent).toBe(true);
    });
  });

  describe("Security Monitoring", () => {
    it("should detect brute force attempts", async () => {
      // Simulate multiple failed logins
      for (let i = 0; i < 6; i++) {
        await auditLogger.logAuthentication(
          "user_123",
          "office_001",
          "LOGIN",
          false,
          { ip_address: "192.168.1.100" }
        );
      }

      const result = await securityMonitor.monitorFailedLogins(
        "user_123",
        "office_001",
        "192.168.1.100"
      );

      expect(result.blocked).toBe(true);
    });

    it("should detect rate limit violations", async () => {
      // Simulate many API calls
      for (let i = 0; i < 101; i++) {
        await auditLogger.logDataAccess(
          "user_123",
          "office_001",
          { type: "API", id: "/api/test" },
          "READ",
          { endpoint: "/api/test" }
        );
      }

      const result = await securityMonitor.monitorAPIRateLimit(
        "user_123",
        "office_001",
        "/api/test"
      );

      expect(result.rate_limited).toBe(true);
    });

    it("should create and retrieve security alerts", async () => {
      const alertId = await securityMonitor.triggerAlert({
        type: "TEST_ALERT",
        severity: "HIGH",
        user_id: "user_123",
        office_id: "office_001",
        details: { test: true },
        recommended_action: "INVESTIGATE",
      });

      expect(alertId).toBeDefined();

      const alerts = await securityMonitor.getActiveAlerts("office_001");
      expect(alerts.length).toBeGreaterThan(0);
    });

    it("should generate security report", async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const report = await securityMonitor.generateSecurityReport(
        "office_001",
        startDate,
        endDate
      );

      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });
  });

  describe("End-to-End Security Flow", () => {
    it("should handle complete user data lifecycle", async () => {
      const userId = "e2e_user_123";
      const officeId = "office_001";

      // 1. Create user
      await db.collection("users").insertOne({
        user_id: userId,
        office_id: officeId,
        email: "e2e@example.com",
        full_name: "E2E Test User",
      });

      // 2. Record consent
      await gdprService.recordConsent(
        userId,
        officeId,
        "DATA_PROCESSING",
        true
      );

      // 3. Log some activity
      auditLogger.logDataAccess(
        userId,
        officeId,
        { type: "USER_PROFILE", id: userId },
        "READ"
      );

      // 4. Export data
      const exportData = await gdprService.exportUserData(userId, officeId);
      expect(exportData.data.user_profile).toBeDefined();

      // 5. Delete data
      const deleteResult = await gdprService.deleteUserData(
        userId,
        officeId,
        "USER_REQUEST"
      );
      expect(deleteResult.status).toBe("COMPLETED");

      // Cleanup
      await db.collection("users").deleteMany({ user_id: userId });
      await db.collection("consent_records").deleteMany({ user_id: userId });
    });
  });
});
