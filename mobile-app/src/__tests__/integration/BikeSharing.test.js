import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";
import { Alert } from "react-native";
import BikesScreen from "../../screens/bikes/BikesScreen";
import BikeDetailsScreen from "../../screens/bikes/BikeDetailsScreen";
import BookBikeScreen from "../../screens/bikes/BookBikeScreen";
import MyBikesScreen from "../../screens/bikes/MyBikesScreen";
import CheckOutScreen from "../../screens/bikes/CheckOutScreen";
import CheckInScreen from "../../screens/bikes/CheckInScreen";
import api from "../../services/api";

// Mock the API
jest.mock("../../services/api");

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock("@react-navigation/native", () => {
  const actualNav = jest.requireActual("@react-navigation/native");
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
    useRoute: () => ({
      params: {
        bikeId: "bike123",
        bike: {
          listing_id: "bike123",
          brand: "Trek",
          model: "X-Caliber 8",
          bike_type: "mountain",
          size: "m",
        },
        bookingId: "booking123",
      },
    }),
  };
});

// Mock Alert
jest.spyOn(Alert, "alert");

// Mock ImagePicker
jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted" })
  ),
  requestMediaLibraryPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted" })
  ),
  launchCameraAsync: jest.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [{ uri: "mock-photo-uri", base64: "mock-base64" }],
    })
  ),
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [{ uri: "mock-photo-uri", base64: "mock-base64" }],
    })
  ),
  MediaTypeOptions: {
    Images: "Images",
  },
}));

