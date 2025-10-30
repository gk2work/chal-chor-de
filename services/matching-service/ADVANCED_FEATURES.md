# Advanced Matching Features

This document describes the advanced matching algorithms and features implemented in the matching service.

## Features Implemented

### 1. Machine Learning Enhanced Matching (`ml-matching.js`)

#### User Preference Learning

- Analyzes historical trip data to learn user preferences
- Tracks preferred departure times, detour tolerance, cost preferences
- Identifies social preferences (frequently traveled companions)
- Adapts matching scores based on learned patterns

#### ML-Based Match Scoring

- Enhanced scoring algorithm using multiple weighted factors:
  - Time compatibility (25 points)
  - Route efficiency (25 points)
  - Cost compatibility (15 points)
  - Social preferences (15 points)
  - Detour tolerance (10 points)
  - User reputation (10 points)

#### Predictive Demand Forecasting

- Predicts carpooling demand based on historical patterns
- Analyzes day-of-week and time-of-day trends
- Identifies peak demand times
- Categorizes demand levels (high, medium, low, very_low)
- Provides confidence scores based on sample size

#### Dynamic Pricing Optimization

- Calculates dynamic pricing based on supply and demand
- Adjusts prices based on demand levels (±30%)
- Considers supply-demand ratio for additional adjustments
- Provides savings potential calculations

### 2. Calendar Integration (`calendar-integration.js`)

#### Multi-Provider Support

- Google Calendar integration via Google Calendar API
- Microsoft Outlook/Office 365 via Microsoft Graph API
- Normalized event format across providers

#### Availability Detection

- Checks calendar for conflicts with proposed trip times
- Suggests alternative times when conflicts exist
- Calculates confidence scores for suggestions

#### Automatic Trip Suggestions

- Analyzes calendar events for office meetings
- Suggests trips TO office before meetings
- Suggests trips FROM office after meetings
- Includes confidence scores and reasoning

#### Meeting-Aware Scheduling

- Checks for meeting conflicts before trip booking
- Provides conflict details and alternative times
- Supports configurable time windows

## API Endpoints

### ML Matching Endpoints

#### POST `/api/matching/ml-find-matches`

Find matches using ML-enhanced algorithm with user preference learning.

**Request:**

```json
{
  "trip_id": "string",
  "max_matches": 5,
  "max_detour_km": 5,
  "max_detour_minutes": 15
}
```

**Response:**

```json
{
  "trip_id": "string",
  "matches": [...],
  "user_preferences": {...},
  "total_matches": 0,
  "matching_algorithm": "ml_enhanced"
}
```

#### GET `/api/matching/user-preferences`

Get learned user preferences.

**Response:**

```json
{
  "user_id": "string",
  "preferences": {
    "preferred_departure_times": {...},
    "preferred_detour_tolerance": 5,
    "preferred_cost_range": {...},
    "time_flexibility": 30,
    "social_preferences": [...]
  }
}
```

#### POST `/api/matching/predict-demand`

Predict carpooling demand for a specific time.

**Request:**

```json
{
  "target_date": "2025-10-30T08:00:00Z",
  "direction": "to_office"
}
```

**Response:**

```json
{
  "forecast": {
    "expected_drivers": 5,
    "expected_riders": 10,
    "confidence": 0.8,
    "peak_time": "8:00",
    "demand_level": "high"
  }
}
```

#### POST `/api/matching/dynamic-pricing`

Calculate dynamic pricing based on demand.

**Request:**

```json
{
  "base_price": 10.0,
  "target_date": "2025-10-30T08:00:00Z",
  "direction": "to_office"
}
```

**Response:**

```json
{
  "pricing": {
    "base_price": 10.0,
    "dynamic_price": 13.0,
    "multiplier": 1.3,
    "demand_forecast": {...},
    "savings_potential": -3.0
  }
}
```

### Calendar Integration Endpoints

#### POST `/api/carpooling/calendar/events`

Fetch calendar events from Google or Microsoft.

**Request:**

```json
{
  "provider": "google",
  "access_token": "string",
  "start_date": "2025-10-30T00:00:00Z",
  "end_date": "2025-10-30T23:59:59Z"
}
```

#### POST `/api/carpooling/calendar/check-availability`

Check availability for a proposed trip time.

**Request:**

```json
{
  "provider": "google",
  "access_token": "string",
  "proposed_time": "2025-10-30T08:00:00Z",
  "time_window": 60
}
```

#### POST `/api/carpooling/calendar/suggest-trips`

Generate automatic trip suggestions based on calendar.

**Request:**

```json
{
  "provider": "google",
  "access_token": "string",
  "office_location": "123 Office Street",
  "home_location": "456 Home Avenue",
  "days_ahead": 7
}
```

#### POST `/api/carpooling/calendar/check-conflicts`

Check for meeting conflicts with a trip.

**Request:**

```json
{
  "provider": "google",
  "access_token": "string",
  "departure_time": "2025-10-30T08:00:00Z",
  "estimated_duration": 60
}
```

## Testing

### ML Matching Tests

- 20 comprehensive tests covering all ML features
- Tests for preference learning, scoring, forecasting, and pricing
- All tests passing ✓

### Calendar Integration Tests

- 19 comprehensive tests covering all calendar features
- Tests for Google Calendar, Microsoft Calendar, and availability detection
- All tests passing ✓

## Dependencies

### Matching Service

- No additional dependencies required (uses existing MongoDB connection)

### Carpooling Service

- `googleapis`: ^128.0.0 - Google Calendar API
- `@microsoft/microsoft-graph-client`: ^3.0.7 - Microsoft Graph API
- `isomorphic-fetch`: ^3.0.0 - Fetch polyfill for Microsoft Graph

## Usage Example

```javascript
// Use ML-enhanced matching
const response = await fetch("/api/matching/ml-find-matches", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    trip_id: "trip_123",
    max_matches: 5,
  }),
});

// Check calendar availability
const availability = await fetch(
  "/api/carpooling/calendar/check-availability",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      provider: "google",
      access_token: "google_token",
      proposed_time: "2025-10-30T08:00:00Z",
    }),
  }
);
```

## Performance Considerations

- Demand forecasts are cached for 1 hour to reduce computation
- User preferences are cached in memory during calculation
- Calendar API calls are rate-limited by provider
- ML scoring is performed asynchronously for large candidate sets

## Future Enhancements

- Integration with actual ML models (TensorFlow.js, scikit-learn)
- Real-time demand prediction updates
- A/B testing for pricing strategies
- Calendar sync for automatic trip creation
- Multi-calendar support per user
