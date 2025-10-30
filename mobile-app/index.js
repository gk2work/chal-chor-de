import { registerRootComponent } from "expo";
import App from "./App";

// Suppress screen capture permission errors in development
if (__DEV__) {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("DETECT_SCREEN_CAPTURE") ||
        args[0].includes("registerScreenCaptureObserver"))
    ) {
      return;
    }
    originalConsoleError(...args);
  };
}

// Register the app component using Expo's method
registerRootComponent(App);
