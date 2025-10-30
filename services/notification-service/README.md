# OfficeShare Notification Service

The Notification Service handles all notification delivery across the OfficeShare platform, including in-app notifications, email notifications, and push notifications.

## Features

- **Multi-channel Notifications**: Support for in-app, email, and push notifications
- **Template System**: Pre-defined templates for all notification types
- **User Preferences**: Granular notification preferences per user
- **Delivery Tracking**: Track notification delivery status and attempts
- **Mock Services**: Console-based mock delivery for local development
- **Office Isolation**: All notifications respect office boundaries

## API Endpoints

### Health Check

- `GET /health` - Service health status

### Notifications

- `POST /api/notifications/send` - Send a notification
- `GET /api/notifications/user/:user_id` - Get user notifications
- `PUT /api/notifications/:notification_id/read` - Mark notification as read

### Preferences

- `GET /api/notifications/preferences/:user_id` - Get user notification preferences
- `PUT /api/notifications/preferences` - Update user notification preferences

### Analytics

- `GET /api/notifications/stats` - Get notification statistics

## Notification Templates

### Carpooling Templates

- `carpool_match_found` - When a carpool match is found
- `carpool_booking_confirmed` - When a carpool booking is confirmed
- `carpool_cancelled` - When a carpool trip is cancelled
- `carpool_reminder` - Reminder for upcoming carpool trip

### Rating Templates

- `rating_received` - When a user receives a rating
- `rating_reminder` - Reminder to rate an experience

## Development Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up environment variables in `.env`

3. Start the service:
   ```bash
   npm run dev
   ```

The service will run on `http://localhost:3005`

## Mock Services

For local development, the service uses mock implementations:

- **Email**: Logs email content to console instead of sending real emails
- **Push Notifications**: Logs push notification content to console
- **In-app Notifications**: Stores in database and logs to console

## Database Collections

- `notifications` - Notification records and delivery status
- `notification_preferences` - User notification preferences

## Usage Example

```javascript
// Send a carpool match notification
const response = await fetch("http://localhost:3005/api/notifications/send", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    user_id: "user123",
    office_id: "office_001",
    template_key: "carpool_match_found",
    data: {
      date: "2024-01-15",
      time: "8:00 AM",
      driver_name: "John Doe",
      origin: "Downtown",
      destination: "Office Park",
      cost: "5.00",
    },
    channels: ["in_app", "email", "push"],
    priority: "high",
  }),
});
```
