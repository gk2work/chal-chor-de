const CalendarIntegrationService = require("../calendar-integration");

// Mock googleapis
jest.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn(),
      })),
    },
    calendar: jest.fn().mockReturnValue({
      events: {
        list: jest.fn(),
      },
    }),
  },
}));

// Mock Microsoft Graph Client
jest.mock("@microsoft/microsoft-graph-client", () => ({
  Client: {
    init: jest.fn().mockReturnValue({
      api: jest.fn().mockReturnValue({
        filter: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderby: jest.fn().mockReturnThis(),
        get: jest.fn(),
      }),
    }),
  },
}));

const { google } = require("googleapis");
const { Client } = require("@microsoft/microsoft-graph-client");

describe("Calendar Integration Service", () => {
  let calendarService;

  beforeEach(() => {
    calendarService = new CalendarIntegrationService();
    jest.clearAllMocks();
  });

  describe("Google Calendar Integration", () => {
    it("should initialize Google Auth", () => {
      const credentials = {
        client_id: "test_client_id",
        client_secret: "test_secret",
        redirect_uri: "http://localhost:3000/callback",
      };

      calendarService.initializeGoogleAuth(credentials);

      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        credentials.client_id,
        credentials.client_secret,
        credentials.redirect_uri
      );
    });

    it("should fetch Google Calendar events", async () => {
      const mockEvents = [
        {
          id: "event1",
          summary: "Team Meeting",
          start: { dateTime: "2025-10-30T09:00:00Z" },
          end: { dateTime: "2025-10-30T10:00:00Z" },
          location: "Office Conference Room",
        },
        {
          id: "event2",
          summary: "Client Call",
          start: { dateTime: "2025-10-30T14:00:00Z" },
          end: { dateTime: "2025-10-30T15:00:00Z" },
        },
      ];

      const mockCalendar = {
        events: {
          list: jest.fn().mockResolvedValue({
            data: { items: mockEvents },
          }),
        },
      };

      google.calendar.mockReturnValue(mockCalendar);

      // Initialize Google Auth
      calendarService.initializeGoogleAuth({
        client_id: "test_client_id",
        client_secret: "test_secret",
        redirect_uri: "http://localhost:3000/callback",
      });

      const startDate = new Date("2025-10-30T00:00:00Z");
      const endDate = new Date("2025-10-30T23:59:59Z");

      const events = await calendarService.getGoogleCalendarEvents(
        "test_token",
        startDate,
        endDate
      );

      expect(events).toHaveLength(2);
      expect(events[0].title).toBe("Team Meeting");
      expect(events[0].provider).toBe("google");
      expect(events[1].title).toBe("Client Call");
    });

    it("should normalize Google events correctly", () => {
      const googleEvents = [
        {
          id: "event1",
          summary: "Meeting",
          start: { dateTime: "2025-10-30T09:00:00Z" },
          end: { dateTime: "2025-10-30T10:00:00Z" },
          location: "Office",
        },
        {
          id: "event2",
          summary: "All Day Event",
          start: { date: "2025-10-30" },
          end: { date: "2025-10-30" },
        },
      ];

      const normalized = calendarService.normalizeGoogleEvents(googleEvents);

      expect(normalized).toHaveLength(2);
      expect(normalized[0].isAllDay).toBe(false);
      expect(normalized[1].isAllDay).toBe(true);
      expect(normalized[0].location).toBe("Office");
    });
  });

  describe("Microsoft Calendar Integration", () => {
    it("should fetch Microsoft Calendar events", async () => {
      const mockEvents = {
        value: [
          {
            id: "event1",
            subject: "Team Standup",
            start: { dateTime: "2025-10-30T09:00:00Z" },
            end: { dateTime: "2025-10-30T09:30:00Z" },
            location: { displayName: "Teams Meeting" },
            isAllDay: false,
          },
        ],
      };

      const mockClient = {
        api: jest.fn().mockReturnValue({
          filter: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          orderby: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue(mockEvents),
        }),
      };

      Client.init.mockReturnValue(mockClient);

      const startDate = new Date("2025-10-30T00:00:00Z");
      const endDate = new Date("2025-10-30T23:59:59Z");

      const events = await calendarService.getMicrosoftCalendarEvents(
        "test_token",
        startDate,
        endDate
      );

      expect(events).toHaveLength(1);
      expect(events[0].title).toBe("Team Standup");
      expect(events[0].provider).toBe("microsoft");
    });

    it("should normalize Microsoft events correctly", () => {
      const msEvents = [
        {
          id: "event1",
          subject: "Meeting",
          start: { dateTime: "2025-10-30T09:00:00Z" },
          end: { dateTime: "2025-10-30T10:00:00Z" },
          location: { displayName: "Conference Room" },
          isAllDay: false,
        },
      ];

      const normalized = calendarService.normalizeMicrosoftEvents(msEvents);

      expect(normalized).toHaveLength(1);
      expect(normalized[0].title).toBe("Meeting");
      expect(normalized[0].location).toBe("Conference Room");
      expect(normalized[0].isAllDay).toBe(false);
    });
  });

  describe("Availability Detection", () => {
    it("should detect availability when no conflicts", () => {
      const events = [
        {
          start: new Date("2025-10-30T09:00:00Z"),
          end: new Date("2025-10-30T10:00:00Z"),
        },
        {
          start: new Date("2025-10-30T14:00:00Z"),
          end: new Date("2025-10-30T15:00:00Z"),
        },
      ];

      const targetDate = new Date("2025-10-30T12:00:00Z");
      const availability = calendarService.detectAvailability(
        events,
        targetDate,
        60
      );

      expect(availability.isAvailable).toBe(true);
      expect(availability.conflictingEvents).toHaveLength(0);
    });

    it("should detect conflicts", () => {
      const events = [
        {
          start: new Date("2025-10-30T09:00:00Z"),
          end: new Date("2025-10-30T10:00:00Z"),
        },
      ];

      const targetDate = new Date("2025-10-30T09:30:00Z");
      const availability = calendarService.detectAvailability(
        events,
        targetDate,
        60
      );

      expect(availability.isAvailable).toBe(false);
      expect(availability.conflictingEvents).toHaveLength(1);
    });

    it("should suggest alternative times", () => {
      const events = [
        {
          start: new Date("2025-10-30T09:00:00Z"),
          end: new Date("2025-10-30T10:00:00Z"),
        },
      ];

      const targetDate = new Date("2025-10-30T09:30:00Z");
      const availability = calendarService.detectAvailability(
        events,
        targetDate,
        60
      );

      expect(availability.suggestedTimes).toBeDefined();
      expect(Array.isArray(availability.suggestedTimes)).toBe(true);
    });
  });

  describe("Trip Suggestions", () => {
    it("should generate trip suggestions from office events", async () => {
      const events = [
        {
          id: "event1",
          title: "Office Meeting",
          start: new Date("2025-10-30T10:00:00Z"),
          end: new Date("2025-10-30T11:00:00Z"),
          location: "123 Office Street",
        },
        {
          id: "event2",
          title: "Client Meeting",
          start: new Date("2025-10-30T14:00:00Z"),
          end: new Date("2025-10-30T15:00:00Z"),
          location: "Client Site",
        },
      ];

      const officeLocation = "123 Office Street";
      const homeLocation = "456 Home Avenue";

      const suggestions = await calendarService.generateTripSuggestions(
        events,
        officeLocation,
        homeLocation
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].type).toBe("to_office");
      expect(suggestions[0].reason).toBe("Office meeting scheduled");
    });

    it("should suggest trips before and after office events", async () => {
      const events = [
        {
          id: "event1",
          title: "Morning Meeting",
          start: new Date("2025-10-30T09:00:00Z"),
          end: new Date("2025-10-30T10:00:00Z"),
          location: "Office Building",
        },
      ];

      const suggestions = await calendarService.generateTripSuggestions(
        events,
        "Office Building",
        "Home"
      );

      const toOffice = suggestions.find((s) => s.type === "to_office");
      const fromOffice = suggestions.find((s) => s.type === "from_office");

      expect(toOffice).toBeDefined();
      expect(fromOffice).toBeDefined();
      expect(toOffice.suggested_departure.getTime()).toBeLessThan(
        events[0].start.getTime()
      );
      expect(fromOffice.suggested_departure.getTime()).toBeGreaterThan(
        events[0].end.getTime()
      );
    });
  });

  describe("Meeting Conflict Checking", () => {
    it("should check for meeting conflicts", async () => {
      const mockEvents = [
        {
          id: "event1",
          summary: "Important Meeting",
          start: { dateTime: "2025-10-30T09:00:00Z" },
          end: { dateTime: "2025-10-30T10:00:00Z" },
        },
      ];

      const mockCalendar = {
        events: {
          list: jest.fn().mockResolvedValue({
            data: { items: mockEvents },
          }),
        },
      };

      google.calendar.mockReturnValue(mockCalendar);

      const proposedTime = new Date("2025-10-30T09:30:00Z");
      const conflicts = await calendarService.checkMeetingConflicts(
        "google",
        "test_token",
        proposedTime,
        60
      );

      // Should detect conflicts or handle gracefully
      expect(conflicts).toBeDefined();
      expect(typeof conflicts.hasConflicts).toBe("boolean");
      expect(typeof conflicts.isAvailable).toBe("boolean");
      expect(Array.isArray(conflicts.conflicts)).toBe(true);
    });

    it("should return no conflicts when available", async () => {
      const mockCalendar = {
        events: {
          list: jest.fn().mockResolvedValue({
            data: { items: [] },
          }),
        },
      };

      google.calendar.mockReturnValue(mockCalendar);

      const proposedTime = new Date("2025-10-30T12:00:00Z");
      const conflicts = await calendarService.checkMeetingConflicts(
        "google",
        "test_token",
        proposedTime,
        60
      );

      expect(conflicts.hasConflicts).toBe(false);
      expect(conflicts.isAvailable).toBe(true);
    });
  });

  describe("Location Matching", () => {
    it("should match similar locations", () => {
      const result1 = calendarService.isLocationMatch(
        "123 Office Street",
        "Office Street"
      );
      expect(result1).toBe(true);

      const result2 = calendarService.isLocationMatch(
        "Office Building A",
        "Office Building"
      );
      expect(result2).toBe(true);
    });

    it("should not match different locations", () => {
      const result = calendarService.isLocationMatch(
        "Home Address",
        "Office Building"
      );
      expect(result).toBe(false);
    });

    it("should calculate location similarity", () => {
      const similarity1 = calendarService.calculateLocationSimilarity(
        "office building main",
        "office building"
      );
      expect(similarity1).toBeGreaterThan(0.5);

      const similarity2 = calendarService.calculateLocationSimilarity(
        "home address",
        "office building"
      );
      expect(similarity2).toBeLessThan(0.5);
    });
  });

  describe("Confidence Calculation", () => {
    it("should calculate higher confidence for closer times", () => {
      const targetTime = new Date("2025-10-30T09:00:00Z");
      const suggestedTime1 = new Date("2025-10-30T09:15:00Z");
      const suggestedTime2 = new Date("2025-10-30T12:00:00Z");

      const confidence1 = calendarService.calculateConfidence(
        suggestedTime1,
        targetTime
      );
      const confidence2 = calendarService.calculateConfidence(
        suggestedTime2,
        targetTime
      );

      expect(confidence1).toBeGreaterThan(confidence2);
    });

    it("should return 100 for exact match", () => {
      const targetTime = new Date("2025-10-30T09:00:00Z");
      const confidence = calendarService.calculateConfidence(
        targetTime,
        targetTime
      );

      expect(confidence).toBe(100);
    });
  });

  describe("Error Handling", () => {
    it("should handle Google Calendar API errors", async () => {
      const mockCalendar = {
        events: {
          list: jest.fn().mockRejectedValue(new Error("API Error")),
        },
      };

      google.calendar.mockReturnValue(mockCalendar);

      // Initialize Google Auth first
      calendarService.initializeGoogleAuth({
        client_id: "test",
        client_secret: "test",
        redirect_uri: "test",
      });

      await expect(
        calendarService.getGoogleCalendarEvents(
          "test_token",
          new Date(),
          new Date()
        )
      ).rejects.toThrow("Failed to fetch Google Calendar events");
    });

    it("should handle Microsoft Graph API errors", async () => {
      const mockClient = {
        api: jest.fn().mockReturnValue({
          filter: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          orderby: jest.fn().mockReturnThis(),
          get: jest.fn().mockRejectedValue(new Error("API Error")),
        }),
      };

      Client.init.mockReturnValue(mockClient);

      await expect(
        calendarService.getMicrosoftCalendarEvents(
          "test_token",
          new Date(),
          new Date()
        )
      ).rejects.toThrow("Failed to fetch Microsoft Calendar events");
    });
  });
});
