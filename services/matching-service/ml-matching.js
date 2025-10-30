/**
 * Machine Learning Enhanced Matching Module
 * Implements user preference learning, predictive demand forecasting, and dynamic pricing
 */

class MLMatchingService {
  constructor(db) {
    this.db = db;
    this.userPreferenceWeights = new Map();
    this.demandForecastCache = new Map();
  }

  /**
   * Learn user preferences from historical trip data
   */
  async learnUserPreferences(userId, officeId) {
    try {
      // Get user's historical trips
      const historicalTrips = await this.db
        .collection("carpool_trips")
        .find({
          office_id: officeId,
          $or: [{ user_id: userId }, { "participants.user_id": userId }],
          status: { $in: ["completed", "active"] },
        })
        .sort({ created_at: -1 })
        .limit(50)
        .toArray();

      if (historicalTrips.length === 0) {
        return this.getDefaultPreferences();
      }

      // Analyze patterns
      const preferences = {
        preferred_departure_times: this.analyzeTimePreferences(historicalTrips),
        preferred_detour_tolerance:
          this.analyzeDetourTolerance(historicalTrips),
        preferred_cost_range: this.analyzeCostPreferences(historicalTrips),
        preferred_group_size: this.analyzeGroupSizePreference(historicalTrips),
        route_efficiency_importance:
          this.analyzeRouteEfficiencyImportance(historicalTrips),
        time_flexibility: this.analyzeTimeFlexibility(historicalTrips),
        social_preferences: await this.analyzeSocialPreferences(
          userId,
          historicalTrips
        ),
      };

      // Cache preferences
      this.userPreferenceWeights.set(userId, preferences);

      return preferences;
    } catch (error) {
      console.error("Error learning user preferences:", error);
      return this.getDefaultPreferences();
    }
  }

  /**
   * Analyze user's preferred departure times
   */
  analyzeTimePreferences(trips) {
    const timeSlots = { morning: 0, midday: 0, evening: 0, night: 0 };

    trips.forEach((trip) => {
      const hour = new Date(trip.departure_time).getHours();
      if (hour >= 6 && hour < 12) timeSlots.morning++;
      else if (hour >= 12 && hour < 17) timeSlots.midday++;
      else if (hour >= 17 && hour < 22) timeSlots.evening++;
      else timeSlots.night++;
    });

    const total = trips.length;
    return {
      morning: timeSlots.morning / total,
      midday: timeSlots.midday / total,
      evening: timeSlots.evening / total,
      night: timeSlots.night / total,
    };
  }

  /**
   * Analyze user's tolerance for detours
   */
  analyzeDetourTolerance(trips) {
    const detours = trips
      .filter((t) => t.route_analysis && t.route_analysis.detour_distance_km)
      .map((t) => t.route_analysis.detour_distance_km);

    if (detours.length === 0) return 5; // Default 5km

    const avgDetour = detours.reduce((a, b) => a + b, 0) / detours.length;
    const maxDetour = Math.max(...detours);

    return Math.round(((avgDetour + maxDetour) / 2) * 100) / 100;
  }

  /**
   * Analyze user's cost preferences
   */
  analyzeCostPreferences(trips) {
    const costs = trips
      .filter((t) => t.cost_per_passenger)
      .map((t) => t.cost_per_passenger);

    if (costs.length === 0) {
      return { min: 0, max: 20, avg: 10 };
    }

    return {
      min: Math.min(...costs),
      max: Math.max(...costs),
      avg: costs.reduce((a, b) => a + b, 0) / costs.length,
    };
  }

  /**
   * Analyze preferred group size
   */
  analyzeGroupSizePreference(trips) {
    const groupSizes = trips
      .filter((t) => t.participants)
      .map((t) => t.participants.length + 1); // +1 for driver

    if (groupSizes.length === 0) return 3;

    return Math.round(
      groupSizes.reduce((a, b) => a + b, 0) / groupSizes.length
    );
  }

