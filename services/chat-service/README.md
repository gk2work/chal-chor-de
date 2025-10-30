# OfficeShare Chat Service

A real-time chat service for the OfficeShare platform, providing WebSocket-based messaging with transaction-specific chat threads.

## Features

- **Real-time Messaging**: WebSocket-based communication using Socket.IO
- **Transaction-specific Threads**: Chat threads linked to carpools, book sharing, and bike sharing
- **Message Types**: Support for text, images, files, location, and system messages
- **Rich Interactions**: Message reactions, replies, mentions, and editing
- **Read Receipts**: Track message delivery and read status
- **Typing Indicators**: Real-time typing status
- **User Presence**: Online/offline status tracking
- **Message Search**: Full-text search within threads
- **Participant Management**: Add/remove participants from threads

## API Endpoints

### Thread Management

- `GET /api/threads` - Get user's chat threads
- `GET /api/threads/:threadId` - Get specific thread with messages
- `POST /api/threads` - Create new chat thread
- `PATCH /api/threads/:threadId` - Update thread details
- `POST /api/threads/:threadId/participants` - Add participant
- `DELETE /api/threads/:threadId/participants/:userId` - Remove participant
- `POST /api/threads/:threadId/read` - Mark thread as read

### Messaging

- `GET /api/chat/:threadId/messages` - Get thread messages
- `POST /api/chat/:threadId/messages` - Send message
- `PATCH /api/chat/messages/:messageId` - Edit message
- `DELETE /api/chat/messages/:messageId` - Delete message
- `POST /api/chat/messages/:messageId/reactions` - Add reaction
- `DELETE /api/chat/messages/:messageId/reactions/:emoji` - Remove reaction
- `POST /api/chat/:threadId/search` - Search messages
- `POST /api/chat/messages/:messageId/read` - Mark message as read

## WebSocket Events

### Client to Server

- `join_thread` - Join a chat thread room
- `leave_thread` - Leave a chat thread room
- `send_message` - Send real-time message
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator
- `add_reaction` - Add message reaction
- `mark_read` - Mark messages as read
- `update_presence` - Update user presence status
- `ping` - Connection health check

### Server to Client

- `new_message` - New message received
- `message_sent` - Message send confirmation
- `user_typing` - User started typing
- `user_stopped_typing` - User stopped typing
- `reaction_added` - Reaction added to message
- `message_read` - Message read receipt
- `user_online` - User came online
- `user_offline` - User went offline
- `presence_update` - User presence changed
- `user_joined_thread` - User joined thread
- `user_left_thread` - User left thread
- `thread_joined` - Successfully joined thread
- `thread_left` - Successfully left thread
- `pong` - Ping response
- `error` - Error occurred

## Data Models

### ChatThread

```javascript
{
  thread_id: String,
  office_id: String,
  transaction_type: 'carpool' | 'book_sharing' | 'bike_sharing' | 'general',
  transaction_id: String,
  participants: [{
    user_id: String,
    name: String,
    role: 'owner' | 'participant' | 'admin',
    joined_at: Date,
    last_read_at: Date
  }],
  title: String,
  description: String,
  status: 'active' | 'archived' | 'closed',
  metadata: Object,
  created_at: Date,
  updated_at: Date,
  last_message_at: Date
}
```

### ChatMessage

```javascript
{
  message_id: String,
  thread_id: String,
  office_id: String,
  sender: {
    user_id: String,
    name: String,
    avatar_url: String
  },
  message_type: 'text' | 'image' | 'file' | 'system' | 'location',
  content: {
    text: String,
    file: {
      url: String,
      filename: String,
      size: Number,
      mime_type: String
    },
    location: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    system: {
      action: String,
      data: Object
    }
  },
  reply_to: {
    message_id: String,
    preview: String
  },
  reactions: [{
    user_id: String,
    emoji: String,
    created_at: Date
  }],
  mentions: [{
    user_id: String,
    name: String,
    start_index: Number,
    end_index: Number
  }],
  edited: {
    is_edited: Boolean,
    edited_at: Date,
    original_content: String
  },
  delivery_status: {
    sent_at: Date,
    delivered_to: [{
      user_id: String,
      delivered_at: Date
    }],
    read_by: [{
      user_id: String,
      read_at: Date
    }]
  },
  created_at: Date,
  updated_at: Date
}
```

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB
- JWT secret key

### Installation

```bash
cd services/chat-service
npm install
```

### Environment Variables

Create a `.env` file:

