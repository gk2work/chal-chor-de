# OfficeShare Platform - Complete Startup Guide

## 🎯 The Right Way to Start Everything

### Prerequisites Check

```bash
# Check Node.js (need v18+)
node --version

# Check npm (need v8+)
npm --version

# Check you're in the project root
pwd
# Should show: .../chal-chor-de
```

## 🚀 Method 1: Step-by-Step (Recommended for First Time)

### Terminal 1: Backend Services

```bash
# From project root
npm run start:all
```

Wait 10-15 seconds for services to start. You should see:

```
🚀 User Service running on http://localhost:3001
🚀 Carpooling Service running on http://localhost:3002
🚀 Feedback Service running on http://localhost:3009
...
```

### Terminal 2: Mobile App

```bash
# IMPORTANT: Navigate to mobile-app directory first!
cd mobile-app

# Start Expo
npx expo start
```

You'll see a QR code. Then:

- Press **'i'** for iOS Simulator
- Press **'a'** for Android Emulator
- **Scan QR** with Expo Go app on your phone

### Terminal 3: Admin Dashboard (Optional)

```bash
# From project root
cd admin-dashboard
npm start
```

Opens automatically at http://localhost:3007

## 🚀 Method 2: Using Shell Script

### Terminal 1: Backend Services

```bash
./start-platform.sh
```

### Terminal 2: Mobile App

```bash
cd mobile-app
npx expo start
```

### Terminal 3: Admin Dashboard

```bash
cd admin-dashboard
npm start
```

## ✅ Verify Everything is Running

### Check Backend Services

```bash
# User Service
curl http://localhost:3001/health

# Carpool Service
curl http://localhost:3002/health

# Feedback Service
curl http://localhost:3009/health
```

Expected response:

```json
{
  "status": "healthy",
  "service": "User Service",
  "timestamp": "2024-10-30T...",
  "version": "1.0.0"
}
```

### Check Mobile App

- Should see Expo DevTools in browser
- Should see QR code in terminal
- No red error messages

### Check Admin Dashboard

- Browser should open to http://localhost:3007
- Should see login page

## 🐛 Common Issues & Solutions

### Issue 1: "Missing script: start-all"

**Error**: `npm error Missing script: "start-all"`

**Cause**: Using hyphen instead of colon

**Solution**:

```bash
# ❌ Wrong
npm run start-all

# ✅ Correct
npm run start:all
```

### Issue 2: "Cannot resolve entry file" (Mobile App)

**Error**: `ConfigError: Cannot resolve entry file`

**Cause**: Running `npx expo start` from wrong directory

**Solution**:

```bash
# Make sure you're in mobile-app directory
cd mobile-app
npx expo start
```

### Issue 3: Port Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use :::3001`

**Cause**: Service already running on that port

**Solution**:

```bash
# Stop all services
./stop-platform.sh

# Or kill specific port
lsof -i :3001
kill -9 <PID>

# Then restart
npm run start:all
```

### Issue 4: Database Connection Error

**Error**: `MongoServerError: Authentication failed`

**Cause**: MongoDB URI not configured or incorrect

**Solution**:

```bash
# Check .env file exists
ls -la .env

# Check MongoDB URI is set
cat .env | grep MONGODB_URI

# If missing, copy from .env.example
cp .env.example .env

# Edit with your MongoDB URI
nano .env
```

### Issue 5: Backend Services Not Responding

**Symptoms**: Mobile app shows network errors

**Solution**:

```bash
# 1. Check services are running
curl http://localhost:3001/health

# 2. Check service logs in terminal
# Look for error messages

# 3. Restart services
./stop-platform.sh
npm run start:all

# 4. Check .env files in services
ls services/user-service/.env
ls services/carpooling-service/.env
```

## 📋 Complete First-Time Setup

### Step 1: Install Dependencies

```bash
# From project root
npm run install-all
```

This installs dependencies for:

- All backend services
- Mobile app
- Admin dashboard

### Step 2: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your values
nano .env

# Copy to services
cp .env services/user-service/.env
cp .env services/carpooling-service/.env
cp .env services/feedback-service/.env
cp .env services/gamification-service/.env
# ... etc for all services
```

### Step 3: Start Backend

```bash
npm run start:all
```

### Step 4: Start Mobile App

```bash
cd mobile-app
npx expo start
```

### Step 5: Test the App

1. **Sign Up**: Create a test account
2. **Create Trip**: Try creating a carpool trip
3. **Submit Feedback**: Test the feedback feature
4. **Check Profile**: View your profile and stats

## 🎯 Development Workflow

### Daily Startup

```bash
# Terminal 1: Backend
npm run start:all

