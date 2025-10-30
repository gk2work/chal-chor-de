/**
 * Performance Tracking Middleware
 * Automatically tracks API performance metrics
 */

function createPerformanceMiddleware(performanceMonitor, cacheManager) {
  return {
    /**
     * Track response time for all requests
     */
    trackResponseTime: () => {
      return (req, res, next) => {
        const startTime = Date.now();

        // Capture original end function
        const originalEnd = res.end;

        res.end = function (...args) {
          const duration = Date.now() - startTime;

          // Record metric
          performanceMonitor.recordEndpointMetric(
            req.path,
            req.method,
            duration,
            res.statusCode
          );

          // Call original end
          originalEnd.apply(res, args);
        };

        next();
      };
    },

    /**
     * Cache middleware for GET requests
     */
    cacheMiddleware: (ttl = 300) => {
      return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== "GET") {
          return next();
        }

        // Generate cache key
        const cacheKey = `api:${req.path}:${JSON.stringify(req.query)}`;

        try {
          // Try to get from cache
          const cached = await cacheManager.get(cacheKey);

          if (cached) {
            res.setHeader("X-Cache", "HIT");
            return res.json(cached);
          }

          // Cache miss - capture response
          res.setHeader("X-Cache", "MISS");

          const originalJson = res.json;
          res.json = function (data) {
            // Store in cache
            cacheManager.set(cacheKey, data, ttl).catch((err) => {
              console.error("Cache set error:", err);
            });

            // Call original json
            originalJson.call(res, data);
          };

          next();
        } catch (error) {
          console.error("Cache middleware error:", error);
          next();
        }
      };
    },

    /**
     * Rate limiting middleware
     */
    rateLimiter: (maxRequests = 100, windowMs = 60000) => {
      const requests = new Map();

      return (req, res, next) => {
        const key = `${req.ip}:${req.path}`;
        const now = Date.now();

        if (!requests.has(key)) {
          requests.set(key, []);
        }

        const userRequests = requests.get(key);

        // Remove old requests outside window
        const validRequests = userRequests.filter(
          (timestamp) => now - timestamp < windowMs
        );

        if (validRequests.length >= maxRequests) {
          return res.status(429).json({
            error: "Too many requests",
            retry_after: Math.ceil(windowMs / 1000),
          });
        }

        validRequests.push(now);
        requests.set(key, validRequests);

        // Set rate limit headers
        res.setHeader("X-RateLimit-Limit", maxRequests);
        res.setHeader(
          "X-RateLimit-Remaining",
          maxRequests - validRequests.length
        );
        res.setHeader(
          "X-RateLimit-Reset",
          new Date(now + windowMs).toISOString()
        );

        next();
      };
    },

    /**
     * Request size limiter
     */
    requestSizeLimiter: (maxSizeBytes = 10 * 1024 * 1024) => {
      return (req, res, next) => {
        const contentLength = parseInt(req.headers["content-length"] || "0");

        if (contentLength > maxSizeBytes) {
          return res.status(413).json({
            error: "Request entity too large",
            max_size: maxSizeBytes,
            received_size: contentLength,
          });
        }

        next();
      };
    },

    /**
     * Compression middleware wrapper
     */
    compressionMiddleware: () => {
      const compression = require("compression");

      return compression({
        filter: (req, res) => {
          if (req.headers["x-no-compression"]) {
            return false;
          }
          return compression.filter(req, res);
        },
        threshold: 1024, // Only compress responses > 1KB
      });
    },

    /**
     * Query optimization middleware
     */
    queryOptimizer: (queryOptimizer) => {
      return async (req, res, next) => {
        // Attach query analyzer to request
        req.analyzeQuery = async (collection, query, options) => {
          return await queryOptimizer.analyzeQuery(collection, query, options);
        };

        next();
      };
    },

    /**
     * Health check middleware
     */
    healthCheck: (services = {}) => {
      return async (req, res) => {
        const health = {
          status: "healthy",
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          services: {},
        };

        // Check each service
        for (const [name, checkFn] of Object.entries(services)) {
          try {
            health.services[name] = await checkFn();
          } catch (error) {
            health.services[name] = {
              status: "unhealthy",
              error: error.message,
            };
            health.status = "degraded";
          }
        }

        const statusCode = health.status === "healthy" ? 200 : 503;
        res.status(statusCode).json(health);
      };
    },

    /**
     * Metrics endpoint middleware
     */
    metricsEndpoint: () => {
      return (req, res) => {
        const summary = performanceMonitor.getPerformanceSummary();
        const systemMetrics = performanceMonitor.getSystemMetrics();

        res.json({
          performance: summary,
          system: systemMetrics,
          cache: cacheManager ? cacheManager.getStats() : null,
          timestamp: new Date().toISOString(),
        });
      };
    },
  };
}

module.exports = createPerformanceMiddleware;
