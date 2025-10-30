const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { MongoClient } = require("mongodb");
const CacheManager = require("./cache-manager");
const QueryOptimizer = require("./query-optimizer");
const PerformanceMonitor = require("./performance-monitor");
const createPerformanceMiddleware = require("./performance-middleware");
require("dotenv").config();

const app = express();
const PORT = process.env.PERFORMANCE_SERVICE_PORT || 3009;

// MongoDB connection
let db;
const mongoClient = new MongoClient(process.env.MONGODB_URI);

// Services
let cacheManager;
let queryOptimizer;
let performanceMonitor;
let middleware;

// Connect to MongoDB and initialize services
async function connectToDatabase() {
  try {
    await mongoClient.connect();
    db = mongoClient.db(process.env.MONGODB_DB_NAME || "officeshare_dev");

    // Initialize services
    cacheManager = new CacheManager();
    await cacheManager.connect();

    queryOptimizer = new QueryOptimizer(db);
    performanceMonitor = new PerformanceMonitor();

    middleware = createPerformanceMiddleware(performanceMonitor, cacheManager);

    console.log("✅ Connected to MongoDB");
    console.log("✅ Performance services initialized");
  } catch (error) {
    console.error("❌ Service initialization failed:", error);
    process.exit(1);
  }
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

// Apply performance tracking middleware
app.use(middleware.trackResponseTime());

// Health check
app.get(
  "/health",
  middleware.healthCheck({
    database: async () => {
      await db.admin().ping();
      return { status: "healthy" };
    },
    cache: async () => {
      const stats = await cacheManager.getStats();
      return { status: stats.redis_connected ? "healthy" : "degraded", stats };
    },
  })
);

// Metrics endpoint
app.get("/metrics", middleware.metricsEndpoint());

// Cache Management Endpoints

app.get("/api/performance/cache/stats", async (req, res) => {
  try {
    const stats = await cacheManager.getStats();
    res.json(stats);
  } catch (error) {
    console.error("Get cache stats error:", error);
    res.status(500).json({ error: "Failed to get cache stats" });
  }
});

app.post("/api/performance/cache/warm", async (req, res) => {
  try {
    const { keys, data_loader } = req.body;

    // This would need to be implemented with actual data loader
    res.json({
      message: "Cache warming initiated",
      keys_count: keys?.length || 0,
    });
  } catch (error) {
    console.error("Cache warming error:", error);
    res.status(500).json({ error: "Failed to warm cache" });
  }
});

app.delete("/api/performance/cache/clear", async (req, res) => {
  try {
    const { pattern } = req.query;

    if (pattern) {
      await cacheManager.deletePattern(pattern);
    } else {
      await cacheManager.clear();
    }

    res.json({ success: true, message: "Cache cleared" });
  } catch (error) {
    console.error("Cache clear error:", error);
    res.status(500).json({ error: "Failed to clear cache" });
  }
});

// Query Optimization Endpoints

app.post("/api/performance/query/analyze", async (req, res) => {
  try {
    const { collection, query, options } = req.body;

    const analysis = await queryOptimizer.analyzeQuery(
      collection,
      query,
      options
    );

    res.json(analysis);
  } catch (error) {
    console.error("Query analysis error:", error);
    res.status(500).json({ error: "Failed to analyze query" });
  }
});

app.post("/api/performance/query/optimize-collection", async (req, res) => {
  try {
    const { collection } = req.body;

    const result = await queryOptimizer.optimizeCollection(collection);

    res.json(result);
  } catch (error) {
    console.error("Collection optimization error:", error);
    res.status(500).json({ error: "Failed to optimize collection" });
  }
});

app.get("/api/performance/query/slow-queries", async (req, res) => {
  try {
    const { threshold } = req.query;

    const slowQueries = queryOptimizer.getSlowQueries(
      threshold ? parseInt(threshold) : 100
    );

    res.json({
      slow_queries: slowQueries,
      count: slowQueries.length,
    });
  } catch (error) {
    console.error("Get slow queries error:", error);
    res.status(500).json({ error: "Failed to get slow queries" });
  }
});

app.get("/api/performance/query/stats", async (req, res) => {
  try {
    const stats = queryOptimizer.getQueryStatsReport();
    res.json(stats);
  } catch (error) {
    console.error("Get query stats error:", error);
    res.status(500).json({ error: "Failed to get query stats" });
  }
});

app.post("/api/performance/indexes/create", async (req, res) => {
  try {
    const result = await queryOptimizer.createIndexes();
    res.json({
      success: true,
      indexes_created: result,
    });
  } catch (error) {
    console.error("Create indexes error:", error);
    res.status(500).json({ error: "Failed to create indexes" });
  }
});

app.get("/api/performance/indexes/stats/:collection", async (req, res) => {
  try {
    const { collection } = req.params;

    const stats = await queryOptimizer.getIndexStats(collection);

    res.json({
      collection,
      indexes: stats,
    });
  } catch (error) {
    console.error("Get index stats error:", error);
    res.status(500).json({ error: "Failed to get index stats" });
  }
});

app.get("/api/performance/indexes/suggest/:collection", async (req, res) => {
  try {
    const { collection } = req.params;

    const suggestions = await queryOptimizer.suggestIndexes(collection);

    res.json({
      collection,
      suggestions,
    });
  } catch (error) {
    console.error("Suggest indexes error:", error);
    res.status(500).json({ error: "Failed to suggest indexes" });
  }
});

// Performance Monitoring Endpoints

app.get("/api/performance/monitor/summary", async (req, res) => {
  try {
    const summary = performanceMonitor.getPerformanceSummary();
    res.json(summary);
  } catch (error) {
    console.error("Get summary error:", error);
    res.status(500).json({ error: "Failed to get performance summary" });
  }
});

app.get("/api/performance/monitor/endpoints", async (req, res) => {
  try {
    const { endpoint } = req.query;

    const metrics = performanceMonitor.getEndpointMetrics(endpoint);

    res.json({
      metrics,
      count: metrics.length,
    });
  } catch (error) {
    console.error("Get endpoint metrics error:", error);
    res.status(500).json({ error: "Failed to get endpoint metrics" });
  }
});

app.get("/api/performance/monitor/slowest", async (req, res) => {
  try {
    const { limit } = req.query;

    const slowest = performanceMonitor.getSlowestEndpoints(
      limit ? parseInt(limit) : 10
    );

    res.json({
      slowest_endpoints: slowest,
    });
  } catch (error) {
    console.error("Get slowest endpoints error:", error);
    res.status(500).json({ error: "Failed to get slowest endpoints" });
  }
});

app.get("/api/performance/monitor/alerts", async (req, res) => {
  try {
    const { severity } = req.query;

    const alerts = performanceMonitor.getActiveAlerts(severity);

    res.json({
      alerts,
      count: alerts.length,
    });
  } catch (error) {
    console.error("Get alerts error:", error);
    res.status(500).json({ error: "Failed to get alerts" });
  }
});

app.get("/api/performance/monitor/system", async (req, res) => {
  try {
    const systemMetrics = performanceMonitor.getSystemMetrics();

    // Get current system metrics
    const currentMetrics = {
      cpu_usage: process.cpuUsage(),
      memory_usage:
        (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) *
        100,
      memory_total: process.memoryUsage().heapTotal,
      memory_used: process.memoryUsage().heapUsed,
    };

    // Record current metrics
    performanceMonitor.recordSystemMetrics(currentMetrics);

    res.json({
      current: currentMetrics,
      historical: systemMetrics,
    });
  } catch (error) {
    console.error("Get system metrics error:", error);
    res.status(500).json({ error: "Failed to get system metrics" });
  }
});

app.get("/api/performance/monitor/report", async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const report = performanceMonitor.generateReport(
      start_date
        ? new Date(start_date)
        : new Date(Date.now() - 24 * 60 * 60 * 1000),
      end_date ? new Date(end_date) : new Date()
    );

    res.json(report);
  } catch (error) {
    console.error("Generate report error:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

app.post("/api/performance/monitor/reset", async (req, res) => {
  try {
    performanceMonitor.reset();

    res.json({
      success: true,
      message: "Performance metrics reset",
    });
  } catch (error) {
    console.error("Reset metrics error:", error);
    res.status(500).json({ error: "Failed to reset metrics" });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Performance Service Error:", err);
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
    console.log(`🚀 Performance Service running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(
      `🗄️ Database: ${process.env.MONGODB_DB_NAME || "officeshare_dev"}`
    );
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`📈 Metrics: http://localhost:${PORT}/metrics`);
  });

  // Periodic cleanup
  setInterval(() => {
    performanceMonitor.clearOldAlerts();
  }, 3600000); // Every hour
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  await cacheManager.disconnect();
  await mongoClient.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  await cacheManager.disconnect();
  await mongoClient.close();
  process.exit(0);
});

startServer().catch(console.error);
