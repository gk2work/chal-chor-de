const axios = require("axios");
const { google } = require("googleapis");
const { Client } = require("@microsoft/microsoft-graph-client");
require("isomorphic-fetch");

/**
 * Calendar Integration Module
 * Supports Google Calendar and Microsoft Outlook/Office 365
 */

class CalendarIntegrationService {
  constructor() {
    this.googleAuth = null;
    this.microsoftClient = null;
  }

  /**
   * Initialize Google Calendar OAuth2 client
   */
  initializeGoogleAuth(credentials) {
    const { client_id, client_secret, redirect_uri } = credentials;
    this.googleAuth = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uri
    );
  }

  /**
   * Initialize Microsoft Graph client
   */
  initializeMicrosoftClient(accessToken) {
    this.microsoftClient = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
  }

  /**
   * Get user's calendar events for a specific date range
   */
  async getCalendarEvents(provider, accessToken, startDate, endDate) {
    try {
      if (provider === "google") {
        return await this.getGoogleCalendarEvents(
          accessToken,
          startDate,
          endDate
        );
      } else if (provider === "microsoft") {
        return await this.getMicrosoftCalendarEvents(
          accessToken,
          startDate,
          endDate
        );
      } else {
        throw new Error(`Unsupported calendar provider: ${provider}`);
      }
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      throw error;
    }
  }

  /**
   * Get Google Calendar events
   */
  async getGoogleCalendarEvents(accessToken, startDate, endDate) {
    try {
      this.googleAuth.setCredentials({ access_token: accessToken });
      const calendar = google.calendar({
        version: "v3",
        auth: this.googleAuth,
      });

      const response = await calendar.events.list({
        calendarId: "primary",
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      });

      return this.normalizeGoogleEvents(response.data.items || []);
    } catch (error) {
      console.error("Google Calendar API error:", error);
      throw new Error("Failed to fetch Google Calendar events");
    }
  }

  /**
   * Get Microsoft Outlook/Office 365 calendar events
   */
  async getMicrosoftCalendarEvents(accessToken, startDate, endDate) {
    try {
      this.initializeMicrosoftClient(accessToken);

      const events = await this.microsoftClient
        .api("/me/calendar/events")
        .filter(
          `start/dateTime ge '${startDate.toISOString()}' and end/dateTime le '${endDate.toISOString()}'`
        )
        .select("subject,start,end,location,isAllDay")
        .orderby("start/dateTime")
        .get();

      return this.normalizeMicrosoftEvents(events.value || []);
    } catch (error) {
      console.error("Microsoft Graph API error:", error);
      throw new Error("Failed to fetch Microsoft Calendar events");
    }
  }

  /**
   * Normalize Google Calendar events to common format
   */
  normalizeGoogleEvents(events) {
    return events.map((event) => ({
      id: event.id,
      title: event.summary || "Untitled Event",
      start: new Date(event.start.dateTime || event.start.date),
      end: new Date(event.end.dateTime || event.end.date),
      location: event.location || null,
      isAllDay: !event.start.dateTime,
      provider: "google",
    }));
  }

  /**
   * Normalize Microsoft Calendar events to common format
   */
  normalizeMicrosoftEvents(events) {
    return events.map((event) => ({
      id: event.id,
      title: event.subject || "Untitled Event",
      start: new Date(event.start.dateTime),
      end: new Date(event.end.dateTime),
      location: event.location?.displayName || null,
      isAllDay: event.isAllDay,
      provider: "microsoft",
    }));
  }

  /**
   * Detect availability based on calendar events
   */
  detectAvailability(events, targetDate, timeWindow = 60) {
    const targetTime = new Date(targetDate);
    const windowStart = new Date(targetTime.getTime() - timeWindow * 60 * 1000);
    const windowEnd = new Date(targetTime.getTime() + timeWindow * 60 * 1000);

    const conflictingEvents = events.filter((event) => {
      return (
        (event.start >= windowStart && event.start <= windowEnd) ||
        (event.end >= windowStart && event.end <= windowEnd) ||
        (event.start <= windowStart && event.end >= windowEnd)
      );
    });

    return {
      isAvailable: conflictingEvents.length === 0,
      conflictingEvents: conflictingEvents,
      suggestedTimes: this.suggestAlternativeTimes(
        events,
        targetDate,
        timeWindow
      ),
    };
  }

  /**
   * Suggest alternative times based on calendar availability
   */
  suggestAlternativeTimes(events, targetDate, timeWindow = 60) {
    const suggestions = [];
    const targetTime = new Date(targetDate);
    const dayStart = new Date(targetTime);
    dayStart.setHours(6, 0, 0, 0); // Start at 6 AM
    const dayEnd = new Date(targetTime);
    dayEnd.setHours(22, 0, 0, 0); // End at 10 PM

    // Check every 30-minute slot
    let currentSlot = new Date(dayStart);
    while (currentSlot < dayEnd && suggestions.length < 5) {
      const slotEnd = new Date(currentSlot.getTime() + timeWindow * 60 * 1000);

      const hasConflict = events.some((event) => {
        return (
          (event.start >= currentSlot && event.start < slotEnd) ||
          (event.end > currentSlot && event.end <= slotEnd) ||
          (event.start <= currentSlot && event.end >= slotEnd)
        );
      });

      if (!hasConflict) {
        suggestions.push({
          start: new Date(currentSlot),
          end: new Date(slotEnd),
          confidence: this.calculateConfidence(currentSlot, targetTime),
        });
      }

      currentSlot = new Date(currentSlot.getTime() + 30 * 60 * 1000); // Move to next 30-min slot
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate confidence score for suggested time
   */
  calculateConfidence(suggestedTime, targetTime) {
    const timeDiff = Math.abs(suggestedTime.getTime() - targetTime.getTime());
    const hoursDiff = timeDiff / (60 * 60 * 1000);

    // Higher confidence for times closer to target
    return Math.max(0, 100 - hoursDiff * 10);
  }

  /**
   * Generate automatic trip suggestions based on calendar events
   */
  async generateTripSuggestions(events, officeLocation, homeLocation) {
    const suggestions = [];

    for (const event of events) {
      // Check if event is at office location
      const isOfficeEvent = this.isLocationMatch(
        event.location,
        officeLocation
      );

      if (isOfficeEvent) {
        // Suggest trip TO office before event
        const tripToOffice = {
          type: "to_office",
          suggested_departure: new Date(event.start.getTime() - 45 * 60 * 1000), // 45 min before
          event_title: event.title,
          event_start: event.start,
          confidence: 85,
          reason: "Office meeting scheduled",
        };
        suggestions.push(tripToOffice);

        // Suggest trip FROM office after event
        const tripFromOffice = {
          type: "from_office",
          suggested_departure: new Date(event.end.getTime() + 15 * 60 * 1000), // 15 min after
          event_title: event.title,
          event_end: event.end,
          confidence: 75,
          reason: "Returning from office meeting",
        };
        suggestions.push(tripFromOffice);
      }
    }

    return suggestions;
  }

  /**
   * Check if event location matches target location
   */
  isLocationMatch(eventLocation, targetLocation) {
    if (!eventLocation || !targetLocation) return false;

    const eventLoc = eventLocation.toLowerCase();
    const targetLoc = targetLocation.toLowerCase();

    // Simple string matching - can be enhanced with geocoding
    return (
      eventLoc.includes(targetLoc) ||
      targetLoc.includes(eventLoc) ||
      this.calculateLocationSimilarity(eventLoc, targetLoc) > 0.7
    );
  }

  /**
   * Calculate similarity between two location strings
   */
  calculateLocationSimilarity(loc1, loc2) {
    const words1 = loc1.split(/\s+/);
    const words2 = loc2.split(/\s+/);
    const commonWords = words1.filter((word) => words2.includes(word));

    return commonWords.length / Math.max(words1.length, words2.length);
  }

  /**
   * Check if user has meeting conflicts for a proposed trip time
   */
  async checkMeetingConflicts(
    provider,
    accessToken,
    proposedDepartureTime,
    estimatedDuration
  ) {
    try {
      const startDate = new Date(
        proposedDepartureTime.getTime() - 30 * 60 * 1000
      ); // 30 min before
      const endDate = new Date(
        proposedDepartureTime.getTime() + estimatedDuration * 60 * 1000
      );

      const events = await this.getCalendarEvents(
        provider,
        accessToken,
        startDate,
        endDate
      );

      const conflicts = events.filter((event) => {
        return (
          event.start <= endDate && event.end >= new Date(proposedDepartureTime)
        );
      });

      return {
        hasConflicts: conflicts.length > 0,
        conflicts: conflicts,
        isAvailable: conflicts.length === 0,
      };
    } catch (error) {
      console.error("Error checking meeting conflicts:", error);
      return {
        hasConflicts: false,
        conflicts: [],
        isAvailable: true,
        error: error.message,
      };
    }
  }
}

module.exports = CalendarIntegrationService;
