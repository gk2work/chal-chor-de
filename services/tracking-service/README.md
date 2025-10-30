# Tracking Service

The Tracking Service provides real-time GPS tracking capabilities for the OfficeShare Platform. It enables live location sharing during carpool trips using WebSocket connections and implements geofencing for pickup/dropoff notifications.

## Features

### Core Functionality

- **Real-time GPS Tracking**: WebSocket-based location streaming from mobile apps
- **Location Data Processing**: GPS coordinate validation, filtering, and distance calculations
- **Geofencing**: Create virtual boundaries with enter/exit event notifications
- **Privacy Controls**: Configurable location sharing precision levels
- **Location History**: Store and retrieve trip location data
- **Session Management**: Track active GPS tracking sessions

### Real-time Communication

- **WebSocket Integration**: Socket.IO for bidirectional real-time communication
- **Trip Rooms**: Isolated communication channels per carpool trip
- **Live Location Updates**: 15-30 second interval location broadcasting
- **Connection Management**: Automatic reconnection and session recovery

### Privacy Features

- **Privacy Levels**:
  - `full`: Complete location data with high precision
  - `approximate`: Reduced precision (~10m accuracy)
  - `minimal`: Low precision (~100m accuracy) for basic tracking
- **User Consent**: Explicit tracking session initiation
- **Data Retention**: Configurable location data retention periods

## API Endpoints

### Session Management

- `POST /api/tracking/start` - Start GPS tracking session
- `POST /api/tracking/stop` - Stop GPS tracking session
- `GET /api/tracking/session/:user_id` - Get session status and current location

### Geofencing

- `POST /api/tracking/geofence` - Create geofence for trip
- `GET /api/tracking/geofences/:trip_id` - Get geofences for trip

### Location Data

- `GET /api/tracking/history/:trip_id` - Get location history for trip

### Health Check

- `GET /health` - Service health status with active session count

## WebSocket Events

### Client to Server

- `join_trip` - Join trip room for real-time updates
- `location_update` - Send GPS location update

### Server to Client

- `location_update` - Broadcast location update to trip participants
- `location_ack` - Acknowledge received location update
- `user_joined` - Notify when user joins trip tracking
- `user_left` - Notify when user leaves trip tracking
- `geofence_event` - Notify geofence enter/exit events
- `tracking_stopped` - Notify when user stops tracking
- `error` - Error notifications

## Configuration

### Environment Variables

```bash
NODE_ENV=development
TRACKING_SERVICE_PORT=3004
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=officeshare_dev
LOCATION_UPDATE_INTERVAL_MS=15000
MAX_LOCATION_HISTORY_DAYS=30
GPS_ACCURACY_THRESHOLD_M=100
MIN_MOVEMENT_THRESHOLD_M=5
DEFAULT_GEOFENCE_RADIUS_M=100
MAX_GEOFENCE_RADIUS_M=5000
DEFAULT_PRIVACY_LEVEL=full
LOCATION_RETENTION_DAYS=90
```

### WebSocket Configuration

```bash
WEBSOCKET_PING_TIMEOUT=60000
WEBSOCKET_PING_INTERVAL=25000
```

## Data Models

### Tracking Session

```javascript
{
  user_id: "ObjectId",
  trip_id: "ObjectId",
  tracking_type: "driver" | "rider",
  privacy_level: "full" | "approximate" | "minimal",
  started_at: Date,
  ended_at: Date,
  last_update: Date,
  total_distance: Number, // kilometers
  status: "active" | "completed" | "interrupted"
}
```

### Location Update

```javascript
{
  user_id: "ObjectId",
  trip_id: "ObjectId",
  latitude: Number,
  longitude: Number,
  accuracy: Number, // meters
  altitude: Number, // meters (optional)
  speed: Number, // m/s (optional)
  heading: Number, // degrees 0-360 (optional)
  timestamp: Date,
  distance_traveled: Number, // km since last update
  low_accuracy: Boolean, // flag for accuracy > 100m
  calculated_speed: Number // m/s if not provided
}
```

### Geofence

```javascript
{
  id: "ObjectId",
  name: String,
  center: {
    latitude: Number,
    longitude: Number
  },
  radius: Number, // meters (10-5000)
  trip_id: "ObjectId",
  event_type: "enter" | "exit" | "both",
  created_at: Date,
  triggered_users: Set<String> // in-memory tracking
}
```

### Geofence Event

```javascript
{
  geofence_id: "ObjectId",
  user_id: "ObjectId",
  trip_id: "ObjectId",
  event_type: "enter" | "exit",
  location: {
    latitude: Number,
    longitude: Number
  },
  distance_from_center: Number, // meters
  timestamp: Date
}
```

## Authentication

The service uses simplified header-based authentication:

- `x-user-id` header for user identification
- Trip access verification through Carpooling Service data
- Session-based authorization for tracking operations

## Location Processing

### GPS Validation

- **Coordinate Bounds**: Latitude (-90 to 90), Longitude (-180 to 180)
- **Accuracy Filtering**: Flag updates with accuracy > 100m
- **Movement Threshold**: Ignore movements < 5m to filter GPS noise
- **Speed Calculation**: Automatic speed calculation if not provided

