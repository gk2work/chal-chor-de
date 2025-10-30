# OfficeShare Mobile App

A React Native mobile application built with Expo for the OfficeShare platform, enabling office workers to share carpools, books, and bikes within their workplace community.

## Features

- **User Authentication**: Simple email/password authentication for development
- **User Profile Management**: View and edit profile information and preferences
- **Notification System**: Real-time notifications with customizable preferences
- **Settings Management**: Comprehensive notification and app settings
- **Responsive UI**: Clean, modern interface optimized for mobile devices

## Development Setup

### Prerequisites

- Node.js v18+
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development) or Android Studio (for Android development)
- Expo Go app on your physical device (optional)

### Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm start
   ```

3. Run on specific platforms:
   ```bash
   npm run ios     # iOS Simulator
   npm run android # Android Emulator
   npm run web     # Web browser
   ```

### API Configuration

The app connects to the OfficeShare API Gateway running on `http://localhost:3000` in development mode. Make sure the following services are running:

- API Gateway (port 3000)
- User Service (port 3001)
- Notification Service (port 3005)

## Project Structure

```
mobile-app/
├── src/
│   ├── context/
│   │   └── AuthContext.js          # Authentication context and state management
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.js      # User login screen
│   │   │   └── RegisterScreen.js   # User registration screen
│   │   ├── home/
│   │   │   └── HomeScreen.js       # Main dashboard screen
│   │   ├── profile/
│   │   │   └── ProfileScreen.js    # User profile management
│   │   └── settings/
│   │       └── SettingsScreen.js   # App settings and preferences
│   └── services/
│       └── api.js                  # API service layer and HTTP client
├── assets/                         # App icons and images
├── App.js                          # Main app component and navigation
├── app.json                        # Expo configuration
└── package.json                    # Dependencies and scripts
```

## Key Components

### Authentication Flow

- **AuthContext**: Manages user authentication state, login/logout, and token storage
- **LoginScreen**: Email/password login with form validation
- **RegisterScreen**: User registration with comprehensive validation

### Main Features

- **HomeScreen**: Dashboard with quick actions and recent notifications
- **ProfileScreen**: User profile editing with preference management
- **SettingsScreen**: Notification preferences and app information

### API Integration

- **Centralized API Service**: Axios-based HTTP client with interceptors
- **Token Management**: Automatic token attachment and refresh handling
- **Error Handling**: Consistent error handling across all API calls

## Development Features

- **Hot Reloading**: Instant updates during development
- **Cross-Platform**: Runs on iOS, Android, and web
- **TypeScript Ready**: Easy migration to TypeScript if needed
- **Expo Managed Workflow**: Simplified development and deployment

## Testing

Run tests with:

```bash
npm test
```

## Building for Production

1. Build for production:

   ```bash
   expo build:ios     # iOS
   expo build:android # Android
   ```

2. Or use EAS Build (recommended):
   ```bash
   eas build --platform ios
   eas build --platform android
   ```

## Future Enhancements

The mobile app is designed to be extended with additional features:

- **Carpooling Interface**: Trip scheduling and real-time tracking
- **Book Sharing**: ISBN scanning and library management
- **Bike Sharing**: Bike listing and booking system
- **Real-time Chat**: In-app messaging for all transactions
- **Maps Integration**: Location-based features and navigation
- **Push Notifications**: Real-time notifications via Expo Push

## Development Notes

- Uses Expo SDK 50 for maximum compatibility
- Follows React Navigation v6 patterns
- Implements secure token storage with AsyncStorage
- Designed for easy integration with additional OfficeShare services
- Optimized for both development and production environments
