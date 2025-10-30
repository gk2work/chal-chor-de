# OfficeShare Commands Cheatsheet

## 🚀 Quick Commands

### Start Everything

```bash
# ✅ CORRECT - Use this!
npm run start:all

# Alternative (shell script)
./start-platform.sh
```

### Stop Everything

```bash
./stop-platform.sh
```

### Start Mobile App

```bash
# IMPORTANT: Must be in mobile-app directory!
cd mobile-app
npx expo start

# Or use npm script from root
npm run dev:mobile
```

### Start Admin Dashboard

```bash
cd admin-dashboard
npm start
```

## 📦 Installation

```bash
# Install all dependencies
npm run install-all
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run integration tests
cd test/integration && npm test
```

## 🔍 Check Services

```bash
# Check if services are running
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3009/health
```

## 🐛 Troubleshooting

```bash
# Find what's using a port
lsof -i :3001

# Kill a process
kill -9 <PID>

# Stop all services
./stop-platform.sh
```

## ⚠️ Common Mistakes

### ❌ WRONG

```bash
npm run start-all  # Missing colon!
```

### ✅ CORRECT

```bash
npm run start:all  # With colon!
```

## 📊 Service Ports

- 3000 - API Gateway
- 3001 - User Service
- 3002 - Carpool Service
- 3003 - Matching Service
- 3004 - Tracking Service
- 3005 - Notification Service
- 3006 - Chat Service
- 3007 - Admin Dashboard
- 3008 - Gamification Service
- 3009 - Feedback Service

## 🎯 Complete Startup

```bash
# 1. Install (first time only)
npm run install-all

# 2. Start backend
npm run start:all

# 3. Start mobile (new terminal)
cd mobile-app && npx expo start

# 4. Start admin (new terminal)
cd admin-dashboard && npm start
```

---

**Remember**: `npm run start:all` (with colon!)

For detailed commands, see [CORRECT_COMMANDS.md](CORRECT_COMMANDS.md)
