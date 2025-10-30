# OfficeShare Platform - Complete User Guide

Welcome to OfficeShare! This guide will help you get started with the platform, whether you're a developer setting it up or an end user using the mobile app.

## Table of Contents

1. [Quick Start](#quick-start)
2. [For Developers](#for-developers)
3. [For End Users](#for-end-users)
4. [Features Guide](#features-guide)
5. [Troubleshooting](#troubleshooting)

---

## Quick Start

### What is OfficeShare?

OfficeShare is a comprehensive office resource-sharing platform that enables employees to:

- 🚗 **Carpool** - Share rides to and from the office
- 🚲 **Share Bikes** - Borrow and lend bicycles
- 📚 **Share Books** - Exchange books with colleagues
- 💬 **Chat** - Communicate with other users
- 🏆 **Earn Rewards** - Get badges and track environmental impact
- 📊 **Provide Feedback** - Help improve the platform

---

## For Developers

### Prerequisites

- Node.js v18+ (currently using v24.10.0)
- npm v8+ (currently using v11.6.0)
- MongoDB Atlas account (or local MongoDB)
- Expo CLI for mobile development
- Git

### Installation & Setup

#### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd chal-chor-de

# Install dependencies for all services
npm install
```

#### 2. Configure Environment Variables

Each service needs its own `.env` file. Here's the configuration:

**Root `.env` file:**

```bash
# MongoDB Configuration
MONGODB_URI=mongodb+srv://gkt2work_db_user:a0T824d9ek4rA9ou@cluster0.cmae5by.mongodb.net/
MONGODB_DB_NAME=officeshare_dev

# JWT Configuration
JWT_SECRET=officeshare-dev-secret-key-2024
JWT_EXPIRES_IN=24h

# Service Ports
API_GATEWAY_PORT=3000
USER_SERVICE_PORT=3001
CARPOOL_SERVICE_PORT=3002
MATCHING_SERVICE_PORT=3003
TRACKING_SERVICE_PORT=3004
NOTIFICATION_SERVICE_PORT=3005
CHAT_SERVICE_PORT=3006
GAMIFICATION_SERVICE_PORT=3008
FEEDBACK_SERVICE_PORT=3009

# Admin Dashboard
ADMIN_DASHBOARD_PORT=3007

# Environment
NODE_ENV=development
```

Copy this `.env` file to each service directory:

```bash
cp .env services/user-service/.env
cp .env services/carpooling-service/.env
cp .env services/feedback-service/.env
# ... and so on for all services
```

#### 3. Start All Services

**Option A: Start All Services at Once (Recommended for Development)**

```bash
# Install dependencies for all services
npm run install-all

# Start all backend services (note the colon!)
npm run start:all
```

**Option B: Start Services Individually**

Open separate terminal windows for each service:

```bash
# Terminal 1 - API Gateway
cd services/api-gateway
npm install
npm start

# Terminal 2 - User Service
cd services/user-service
npm install
npm start

# Terminal 3 - Carpooling Service
cd services/carpooling-service
npm install
npm start

# Terminal 4 - Feedback Service
cd services/feedback-service
npm install
npm start

# Terminal 5 - Gamification Service
cd services/gamification-service
npm install
npm start

# ... continue for other services
```

#### 4. Start Mobile App

```bash
# In a new terminal
cd mobile-app
npm install
npx expo start

# Then:
# - Press 'i' for iOS simulator
# - Press 'a' for Android emulator
# - Scan QR code with Expo Go app on your phone
```

#### 5. Start Admin Dashboard

```bash
# In a new terminal
cd admin-dashboard
npm install
npm start

# Opens at http://localhost:3007
```

### Verify Installation

Check that all services are running:

```bash
# Check service health
curl http://localhost:3001/health  # User Service
curl http://localhost:3002/health  # Carpool Service
curl http://localhost:3009/health  # Feedback Service
```

You should see responses like:

```json
{
  "status": "healthy",
  "service": "User Service",
  "timestamp": "2024-10-30T...",
  "version": "1.0.0"
}
```

### Running Tests

```bash
# Run all tests
./test/run-all-tests.sh

# Run specific service tests
cd services/user-service
npm test

# Run integration tests
cd test/integration
npm install
npm test

# Run with coverage
npm test -- --coverage
```

### Development Workflow

1. **Make Changes** - Edit code in your preferred editor
2. **Test Locally** - Services auto-reload with nodemon
3. **Run Tests** - Ensure tests pass
4. **Commit** - Use meaningful commit messages
5. **Push** - Push to your branch

---

## For End Users

### Getting Started with the Mobile App

#### 1. Download and Install

- **iOS**: Download from App Store (when published)
- **Android**: Download from Google Play (when published)
- **Development**: Use Expo Go app and scan QR code

#### 2. Create Your Account

1. Open the OfficeShare app
2. Tap **"Sign Up"**
3. Enter your details:
   - Email address (use your work email)
   - Password (minimum 6 characters)
   - Full name
   - Office ID (provided by your admin)
4. Tap **"Create Account"**
5. You're in! 🎉

#### 3. Login

1. Open the app
2. Enter your email and password
3. Tap **"Login"**

---

## Features Guide

### 🚗 Carpooling

#### As a Driver

**Create a Trip:**

1. Tap the **"Carpool"** tab
2. Tap **"Create Trip"**
3. Fill in details:
   - **Origin**: Your starting location
   - **Destination**: Where you're going
   - **Departure Time**: When you're leaving
   - **Available Seats**: How many riders you can take
   - **Cost per Rider**: Optional cost sharing
4. Tap **"Create Trip"**
5. Wait for riders to join!

**Manage Your Trip:**

- View who joined your trip
- Start the trip when ready
- Complete the trip when done
- Rate your riders

#### As a Rider

**Find a Ride:**

1. Tap the **"Carpool"** tab
2. Browse available trips
3. Filter by:
   - Date and time
   - Origin/destination
   - Available seats
4. Tap on a trip to see details
5. Tap **"Join Trip"**

**During the Trip:**

- View driver details
- See real-time location (if tracking enabled)
- Chat with driver and other riders
- Complete trip when done
- Rate the driver

### 🚲 Bike Sharing

**Lend Your Bike:**

1. Tap **"Bike Sharing"** tab
2. Tap **"Add Bike"**
3. Enter bike details:
   - Type (mountain, road, hybrid)
   - Condition
   - Available dates
   - Location
4. Upload a photo
5. Tap **"List Bike"**

**Borrow a Bike:**

1. Browse available bikes
2. Filter by type and location
3. Tap on a bike to see details
4. Tap **"Request to Borrow"**
5. Wait for owner approval
6. Pick up the bike
7. Return when done
8. Rate the experience

### 📚 Book Sharing

**Share Your Books:**

1. Tap **"Library"** tab
2. Tap **"Add Book"**
3. Enter book details:
   - Title and author
   - ISBN (optional)
   - Condition
   - Genre
4. Upload a photo
5. Tap **"Add to Library"**

**Borrow Books:**

1. Browse the library
2. Search by title, author, or genre
3. Tap on a book
4. Tap **"Request to Borrow"**
5. Arrange pickup with owner
6. Return when finished
7. Rate the book

### 💬 Chat

**Start a Conversation:**

1. Tap **"Chat"** tab
2. Tap **"New Message"**
3. Select a user
4. Type your message
5. Send!

**Group Chats:**

- Automatic group chats for carpool trips
- Chat with all trip participants
- Share location and updates

### 🏆 Gamification

**Earn Badges:**

- Complete your first trip → **First Ride** badge
- Complete 10 trips → **Carpooler** badge
- Save 100kg CO2 → **Eco Warrior** badge
- Maintain 4.5+ rating → **Community Hero** badge

**Track Your Impact:**

1. Tap **"Profile"** tab
2. View your stats:
   - Total trips
   - CO2 saved
   - Trees equivalent
   - Miles not driven
3. See your badges
4. Check leaderboards

### 📊 Feedback & Analytics

**Submit Feedback:**

1. Tap **"Settings"** → **"Feedback"**
2. Choose category:
   - Bug Report
   - Feature Request
   - Improvement
   - UX Issue
   - General
3. Select module (Carpooling, Bike Sharing, etc.)
4. Rate your experience (1-5 stars)
5. Write title and description
6. Tap **"Submit"**

**Your feedback helps us improve!**

### ⚙️ Settings

**Update Your Profile:**

1. Tap **"Profile"** tab
2. Tap **"Edit Profile"**
3. Update:
   - Name
   - Photo
   - Preferences
4. Tap **"Save"**

**Notification Preferences:**

1. Go to **"Settings"**
2. Tap **"Notifications"**
3. Toggle preferences:
   - Push notifications
   - Email notifications
   - Location sharing
4. Save changes

**Privacy Settings:**

- Control who sees your profile
- Manage location sharing
- Review data usage

---

## Admin Dashboard Guide

### Accessing the Dashboard

1. Open browser to `http://localhost:3007` (or your deployed URL)
2. Login with admin credentials
3. You'll see the main dashboard

### Dashboard Features

#### 📊 Analytics Overview

- Total users
- Active trips
- Platform usage statistics
- Environmental impact metrics

#### 👥 User Management

- View all users
- Search and filter users
- View user activity
- Manage user accounts

#### 🚗 Trip Management

- View all carpool trips
- Monitor active trips
- View trip history
- Handle disputes

#### 📝 Feedback Management

- View all user feedback
- Filter by category and status
- Respond to feedback
- Track feedback trends
- View ratings distribution

#### 📈 Analytics & Reports

- User behavior analytics
- Module usage statistics
- Performance metrics
- A/B test results
- Environmental impact reports

#### ⚙️ System Settings

- Configure platform settings
- Manage office locations
- Set up A/B tests
- Configure notifications

---

## Common Use Cases

### Scenario 1: Daily Commute Carpooling

**Sarah (Driver):**

1. Creates a trip every morning at 8:00 AM
2. Sets 3 available seats
3. Shares cost: $5 per rider
4. Picks up riders along the route
5. Earns badges and saves on gas

**John (Rider):**

1. Searches for trips to office
2. Finds Sarah's regular trip
3. Joins the trip
4. Pays $5 via the app
5. Saves money and reduces carbon footprint

### Scenario 2: Bike Sharing for Lunch

**Mike:**

1. Needs a bike for lunch errands
2. Browses available bikes nearby
3. Borrows Emma's bike for 1 hour
4. Returns it after lunch
5. Rates the experience 5 stars

### Scenario 3: Book Club

**Team:**

1. Members add books to shared library
2. Others browse and borrow
3. Discuss books in group chat
4. Return and rate books
5. Build office book collection

---

## Tips & Best Practices

### For Drivers

✅ Be punctual - arrive on time
✅ Keep your car clean
✅ Communicate with riders
✅ Drive safely
✅ Be friendly and professional

### For Riders

✅ Be ready on time
✅ Respect the driver's car
✅ Contribute to conversation
✅ Pay promptly if cost-sharing
✅ Rate honestly and fairly

### For Everyone

✅ Complete your profile with a photo
✅ Maintain a good reputation score
✅ Respond to messages promptly
✅ Be respectful and courteous
✅ Report issues immediately
✅ Provide feedback to improve the platform

---

## Troubleshooting

### Mobile App Issues

**App won't start:**

- Check internet connection
- Update to latest version
- Clear app cache
- Reinstall if needed

**Can't login:**

- Verify email and password
- Check caps lock
- Reset password if forgotten
- Contact admin if account locked

**GPS not working:**

- Enable location services
- Grant app location permission
- Check device GPS settings
- Restart app

**Push notifications not working:**

- Enable notifications in settings
- Check device notification settings
- Update app to latest version

### Service Issues

**Service not responding:**

```bash
# Check if service is running
curl http://localhost:3001/health

# Restart service
cd services/user-service
npm start
```

**Database connection error:**

- Verify MongoDB URI in .env
- Check network connectivity
- Verify database credentials
- Check MongoDB Atlas whitelist

**Authentication errors:**

- Verify JWT_SECRET matches across services
- Check token expiration
- Clear app data and login again

### Common Error Messages

**"Access token required"**

- You need to login again
- Token may have expired

**"Invalid or expired token"**

- Login again to get new token
- Check system time is correct

**"User not found"**

- Account may not exist
- Check email spelling
- Contact admin

**"Trip not found"**

- Trip may have been cancelled
- Refresh the trip list
- Check trip ID

---

## Getting Help

### In-App Support

1. Tap **"Settings"** → **"Help"**
2. Browse FAQ
3. Contact support
4. Submit feedback

### Developer Support

- Check documentation in `/docs`
- Review API documentation
- Check service logs
- Run diagnostic tests

### Community

- Join office Slack channel
- Attend platform training sessions
- Share tips with colleagues

---

## Safety & Privacy

### Your Data

- We encrypt all data in transit and at rest
- Location data is only shared when you enable it
- You control your privacy settings
- We never sell your data

### Safety Features

- User verification system
- Rating and review system
- Report and block users
- Emergency contact features
- Trip tracking for safety

### Reporting Issues

If you experience any safety concerns:

1. Use in-app report feature
2. Contact admin immediately
3. Document the incident
4. We take all reports seriously

---

## Updates & Maintenance

### App Updates

- Enable auto-updates in app store
- Check for updates regularly
- Review release notes
- Provide feedback on new features

### Scheduled Maintenance

- Usually performed during off-hours
- Notifications sent in advance
- Minimal disruption expected
- Status updates provided

---

## FAQ

**Q: Is OfficeShare free to use?**
A: Yes! The platform is free. Drivers can optionally charge for cost-sharing.

**Q: How is my reputation score calculated?**
A: Based on ratings from other users. Start at 5.0, updated after each transaction.

**Q: Can I use OfficeShare for personal trips?**
A: It's designed for office commutes, but check your company policy.

**Q: What if a rider/driver cancels?**
A: You'll receive a notification. You can find another trip or create a new one.

**Q: How do I report a problem?**
A: Use the in-app feedback feature or contact your admin.

**Q: Can I delete my account?**
A: Yes, go to Settings → Account → Delete Account.

**Q: How do I earn badges?**
A: Complete trips, share resources, maintain good ratings, and save CO2!

**Q: Is my location tracked all the time?**
A: No, only during active trips and only if you enable tracking.

---

## Contact & Support

### For Users

- **In-App Support**: Settings → Help
- **Email**: support@officeshare.com
- **Office Admin**: Contact your office administrator

### For Developers

- **Documentation**: Check `/docs` folder
- **Issues**: Create GitHub issue
- **API Docs**: See service README files
- **Testing**: See `TESTING_GUIDE.md`

---

## Version Information

- **Platform Version**: 1.0.0
- **Last Updated**: October 2024
- **Supported Platforms**: iOS 13+, Android 8+
- **Node.js**: v18+
- **Database**: MongoDB 6+

---

## What's Next?

### Coming Soon

- 🚗 Advanced route optimization
- 🎯 Better matching algorithms
- 📱 Apple Watch support
- 🌍 Multi-language support
- 💳 Integrated payments
- 🎮 More gamification features

### Stay Updated

- Follow release notes
- Join beta testing program
- Provide feedback
- Suggest new features

---

**Thank you for using OfficeShare! Together, we're making commutes better and the planet greener. 🌱**

For the latest updates and detailed documentation, visit our repository or contact your administrator.
