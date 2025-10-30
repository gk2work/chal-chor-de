import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import api from "../../services/api";

export default function BikesScreen() {
  const navigation = useNavigation();
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchBikes();
  }, [filter]);

  const fetchBikes = async () => {
    try {
      setLoading(true);
      const response = await api.get("/bike-sharing/listings/available", {
        params: {
          bike_type: filter !== "all" ? filter : undefined,
        },
      });
      setBikes(response.data.listings || []);
    } catch (error) {
      console.error("Error fetching bikes:", error);
      Alert.alert("Error", "Failed to load bikes. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBikes();
  };

  const renderBikeItem = ({ item }) => (
    <TouchableOpacity
      style={styles.bikeCard}
      onPress={() =>
        navigation.navigate("BikeDetails", { bikeId: item.listing_id })
      }
    >
      {item.photos && item.photos.length > 0 ? (
        <Image
          source={{
            uri: `data:${item.photos[0].mimetype};base64,${item.photos[0].data}`,
          }}
          style={styles.bikeImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.placeholderImage}>
          <Text style={styles.placeholderText}>🚲</Text>
        </View>
      )}
      <View style={styles.bikeInfo}>
        <Text style={styles.bikeBrand}>
          {item.brand} {item.model}
        </Text>
        <Text style={styles.bikeType}>
          {item.bike_type.charAt(0).toUpperCase() + item.bike_type.slice(1)}{" "}
          Bike
        </Text>
        <Text style={styles.bikeCondition}>Condition: {item.condition}</Text>
        <Text style={styles.bikeSize}>Size: {item.size.toUpperCase()}</Text>
        {item.features && item.features.length > 0 && (
          <Text style={styles.bikeFeatures}>
            {item.features
              .slice(0, 2)
              .map((f) => f.replace(/_/g, " "))
              .join(", ")}
          </Text>
        )}
        <View style={styles.ownerInfo}>
          <Text style={styles.ownerName}>Owner: {item.owner.full_name}</Text>
          <Text style={styles.ownerRating}>
            ⭐ {item.owner.reputation_score.toFixed(1)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const FilterButton = ({ label, value }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === value && styles.filterButtonActive,
      ]}
      onPress={() => setFilter(value)}
    >
      <Text
        style={[styles.filterText, filter === value && styles.filterTextActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading bikes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Available Bikes</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("AddBike")}
        >
          <Text style={styles.addButtonText}>+ List My Bike</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <FilterButton label="All" value="all" />
        <FilterButton label="Mountain" value="mountain" />
        <FilterButton label="Road" value="road" />
        <FilterButton label="Hybrid" value="hybrid" />
        <FilterButton label="Electric" value="electric" />
      </View>

      <FlatList
        data={bikes}
        renderItem={renderBikeItem}
        keyExtractor={(item) => item.listing_id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No bikes available</Text>
            <Text style={styles.emptySubtext}>
              Be the first to share your bike!
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.myBikesButton}
        onPress={() => navigation.navigate("MyBikes")}
      >
        <Text style={styles.myBikesButtonText}>My Bikes & Bookings</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  addButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  filterContainer: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: "#2196F3",
  },
  filterText: {
    fontSize: 12,
    color: "#666",
  },
  filterTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  listContainer: {
    padding: 16,
  },
  bikeCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bikeImage: {
    width: "100%",
    height: 200,
  },
  placeholderImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 64,
  },
  bikeInfo: {
    padding: 16,
  },
  bikeBrand: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  bikeType: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  bikeCondition: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  bikeSize: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  bikeFeatures: {
    fontSize: 12,
    color: "#2196F3",
    marginBottom: 8,
    textTransform: "capitalize",
  },
  ownerInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  ownerName: {
    fontSize: 14,
    color: "#666",
  },
  ownerRating: {
    fontSize: 14,
    color: "#FF9800",
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: "#999",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#bbb",
  },
  myBikesButton: {
    backgroundColor: "#2196F3",
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  myBikesButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
