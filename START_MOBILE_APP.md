# How to Start the Mobile App

## ✅ Correct Way to Start

### Step 1: Navigate to mobile-app directory

```bash
cd mobile-app
```

### Step 2: Install dependencies (first time only)

```bash
npm install
```

### Step 3: Start Expo

```bash
npx expo start
```

OR

```bash
npm start
```

### Step 4: Choose your platform

Once Expo starts, you'll see a QR code and options:

- Press **'i'** - Open in iOS Simulator
- Press **'a'** - Open in Android Emulator
- Press **'w'** - Open in web browser
- **Scan QR code** - Open on your physical device with Expo Go app

## 🐛 Troubleshooting

### Error: "Cannot resolve entry file"

**Problem**: You're trying to run `npx expo start` from the wrong directory

**Solution**: Make sure you're in the `mobile-app` directory

```bash
# Check current directory
pwd

# Should show: .../chal-chor-de/mobile-app

# If not, navigate to it
cd mobile-app
```

### Error: "Expo CLI not found"

**Solution**: Install Expo CLI

```bash
npm install -g expo-cli
# OR use npx (no installation needed)
npx expo start
```

### Error: "Metro bundler failed to start"

**Solution**: Clear cache and restart

```bash
npx expo start -c
```

### Error: "Unable to resolve module"

**Solution**: Reinstall dependencies

```bash
rm -rf node_modules
npm install
npx expo start
```

### Backend Services Not Running

The mobile app needs backend services to be running!

**Solution**: In a separate terminal, start backend services

```bash
# From project root
npm run start:all
```

Then verify services are running:

```bash
curl http://localhost:3001/health
```

## 📱 Using on Physical Device

### iOS (iPhone/iPad)

1. Install **Expo Go** from App Store
2. Make sure your phone and computer are on the same WiFi
3. Open Expo Go app
4. Scan the QR code shown in terminal
5. App will load on your phone

### Android

1. Install **Expo Go** from Google Play Store
2. Make sure your phone and computer are on the same WiFi
3. Open Expo Go app
4. Scan the QR code shown in terminal
5. App will load on your phone

## 🖥️ Using Simulators/Emulators

### iOS Simulator (Mac only)

1. Install Xcode from App Store
2. Install Xcode Command Line Tools:
   ```bash
   xcode-select --install
   ```
3. Start Expo: `npx expo start`
4. Press **'i'** to open in iOS Simulator

### Android Emulator

1. Install Android Studio
2. Set up Android Virtual Device (AVD)
3. Start the emulator from Android Studio
4. Start Expo: `npx expo start`
5. Press **'a'** to open in Android Emulator

## 🔧 Complete Setup from Scratch

```bash
# 1. Navigate to mobile app directory
cd mobile-app

# 2. Install dependencies
npm install

# 3. Start backend services (in another terminal)
cd ..
npm run start:all

# 4. Return to mobile-app and start Expo
cd mobile-app
npx expo start

# 5. Choose your platform (i/a/w or scan QR)
```

## 📊 Verify Backend Connection

Once the app loads, try these actions to verify backend connection:

1. **Sign Up** - Create a new account
   - If successful, backend is connected ✅
   - If error, check backend services are running

2. **Check Network Tab** in Expo DevTools
   - Should see API calls to localhost:3000

3. **Check Backend Logs**
   - Should see incoming requests in service terminals

## 🎯 Quick Commands Reference

```bash
# Start with cache clear
npx expo start -c

# Start on specific platform
npx expo start --ios
npx expo start --android
npx expo start --web

# Start in tunnel mode (for physical device on different network)
npx expo start --tunnel

# Start in LAN mode (default)
npx expo start --lan

# Start in localhost mode
npx expo start --localhost
```

## 🆘 Still Having Issues?

### Check these:

1. ✅ You're in the `mobile-app` directory
2. ✅ Dependencies are installed (`node_modules` folder exists)
3. ✅ Backend services are running (`npm run start:all`)
4. ✅ Port 19000-19001 are not in use
5. ✅ Your firewall allows Expo connections

### Get Help:

- Check [USER_GUIDE.md](../USER_GUIDE.md)
- Check [CORRECT_COMMANDS.md](../CORRECT_COMMANDS.md)
- Review Expo logs in terminal
- Check backend service logs

## 💡 Pro Tips

1. **Use Expo Go app** on your phone for fastest development
2. **Enable Fast Refresh** for instant updates
3. **Use Expo DevTools** for debugging (press 'd' in terminal)
4. **Check logs** with 'j' to open debugger
5. **Shake device** to open developer menu on physical device

---

**Remember**: Always start from the `mobile-app` directory!

```bash
cd mobile-app
npx expo start
```
