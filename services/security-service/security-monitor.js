/**
 * Security Monitoring and Alerting Service
 * Detects and responds to security threats in real-time
 */

class SecurityMonitor {
  constructor(db, auditLogger) {
    this.db = db;
    this.auditLogger = auditLogger;
    this.alertThresholds = {
      failed_login_attempts: 5,
      rapid_api_calls: 100,
      suspicious_data_access: 50,
      time_window: 300000, // 5 minutes
    };
    this.activeAlerts = new Map();
  }

  /**
   * Monitor failed login attempts
   */
  async monitorFailedLogins(userId, officeId, ipAddress) {
    const key = `failed_login_${userId}_${ipAddress}`;
    const timeWindow = Date.now() - this.alertThresholds.time_window;

    // Count recent failed attempts
    const failedAttempts = await this.db
      .collection("audit_logs")
      .countDocuments({
        category: "AUTHENTICATION",
        user_id: userId,
        success: false,
        "metadata.ip_address": ipAddress,
        timestamp: { $gte: new Date(timeWindow) },
      });

    if (failedAttempts >= this.alertThresholds.failed_login_attempts) {
      await this.triggerAlert({
        type: "BRUTE_FORCE_ATTEMPT",
        severity: "HIGH",
        user_id: userId,
        office_id: officeId,
        ip_address: ipAddress,
        details: {
          failed_attempts: failedAttempts,
          time_window: this.alertThresholds.time_window / 1000,
        },
        recommended_action: "BLOCK_IP_TEMPORARY",
      });

      return {
        blocked: true,
        reason: "Too many failed login attempts",
        retry_after: 900, // 15 minutes
      };
    }

    return { blocked: false };
  }

  /**
   * Monitor API rate limiting
   */
  async monitorAPIRateLimit(userId, officeId, endpoint) {
    const key = `api_rate_${userId}_${endpoint}`;
    const timeWindow = Date.now() - this.alertThresholds.time_window;

    // Count recent API calls
    const apiCalls = await this.db.collection("audit_logs").countDocuments({
      category: "DATA_ACCESS",
      user_id: userId,
      "metadata.endpoint": endpoint,
      timestamp: { $gte: new Date(timeWindow) },
    });

    if (apiCalls >= this.alertThresholds.rapid_api_calls) {
      await this.triggerAlert({
        type: "RATE_LIMIT_EXCEEDED",
        severity: "MEDIUM",
        user_id: userId,
        office_id: officeId,
        details: {
          api_calls: apiCalls,
          endpoint: endpoint,
          time_window: this.alertThresholds.time_window / 1000,
        },
        recommended_action: "THROTTLE_USER",
      });

      return {
        rate_limited: true,
        reason: "API rate limit exceeded",
        retry_after: 60,
      };
    }

    return { rate_limited: false };
  }

  /**
   * Monitor suspicious data access patterns
   */
  async monitorDataAccessPatterns(userId, officeId) {
    const timeWindow = Date.now() - this.alertThresholds.time_window;

    // Check for unusual data access
    const dataAccess = await this.db
      .collection("audit_logs")
      .find({
        category: "DATA_ACCESS",
        user_id: userId,
        office_id: officeId,
        timestamp: { $gte: new Date(timeWindow) },
      })
      .toArray();

    const suspiciousPatterns = this.detectSuspiciousPatterns(dataAccess);

    if (suspiciousPatterns.length > 0) {
      await this.triggerAlert({
        type: "SUSPICIOUS_DATA_ACCESS",
        severity: "HIGH",
        user_id: userId,
        office_id: officeId,
        details: {
          patterns: suspiciousPatterns,
          access_count: dataAccess.length,
        },
        recommended_action: "REVIEW_USER_ACTIVITY",
      });

      return {
        suspicious: true,
        patterns: suspiciousPatterns,
      };
    }

    return { suspicious: false };
  }

  /**
   * Monitor unauthorized access attempts
   */
  async monitorUnauthorizedAccess(userId, officeId, resource) {
    await this.auditLogger.logSecurityEvent(
      userId,
      officeId,
      "UNAUTHORIZED_ACCESS_ATTEMPT",
      "WARNING",
      {
        resource_type: resource.type,
        resource_id: resource.id,
      }
    );

    // Check for repeated unauthorized attempts
    const timeWindow = Date.now() - this.alertThresholds.time_window;
    const unauthorizedAttempts = await this.db
      .collection("audit_logs")
      .countDocuments({
        category: "SECURITY",
        event_type: "UNAUTHORIZED_ACCESS_ATTEMPT",
        user_id: userId,
        timestamp: { $gte: new Date(timeWindow) },
      });

    if (unauthorizedAttempts >= 3) {
      await this.triggerAlert({
        type: "REPEATED_UNAUTHORIZED_ACCESS",
        severity: "CRITICAL",
        user_id: userId,
        office_id: officeId,
        details: {
          attempts: unauthorizedAttempts,
          resource: resource,
        },
        recommended_action: "SUSPEND_USER_ACCOUNT",
      });
    }
  }

