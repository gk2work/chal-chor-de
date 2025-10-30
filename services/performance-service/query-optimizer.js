/**
 * Database Query Optimizer
 * Provides query optimization and index management
 */

class QueryOptimizer {
  constructor(db) {
    this.db = db;
    this.queryStats = new Map();
  }

  /**
   * Create optimized indexes for all collections
   */
  async createIndexes() {
    try {
      const indexResults = {};

      // Users collection indexes
      indexResults.users = await this.createUserIndexes();

      // Carpool trips indexes
      indexResults.carpool_trips = await this.createCarpoolIndexes();

      // Bike bookings indexes
      indexResults.bike_bookings = await this.createBikeIndexes();

      // Book loans indexes
      indexResults.book_loans = await this.createBookIndexes();

      // Chat messages indexes
      indexResults.chat_messages = await this.createChatIndexes();

      // Location updates indexes
      indexResults.location_updates = await this.createLocationIndexes();

      // Audit logs indexes
      indexResults.audit_logs = await this.createAuditIndexes();

      console.log("✅ Database indexes created successfully");
      return indexResults;
    } catch (error) {
      console.error("Index creation error:", error);
      throw error;
    }
  }

  /**
   * Create indexes for users collection
   */
  async createUserIndexes() {
    const collection = this.db.collection("users");

    await collection.createIndex({ user_id: 1 }, { unique: true });
    await collection.createIndex({ office_id: 1 });
    await collection.createIndex({ email: 1 }, { unique: true });
    await collection.createIndex({ office_id: 1, status: 1 });
    await collection.createIndex({ reputation_score: -1 });
    await collection.createIndex({ created_at: -1 });

    return { created: 6 };
  }

  /**
   * Create indexes for carpool trips
   */
  async createCarpoolIndexes() {
    const collection = this.db.collection("carpool_trips");

    // Compound indexes for common queries
    await collection.createIndex({
      office_id: 1,
      status: 1,
      departure_time: 1,
    });
    await collection.createIndex({
      office_id: 1,
      user_id: 1,
      departure_time: -1,
    });
    await collection.createIndex({
      office_id: 1,
      direction: 1,
      departure_time: 1,
    });
    await collection.createIndex({ office_id: 1, trip_type: 1, status: 1 });

    // Geospatial index for location-based queries
    await collection.createIndex({ origin_location: "2dsphere" });
    await collection.createIndex({ destination_location: "2dsphere" });

    // Text index for search
    await collection.createIndex({ notes: "text" });

    return { created: 7 };
  }

  /**
   * Create indexes for bike bookings
   */
  async createBikeIndexes() {
    const collection = this.db.collection("bike_bookings");

    await collection.createIndex({ office_id: 1, status: 1 });
    await collection.createIndex({ office_id: 1, owner_id: 1 });
    await collection.createIndex({ office_id: 1, borrower_id: 1 });
    await collection.createIndex({ booking_date: 1, status: 1 });
    await collection.createIndex({ return_date: 1 });

    return { created: 5 };
  }

  /**
   * Create indexes for book loans
   */
  async createBookIndexes() {
    const collection = this.db.collection("book_loans");

    await collection.createIndex({ office_id: 1, status: 1 });
    await collection.createIndex({ office_id: 1, owner_id: 1 });
    await collection.createIndex({ office_id: 1, borrower_id: 1 });
    await collection.createIndex({ isbn: 1 });
    await collection.createIndex({ due_date: 1, status: 1 });

    // Text index for book search
    await collection.createIndex({ title: "text", author: "text" });

    return { created: 6 };
  }

  /**
   * Create indexes for chat messages
   */
  async createChatIndexes() {
    const collection = this.db.collection("chat_messages");

    await collection.createIndex({
      office_id: 1,
      thread_id: 1,
      created_at: -1,
    });
    await collection.createIndex({ office_id: 1, user_id: 1, created_at: -1 });
    await collection.createIndex({ thread_id: 1, created_at: -1 });

    // TTL index for automatic message deletion
    await collection.createIndex(
      { created_at: 1 },
      { expireAfterSeconds: 365 * 24 * 60 * 60 } // 1 year
    );

    return { created: 4 };
  }

  /**
   * Create indexes for location updates
   */
  async createLocationIndexes() {
    const collection = this.db.collection("location_updates");

    await collection.createIndex({ trip_id: 1, timestamp: -1 });
    await collection.createIndex({ user_id: 1, timestamp: -1 });
    await collection.createIndex({ location: "2dsphere" });

    // TTL index for automatic cleanup
    await collection.createIndex(
      { timestamp: 1 },
      { expireAfterSeconds: 90 * 24 * 60 * 60 } // 90 days
    );

    return { created: 4 };
  }

  /**
   * Create indexes for audit logs
   */
  async createAuditIndexes() {
    const collection = this.db.collection("audit_logs");

    await collection.createIndex({ office_id: 1, timestamp: -1 });
    await collection.createIndex({ user_id: 1, timestamp: -1 });
    await collection.createIndex({ category: 1, timestamp: -1 });
    await collection.createIndex({ severity: 1, timestamp: -1 });

    // TTL index for automatic log cleanup
    await collection.createIndex(
      { timestamp: 1 },
      { expireAfterSeconds: 730 * 24 * 60 * 60 } // 2 years
    );

    return { created: 5 };
  }

