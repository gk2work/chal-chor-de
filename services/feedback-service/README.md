# Feedback Service

User feedback collection, A/B testing, behavior analytics, and UX monitoring service for the OfficeShare platform.

## Features

### 1. In-App Feedback Collection

- Multi-category feedback (bugs, feature requests, improvements, UX issues)
- Rating system (1-5 stars)
- Module-specific feedback
- Feedback history and status tracking

### 2. A/B Testing Framework

- Create and manage A/B tests
- Automatic variant assignment
- Conversion tracking
- Statistical results analysis

### 3. User Behavior Analytics

- Event tracking across all modules
- User journey analysis
- Module usage statistics
- Engagement metrics

### 4. UX Metrics Monitoring

- Performance metrics (load times, response times)
- User interaction metrics
- Error rate tracking
- Automated alerting for degraded experiences

## API Endpoints

### Feedback Endpoints

#### Submit Feedback

```
POST /api/feedback
Authorization: Bearer <token>

Body:
{
  "category": "bug|feature_request|improvement|general|ux_issue",
  "rating": 1-5,
  "title": "Feedback title",
  "description": "Detailed description",
  "module": "carpooling|bike_sharing|book_sharing|chat|general",
  "metadata": {}
}
```

#### Get User Feedback

```
GET /api/feedback/user/:user_id?limit=20&skip=0
Authorization: Bearer <token>
```

#### Get Office Feedback (Admin)

```
GET /api/feedback/office/:office_id?category=bug&status=new&limit=50&skip=0
Authorization: Bearer <token>
```

#### Get Feedback Statistics

```
GET /api/feedback/stats/office/:office_id?days=30
Authorization: Bearer <token>
```

### Analytics Endpoints

#### Track Behavior Event

```
POST /api/analytics/behavior
Authorization: Bearer <token>

Body:
{
  "event_type": "screen_view|button_click|feature_used",
  "module": "carpooling",
  "screen": "TripSchedulingScreen",
  "action": "create_trip",
  "metadata": {},
  "duration_ms": 1500
}
```

#### Get User Behavior Analytics

```
GET /api/analytics/behavior/user/:user_id?days=30
Authorization: Bearer <token>
```

#### Track UX Metric

```
POST /api/analytics/ux-metrics
Authorization: Bearer <token>

Body:
{
  "metric_type": "page_load_time|api_response_time|error_rate",
  "value": 1250,
  "screen": "HomeScreen",
  "module": "general",
  "metadata": {}
}
```

#### Get UX Metrics Summary

```
GET /api/analytics/ux-metrics/summary?days=7&metric_type=page_load_time&module=carpooling
Authorization: Bearer <token>
```

### A/B Testing Endpoints

#### Create A/B Test

```
POST /api/ab-tests
Authorization: Bearer <token>

Body:
{
  "test_name": "New Booking Flow",
  "description": "Testing simplified booking process",
  "variants": [
    {
      "variant_id": "control",
      "name": "Original Flow",
      "description": "Current booking process",
      "allocation_percentage": 50,
      "config": {}
    },
    {
      "variant_id": "variant_a",
      "name": "Simplified Flow",
      "description": "New streamlined booking",
      "allocation_percentage": 50,
      "config": { "skip_confirmation": true }
    }
  ],
  "module": "carpooling",
  "target_metric": "booking_completion_rate"
}
```

#### Get User's Variant Assignment

```
GET /api/ab-tests/:test_id/variant
Authorization: Bearer <token>
```

#### Track Conversion

```
POST /api/ab-tests/:test_id/conversion
Authorization: Bearer <token>

Body:
{
  "metric_value": 1,
  "metadata": { "time_to_complete": 45 }
}
```

#### Get A/B Test Results

```
GET /api/ab-tests/:test_id/results
Authorization: Bearer <token>
```

## Usage Examples

### Mobile App Integration

```javascript
import { feedbackAPI } from "./services/api";

// Submit feedback
const submitFeedback = async (feedbackData) => {
  try {
    const response = await feedbackAPI.post("/api/feedback", feedbackData);
    console.log("Feedback submitted:", response.data);
  } catch (error) {
    console.error("Error submitting feedback:", error);
  }
};

// Track behavior event
const trackEvent = async (eventData) => {
  try {
    await feedbackAPI.post("/api/analytics/behavior", eventData);
  } catch (error) {
    console.error("Error tracking event:", error);
  }
};

// Get A/B test variant
const getVariant = async (testId) => {
  try {
    const response = await feedbackAPI.get(`/api/ab-tests/${testId}/variant`);
    return response.data;
  } catch (error) {
    console.error("Error getting variant:", error);
    return null;
  }
};
```

## Environment Variables

```
FEEDBACK_SERVICE_PORT=3009
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=officeshare_dev
JWT_SECRET=your-secret-key
NODE_ENV=development
```

## Running the Service

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Production mode
npm start

# Run tests
npm test
```

## Database Collections

### user_feedback

Stores user-submitted feedback with categorization and status tracking.

### ab_tests

Stores A/B test configurations and metadata.

### ab_test_assignments

Tracks which users are assigned to which variants.

### ab_test_conversions

Records conversion events for A/B tests.

### user_behavior

Stores user behavior events for analytics.

### ux_metrics

Stores UX performance and quality metrics.

## Monitoring and Alerts

The service automatically monitors:

- Feedback submission rates
- Critical bug reports
- UX metric degradation
- A/B test statistical significance

Alerts are triggered when:

- Average rating drops below 3.0
- Error rates exceed thresholds
- Page load times increase significantly
- Critical bugs are reported
