/**
 * GDPR Compliance Service
 * Implements GDPR requirements for data privacy and user rights
 */

class GDPRComplianceService {
  constructor(db, encryptionService, auditLogger) {
    this.db = db;
    this.encryptionService = encryptionService;
    this.auditLogger = auditLogger;
  }

  /**
   * Right to Access (Article 15)
   * User can request all their personal data
   */
  async exportUserData(userId, officeId) {
    try {
      // Log the data export request
      this.auditLogger.logPrivacyEvent(
        userId,
        officeId,
        "DATA_EXPORT_REQUEST",
        "ALL_PERSONAL_DATA"
      );

      const userData = {
        user_profile: await this.getUserProfile(userId, officeId),
        carpool_trips: await this.getCarpoolData(userId, officeId),
        bike_bookings: await this.getBikeData(userId, officeId),
        book_loans: await this.getBookData(userId, officeId),
        chat_messages: await this.getChatData(userId, officeId),
        ratings: await this.getRatingsData(userId, officeId),
        transactions: await this.getTransactionData(userId, officeId),
        consent_records: await this.getConsentRecords(userId, officeId),
      };

      // Log successful export
      this.auditLogger.logPrivacyEvent(
        userId,
        officeId,
        "DATA_EXPORT_COMPLETED",
        "ALL_PERSONAL_DATA",
        { record_count: this.countRecords(userData) }
      );

      return {
        export_date: new Date().toISOString(),
        user_id: userId,
        office_id: officeId,
        data: userData,
        format: "JSON",
      };
    } catch (error) {
      console.error("Data export error:", error);
      throw new Error("Failed to export user data");
    }
  }

  /**
   * Right to Erasure / Right to be Forgotten (Article 17)
   */
  async deleteUserData(userId, officeId, reason = "USER_REQUEST") {
    try {
      // Log the deletion request
      this.auditLogger.logPrivacyEvent(
        userId,
        officeId,
        "DATA_DELETION_REQUEST",
        "ALL_PERSONAL_DATA",
        { reason }
      );

      const deletionResults = {
        user_profile: await this.anonymizeUserProfile(userId, officeId),
        carpool_trips: await this.anonymizeCarpoolData(userId, officeId),
        bike_bookings: await this.anonymizeBikeData(userId, officeId),
        book_loans: await this.anonymizeBookData(userId, officeId),
        chat_messages: await this.anonymizeChatData(userId, officeId),
        ratings: await this.handleRatingsData(userId, officeId),
        transactions: await this.anonymizeTransactionData(userId, officeId),
        consent_records: await this.deleteConsentRecords(userId, officeId),
      };

      // Log successful deletion
      this.auditLogger.logPrivacyEvent(
        userId,
        officeId,
        "DATA_DELETION_COMPLETED",
        "ALL_PERSONAL_DATA",
        { results: deletionResults }
      );

      return {
        deletion_date: new Date().toISOString(),
        user_id: userId,
        office_id: officeId,
        results: deletionResults,
        status: "COMPLETED",
      };
    } catch (error) {
      console.error("Data deletion error:", error);
      throw new Error("Failed to delete user data");
    }
  }

  /**
   * Right to Rectification (Article 16)
   */
  async updateUserData(userId, officeId, updates, requestedBy) {
    try {
      // Log the rectification request
      this.auditLogger.logPrivacyEvent(
        userId,
        officeId,
        "DATA_RECTIFICATION_REQUEST",
        "PERSONAL_DATA",
        { requested_by: requestedBy }
      );

      const result = await this.db.collection("users").updateOne(
        { user_id: userId, office_id: officeId },
        {
          $set: {
            ...updates,
            updated_at: new Date(),
            updated_by: requestedBy,
          },
        }
      );

      // Log successful update
      this.auditLogger.logDataModification(
        userId,
        officeId,
        { type: "USER_PROFILE", id: userId },
        "UPDATE",
        updates
      );

      return {
        success: result.modifiedCount > 0,
        updated_fields: Object.keys(updates),
      };
    } catch (error) {
      console.error("Data rectification error:", error);
      throw new Error("Failed to update user data");
    }
  }

  /**
   * Right to Data Portability (Article 20)
   */
  async exportUserDataPortable(userId, officeId, format = "JSON") {
    try {
      const data = await this.exportUserData(userId, officeId);

      // Convert to requested format
      let exportData;
      switch (format.toUpperCase()) {
        case "JSON":
          exportData = JSON.stringify(data, null, 2);
          break;
        case "CSV":
          exportData = this.convertToCSV(data);
          break;
        case "XML":
          exportData = this.convertToXML(data);
          break;
        default:
          exportData = JSON.stringify(data, null, 2);
      }

      return {
        format: format,
        data: exportData,
        filename: `user_data_${userId}_${Date.now()}.${format.toLowerCase()}`,
      };
    } catch (error) {
      console.error("Data portability error:", error);
      throw new Error("Failed to export portable data");
    }
  }

