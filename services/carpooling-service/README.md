# Carpooling Service

The Carpooling Service is a core component of the OfficeShare Platform that manages ride-sharing functionality for office employees.

## Features

### Core Functionality

- **Trip Creation**: Drivers can create trip offers, riders can create trip requests
- **Trip Management**: Full CRUD operations for trips with status tracking
- **Smart Matching**: Geospatial proximity filtering for finding compatible rides
- **Real-time Updates**: WebSocket support for live trip status updates
- **Cost Calculation**: Automatic cost calculation based on distance and fuel prices

### Trip Types

- **AM Trips**: Morning commute to office
- **PM Trips**: Evening commute from office
- **Recurring Trips**: Support for daily/weekly recurring schedules

### User Roles

- **Driver**: Creates trip offers, manages passengers, sets pricing
- **Rider**: Creates trip requests, joins available trips, makes payments

### Key Endpoints

#### Trip Management

- `POST /api/carpooling/trips` - Create new trip (driver) or trip request (rider)
- `GET /api/carpooling/trips/my-trips` - Get user's trips with pagination
- `GET /api/carpooling/trips/search` - Search for available trips with geospatial filtering
- `DELETE /api/carpooling/trips/:trip_id` - Cancel trip (drivers only)

#### Trip Participation

- `POST /api/carpooling/trips/:trip_id/join` - Join a trip (riders)
- `DELETE /api/carpooling/trips/:trip_id/leave` - Leave a trip (riders)

#### Trip Status Management

- `POST /api/carpooling/trips/:trip_id/start` - Start trip (drivers)
- `POST /api/carpooling/trips/:trip_id/complete` - Complete trip (drivers)

## Configuration

### Environment Variables

```bash
NODE_ENV=development
CARPOOLING_SERVICE_PORT=3002
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=officeshare_dev
USER_SERVICE_PORT=3001
DEFAULT_COST_PER_KM=0.50
BASE_TRIP_FEE=2.00
LOG_LEVEL=debug
```

### Database Collections

- `carpool_trips` - Main trips collection with geospatial indexes
- `users` - User information (shared with User Service)

## Data Models

### Trip Document

```javascript
{
  trip_id: ObjectId,
  office_id: String,
  user_id: String, // Driver ID
  trip_type: "AM" | "PM",
  role: "driver" | "rider",
  status: "available" | "active" | "completed" | "cancelled",
  origin_location: {
    type: "Point",
    coordinates: [longitude, latitude],
    address: String
  },
  destination_location: {
    type: "Point",
    coordinates: [longitude, latitude],
    address: String
  },
  departure_time: Date,
  flexibility_minutes: Number,
  max_riders: Number,
  cost_per_rider: Number,
  participants: [{
    user_id: String,
    pickup_location: GeoJSON,
    dropoff_location: GeoJSON,
    status: "confirmed" | "pending",
    joined_at: Date
  }],
  recurring: {
    enabled: Boolean,
    days_of_week: [Number],
    end_date: Date
  },
  created_at: Date,
  updated_at: Date
}
```

## Authentication

The service uses JWT token authentication via the User Service:

- All endpoints (except `/health`) require valid JWT token
- Token verification is handled by `authenticateToken` middleware
- User context is extracted from verified tokens

## Geospatial Features

### Location-Based Matching

- MongoDB 2dsphere indexes for efficient geospatial queries
- Proximity-based trip matching within configurable radius
- Distance calculations using Haversine formula

### Search Capabilities

- Find trips within specified distance from origin/destination
- Filter by trip type, date, and time flexibility
- Sort by proximity and departure time

## Cost Calculation

### Dynamic Pricing

- Base fee + distance-based calculation
- Integration with fuel price APIs (planned)
- Toll cost integration (planned)
- Automatic cost splitting among participants

## Notifications

The service integrates with the Notification Service for:

- Trip join/leave notifications
- Trip status updates (started, completed, cancelled)
- Matching notifications for riders
- Reminder notifications

## Testing

Run the test suite:

```bash
npm test
```

The service includes comprehensive unit tests covering:

- Trip creation and validation
- Search and matching functionality
- Join/leave trip workflows
- Error handling and edge cases

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
curl http://localhost:3002/health
```

## Integration

### Service Dependencies

- **User Service** (port 3001): User authentication and profile data
- **Notification Service** (port 3005): Push notifications and alerts
- **MongoDB Atlas**: Primary data storage with geospatial capabilities

### API Gateway Integration

The service is designed to work behind the API Gateway which handles:

- Request routing and load balancing
- Rate limiting and security
- Request/response logging

## Monitoring

### Scheduled Jobs

- Daily cleanup of old completed/cancelled trips (runs at 2 AM)
- Automatic trip status updates based on time

### Logging

- Structured logging with configurable levels
- Request/response logging via Morgan middleware
- Error tracking and alerting

## Security

### Data Protection

- Helmet.js for security headers
- CORS configuration for cross-origin requests
- Input validation using Joi schemas
- MongoDB injection prevention

### Privacy

- Location data encryption at rest
- User data anonymization in logs
- GDPR compliance features (planned)
