const redis = require("redis");

/**
 * Advanced Caching Manager
 * Implements multi-level caching strategies with Redis
 */

class CacheManager {
  constructor(redisConfig) {
    this.client = null;
    this.redisConfig = redisConfig || {
      host: process.env.REDIS_HOST || "localhost",
      port: process.env.REDIS_PORT || 6379,
    };
    this.defaultTTL = 3600; // 1 hour
    this.memoryCache = new Map(); // In-memory L1 cache
    this.memoryCacheMaxSize = 1000;
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    try {
      this.client = redis.createClient({
        socket: {
          host: this.redisConfig.host,
          port: this.redisConfig.port,
        },
      });

      this.client.on("error", (err) => {
        console.error("Redis Client Error:", err);
      });

      this.client.on("connect", () => {
        console.log("✅ Connected to Redis");
      });

      await this.client.connect();
    } catch (error) {
      console.error("Failed to connect to Redis:", error);
      console.log("⚠️ Running without Redis cache");
    }
  }

  /**
   * Get value from cache (L1 memory -> L2 Redis)
   */
  async get(key) {
    try {
      // Check L1 memory cache first
      if (this.memoryCache.has(key)) {
        const cached = this.memoryCache.get(key);
        if (cached.expires > Date.now()) {
          return cached.value;
        }
        this.memoryCache.delete(key);
      }

      // Check L2 Redis cache
      if (this.client && this.client.isOpen) {
        const value = await this.client.get(key);
        if (value) {
          const parsed = JSON.parse(value);
          // Populate L1 cache
          this.setMemoryCache(key, parsed, 300); // 5 min in memory
          return parsed;
        }
      }

      return null;
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  }

  /**
   * Set value in cache (both L1 and L2)
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      // Set in L1 memory cache
      this.setMemoryCache(key, value, Math.min(ttl, 300)); // Max 5 min in memory

      // Set in L2 Redis cache
      if (this.client && this.client.isOpen) {
        await this.client.setEx(key, ttl, JSON.stringify(value));
      }

      return true;
    } catch (error) {
      console.error("Cache set error:", error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key) {
    try {
      // Delete from L1
      this.memoryCache.delete(key);

      // Delete from L2
      if (this.client && this.client.isOpen) {
        await this.client.del(key);
      }

      return true;
    } catch (error) {
      console.error("Cache delete error:", error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern
   */
  async deletePattern(pattern) {
    try {
      // Clear matching keys from L1
      for (const key of this.memoryCache.keys()) {
        if (this.matchPattern(key, pattern)) {
          this.memoryCache.delete(key);
        }
      }

      // Clear from L2
      if (this.client && this.client.isOpen) {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(keys);
        }
      }

      return true;
    } catch (error) {
      console.error("Cache delete pattern error:", error);
      return false;
    }
  }

  /**
   * Get or set pattern (cache-aside)
   */
  async getOrSet(key, fetchFunction, ttl = this.defaultTTL) {
    try {
      // Try to get from cache
      const cached = await this.get(key);
      if (cached !== null) {
        return { value: cached, fromCache: true };
      }

      // Fetch fresh data
      const value = await fetchFunction();

      // Store in cache
      await this.set(key, value, ttl);

      return { value, fromCache: false };
    } catch (error) {
      console.error("Cache getOrSet error:", error);
      // Return fresh data on error
      const value = await fetchFunction();
      return { value, fromCache: false };
    }
  }

  /**
   * Increment counter
   */
  async increment(key, amount = 1, ttl = this.defaultTTL) {
    try {
      if (this.client && this.client.isOpen) {
        const value = await this.client.incrBy(key, amount);
        await this.client.expire(key, ttl);
        return value;
      }
      return null;
    } catch (error) {
      console.error("Cache increment error:", error);
      return null;
    }
  }

  /**
   * Set with expiry at specific time
   */
  async setExpireAt(key, value, timestamp) {
    try {
      if (this.client && this.client.isOpen) {
        await this.client.set(key, JSON.stringify(value));
        await this.client.expireAt(key, timestamp);
      }
      return true;
    } catch (error) {
      console.error("Cache setExpireAt error:", error);
      return false;
    }
  }

