import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authAPI } from "../services/api";

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  // Load user data from storage on app start
  useEffect(() => {
    loadUserFromStorage();
  }, []);

  const loadUserFromStorage = async () => {
    try {
      const storedToken = await AsyncStorage.getItem("userToken");
      const storedUser = await AsyncStorage.getItem("userData");

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Set default authorization header
        authAPI.defaults.headers.common["Authorization"] =
          `Bearer ${storedToken}`;
      }
    } catch (error) {
      console.error("Error loading user from storage:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await authAPI.post("/api/users/login", {
        email,
        password,
      });

      const { user: userData, token: userToken } = response.data;

      // Store user data and token
      await AsyncStorage.setItem("userToken", userToken);
      await AsyncStorage.setItem("userData", JSON.stringify(userData));

      // Set authorization header
      authAPI.defaults.headers.common["Authorization"] = `Bearer ${userToken}`;

      setToken(userToken);
      setUser(userData);

      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage =
        error.response?.data?.error || "Login failed. Please try again.";
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, fullName) => {
    try {
      setLoading(true);
      const response = await authAPI.post("/api/users/register", {
        email,
        password,
        full_name: fullName,
      });

      const { user: userData, token: userToken } = response.data;

      // Store user data and token
      await AsyncStorage.setItem("userToken", userToken);
      await AsyncStorage.setItem("userData", JSON.stringify(userData));

      // Set authorization header
      authAPI.defaults.headers.common["Authorization"] = `Bearer ${userToken}`;

      setToken(userToken);
      setUser(userData);

      return { success: true };
    } catch (error) {
      console.error("Registration error:", error);
      const errorMessage =
        error.response?.data?.error || "Registration failed. Please try again.";
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Clear stored data
      await AsyncStorage.removeItem("userToken");
      await AsyncStorage.removeItem("userData");

      // Clear authorization header
      delete authAPI.defaults.headers.common["Authorization"];

      setToken(null);
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await authAPI.put("/api/users/profile", profileData);
      const { user: updatedUser } = response.data;

      // Update stored user data
      await AsyncStorage.setItem("userData", JSON.stringify(updatedUser));
      setUser(updatedUser);

      return { success: true };
    } catch (error) {
      console.error("Profile update error:", error);
      const errorMessage =
        error.response?.data?.error ||
        "Profile update failed. Please try again.";
      return { success: false, error: errorMessage };
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
