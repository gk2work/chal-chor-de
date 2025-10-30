# How to Use OfficeShare - Complete Guide

## 🎯 Choose Your Path

### I'm an End User (Want to use the app)

👉 Go to [End User Guide](#end-user-guide)

### I'm a Developer (Want to run/modify the code)

👉 Go to [Developer Guide](#developer-guide)

### I'm an Admin (Want to manage the platform)

👉 Go to [Admin Guide](#admin-guide)

---

# End User Guide

## Getting Started

### 1. Install the App

**For Testing/Development:**

1. Install Expo Go on your phone:
   - iOS: Download from App Store
   - Android: Download from Google Play

2. Ask your developer to start the app:

   ```
   They'll run: npx expo start
   ```

3. Scan the QR code with:
   - iOS: Camera app
   - Android: Expo Go app

**For Production:**

- Download OfficeShare from App Store (iOS)
- Download OfficeShare from Google Play (Android)

### 2. Create Your Account

```
1. Open OfficeShare app
2. Tap "Sign Up"
3. Enter:
   ✓ Work email
   ✓ Password (min 6 characters)
   ✓ Full name
   ✓ Office ID (ask your admin)
4. Tap "Create Account"
5. Done! 🎉
```

### 3. Complete Your Profile

```
1. Tap "Profile" tab
2. Tap "Edit Profile"
3. Add:
   ✓ Profile photo
   ✓ Phone number (optional)
   ✓ Bio (optional)
4. Set preferences:
   ✓ Enable notifications
   ✓ Location sharing
   ✓ Email alerts
5. Tap "Save"
```

## Using Features

### 🚗 Carpooling

#### Create a Trip (As Driver)

```
Step 1: Open Carpool
├─ Tap "Carpool" tab at bottom
└─ Tap "Create Trip" button

Step 2: Fill Details
├─ Origin: Where you start
├─ Destination: Where you're going
├─ Date & Time: When you leave
├─ Available Seats: How many riders
└─ Cost per Rider: Optional (e.g., $5)

Step 3: Create
├─ Review details
├─ Tap "Create Trip"
└─ Wait for riders to join!

Step 4: Manage Trip
├─ View who joined
├─ Chat with riders
├─ Start trip when ready
├─ Complete when done
└─ Rate your riders
```

#### Join a Trip (As Rider)

```
Step 1: Find Trips
├─ Tap "Carpool" tab
├─ Browse available trips
└─ Use filters:
   ├─ Date
   ├─ Time
   ├─ Location
   └─ Available seats

Step 2: Select Trip
├─ Tap on a trip
├─ View details:
   ├─ Driver info
   ├─ Route
   ├─ Time
   ├─ Cost
   └─ Available seats

Step 3: Join
├─ Tap "Join Trip"
├─ Confirm details
└─ Wait for driver confirmation

Step 4: During Trip
├─ View driver location (if shared)
├─ Chat with driver
├─ Complete trip when done
└─ Rate the driver
```

### 🚲 Bike Sharing

#### Lend Your Bike

```
1. Tap "Bike Sharing" tab
2. Tap "Add Bike" button
3. Fill details:
   ├─ Bike type (mountain/road/hybrid)
   ├─ Condition (excellent/good/fair)
   ├─ Location
   ├─ Available dates
   └─ Upload photo
4. Tap "List Bike"
5. Wait for borrow requests
```

#### Borrow a Bike

```
1. Tap "Bike Sharing" tab
2. Browse available bikes
3. Filter by:
   ├─ Type
   ├─ Location
   └─ Availability
4. Tap on a bike
5. View details
6. Tap "Request to Borrow"
7. Arrange pickup with owner
8. Return when done
9. Rate the experience
```

### 📚 Book Sharing

#### Share Your Books

```
1. Tap "Library" tab
2. Tap "Add Book" button
3. Enter:
   ├─ Title
   ├─ Author
   ├─ ISBN (optional)
   ├─ Genre
   ├─ Condition
   └─ Upload photo
4. Tap "Add to Library"
5. Wait for borrow requests
```

#### Borrow Books

```
1. Tap "Library" tab
2. Search or browse books
3. Filter by:
   ├─ Genre
   ├─ Author
   └─ Availability
4. Tap on a book
5. View details
6. Tap "Request to Borrow"
7. Arrange pickup
8. Return when finished
9. Rate the book
```

### 💬 Chat

#### Start a Chat

```
1. Tap "Chat" tab
2. Tap "New Message" button
3. Select a user
4. Type your message
5. Tap send
```

#### Group Chats

```
Automatic for trips:
├─ Join a carpool trip
├─ Group chat created automatically
├─ Chat with all participants
└─ Share updates and location
```

### 🏆 Gamification

#### View Your Stats

```
1. Tap "Profile" tab
2. Scroll to "Your Impact"
3. See:
   ├─ Total trips
   ├─ CO2 saved
   ├─ Trees equivalent
   ├─ Miles not driven
   └─ Your badges
```

#### Earn Badges

```
Badges you can earn:
├─ 🚗 First Ride (1 trip)
├─ 🚙 Carpooler (10 trips)
├─ 🏆 Carpool Champion (50 trips)
├─ 🚴 First Bike (1 bike share)
├─ 🚲 Bike Enthusiast (10 shares)
├─ 📚 Bookworm (1 book share)
├─ 📖 Librarian (10 books shared)
├─ 🌱 Eco Warrior (100kg CO2 saved)
├─ 🌍 Eco Champion (500kg CO2 saved)
└─ ⭐ Community Hero (4.5+ rating)
```

#### Check Leaderboards

```
1. Tap "Profile" tab
2. Tap "Leaderboards"
3. View rankings:
   ├─ Most trips
   ├─ Most CO2 saved
   ├─ Most shares
   └─ Top rated users
```

### 📊 Provide Feedback

```
1. Tap "Settings"
2. Tap "Feedback"
3. Choose category:
   ├─ Bug Report
   ├─ Feature Request
   ├─ Improvement
   ├─ UX Issue
   └─ General
4. Select module (Carpooling, etc.)
5. Rate (1-5 stars)
6. Write title and description
7. Tap "Submit"
```

## Tips for Success

### For Drivers ✅

- Be punctual
- Keep car clean
- Communicate clearly
- Drive safely
- Be friendly

### For Riders ✅

- Be on time
- Respect the car
- Contribute to conversation
- Pay promptly if cost-sharing
- Rate honestly

### For Everyone ✅

- Complete your profile
- Respond to messages quickly
- Be respectful
- Maintain good rating
- Report issues immediately

---

# Developer Guide

## Quick Start

### 1. Prerequisites Check

```bash
# Check Node.js (need v18+)
node --version

# Check npm (need v8+)
npm --version

# Check Expo CLI
npx expo --version
```

If missing, install from:

- Node.js: https://nodejs.org/
- Expo: Comes with npx

### 2. Clone and Setup

```bash
# Clone repository
git clone <repository-url>
cd chal-chor-de

# Copy environment file
cp .env.example .env

# Edit .env with your MongoDB URI
nano .env
```

### 3. Start Everything

**Option A: One Command (Recommended)**

```bash
./start-platform.sh
```

**Option B: Manual Start**

```bash
# Terminal 1 - User Service
cd services/user-service
npm install
npm start

# Terminal 2 - Carpool Service
cd services/carpooling-service
npm install
npm start

# Terminal 3 - Feedback Service
cd services/feedback-service
npm install
npm start

# Continue for other services...
```

### 4. Start Mobile App

```bash
# New terminal
cd mobile-app
npm install
npx expo start

# Then:
# Press 'i' for iOS simulator
# Press 'a' for Android emulator
# Scan QR with Expo Go on phone
```

### 5. Start Admin Dashboard

```bash
# New terminal
cd admin-dashboard
npm install
npm start

# Opens at http://localhost:3007
```

## Development Workflow

### Making Changes

```bash
# 1. Create a branch
git checkout -b feature/my-feature

# 2. Make your changes
# Edit files in your editor

# 3. Test locally
npm test

# 4. Commit
git add .
git commit -m "Add my feature"

# 5. Push
git push origin feature/my-feature

# 6. Create Pull Request
# Go to GitHub and create PR
```

### Running Tests

```bash
# All tests
./test/run-all-tests.sh

# Specific service
cd services/user-service
npm test

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### Debugging

```bash
# Check service health
curl http://localhost:3001/health

# View logs
cd services/user-service
npm start
# Logs appear in terminal

# Check database
# Use MongoDB Compass
# Connection: mongodb+srv://...
```

### Common Tasks

#### Add a New API Endpoint

```javascript
// In services/user-service/server.js

app.get("/api/users/new-endpoint", authenticateToken, async (req, res) => {
  try {
    // Your logic here
    res.json({ message: "Success" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});
```

#### Add a New Screen (Mobile)

```javascript
// In mobile-app/src/screens/NewScreen.js

import React from "react";
import { View, Text } from "react-native";

const NewScreen = () => {
  return (
    <View>
      <Text>New Screen</Text>
    </View>
  );
};

export default NewScreen;
```

#### Add a New Database Collection

```javascript
// In service that needs it

// Create index
await db.collection("new_collection").createIndex({
  user_id: 1,
  office_id: 1,
});

// Insert document
await db.collection("new_collection").insertOne({
  user_id: "123",
  office_id: "office_001",
  data: "value",
  created_at: new Date(),
});
```

## Troubleshooting

### Port Already in Use

```bash
# Find process on port
lsof -i :3001

# Kill process
kill -9 <PID>

# Or use stop script
./stop-platform.sh
```

### Database Connection Error

```bash
# Check .env file
cat .env | grep MONGODB_URI

# Test connection
mongo "mongodb+srv://..." --eval "db.version()"

# Verify IP whitelist in MongoDB Atlas
```

### Mobile App Won't Start

```bash
# Clear cache
npx expo start -c

# Reinstall dependencies
rm -rf node_modules
npm install

# Check backend is running
curl http://localhost:3001/health
```

### Tests Failing

```bash
# Run specific test
npm test -- path/to/test.js

# Run with verbose output
npm test -- --verbose

# Check test database
# Ensure using test database, not dev
```

---

# Admin Guide

## Accessing Admin Dashboard

```
1. Open browser
2. Go to http://localhost:3007
   (or your deployed URL)
3. Login with admin credentials
4. You're in!
```

## Dashboard Features

### 📊 Analytics Overview

```
View:
├─ Total users
├─ Active trips
├─ Platform usage
├─ Environmental impact
└─ Growth trends
```

### 👥 User Management

```
Actions:
├─ View all users
├─ Search users
├─ View user activity
├─ Manage accounts
├─ Reset passwords
└─ Handle disputes
```

### 🚗 Trip Management

```
Monitor:
├─ All carpool trips
├─ Active trips
├─ Completed trips
├─ Cancelled trips
└─ Trip statistics
```

### 📝 Feedback Management

```
Review:
├─ All user feedback
├─ Filter by category
├─ Filter by status
├─ Respond to feedback
├─ Track trends
└─ View ratings
```

### 📈 Reports

```
Generate:
├─ User activity reports
├─ Trip statistics
├─ Environmental impact
├─ Module usage
├─ Performance metrics
└─ A/B test results
```

### ⚙️ Settings

```
Configure:
├─ Platform settings
├─ Office locations
├─ A/B tests
├─ Notifications
└─ System parameters
```

## Common Admin Tasks

### Add New Office

```
1. Go to Settings
2. Click "Offices"
3. Click "Add Office"
4. Enter:
   ├─ Office ID
   ├─ Office name
   ├─ Address
   └─ Contact info
5. Save
```

### Handle User Report

```
1. Go to "Reports" section
2. View reported issue
3. Investigate:
   ├─ Check user history
   ├─ Review trip details
   └─ Check messages
4. Take action:
   ├─ Warning
   ├─ Suspension
   └─ Ban (if serious)
5. Notify user
```

### Create A/B Test

```
1. Go to "A/B Tests"
2. Click "Create Test"
3. Enter:
   ├─ Test name
   ├─ Description
   ├─ Variants (A, B, etc.)
   ├─ Allocation %
   └─ Target metric
4. Start test
5. Monitor results
6. End test when conclusive
```

### View Feedback Trends

```
1. Go to "Feedback"
2. Select time period
3. View:
   ├─ Category distribution
   ├─ Rating trends
   ├─ Common issues
   └─ Feature requests
4. Export report
```

---

# Quick Reference

## Service URLs

| Service          | URL                   |
| ---------------- | --------------------- |
| API Gateway      | http://localhost:3000 |
| User Service     | http://localhost:3001 |
| Carpool Service  | http://localhost:3002 |
| Admin Dashboard  | http://localhost:3007 |
| Feedback Service | http://localhost:3009 |

## Common Commands

```bash
# Start platform
./start-platform.sh

# Stop platform
./stop-platform.sh

# Run tests
./test/run-all-tests.sh

# Start mobile app
cd mobile-app && npx expo start

# Check service health
curl http://localhost:3001/health
```

## Important Files

```
.env                    - Environment variables
README.md               - Main documentation
USER_GUIDE.md          - Detailed user guide
DEVELOPMENT_SETUP.md   - Developer setup
TESTING_GUIDE.md       - Testing documentation
ARCHITECTURE.md        - System architecture
```

## Getting Help

### Documentation

- 📖 [Full User Guide](USER_GUIDE.md)
- 💻 [Developer Setup](DEVELOPMENT_SETUP.md)
- 🧪 [Testing Guide](TESTING_GUIDE.md)
- 🏗️ [Architecture](ARCHITECTURE.md)
- ⚡ [Quick Start](QUICK_START.md)

### Support

- 📧 Email: support@officeshare.com
- 💬 In-app: Settings → Help
- 🐛 Issues: GitHub Issues
- 📚 Docs: Check `/docs` folder

---

**That's everything you need to know! Choose your path above and get started! 🚀**