### Distance Calculations

- **Haversine Formula**: Accurate great-circle distance calculations
- **Cumulative Distance**: Track total distance traveled per session
- **Movement Detection**: Only count significant movements for distance

### Privacy Filtering

```javascript
// Full precision (default)
{ latitude: 37.7749123, longitude: -122.4194567 }

// Approximate precision (~10m)
{ latitude: 37.7749, longitude: -122.4195 }

// Minimal precision (~100m)
{ latitude: 37.775, longitude: -122.419 }
```

## Geofencing

### Geofence Types

- **Pickup Points**: Notify when driver arrives at pickup location
- **Dropoff Points**: Notify when reaching destination
- **Office Boundaries**: Track office arrival/departure
- **Custom Areas**: User-defined areas of interest

### Event Processing

- **Real-time Detection**: Check geofences on every location update
- **State Tracking**: Remember which users are inside each geofence
- **Event Deduplication**: Prevent duplicate enter/exit events
- **Notification Broadcasting**: Real-time notifications to trip participants

## In-Memory Storage

For development simplicity, the service uses in-memory storage for:

- **Active Sessions**: Currently tracking users
- **User Locations**: Latest location for each user
- **Geofences**: Active geofences with trigger state
- **WebSocket Connections**: Socket management and room assignments

## Database Collections

### Persistent Storage

- `tracking_sessions` - Session history and metadata
- `location_updates` - GPS location history
- `geofences` - Geofence definitions
- `geofence_events` - Geofence trigger events

### Indexes

```javascript
// Location updates - geospatial and temporal queries
{ trip_id: 1, timestamp: 1 }
{ user_id: 1, timestamp: 1 }

// Tracking sessions - user and trip queries
{ user_id: 1, status: 1 }
{ trip_id: 1, started_at: 1 }

// Geofence events - analysis and reporting
{ trip_id: 1, timestamp: 1 }
{ geofence_id: 1, event_type: 1 }
```

## Testing

Run the test suite:

```bash
npm test
```

The service includes comprehensive unit tests covering:

- Session management (start/stop tracking)
- Location data processing and validation
- Geofence creation and management
- Location history retrieval
- Privacy filtering functionality
- Geospatial calculations
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
curl http://localhost:3004/health
```

### WebSocket Testing

Use a WebSocket client to test real-time functionality:

```javascript
const socket = io("http://localhost:3004");

// Join trip room
socket.emit("join_trip", {
  trip_id: "trip_123",
  user_id: "user_456",
});

// Send location update
socket.emit("location_update", {
  latitude: 37.7749,
  longitude: -122.4194,
  accuracy: 10,
  timestamp: new Date(),
});

// Listen for acknowledgment
socket.on("location_ack", (data) => {
  console.log("Location update acknowledged:", data);
});
```

## Integration

### Service Dependencies

- **Carpooling Service** (port 3002): Trip data and participant verification
- **Notification Service** (port 3005): Geofence event notifications
- **MongoDB Atlas**: Location data storage and session management

### Mobile App Integration

The service is designed to work with mobile apps that:

- Request location permissions from users
- Send GPS updates every 15-30 seconds during active trips
- Handle WebSocket connections with automatic reconnection
- Implement privacy controls for location sharing

## Performance Considerations

### Scalability

- **Connection Limits**: Monitor WebSocket connection counts
- **Memory Usage**: In-memory storage scales with active users
- **Database Load**: Batch location updates for high-frequency data
- **Network Bandwidth**: Optimize location update frequency

### Optimization

- **Location Filtering**: Reduce noise with movement thresholds
- **Batch Processing**: Group database operations for efficiency
- **Connection Pooling**: Reuse database connections
- **Data Cleanup**: Automatic cleanup of old location data

## Security

### Data Protection

- **Location Privacy**: User-controlled precision levels
- **Session Security**: Verify trip participation before tracking
- **Data Encryption**: HTTPS/WSS for all communications
- **Access Control**: Trip-based authorization for location data

### Privacy Compliance

- **User Consent**: Explicit tracking session initiation
- **Data Retention**: Configurable retention periods
- **Data Minimization**: Only collect necessary location data
- **Anonymization**: Remove personal identifiers from historical data

## Monitoring

### Metrics

- Active tracking sessions count
- Location update frequency and accuracy
- WebSocket connection stability
- Geofence event rates
- Database performance metrics

### Logging

- Structured logging with configurable levels
- Location update processing logs
- Geofence event notifications
- Error tracking and alerting
- Performance monitoring

## Future Enhancements

### Advanced Features

- **Offline Support**: Cache location updates when disconnected
- **Battery Optimization**: Adaptive update intervals based on movement
- **Route Prediction**: Predict routes based on historical data
- **Traffic Integration**: Real-time traffic condition awareness

### Scalability Improvements

- **Redis Integration**: Distributed session and geofence storage
- **Horizontal Scaling**: Multiple service instances with load balancing
- **Database Sharding**: Partition location data by geographic regions
- **CDN Integration**: Optimize WebSocket connection routing
