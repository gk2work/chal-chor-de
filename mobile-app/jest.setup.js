import "react-native-gesture-handler/jestSetup";

// Mock react-native modules
jest.mock("react-native/Libraries/Animated/NativeAnimatedHelper");

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock Expo modules
jest.mock("expo-camera", () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(() =>
      Promise.resolve({ status: "granted" })
    ),
  },
}));

jest.mock("expo-barcode-scanner", () => ({
  BarCodeScanner: {
    requestPermissionsAsync: jest.fn(() =>
      Promise.resolve({ status: "granted" })
    ),
    Constants: {
      BarCodeType: {
        ean13: "ean13",
        ean8: "ean8",
      },
    },
  },
}));

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted" })
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: {
        latitude: 37.7749,
        longitude: -122.4194,
      },
    })
  ),
}));

// Mock Socket.IO
jest.mock("socket.io-client", () => {
  const mockSocket = {
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
    id: "mock-socket-id",
  };

  return jest.fn(() => mockSocket);
});

// Mock react-native-maps
jest.mock("react-native-maps", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: View,
    Marker: View,
    Callout: View,
  };
});

// Mock navigation
jest.mock("@react-navigation/native", () => {
  const actualNav = jest.requireActual("@react-navigation/native");
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      setOptions: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
    useFocusEffect: jest.fn(),
  };
});

// Mock API service
jest.mock("../src/services/api", () => ({
  apiService: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock chat service
jest.mock("../src/services/chatService", () => ({
  chatService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    joinThread: jest.fn(),
    leaveThread: jest.fn(),
    sendMessage: jest.fn(),
    getThreads: jest.fn(),
    getMessages: jest.fn(),
    getOrCreateThreadForTransaction: jest.fn(),
    isSocketConnected: jest.fn(() => true),
  },
}));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

// Mock Alert
jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
  };
});

// Mock Linking
jest.mock("react-native/Libraries/Linking/Linking", () => ({
  openURL: jest.fn(),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
}));

// Setup global test timeout
jest.setTimeout(10000);