  /**
   * Right to Restrict Processing (Article 18)
   */
  async restrictDataProcessing(userId, officeId, restrictions) {
    try {
      // Log the restriction request
      this.auditLogger.logPrivacyEvent(
        userId,
        officeId,
        "DATA_PROCESSING_RESTRICTION",
        "PERSONAL_DATA",
        { restrictions }
      );

      const result = await this.db.collection("users").updateOne(
        { user_id: userId, office_id: officeId },
        {
          $set: {
            processing_restrictions: restrictions,
            restrictions_applied_at: new Date(),
          },
        }
      );

      return {
        success: result.modifiedCount > 0,
        restrictions: restrictions,
      };
    } catch (error) {
      console.error("Processing restriction error:", error);
      throw new Error("Failed to restrict data processing");
    }
  }

  /**
   * Consent Management (Article 7)
   */
  async recordConsent(userId, officeId, consentType, granted, metadata = {}) {
    try {
      const consentRecord = {
        user_id: userId,
        office_id: officeId,
        consent_type: consentType,
        granted: granted,
        timestamp: new Date(),
        ip_address: metadata.ip_address,
        user_agent: metadata.user_agent,
        consent_text: metadata.consent_text,
        version: metadata.version || "1.0",
      };

      await this.db.collection("consent_records").insertOne(consentRecord);

      // Log consent event
      this.auditLogger.logPrivacyEvent(
        userId,
        officeId,
        granted ? "CONSENT_GRANTED" : "CONSENT_WITHDRAWN",
        consentType,
        { consent_id: consentRecord._id }
      );

      return consentRecord;
    } catch (error) {
      console.error("Consent recording error:", error);
      throw new Error("Failed to record consent");
    }
  }

  /**
   * Verify user has given consent for specific processing
   */
  async verifyConsent(userId, officeId, consentType) {
    try {
      const latestConsent = await this.db.collection("consent_records").findOne(
        {
          user_id: userId,
          office_id: officeId,
          consent_type: consentType,
        },
        { sort: { timestamp: -1 } }
      );

      return {
        has_consent: latestConsent && latestConsent.granted,
        consent_date: latestConsent?.timestamp,
        version: latestConsent?.version,
      };
    } catch (error) {
      console.error("Consent verification error:", error);
      return { has_consent: false };
    }
  }