  /**
   * Monitor data exfiltration attempts
   */
  async monitorDataExfiltration(userId, officeId, dataVolume) {
    const timeWindow = Date.now() - 3600000; // 1 hour

    // Track data export volume
    const recentExports = await this.db
      .collection("audit_logs")
      .find({
        category: "DATA_ACCESS",
        action: "EXPORT",
        user_id: userId,
        timestamp: { $gte: new Date(timeWindow) },
      })
      .toArray();

    const totalVolume = recentExports.reduce(
      (sum, exp) => sum + (exp.metadata?.data_size || 0),
      0
    );

    // Alert if unusual volume
    if (totalVolume > 100 * 1024 * 1024) {
      // 100MB
      await this.triggerAlert({
        type: "POTENTIAL_DATA_EXFILTRATION",
        severity: "CRITICAL",
        user_id: userId,
        office_id: officeId,
        details: {
          total_volume_mb: totalVolume / (1024 * 1024),
          export_count: recentExports.length,
        },
        recommended_action: "IMMEDIATE_INVESTIGATION",
      });
    }
  }

  /**
   * Monitor privilege escalation attempts
   */
  async monitorPrivilegeEscalation(userId, officeId, attemptedAction) {
    await this.auditLogger.logSecurityEvent(
      userId,
      officeId,
      "PRIVILEGE_ESCALATION_ATTEMPT",
      "CRITICAL",
      {
        attempted_action: attemptedAction,
      }
    );

    await this.triggerAlert({
      type: "PRIVILEGE_ESCALATION",
      severity: "CRITICAL",
      user_id: userId,
      office_id: officeId,
      details: {
        attempted_action: attemptedAction,
      },
      recommended_action: "IMMEDIATE_ACCOUNT_SUSPENSION",
    });
  }

  /**
   * Monitor SQL injection attempts
   */
  async monitorSQLInjection(userId, officeId, input, endpoint) {
    const sqlPatterns = [
      /(\bOR\b|\bAND\b).*=.*\d+/i,
      /UNION.*SELECT/i,
      /DROP.*TABLE/i,
      /INSERT.*INTO/i,
      /DELETE.*FROM/i,
      /--/,
      /;.*--/,
      /\/\*.*\*\//,
    ];

    const isSuspicious = sqlPatterns.some((pattern) => pattern.test(input));

    if (isSuspicious) {
      await this.auditLogger.logSecurityEvent(
        userId,
        officeId,
        "SQL_INJECTION_ATTEMPT",
        "CRITICAL",
        {
          endpoint: endpoint,
          input_sample: input.substring(0, 100),
        }
      );

      await this.triggerAlert({
        type: "SQL_INJECTION_ATTEMPT",
        severity: "CRITICAL",
        user_id: userId,
        office_id: officeId,
        details: {
          endpoint: endpoint,
        },
        recommended_action: "BLOCK_REQUEST_AND_INVESTIGATE",
      });

      return { blocked: true, reason: "Suspicious input detected" };
    }

    return { blocked: false };
  }

  /**
   * Monitor XSS attempts
   */
  async monitorXSSAttempts(userId, officeId, input, endpoint) {
    const xssPatterns = [
      /<script[^>]*>.*<\/script>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
    ];

    const isSuspicious = xssPatterns.some((pattern) => pattern.test(input));

    if (isSuspicious) {
      await this.auditLogger.logSecurityEvent(
        userId,
        officeId,
        "XSS_ATTEMPT",
        "HIGH",
        {
          endpoint: endpoint,
          input_sample: input.substring(0, 100),
        }
      );

      await this.triggerAlert({
        type: "XSS_ATTEMPT",
        severity: "HIGH",
        user_id: userId,
        office_id: officeId,
        details: {
          endpoint: endpoint,
        },
        recommended_action: "SANITIZE_AND_BLOCK",
      });

      return { blocked: true, reason: "Suspicious input detected" };
    }

    return { blocked: false };
  }

