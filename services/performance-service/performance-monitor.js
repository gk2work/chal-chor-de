/**
 * Performance Monitoring Service
 * Tracks and analyzes system performance metrics
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.alerts = [];
    this.thresholds = {
      response_time: 1000, // 1 second
      error_rate: 0.05, // 5%
      cpu_usage: 80, // 80%
      memory_usage: 85, // 85%
      db_query_time: 100, // 100ms
    };
  }

  /**
   * Record API endpoint performance
   */
  recordEndpointMetric(endpoint, method, duration, statusCode) {
    const key = `${method}:${endpoint}`;

    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        endpoint,
        method,
        requests: 0,
        total_duration: 0,
        avg_duration: 0,
        min_duration: Infinity,
        max_duration: 0,
        success_count: 0,
        error_count: 0,
        status_codes: {},
      });
    }

    const metric = this.metrics.get(key);
    metric.requests++;
    metric.total_duration += duration;
    metric.avg_duration = metric.total_duration / metric.requests;
    metric.min_duration = Math.min(metric.min_duration, duration);
    metric.max_duration = Math.max(metric.max_duration, duration);

    if (statusCode >= 200 && statusCode < 400) {
      metric.success_count++;
    } else {
      metric.error_count++;
    }

    metric.status_codes[statusCode] =
      (metric.status_codes[statusCode] || 0) + 1;

    // Check for performance issues
    this.checkPerformanceThresholds(key, metric);
  }

  /**
   * Check if metrics exceed thresholds
   */
  checkPerformanceThresholds(key, metric) {
    // Check response time
    if (metric.avg_duration > this.thresholds.response_time) {
      this.createAlert({
        type: "SLOW_ENDPOINT",
        severity: "WARNING",
        endpoint: key,
        message: `Average response time ${metric.avg_duration}ms exceeds threshold`,
        metric: metric.avg_duration,
        threshold: this.thresholds.response_time,
      });
    }

    // Check error rate
    const errorRate = metric.error_count / metric.requests;
    if (errorRate > this.thresholds.error_rate) {
      this.createAlert({
        type: "HIGH_ERROR_RATE",
        severity: "CRITICAL",
        endpoint: key,
        message: `Error rate ${(errorRate * 100).toFixed(2)}% exceeds threshold`,
        metric: errorRate,
        threshold: this.thresholds.error_rate,
      });
    }
  }

  /**
   * Create performance alert
   */
  createAlert(alert) {
    alert.timestamp = new Date();
    alert.id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check if similar alert exists recently (within 5 minutes)
    const recentAlert = this.alerts.find(
      (a) =>
        a.type === alert.type &&
        a.endpoint === alert.endpoint &&
        Date.now() - a.timestamp.getTime() < 300000
    );

    if (!recentAlert) {
      this.alerts.push(alert);
      console.warn(`⚠️ Performance Alert: ${alert.message}`);
    }
  }

  /**
   * Get endpoint metrics
   */
  getEndpointMetrics(endpoint = null) {
    if (endpoint) {
      return Array.from(this.metrics.values()).filter((m) =>
        m.endpoint.includes(endpoint)
      );
    }
    return Array.from(this.metrics.values());
  }

  /**
   * Get slowest endpoints
   */
  getSlowestEndpoints(limit = 10) {
    return Array.from(this.metrics.values())
      .sort((a, b) => b.avg_duration - a.avg_duration)
      .slice(0, limit);
  }

  /**
   * Get endpoints with highest error rates
   */
  getHighestErrorRates(limit = 10) {
    return Array.from(this.metrics.values())
      .map((m) => ({
        ...m,
        error_rate: m.error_count / m.requests,
      }))
      .sort((a, b) => b.error_rate - a.error_rate)
      .slice(0, limit);
  }

  /**
   * Get most frequently called endpoints
   */
  getMostFrequentEndpoints(limit = 10) {
    return Array.from(this.metrics.values())
      .sort((a, b) => b.requests - a.requests)
      .slice(0, limit);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const allMetrics = Array.from(this.metrics.values());

    if (allMetrics.length === 0) {
      return {
        total_requests: 0,
        avg_response_time: 0,
        overall_error_rate: 0,
        total_endpoints: 0,
      };
    }

    const totalRequests = allMetrics.reduce((sum, m) => sum + m.requests, 0);
    const totalDuration = allMetrics.reduce(
      (sum, m) => sum + m.total_duration,
      0
    );
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.error_count, 0);

    return {
      total_requests: totalRequests,
      avg_response_time: totalRequests > 0 ? totalDuration / totalRequests : 0,
      overall_error_rate: totalRequests > 0 ? totalErrors / totalRequests : 0,
      total_endpoints: allMetrics.length,
      slowest_endpoints: this.getSlowestEndpoints(5),
      highest_error_rates: this.getHighestErrorRates(5),
      most_frequent: this.getMostFrequentEndpoints(5),
    };
  }

  /**
   * Record database query performance
   */
  recordDatabaseMetric(collection, operation, duration) {
    const key = `db:${collection}:${operation}`;

    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        collection,
        operation,
        queries: 0,
        total_duration: 0,
        avg_duration: 0,
        min_duration: Infinity,
        max_duration: 0,
      });
    }

    const metric = this.metrics.get(key);
    metric.queries++;
    metric.total_duration += duration;
    metric.avg_duration = metric.total_duration / metric.queries;
    metric.min_duration = Math.min(metric.min_duration, duration);
    metric.max_duration = Math.max(metric.max_duration, duration);

    // Check for slow queries
    if (duration > this.thresholds.db_query_time) {
      this.createAlert({
        type: "SLOW_QUERY",
        severity: "WARNING",
        collection,
        operation,
        message: `Database query took ${duration}ms`,
        metric: duration,
        threshold: this.thresholds.db_query_time,
      });
    }
  }

  /**
   * Get database metrics
   */
  getDatabaseMetrics() {
    return Array.from(this.metrics.values()).filter((m) => m.collection);
  }

  /**
   * Record system resource usage
   */
  recordSystemMetrics(metrics) {
    const key = "system:resources";

    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        samples: [],
        max_samples: 100,
      });
    }

    const systemMetrics = this.metrics.get(key);
    systemMetrics.samples.push({
      timestamp: new Date(),
      cpu_usage: metrics.cpu_usage,
      memory_usage: metrics.memory_usage,
      memory_total: metrics.memory_total,
      memory_used: metrics.memory_used,
    });

    // Keep only last N samples
    if (systemMetrics.samples.length > systemMetrics.max_samples) {
      systemMetrics.samples.shift();
    }

    // Check thresholds
    if (metrics.cpu_usage > this.thresholds.cpu_usage) {
      this.createAlert({
        type: "HIGH_CPU_USAGE",
        severity: "WARNING",
        message: `CPU usage ${metrics.cpu_usage}% exceeds threshold`,
        metric: metrics.cpu_usage,
        threshold: this.thresholds.cpu_usage,
      });
    }

    if (metrics.memory_usage > this.thresholds.memory_usage) {
      this.createAlert({
        type: "HIGH_MEMORY_USAGE",
        severity: "WARNING",
        message: `Memory usage ${metrics.memory_usage}% exceeds threshold`,
        metric: metrics.memory_usage,
        threshold: this.thresholds.memory_usage,
      });
    }
  }

  /**
   * Get system metrics
   */
  getSystemMetrics() {
    const key = "system:resources";
    const systemMetrics = this.metrics.get(key);

    if (!systemMetrics || systemMetrics.samples.length === 0) {
      return null;
    }

    const samples = systemMetrics.samples;
    const latest = samples[samples.length - 1];

    return {
      current: latest,
      avg_cpu: this.calculateAverage(samples, "cpu_usage"),
      avg_memory: this.calculateAverage(samples, "memory_usage"),
      max_cpu: Math.max(...samples.map((s) => s.cpu_usage)),
      max_memory: Math.max(...samples.map((s) => s.memory_usage)),
      samples_count: samples.length,
    };
  }

  /**
   * Calculate average of a metric
   */
  calculateAverage(samples, field) {
    if (samples.length === 0) return 0;
    const sum = samples.reduce((acc, s) => acc + s[field], 0);
    return sum / samples.length;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(severity = null) {
    const fiveMinutesAgo = Date.now() - 300000;

    let alerts = this.alerts.filter(
      (a) => a.timestamp.getTime() > fiveMinutesAgo
    );

    if (severity) {
      alerts = alerts.filter((a) => a.severity === severity);
    }

    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clear old alerts
   */
  clearOldAlerts() {
    const oneHourAgo = Date.now() - 3600000;
    this.alerts = this.alerts.filter((a) => a.timestamp.getTime() > oneHourAgo);
  }

  /**
   * Generate performance report
   */
  generateReport(startTime, endTime) {
    return {
      period: {
        start: startTime,
        end: endTime,
      },
      summary: this.getPerformanceSummary(),
      database: {
        metrics: this.getDatabaseMetrics(),
        slow_queries: this.getDatabaseMetrics()
          .filter((m) => m.avg_duration > this.thresholds.db_query_time)
          .sort((a, b) => b.avg_duration - a.avg_duration),
      },
      system: this.getSystemMetrics(),
      alerts: {
        total: this.alerts.length,
        by_severity: this.groupAlertsBySeverity(),
        by_type: this.groupAlertsByType(),
        recent: this.getActiveAlerts(),
      },
      recommendations: this.generateRecommendations(),
    };
  }

  /**
   * Group alerts by severity
   */
  groupAlertsBySeverity() {
    const grouped = {};
    this.alerts.forEach((alert) => {
      grouped[alert.severity] = (grouped[alert.severity] || 0) + 1;
    });
    return grouped;
  }

  /**
   * Group alerts by type
   */
  groupAlertsByType() {
    const grouped = {};
    this.alerts.forEach((alert) => {
      grouped[alert.type] = (grouped[alert.type] || 0) + 1;
    });
    return grouped;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    // Check slow endpoints
    const slowEndpoints = this.getSlowestEndpoints(3);
    if (slowEndpoints.length > 0 && slowEndpoints[0].avg_duration > 500) {
      recommendations.push({
        priority: "HIGH",
        category: "PERFORMANCE",
        recommendation: "Optimize slow endpoints",
        details: `${slowEndpoints.length} endpoints have avg response time > 500ms`,
        affected_endpoints: slowEndpoints.map((e) => e.endpoint),
      });
    }

    // Check error rates
    const highErrorRates = this.getHighestErrorRates(3);
    if (highErrorRates.length > 0 && highErrorRates[0].error_rate > 0.1) {
      recommendations.push({
        priority: "CRITICAL",
        category: "RELIABILITY",
        recommendation: "Investigate high error rates",
        details: `${highErrorRates.length} endpoints have error rate > 10%`,
        affected_endpoints: highErrorRates.map((e) => e.endpoint),
      });
    }

    // Check system resources
    const systemMetrics = this.getSystemMetrics();
    if (systemMetrics && systemMetrics.avg_cpu > 70) {
      recommendations.push({
        priority: "MEDIUM",
        category: "RESOURCES",
        recommendation: "Consider scaling up CPU resources",
        details: `Average CPU usage is ${systemMetrics.avg_cpu.toFixed(2)}%`,
      });
    }

    return recommendations;
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics.clear();
    this.alerts = [];
  }
}

module.exports = PerformanceMonitor;
