# Mobile App Fix - "Cannot resolve entry file" Error

## ✅ Issue Fixed!

The error "Cannot resolve entry file" has been fixed by:

1. Creating an `index.js` entry point
2. Updating `package.json` to use the correct main field

## 🔄 How to Apply the Fix

### Step 1: Stop Expo (if running)

Press `Ctrl+C` in the terminal where Expo is running

### Step 2: Clear Cache and Restart

```bash
# Make sure you're in mobile-app directory
cd mobile-app

# Clear Expo cache and restart
npx expo start -c
```

The `-c` flag clears the cache, which is important after making these changes.

### Step 3: Scan QR Code Again

Once Expo restarts:

1. You'll see a new QR code
2. Scan it with Expo Go app
3. The app should now load successfully! 🎉

## 🎯 What Was Changed

### 1. Created `index.js`

A new entry point file that properly registers the app component:

```javascript
import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);
```

### 2. Updated `package.json`

Changed the main field from:

```json
"main": "node_modules/expo/AppEntry.js"
```

To:

```json
"main": "index.js"
```

## 🐛 If You Still See Errors

### Try These Steps:

#### 1. Clear All Caches

```bash
cd mobile-app

# Clear Expo cache
npx expo start -c

# If that doesn't work, clear everything
rm -rf .expo
rm -rf node_modules
npm install
npx expo start -c
```

#### 2. Check Your Phone/Computer Connection

- Make sure both are on the **same WiFi network**
- Check that your firewall isn't blocking connections
- Try restarting Expo Go app on your phone

#### 3. Use Tunnel Mode (if on different networks)

```bash
npx expo start --tunnel
```

This creates a tunnel that works even if you're on different networks.

#### 4. Try Web Version First

```bash
npx expo start
# Then press 'w' to open in browser
```

This helps verify the app code is working.

## 📱 Testing the App

Once the app loads, you should see:

1. **Login Screen** - If not logged in
2. **Home Screen** - If logged in
3. **Bottom Navigation** - Home, Books, Bikes, Chat, Profile, Settings

### Test These Features:

1. **Sign Up** - Create a new account
2. **Browse Books** - Check the library
3. **Browse Bikes** - See available bikes
4. **View Profile** - Check your profile

## ⚠️ About Package Version Warnings

You might see warnings like:

```
The following packages should be updated for best compatibility...
```

These are **safe to ignore** for now. They're just version recommendations, not critical errors.

To fix them later (optional):

```bash
npx expo install --fix
```

## 🔧 Backend Connection

Remember, the mobile app needs backend services running!

### Start Backend Services:

In a **separate terminal** (from project root):

```bash
npm run start:all
```

### Verify Backend is Running:

```bash
curl http://localhost:3001/health
```

Should return:

```json
{"status":"healthy","service":"User Service",...}
```

## 📊 Complete Startup Checklist

- [ ] Backend services running (`npm run start:all`)
- [ ] Mobile app directory (`cd mobile-app`)
- [ ] Expo started with cache clear (`npx expo start -c`)
- [ ] QR code scanned with Expo Go
- [ ] App loads successfully
- [ ] Can sign up/login
- [ ] Features work

## 💡 Pro Tips

1. **Keep Expo running** - It auto-reloads when you make changes
2. **Shake your phone** - Opens developer menu
3. **Press 'r' in terminal** - Reloads the app
4. **Press 'j' in terminal** - Opens debugger
5. **Check logs** - Look at terminal for errors

## 🆘 Still Having Issues?

### Check These:

1. ✅ You're in `mobile-app` directory
2. ✅ `index.js` file exists
3. ✅ `App.js` file exists
4. ✅ Backend services are running
5. ✅ Phone and computer on same WiFi
6. ✅ Expo Go app is up to date

### Get More Help:

- Check [START_MOBILE_APP.md](START_MOBILE_APP.md)
- Check [STARTUP_GUIDE.md](STARTUP_GUIDE.md)
- Review Expo logs in terminal
- Check backend service logs

## ✅ Success Indicators

You'll know it's working when:

1. ✅ No "Cannot resolve entry file" error
2. ✅ App loads on your phone
3. ✅ You see the login screen
4. ✅ You can navigate between screens
5. ✅ Backend API calls work

---

**The fix is applied! Just restart Expo with cache clear:**

```bash
cd mobile-app
npx expo start -c
```

Then scan the QR code again! 🎉