  /**
   * Get multiple keys at once
   */
  async mget(keys) {
    try {
      if (this.client && this.client.isOpen) {
        const values = await this.client.mGet(keys);
        return values.map((v) => (v ? JSON.parse(v) : null));
      }
      return keys.map(() => null);
    } catch (error) {
      console.error("Cache mget error:", error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple keys at once
   */
  async mset(keyValuePairs, ttl = this.defaultTTL) {
    try {
      if (this.client && this.client.isOpen) {
        const pipeline = this.client.multi();

        for (const [key, value] of Object.entries(keyValuePairs)) {
          pipeline.setEx(key, ttl, JSON.stringify(value));
        }

        await pipeline.exec();
      }
      return true;
    } catch (error) {
      console.error("Cache mset error:", error);
      return false;
    }
  }

  /**
   * Cache warming - preload frequently accessed data
   */
  async warmCache(dataLoader, keys, ttl = this.defaultTTL) {
    try {
      const data = await dataLoader(keys);
      const keyValuePairs = {};

      keys.forEach((key, index) => {
        if (data[index]) {
          keyValuePairs[key] = data[index];
        }
      });

      await this.mset(keyValuePairs, ttl);

      return {
        warmed: Object.keys(keyValuePairs).length,
        total: keys.length,
      };
    } catch (error) {
      console.error("Cache warming error:", error);
      return { warmed: 0, total: keys.length };
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      const stats = {
        memory_cache_size: this.memoryCache.size,
        memory_cache_max: this.memoryCacheMaxSize,
      };

      if (this.client && this.client.isOpen) {
        const info = await this.client.info("stats");
        stats.redis_connected = true;
        stats.redis_info = this.parseRedisInfo(info);
      } else {
        stats.redis_connected = false;
      }

      return stats;
    } catch (error) {
      console.error("Get stats error:", error);
      return {
        memory_cache_size: this.memoryCache.size,
        redis_connected: false,
      };
    }
  }

  /**
   * Clear all cache
   */
  async clear() {
    try {
      // Clear L1
      this.memoryCache.clear();

      // Clear L2
      if (this.client && this.client.isOpen) {
        await this.client.flushDb();
      }

      return true;
    } catch (error) {
      console.error("Cache clear error:", error);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect() {
    try {
      if (this.client && this.client.isOpen) {
        await this.client.quit();
      }
    } catch (error) {
      console.error("Redis disconnect error:", error);
    }
  }

  // Helper methods

  setMemoryCache(key, value, ttl) {
    // Implement LRU eviction if cache is full
    if (this.memoryCache.size >= this.memoryCacheMaxSize) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }

    this.memoryCache.set(key, {
      value,
      expires: Date.now() + ttl * 1000,
    });
  }

  matchPattern(key, pattern) {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    return regex.test(key);
  }

  parseRedisInfo(info) {
    const lines = info.split("\r\n");
    const stats = {};

    lines.forEach((line) => {
      if (line && !line.startsWith("#")) {
        const [key, value] = line.split(":");
        if (key && value) {
          stats[key] = value;
        }
      }
    });

    return stats;
  }

  /**
   * Generate cache key
   */
  static generateKey(prefix, ...parts) {
    return `${prefix}:${parts.join(":")}`;
  }

  /**
   * Cache key patterns for different data types
   */
  static keys = {
    user: (userId) => `user:${userId}`,
    userProfile: (userId) => `user:profile:${userId}`,
    trip: (tripId) => `trip:${tripId}`,
    tripMatches: (tripId) => `trip:matches:${tripId}`,
    officeUsers: (officeId) => `office:users:${officeId}`,
    bikeListings: (officeId) => `bike:listings:${officeId}`,
    bookCatalog: (officeId) => `book:catalog:${officeId}`,
    analytics: (officeId, metric) => `analytics:${officeId}:${metric}`,
  };
}

module.exports = CacheManager;
