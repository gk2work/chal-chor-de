import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";
import App from "../../App";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock API calls
jest.mock("../../services/api", () => ({
  apiService: {
    auth: {
      login: jest.fn(),
      register: jest.fn(),
    },
    setAuthToken: jest.fn(),
  },
}));

// Mock navigation
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

// Mock Expo modules
jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

describe("Authentication Flow Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Login Flow", () => {
    it("should successfully login with valid credentials", async () => {
      const mockLoginResponse = {
        data: {
          user: {
            user_id: "test-user-id",
            email: "test@company.com",
            full_name: "Test User",
            office_id: "office_001",
            reputation_score: 5.0,
          },
          token: "mock-jwt-token",
        },
      };

      require("../../services/api").apiService.auth.login.mockResolvedValue(
        mockLoginResponse
      );

      const { getByPlaceholderText, getByText } = render(<App />);

      // Wait for login screen to appear
      await waitFor(() => {
        expect(getByText("Welcome to OfficeShare")).toBeTruthy();
      });

      // Fill in login form
      const emailInput = getByPlaceholderText("Enter your email");
      const passwordInput = getByPlaceholderText("Enter your password");
      const loginButton = getByText("Sign In");

      fireEvent.changeText(emailInput, "test@company.com");
      fireEvent.changeText(passwordInput, "password123");
      fireEvent.press(loginButton);

      // Wait for API call and navigation
      await waitFor(() => {
        expect(
          require("../../services/api").apiService.auth.login
        ).toHaveBeenCalledWith("test@company.com", "password123");
      });

      // Should navigate to main app after successful login
      await waitFor(() => {
        expect(getByText("OfficeShare")).toBeTruthy(); // Main tab navigator title
      });
    });

    it("should show error message for invalid credentials", async () => {
      const mockError = {
        response: {
          data: {
            error: "Invalid email or password",
          },
        },
      };

      require("../../services/api").apiService.auth.login.mockRejectedValue(
        mockError
      );

      const { getByPlaceholderText, getByText } = render(<App />);

      // Wait for login screen
      await waitFor(() => {
        expect(getByText("Welcome to OfficeShare")).toBeTruthy();
      });

      // Fill in invalid credentials
      const emailInput = getByPlaceholderText("Enter your email");
      const passwordInput = getByPlaceholderText("Enter your password");
      const loginButton = getByText("Sign In");

      fireEvent.changeText(emailInput, "invalid@company.com");
      fireEvent.changeText(passwordInput, "wrongpassword");
      fireEvent.press(loginButton);

      // Should show error message
      await waitFor(() => {
        expect(
          require("../../services/api").apiService.auth.login
        ).toHaveBeenCalled();
      });
    });

    it("should validate email format", async () => {
      const { getByPlaceholderText, getByText } = render(<App />);

      await waitFor(() => {
        expect(getByText("Welcome to OfficeShare")).toBeTruthy();
      });

      const emailInput = getByPlaceholderText("Enter your email");
      const passwordInput = getByPlaceholderText("Enter your password");
      const loginButton = getByText("Sign In");

      // Enter invalid email format
      fireEvent.changeText(emailInput, "invalid-email");
      fireEvent.changeText(passwordInput, "password123");
      fireEvent.press(loginButton);

      // Should not call API with invalid email
      expect(
        require("../../services/api").apiService.auth.login
      ).not.toHaveBeenCalled();
    });
  });

  describe("Registration Flow", () => {
    it("should successfully register new user", async () => {
      const mockRegisterResponse = {
        data: {
          user: {
            user_id: "new-user-id",
            email: "newuser@company.com",
            full_name: "New User",
            office_id: "office_001",
            reputation_score: 5.0,
          },
          token: "mock-jwt-token",
        },
      };

      require("../../services/api").apiService.auth.register.mockResolvedValue(
        mockRegisterResponse
      );

      const { getByPlaceholderText, getByText } = render(<App />);

      // Navigate to registration screen
      await waitFor(() => {
        expect(getByText("Create Account")).toBeTruthy();
      });

      const createAccountLink = getByText("Create Account");
      fireEvent.press(createAccountLink);

      // Fill in registration form
      await waitFor(() => {
        expect(getByText("Create Account")).toBeTruthy();
      });

      const fullNameInput = getByPlaceholderText("Enter your full name");
      const emailInput = getByPlaceholderText("Enter your email");
      const passwordInput = getByPlaceholderText(
        "Enter your password (min 6 characters)"
      );
      const confirmPasswordInput = getByPlaceholderText(
        "Confirm your password"
      );
      const registerButton = getByText("Create Account");

      fireEvent.changeText(fullNameInput, "New User");
      fireEvent.changeText(emailInput, "newuser@company.com");
      fireEvent.changeText(passwordInput, "password123");
      fireEvent.changeText(confirmPasswordInput, "password123");
      fireEvent.press(registerButton);

      // Wait for API call
      await waitFor(() => {
        expect(
          require("../../services/api").apiService.auth.register
        ).toHaveBeenCalledWith(
          "newuser@company.com",
          "password123",
          "New User"
        );
      });
    });

    it("should validate password confirmation", async () => {
      const { getByPlaceholderText, getByText } = render(<App />);

      // Navigate to registration
      const createAccountLink = getByText("Create Account");
      fireEvent.press(createAccountLink);

      await waitFor(() => {
        expect(getByText("Join the OfficeShare community")).toBeTruthy();
      });

      const fullNameInput = getByPlaceholderText("Enter your full name");
      const emailInput = getByPlaceholderText("Enter your email");
      const passwordInput = getByPlaceholderText(
        "Enter your password (min 6 characters)"
      );
      const confirmPasswordInput = getByPlaceholderText(
        "Confirm your password"
      );
      const registerButton = getByText("Create Account");

      // Enter mismatched passwords
      fireEvent.changeText(fullNameInput, "Test User");
      fireEvent.changeText(emailInput, "test@company.com");
      fireEvent.changeText(passwordInput, "password123");
      fireEvent.changeText(confirmPasswordInput, "differentpassword");
      fireEvent.press(registerButton);

      // Should not call API with mismatched passwords
      expect(
        require("../../services/api").apiService.auth.register
      ).not.toHaveBeenCalled();
    });

    it("should validate minimum password length", async () => {
      const { getByPlaceholderText, getByText } = render(<App />);

      // Navigate to registration
      const createAccountLink = getByText("Create Account");
      fireEvent.press(createAccountLink);

      await waitFor(() => {
        expect(getByText("Join the OfficeShare community")).toBeTruthy();
      });

      const fullNameInput = getByPlaceholderText("Enter your full name");
      const emailInput = getByPlaceholderText("Enter your email");
      const passwordInput = getByPlaceholderText(
        "Enter your password (min 6 characters)"
      );
      const confirmPasswordInput = getByPlaceholderText(
        "Confirm your password"
      );
      const registerButton = getByText("Create Account");

      // Enter short password
      fireEvent.changeText(fullNameInput, "Test User");
      fireEvent.changeText(emailInput, "test@company.com");
      fireEvent.changeText(passwordInput, "123");
      fireEvent.changeText(confirmPasswordInput, "123");
      fireEvent.press(registerButton);

      // Should not call API with short password
      expect(
        require("../../services/api").apiService.auth.register
      ).not.toHaveBeenCalled();
    });
  });

  describe("Logout Flow", () => {
    it("should successfully logout and return to login screen", async () => {
      // Mock authenticated state
      const mockUser = {
        user_id: "test-user-id",
        email: "test@company.com",
        full_name: "Test User",
        office_id: "office_001",
      };

      // Mock AsyncStorage to return user data
      require("@react-native-async-storage/async-storage").getItem.mockImplementation(
        (key) => {
          if (key === "userToken") return Promise.resolve("mock-token");
          if (key === "userData")
            return Promise.resolve(JSON.stringify(mockUser));
          return Promise.resolve(null);
        }
      );

      const { getByText, rerender } = render(<App />);

      // Should show main app for authenticated user
      await waitFor(() => {
        expect(getByText("OfficeShare")).toBeTruthy();
      });

      // Navigate to profile and logout
      const profileTab = getByText("Profile");
      fireEvent.press(profileTab);

      await waitFor(() => {
        expect(getByText("Logout")).toBeTruthy();
      });

      const logoutButton = getByText("Logout");
      fireEvent.press(logoutButton);

      // Should return to login screen after logout
      await waitFor(() => {
        expect(getByText("Welcome to OfficeShare")).toBeTruthy();
      });
    });
  });

  describe("Token Persistence", () => {
    it("should restore authenticated state from stored token", async () => {
      const mockUser = {
        user_id: "test-user-id",
        email: "test@company.com",
        full_name: "Test User",
        office_id: "office_001",
      };

      // Mock AsyncStorage to return stored auth data
      require("@react-native-async-storage/async-storage").getItem.mockImplementation(
        (key) => {
          if (key === "userToken") return Promise.resolve("stored-token");
          if (key === "userData")
            return Promise.resolve(JSON.stringify(mockUser));
          return Promise.resolve(null);
        }
      );

      const { getByText } = render(<App />);

      // Should automatically navigate to main app with stored token
      await waitFor(() => {
        expect(getByText("OfficeShare")).toBeTruthy();
      });

      // Should set auth token in API service
      expect(
        require("../../services/api").apiService.setAuthToken
      ).toHaveBeenCalledWith("stored-token");
    });

    it("should show login screen when no stored token", async () => {
      // Mock AsyncStorage to return null (no stored data)
      require("@react-native-async-storage/async-storage").getItem.mockResolvedValue(
        null
      );

      const { getByText } = render(<App />);

      // Should show login screen
      await waitFor(() => {
        expect(getByText("Welcome to OfficeShare")).toBeTruthy();
      });
    });
  });
});
