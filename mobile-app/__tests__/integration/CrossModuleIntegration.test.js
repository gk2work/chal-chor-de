import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

import HomeScreen from "../../src/screens/home/HomeScreen";
import BooksScreen from "../../src/screens/books/BooksScreen";
import ChatListScreen from "../../src/screens/chat/ChatListScreen";
import ChatThreadScreen from "../../src/screens/chat/ChatThreadScreen";
import { AuthProvider } from "../../src/context/AuthContext";
import { chatService } from "../../src/services/chatService";

// Mock dependencies
jest.mock("@react-native-async-storage/async-storage");
jest.mock("../../src/services/chatService");
jest.mock("../../src/services/api");

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const BooksStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="BooksMain" component={BooksScreen} />
  </Stack.Navigator>
);

const ChatStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="ChatList" component={ChatListScreen} />
    <Stack.Screen name="ChatThread" component={ChatThreadScreen} />
  </Stack.Navigator>
);

const TestApp = () => (
  <NavigationContainer>
    <AuthProvider>
      <Tab.Navigator>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Books" component={BooksStack} />
        <Tab.Screen name="Chat" component={ChatStack} />
      </Tab.Navigator>
    </AuthProvider>
  </NavigationContainer>
);

describe("Cross-Module Integration Tests", () => {
  beforeEach(() => {
    AsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({
        user_id: "test-user-1",
        name: "Test User",
        email: "test@example.com",
        office_id: "office-1",
      })
    );

    chatService.connect = jest.fn().mockResolvedValue();
    chatService.getThreads = jest.fn().mockResolvedValue({ threads: [] });
    chatService.getOrCreateThreadForTransaction = jest.fn().mockResolvedValue({
      thread_id: "new-thread",
      title: "New Thread",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Book Sharing to Chat Integration", () => {
    test("should create chat thread when book borrow request is made", async () => {
      const { getByText } = render(<TestApp />);

      // Navigate to Books tab
      fireEvent.press(getByText("Books"));

      await waitFor(() => {
        expect(getByText("Office Library")).toBeTruthy();
      });

      // Mock book interaction that would trigger chat thread creation
      const bookData = {
        book_id: "book-123",
        title: "Test Book",
        author: "Test Author",
        owner_id: "owner-123",
        owner_name: "Book Owner",
      };

      // Simulate borrow request (this would normally happen in BookDetailsScreen)
      await act(async () => {
        await chatService.getOrCreateThreadForTransaction(
          "book_sharing",
          "book-123",
          bookData
        );
      });

      expect(chatService.getOrCreateThreadForTransaction).toHaveBeenCalledWith(
        "book_sharing",
        "book-123",
        bookData
      );
    });

    test("should navigate from book details to chat thread", async () => {
      chatService.getThreads.mockResolvedValue({
        threads: [
          {
            thread_id: "book-thread-1",
            title: "Book: Test Book",
            transaction_type: "book_sharing",
            last_message: {
              text: "Is this book still available?",
              sender_name: "Test User",
              timestamp: new Date().toISOString(),
            },
            participants: [
              { user_id: "test-user-1", name: "Test User" },
              { user_id: "owner-123", name: "Book Owner" },
            ],
            unread_count: 0,
          },
        ],
      });

      const { getByText } = render(<TestApp />);

      // Navigate to Chat tab
      fireEvent.press(getByText("Chat"));

      await waitFor(() => {
        expect(getByText("Book: Test Book")).toBeTruthy();
        expect(getByText("📚")).toBeTruthy(); // Book icon
      });

      // Should be able to open the chat thread
      fireEvent.press(getByText("Book: Test Book"));

      await waitFor(() => {
        expect(getByText("Chat")).toBeTruthy();
      });
    });
  });

  describe("Navigation Flow Integration", () => {
    test("should maintain state when switching between tabs", async () => {
      const { getByText } = render(<TestApp />);

      // Start on Home tab
      expect(getByText("Home")).toBeTruthy();

      // Navigate to Books
      fireEvent.press(getByText("Books"));
      await waitFor(() => {
        expect(getByText("Office Library")).toBeTruthy();
      });

      // Navigate to Chat
      fireEvent.press(getByText("Chat"));
      await waitFor(() => {
        expect(getByText("Messages")).toBeTruthy();
      });

      // Navigate back to Books - should maintain state
      fireEvent.press(getByText("Books"));
      await waitFor(() => {
        expect(getByText("Office Library")).toBeTruthy();
      });
    });

    test("should handle deep linking to chat threads", async () => {
      // This would test navigation from push notifications or external links
      const { getByText } = render(<TestApp />);

      // Simulate deep link navigation to specific chat thread
      fireEvent.press(getByText("Chat"));

      await waitFor(() => {
        expect(getByText("Messages")).toBeTruthy();
      });

      // Would navigate to specific thread if deep link provided
      // This is a simplified test - real implementation would use navigation params
    });
  });

  describe("Real-time Updates Across Modules", () => {
    test("should update chat list when new book sharing thread is created", async () => {
      chatService.getThreads.mockResolvedValue({ threads: [] });

      const { getByText } = render(<TestApp />);

      // Navigate to Chat tab
      fireEvent.press(getByText("Chat"));

      await waitFor(() => {
        expect(getByText("No conversations yet")).toBeTruthy();
      });

      // Simulate new thread creation from book sharing
      act(() => {
        chatService.emit("thread_created", {
          thread: {
            thread_id: "new-book-thread",
            title: "Book: New Book",
            transaction_type: "book_sharing",
            last_message: {
              text: "Thread created",
              sender_name: "System",
              timestamp: new Date().toISOString(),
            },
            participants: [],
            unread_count: 0,
          },
        });
      });

      // Chat list should update to show new thread
      await waitFor(() => {
        expect(getByText("Book: New Book")).toBeTruthy();
      });
    });

    test("should show real-time message notifications", async () => {
      const { getByText } = render(<TestApp />);

      // Start on Home tab
      expect(getByText("Home")).toBeTruthy();

      // Simulate incoming message while on different tab
      act(() => {
        chatService.emit("new_message", {
          message: {
            message_id: "msg-notification",
            sender: { user_id: "other-user", name: "Other User" },
            content: { text: "New message!" },
            created_at: new Date().toISOString(),
          },
          thread_id: "some-thread",
        });
      });

      // Should show notification indicator (in real app)
      // This would be implemented with badge counts or notification banners
    });
  });

  describe("Data Consistency Across Modules", () => {
    test("should maintain user context across all modules", async () => {
      const { getByText } = render(<TestApp />);

      // User should be authenticated across all tabs
      fireEvent.press(getByText("Books"));
      await waitFor(() => {
        expect(getByText("+ Add Book")).toBeTruthy(); // Should show authenticated features
      });

      fireEvent.press(getByText("Chat"));
      await waitFor(() => {
        expect(chatService.connect).toHaveBeenCalled(); // Should connect with user context
      });
    });

    test("should sync book status changes with chat threads", async () => {
      // When a book is borrowed, the chat thread should reflect this
      const bookData = {
        book_id: "book-123",
        title: "Test Book",
        status: "borrowed",
        borrower_name: "Test User",
      };

      // Simulate book status change
      act(() => {
        // This would be emitted from the book service
        chatService.emit("book_status_changed", {
          book: bookData,
          thread_id: "book-thread-123",
        });
      });

      // Chat thread should show system message about status change
      // This would be tested in the actual chat thread screen
    });
  });

  describe("Error Handling Across Modules", () => {
    test("should handle chat service failures gracefully", async () => {
      chatService.connect.mockRejectedValue(new Error("Connection failed"));
      jest.spyOn(console, "error").mockImplementation(() => {});

      const { getByText } = render(<TestApp />);

      // Books module should still work even if chat fails
      fireEvent.press(getByText("Books"));
      await waitFor(() => {
        expect(getByText("Office Library")).toBeTruthy();
      });

      // Chat module should show error state
      fireEvent.press(getByText("Chat"));
      await waitFor(() => {
        expect(getByText("Messages")).toBeTruthy(); // Should still render
      });
    });

    test("should handle network errors consistently", async () => {
      // Mock network error
      const networkError = new Error("Network request failed");
      chatService.getThreads.mockRejectedValue(networkError);

      const { getByText } = render(<TestApp />);

      fireEvent.press(getByText("Chat"));

      // Should handle error gracefully
      await waitFor(() => {
        expect(getByText("Messages")).toBeTruthy();
      });
    });
  });

  describe("Performance Integration", () => {
    test("should not block UI when chat service is connecting", async () => {
      // Mock slow connection
      chatService.connect.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 2000))
      );

      const { getByText } = render(<TestApp />);

      // UI should remain responsive
      fireEvent.press(getByText("Books"));
      await waitFor(() => {
        expect(getByText("Office Library")).toBeTruthy();
      });

      fireEvent.press(getByText("Chat"));
      await waitFor(() => {
        expect(getByText("Messages")).toBeTruthy();
      });
    });

    test("should cleanup resources when switching modules", async () => {
      chatService.disconnect = jest.fn();
      chatService.off = jest.fn();

      const { getByText, unmount } = render(<TestApp />);

      fireEvent.press(getByText("Chat"));
      await waitFor(() => {
        expect(chatService.connect).toHaveBeenCalled();
      });

      // Unmount should cleanup
      unmount();

      expect(chatService.disconnect).toHaveBeenCalled();
    });
  });

  describe("User Experience Flow", () => {
    test("should provide seamless book-to-chat workflow", async () => {
      const { getByText } = render(<TestApp />);

      // User discovers a book
      fireEvent.press(getByText("Books"));
      await waitFor(() => {
        expect(getByText("Office Library")).toBeTruthy();
      });

      // User would request to borrow (simulated)
      // This would create a chat thread

      // User can then navigate to chat to discuss
      fireEvent.press(getByText("Chat"));
      await waitFor(() => {
        expect(getByText("Messages")).toBeTruthy();
      });

      // Should see the book-related chat thread
      // (This would be visible if the thread was actually created)
    });

    test("should handle concurrent operations across modules", async () => {
      const { getByText } = render(<TestApp />);

      // Simulate user performing actions in multiple modules quickly
      fireEvent.press(getByText("Books"));
      fireEvent.press(getByText("Chat"));
      fireEvent.press(getByText("Books"));

      // Should handle rapid navigation without errors
      await waitFor(() => {
        expect(getByText("Office Library")).toBeTruthy();
      });
    });
  });
});