  /**
   * Analyze importance of route efficiency
   */
  analyzeRouteEfficiencyImportance(trips) {
    const efficiencies = trips
      .filter((t) => t.route_analysis && t.route_analysis.efficiency_ratio)
      .map((t) => t.route_analysis.efficiency_ratio);

    if (efficiencies.length === 0) return 0.8;

    const avgEfficiency =
      efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length;
    return avgEfficiency;
  }

  /**
   * Analyze time flexibility
   */
  analyzeTimeFlexibility(trips) {
    // Calculate variance in departure times for similar trips
    const timeVariances = [];

    for (let i = 0; i < trips.length - 1; i++) {
      const timeDiff = Math.abs(
        new Date(trips[i].departure_time).getTime() -
          new Date(trips[i + 1].departure_time).getTime()
      );
      timeVariances.push(timeDiff / (60 * 1000)); // Convert to minutes
    }

    if (timeVariances.length === 0) return 30; // Default 30 minutes

    return Math.round(
      timeVariances.reduce((a, b) => a + b, 0) / timeVariances.length
    );
  }

  /**
   * Analyze social preferences (who they prefer to ride with)
   */
  async analyzeSocialPreferences(userId, trips) {
    const coTravelers = new Map();

    trips.forEach((trip) => {
      if (trip.user_id === userId) {
        // User was driver
        trip.participants.forEach((p) => {
          coTravelers.set(p.user_id, (coTravelers.get(p.user_id) || 0) + 1);
        });
      } else {
        // User was passenger
        coTravelers.set(trip.user_id, (coTravelers.get(trip.user_id) || 0) + 1);
      }
    });

    // Convert to array and sort by frequency
    const preferredUsers = Array.from(coTravelers.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([user_id, count]) => ({ user_id, trip_count: count }));

    return preferredUsers;
  }

  /**
   * Get default preferences for new users
   */
  getDefaultPreferences() {
    return {
      preferred_departure_times: {
        morning: 0.4,
        midday: 0.2,
        evening: 0.3,
        night: 0.1,
      },
      preferred_detour_tolerance: 5,
      preferred_cost_range: { min: 0, max: 20, avg: 10 },
      preferred_group_size: 3,
      route_efficiency_importance: 0.8,
      time_flexibility: 30,
      social_preferences: [],
    };
  }

  /**
   * Calculate enhanced match score using ML-based preferences
   */
  async calculateMLMatchScore(trip1, trip2, routeAnalysis, userId) {
    try {
      // Get user preferences
      const preferences = await this.learnUserPreferences(
        userId,
        trip1.office_id
      );

      let score = 0;
      const weights = {
        time: 25,
        route: 25,
        cost: 15,
        social: 15,
        detour: 10,
        reputation: 10,
      };

      // Time compatibility score (weighted by user's time preferences)
      const timeScore = this.calculateTimeScore(trip1, trip2, preferences);
      score += timeScore * weights.time;

      // Route efficiency score
      const routeScore = routeAnalysis.efficiency_ratio || 0.8;
      score += routeScore * weights.route;

      // Cost compatibility score
      const costScore = this.calculateCostScore(
        trip2.cost_per_passenger || 0,
        preferences.preferred_cost_range
      );
      score += costScore * weights.cost;

      // Social preference score
      const socialScore = this.calculateSocialScore(
        trip2.user_id,
        preferences.social_preferences
      );
      score += socialScore * weights.social;

      // Detour tolerance score
      const detourScore = this.calculateDetourScore(
        routeAnalysis.detour_distance_km || 0,
        preferences.preferred_detour_tolerance
      );
      score += detourScore * weights.detour;

      // Reputation score (if available)
      const reputationScore = await this.getReputationScore(trip2.user_id);
      score += reputationScore * weights.reputation;

      return Math.round(score * 100) / 100;
    } catch (error) {
      console.error("Error calculating ML match score:", error);
      return 50; // Default neutral score
    }
  }

