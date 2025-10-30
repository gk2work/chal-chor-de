# Matching Service

The Matching Service is a core component of the OfficeShare Platform that implements intelligent algorithms for pairing drivers with riders in the carpooling system. It uses geospatial analysis, temporal compatibility checking, and route optimization to find the best matches.

## Features

### Core Functionality

- **Two-Phase Matching Algorithm**: Candidate filtering followed by route optimization
- **Geospatial Proximity Filtering**: Uses MongoDB 2dsphere indexes for efficient location-based queries
- **Temporal Compatibility Checking**: Matches trips within configurable time windows
- **Route Optimization**: Calculates optimal routes with waypoints and detour analysis
- **Match Scoring**: Multi-factor scoring system for ranking potential matches

### Matching Algorithm

The service implements a sophisticated two-phase matching algorithm:

#### Phase 1: Candidate Filtering

- **Geospatial Filtering**: Find trips within 5km radius using MongoDB geospatial queries
- **Temporal Filtering**: Match trips within 1-hour time window
- **Role Compatibility**: Match drivers with riders and vice versa
- **Office Isolation**: Ensure all matches are within the same office

#### Phase 2: Route Optimization

- **Route Analysis**: Calculate direct vs. waypoint routes
- **Detour Calculation**: Measure additional distance and time
- **Compatibility Check**: Ensure detours are within acceptable limits
- **Match Scoring**: Rank matches based on multiple factors

### Scoring Factors

The matching score (0-100) is calculated based on:

- **Time Compatibility** (0-30 points): Closer departure times score higher
- **Route Efficiency** (0-25 points): More efficient routes score higher
- **Distance Proximity** (0-20 points): Closer pickup locations score higher
- **Detour Penalty** (0-15 points): Shorter detours score higher
- **User Reputation** (0-10 points): Higher reputation users score higher

## API Endpoints

### Core Matching

- `POST /api/matching/find-matches` - Find potential matches for a trip
- `POST /api/matching/calculate-route` - Calculate optimal route with waypoints
- `GET /api/matching/stats/:trip_id` - Get matching statistics for a trip
- `POST /api/matching/batch-match` - Batch matching for multiple trips

### Health Check

- `GET /health` - Service health status

## Configuration

### Environment Variables

```bash
NODE_ENV=development
MATCHING_SERVICE_PORT=3003
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=officeshare_dev
USER_SERVICE_PORT=3001
NOTIFICATION_SERVICE_PORT=3005
MAX_DETOUR_KM=5
MAX_DETOUR_MINUTES=15
MAX_MATCHES_PER_REQUEST=10
GEOSPATIAL_SEARCH_RADIUS_M=5000
```

### Algorithm Parameters

- **Max Detour Distance**: 5km (configurable)
- **Max Detour Time**: 15 minutes (configurable)
- **Search Radius**: 5km for initial candidate filtering
- **Time Window**: ±1 hour for temporal compatibility
- **Max Matches**: Up to 10 matches per request

## Data Models

### Match Request

```javascript
{
  trip_id: "ObjectId",
  max_matches: 5,
  max_detour_km: 5,
  max_detour_minutes: 15
}
```

### Match Response

```javascript
{
  trip_id: "ObjectId",
  trip_type: "driver" | "rider",
  matches: [{
    trip_id: "ObjectId",
    user_id: "ObjectId",
    match_score: 85.5,
    route_analysis: {
      isCompatible: true,
      detour_distance_km: 2.3,
      detour_time_minutes: 4.5,
      efficiency_ratio: 0.85
    },
    trip_details: {
      trip_type: "offer",
      direction: "to_office",
      departure_time: "2025-10-30T08:00:00.000Z",
      origin_location: { ... },
      destination_location: { ... }
    }
  }],
  total_matches: 3
}
```

### Route Calculation

```javascript
{
  origin: { lat: 37.7749, lng: -122.4194 },
  destination: { lat: 37.7849, lng: -122.4094 },
  waypoints: [
    { lat: 37.7799, lng: -122.4144 }
  ]
}
```

## Authentication

The service uses JWT token authentication via the User Service:

- All endpoints (except `/health`) require valid JWT token
- Token verification is handled by `authenticateToken` middleware
- Office-level isolation is enforced through user context

## Geospatial Features

### MongoDB Integration

- Uses MongoDB 2dsphere indexes for efficient geospatial queries
- Supports `$near` queries for proximity-based filtering
- Handles GeoJSON Point geometries for location data

### Distance Calculations

- Uses `geolib` library for accurate distance calculations
- Implements Haversine formula for great-circle distances
- Supports both meters and kilometers for different use cases

## Route Optimization

### Development Mode

- Uses simple Haversine distance calculations
- Assumes average speed of 60 km/h for time estimation
- Provides basic route analysis without real-time traffic

### Production Integration (Planned)

- MapBox API integration for accurate routing
- OpenStreetMap integration as fallback
- Real-time traffic data incorporation
- Turn-by-turn navigation support

## Matching Statistics

The service provides detailed statistics for analysis:

- **Total Candidates**: Number of potential matches found
- **Average Distance**: Mean distance to potential matches
- **Closest/Furthest Match**: Distance range of matches
- **Time Window Matches**: Matches within 30-minute window

## Batch Processing

### Scheduled Matching

- Processes multiple trips in batch operations
- Runs automatically for trips needing matches
- Sends notifications for successful matches
- Handles errors gracefully for individual trips

### Performance Optimization

- Efficient database queries with proper indexing
- Parallel processing for multiple trip analysis
- Caching of route calculations (planned)
- Rate limiting for external API calls

## Testing

Run the test suite:

```bash
npm test
```

The service includes comprehensive unit tests covering:

- Matching algorithm logic
- Geospatial calculations
- Route optimization
- Error handling and edge cases
- API endpoint functionality

## Development

### Start Development Server

```bash
npm run dev
```

### Start Production Server

```bash
npm start
```

### Health Check

```bash
curl http://localhost:3003/health
```

## Integration

### Service Dependencies

- **User Service** (port 3001): User authentication and profile data
- **Carpooling Service** (port 3002): Trip data and status updates
- **Notification Service** (port 3005): Match notifications and alerts
- **MongoDB Atlas**: Primary data storage with geospatial capabilities

### API Gateway Integration

The service is designed to work behind the API Gateway which handles:

- Request routing and load balancing
- Rate limiting and security
- Request/response logging

## Monitoring

### Performance Metrics

- Match success rates and response times
- Geospatial query performance
- Route calculation accuracy
- User satisfaction with matches

### Logging

- Structured logging with configurable levels
- Request/response logging via Morgan middleware
- Error tracking and alerting
- Performance monitoring

## Security

### Data Protection

- Helmet.js for security headers
- CORS configuration for cross-origin requests
- Input validation using Joi schemas
- Office-level data isolation

### Privacy

- Location data handling with user consent
- Anonymized logging for privacy protection
- GDPR compliance features (planned)

## Future Enhancements

### Advanced Features

- Machine learning for improved match scoring
- Predictive matching based on historical data
- Dynamic pricing optimization
- Integration with corporate calendar systems

### External Integrations

- Real-time traffic data integration
- Weather condition considerations
- Public transit integration for backup options
- Smart city infrastructure integration
