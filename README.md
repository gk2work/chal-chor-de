# OfficeShare Platform 🚗 🚲 📚

A comprehensive office resource-sharing platform that enables employees to carpool, share bikes, exchange books, and build a sustainable workplace community.

![Platform Status](https://img.shields.io/badge/status-active-success)
![Node Version](https://img.shields.io/badge/node-v18%2B-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

## 🌟 Features

- **🚗 Carpooling** - Share rides to and from the office, save money, reduce emissions
- **🚲 Bike Sharing** - Borrow and lend bicycles within your office community
- **📚 Book Library** - Exchange books with colleagues, build a shared library
- **💬 Real-time Chat** - Communicate with other users and trip participants
- **🏆 Gamification** - Earn badges, track environmental impact, compete on leaderboards
- **📊 Analytics** - Track usage, behavior, and platform performance
- **📝 Feedback System** - Collect user feedback and continuously improve
- **🧪 A/B Testing** - Test new features before full rollout

## 🚀 Quick Start

### For Users

1. **Download the mobile app** (iOS/Android)
2. **Sign up** with your work email
3. **Start sharing** - create trips, list bikes, add books
4. **Earn rewards** - complete transactions and earn badges
5. **Make an impact** - track your environmental contribution

📖 **Full User Guide**: See [USER_GUIDE.md](USER_GUIDE.md)

### For Developers

#### Prerequisites

- Node.js v18+ (currently using v24.10.0)
- npm v8+ (currently using v11.6.0)
- MongoDB Atlas account or local MongoDB
- Expo CLI (for mobile development)

#### Installation

```bash
# Clone the repository
git clone <repository-url>
cd chal-chor-de

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration

# Start all services (Option 1: npm script)
npm run start:all

# OR Option 2: shell script
./start-platform.sh

# In a new terminal, start the mobile app
cd mobile-app
npm install
npx expo start
```

#### Stop All Services

```bash
./stop-platform.sh
```

📖 **Full Developer Guide**: See [DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md)

## 📁 Project Structure

```
chal-chor-de/
├── services/                    # Backend microservices
│   ├── api-gateway/            # API Gateway (Port 3000)
│   ├── user-service/           # User management (Port 3001)
│   ├── carpooling-service/     # Carpooling logic (Port 3002)
│   ├── matching-service/       # ML-based matching (Port 3003)
│   ├── tracking-service/       # GPS tracking (Port 3004)
│   ├── notification-service/   # Push notifications (Port 3005)
│   ├── chat-service/           # Real-time chat (Port 3006)
│   ├── gamification-service/   # Badges & rewards (Port 3008)
│   └── feedback-service/       # Feedback & analytics (Port 3009)
├── mobile-app/                 # React Native mobile app
├── admin-dashboard/            # React admin dashboard (Port 3007)
├── test/                       # Integration tests
├── .kiro/                      # Kiro specs and configuration
└── docs/                       # Additional documentation
```

## 🛠️ Technology Stack

### Backend

- **Runtime**: Node.js v18+
- **Framework**: Express.js
- **Database**: MongoDB Atlas
- **Authentication**: JWT
- **Real-time**: Socket.io
- **ML**: TensorFlow.js

### Mobile App

- **Framework**: React Native
- **Navigation**: React Navigation
- **State Management**: React Context
- **Maps**: React Native Maps
- **Notifications**: Expo Notifications

### Admin Dashboard

- **Framework**: React
- **UI**: Custom CSS
- **Charts**: Recharts
- **HTTP Client**: Axios

## 🧪 Testing

```bash
# Run all tests
./test/run-all-tests.sh

# Run specific service tests
cd services/user-service
npm test

# Run integration tests
cd test/integration
npm test

# Run with coverage
npm test -- --coverage
```

📖 **Testing Guide**: See [TESTING_GUIDE.md](TESTING_GUIDE.md)

## 📊 Service Ports

| Service              | Port | URL                   |
| -------------------- | ---- | --------------------- |
| API Gateway          | 3000 | http://localhost:3000 |
| User Service         | 3001 | http://localhost:3001 |
| Carpooling Service   | 3002 | http://localhost:3002 |
| Matching Service     | 3003 | http://localhost:3003 |
| Tracking Service     | 3004 | http://localhost:3004 |
| Notification Service | 3005 | http://localhost:3005 |
| Chat Service         | 3006 | http://localhost:3006 |
| Admin Dashboard      | 3007 | http://localhost:3007 |
| Gamification Service | 3008 | http://localhost:3008 |
| Feedback Service     | 3009 | http://localhost:3009 |

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# MongoDB
MONGODB_URI=mongodb+srv://your-connection-string
MONGODB_DB_NAME=officeshare_dev

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Service Ports (see table above)
API_GATEWAY_PORT=3000
USER_SERVICE_PORT=3001
# ... etc

# Environment
NODE_ENV=development
```

Copy this `.env` file to each service directory that needs it.

## 📖 Documentation

- **[User Guide](USER_GUIDE.md)** - Complete guide for end users
- **[Development Setup](DEVELOPMENT_SETUP.md)** - Developer environment setup
- **[Testing Guide](TESTING_GUIDE.md)** - Comprehensive testing documentation
- **[API Documentation](docs/API.md)** - API endpoint reference
- **[Architecture](docs/ARCHITECTURE.md)** - System architecture overview

## 🎯 Key Features Explained

### Carpooling

- Create and join trips
- Real-time GPS tracking
- Cost sharing
- Driver and rider ratings
- Automated matching based on routes

### Bike Sharing

- List available bikes
- Request to borrow
- Track bike condition
- Location-based search
- Availability calendar

### Book Library

- Add books to shared library
- Search by title, author, genre
- Request to borrow
- Track book condition
- Reading recommendations

### Gamification

- Earn badges for milestones
- Track environmental impact
- Office-wide leaderboards
- CO2 savings calculator
- Achievement system

### Analytics & Feedback

- In-app feedback collection
- User behavior tracking
- A/B testing framework
- UX metrics monitoring
- Performance analytics

## 🌱 Environmental Impact

Track your contribution to sustainability:

- **CO2 Saved**: Calculate emissions reduced through carpooling
- **Trees Equivalent**: See impact in terms of trees planted
- **Miles Not Driven**: Track solo miles avoided
- **Community Impact**: View office-wide environmental savings

## 🔒 Security & Privacy

- **Encryption**: All data encrypted in transit and at rest
- **Authentication**: JWT-based secure authentication
- **Authorization**: Role-based access control
- **Privacy**: User-controlled location sharing
- **Data Protection**: GDPR-compliant data handling

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Write tests for new features
- Follow existing code style
- Update documentation
- Ensure all tests pass
- Keep commits atomic and descriptive

## 🐛 Troubleshooting

### Services won't start

```bash
# Check if ports are in use
lsof -i :3000-3009

# Stop all services and restart
./stop-platform.sh
./start-platform.sh
```

### Database connection issues

- Verify MongoDB URI in `.env`
- Check network connectivity
- Ensure IP is whitelisted in MongoDB Atlas

### Mobile app issues

- Clear Expo cache: `npx expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check that backend services are running

📖 **More troubleshooting**: See [USER_GUIDE.md](USER_GUIDE.md#troubleshooting)

## 📈 Roadmap

### Current Version (v1.0.0)

- ✅ Core carpooling functionality
- ✅ Bike and book sharing
- ✅ Real-time chat
- ✅ Gamification system
- ✅ Feedback and analytics
- ✅ Admin dashboard

### Coming Soon (v1.1.0)

- 🔄 Advanced route optimization
- 🔄 Integrated payment system
- 🔄 Apple Watch support
- 🔄 Multi-language support
- 🔄 Enhanced matching algorithms

### Future Plans (v2.0.0)

- 📅 Calendar integration
- 📅 Recurring trip templates
- 📅 Corporate reporting
- 📅 API for third-party integrations

## 📞 Support

### For Users

- **In-App Support**: Settings → Help
- **Email**: support@officeshare.com
- **Office Admin**: Contact your office administrator

### For Developers

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Documentation**: Check `/docs` folder

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ for sustainable workplace communities
- Inspired by the need for better office resource sharing
- Thanks to all contributors and testers

## 📊 Stats

- **Services**: 10 microservices
- **Test Coverage**: 80%+
- **API Endpoints**: 100+
- **Supported Platforms**: iOS, Android, Web
- **Database Collections**: 20+

---

**Made with 🌱 by the OfficeShare Team**

_Building sustainable workplace communities, one ride at a time._

---

## Quick Links

- 📱 [User Guide](USER_GUIDE.md)
- 💻 [Developer Setup](DEVELOPMENT_SETUP.md)
- 🧪 [Testing Guide](TESTING_GUIDE.md)
- 📚 [API Docs](docs/API.md)
- 🏗️ [Architecture](docs/ARCHITECTURE.md)
- 🐛 [Report Issues](https://github.com/your-repo/issues)
- 💬 [Discussions](https://github.com/your-repo/discussions)

**Get Started**: `./start-platform.sh` 🚀
