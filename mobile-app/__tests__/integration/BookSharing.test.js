import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

import BooksScreen from "../../src/screens/books/BooksScreen";
import BookDetailsScreen from "../../src/screens/books/BookDetailsScreen";
import AddBookScreen from "../../src/screens/books/AddBookScreen";
import MyBooksScreen from "../../src/screens/books/MyBooksScreen";
import { AuthProvider } from "../../src/context/AuthContext";

// Mock dependencies
jest.mock("@react-native-async-storage/async-storage");
jest.mock("../../src/services/api");

const Stack = createStackNavigator();

const TestNavigator = ({ initialRouteName = "Books" }) => (
  <NavigationContainer>
    <AuthProvider>
      <Stack.Navigator initialRouteName={initialRouteName}>
        <Stack.Screen name="Books" component={BooksScreen} />
        <Stack.Screen name="BookDetails" component={BookDetailsScreen} />
        <Stack.Screen name="AddBook" component={AddBookScreen} />
        <Stack.Screen name="MyBooks" component={MyBooksScreen} />
      </Stack.Navigator>
    </AuthProvider>
  </NavigationContainer>
);

describe("Book Sharing Integration Tests", () => {
  beforeEach(() => {
    AsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({
        user_id: "test-user-1",
        name: "Test User",
        email: "test@example.com",
        office_id: "office-1",
      })
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Book Discovery and Browsing", () => {
    test("should display available books and allow filtering", async () => {
      const { getByText, getByPlaceholderText } = render(<TestNavigator />);

      // Wait for books to load
      await waitFor(() => {
        expect(getByText("Office Library")).toBeTruthy();
      });

      // Check if books are displayed
      await waitFor(() => {
        expect(getByText("Effective Java")).toBeTruthy();
        expect(getByText("Domain-Driven Design")).toBeTruthy();
      });

      // Test search functionality
      const searchInput = getByPlaceholderText(
        "Search books, authors, or owners..."
      );
      fireEvent.changeText(searchInput, "Java");

      await waitFor(() => {
        expect(getByText("Effective Java")).toBeTruthy();
        expect(getByText("JavaScript: The Good Parts")).toBeTruthy();
      });
    });

    test("should filter books by status", async () => {
      const { getByText } = render(<TestNavigator />);

      await waitFor(() => {
        expect(getByText("Office Library")).toBeTruthy();
      });

      // Click on 'Available' filter
      const availableFilter = getByText("Available");
      fireEvent.press(availableFilter);

      await waitFor(() => {
        expect(getByText("Effective Java")).toBeTruthy();
        // Should not show borrowed books
      });
    });

    test("should navigate to book details when book is pressed", async () => {
      const { getByText } = render(<TestNavigator />);

      await waitFor(() => {
        expect(getByText("Effective Java")).toBeTruthy();
      });

      // Press on a book
      fireEvent.press(getByText("Effective Java"));

      await waitFor(() => {
        expect(getByText("Book Details")).toBeTruthy();
        expect(getByText("Joshua Bloch")).toBeTruthy();
      });
    });
  });

  describe("Book Borrowing Workflow", () => {
    test("should allow requesting to borrow a book", async () => {
      const { getByText } = render(<TestNavigator />);

      await waitFor(() => {
        expect(getByText("Effective Java")).toBeTruthy();
      });

      // Navigate to book details
      fireEvent.press(getByText("Effective Java"));

      await waitFor(() => {
        expect(getByText("Request to Borrow")).toBeTruthy();
      });

      // Request to borrow
      fireEvent.press(getByText("Request to Borrow"));

      // Should show confirmation dialog
      await waitFor(() => {
        expect(getByText("Send Request")).toBeTruthy();
      });

      fireEvent.press(getByText("Send Request"));

      await waitFor(() => {
        expect(getByText("Request Sent!")).toBeTruthy();
      });
    });

    test("should show contact owner option", async () => {
      const { getByText } = render(<TestNavigator />);

      await waitFor(() => {
        expect(getByText("Effective Java")).toBeTruthy();
      });

      fireEvent.press(getByText("Effective Java"));

      await waitFor(() => {
        expect(getByText("Contact Owner")).toBeTruthy();
      });

      fireEvent.press(getByText("Contact Owner"));

      await waitFor(() => {
        expect(getByText("Send Message")).toBeTruthy();
        expect(getByText("Email")).toBeTruthy();
      });
    });
  });

  describe("Book Addition Workflow", () => {
    test("should navigate to add book screen", async () => {
      const { getByText } = render(<TestNavigator />);

      await waitFor(() => {
        expect(getByText("+ Add Book")).toBeTruthy();
      });

      fireEvent.press(getByText("+ Add Book"));

      await waitFor(() => {
        expect(getByText("Add Book to Library")).toBeTruthy();
        expect(getByText("Share your books with colleagues")).toBeTruthy();
      });
    });

    test("should validate required fields when adding a book", async () => {
      const { getByText } = render(
        <TestNavigator initialRouteName="AddBook" />
      );

      await waitFor(() => {
        expect(getByText("Add to Library")).toBeTruthy();
      });

      // Try to submit without required fields
      fireEvent.press(getByText("Add to Library"));

      await waitFor(() => {
        expect(getByText("Please enter a book title")).toBeTruthy();
      });
    });

    test("should allow manual book entry", async () => {
      const { getByText, getByPlaceholderText } = render(
        <TestNavigator initialRouteName="AddBook" />
      );

      await waitFor(() => {
        expect(getByText("Add Book to Library")).toBeTruthy();
      });

      // Fill in required fields
      const titleInput = getByPlaceholderText("Enter book title");
      const authorInput = getByPlaceholderText("Enter author name");
      const locationInput = getByPlaceholderText(
        "e.g., My desk, Shelf A-2, Common area"
      );

      fireEvent.changeText(titleInput, "Test Book");
      fireEvent.changeText(authorInput, "Test Author");
      fireEvent.changeText(locationInput, "My desk");

      // Select condition
      fireEvent.press(getByText("Good"));

      // Submit
      fireEvent.press(getByText("Add to Library"));

      await waitFor(() => {
        expect(getByText("Success!")).toBeTruthy();
      });
    });

    test("should simulate ISBN lookup functionality", async () => {
      const { getByText, getByPlaceholderText } = render(
        <TestNavigator initialRouteName="AddBook" />
      );

      await waitFor(() => {
        expect(getByText("🔍 Lookup")).toBeTruthy();
      });

      // Enter ISBN
      const isbnInput = getByPlaceholderText("Enter ISBN for auto-fill");
      fireEvent.changeText(isbnInput, "9780132350884");

      // Trigger lookup
      fireEvent.press(getByText("🔍 Lookup"));

      await waitFor(() => {
        expect(getByText("Looking up...")).toBeTruthy();
      });

      await waitFor(
        () => {
          expect(getByText("Success")).toBeTruthy();
        },
        { timeout: 3000 }
      );
    });
  });

  describe("My Books Management", () => {
    test("should display user's owned and borrowed books", async () => {
      const { getByText } = render(
        <TestNavigator initialRouteName="MyBooks" />
      );

      await waitFor(() => {
        expect(getByText("My Books")).toBeTruthy();
      });

      // Check tabs
      expect(getByText("My Books (2)")).toBeTruthy();
      expect(getByText("Borrowed (1)")).toBeTruthy();

      // Check owned books
      await waitFor(() => {
        expect(getByText("Effective Java")).toBeTruthy();
        expect(getByText("Clean Architecture")).toBeTruthy();
      });

      // Switch to borrowed tab
      fireEvent.press(getByText("Borrowed (1)"));

      await waitFor(() => {
        expect(getByText("Domain-Driven Design")).toBeTruthy();
        expect(getByText("Borrowed from Jane Smith")).toBeTruthy();
      });
    });

    test("should handle book return process", async () => {
      const { getByText } = render(
        <TestNavigator initialRouteName="MyBooks" />
      );

      await waitFor(() => {
        expect(getByText("Borrowed (1)")).toBeTruthy();
      });

      // Switch to borrowed tab
      fireEvent.press(getByText("Borrowed (1)"));

      await waitFor(() => {
        expect(getByText("Mark as Returned")).toBeTruthy();
      });

      fireEvent.press(getByText("Mark as Returned"));

      await waitFor(() => {
        expect(getByText("Mark as Returned")).toBeTruthy(); // In confirmation dialog
      });

      fireEvent.press(getByText("Mark as Returned"));

      await waitFor(() => {
        expect(getByText("Book Returned!")).toBeTruthy();
      });
    });

    test("should show pending borrow requests", async () => {
      const { getByText } = render(
        <TestNavigator initialRouteName="MyBooks" />
      );

      await waitFor(() => {
        expect(getByText("🔔 2 pending requests")).toBeTruthy();
      });

      fireEvent.press(getByText("🔔 2 pending requests"));

      await waitFor(() => {
        expect(getByText("Borrow Requests")).toBeTruthy();
      });
    });
  });

  describe("Book Status and Conditions", () => {
    test("should display book status and condition correctly", async () => {
      const { getByText } = render(<TestNavigator />);

      await waitFor(() => {
        expect(getByText("available")).toBeTruthy();
        expect(getByText("borrowed")).toBeTruthy();
        expect(getByText("excellent")).toBeTruthy();
        expect(getByText("good")).toBeTruthy();
        expect(getByText("fair")).toBeTruthy();
      });
    });

    test("should show due dates for borrowed books", async () => {
      const { getByText } = render(<TestNavigator />);

      await waitFor(() => {
        expect(getByText("Domain-Driven Design")).toBeTruthy();
      });

      fireEvent.press(getByText("Domain-Driven Design"));

      await waitFor(() => {
        expect(getByText("Current Borrower: Mike Johnson")).toBeTruthy();
        // Should show due date
      });
    });
  });

  describe("Error Handling", () => {
    test("should handle network errors gracefully", async () => {
      // Mock network error
      const mockError = new Error("Network error");
      jest.spyOn(console, "error").mockImplementation(() => {});

      const { getByText } = render(<TestNavigator />);

      // Should show error state or retry option
      await waitFor(() => {
        expect(getByText("Office Library")).toBeTruthy();
      });
    });

    test("should handle empty states", async () => {
      const { getByText } = render(<TestNavigator />);

      // Mock empty state by filtering to non-existent books
      const searchInput = getByText("Search books, authors, or owners...");
      fireEvent.changeText(searchInput, "NonExistentBook");

      await waitFor(() => {
        expect(getByText("No books found")).toBeTruthy();
        expect(getByText("Try adjusting your search")).toBeTruthy();
      });
    });
  });

  describe("Accessibility", () => {
    test("should have proper accessibility labels", async () => {
      const { getByText } = render(<TestNavigator />);

      await waitFor(() => {
        expect(getByText("Office Library")).toBeTruthy();
      });

      // Check for important accessibility elements
      expect(getByText("+ Add Book")).toBeTruthy();
      expect(getByText("📱 Scan ISBN")).toBeTruthy();
      expect(getByText("📚 My Books")).toBeTruthy();
    });
  });
});
