import React, { createContext, useContext, useState, useEffect } from "react";
import { message } from "antd";
import { apiService } from "../services/api";

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

  // Load user data from localStorage on app start
  useEffect(() => {
    loadUserFromStorage();
  }, []);

  const loadUserFromStorage = async () => {
    try {
      const storedToken = localStorage.getItem("adminToken");
      const storedUser = localStorage.getItem("adminUser");

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Set default authorization header
        apiService.setAuthToken(storedToken);
      }
    } catch (error) {
      console.error("Error loading user from storage:", error);
      // Clear invalid data
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await apiService.auth.login(email, password);
      const { user: userData, token: userToken } = response.data;

      // Check if user has admin privileges (for now, we'll allow any user)
      // In a real app, you'd check user roles here

      // Store user data and token
      localStorage.setItem("adminToken", userToken);
      localStorage.setItem("adminUser", JSON.stringify(userData));

      // Set authorization header
      apiService.setAuthToken(userToken);

      setToken(userToken);
      setUser(userData);

      message.success("Login successful");
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage =
        error.response?.data?.error || "Login failed. Please try again.";
      message.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Clear stored data
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");

      // Clear authorization header
      apiService.setAuthToken(null);

      setToken(null);
      setUser(null);

      message.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
