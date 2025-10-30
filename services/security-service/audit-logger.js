const winston = require("winston");
require("winston-mongodb");
const crypto = require("crypto");

/**
 * Advanced Audit Logging Service
 * Provides comprehensive audit trail for all platform activities
 */

class AuditLogger {
  constructor(mongoUri, dbName) {
    this.logger = winston.createLogger({
      level: "info",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
        // MongoDB transport for persistent audit logs
        new winston.transports.MongoDB({
          db: mongoUri,
          collection: "audit_logs",
          options: { useUnifiedTopology: true },
          metaKey: "metadata",
        }),
      ],
    });
  }

  /**
   * Log authentication events
   */
  logAuthentication(userId, officeId, action, success, metadata = {}) {
    const logEntry = {
      category: "AUTHENTICATION",
      action: action,
      user_id: userId,
      office_id: officeId,
      success: success,
      ip_address: metadata.ip_address,
      user_agent: metadata.user_agent,
      session_id: metadata.session_id,
      timestamp: new Date(),
      severity: success ? "INFO" : "WARNING",
    };

    this.logger.info("Authentication Event", { metadata: logEntry });
    return logEntry;
  }

  /**
   * Log data access events
   */
  logDataAccess(userId, officeId, resource, action, metadata = {}) {
    const logEntry = {
      category: "DATA_ACCESS",
      action: action,
      user_id: userId,
      office_id: officeId,
      resource_type: resource.type,
      resource_id: resource.id,
      data_classification: metadata.classification || "INTERNAL",
      access_granted: metadata.granted !== false,
      timestamp: new Date(),
      severity: "INFO",
    };

    this.logger.info("Data Access Event", { metadata: logEntry });
    return logEntry;
  }

  /**
   * Log data modification events
   */
  logDataModification(userId, officeId, resource, action, changes = {}) {
    const logEntry = {
      category: "DATA_MODIFICATION",
      action: action,
      user_id: userId,
      office_id: officeId,
      resource_type: resource.type,
      resource_id: resource.id,
      changes: this.sanitizeChanges(changes),
      timestamp: new Date(),
      severity: "INFO",
    };

    this.logger.info("Data Modification Event", { metadata: logEntry });
    return logEntry;
  }

  /**
   * Log security events
   */
  logSecurityEvent(userId, officeId, eventType, severity, details = {}) {
    const logEntry = {
      category: "SECURITY",
      event_type: eventType,
      user_id: userId,
      office_id: officeId,
      severity: severity,
      details: details,
      timestamp: new Date(),
      requires_review: severity === "CRITICAL" || severity === "HIGH",
    };

    if (severity === "CRITICAL" || severity === "HIGH") {
      this.logger.error("Security Event", { metadata: logEntry });
    } else {
      this.logger.warn("Security Event", { metadata: logEntry });
    }

    return logEntry;
  }

  /**
   * Log privacy-related events (GDPR compliance)
   */
  logPrivacyEvent(userId, officeId, action, dataType, metadata = {}) {
    const logEntry = {
      category: "PRIVACY",
      action: action,
      user_id: userId,
      office_id: officeId,
      data_type: dataType,
      legal_basis: metadata.legal_basis || "LEGITIMATE_INTEREST",
      consent_id: metadata.consent_id,
      timestamp: new Date(),
      severity: "INFO",
    };

    this.logger.info("Privacy Event", { metadata: logEntry });
    return logEntry;
  }

  /**
   * Log administrative actions
   */
  logAdminAction(adminId, officeId, action, targetUser, details = {}) {
    const logEntry = {
      category: "ADMIN_ACTION",
      action: action,
      admin_id: adminId,
      office_id: officeId,
      target_user_id: targetUser,
      details: details,
      timestamp: new Date(),
      severity: "WARNING",
      requires_review: true,
    };

    this.logger.warn("Admin Action", { metadata: logEntry });
    return logEntry;
  }

  /**
   * Log transaction events
   */
  logTransaction(
    userId,
    officeId,
    transactionType,
    transactionId,
    metadata = {}
  ) {
    const logEntry = {
      category: "TRANSACTION",
      transaction_type: transactionType,
      transaction_id: transactionId,
      user_id: userId,
      office_id: officeId,
      amount: metadata.amount,
      status: metadata.status,
      timestamp: new Date(),
      severity: "INFO",
    };

    this.logger.info("Transaction Event", { metadata: logEntry });
    return logEntry;
  }

  /**
   * Log system events
   */
  logSystemEvent(eventType, severity, details = {}) {
    const logEntry = {
      category: "SYSTEM",
      event_type: eventType,
      severity: severity,
      details: details,
      timestamp: new Date(),
    };

    if (severity === "CRITICAL" || severity === "ERROR") {
      this.logger.error("System Event", { metadata: logEntry });
    } else {
      this.logger.info("System Event", { metadata: logEntry });
    }

    return logEntry;
  }

  /**
   * Sanitize sensitive data from changes object
   */
  sanitizeChanges(changes) {
    const sensitiveFields = [
      "password",
      "token",
      "secret",
      "api_key",
      "credit_card",
      "ssn",
    ];

    const sanitized = { ...changes };

    Object.keys(sanitized).forEach((key) => {
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
        sanitized[key] = "[REDACTED]";
      }
    });

    return sanitized;
  }

  /**
   * Generate audit report for a specific time period
   */
  async generateAuditReport(officeId, startDate, endDate, categories = []) {
    // This would query the MongoDB audit_logs collection
    // For now, return a structure that would be populated
    return {
      office_id: officeId,
      period: {
        start: startDate,
        end: endDate,
      },
      categories: categories,
      summary: {
        total_events: 0,
        by_category: {},
        by_severity: {},
        security_incidents: 0,
        privacy_events: 0,
      },
      events: [],
    };
  }

  /**
   * Check for suspicious activity patterns
   */
  async detectSuspiciousActivity(userId, officeId, timeWindow = 3600000) {
    // This would analyze recent audit logs for patterns
    // For now, return a structure
    return {
      user_id: userId,
      office_id: officeId,
      time_window: timeWindow,
      suspicious_patterns: [],
      risk_score: 0,
      recommendations: [],
    };
  }
}

module.exports = AuditLogger;