  /**
   * Calculate time compatibility score
   */
  calculateTimeScore(trip1, trip2, preferences) {
    try {
      const time1 = new Date(trip1.departure_time);
      const time2 = new Date(trip2.departure_time);

      if (isNaN(time1.getTime()) || isNaN(time2.getTime())) {
        return 0.5; // Default neutral score
      }

      const timeDiff = Math.abs(time1.getTime() - time2.getTime());
      const minutesDiff = timeDiff / (60 * 1000);

      // Apply user's time flexibility
      const flexibilityFactor = preferences.time_flexibility || 30;
      const baseScore = Math.max(0, 1 - minutesDiff / (flexibilityFactor * 2));

      // Apply time slot preference
      const hour = new Date(trip2.departure_time).getHours();
      let timeSlot = "morning";
      if (hour >= 12 && hour < 17) timeSlot = "midday";
      else if (hour >= 17 && hour < 22) timeSlot = "evening";
      else if (hour >= 22 || hour < 6) timeSlot = "night";

      const slotPreference =
        preferences.preferred_departure_times[timeSlot] || 0.25;

      return baseScore * slotPreference;
    } catch (error) {
      return 0.5; // Default neutral score on error
    }
  }

  /**
   * Calculate cost compatibility score
   */
  calculateCostScore(cost, preferredRange) {
    if (cost <= preferredRange.avg) {
      return 1.0; // Perfect score for costs at or below average preference
    }

    const deviation = cost - preferredRange.avg;
    const maxDeviation = preferredRange.max - preferredRange.avg;

    return Math.max(0, 1 - deviation / maxDeviation);
  }

  /**
   * Calculate social preference score
   */
  calculateSocialScore(otherUserId, socialPreferences) {
    if (socialPreferences.length === 0) return 0.5; // Neutral for new users

    const preferredUser = socialPreferences.find(
      (p) => p.user_id === otherUserId
    );

    if (preferredUser) {
      // Higher score for frequently traveled companions
      const maxTripCount = socialPreferences[0].trip_count;
      return preferredUser.trip_count / maxTripCount;
    }

    return 0.3; // Lower score for unknown users
  }

  /**
   * Calculate detour tolerance score
   */
  calculateDetourScore(actualDetour, toleranceKm) {
    if (actualDetour <= toleranceKm) {
      return 1.0;
    }

    const excess = actualDetour - toleranceKm;
    return Math.max(0, 1 - excess / toleranceKm);
  }

  /**
   * Get user reputation score
   */
  async getReputationScore(userId) {
    try {
      const user = await this.db
        .collection("users")
        .findOne({ user_id: userId });
      if (user && user.reputation_score) {
        return user.reputation_score / 5; // Normalize to 0-1 scale (assuming 5-star system)
      }
      return 0.5; // Default neutral score
    } catch (error) {
      return 0.5;
    }
  }