  /**
   * Detect suspicious patterns in data access
   */
  detectSuspiciousPatterns(accessLogs) {
    const patterns = [];

    // Pattern 1: Accessing many different user profiles
    const uniqueUsers = new Set(
      accessLogs
        .filter((log) => log.metadata?.resource_type === "USER_PROFILE")
        .map((log) => log.metadata?.resource_id)
    );

    if (uniqueUsers.size > 20) {
      patterns.push({
        type: "MASS_PROFILE_ACCESS",
        count: uniqueUsers.size,
        severity: "HIGH",
      });
    }

    // Pattern 2: Rapid sequential access
    const timestamps = accessLogs.map((log) => log.timestamp.getTime());
    const avgInterval =
      timestamps.length > 1
        ? (timestamps[timestamps.length - 1] - timestamps[0]) /
          (timestamps.length - 1)
        : 0;

    if (avgInterval < 100 && timestamps.length > 10) {
      // Less than 100ms between requests
      patterns.push({
        type: "AUTOMATED_SCRAPING",
        avg_interval_ms: avgInterval,
        severity: "MEDIUM",
      });
    }

    // Pattern 3: Accessing data outside normal hours
    const outsideHours = accessLogs.filter((log) => {
      const hour = log.timestamp.getHours();
      return hour < 6 || hour > 22; // Outside 6 AM - 10 PM
    });

    if (outsideHours.length > 10) {
      patterns.push({
        type: "OFF_HOURS_ACCESS",
        count: outsideHours.length,
        severity: "MEDIUM",
      });
    }

    return patterns;
  }

  /**
   * Trigger security alert
   */
  async triggerAlert(alert) {
    const alertId = `${alert.type}_${alert.user_id}_${Date.now()}`;

    // Store alert
    await this.db.collection("security_alerts").insertOne({
      alert_id: alertId,
      ...alert,
      status: "ACTIVE",
      created_at: new Date(),
      acknowledged: false,
    });

    // Log to audit
    this.auditLogger.logSecurityEvent(
      alert.user_id,
      alert.office_id,
      alert.type,
      alert.severity,
      alert.details
    );

    // Send notifications (would integrate with notification service)
    await this.sendAlertNotification(alert);

    // Store in active alerts
    this.activeAlerts.set(alertId, alert);

    return alertId;
  }

  /**
   * Send alert notification
   */
  async sendAlertNotification(alert) {
    // This would integrate with the notification service
    console.log(
      `🚨 SECURITY ALERT: ${alert.type} - Severity: ${alert.severity}`
    );
    console.log(`User: ${alert.user_id}, Office: ${alert.office_id}`);
    console.log(`Recommended Action: ${alert.recommended_action}`);
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId, acknowledgedBy) {
    await this.db.collection("security_alerts").updateOne(
      { alert_id: alertId },
      {
        $set: {
          acknowledged: true,
          acknowledged_by: acknowledgedBy,
          acknowledged_at: new Date(),
        },
      }
    );

    this.activeAlerts.delete(alertId);
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(officeId, severity = null) {
    const query = {
      office_id: officeId,
      status: "ACTIVE",
      acknowledged: false,
    };

    if (severity) {
      query.severity = severity;
    }

    return await this.db
      .collection("security_alerts")
      .find(query)
      .sort({ created_at: -1 })
      .toArray();
  }

  /**
   * Generate security report
   */
  async generateSecurityReport(officeId, startDate, endDate) {
    const alerts = await this.db
      .collection("security_alerts")
      .find({
        office_id: officeId,
        created_at: { $gte: startDate, $lte: endDate },
      })
      .toArray();

    const securityEvents = await this.db
      .collection("audit_logs")
      .find({
        category: "SECURITY",
        office_id: officeId,
        timestamp: { $gte: startDate, $lte: endDate },
      })
      .toArray();

    return {
      period: {
        start: startDate,
        end: endDate,
      },
      summary: {
        total_alerts: alerts.length,
        critical_alerts: alerts.filter((a) => a.severity === "CRITICAL").length,
        high_alerts: alerts.filter((a) => a.severity === "HIGH").length,
        total_security_events: securityEvents.length,
      },
      alerts_by_type: this.groupByType(alerts),
      top_affected_users: this.getTopAffectedUsers(alerts),
      recommendations: this.generateRecommendations(alerts),
    };
  }

  groupByType(alerts) {
    const grouped = {};
    alerts.forEach((alert) => {
      grouped[alert.type] = (grouped[alert.type] || 0) + 1;
    });
    return grouped;
  }

  getTopAffectedUsers(alerts) {
    const userCounts = {};
    alerts.forEach((alert) => {
      userCounts[alert.user_id] = (userCounts[alert.user_id] || 0) + 1;
    });

    return Object.entries(userCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([user_id, count]) => ({ user_id, alert_count: count }));
  }

  generateRecommendations(alerts) {
    const recommendations = [];

    const criticalCount = alerts.filter(
      (a) => a.severity === "CRITICAL"
    ).length;
    if (criticalCount > 5) {
      recommendations.push({
        priority: "HIGH",
        recommendation: "Conduct immediate security audit",
        reason: `${criticalCount} critical alerts detected`,
      });
    }

    const bruteForceAttempts = alerts.filter(
      (a) => a.type === "BRUTE_FORCE_ATTEMPT"
    ).length;
    if (bruteForceAttempts > 3) {
      recommendations.push({
        priority: "MEDIUM",
        recommendation: "Implement IP-based blocking",
        reason: `${bruteForceAttempts} brute force attempts detected`,
      });
    }

    return recommendations;
  }
}

module.exports = SecurityMonitor;