# Terminal 2: Mobile
cd mobile-app && npx expo start

# Terminal 3: Admin (if needed)
cd admin-dashboard && npm start
```

### Making Changes

1. **Edit code** in your editor
2. **Services auto-reload** (if using `npm run dev`)
3. **Mobile app hot-reloads** automatically
4. **Test changes** immediately

### Running Tests

```bash
# All tests
npm test

# Specific service
cd services/user-service
npm test

# Integration tests
cd test/integration
npm test
```

### Stopping Everything

```bash
# Use stop script
./stop-platform.sh

# Or Ctrl+C in each terminal
```

## 📱 Mobile App Development

### Using Physical Device

1. Install **Expo Go** app on your phone
2. Make sure phone and computer are on **same WiFi**
3. Start Expo: `cd mobile-app && npx expo start`
4. Scan QR code with Expo Go app
5. App loads on your phone

### Using iOS Simulator (Mac only)

1. Install Xcode
2. Start Expo: `cd mobile-app && npx expo start`
3. Press **'i'** to open in iOS Simulator

### Using Android Emulator

1. Install Android Studio
2. Create and start an AVD
3. Start Expo: `cd mobile-app && npx expo start`
4. Press **'a'** to open in Android Emulator

## 🖥️ Admin Dashboard Development

```bash
# Start admin dashboard
cd admin-dashboard
npm start

# Opens at http://localhost:3007

# Login with test credentials
# (Create user via mobile app first)
```

## 📊 Service Ports Reference

| Service              | Port | Start Command                     | Health Check                 |
| -------------------- | ---- | --------------------------------- | ---------------------------- |
| API Gateway          | 3000 | Included in start:all             | http://localhost:3000/health |
| User Service         | 3001 | Included in start:all             | http://localhost:3001/health |
| Carpool Service      | 3002 | Included in start:all             | http://localhost:3002/health |
| Matching Service     | 3003 | Included in start:all             | http://localhost:3003/health |
| Tracking Service     | 3004 | Included in start:all             | http://localhost:3004/health |
| Notification Service | 3005 | Included in start:all             | http://localhost:3005/health |
| Chat Service         | 3006 | Included in start:all             | http://localhost:3006/health |
| Admin Dashboard      | 3007 | `cd admin-dashboard && npm start` | http://localhost:3007        |
| Gamification Service | 3008 | Manual start needed               | http://localhost:3008/health |
| Feedback Service     | 3009 | Manual start needed               | http://localhost:3009/health |

## 🔧 Advanced Configuration

### Using Different Ports

Edit `.env` file:

```bash
USER_SERVICE_PORT=3001
CARPOOL_SERVICE_PORT=3002
# ... etc
```

### Using Different Database

Edit `.env` file:

```bash
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=officeshare_dev
```

### Development vs Production

```bash
# Development
NODE_ENV=development

# Production
NODE_ENV=production
```

## 💡 Pro Tips

1. **Use tmux or screen** to manage multiple terminals
2. **Create aliases** for common commands:
   ```bash
   alias start-office="npm run start:all"
   alias start-mobile="cd mobile-app && npx expo start"
   ```
3. **Use VS Code tasks** to start everything at once
4. **Keep terminals organized** - label them clearly
5. **Check logs regularly** for errors

## 🆘 Getting Help

### Documentation

- **Quick Start**: [QUICK_START.md](QUICK_START.md)
- **Commands**: [COMMANDS_CHEATSHEET.md](COMMANDS_CHEATSHEET.md)
- **Mobile App**: [START_MOBILE_APP.md](START_MOBILE_APP.md)
- **User Guide**: [USER_GUIDE.md](USER_GUIDE.md)
- **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)

### Troubleshooting

- Check service logs in terminals
- Verify .env configuration
- Ensure MongoDB is accessible
- Check firewall settings
- Review error messages carefully

### Support

- Create GitHub issue
- Check existing documentation
- Review service README files
- Contact: support@officeshare.com

---

## ✅ Quick Reference

```bash
# Start backend
npm run start:all

# Start mobile (from mobile-app directory!)
cd mobile-app && npx expo start

# Start admin
cd admin-dashboard && npm start

# Stop everything
./stop-platform.sh

# Check health
curl http://localhost:3001/health
```

**Remember**:

- Use `npm run start:all` (with colon!)
- Start mobile app from `mobile-app` directory!
- Wait for services to fully start before testing!

---

**You're ready to go! 🚀**