```env
PORT=3006
NODE_ENV=development
MONGODB_URI=mongodb+srv://gkt2work_db_user:a0T824d9ek4rA9ou@cluster0.cmae5by.mongodb.net/officeshare_chat
JWT_SECRET=your-jwt-secret-key-here
CORS_ORIGIN=http://localhost:3000,http://localhost:3007,exp://localhost:19000
LOG_LEVEL=info
```

### Running the Service

```bash
# Development
npm run dev

# Production
npm start

# Tests
npm test
npm run test:watch
npm run test:coverage
```

## Authentication

All API endpoints and WebSocket connections require JWT authentication:

**HTTP Headers:**

```
Authorization: Bearer <jwt_token>
```

**WebSocket Authentication:**

```javascript
const socket = io("http://localhost:3006", {
  auth: {
    token: "your-jwt-token",
  },
});
```

## Usage Examples

### Creating a Chat Thread

```javascript
const threadData = {
  transaction_type: "carpool",
  transaction_id: "trip-123",
  title: "Downtown to Office Carpool",
  description: "Discussion for our daily carpool",
  participants: [
    {
      user_id: "user-2",
      name: "Jane Smith",
      role: "participant",
    },
  ],
  metadata: {
    carpool: {
      origin: "Downtown",
      destination: "Office Park",
      date: "2024-01-15",
    },
  },
};

const response = await fetch("/api/threads", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(threadData),
});
```

### Real-time Messaging

```javascript
// Connect to socket
const socket = io("http://localhost:3006", {
  auth: { token: authToken },
});

// Join a thread
socket.emit("join_thread", { thread_id: "thread-123" });

// Send a message
socket.emit("send_message", {
  thread_id: "thread-123",
  message_type: "text",
  content: {
    text: "Hello everyone!",
  },
  client_message_id: "client-msg-1",
});

// Listen for new messages
socket.on("new_message", (data) => {
  console.log("New message:", data.message);
});

// Handle typing indicators
socket.emit("typing_start", { thread_id: "thread-123" });
socket.on("user_typing", (data) => {
  console.log(`${data.name} is typing...`);
});
```

### Message Reactions

```javascript
// Add reaction via API
await fetch(`/api/chat/messages/${messageId}/reactions`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ emoji: "👍" }),
});

// Add reaction via socket
socket.emit("add_reaction", {
  message_id: "msg-123",
  emoji: "👍",
});
```

## Integration with Other Services

The Chat Service integrates with:

- **User Service**: Authentication and user profiles
- **Carpooling Service**: Carpool trip discussions
- **Library Service**: Book sharing conversations
- **Notification Service**: Message notifications
- **API Gateway**: Request routing and rate limiting

## Performance Considerations

- **Connection Pooling**: MongoDB connection pooling for database efficiency
- **Room Management**: Socket.IO rooms for efficient message broadcasting
- **Message Pagination**: Paginated message loading to handle large threads
- **Indexing**: Optimized database indexes for fast queries
- **Rate Limiting**: Request rate limiting to prevent abuse

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Office Isolation**: Users can only access threads in their office
- **Participant Validation**: Only thread participants can send/receive messages
- **Input Validation**: Comprehensive input validation using Joi
- **Rate Limiting**: Protection against spam and abuse
- **CORS Configuration**: Proper cross-origin resource sharing setup

## Monitoring and Logging

- **Winston Logging**: Structured logging with different levels
- **Error Tracking**: Comprehensive error handling and logging
- **Performance Metrics**: Connection and message statistics
- **Health Checks**: Service health monitoring endpoint

## Testing

The service includes comprehensive tests:

- **Unit Tests**: Model methods and utility functions
- **Integration Tests**: API endpoints and database operations
- **Socket Tests**: Real-time WebSocket functionality
- **Coverage Reports**: Test coverage analysis

Run tests:

```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

## Development

### Project Structure

```
src/
├── config/
│   └── database.js     # MongoDB connection
├── middleware/
│   ├── auth.js         # JWT authentication
│   ├── socketAuth.js   # Socket authentication
│   └── validation.js   # Request validation
├── models/
│   ├── ChatThread.js   # Thread model
│   └── ChatMessage.js  # Message model
├── routes/
│   ├── chat.js         # Message routes
│   └── threads.js      # Thread routes
├── sockets/
│   └── handlers.js     # Socket event handlers
├── utils/
│   └── logger.js       # Logging utility
└── server.js           # Main server file
```

### Contributing

1. Follow existing code style and patterns
2. Add tests for new features
3. Update documentation
4. Ensure all tests pass
5. Follow semantic commit messages

## License

This service is part of the OfficeShare platform and follows the same licensing terms.
