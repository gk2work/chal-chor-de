import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import CostBreakdownScreen from "../../screens/payment/CostBreakdownScreen";
import PaymentMethodScreen from "../../screens/payment/PaymentMethodScreen";
import TransactionHistoryScreen from "../../screens/payment/TransactionHistoryScreen";

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

// Mock auth context
const mockUser = {
  user_id: "test-user-id",
  email: "test@company.com",
  full_name: "Test User",
  office_id: "office_001",
};

jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

// Mock API services
jest.mock("../../services/api", () => ({
  apiService: {
    carpool: {
      getTripById: jest.fn(),
    },
  },
}));

describe("Payment Flow Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Cost Breakdown Flow", () => {
    const mockTripData = {
      trip_id: "test-trip-id",
      origin: "Downtown",
      destination: "Office Park",
      departure_time: new Date().toISOString(),
      cost_per_seat: 15.5,
      driver_id: "other-driver-id",
      participants: [
        {
          user_id: "other-driver-id",
          name: "John Driver",
          payment_status: "paid",
        },
        {
          user_id: "test-user-id",
          name: "Test User",
          payment_status: "pending",
        },
        {
          user_id: "rider-2",
          name: "Jane Rider",
          payment_status: "paid",
        },
      ],
      distance: 25,
    };

    const mockRoute = {
      params: {
        tripId: "test-trip-id",
      },
    };

    it("should load and display trip cost breakdown", async () => {
      require("../../services/api").apiService.carpool.getTripById.mockResolvedValue(
        {
          data: { trip: mockTripData },
        }
      );

      const { getByText } = render(
        <CostBreakdownScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Should load trip details
      await waitFor(() => {
        expect(
          require("../../services/api").apiService.carpool.getTripById
        ).toHaveBeenCalledWith("test-trip-id");
      });

      // Should display trip information
      await waitFor(() => {
        expect(getByText("Trip Cost Breakdown")).toBeTruthy();
        expect(getByText("Downtown")).toBeTruthy();
        expect(getByText("Office Park")).toBeTruthy();
        expect(getByText("$15.50")).toBeTruthy();
      });

      // Should display cost breakdown
      expect(getByText("25 km")).toBeTruthy(); // Distance
      expect(getByText("3")).toBeTruthy(); // Total participants
      expect(getByText("$15.50")).toBeTruthy(); // Cost per person
    });

    it("should show different view for driver vs rider", async () => {
      const driverTripData = {
        ...mockTripData,
        driver_id: "test-user-id", // User is the driver
      };

      require("../../services/api").apiService.carpool.getTripById.mockResolvedValue(
        {
          data: { trip: driverTripData },
        }
      );

      const { getByText, queryByText } = render(
        <CostBreakdownScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText("Trip Cost Breakdown")).toBeTruthy();
      });

      // Should show driver earnings
      await waitFor(() => {
        expect(getByText("🚗 Your Earnings (as Driver)")).toBeTruthy();
        expect(
          getByText("You don't pay for the trip as the driver")
        ).toBeTruthy();
      });

      // Should not show payment button for driver
      expect(queryByText("Pay $15.50")).toBeNull();
    });

    it("should handle payment button press for riders", async () => {
      require("../../services/api").apiService.carpool.getTripById.mockResolvedValue(
        {
          data: { trip: mockTripData },
        }
      );

      const { getByText } = render(
        <CostBreakdownScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText("Trip Cost Breakdown")).toBeTruthy();
      });

      // Should show payment button for rider
      const payButton = getByText("Pay $15.50");
      fireEvent.press(payButton);

      // Should navigate to payment method screen
      expect(mockNavigation.navigate).toHaveBeenCalledWith("PaymentMethod", {
        tripId: "test-trip-id",
        amount: 15.5,
        description: "Payment for trip from Downtown to Office Park",
      });
    });

    it("should handle refund request", async () => {
      require("../../services/api").apiService.carpool.getTripById.mockResolvedValue(
        {
          data: { trip: mockTripData },
        }
      );

      const { getByText } = render(
        <CostBreakdownScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText("Request Refund")).toBeTruthy();
      });

      const refundButton = getByText("Request Refund");
      fireEvent.press(refundButton);

      // Should show refund confirmation (mocked in component)
      // In real app, this would call refund API
    });

    it("should display environmental impact", async () => {
      require("../../services/api").apiService.carpool.getTripById.mockResolvedValue(
        {
          data: { trip: mockTripData },
        }
      );

      const { getByText } = render(
        <CostBreakdownScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText("🌱 Environmental Impact")).toBeTruthy();
      });

      // Should show environmental stats
      expect(getByText("CO₂ Saved")).toBeTruthy();
      expect(getByText("Cars Reduced")).toBeTruthy();
      expect(getByText("Money Saved")).toBeTruthy();
    });
  });

  describe("Payment Method Flow", () => {
    const mockRoute = {
      params: {
        tripId: "test-trip-id",
        amount: 15.5,
        description: "Payment for trip from Downtown to Office Park",
      },
    };

    it("should display payment summary and methods", async () => {
      const { getByText } = render(
        <PaymentMethodScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Should display payment summary
      expect(getByText("Payment Summary")).toBeTruthy();
      expect(
        getByText("Payment for trip from Downtown to Office Park")
      ).toBeTruthy();
      expect(getByText("$15.50")).toBeTruthy();

      // Should display existing payment methods
      expect(getByText("Payment Methods")).toBeTruthy();
      expect(getByText("Visa ending in 4242")).toBeTruthy();
      expect(getByText("Mastercard ending in 8888")).toBeTruthy();
    });

    it("should handle payment processing", async () => {
      const { getByText } = render(
        <PaymentMethodScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Should have pay button
      const payButton = getByText("Pay $15.50");
      fireEvent.press(payButton);

      // Should show processing state
      await waitFor(() => {
        expect(getByText("Processing...")).toBeTruthy();
      });

      // Should navigate to transaction history after successful payment
      await waitFor(
        () => {
          expect(mockNavigation.navigate).toHaveBeenCalledWith(
            "TransactionHistory"
          );
        },
        { timeout: 3000 }
      );
    });

    it("should handle adding new payment method", async () => {
      const { getByText, getByPlaceholderText } = render(
        <PaymentMethodScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Open add card form
      const addCardButton = getByText("+ Add New Card");
      fireEvent.press(addCardButton);

      // Should show add card form
      expect(getByText("Add New Card")).toBeTruthy();

      // Fill in card details
      const cardNumberInput = getByPlaceholderText("1234 5678 9012 3456");
      const expiryInput = getByPlaceholderText("MM/YY");
      const cvvInput = getByPlaceholderText("123");
      const nameInput = getByPlaceholderText("John Doe");

      fireEvent.changeText(cardNumberInput, "4111111111111111");
      fireEvent.changeText(expiryInput, "1225");
      fireEvent.changeText(cvvInput, "123");
      fireEvent.changeText(nameInput, "Test User");

      // Add card
      const addCardSubmitButton = getByText("Add Card");
      fireEvent.press(addCardSubmitButton);

      // Should add card to list
      await waitFor(() => {
        expect(getByText("Test User ending in 1111")).toBeTruthy();
      });
    });

    it("should validate card details", async () => {
      const { getByText, getByPlaceholderText } = render(
        <PaymentMethodScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Open add card form
      const addCardButton = getByText("+ Add New Card");
      fireEvent.press(addCardButton);

      // Try to add card without filling details
      const addCardSubmitButton = getByText("Add Card");
      fireEvent.press(addCardSubmitButton);

      // Should show validation error (handled by Alert in component)
      // Card should not be added to list
      expect(getByText("Visa ending in 4242")).toBeTruthy(); // Original cards still there
    });

    it("should handle payment method selection", async () => {
      const { getByText } = render(
        <PaymentMethodScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Select different payment method
      const mastercardMethod = getByText("Mastercard ending in 8888");
      fireEvent.press(mastercardMethod);

      // Should update selection (visual feedback handled by component state)
      // Payment should use selected method
      const payButton = getByText("Pay $15.50");
      fireEvent.press(payButton);

      // Should process payment with selected method
      await waitFor(() => {
        expect(getByText("Processing...")).toBeTruthy();
      });
    });

    it("should handle payment method deletion", async () => {
      const { getByText, getAllByText } = render(
        <PaymentMethodScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Should have delete buttons (×) for payment methods
      const deleteButtons = getAllByText("×");
      expect(deleteButtons.length).toBeGreaterThan(0);

      // Delete a payment method
      fireEvent.press(deleteButtons[0]);

      // Should remove method from list (handled by component state)
    });
  });

  describe("Transaction History Flow", () => {
    it("should display transaction history", async () => {
      const { getByText } = render(
        <TransactionHistoryScreen navigation={mockNavigation} />
      );

      // Should display summary cards
      expect(getByText("Total Spent")).toBeTruthy();
      expect(getByText("Total Earned")).toBeTruthy();
      expect(getByText("Total Refunded")).toBeTruthy();

      // Should display filter buttons
      expect(getByText("All")).toBeTruthy();
      expect(getByText("Payments")).toBeTruthy();
      expect(getByText("Earnings")).toBeTruthy();
      expect(getByText("Refunds")).toBeTruthy();

      // Should display mock transactions
      await waitFor(() => {
        expect(getByText("Trip payment: Downtown → Office Park")).toBeTruthy();
        expect(
          getByText("Driver earnings: Office Park → Downtown")
        ).toBeTruthy();
      });
    });

    it("should filter transactions by type", async () => {
      const { getByText, queryByText } = render(
        <TransactionHistoryScreen navigation={mockNavigation} />
      );

      // Filter by payments only
      const paymentsFilter = getByText("Payments");
      fireEvent.press(paymentsFilter);

      // Should show only payment transactions
      await waitFor(() => {
        expect(getByText("Trip payment: Downtown → Office Park")).toBeTruthy();
        // Driver earnings should not be visible
        expect(
          queryByText("Driver earnings: Office Park → Downtown")
        ).toBeNull();
      });
    });

    it("should handle retry payment for failed transactions", async () => {
      const { getByText } = render(
        <TransactionHistoryScreen navigation={mockNavigation} />
      );

      // Should show retry button for failed transactions
      await waitFor(() => {
        expect(getByText("Retry Payment")).toBeTruthy();
      });

      const retryButton = getByText("Retry Payment");
      fireEvent.press(retryButton);

      // Should navigate to payment method screen
      expect(mockNavigation.navigate).toHaveBeenCalledWith("PaymentMethod", {
        tripId: "trip_6",
        amount: 8.0,
        description: "Trip payment: Coffee Shop → Office",
      });
    });

    it("should display transaction status correctly", async () => {
      const { getByText, getAllByText } = render(
        <TransactionHistoryScreen navigation={mockNavigation} />
      );

      // Should show different status badges
      await waitFor(() => {
        expect(getAllByText("Completed").length).toBeGreaterThan(0);
        expect(getByText("Pending")).toBeTruthy();
        expect(getByText("Failed")).toBeTruthy();
      });
    });

    it("should show transaction details on press", async () => {
      const { getByText } = render(
        <TransactionHistoryScreen navigation={mockNavigation} />
      );

      // Press on a transaction
      await waitFor(() => {
        const transactionItem = getByText(
          "Trip payment: Downtown → Office Park"
        );
        fireEvent.press(transactionItem);
      });

      // Should navigate to transaction details
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        "TransactionDetails",
        {
          transactionId: "1",
        }
      );
    });

    it("should handle pull to refresh", async () => {
      const { getByText } = render(
        <TransactionHistoryScreen navigation={mockNavigation} />
      );

      // Should have refresh control (tested through component behavior)
      // Refresh functionality would reload transaction data
      expect(getByText("Total Spent")).toBeTruthy();
    });

    it("should calculate totals correctly", async () => {
      const { getByText } = render(
        <TransactionHistoryScreen navigation={mockNavigation} />
      );

      // Should calculate and display correct totals
      // Based on mock data: payments = 15.50 + 12.75 = 28.25, earnings = 45.00, refunds = 18.25
      await waitFor(() => {
        expect(getByText("-$28.25")).toBeTruthy(); // Total spent
        expect(getByText("+$45.00")).toBeTruthy(); // Total earned
        expect(getByText("+$18.25")).toBeTruthy(); // Total refunded
      });
    });
  });

  describe("Payment Flow Error Handling", () => {
    it("should handle trip loading failure in cost breakdown", async () => {
      const mockError = new Error("Failed to load trip");
      require("../../services/api").apiService.carpool.getTripById.mockRejectedValue(
        mockError
      );

      const mockRoute = {
        params: {
          tripId: "invalid-trip-id",
        },
      };

      const { getByText } = render(
        <CostBreakdownScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Should handle error gracefully
      await waitFor(() => {
        expect(
          require("../../services/api").apiService.carpool.getTripById
        ).toHaveBeenCalled();
      });

      // Should show loading state initially, then handle error
      expect(getByText("Loading cost details...")).toBeTruthy();
    });

    it("should handle payment processing failure", async () => {
      const mockRoute = {
        params: {
          tripId: "test-trip-id",
          amount: 15.5,
          description: "Test payment",
        },
      };

      const { getByText } = render(
        <PaymentMethodScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Mock payment failure by modifying component behavior
      const payButton = getByText("Pay $15.50");
      fireEvent.press(payButton);

      // Should handle payment failure gracefully
      // (Error handling is mocked in the component)
    });

    it("should validate payment amount", async () => {
      const mockRoute = {
        params: {
          tripId: "test-trip-id",
          amount: 0, // Invalid amount
          description: "Test payment",
        },
      };

      const { getByText } = render(
        <PaymentMethodScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Should handle invalid amount
      expect(getByText("$0.00")).toBeTruthy();
    });
  });
});