describe("Bike Sharing Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Bike Listing and Discovery", () => {
    it("should display available bikes", async () => {
      const mockBikes = {
        listings: [
          {
            listing_id: "bike1",
            brand: "Trek",
            model: "X-Caliber 8",
            bike_type: "mountain",
            condition: "excellent",
            size: "m",
            features: ["helmet_included", "lights"],
            photos: [],
            owner: {
              user_id: "user1",
              full_name: "John Doe",
              reputation_score: 4.5,
            },
            rating_average: 4.8,
            rating_count: 10,
            total_bookings: 25,
          },
        ],
      };

      api.get.mockResolvedValue({ data: mockBikes });

      const { getByText, findByText } = render(
        <NavigationContainer>
          <BikesScreen />
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          "/bike-sharing/listings/available",
          expect.any(Object)
        );
      });

      const bikeName = await findByText("Trek X-Caliber 8");
      expect(bikeName).toBeTruthy();
    });

    it("should filter bikes by type", async () => {
      api.get.mockResolvedValue({ data: { listings: [] } });

      const { getByText } = render(
        <NavigationContainer>
          <BikesScreen />
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
      });

      const mountainFilter = getByText("Mountain");
      fireEvent.press(mountainFilter);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          "/bike-sharing/listings/available",
          expect.objectContaining({
            params: expect.objectContaining({
              bike_type: "mountain",
            }),
          })
        );
      });
    });

    it("should navigate to bike details when bike is tapped", async () => {
      const mockBikes = {
        listings: [
          {
            listing_id: "bike1",
            brand: "Trek",
            model: "X-Caliber 8",
            bike_type: "mountain",
            condition: "excellent",
            size: "m",
            features: [],
            photos: [],
            owner: {
              user_id: "user1",
              full_name: "John Doe",
              reputation_score: 4.5,
            },
            rating_average: 0,
            rating_count: 0,
            total_bookings: 0,
          },
        ],
      };

      api.get.mockResolvedValue({ data: mockBikes });

      const { findByText } = render(
        <NavigationContainer>
          <BikesScreen />
        </NavigationContainer>
      );

      const bikeName = await findByText("Trek X-Caliber 8");
      fireEvent.press(bikeName);

      expect(mockNavigate).toHaveBeenCalledWith("BikeDetails", {
        bikeId: "bike1",
      });
    });
  });

  describe("Bike Details and Booking", () => {
    it("should display bike details", async () => {
      const mockBike = {
        listing: {
          listing_id: "bike1",
          brand: "Trek",
          model: "X-Caliber 8",
          bike_type: "mountain",
          description: "Great mountain bike",
          condition: "excellent",
          size: "m",
          features: ["helmet_included", "lights"],
          photos: [],
          owner: {
            user_id: "user1",
            full_name: "John Doe",
            reputation_score: 4.5,
          },
          rating_average: 4.8,
          rating_count: 10,
          total_bookings: 25,
          special_instructions: "Handle with care",
          smart_lock_info: {
            has_smart_lock: false,
          },
        },
      };

      api.get.mockResolvedValue({ data: mockBike });

      const { findByText } = render(
        <NavigationContainer>
          <BikeDetailsScreen />
        </NavigationContainer>
      );

      const bikeName = await findByText("Trek X-Caliber 8");
      expect(bikeName).toBeTruthy();

      const description = await findByText("Great mountain bike");
      expect(description).toBeTruthy();
    });

    it("should navigate to booking screen when Request to Book is pressed", async () => {
      const mockBike = {
        listing: {
          listing_id: "bike1",
          brand: "Trek",
          model: "X-Caliber 8",
          bike_type: "mountain",
          description: "Great mountain bike",
          condition: "excellent",
          size: "m",
          features: [],
          photos: [],
          owner: {
            user_id: "user1",
            full_name: "John Doe",
            reputation_score: 4.5,
          },
          rating_average: 0,
          rating_count: 0,
          total_bookings: 0,
          smart_lock_info: {
            has_smart_lock: false,
          },
        },
      };

      api.get.mockResolvedValue({ data: mockBike });

      const { findByText } = render(
        <NavigationContainer>
          <BikeDetailsScreen />
        </NavigationContainer>
      );

      const bookButton = await findByText("Request to Book");
      fireEvent.press(bookButton);

      const continueButton = await findByText("Continue");
      fireEvent.press(continueButton);

      expect(mockNavigate).toHaveBeenCalledWith("BookBike", expect.any(Object));
    });
  });

  describe("Booking Process", () => {
    it("should create a booking request", async () => {
      api.post.mockResolvedValue({ data: { booking_id: "booking123" } });

      const { getByPlaceholderText, getByText } = render(
        <NavigationContainer>
          <BookBikeScreen />
        </NavigationContainer>
      );

      const purposeInput = getByPlaceholderText(/Why do you need the bike/);
      fireEvent.changeText(purposeInput, "Commuting to work");

      const submitButton = getByText("Send Booking Request");
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          "/bike-sharing/bookings",
          expect.objectContaining({
            listing_id: "bike123",
            purpose: "Commuting to work",
          })
        );
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        "Success",
        expect.any(String),
        expect.any(Array)
      );
    });

    it("should show error if purpose is missing", async () => {
      const { getByText } = render(
        <NavigationContainer>
          <BookBikeScreen />
        </NavigationContainer>
      );

      const submitButton = getByText("Send Booking Request");
      fireEvent.press(submitButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Please provide a purpose for borrowing"
      );
    });
  });

  describe("Check-Out Process", () => {
    it("should require photos for check-out", async () => {
      const { getByText } = render(
        <NavigationContainer>
          <CheckOutScreen />
        </NavigationContainer>
      );

      const submitButton = getByText("Confirm Check-Out");
      fireEvent.press(submitButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Please take at least one photo of the bike"
      );
    });

    it("should complete check-out with photos", async () => {
      api.post.mockResolvedValue({ data: { success: true } });

      const { getByText, findByText } = render(
        <NavigationContainer>
          <CheckOutScreen />
        </NavigationContainer>
      );

      const photoButton = getByText("📷 Take Photo");
      fireEvent.press(photoButton);

      await waitFor(() => {
        expect(findByText("1 photo(s) taken")).toBeTruthy();
      });

      const submitButton = getByText("Confirm Check-Out");
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          "/bike-sharing/bookings/booking123/check-out",
          expect.any(Object),
          expect.any(Object)
        );
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        "Success",
        expect.any(String),
        expect.any(Array)
      );
    });

    it("should handle damage reporting during check-out", async () => {
      api.post.mockResolvedValue({ data: { success: true } });

      const { getByText, getByPlaceholderText } = render(
        <NavigationContainer>
          <CheckOutScreen />
        </NavigationContainer>
      );

      const photoButton = getByText("📷 Take Photo");
      fireEvent.press(photoButton);

      const damageCheckbox = getByText("Report existing damage");
      fireEvent.press(damageCheckbox);

      const damageInput = getByPlaceholderText(/Describe any existing damage/);
      fireEvent.changeText(damageInput, "Small scratch on frame");

      const submitButton = getByText("Confirm Check-Out");
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled();
      });
    });
  });

  describe("Check-In Process", () => {
    it("should require photos for check-in", async () => {
      const { getByText } = render(
        <NavigationContainer>
          <CheckInScreen />
        </NavigationContainer>
      );

      const submitButton = getByText("Complete Check-In");
      fireEvent.press(submitButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        "Error",
        "Please take at least one photo of the bike"
      );
    });

    it("should complete check-in with photos", async () => {
      api.post.mockResolvedValue({ data: { success: true } });

      const { getByText, findByText } = render(
        <NavigationContainer>
          <CheckInScreen />
        </NavigationContainer>
      );

      const photoButton = getByText("📷 Take Photo");
      fireEvent.press(photoButton);

      await waitFor(() => {
        expect(findByText("1 photo(s) taken")).toBeTruthy();
      });

      const submitButton = getByText("Complete Check-In");
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          "/bike-sharing/bookings/booking123/check-in",
          expect.any(Object),
          expect.any(Object)
        );
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        "Success",
        expect.any(String),
        expect.any(Array)
      );
    });
  });

  describe("My Bikes Management", () => {
    it("should display user's bike listings", async () => {
      const mockListings = {
        listings: [
          {
            listing_id: "bike1",
            brand: "Trek",
            model: "X-Caliber 8",
            bike_type: "mountain",
            size: "m",
            available: true,
            total_bookings: 10,
            rating_average: 4.5,
            rating_count: 5,
          },
        ],
      };

      api.get.mockResolvedValue({ data: mockListings });

      const { findByText } = render(
        <NavigationContainer>
          <MyBikesScreen />
        </NavigationContainer>
      );

      const bikeName = await findByText("Trek X-Caliber 8");
      expect(bikeName).toBeTruthy();
    });

    it("should toggle bike availability", async () => {
      const mockListings = {
        listings: [
          {
            listing_id: "bike1",
            brand: "Trek",
            model: "X-Caliber 8",
            bike_type: "mountain",
            size: "m",
            available: true,
            total_bookings: 10,
            rating_average: 0,
            rating_count: 0,
          },
        ],
      };

      api.get.mockResolvedValue({ data: mockListings });
      api.patch.mockResolvedValue({ data: { success: true } });

      const { findByText } = render(
        <NavigationContainer>
          <MyBikesScreen />
        </NavigationContainer>
      );

      const availableButton = await findByText("Available");
      fireEvent.press(availableButton);

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith(
          "/bike-sharing/listings/bike1/availability",
          { available: false }
        );
      });
    });

    it("should display booking requests for bike owners", async () => {
      const mockRequests = {
        bookings: [
          {
            booking_id: "booking1",
            listing: {
              listing_id: "bike1",
              brand: "Trek",
              model: "X-Caliber 8",
            },
            borrower: {
              user_id: "user2",
              full_name: "Jane Smith",
              reputation_score: 4.7,
            },
            start_time: "2024-12-01T09:00:00Z",
            end_time: "2024-12-01T17:00:00Z",
            purpose: "Commuting",
            status: "pending",
          },
        ],
      };

      api.get.mockResolvedValue({ data: mockRequests });

      const { getByText, findByText } = render(
        <NavigationContainer>
          <MyBikesScreen />
        </NavigationContainer>
      );

      const requestsTab = getByText("Requests");
      fireEvent.press(requestsTab);

      const borrowerName = await findByText(/Jane Smith/);
      expect(borrowerName).toBeTruthy();
    });

    it("should approve booking requests", async () => {
      const mockRequests = {
        bookings: [
          {
            booking_id: "booking1",
            listing: {
              listing_id: "bike1",
              brand: "Trek",
              model: "X-Caliber 8",
            },
            borrower: {
              user_id: "user2",
              full_name: "Jane Smith",
              reputation_score: 4.7,
            },
            start_time: "2024-12-01T09:00:00Z",
            end_time: "2024-12-01T17:00:00Z",
            purpose: "Commuting",
            status: "pending",
          },
        ],
      };

      api.get.mockResolvedValue({ data: mockRequests });
      api.patch.mockResolvedValue({ data: { success: true } });

      const { getByText, findByText } = render(
        <NavigationContainer>
          <MyBikesScreen />
        </NavigationContainer>
      );

      const requestsTab = getByText("Requests");
      fireEvent.press(requestsTab);

      const approveButton = await findByText("Approve");
      fireEvent.press(approveButton);

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith(
          "/bike-sharing/bookings/booking1/status",
          { status: "approved" }
        );
      });
    });
  });
});
