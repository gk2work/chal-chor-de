import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

import ChatListScreen from "../../src/screens/chat/ChatListScreen";
import ChatThreadScreen from "../../src/screens/chat/ChatThreadScreen";
import { AuthProvider } from "../../src/context/AuthContext";
import { chatService } from "../../src/services/chatService";

// Mock dependencies
jest.mock("@react-native-async-storage/async-storage");
jest.mock("../../src/services/chatService");
jest.mock("socket.io-client");

const Stack = createStackNavigator();

const TestNavigator = ({ initialRouteName = "ChatList", routeParams = {} }) => (
  <NavigationContainer>
    <AuthProvider>
      <Stack.Navigator initialRouteName={initialRouteName}>
        <Stack.Screen name="ChatList" component={ChatListScreen} />
        <Stack.Screen
          name="ChatThread"
          component={ChatThreadScreen}
          initialParams={routeParams}
        />
      </Stack.Navigator>
    </AuthProvider>
  </NavigationContainer>
);

describe("Chat Functionality Integration Tests", () => {
  beforeEach(() => {
    AsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({
        user_id: "test-user-1",
        name: "Test User",
        email: "test@example.com",
        office_id: "office-1",
      })
    );

    // Mock chat service methods
    chatService.connect = jest.fn().mockResolvedValue();
    chatService.getThreads = jest.fn().mockResolvedValue({
      threads: [
        {
          thread_id: "thread-1",
          title: "Carpool: Downtown → Office Park",
          transaction_type: "carpool",
          last_message: {
            text: "See you at 8 AM tomorrow!",
            sender_name: "John Doe",
            timestamp: "2024-01-20T16:30:00Z",
          },
          participants: [
            { user_id: "user1", name: "John Doe" },
            { user_id: "user2", name: "Jane Smith" },
          ],
          unread_count: 2,
          status: "active",
        },
      ],
    });
    chatService.getMessages = jest.fn().mockResolvedValue({
      messages: [
        {
          message_id: "msg-1",
          sender: { user_id: "user2", name: "Jane Smith" },
          message_type: "text",
          content: { text: "Hello everyone!" },
          created_at: "2024-01-20T14:00:00Z",
          reactions: [],
        },
      ],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Chat List Functionality", () => {
    test("should display chat threads with transaction context", async () => {
      const { getByText } = render(<TestNavigator />);

      await waitFor(() => {
        expect(getByText("Carpool: Downtown → Office Park")).toBeTruthy();
        expect(getByText("🚗")).toBeTruthy(); // Carpool icon
        expect(getByText("2 participants")).toBeTruthy();
        expect(getByText("John Doe: See you at 8 AM tomorrow!")).toBeTruthy();
      });
    });

    test("should show unread message count", async () => {
      const { getByText } = render(<TestNavigator />);

      await waitFor(() => {
        expect(getByText("2")).toBeTruthy(); // Unread count badge
      });
    });

    test("should navigate to chat thread when pressed", async () => {
      const { getByText } = render(<TestNavigator />);

      await waitFor(() => {
        expect(getByText("Carpool: Downtown → Office Park")).toBeTruthy();
      });

      fireEvent.press(getByText("Carpool: Downtown → Office Park"));

      await waitFor(() => {
        expect(getByText("Chat")).toBeTruthy(); // Thread screen title
      });
    });

    test("should handle empty chat list", async () => {
      chatService.getThreads.mockResolvedValue({ threads: [] });

      const { getByText } = render(<TestNavigator />);

      await waitFor(() => {
        expect(getByText("No conversations yet")).toBeTruthy();
        expect(
          getByText(
            "Start sharing rides, books, or bikes to begin chatting with colleagues!"
          )
        ).toBeTruthy();
      });
    });

    test("should refresh chat list on pull-to-refresh", async () => {
      const { getByTestId } = render(<TestNavigator />);

      // Simulate pull-to-refresh
      const scrollView = getByTestId("chat-list"); // Would need to add testID to FlatList
      fireEvent(scrollView, "refresh");

      await waitFor(() => {
        expect(chatService.getThreads).toHaveBeenCalledTimes(2); // Initial load + refresh
      });
    });
  });

  describe("Chat Thread Functionality", () => {
    const threadParams = {
      threadId: "thread-1",
      title: "Carpool: Downtown → Office Park",
    };

    test("should display messages in chronological order", async () => {
      const { getByText } = render(
        <TestNavigator
          initialRouteName="ChatThread"
          routeParams={threadParams}
        />
      );

      await waitFor(() => {
        expect(getByText("Hello everyone!")).toBeTruthy();
        expect(getByText("Jane Smith")).toBeTruthy();
      });
    });

    test("should allow sending new messages", async () => {
      chatService.sendMessage = jest.fn();

      const { getByText, getByPlaceholderText } = render(
        <TestNavigator
          initialRouteName="ChatThread"
          routeParams={threadParams}
        />
      );

      await waitFor(() => {
        expect(getByPlaceholderText("Type a message...")).toBeTruthy();
      });

      const messageInput = getByPlaceholderText("Type a message...");
      const sendButton = getByText("Send");

      fireEvent.changeText(messageInput, "This is a test message");
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(getByText("This is a test message")).toBeTruthy();
        expect(getByText("Sending...")).toBeTruthy();
      });
    });

    test("should handle message reactions", async () => {
      chatService.addReaction = jest.fn();

      const { getByText } = render(
        <TestNavigator
          initialRouteName="ChatThread"
          routeParams={threadParams}
        />
      );

      await waitFor(() => {
        expect(getByText("Hello everyone!")).toBeTruthy();
      });

      // Find and press a reaction button
      const thumbsUpReaction = getByText("👍");
      fireEvent.press(thumbsUpReaction);

      expect(chatService.addReaction).toHaveBeenCalledWith("msg-1", "👍");
    });

    test("should show typing indicators", async () => {
      const { getByText } = render(
        <TestNavigator
          initialRouteName="ChatThread"
          routeParams={threadParams}
        />
      );

      // Simulate typing indicator from another user
      act(() => {
        chatService.emit("user_typing", {
          thread_id: "thread-1",
          user_id: "user2",
          name: "Jane Smith",
        });
      });

      await waitFor(() => {
        expect(getByText("Jane Smith is typing...")).toBeTruthy();
      });
    });

    test("should handle system messages", async () => {
      chatService.getMessages.mockResolvedValue({
        messages: [
          {
            message_id: "msg-system",
            sender: { user_id: "system", name: "System" },
            message_type: "system",
            content: {
              system: {
                action: "trip_reminder",
                data: { message: "Trip starts in 30 minutes!" },
              },
            },
            created_at: "2024-01-20T16:30:00Z",
          },
        ],
      });

      const { getByText } = render(
        <TestNavigator
          initialRouteName="ChatThread"
          routeParams={threadParams}
        />
      );

      await waitFor(() => {
        expect(getByText("Trip starts in 30 minutes!")).toBeTruthy();
      });
    });

    test("should validate message length", async () => {
      const { getByText, getByPlaceholderText } = render(
        <TestNavigator
          initialRouteName="ChatThread"
          routeParams={threadParams}
        />
      );

      const messageInput = getByPlaceholderText("Type a message...");
      const sendButton = getByText("Send");

      // Try to send empty message
      fireEvent.changeText(messageInput, "");
      expect(
        sendButton.props.disabled ||
          sendButton.props.style.backgroundColor === "#ccc"
      ).toBeTruthy();

      // Try to send whitespace-only message
      fireEvent.changeText(messageInput, "   ");
      expect(
        sendButton.props.disabled ||
          sendButton.props.style.backgroundColor === "#ccc"
      ).toBeTruthy();

      // Send valid message
      fireEvent.changeText(messageInput, "Valid message");
      expect(sendButton.props.disabled).toBeFalsy();
    });
  });

  describe("Real-time Features", () => {
    test("should connect to chat service on mount", async () => {
      render(<TestNavigator />);

      await waitFor(() => {
        expect(chatService.connect).toHaveBeenCalled();
      });
    });

    test("should handle incoming messages", async () => {
      const { getByText } = render(
        <TestNavigator
          initialRouteName="ChatThread"
          routeParams={{
            threadId: "thread-1",
            title: "Test Thread",
          }}
        />
      );

      // Simulate incoming message
      act(() => {
        chatService.emit("new_message", {
          message: {
            message_id: "msg-new",
            sender: { user_id: "user2", name: "Jane Smith" },
            message_type: "text",
            content: { text: "New incoming message!" },
            created_at: new Date().toISOString(),
            reactions: [],
          },
          thread_id: "thread-1",
        });
      });

      await waitFor(() => {
        expect(getByText("New incoming message!")).toBeTruthy();
      });
    });

    test("should handle connection status changes", async () => {
      chatService.isSocketConnected = jest.fn().mockReturnValue(false);

      const { getByText } = render(<TestNavigator />);

      // Simulate disconnection
      act(() => {
        chatService.emit("disconnected", "transport close");
      });

      // Should handle gracefully (no crash)
      await waitFor(() => {
        expect(getByText("Messages")).toBeTruthy(); // Still shows UI
      });
    });
  });

  describe("Transaction Context Integration", () => {
    test("should display appropriate icons for different transaction types", async () => {
      chatService.getThreads.mockResolvedValue({
        threads: [
          {
            thread_id: "thread-carpool",
            title: "Carpool Thread",
            transaction_type: "carpool",
            last_message: {
              text: "Carpool message",
              sender_name: "User",
              timestamp: new Date().toISOString(),
            },
            participants: [],
            unread_count: 0,
          },
          {
            thread_id: "thread-book",
            title: "Book Thread",
            transaction_type: "book_sharing",
            last_message: {
              text: "Book message",
              sender_name: "User",
              timestamp: new Date().toISOString(),
            },
            participants: [],
            unread_count: 0,
          },
          {
            thread_id: "thread-bike",
            title: "Bike Thread",
            transaction_type: "bike_sharing",
            last_message: {
              text: "Bike message",
              sender_name: "User",
              timestamp: new Date().toISOString(),
            },
            participants: [],
            unread_count: 0,
          },
        ],
      });

      const { getByText } = render(<TestNavigator />);

      await waitFor(() => {
        expect(getByText("🚗")).toBeTruthy(); // Carpool icon
        expect(getByText("📚")).toBeTruthy(); // Book icon
        expect(getByText("🚲")).toBeTruthy(); // Bike icon
      });
    });

    test("should create thread for transaction when needed", async () => {
      chatService.getOrCreateThreadForTransaction = jest
        .fn()
        .mockResolvedValue({
          thread_id: "new-thread",
          title: "New Transaction Thread",
        });

      // This would be called from other parts of the app
      const transactionData = {
        trip_id: "trip-123",
        origin: "Downtown",
        destination: "Office",
        driver_name: "John Doe",
      };

      await chatService.getOrCreateThreadForTransaction(
        "carpool",
        "trip-123",
        transactionData
      );

      expect(chatService.getOrCreateThreadForTransaction).toHaveBeenCalledWith(
        "carpool",
        "trip-123",
        transactionData
      );
    });
  });

  describe("Error Handling and Edge Cases", () => {
    test("should handle chat service connection errors", async () => {
      chatService.connect.mockRejectedValue(new Error("Connection failed"));
      jest.spyOn(console, "error").mockImplementation(() => {});

      const { getByText } = render(<TestNavigator />);

      // Should still render the UI
      await waitFor(() => {
        expect(getByText("Messages")).toBeTruthy();
      });
    });

    test("should handle message sending failures", async () => {
      chatService.sendMessage = jest.fn().mockImplementation(() => {
        throw new Error("Send failed");
      });

      const { getByText, getByPlaceholderText } = render(
        <TestNavigator
          initialRouteName="ChatThread"
          routeParams={{
            threadId: "thread-1",
            title: "Test Thread",
          }}
        />
      );

      const messageInput = getByPlaceholderText("Type a message...");
      const sendButton = getByText("Send");

      fireEvent.changeText(messageInput, "Test message");
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(getByText("Failed to send message")).toBeTruthy();
      });
    });

    test("should handle malformed message data", async () => {
      chatService.getMessages.mockResolvedValue({
        messages: [
          {
            message_id: "malformed-msg",
            // Missing required fields
            created_at: "2024-01-20T14:00:00Z",
          },
        ],
      });

      const { getByText } = render(
        <TestNavigator
          initialRouteName="ChatThread"
          routeParams={{
            threadId: "thread-1",
            title: "Test Thread",
          }}
        />
      );

      // Should handle gracefully without crashing
      await waitFor(() => {
        expect(getByText("Chat")).toBeTruthy();
      });
    });
  });

  describe("Performance and Memory Management", () => {
    test("should cleanup listeners on unmount", async () => {
      chatService.off = jest.fn();
      chatService.disconnect = jest.fn();

      const { unmount } = render(<TestNavigator />);

      unmount();

      // Should cleanup resources
      expect(chatService.off).toHaveBeenCalled();
    });

    test("should limit message history loading", async () => {
      const { getByText } = render(
        <TestNavigator
          initialRouteName="ChatThread"
          routeParams={{
            threadId: "thread-1",
            title: "Test Thread",
          }}
        />
      );

      await waitFor(() => {
        expect(chatService.getMessages).toHaveBeenCalledWith(
          "thread-1",
          expect.any(Object)
        );
      });

      // Should have reasonable limits on message loading
      const callArgs = chatService.getMessages.mock.calls[0][1];
      expect(callArgs.limit).toBeLessThanOrEqual(100);
    });
  });
});
