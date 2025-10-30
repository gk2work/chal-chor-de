# Bike Sharing Service

The Bike Sharing Service is a core component of the OfficeShare platform that enables peer-to-peer bicycle sharing among office colleagues. This service provides a secure, trust-based system for employees to share their personal bicycles with coworkers.

## Features

### P2P Bike Listing System

- **Bike Registration**: Employees can list their personal bicycles with detailed specifications
- **Photo Upload**: Support for multiple bike photos with automatic processing
- **Availability Calendar**: Flexible scheduling system for bike availability
- **Location-Based Discovery**: Geospatial search for nearby available bikes
- **Smart Lock Integration**: Support for smart lock recommendations and instructions

### Booking and Accountability System

- **Request/Approval Workflow**: Structured booking process with owner approval
- **Digital Waiver**: Terms acceptance before bike usage
- **Photo Documentation**: Mandatory check-in/check-out photos for accountability
- **Condition Reporting**: Damage tracking and reporting system
- **Real-time Status**: Live booking status updates and notifications

### Key Capabilities

- Office-isolated operations (office_id-based data segregation)
- Comprehensive photo verification system
- Damage reporting and tracking
- User reputation integration
- Geospatial bike discovery
- Smart lock compatibility information

## API Endpoints

### Bike Listings

- `POST /api/bike-sharing/listings` - Create new bike listing
- `GET /api/bike-sharing/listings/available` - Get available bikes with filtering
- `GET /api/bike-sharing/listings/:listing_id` - Get specific bike details
- `GET /api/bike-sharing/listings/my-listings` - Get user's own bike listings
- `PATCH /api/bike-sharing/listings/:listing_id/availability` - Update bike availability

### Bookings

- `POST /api/bike-sharing/bookings` - Create booking request
- `PATCH /api/bike-sharing/bookings/:booking_id/status` - Approve/deny booking (owner)
- `POST /api/bike-sharing/bookings/:booking_id/accept-waiver` - Accept terms (borrower)
- `GET /api/bike-sharing/bookings/my-bookings` - Get user's bookings (borrower)
- `GET /api/bike-sharing/bookings/requests` - Get booking requests (owner)

### Check-in/Check-out

- `POST /api/bike-sharing/bookings/:booking_id/check-out` - Start bike rental
- `POST /api/bike-sharing/bookings/:booking_id/check-in` - End bike rental
- `POST /api/bike-sharing/bookings/:booking_id/report-damage` - Report damage/issues

### System

- `GET /health` - Service health check

## Data Models

### Bike Listing

```javascript
{
  listing_id: "ObjectId",
  office_id: "string",
  owner_id: "string",
  bike_type: "mountain|road|hybrid|electric|city|folding",
  brand: "string",
  model: "string",
  description: "string",
  location: {
    type: "Point",
    coordinates: [longitude, latitude],
    address: "string"
  },
  features: ["helmet_included", "lock_included", "lights", ...],
  condition: "excellent|good|fair",
  size: "xs|s|m|l|xl",
  availability_schedule: {
    monday: [{ start_time: "09:00", end_time: "17:00" }],
    // ... other days
  },
  special_instructions: "string",
  smart_lock_info: {
    has_smart_lock: boolean,
    lock_type: "string",
    instructions: "string"
  },
  photos: [{ filename, data, mimetype, size, uploaded_at }],
  available: boolean,
  total_bookings: number,
  rating_average: number,
  rating_count: number,
  created_at: "Date",
  updated_at: "Date"
}
```

### Bike Booking

```javascript
{
  booking_id: "ObjectId",
  listing_id: "ObjectId",
  office_id: "string",
  borrower_id: "string",
  owner_id: "string",
  start_time: "Date",
  end_time: "Date",
  purpose: "string",
  pickup_location: { type: "Point", coordinates: [], address: "" },
  return_location: { type: "Point", coordinates: [], address: "" },
  notes: "string",
  status: "pending|approved|denied|active|completed|cancelled",
  waiver_accepted: boolean,
  waiver_accepted_at: "Date",
  check_out_data: {
    timestamp: "Date",
    location: { type: "Point", coordinates: [], address: "" },
    condition_notes: "string",
    damage_reported: boolean,
    damage_description: "string",
    photos: [{ filename, data, mimetype, size, uploaded_at }]
  },
  check_in_data: {
    timestamp: "Date",
    location: { type: "Point", coordinates: [], address: "" },
    condition_notes: "string",
    damage_reported: boolean,
    damage_description: "string",
    photos: [{ filename, data, mimetype, size, uploaded_at }]
  },
  damage_reports: [{
    reported_by: "string",
    description: "string",
    severity: "low|medium|high",
    photos: [{ filename, data, mimetype, size, uploaded_at }],
    reported_at: "Date",
    status: "pending_review|resolved"
  }],
  rejection_reason: "string",
  created_at: "Date",
  updated_at: "Date"
}
```

## Environment Variables

```env
BIKE_SHARING_SERVICE_PORT=3008
MONGODB_URI=mongodb+srv://gkt2work_db_user:a0T824d9ek4rA9ou@cluster0.cmae5by.mongodb.net/
MONGODB_DB_NAME=officeshare_dev
USER_SERVICE_PORT=3001
NODE_ENV=development
```

## Installation & Setup

1. **Install Dependencies**

   ```bash
   cd services/bike-sharing-service
   npm install
   ```

2. **Environment Configuration**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Development Server**

   ```bash
   npm run dev
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

## Database Indexes

The service automatically creates the following MongoDB indexes for optimal performance:

- `office_id` - Office isolation
- `owner_id` - Owner-based queries
- `location (2dsphere)` - Geospatial queries
- `office_id + available` - Available bike filtering
- `listing_id` - Booking-listing relationships
- `borrower_id` - User booking queries
- `office_id + status` - Status-based filtering

## Security Features

- **Office Isolation**: All operations are scoped to office_id
- **Authentication**: JWT token validation via User Service
- **Photo Verification**: Mandatory documentation for accountability
- **Damage Tracking**: Comprehensive damage reporting system
- **Access Control**: Owner/borrower role-based permissions

## Integration Points

- **User Service**: Authentication and user profile data
- **Notification Service**: Booking status and reminder notifications
- **Chat Service**: Transaction-specific communication threads

## Development Notes

- Photos are stored as base64 in MongoDB for development simplicity
- Production deployment should use cloud storage (S3, CloudFront)
- Geospatial queries require MongoDB 2dsphere indexes
- Smart lock integration provides recommendations, not direct control
- All timestamps are stored in UTC

## Testing

The service includes comprehensive unit tests covering:

- Bike listing creation and management
- Booking workflow state transitions
- Photo verification and condition reporting
- Error handling and validation
- Authentication and authorization

Run tests with: `npm test`
