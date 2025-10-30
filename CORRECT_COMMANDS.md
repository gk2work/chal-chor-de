# OfficeShare - Correct Commands Reference

## ✅ Working Commands

### Installation

```bash
# Install all dependencies (services + apps)
npm run install-all

# Install only services
npm run install-services

# Install only apps (mobile + admin)
npm run install-apps
```

### Starting Services

```bash
# Start all backend services (CORRECT - note the colon!)
npm run start:all

# Start individual services
npm run start:gateway      # API Gateway
npm run start:user         # User Service
npm run start:carpooling   # Carpooling Service
npm run start:matching     # Matching Service
npm run start:tracking     # Tracking Service
npm run start:notification # Notification Service
npm run start:chat         # Chat Service
```

### Development Mode (with auto-reload)

```bash
# Start all services in dev mode
npm run dev

# Start individual services in dev mode
npm run dev:gateway
npm run dev:user
npm run dev:carpooling
# ... etc
```

### Starting Apps

```bash
# Mobile app
npm run dev:mobile
# OR manually:
cd mobile-app && npm start

# Admin dashboard
npm run dev:admin
# OR manually:
cd admin-dashboard && npm start
```

### Testing

```bash
# Run all tests
npm test

# Test only services
npm run test:services

# Test only apps
npm run test:apps
```

## 🚀 Quick Start Guide

### Method 1: Using npm scripts (Recommended)

```bash
# 1. Install everything
npm run install-all

# 2. Start all backend services
npm run start:all

# 3. In a new terminal, start mobile app
npm run dev:mobile

# 4. In another terminal, start admin dashboard
npm run dev:admin
```

### Method 2: Using the shell script

```bash
# Start all services
./start-platform.sh

# In a new terminal, start mobile app
cd mobile-app && npx expo start

# Stop all services
./stop-platform.sh
```

### Method 3: Manual (for debugging)

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

# Terminal 4 - Gamification Service
cd services/gamification-service
npm install
npm start

# Terminal 5 - Mobile App
cd mobile-app
npm install
npx expo start
```

## 🔍 Verify Services Are Running

```bash
# Check service health
curl http://localhost:3001/health  # User Service
curl http://localhost:3002/health  # Carpool Service
curl http://localhost:3009/health  # Feedback Service

# Should return:
# {"status":"healthy","service":"...","timestamp":"...","version":"1.0.0"}
```

## 🐛 Troubleshooting

### "Missing script: start-all"

**Problem**: You typed `npm run start-all` (with hyphen)

**Solution**: Use `npm run start:all` (with colon)

```bash
# ❌ Wrong
npm run start-all

# ✅ Correct
npm run start:all
```

### Port Already in Use

```bash
# Find what's using the port
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or use the stop script
./stop-platform.sh
```

### Vulnerabilities Warning

The vulnerabilities you see are:

- **Mobile app**: Peer dependency conflicts (not critical)
- **Admin dashboard**: Development dependencies (not critical)

These are safe to ignore for development. For production:

```bash
# Update dependencies (be careful, may break things)
cd mobile-app
npm audit fix --legacy-peer-deps

cd ../admin-dashboard
npm audit fix --legacy-peer-deps
```

### Services Won't Start

```bash
# 1. Check if MongoDB is accessible
mongo "mongodb+srv://your-uri" --eval "db.version()"

# 2. Check .env file exists
ls -la .env
cat .env | grep MONGODB_URI

# 3. Copy .env to services
cp .env services/user-service/.env
cp .env services/carpooling-service/.env
cp .env services/feedback-service/.env
# ... etc

# 4. Try starting one service manually
cd services/user-service
npm install
npm start
```

## 📊 Service Ports Reference

| Service              | Port | Command                      | Health Check                 |
| -------------------- | ---- | ---------------------------- | ---------------------------- |
| API Gateway          | 3000 | `npm run start:gateway`      | http://localhost:3000/health |
| User Service         | 3001 | `npm run start:user`         | http://localhost:3001/health |
| Carpool Service      | 3002 | `npm run start:carpooling`   | http://localhost:3002/health |
| Matching Service     | 3003 | `npm run start:matching`     | http://localhost:3003/health |
| Tracking Service     | 3004 | `npm run start:tracking`     | http://localhost:3004/health |
| Notification Service | 3005 | `npm run start:notification` | http://localhost:3005/health |
| Chat Service         | 3006 | `npm run start:chat`         | http://localhost:3006/health |
| Admin Dashboard      | 3007 | `npm run dev:admin`          | http://localhost:3007        |
| Gamification Service | 3008 | Manual start needed          | http://localhost:3008/health |
| Feedback Service     | 3009 | Manual start needed          | http://localhost:3009/health |

## 🎯 Recommended Workflow

### For Development

```bash
# 1. Start backend services in dev mode (auto-reload)
npm run dev

# 2. In new terminal, start mobile app
cd mobile-app
npx expo start

# 3. In new terminal, start admin dashboard
cd admin-dashboard
npm start

# 4. Make changes, services auto-reload!
```

### For Testing

```bash
# 1. Start services
npm run start:all

# 2. Run tests
npm test

# 3. Or run specific tests
cd services/user-service && npm test
cd test/integration && npm test
```

### For Production

```bash
# 1. Install production dependencies only
npm ci --production

# 2. Start services
npm run start:all

# 3. Use process manager (PM2)
pm2 start ecosystem.config.js
```

## 📝 Complete Startup Sequence

Here's the exact sequence to get everything running:

```bash
# Step 1: Install (one time)
npm run install-all

# Step 2: Start backend services
npm run start:all

# Step 3: Wait 10 seconds for services to start

# Step 4: Verify services are running
curl http://localhost:3001/health
curl http://localhost:3002/health

# Step 5: Start mobile app (new terminal)
cd mobile-app
npx expo start

# Step 6: Start admin dashboard (new terminal)
cd admin-dashboard
npm start

# Step 7: Open mobile app
# - Press 'i' for iOS simulator
# - Press 'a' for Android emulator
# - Scan QR code with Expo Go on phone

# Step 8: Open admin dashboard
# - Browser opens automatically at http://localhost:3007
```

## 🛑 Stopping Everything

```bash
# Method 1: Use stop script
./stop-platform.sh

# Method 2: Kill by port
lsof -i :3000-3009 | awk 'NR>1 {print $2}' | xargs kill -9

# Method 3: Ctrl+C in each terminal
# Press Ctrl+C in each terminal window
```

## 💡 Pro Tips

1. **Use tmux or screen** for managing multiple terminals
2. **Use VS Code tasks** to start all services at once
3. **Create aliases** for common commands:
   ```bash
   alias start-office="npm run start:all"
   alias stop-office="./stop-platform.sh"
   ```
4. **Use nodemon** for auto-reload during development
5. **Check logs** if services fail to start

## 🆘 Still Having Issues?

1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. Review [USER_GUIDE.md](USER_GUIDE.md)
3. Check service logs in terminal
4. Verify MongoDB connection
5. Ensure all .env files are configured
6. Try starting services one by one to isolate issues

---

**Remember**: The key command is `npm run start:all` (with colon, not hyphen)!
