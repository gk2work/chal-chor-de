import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

// Import screens
import LoginScreen from "./src/screens/auth/LoginScreen";
import RegisterScreen from "./src/screens/auth/RegisterScreen";
import HomeScreen from "./src/screens/home/HomeScreen";
import ProfileScreen from "./src/screens/profile/ProfileScreen";
import SettingsScreen from "./src/screens/settings/SettingsScreen";
import BooksScreen from "./src/screens/books/BooksScreen";
import BookDetailsScreen from "./src/screens/books/BookDetailsScreen";
import AddBookScreen from "./src/screens/books/AddBookScreen";
import ScanBookScreen from "./src/screens/books/ScanBookScreen";
import MyBooksScreen from "./src/screens/books/MyBooksScreen";
import BikesScreen from "./src/screens/bikes/BikesScreen";
import BikeDetailsScreen from "./src/screens/bikes/BikeDetailsScreen";
import AddBikeScreen from "./src/screens/bikes/AddBikeScreen";
import BookBikeScreen from "./src/screens/bikes/BookBikeScreen";
import MyBikesScreen from "./src/screens/bikes/MyBikesScreen";
import CheckOutScreen from "./src/screens/bikes/CheckOutScreen";
import CheckInScreen from "./src/screens/bikes/CheckInScreen";
import AcceptWaiverScreen from "./src/screens/bikes/AcceptWaiverScreen";
import ChatListScreen from "./src/screens/chat/ChatListScreen";
import ChatThreadScreen from "./src/screens/chat/ChatThreadScreen";

// Import context providers
import { AuthProvider, useAuth } from "./src/context/AuthContext";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack Navigator
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: "#2196F3",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: "Sign In" }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: "Create Account" }}
      />
    </Stack.Navigator>
  );
}

// Books Stack Navigator
function BooksStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: "#2196F3",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen
        name="BooksMain"
        component={BooksScreen}
        options={{ title: "Office Library" }}
      />
      <Stack.Screen
        name="BookDetails"
        component={BookDetailsScreen}
        options={{ title: "Book Details" }}
      />
      <Stack.Screen
        name="AddBook"
        component={AddBookScreen}
        options={{ title: "Add Book" }}
      />
      <Stack.Screen
        name="ScanBook"
        component={ScanBookScreen}
        options={{ title: "Scan ISBN" }}
      />
      <Stack.Screen
        name="MyBooks"
        component={MyBooksScreen}
        options={{ title: "My Books" }}
      />
    </Stack.Navigator>
  );
}

// Bikes Stack Navigator
function BikesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: "#2196F3",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen
        name="BikesMain"
        component={BikesScreen}
        options={{ title: "Bike Sharing" }}
      />
      <Stack.Screen
        name="BikeDetails"
        component={BikeDetailsScreen}
        options={{ title: "Bike Details" }}
      />
      <Stack.Screen
        name="AddBike"
        component={AddBikeScreen}
        options={{ title: "List My Bike" }}
      />
      <Stack.Screen
        name="BookBike"
        component={BookBikeScreen}
        options={{ title: "Book Bike" }}
      />
      <Stack.Screen
        name="MyBikes"
        component={MyBikesScreen}
        options={{ title: "My Bikes & Bookings" }}
      />
      <Stack.Screen
        name="CheckOut"
        component={CheckOutScreen}
        options={{ title: "Check Out Bike" }}
      />
      <Stack.Screen
        name="CheckIn"
        component={CheckInScreen}
        options={{ title: "Check In Bike" }}
      />
      <Stack.Screen
        name="AcceptWaiver"
        component={AcceptWaiverScreen}
        options={{ title: "Accept Waiver" }}
      />
    </Stack.Navigator>
  );
}

// Chat Stack Navigator
function ChatStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: "#2196F3",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{ title: "Messages" }}
      />
      <Stack.Screen
        name="ChatThread"
        component={ChatThreadScreen}
        options={{ title: "Chat" }}
      />
    </Stack.Navigator>
  );
}

// Main App Tabs Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#2196F3",
        tabBarInactiveTintColor: "gray",
        headerStyle: {
          backgroundColor: "#2196F3",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: "OfficeShare",
          tabBarLabel: "Home",
        }}
      />
      <Tab.Screen
        name="Books"
        component={BooksStack}
        options={{
          title: "Library",
          tabBarLabel: "Books",
        }}
      />
      <Tab.Screen
        name="Bikes"
        component={BikesStack}
        options={{
          title: "Bikes",
          tabBarLabel: "Bikes",
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatStack}
        options={{
          title: "Messages",
          tabBarLabel: "Chat",
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "My Profile",
          tabBarLabel: "Profile",
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: "Settings",
          tabBarLabel: "Settings",
        }}
      />
    </Tab.Navigator>
  );
}

// Main App Navigator
function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}

// Main App Component
export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    fontSize: 18,
    color: "#666",
  },
});
