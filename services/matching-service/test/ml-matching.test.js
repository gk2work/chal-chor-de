const MLMatchingService = require("../ml-matching");

// Mock database
const mockDb = {
  collection: (name) => ({
    find: jest.fn().mockImplementation((query) => ({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue(mockData[name] || []),
    })),
    findOne: jest.fn().mockImplementation((query) => {
      const collection = mockData[name] || [];
      return Promise.resolve(
        collection.find((item) => {
          if (query.user_id) return item.user_id === query.user_id;
          return false;
        })
      );
    }),
    countDocuments: jest.fn().mockResolvedValue(0),
  }),
};

// Mock data
const mockData = {
  carpool_trips: [],
  users: [],
};

describe("ML Matching Service", () => {
  let mlService;

  beforeEach(() => {
    mlService = new MLMatchingService(mockDb);
    mockData.carpool_trips = [];
    mockData.users = [];
  });

  describe("User Preference Learning", () => {
    it("should learn user preferences from historical trips", async () => {
      // Add historical trips
      mockData.carpool_trips = [
        {
          user_id: "user_001",
          office_id: "office_001",
          departure_time: new Date("2025-10-30T08:00:00Z"),
          status: "completed",
          participants: [{ user_id: "user_002" }],
          cost_per_passenger: 8.5,
          route_analysis: {
            detour_distance_km: 3.2,
            efficiency_ratio: 0.85,
          },
        },
        {
          user_id: "user_001",
          office_id: "office_001",
          departure_time: new Date("2025-10-30T08:15:00Z"),
          status: "completed",
          participants: [{ user_id: "user_003" }],
          cost_per_passenger: 7.0,
          route_analysis: {
            detour_distance_km: 2.5,
            efficiency_ratio: 0.9,
          },
        },
        {
          user_id: "user_001",
          office_id: "office_001",
          departure_time: new Date("2025-10-30T17:30:00Z"),
          status: "completed",
          participants: [],
          cost_per_passenger: 9.0,
          route_analysis: {
            detour_distance_km: 4.0,
            efficiency_ratio: 0.8,
          },
        },
      ];

      const preferences = await mlService.learnUserPreferences(
        "user_001",
        "office_001"
      );

      expect(preferences).toBeDefined();
      expect(preferences.preferred_departure_times).toBeDefined();
      expect(preferences.preferred_detour_tolerance).toBeGreaterThan(0);
      expect(preferences.preferred_cost_range).toBeDefined();
      expect(preferences.preferred_cost_range.avg).toBeGreaterThan(0);
    });

    it("should return default preferences for new users", async () => {
      mockData.carpool_trips = [];

      const preferences = await mlService.learnUserPreferences(
        "new_user",
        "office_001"
      );

      expect(preferences).toBeDefined();
      expect(preferences.preferred_departure_times.morning).toBe(0.4);
      expect(preferences.preferred_detour_tolerance).toBe(5);
      expect(preferences.time_flexibility).toBe(30);
    });

    it("should analyze time preferences correctly", () => {
      const trips = [
        { departure_time: new Date("2025-10-30T08:00:00Z") }, // morning (UTC 8am)
        { departure_time: new Date("2025-10-30T08:30:00Z") }, // morning
        { departure_time: new Date("2025-10-30T17:00:00Z") }, // evening
        { departure_time: new Date("2025-10-30T13:00:00Z") }, // midday
      ];

      const timePrefs = mlService.analyzeTimePreferences(trips);

      // Verify the structure and values are reasonable
      expect(timePrefs.morning).toBeGreaterThanOrEqual(0);
      expect(timePrefs.evening).toBeGreaterThanOrEqual(0);
      expect(timePrefs.midday).toBeGreaterThanOrEqual(0);
      expect(timePrefs.night).toBeGreaterThanOrEqual(0);

      // Sum should equal 1
      const sum =
        timePrefs.morning +
        timePrefs.midday +
        timePrefs.evening +
        timePrefs.night;
      expect(sum).toBeCloseTo(1, 2);
    });

    it("should analyze detour tolerance", () => {
      const trips = [
        { route_analysis: { detour_distance_km: 2.0 } },
        { route_analysis: { detour_distance_km: 4.0 } },
        { route_analysis: { detour_distance_km: 3.0 } },
      ];

      const tolerance = mlService.analyzeDetourTolerance(trips);

      expect(tolerance).toBeGreaterThan(0);
      expect(tolerance).toBeLessThanOrEqual(4.0);
    });

    it("should analyze cost preferences", () => {
      const trips = [
        { cost_per_passenger: 5.0 },
        { cost_per_passenger: 10.0 },
        { cost_per_passenger: 7.5 },
      ];

      const costPrefs = mlService.analyzeCostPreferences(trips);

      expect(costPrefs.min).toBe(5.0);
      expect(costPrefs.max).toBe(10.0);
      expect(costPrefs.avg).toBe(7.5);
    });
  });

  describe("ML Match Score Calculation", () => {
    beforeEach(() => {
      mockData.users = [
        {
          user_id: "user_002",
          reputation_score: 4.5,
        },
      ];
    });

    it("should calculate ML match score with user preferences", async () => {
      const trip1 = {
        office_id: "office_001",
        user_id: "user_001",
        departure_time: new Date("2025-10-30T08:00:00Z"),
        cost_per_passenger: 8.0,
      };

      const trip2 = {
        user_id: "user_002",
        departure_time: new Date("2025-10-30T08:10:00Z"),
        cost_per_passenger: 7.5,
      };

      const routeAnalysis = {
        efficiency_ratio: 0.85,
        detour_distance_km: 3.0,
      };

      mockData.carpool_trips = [
        {
          user_id: "user_001",
          office_id: "office_001",
          departure_time: new Date("2025-10-29T08:00:00Z"),
          status: "completed",
          participants: [],
          cost_per_passenger: 8.0,
          route_analysis: { detour_distance_km: 3.0, efficiency_ratio: 0.85 },
        },
      ];

      const score = await mlService.calculateMLMatchScore(
        trip1,
        trip2,
        routeAnalysis,
        "user_001"
      );

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should calculate time score based on flexibility", () => {
      const trip1 = {
        departure_time: new Date("2025-10-30T08:00:00Z"),
      };

      const trip2 = {
        departure_time: new Date("2025-10-30T08:15:00Z"),
      };

      const preferences = {
        time_flexibility: 30,
        preferred_departure_times: {
          morning: 0.8,
          midday: 0.2,
          evening: 0.0,
          night: 0.0,
        },
      };

      const timeScore = mlService.calculateTimeScore(trip1, trip2, preferences);

      expect(timeScore).toBeGreaterThan(0);
      expect(timeScore).toBeLessThanOrEqual(1);
    });

    it("should calculate cost score based on preferences", () => {
      const preferredRange = { min: 5, max: 15, avg: 10 };

      const score1 = mlService.calculateCostScore(8, preferredRange);
      expect(score1).toBe(1.0); // Below average

      const score2 = mlService.calculateCostScore(12, preferredRange);
      expect(score2).toBeGreaterThan(0);
      expect(score2).toBeLessThan(1);
    });

    it("should calculate social preference score", () => {
      const socialPrefs = [
        { user_id: "user_002", trip_count: 10 },
        { user_id: "user_003", trip_count: 5 },
      ];

      const score1 = mlService.calculateSocialScore("user_002", socialPrefs);
      expect(score1).toBe(1.0); // Most frequent

      const score2 = mlService.calculateSocialScore("user_003", socialPrefs);
      expect(score2).toBe(0.5); // Half as frequent

      const score3 = mlService.calculateSocialScore("user_999", socialPrefs);
      expect(score3).toBe(0.3); // Unknown user
    });

    it("should calculate detour score", () => {
      const score1 = mlService.calculateDetourScore(3, 5);
      expect(score1).toBe(1.0); // Within tolerance

      const score2 = mlService.calculateDetourScore(7, 5);
      expect(score2).toBeGreaterThan(0);
      expect(score2).toBeLessThan(1); // Exceeds tolerance
    });
  });

  describe("Demand Forecasting", () => {
    it("should predict demand based on historical data", async () => {
      // Add historical trips for same day of week
      const targetDate = new Date("2025-10-30T08:00:00Z"); // Thursday

      mockData.carpool_trips = [
        {
          office_id: "office_001",
          direction: "to_office",
          trip_type: "offer",
          status: "completed",
          departure_time: new Date("2025-10-23T08:00:00Z"), // Previous Thursday
        },
        {
          office_id: "office_001",
          direction: "to_office",
          trip_type: "offer",
          status: "completed",
          departure_time: new Date("2025-10-23T08:15:00Z"),
        },
        {
          office_id: "office_001",
          direction: "to_office",
          trip_type: "request",
          status: "completed",
          departure_time: new Date("2025-10-23T08:00:00Z"),
        },
      ];

      const forecast = await mlService.predictDemand(
        "office_001",
        targetDate,
        "to_office"
      );

      expect(forecast).toBeDefined();
      expect(forecast.expected_drivers).toBeGreaterThanOrEqual(0);
      expect(forecast.expected_riders).toBeGreaterThanOrEqual(0);
      expect(forecast.confidence).toBeGreaterThan(0);
      expect(forecast.demand_level).toBeDefined();
    });

    it("should categorize demand levels correctly", () => {
      expect(mlService.categorizeDemandLevel(20)).toBe("high");
      expect(mlService.categorizeDemandLevel(10)).toBe("medium");
      expect(mlService.categorizeDemandLevel(5)).toBe("low");
      expect(mlService.categorizeDemandLevel(1)).toBe("very_low");
    });

    it("should calculate forecast confidence based on sample size", () => {
      expect(mlService.calculateForecastConfidence(25)).toBe(0.9);
      expect(mlService.calculateForecastConfidence(15)).toBe(0.7);
      expect(mlService.calculateForecastConfidence(7)).toBe(0.5);
      expect(mlService.calculateForecastConfidence(2)).toBe(0.3);
    });

    it("should identify peak demand time", () => {
      const trips = [
        { departure_time: new Date("2025-10-30T08:00:00Z") },
        { departure_time: new Date("2025-10-30T08:15:00Z") },
        { departure_time: new Date("2025-10-30T08:00:00Z") },
        { departure_time: new Date("2025-10-30T09:00:00Z") },
      ];

      const peakTime = mlService.identifyPeakTime(trips);
      // Peak time should be a string in HH:00 format
      expect(peakTime).toMatch(/^\d{1,2}:00$/);
      expect(peakTime).toBeDefined();
    });

    it("should cache demand forecasts", async () => {
      const targetDate = new Date("2025-10-30T08:00:00Z");
      mockData.carpool_trips = [];

      // First call
      const forecast1 = await mlService.predictDemand(
        "office_001",
        targetDate,
        "to_office"
      );

      // Second call should use cache
      const forecast2 = await mlService.predictDemand(
        "office_001",
        targetDate,
        "to_office"
      );

      expect(forecast1).toEqual(forecast2);
    });
  });

  describe("Dynamic Pricing", () => {
    it("should calculate dynamic price based on demand", async () => {
      const basePrice = 10.0;
      const targetDate = new Date("2025-10-30T08:00:00Z");

      mockData.carpool_trips = [
        {
          office_id: "office_001",
          direction: "to_office",
          trip_type: "offer",
          status: "completed",
          departure_time: new Date("2025-10-23T08:00:00Z"),
        },
        {
          office_id: "office_001",
          direction: "to_office",
          trip_type: "request",
          status: "completed",
          departure_time: new Date("2025-10-23T08:00:00Z"),
        },
      ];

      const pricing = await mlService.calculateDynamicPrice(
        basePrice,
        "office_001",
        targetDate,
        "to_office"
      );

      expect(pricing).toBeDefined();
      expect(pricing.base_price).toBe(basePrice);
      expect(pricing.dynamic_price).toBeGreaterThan(0);
      expect(pricing.multiplier).toBeGreaterThan(0);
      expect(pricing.demand_forecast).toBeDefined();
    });

    it("should increase price for high demand", async () => {
      const basePrice = 10.0;
      const targetDate = new Date("2025-10-30T08:00:00Z");

      // Create high demand scenario (many riders, few drivers)
      mockData.carpool_trips = Array(20)
        .fill(null)
        .map((_, i) => ({
          office_id: "office_001",
          direction: "to_office",
          trip_type: i < 5 ? "offer" : "request", // 5 drivers, 15 riders
          status: "completed",
          departure_time: new Date("2025-10-23T08:00:00Z"),
        }));

      const pricing = await mlService.calculateDynamicPrice(
        basePrice,
        "office_001",
        targetDate,
        "to_office"
      );

      expect(pricing.dynamic_price).toBeGreaterThanOrEqual(basePrice);
      expect(pricing.multiplier).toBeGreaterThanOrEqual(1.0);
    });

    it("should decrease price for low demand", async () => {
      const basePrice = 10.0;
      const targetDate = new Date("2025-10-30T08:00:00Z");

      // Create low demand scenario
      mockData.carpool_trips = [
        {
          office_id: "office_001",
          direction: "to_office",
          trip_type: "offer",
          status: "completed",
          departure_time: new Date("2025-10-23T08:00:00Z"),
        },
      ];

      const pricing = await mlService.calculateDynamicPrice(
        basePrice,
        "office_001",
        targetDate,
        "to_office"
      );

      expect(pricing.dynamic_price).toBeLessThanOrEqual(basePrice);
      expect(pricing.multiplier).toBeLessThanOrEqual(1.0);
    });
  });

  describe("Helper Functions", () => {
    it("should calculate week number correctly", () => {
      const date1 = new Date("2025-01-01");
      const week1 = mlService.getWeekNumber(date1);
      expect(week1).toBeGreaterThan(0);

      const date2 = new Date("2025-12-31");
      const week2 = mlService.getWeekNumber(date2);
      expect(week2).toBeGreaterThan(week1);
    });

    it("should handle errors gracefully", async () => {
      // Test with invalid data
      const result = await mlService.calculateMLMatchScore(
        { office_id: "test" },
        { user_id: "test" },
        { efficiency_ratio: 0.8 },
        "invalid_user"
      );

      // Should return a valid number (default neutral score)
      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });
});
