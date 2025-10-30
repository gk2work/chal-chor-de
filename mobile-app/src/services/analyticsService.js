import { apiService } from "./api";

class AnalyticsService {
  constructor() {
    this.sessionStart = Date.now();
    this.screenStartTime = null;
    this.currentScreen = null;
  }

  // Track screen view
  trackScreenView(screenName, module = "general") {
    // Calculate time spent on previous screen
    if (this.currentScreen && this.screenStartTime) {
      const duration = Date.now() - this.screenStartTime;
      this.trackEvent("screen_exit", this.currentScreen.module, {
        screen: this.currentScreen.name,
        action: "exit",
        duration_ms: duration,
      });
    }

    // Track new screen view
    this.currentScreen = { name: screenName, module };
    this.screenStartTime = Date.now();

    this.trackEvent("screen_view", module, {
      screen: screenName,
      action: "view",
    });
  }

  // Track user action
  trackAction(action, module, screen, metadata = {}) {
    this.trackEvent("user_action", module, {
      screen,
      action,
      metadata,
    });
  }

  // Track feature usage
  trackFeatureUsage(feature, module, metadata = {}) {
    this.trackEvent("feature_used", module, {
      action: feature,
      metadata,
    });
  }

  // Track button click
  trackButtonClick(buttonName, screen, module) {
    this.trackEvent("button_click", module, {
      screen,
      action: buttonName,
    });
  }

  // Track error
  trackError(errorType, errorMessage, screen, module) {
    this.trackEvent("error", module, {
      screen,
      action: "error_occurred",
      metadata: {
        error_type: errorType,
        error_message: errorMessage,
      },
    });
  }

  // Track search
  trackSearch(query, module, resultsCount) {
    this.trackEvent("search", module, {
      action: "search_performed",
      metadata: {
        query,
        results_count: resultsCount,
      },
    });
  }

  // Track transaction completion
  trackTransactionComplete(transactionType, module, metadata = {}) {
    this.trackEvent("transaction_complete", module, {
      action: transactionType,
      metadata,
    });
  }

  // Generic event tracking
  async trackEvent(eventType, module, data = {}) {
    try {
      const eventData = {
        event_type: eventType,
        module,
        screen: data.screen || this.currentScreen?.name,
        action: data.action,
        metadata: data.metadata || {},
        duration_ms: data.duration_ms,
      };

      await apiService.feedback.trackBehavior(eventData);
    } catch (error) {
      // Silently fail - don't disrupt user experience
      console.log("Analytics tracking failed:", error.message);
    }
  }

  // Track UX metrics
  async trackUXMetric(
    metricType,
    value,
    screen,
    module = "general",
    metadata = {}
  ) {
    try {
      await apiService.feedback.trackUXMetric({
        metric_type: metricType,
        value,
        screen,
        module,
        metadata,
      });
    } catch (error) {
      console.log("UX metric tracking failed:", error.message);
    }
  }

  // Track page load time
  trackPageLoadTime(screen, module, loadTime) {
    this.trackUXMetric("page_load_time", loadTime, screen, module);
  }

  // Track API response time
  trackAPIResponseTime(endpoint, responseTime) {
    this.trackUXMetric(
      "api_response_time",
      responseTime,
      this.currentScreen?.name,
      "api",
      {
        endpoint,
      }
    );
  }

  // Track app crash
  trackCrash(error, screen) {
    this.trackError("crash", error.message, screen, "general");
  }

  // Get session duration
  getSessionDuration() {
    return Date.now() - this.sessionStart;
  }

  // Reset session
  resetSession() {
    this.sessionStart = Date.now();
    this.screenStartTime = null;
    this.currentScreen = null;
  }
}

// Create singleton instance
const analyticsService = new AnalyticsService();

export default analyticsService;

// Helper HOC for tracking screen views
export const withAnalytics = (WrappedComponent, screenName, module) => {
  return (props) => {
    React.useEffect(() => {
      const startTime = Date.now();
      analyticsService.trackScreenView(screenName, module);

      return () => {
        const loadTime = Date.now() - startTime;
        analyticsService.trackPageLoadTime(screenName, module, loadTime);
      };
    }, []);

    return <WrappedComponent {...props} />;
  };
};
