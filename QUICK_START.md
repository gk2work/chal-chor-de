# OfficeShare - Quick Start Guide ⚡

Get up and running in 5 minutes!

## 🎯 For End Users (Mobile App)

### Step 1: Install & Sign Up

```
1. Download OfficeShare app
2. Tap "Sign Up"
3. Enter: Email, Password, Name, Office ID
4. Tap "Create Account"
```

### Step 2: Complete Your Profile

```
1. Add profile photo
2. Set preferences
3. Enable notifications
4. You're ready!
```

### Step 3: Start Using Features

#### 🚗 Carpool

```
As Driver:                    As Rider:
1. Tap "Carpool"             1. Tap "Carpool"
2. "Create Trip"             2. Browse trips
3. Fill details              3. Tap on a trip
4. "Create"                  4. "Join Trip"
```

#### 🚲 Share Bike

```
Lend:                        Borrow:
1. Tap "Bike Sharing"        1. Tap "Bike Sharing"
2. "Add Bike"                2. Browse bikes
3. Enter details             3. Tap on bike
4. "List Bike"               4. "Request to Borrow"
```

#### 📚 Share Book

```
Share:                       Borrow:
1. Tap "Library"             1. Tap "Library"
2. "Add Book"                2. Search books
3. Enter details             3. Tap on book
4. "Add to Library"          4. "Request to Borrow"
```

---

## 💻 For Developers

### One-Command Start

```bash
# Start everything (Option 1: npm)
npm run start:all

# OR Option 2: shell script
./start-platform.sh

# Stop everything
./stop-platform.sh
```

### Manual Start

#### Backend Services

```bash
# Terminal 1 - User Service
cd services/user-service && npm start

# Terminal 2 - Carpool Service
cd services/carpooling-service && npm start

# Terminal 3 - Feedback Service
cd services/feedback-service && npm start

# ... repeat for other services
```

#### Mobile App

```bash
cd mobile-app
npm install
npx expo start

# Then press:
# 'i' for iOS
# 'a' for Android
# Scan QR with Expo Go
```

#### Admin Dashboard

```bash
cd admin-dashboard
npm install
npm start

# Opens at http://localhost:3007
```

### Quick Health Check

```bash
# Check if services are running
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3009/health
```

### Run Tests

```bash
# All tests
./test/run-all-tests.sh

# Specific service
cd services/user-service && npm test

# Integration tests
cd test/integration && npm test
```

---

## 🔧 Configuration

### Environment Setup

```bash
# 1. Copy .env file
cp .env.example .env

# 2. Edit with your values
nano .env

# 3. Copy to services
cp .env services/user-service/.env
cp .env services/carpooling-service/.env
# ... etc
```

### Required Variables

```bash
MONGODB_URI=mongodb+srv://your-connection-string
JWT_SECRET=your-secret-key
NODE_ENV=development
```

---

## 📊 Service URLs

| Service          | Port | URL                   |
| ---------------- | ---- | --------------------- |
| API Gateway      | 3000 | http://localhost:3000 |
| User Service     | 3001 | http://localhost:3001 |
| Carpool Service  | 3002 | http://localhost:3002 |
| Admin Dashboard  | 3007 | http://localhost:3007 |
| Feedback Service | 3009 | http://localhost:3009 |

---

## 🐛 Quick Troubleshooting

### Service won't start

```bash
# Check port
lsof -i :3001

# Kill process
kill -9 $(lsof -ti:3001)

# Restart
cd services/user-service && npm start
```

### Database error

```bash
# Check connection
mongo "mongodb+srv://your-uri" --eval "db.version()"

# Verify .env
cat .env | grep MONGODB_URI
```

### Mobile app error

```bash
# Clear cache
npx expo start -c

# Reinstall
rm -rf node_modules && npm install
```

---

## 📱 Common User Actions

### Create a Carpool Trip

```
Carpool Tab → Create Trip → Fill Form → Create
```

### Join a Trip

```
Carpool Tab → Browse → Select Trip → Join Trip
```

### Submit Feedback

```
Settings → Feedback → Choose Category → Write → Submit
```

### View Your Stats

```
Profile Tab → View Badges → See Impact
```

### Rate Someone

```
Complete Trip → Rate Experience → Submit Rating
```

---

## 🎯 Key Features at a Glance

```
✅ Carpooling        - Share rides, save money
✅ Bike Sharing      - Borrow/lend bikes
✅ Book Library      - Exchange books
✅ Real-time Chat    - Message users
✅ Gamification      - Earn badges
✅ Analytics         - Track impact
✅ Feedback System   - Improve platform
✅ A/B Testing       - Test features
```

---

## 📖 Need More Help?

- **Full User Guide**: [USER_GUIDE.md](USER_GUIDE.md)
- **Developer Docs**: [DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md)
- **Testing Guide**: [TESTING_GUIDE.md](TESTING_GUIDE.md)
- **Main README**: [README.md](README.md)

---

## 🚀 Next Steps

### For Users

1. ✅ Sign up and complete profile
2. ✅ Create or join your first trip
3. ✅ Earn your first badge
4. ✅ Provide feedback

### For Developers

1. ✅ Start all services
2. ✅ Run tests
3. ✅ Make a change
4. ✅ Submit PR

---

**That's it! You're ready to use OfficeShare! 🎉**

_Questions? Check the full guides or contact support._
