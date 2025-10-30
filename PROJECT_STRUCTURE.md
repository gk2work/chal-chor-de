# OfficeShare Platform - Project Structure

## 📁 Directory Structure

```
officeshare-platform/
├── 📄 README.md                    # Main project documentation
├── 📄 DEVELOPMENT_SETUP.md         # Development environment guide
├── 📄 PROJECT_STRUCTURE.md         # This file
├── 📄 package.json                 # Root package.json with monorepo scripts
├── 📄 .env                         # Environment variables
├── 📄 .env.example                 # Environment template
├── 📄 .gitignore                   # Git ignore rules
│
├── 📁 services/                    # Backend microservices
│   ├── 📁 api-gateway/            # Port 3000 - Request routing
│   │   └── 📄 package.json
│   ├── 📁 user-service/           # Port 3001 - Authentication & profiles
│   │   └── 📄 package.json
│   ├── 📁 carpooling-service/     # Port 3002 - Ride management
│   │   └── 📄 package.json
│   ├── 📁 matching-service/       # Port 3003 - Matching algorithms
│   │   └── 📄 package.json
│   ├── 📁 tracking-service/       # Port 3004 - GPS tracking
│   │   └── 📄 package.json
│   ├── 📁 notification-service/   # Port 3005 - Notifications
│   │   └── 📄 package.json
│   └── 📁 chat-service/          # Port 3006 - Real-time messaging
│       └── 📄 package.json
│
├── 📁 mobile-app/                 # React Native mobile application
│   └── 📄 package.json
│
├── 📁 admin-dashboard/            # React admin dashboard (Port 3007)
│   └── 📄 package.json
│
└── 📁 scripts/                   # Development scripts
    └── 📄 setup-dev.js           # Automated setup script
```

## 🔧 Service Architecture

### Backend Services (Node.js + Express + MongoDB)

| Service                  | Port | Purpose                         | Key Dependencies                         |
| ------------------------ | ---- | ------------------------------- | ---------------------------------------- |
| **API Gateway**          | 3000 | Request routing, authentication | express, http-proxy-middleware           |
| **User Service**         | 3001 | User management, authentication | express, mongodb, bcryptjs, jsonwebtoken |
| **Carpooling Service**   | 3002 | Ride scheduling, management     | express, mongodb, node-cron              |
| **Matching Service**     | 3003 | Geospatial matching algorithms  | express, mongodb, geolib                 |
| **Tracking Service**     | 3004 | Real-time GPS tracking          | express, socket.io, mongodb              |
| **Notification Service** | 3005 | Push notifications, emails      | express, mongodb, nodemailer             |
| **Chat Service**         | 3006 | Real-time messaging             | express, socket.io, mongodb              |

### Frontend Applications

| Application         | Port | Purpose              | Technology          |
| ------------------- | ---- | -------------------- | ------------------- |
| **Mobile App**      | Expo | iOS/Android app      | React Native + Expo |
| **Admin Dashboard** | 3007 | Management interface | React + Ant Design  |

## 🗄️ Database Design

- **Database**: MongoDB Atlas
- **Connection**: `mongodb+srv://gkt2work_db_user:a0T824d9ek4rA9ou@cluster0.cmae5by.mongodb.net/`
- **Database Name**: `officeshare_dev`
- **Multi-tenancy**: All collections include `office_id` field

### Collections Structure

```
officeshare_dev/
├── users                    # User profiles and authentication
├── carpool_trips           # Ride scheduling and management
├── bike_listings           # Bike sharing listings
├── book_listings           # Book sharing catalog
├── chat_messages           # Real-time messaging
├── notifications           # Notification history
├── location_updates        # GPS tracking data
└── offices                 # Office configuration
```

## 🚀 Development Workflow

### 1. Initial Setup

```bash
node scripts/setup-dev.js   # Automated setup
# OR
npm run install-all         # Manual installation
```

### 2. Development Mode

```bash
npm run dev                 # Start all backend services
npm run dev:mobile         # Start mobile app (separate terminal)
npm run dev:admin          # Start admin dashboard (separate terminal)
```

### 3. Individual Service Development

```bash
npm run dev:gateway        # API Gateway only
npm run dev:user          # User Service only
# ... etc for each service
```

### 4. Testing

```bash
npm test                   # All tests
npm run test:services     # Backend only
npm run test:apps         # Frontend only
```

## 🔐 Environment Configuration

### Required Environment Variables

- `MONGODB_URI` - MongoDB connection string
- `MONGODB_DB_NAME` - Database name
- `JWT_SECRET` - JWT signing secret
- `NODE_ENV` - Environment (development/production)
- Service ports (3000-3006)

### Development vs Production

- **Development**: Mock services, console logging, local ports
- **Production**: Real services, proper logging, cloud deployment

## 📦 Package Management

### Monorepo Structure

- Root `package.json` contains shared scripts and dev dependencies
- Each service has its own `package.json` with specific dependencies
- Workspaces configuration for efficient dependency management

### Key Scripts

- `install-all` - Install all dependencies
- `dev` - Start all services in development mode
- `test` - Run all tests
- `start:all` - Production mode startup

## 🔄 Inter-Service Communication

### API Gateway Pattern

- All external requests go through API Gateway (Port 3000)
- Gateway routes requests to appropriate services
- Handles authentication and rate limiting

### Service-to-Service Communication

- Direct HTTP calls between services
- WebSocket connections for real-time features
- MongoDB as shared data layer

## 📱 Mobile App Architecture

### React Native + Expo

- Cross-platform development (iOS/Android)
- Expo managed workflow for easier development
- Native features: GPS, Camera, Push notifications

### Key Features

- Authentication and user profiles
- Carpooling booking and tracking
- Bike sharing with photo verification
- Book catalog and borrowing
- Real-time chat and notifications

## 🖥️ Admin Dashboard

### React + Ant Design

- Web-based management interface
- User management and oversight
- Analytics and reporting
- Real-time activity monitoring

## 🧪 Testing Strategy

### Backend Services

- Unit tests with Jest
- Integration tests with Supertest
- API endpoint testing
- Database integration testing

### Frontend Applications

- Component testing with React Testing Library
- End-to-end testing (future)
- Mobile app testing with Expo

## 📚 Next Steps

1. ✅ Project structure complete
2. 🔄 Implement individual services (starting with User Service)
3. ⏳ Create mobile app screens
4. ⏳ Build admin dashboard
5. ⏳ Integration testing
6. ⏳ Deployment configuration

---

**Status**: ✅ Project structure ready for development!