  /**
   * Predict demand for carpooling at specific times
   */
  async predictDemand(officeId, targetDate, direction) {
    try {
      const cacheKey = `${officeId}_${targetDate}_${direction}`;

      // Check cache
      if (this.demandForecastCache.has(cacheKey)) {
        const cached = this.demandForecastCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 3600000) {
          // 1 hour cache
          return cached.forecast;
        }
      }

      // Get historical data for the same day of week and time
      const targetDay = new Date(targetDate);
      const dayOfWeek = targetDay.getDay();
      const hour = targetDay.getHours();

      const historicalTrips = await this.db
        .collection("carpool_trips")
        .find({
          office_id: officeId,
          direction: direction,
          status: { $in: ["completed", "active"] },
        })
        .toArray();

      // Filter trips for same day of week and similar time
      const similarTrips = historicalTrips.filter((trip) => {
        const tripDate = new Date(trip.departure_time);
        const tripDay = tripDate.getDay();
        const tripHour = tripDate.getHours();

        return tripDay === dayOfWeek && Math.abs(tripHour - hour) <= 2;
      });

      // Calculate demand metrics
      const forecast = {
        expected_drivers: this.calculateExpectedCount(
          similarTrips.filter((t) => t.trip_type === "offer")
        ),
        expected_riders: this.calculateExpectedCount(
          similarTrips.filter((t) => t.trip_type === "request")
        ),
        confidence: this.calculateForecastConfidence(similarTrips.length),
        peak_time: this.identifyPeakTime(similarTrips),
        demand_level: this.categorizeDemandLevel(similarTrips.length),
      };

      // Cache the forecast
      this.demandForecastCache.set(cacheKey, {
        forecast,
        timestamp: Date.now(),
      });

      return forecast;
    } catch (error) {
      console.error("Error predicting demand:", error);
      return {
        expected_drivers: 5,
        expected_riders: 10,
        confidence: 0.3,
        peak_time: null,
        demand_level: "medium",
      };
    }
  }

  /**
   * Calculate expected count based on historical data
   */
  calculateExpectedCount(trips) {
    if (trips.length === 0) return 0;

    // Group by week and calculate average
    const weeklyGroups = new Map();
    trips.forEach((trip) => {
      const week = this.getWeekNumber(new Date(trip.departure_time));
      weeklyGroups.set(week, (weeklyGroups.get(week) || 0) + 1);
    });

    const weeklyAverages = Array.from(weeklyGroups.values());
    return Math.round(
      weeklyAverages.reduce((a, b) => a + b, 0) / weeklyAverages.length
    );
  }

  /**
   * Get week number for a date
   */
  getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  /**
   * Calculate forecast confidence
   */
  calculateForecastConfidence(sampleSize) {
    if (sampleSize >= 20) return 0.9;
    if (sampleSize >= 10) return 0.7;
    if (sampleSize >= 5) return 0.5;
    return 0.3;
  }

  /**
   * Identify peak demand time
   */
  identifyPeakTime(trips) {
    const hourCounts = new Map();

    trips.forEach((trip) => {
      const hour = new Date(trip.departure_time).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    if (hourCounts.size === 0) return null;

    const peakHour = Array.from(hourCounts.entries()).reduce((a, b) =>
      a[1] > b[1] ? a : b
    )[0];

    return `${peakHour}:00`;
  }

  /**
   * Categorize demand level
   */
  categorizeDemandLevel(tripCount) {
    if (tripCount >= 15) return "high";
    if (tripCount >= 8) return "medium";
    if (tripCount >= 3) return "low";
    return "very_low";
  }

  /**
   * Calculate dynamic pricing based on demand
   */
  async calculateDynamicPrice(basePrice, officeId, targetDate, direction) {
    try {
      const demand = await this.predictDemand(officeId, targetDate, direction);

      let priceMultiplier = 1.0;

      // Adjust based on demand level
      switch (demand.demand_level) {
        case "high":
          priceMultiplier = 1.3; // 30% increase
          break;
        case "medium":
          priceMultiplier = 1.1; // 10% increase
          break;
        case "low":
          priceMultiplier = 0.9; // 10% decrease
          break;
        case "very_low":
          priceMultiplier = 0.8; // 20% decrease
          break;
      }

      // Adjust based on supply-demand ratio
      const supplyDemandRatio =
        demand.expected_drivers / Math.max(demand.expected_riders, 1);

      if (supplyDemandRatio < 0.5) {
        priceMultiplier *= 1.2; // High demand, low supply
      } else if (supplyDemandRatio > 2) {
        priceMultiplier *= 0.85; // Low demand, high supply
      }

      const dynamicPrice = Math.round(basePrice * priceMultiplier * 100) / 100;

      return {
        base_price: basePrice,
        dynamic_price: dynamicPrice,
        multiplier: priceMultiplier,
        demand_forecast: demand,
        savings_potential: basePrice - dynamicPrice,
      };
    } catch (error) {
      console.error("Error calculating dynamic price:", error);
      return {
        base_price: basePrice,
        dynamic_price: basePrice,
        multiplier: 1.0,
        demand_forecast: null,
        savings_potential: 0,
      };
    }
  }
}

module.exports = MLMatchingService;
