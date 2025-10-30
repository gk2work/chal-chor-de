const { MongoClient } = require("mongodb");
const CacheManager = require("../cache-manager");
const QueryOptimizer = require("../query-optimizer");
const PerformanceMonitor = require("../performance-monitor");

describe("Performance Service Integration Tests", () => {
  let db;
  let mongoClient;
  let cacheManager;
  let queryOptimizer;
  let performanceMonitor;

  beforeAll(async () => {
    // Connect to test database
    mongoClient = new MongoClient(
      process.env.MONGODB_URI || "mongodb://localhost:27017"
    );
    await mongoClient.connect();
    db = mongoClient.db("officeshare_test");

    // Initialize services
    cacheManager = new CacheManager({
      host: process.env.REDIS_HOST || "localhost",
      port: process.env.REDIS_PORT || 6379,
    });
    await cacheManager.connect();

    queryOptimizer = new QueryOptimizer(db);
    performanceMonitor = new PerformanceMonitor();
  });

  afterAll(async () => {
    await cacheManager.disconnect();
    await db.dropDatabase();
    await mongoClient.close();
  });

  describe("Cache Manager", () => {
    beforeEach(async () => {
      await cacheManager.clear();
    });

    it("should set and get values from cache", async () => {
      const key = "test:key";
      const value = { data: "test value" };

      await cacheManager.set(key, value, 60);
      const retrieved = await cacheManager.get(key);

      expect(retrieved).toEqual(value);
    });

    it("should return null for non-existent keys", async () => {
      const value = await cacheManager.get("non:existent:key");
      expect(value).toBeNull();
    });

    it("should delete values from cache", async () => {
      const key = "test:delete";
      await cacheManager.set(key, "value", 60);

      await cacheManager.delete(key);
      const retrieved = await cacheManager.get(key);

      expect(retrieved).toBeNull();
    });

    it("should handle getOrSet pattern", async () => {
      const key = "test:getOrSet";
      let fetchCalled = false;

      const fetchFunction = async () => {
        fetchCalled = true;
        return { data: "fetched value" };
      };

      // First call should fetch
      const result1 = await cacheManager.getOrSet(key, fetchFunction, 60);
      expect(result1.fromCache).toBe(false);
      expect(fetchCalled).toBe(true);

      // Second call should use cache
      fetchCalled = false;
      const result2 = await cacheManager.getOrSet(key, fetchFunction, 60);
      expect(result2.fromCache).toBe(true);
      expect(fetchCalled).toBe(false);
    });

    it("should handle multiple keys with mget/mset", async () => {
      const keyValuePairs = {
        "test:key1": "value1",
        "test:key2": "value2",
        "test:key3": "value3",
      };

      await cacheManager.mset(keyValuePairs, 60);

      const values = await cacheManager.mget(Object.keys(keyValuePairs));

      expect(values).toEqual(Object.values(keyValuePairs));
    });

    it("should increment counters", async () => {
      const key = "test:counter";

      const value1 = await cacheManager.increment(key, 1, 60);
      expect(value1).toBe(1);

      const value2 = await cacheManager.increment(key, 5, 60);
      expect(value2).toBe(6);
    });

    it("should delete keys matching pattern", async () => {
      await cacheManager.set("user:123:profile", "data1", 60);
      await cacheManager.set("user:456:profile", "data2", 60);
      await cacheManager.set("trip:789", "data3", 60);

      await cacheManager.deletePattern("user:*");

      const user1 = await cacheManager.get("user:123:profile");
      const user2 = await cacheManager.get("user:456:profile");
      const trip = await cacheManager.get("trip:789");

      expect(user1).toBeNull();
      expect(user2).toBeNull();
      expect(trip).not.toBeNull();
    });

    it("should provide cache statistics", async () => {
      const stats = await cacheManager.getStats();

      expect(stats).toBeDefined();
      expect(stats.memory_cache_size).toBeDefined();
    });
  });

  describe("Query Optimizer", () => {
    beforeAll(async () => {
      // Create test collection with data
      await db.collection("test_users").insertMany([
        { user_id: "user_1", office_id: "office_001", name: "User 1" },
        { user_id: "user_2", office_id: "office_001", name: "User 2" },
        { user_id: "user_3", office_id: "office_002", name: "User 3" },
      ]);
    });

    afterAll(async () => {
      await db.collection("test_users").drop();
    });

    it("should create indexes for collections", async () => {
      const result = await queryOptimizer.createIndexes();

      expect(result).toBeDefined();
      expect(result.users).toBeDefined();
      expect(result.carpool_trips).toBeDefined();
    });

    it("should analyze query performance", async () => {
      const analysis = await queryOptimizer.analyzeQuery("test_users", {
        office_id: "office_001",
      });

      expect(analysis).toBeDefined();
      expect(analysis.execution_time_ms).toBeDefined();
      expect(analysis.documents_examined).toBeDefined();
      expect(analysis.efficiency).toBeDefined();
    });

    it("should track slow queries", async () => {
      // Execute some queries
      await queryOptimizer.analyzeQuery("test_users", { user_id: "user_1" });
      await queryOptimizer.analyzeQuery("test_users", {
        office_id: "office_001",
      });

      const slowQueries = queryOptimizer.getSlowQueries(0);
      expect(Array.isArray(slowQueries)).toBe(true);
    });

    it("should generate query statistics report", () => {
      const report = queryOptimizer.getQueryStatsReport();

      expect(report).toBeDefined();
      expect(report.total_queries).toBeGreaterThanOrEqual(0);
      expect(report.total_executions).toBeGreaterThanOrEqual(0);
    });

    it("should optimize collection", async () => {
      const result = await queryOptimizer.optimizeCollection("test_users");

      expect(result).toBeDefined();
      expect(result.optimized).toBe(true);
      expect(result.stats).toBeDefined();
    });
  });

  describe("Performance Monitor", () => {
    beforeEach(() => {
      performanceMonitor.reset();
    });

    it("should record endpoint metrics", () => {
      performanceMonitor.recordEndpointMetric("/api/users", "GET", 150, 200);

      const metrics = performanceMonitor.getEndpointMetrics("/api/users");

      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0].avg_duration).toBe(150);
    });

    it("should track multiple requests to same endpoint", () => {
      performanceMonitor.recordEndpointMetric("/api/test", "GET", 100, 200);
      performanceMonitor.recordEndpointMetric("/api/test", "GET", 200, 200);
      performanceMonitor.recordEndpointMetric("/api/test", "GET", 150, 200);

      const metrics = performanceMonitor.getEndpointMetrics("/api/test");

      expect(metrics[0].requests).toBe(3);
      expect(metrics[0].avg_duration).toBe(150);
      expect(metrics[0].min_duration).toBe(100);
      expect(metrics[0].max_duration).toBe(200);
    });

    it("should identify slowest endpoints", () => {
      performanceMonitor.recordEndpointMetric("/api/fast", "GET", 50, 200);
      performanceMonitor.recordEndpointMetric("/api/slow", "GET", 500, 200);
      performanceMonitor.recordEndpointMetric("/api/medium", "GET", 200, 200);

      const slowest = performanceMonitor.getSlowestEndpoints(2);

      expect(slowest.length).toBe(2);
      expect(slowest[0].endpoint).toBe("/api/slow");
    });

    it("should track error rates", () => {
      performanceMonitor.recordEndpointMetric("/api/errors", "GET", 100, 200);
      performanceMonitor.recordEndpointMetric("/api/errors", "GET", 100, 500);
      performanceMonitor.recordEndpointMetric("/api/errors", "GET", 100, 500);

      const metrics = performanceMonitor.getEndpointMetrics("/api/errors");

      expect(metrics[0].success_count).toBe(1);
      expect(metrics[0].error_count).toBe(2);
    });

    it("should create alerts for slow endpoints", () => {
      // Record slow requests
      for (let i = 0; i < 10; i++) {
        performanceMonitor.recordEndpointMetric(
          "/api/very-slow",
          "GET",
          2000,
          200
        );
      }

      const alerts = performanceMonitor.getActiveAlerts();
      const slowAlert = alerts.find((a) => a.type === "SLOW_ENDPOINT");

      expect(slowAlert).toBeDefined();
    });

    it("should record database metrics", () => {
      performanceMonitor.recordDatabaseMetric("users", "find", 50);
      performanceMonitor.recordDatabaseMetric("users", "find", 75);

      const dbMetrics = performanceMonitor.getDatabaseMetrics();

      expect(dbMetrics.length).toBeGreaterThan(0);
      expect(dbMetrics[0].avg_duration).toBe(62.5);
    });

    it("should record system metrics", () => {
      performanceMonitor.recordSystemMetrics({
        cpu_usage: 45,
        memory_usage: 60,
        memory_total: 8000000000,
        memory_used: 4800000000,
      });

      const systemMetrics = performanceMonitor.getSystemMetrics();

      expect(systemMetrics).toBeDefined();
      expect(systemMetrics.current.cpu_usage).toBe(45);
    });

    it("should generate performance summary", () => {
      performanceMonitor.recordEndpointMetric("/api/test1", "GET", 100, 200);
      performanceMonitor.recordEndpointMetric("/api/test2", "GET", 200, 200);

      const summary = performanceMonitor.getPerformanceSummary();

      expect(summary).toBeDefined();
      expect(summary.total_requests).toBe(2);
      expect(summary.avg_response_time).toBe(150);
    });

    it("should generate performance report", () => {
      performanceMonitor.recordEndpointMetric("/api/test", "GET", 100, 200);

      const report = performanceMonitor.generateReport(
        new Date(Date.now() - 3600000),
        new Date()
      );

      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });
  });

  describe("End-to-End Performance Flow", () => {
    it("should handle complete performance monitoring cycle", async () => {
      // 1. Cache some data
      await cacheManager.set("user:profile:123", { name: "Test User" }, 60);

      // 2. Execute and analyze a query
      await db.collection("test_collection").insertOne({ test: "data" });
      const analysis = await queryOptimizer.analyzeQuery("test_collection", {
        test: "data",
      });

      expect(analysis).toBeDefined();

      // 3. Record endpoint performance
      performanceMonitor.recordEndpointMetric("/api/test", "GET", 150, 200);

      // 4. Get cached data
      const cached = await cacheManager.get("user:profile:123");
      expect(cached).toBeDefined();

      // 5. Generate performance report
      const report = performanceMonitor.generateReport(
        new Date(Date.now() - 3600000),
        new Date()
      );

      expect(report.summary.total_requests).toBeGreaterThan(0);

      // Cleanup
      await db.collection("test_collection").drop();
    });

    it("should demonstrate caching improves performance", async () => {
      const key = "performance:test";
      let executionCount = 0;

      const slowFunction = async () => {
        executionCount++;
        // Simulate slow operation
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { data: "result" };
      };

      // First call - should execute function
      const start1 = Date.now();
      await cacheManager.getOrSet(key, slowFunction, 60);
      const duration1 = Date.now() - start1;

      expect(executionCount).toBe(1);
      expect(duration1).toBeGreaterThanOrEqual(100);

      // Second call - should use cache
      const start2 = Date.now();
      await cacheManager.getOrSet(key, slowFunction, 60);
      const duration2 = Date.now() - start2;

      expect(executionCount).toBe(1); // Function not called again
      expect(duration2).toBeLessThan(duration1); // Much faster
    });
  });
});