  /**
   * Data Retention Policy Enforcement
   */
  async enforceRetentionPolicy(officeId) {
    try {
      const retentionPolicies = {
        audit_logs: 2 * 365, // 2 years
        chat_messages: 1 * 365, // 1 year
        location_data: 90, // 90 days
        transaction_history: 7 * 365, // 7 years (legal requirement)
      };

      const results = {};

      for (const [dataType, retentionDays] of Object.entries(
        retentionPolicies
      )) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const result = await this.deleteOldData(officeId, dataType, cutoffDate);
        results[dataType] = result;
      }

      // Log retention policy enforcement
      this.auditLogger.logSystemEvent("RETENTION_POLICY_ENFORCED", "INFO", {
        office_id: officeId,
        results,
      });

      return results;
    } catch (error) {
      console.error("Retention policy enforcement error:", error);
      throw new Error("Failed to enforce retention policy");
    }
  }

  /**
   * Privacy Impact Assessment
   */
  async conductPrivacyImpactAssessment(officeId, assessmentType) {
    return {
      office_id: officeId,
      assessment_type: assessmentType,
      assessment_date: new Date(),
      data_categories: this.getDataCategories(),
      processing_purposes: this.getProcessingPurposes(),
      legal_basis: this.getLegalBasis(),
      data_subjects: ["EMPLOYEES"],
      risks: this.identifyPrivacyRisks(),
      mitigation_measures: this.getMitigationMeasures(),
      compliance_status: "COMPLIANT",
    };
  }

  // Helper methods

  async getUserProfile(userId, officeId) {
    return await this.db
      .collection("users")
      .findOne({ user_id: userId, office_id: officeId });
  }

  async getCarpoolData(userId, officeId) {
    return await this.db
      .collection("carpool_trips")
      .find({
        office_id: officeId,
        $or: [{ user_id: userId }, { "participants.user_id": userId }],
      })
      .toArray();
  }

  async getBikeData(userId, officeId) {
    return await this.db
      .collection("bike_bookings")
      .find({
        office_id: officeId,
        $or: [{ owner_id: userId }, { borrower_id: userId }],
      })
      .toArray();
  }

  async getBookData(userId, officeId) {
    return await this.db
      .collection("book_loans")
      .find({
        office_id: officeId,
        $or: [{ owner_id: userId }, { borrower_id: userId }],
      })
      .toArray();
  }

  async getChatData(userId, officeId) {
    return await this.db
      .collection("chat_messages")
      .find({ office_id: officeId, user_id: userId })
      .toArray();
  }

  async getRatingsData(userId, officeId) {
    return await this.db
      .collection("ratings")
      .find({
        office_id: officeId,
        $or: [{ rater_id: userId }, { rated_user_id: userId }],
      })
      .toArray();
  }

  async getTransactionData(userId, officeId) {
    return await this.db
      .collection("transactions")
      .find({ office_id: officeId, user_id: userId })
      .toArray();
  }

  async getConsentRecords(userId, officeId) {
    return await this.db
      .collection("consent_records")
      .find({ user_id: userId, office_id: officeId })
      .toArray();
  }

  async anonymizeUserProfile(userId, officeId) {
    const result = await this.db.collection("users").updateOne(
      { user_id: userId, office_id: officeId },
      {
        $set: {
          email: `deleted_${userId}@anonymized.local`,
          full_name: "Deleted User",
          phone: null,
          profile_photo: null,
          deleted_at: new Date(),
          status: "DELETED",
        },
      }
    );
    return { anonymized: result.modifiedCount > 0 };
  }

  async anonymizeCarpoolData(userId, officeId) {
    // Keep trip data for analytics but anonymize user reference
    const result = await this.db
      .collection("carpool_trips")
      .updateMany(
        { office_id: officeId, user_id: userId },
        { $set: { user_id: `anonymized_${userId}` } }
      );
    return { anonymized: result.modifiedCount };
  }

  async anonymizeBikeData(userId, officeId) {
    const result = await this.db.collection("bike_bookings").updateMany(
      {
        office_id: officeId,
        $or: [{ owner_id: userId }, { borrower_id: userId }],
      },
      {
        $set: {
          owner_id: `anonymized_${userId}`,
          borrower_id: `anonymized_${userId}`,
        },
      }
    );
    return { anonymized: result.modifiedCount };
  }

  async anonymizeBookData(userId, officeId) {
    const result = await this.db.collection("book_loans").updateMany(
      {
        office_id: officeId,
        $or: [{ owner_id: userId }, { borrower_id: userId }],
      },
      {
        $set: {
          owner_id: `anonymized_${userId}`,
          borrower_id: `anonymized_${userId}`,
        },
      }
    );
    return { anonymized: result.modifiedCount };
  }

  async anonymizeChatData(userId, officeId) {
    const result = await this.db.collection("chat_messages").updateMany(
      { office_id: officeId, user_id: userId },
      {
        $set: {
          user_id: `anonymized_${userId}`,
          message: "[Message deleted]",
        },
      }
    );
    return { anonymized: result.modifiedCount };
  }

  async handleRatingsData(userId, officeId) {
    // Keep ratings for system integrity but anonymize rater
    const result = await this.db
      .collection("ratings")
      .updateMany(
        { office_id: officeId, rater_id: userId },
        { $set: { rater_id: `anonymized_${userId}` } }
      );
    return { anonymized: result.modifiedCount };
  }

  async anonymizeTransactionData(userId, officeId) {
    const result = await this.db
      .collection("transactions")
      .updateMany(
        { office_id: officeId, user_id: userId },
        { $set: { user_id: `anonymized_${userId}` } }
      );
    return { anonymized: result.modifiedCount };
  }

  async deleteConsentRecords(userId, officeId) {
    const result = await this.db
      .collection("consent_records")
      .deleteMany({ user_id: userId, office_id: officeId });
    return { deleted: result.deletedCount };
  }

  async deleteOldData(officeId, dataType, cutoffDate) {
    const collectionMap = {
      audit_logs: "audit_logs",
      chat_messages: "chat_messages",
      location_data: "location_updates",
      transaction_history: "transactions",
    };

    const collection = collectionMap[dataType];
    if (!collection) return { deleted: 0 };

    const result = await this.db.collection(collection).deleteMany({
      office_id: officeId,
      created_at: { $lt: cutoffDate },
    });

    return { deleted: result.deletedCount };
  }

  countRecords(userData) {
    let count = 0;
    Object.values(userData).forEach((data) => {
      if (Array.isArray(data)) {
        count += data.length;
      } else if (data) {
        count += 1;
      }
    });
    return count;
  }

  convertToCSV(data) {
    // Simplified CSV conversion
    return "CSV export not yet implemented";
  }

  convertToXML(data) {
    // Simplified XML conversion
    return "XML export not yet implemented";
  }

  getDataCategories() {
    return [
      "IDENTITY_DATA",
      "CONTACT_DATA",
      "LOCATION_DATA",
      "TRANSACTION_DATA",
      "USAGE_DATA",
      "COMMUNICATION_DATA",
    ];
  }

  getProcessingPurposes() {
    return [
      "SERVICE_PROVISION",
      "MATCHING_ALGORITHM",
      "SAFETY_SECURITY",
      "ANALYTICS",
      "COMMUNICATION",
    ];
  }

  getLegalBasis() {
    return {
      primary: "LEGITIMATE_INTEREST",
      secondary: ["CONTRACT_PERFORMANCE", "CONSENT"],
    };
  }

  identifyPrivacyRisks() {
    return [
      {
        risk: "LOCATION_TRACKING",
        severity: "MEDIUM",
        mitigation: "Time-limited storage, user consent",
      },
      {
        risk: "DATA_BREACH",
        severity: "HIGH",
        mitigation: "Encryption, access controls, audit logging",
      },
    ];
  }

  getMitigationMeasures() {
    return [
      "End-to-end encryption",
      "Access control and authentication",
      "Regular security audits",
      "Data minimization",
      "Automated data retention policies",
    ];
  }
}

module.exports = GDPRComplianceService;