  /**
   * Analyze query performance
   */
  async analyzeQuery(collection, query, options = {}) {
    try {
      const startTime = Date.now();

      // Execute query with explain
      const explainResult = await this.db
        .collection(collection)
        .find(query, options)
        .explain("executionStats");

      const executionTime = Date.now() - startTime;

      const analysis = {
        collection,
        query,
        execution_time_ms: executionTime,
        documents_examined: explainResult.executionStats.totalDocsExamined,
        documents_returned: explainResult.executionStats.nReturned,
        index_used:
          explainResult.executionStats.executionStages.indexName || "COLLSCAN",
        efficiency: this.calculateEfficiency(explainResult.executionStats),
        recommendations: this.generateRecommendations(explainResult),
      };

      // Store query stats
      this.recordQueryStats(collection, analysis);

      return analysis;
    } catch (error) {
      console.error("Query analysis error:", error);
      throw error;
    }
  }

  /**
   * Calculate query efficiency
   */
  calculateEfficiency(stats) {
    if (stats.totalDocsExamined === 0) return 1;

    const efficiency = stats.nReturned / stats.totalDocsExamined;
    return Math.round(efficiency * 100) / 100;
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(explainResult) {
    const recommendations = [];
    const stats = explainResult.executionStats;

    // Check if collection scan is used
    if (stats.executionStages.stage === "COLLSCAN") {
      recommendations.push({
        type: "INDEX_MISSING",
        priority: "HIGH",
        message:
          "Query is performing a collection scan. Consider adding an index.",
      });
    }

    // Check efficiency
    const efficiency = this.calculateEfficiency(stats);
    if (efficiency < 0.5) {
      recommendations.push({
        type: "LOW_EFFICIENCY",
        priority: "MEDIUM",
        message: `Query efficiency is ${efficiency}. Consider optimizing the query or indexes.`,
      });
    }

    // Check execution time
    if (stats.executionTimeMillis > 100) {
      recommendations.push({
        type: "SLOW_QUERY",
        priority: "HIGH",
        message: `Query took ${stats.executionTimeMillis}ms. Consider optimization.`,
      });
    }

    return recommendations;
  }

  /**
   * Record query statistics
   */
  recordQueryStats(collection, analysis) {
    const key = `${collection}:${JSON.stringify(analysis.query)}`;

    if (!this.queryStats.has(key)) {
      this.queryStats.set(key, {
        collection,
        query: analysis.query,
        executions: 0,
        total_time: 0,
        avg_time: 0,
        max_time: 0,
        min_time: Infinity,
      });
    }

    const stats = this.queryStats.get(key);
    stats.executions++;
    stats.total_time += analysis.execution_time_ms;
    stats.avg_time = stats.total_time / stats.executions;
    stats.max_time = Math.max(stats.max_time, analysis.execution_time_ms);
    stats.min_time = Math.min(stats.min_time, analysis.execution_time_ms);
  }

  /**
   * Get slow queries
   */
  getSlowQueries(threshold = 100) {
    const slowQueries = [];

    for (const [key, stats] of this.queryStats.entries()) {
      if (stats.avg_time > threshold) {
        slowQueries.push(stats);
      }
    }

    return slowQueries.sort((a, b) => b.avg_time - a.avg_time);
  }

  /**
   * Get query statistics report
   */
  getQueryStatsReport() {
    const stats = Array.from(this.queryStats.values());

    return {
      total_queries: stats.length,
      total_executions: stats.reduce((sum, s) => sum + s.executions, 0),
      avg_execution_time: this.calculateAvgExecutionTime(stats),
      slow_queries: this.getSlowQueries(100),
      most_frequent: this.getMostFrequentQueries(10),
    };
  }

  /**
   * Calculate average execution time across all queries
   */
  calculateAvgExecutionTime(stats) {
    if (stats.length === 0) return 0;

    const totalTime = stats.reduce((sum, s) => sum + s.total_time, 0);
    const totalExecutions = stats.reduce((sum, s) => sum + s.executions, 0);

    return totalExecutions > 0 ? totalTime / totalExecutions : 0;
  }

  /**
   * Get most frequently executed queries
   */
  getMostFrequentQueries(limit = 10) {
    const stats = Array.from(this.queryStats.values());
    return stats.sort((a, b) => b.executions - a.executions).slice(0, limit);
  }

  /**
   * Optimize collection
   */
  async optimizeCollection(collectionName) {
    try {
      const collection = this.db.collection(collectionName);

      // Get collection stats
      const stats = await this.db.command({ collStats: collectionName });

      // Compact collection if fragmented
      if (stats.storageSize > stats.size * 1.5) {
        await this.db.command({ compact: collectionName });
      }

      // Rebuild indexes
      await collection.reIndex();

      return {
        collection: collectionName,
        optimized: true,
        stats: {
          documents: stats.count,
          size: stats.size,
          storage_size: stats.storageSize,
          indexes: stats.nindexes,
        },
      };
    } catch (error) {
      console.error("Collection optimization error:", error);
      throw error;
    }
  }

  /**
   * Get index usage statistics
   */
  async getIndexStats(collectionName) {
    try {
      const stats = await this.db.command({
        aggregate: collectionName,
        pipeline: [{ $indexStats: {} }],
        cursor: {},
      });

      return stats.cursor.firstBatch;
    } catch (error) {
      console.error("Index stats error:", error);
      return [];
    }
  }

  /**
   * Suggest missing indexes
   */
  async suggestIndexes(collectionName) {
    const slowQueries = this.getSlowQueries(50);
    const suggestions = [];

    for (const query of slowQueries) {
      if (query.collection === collectionName) {
        const fields = Object.keys(query.query);
        if (fields.length > 0) {
          suggestions.push({
            fields: fields,
            reason: `Slow query detected (${query.avg_time}ms avg)`,
            priority: query.avg_time > 200 ? "HIGH" : "MEDIUM",
          });
        }
      }
    }

    return suggestions;
  }
}

module.exports = QueryOptimizer;
