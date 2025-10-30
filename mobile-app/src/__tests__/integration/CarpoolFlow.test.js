import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import TripSchedulingScreen from "../../screens/carpool/TripSchedulingScreen";
import TripHistoryScreen from "../../screens/carpool/TripHistoryScreen";
import RideMatchingScreen from "../../screens/carpool/RideMatchingScreen";

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
      createTrip: jest.fn(),
      getTrips: jest.fn(),
      getTripById: jest.fn(),
      joinTrip: jest.fn(),
      updateTrip: jest.fn(),
    },
  },
}));

// Mock date time picker
jest.mock("@react-native-community/datetimepicker", () => "DateTimePicker");

describe("Carpooling Flow Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Trip Scheduling Flow", () => {
    it("should create a trip successfully as driver", async () => {
      const mockCreateTripResponse = {
        data: {
          trip: {
            trip_id: "new-trip-id",
            origin: "Downtown",
            destination: "Office Park",
            departure_time: new Date().toISOString(),
            available_seats: 3,
            cost_per_seat: 15.5,
          },
        },
      };

      require("../../services/api").apiService.carpool.createTrip.mockResolvedValue(
        mockCreateTripResponse
      );

      const { getByText, getByPlaceholderText } = render(
        <TripSchedulingScreen navigation={mockNavigation} />
      );

      // Should show trip scheduling form
      expect(getByText("Schedule a Trip")).toBeTruthy();
      expect(getByText("I'm Driving")).toBeTruthy();

      // Fill in trip details
      const originInput = getByPlaceholderText("Enter pickup location");
      const destinationInput = getByPlaceholderText("Enter destination");
      const costInput = getByPlaceholderText("0.00");

      fireEvent.changeText(originInput, "Downtown");
      fireEvent.changeText(destinationInput, "Office Park");
      fireEvent.changeText(costInput, "15.50");

      // Select 3 seats
      const threeSeatButton = getByText("3");
      fireEvent.press(threeSeatButton);

      // Create trip
      const createButton = getByText("Create Trip");
      fireEvent.press(createButton);

      // Should call API with correct data
      await waitFor(() => {
        expect(
          require("../../services/api").apiService.carpool.createTrip
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            origin: "Downtown",
            destination: "Office Park",
            available_seats: 3,
            cost_per_seat: 15.5,
            is_driver: true,
            office_id: "office_001",
          })
        );
      });

      // Should navigate to trip history
      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith("TripHistory");
      });
    });

    it("should create a trip successfully as rider", async () => {
      const mockCreateTripResponse = {
        data: {
          trip: {
            trip_id: "new-trip-id",
            origin: "Home",
            destination: "Office",
            departure_time: new Date().toISOString(),
            available_seats: 0,
            cost_per_seat: 0,
          },
        },
      };

      require("../../services/api").apiService.carpool.createTrip.mockResolvedValue(
        mockCreateTripResponse
      );

      const { getByText, getByPlaceholderText } = render(
        <TripSchedulingScreen navigation={mockNavigation} />
      );

      // Switch to rider mode
      const needRideButton = getByText("Need a Ride");
      fireEvent.press(needRideButton);

      // Fill in trip details
      const originInput = getByPlaceholderText("Enter pickup location");
      const destinationInput = getByPlaceholderText("Enter destination");

      fireEvent.changeText(originInput, "Home");
      fireEvent.changeText(destinationInput, "Office");

      // Create trip
      const createButton = getByText("Create Trip");
      fireEvent.press(createButton);

      // Should call API with rider data
      await waitFor(() => {
        expect(
          require("../../services/api").apiService.carpool.createTrip
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            origin: "Home",
            destination: "Office",
            available_seats: 0,
            cost_per_seat: 0,
            is_driver: false,
            office_id: "office_001",
          })
        );
      });
    });

    it("should validate required fields", async () => {
      const { getByText, getByPlaceholderText } = render(
        <TripSchedulingScreen navigation={mockNavigation} />
      );

      // Try to create trip without filling required fields
      const createButton = getByText("Create Trip");
      fireEvent.press(createButton);

      // Should not call API
      expect(
        require("../../services/api").apiService.carpool.createTrip
      ).not.toHaveBeenCalled();
    });

    it("should handle recurring trip creation", async () => {
      const mockCreateTripResponse = {
        data: {
          trip: {
            trip_id: "recurring-trip-id",
            is_recurring: true,
            recurring_days: ["monday", "wednesday", "friday"],
          },
        },
      };

      require("../../services/api").apiService.carpool.createTrip.mockResolvedValue(
        mockCreateTripResponse
      );

      const { getByText, getByPlaceholderText } = render(
        <TripSchedulingScreen navigation={mockNavigation} />
      );

      // Fill in basic details
      const originInput = getByPlaceholderText("Enter pickup location");
      const destinationInput = getByPlaceholderText("Enter destination");
      const costInput = getByPlaceholderText("0.00");

      fireEvent.changeText(originInput, "Home");
      fireEvent.changeText(destinationInput, "Office");
      fireEvent.changeText(costInput, "10.00");

      // Enable recurring trip
      const recurringSwitch =
        getByText("Recurring Trip").parent.parent.children[1];
      fireEvent(recurringSwitch, "onValueChange", true);

      // Select days
      const mondayButton = getByText("Mon");
      const wednesdayButton = getByText("Wed");
      const fridayButton = getByText("Fri");

      fireEvent.press(mondayButton);
      fireEvent.press(wednesdayButton);
      fireEvent.press(fridayButton);

      // Create trip
      const createButton = getByText("Create Trip");
      fireEvent.press(createButton);

      // Should call API with recurring data
      await waitFor(() => {
        expect(
          require("../../services/api").apiService.carpool.createTrip
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            is_recurring: true,
            recurring_days: expect.arrayContaining([
              "monday",
              "wednesday",
              "friday",
            ]),
          })
        );
      });
    });
  });

  describe("Trip History Flow", () => {
    it("should load and display user trips", async () => {
      const mockTripsResponse = {
        data: {
          trips: [
            {
              trip_id: "trip-1",
              origin: "Downtown",
              destination: "Office Park",
              departure_time: new Date().toISOString(),
              status: "active",
              driver_id: "test-user-id",
              available_seats: 3,
              occupied_seats: 1,
              cost_per_seat: 15.5,
            },
            {
              trip_id: "trip-2",
              origin: "Home",
              destination: "Mall",
              departure_time: new Date(
                Date.now() - 24 * 60 * 60 * 1000
              ).toISOString(),
              status: "completed",
              driver_id: "other-user-id",
              available_seats: 2,
              occupied_seats: 2,
              cost_per_seat: 12.0,
            },
          ],
        },
      };

      require("../../services/api").apiService.carpool.getTrips.mockResolvedValue(
        mockTripsResponse
      );

      const { getByText } = render(
        <TripHistoryScreen navigation={mockNavigation} />
      );

      // Should load trips on mount
      await waitFor(() => {
        expect(
          require("../../services/api").apiService.carpool.getTrips
        ).toHaveBeenCalledWith({
          office_id: "office_001",
          user_id: "test-user-id",
        });
      });

      // Should display trips
      await waitFor(() => {
        expect(getByText("Downtown")).toBeTruthy();
        expect(getByText("Office Park")).toBeTruthy();
        expect(getByText("🚗 Driving")).toBeTruthy(); // User is driver for first trip
      });
    });

    it("should filter trips by status", async () => {
      const mockUpcomingTripsResponse = {
        data: {
          trips: [
            {
              trip_id: "upcoming-trip",
              origin: "Home",
              destination: "Office",
              departure_time: new Date(
                Date.now() + 24 * 60 * 60 * 1000
              ).toISOString(),
              status: "active",
              driver_id: "test-user-id",
            },
          ],
        },
      };

      require("../../services/api").apiService.carpool.getTrips.mockResolvedValue(
        mockUpcomingTripsResponse
      );

      const { getByText } = render(
        <TripHistoryScreen navigation={mockNavigation} />
      );

      // Filter by upcoming trips
      const upcomingFilter = getByText("Upcoming");
      fireEvent.press(upcomingFilter);

      // Should call API with status filter
      await waitFor(() => {
        expect(
          require("../../services/api").apiService.carpool.getTrips
        ).toHaveBeenCalledWith({
          office_id: "office_001",
          user_id: "test-user-id",
          status: "active",
        });
      });
    });

    it("should handle trip cancellation", async () => {
      const mockTripsResponse = {
        data: {
          trips: [
            {
              trip_id: "trip-to-cancel",
              origin: "Home",
              destination: "Office",
              departure_time: new Date(
                Date.now() + 24 * 60 * 60 * 1000
              ).toISOString(),
              status: "active",
              driver_id: "test-user-id",
            },
          ],
        },
      };

      require("../../services/api").apiService.carpool.getTrips.mockResolvedValue(
        mockTripsResponse
      );
      require("../../services/api").apiService.carpool.updateTrip.mockResolvedValue(
        {}
      );

      const { getByText } = render(
        <TripHistoryScreen navigation={mockNavigation} />
      );

      // Wait for trips to load
      await waitFor(() => {
        expect(getByText("Home")).toBeTruthy();
      });

      // Cancel trip
      const cancelButton = getByText("Cancel Trip");
      fireEvent.press(cancelButton);

      // Should call update API
      await waitFor(() => {
        expect(
          require("../../services/api").apiService.carpool.updateTrip
        ).toHaveBeenCalledWith("trip-to-cancel", { status: "cancelled" });
      });
    });
  });

  describe("Ride Matching Flow", () => {
    it("should load and display available trips", async () => {
      const mockAvailableTripsResponse = {
        data: {
          trips: [
            {
              trip_id: "available-trip-1",
              origin: "Downtown",
              destination: "Office Park",
              departure_time: new Date(
                Date.now() + 2 * 60 * 60 * 1000
              ).toISOString(),
              driver_id: "other-driver-id",
              driver_name: "John Doe",
              driver_rating: 4.8,
              driver_trip_count: 25,
              available_seats: 2,
              occupied_seats: 1,
              cost_per_seat: 12.5,
              notes: "Non-smoking car",
            },
          ],
        },
      };

      require("../../services/api").apiService.carpool.getTrips.mockResolvedValue(
        mockAvailableTripsResponse
      );

      const { getByText } = render(
        <RideMatchingScreen navigation={mockNavigation} />
      );

      // Should load available trips
      await waitFor(() => {
        expect(
          require("../../services/api").apiService.carpool.getTrips
        ).toHaveBeenCalledWith({
          office_id: "office_001",
          status: "active",
          available_seats_gt: 0,
          exclude_user: "test-user-id",
        });
      });

      // Should display trip details
      await waitFor(() => {
        expect(getByText("John Doe")).toBeTruthy();
        expect(getByText("Downtown")).toBeTruthy();
        expect(getByText("Office Park")).toBeTruthy();
        expect(getByText("$12.50")).toBeTruthy();
        expect(getByText("Non-smoking car")).toBeTruthy();
      });
    });

    it("should handle joining a trip", async () => {
      const mockAvailableTripsResponse = {
        data: {
          trips: [
            {
              trip_id: "trip-to-join",
              origin: "Home",
              destination: "Office",
              driver_name: "Jane Smith",
              driver_id: "jane-driver-id",
              available_seats: 1,
              cost_per_seat: 10.0,
            },
          ],
        },
      };

      require("../../services/api").apiService.carpool.getTrips.mockResolvedValue(
        mockAvailableTripsResponse
      );
      require("../../services/api").apiService.carpool.joinTrip.mockResolvedValue(
        {}
      );

      const { getByText } = render(
        <RideMatchingScreen navigation={mockNavigation} />
      );

      // Wait for trips to load
      await waitFor(() => {
        expect(getByText("Jane Smith")).toBeTruthy();
      });

      // Join trip
      const joinButton = getByText("Join Trip");
      fireEvent.press(joinButton);

      // Should call join API
      await waitFor(() => {
        expect(
          require("../../services/api").apiService.carpool.joinTrip
        ).toHaveBeenCalledWith("trip-to-join");
      });

      // Should navigate to trip history
      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith("TripHistory");
      });
    });

    it("should filter trips by time", async () => {
      const mockMorningTripsResponse = {
        data: {
          trips: [
            {
              trip_id: "morning-trip",
              departure_time: new Date().setHours(8, 0, 0, 0),
              driver_name: "Morning Driver",
            },
          ],
        },
      };

      require("../../services/api").apiService.carpool.getTrips.mockResolvedValue(
        mockMorningTripsResponse
      );

      const { getByText } = render(
        <RideMatchingScreen navigation={mockNavigation} />
      );

      // Filter by morning trips
      const morningFilter = getByText("Morning");
      fireEvent.press(morningFilter);

      // Should call API with time filter
      await waitFor(() => {
        expect(
          require("../../services/api").apiService.carpool.getTrips
        ).toHaveBeenCalledWith({
          office_id: "office_001",
          status: "active",
          available_seats_gt: 0,
          exclude_user: "test-user-id",
          time_filter: "am",
        });
      });
    });

    it("should handle empty trip list", async () => {
      const mockEmptyResponse = {
        data: {
          trips: [],
        },
      };

      require("../../services/api").apiService.carpool.getTrips.mockResolvedValue(
        mockEmptyResponse
      );

      const { getByText } = render(
        <RideMatchingScreen navigation={mockNavigation} />
      );

      // Should show empty state
      await waitFor(() => {
        expect(getByText("No trips available")).toBeTruthy();
        expect(getByText("Create Trip")).toBeTruthy();
      });

      // Should navigate to trip creation
      const createTripButton = getByText("Create Trip");
      fireEvent.press(createTripButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith("TripScheduling");
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors gracefully", async () => {
      const mockError = new Error("Network error");
      require("../../services/api").apiService.carpool.getTrips.mockRejectedValue(
        mockError
      );

      const { getByText } = render(
        <TripHistoryScreen navigation={mockNavigation} />
      );

      // Should handle error and show appropriate message
      await waitFor(() => {
        expect(
          require("../../services/api").apiService.carpool.getTrips
        ).toHaveBeenCalled();
      });

      // App should not crash and should show error state
      expect(getByText("No trips found")).toBeTruthy();
    });

    it("should handle trip creation failure", async () => {
      const mockError = {
        response: {
          data: {
            error: "Invalid trip data",
          },
        },
      };

      require("../../services/api").apiService.carpool.createTrip.mockRejectedValue(
        mockError
      );

      const { getByText, getByPlaceholderText } = render(
        <TripSchedulingScreen navigation={mockNavigation} />
      );

      // Fill in trip details
      const originInput = getByPlaceholderText("Enter pickup location");
      const destinationInput = getByPlaceholderText("Enter destination");
      const costInput = getByPlaceholderText("0.00");

      fireEvent.changeText(originInput, "Home");
      fireEvent.changeText(destinationInput, "Office");
      fireEvent.changeText(costInput, "10.00");

      // Try to create trip
      const createButton = getByText("Create Trip");
      fireEvent.press(createButton);

      // Should handle error gracefully
      await waitFor(() => {
        expect(
          require("../../services/api").apiService.carpool.createTrip
        ).toHaveBeenCalled();
      });

      // Should not navigate on error
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });
  });
});
