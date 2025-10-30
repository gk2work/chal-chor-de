import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
} from "react-native";
import { Camera } from "expo-camera";
import { BarCodeScanner } from "expo-barcode-scanner";

const { width, height } = Dimensions.get("window");

const ScanBookScreen = ({ navigation, route }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const { onScanComplete } = route.params || {};

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    if (scanned) return;

    setScanned(true);

    // Validate ISBN format
    const cleanISBN = data.replace(/[-\s]/g, "");
    const isValidISBN =
      /^(978|979)\d{10}$/.test(cleanISBN) || /^\d{10}$/.test(cleanISBN);

    if (!isValidISBN) {
      Alert.alert(
        "Invalid ISBN",
        "The scanned code doesn't appear to be a valid ISBN. Please try again or enter manually.",
        [
          {
            text: "Try Again",
            onPress: () => setScanned(false),
          },
          {
            text: "Enter Manually",
            onPress: () => navigation.goBack(),
          },
        ]
      );
      return;
    }

    Alert.alert(
      "ISBN Scanned!",
      `Found ISBN: ${data}\n\nWould you like to use this ISBN to look up book information?`,
      [
        {
          text: "Try Again",
          style: "cancel",
          onPress: () => setScanned(false),
        },
        {
          text: "Use This ISBN",
          onPress: () => {
            if (onScanComplete) {
              onScanComplete(data);
            }
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleManualEntry = () => {
    Alert.alert(
      "Manual Entry",
      "Would you like to enter the ISBN manually instead?",
      [
        {
          text: "Continue Scanning",
          style: "cancel",
        },
        {
          text: "Enter Manually",
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionMessage}>
            To scan ISBN barcodes, we need access to your camera. Please enable
            camera permissions in your device settings.
          </Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.settingsButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={styles.camera}
        barCodeTypes={[
          BarCodeScanner.Constants.BarCodeType.ean13,
          BarCodeScanner.Constants.BarCodeType.ean8,
        ]}
      >
        {/* Overlay */}
        <View style={styles.overlay}>
          {/* Top overlay */}
          <View style={styles.overlayTop}>
            <Text style={styles.instructionText}>
              Position the ISBN barcode within the frame
            </Text>
          </View>

          {/* Middle section with scanning frame */}
          <View style={styles.overlayMiddle}>
            <View style={styles.overlayLeft} />

            <View style={styles.scanningFrame}>
              {/* Corner indicators */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />

              {/* Scanning line animation could go here */}
              <View style={styles.scanLine} />
            </View>

            <View style={styles.overlayRight} />
          </View>

          {/* Bottom overlay */}
          <View style={styles.overlayBottom}>
            <View style={styles.bottomControls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handleManualEntry}
              >
                <Text style={styles.controlButtonText}>Enter Manually</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.controlButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.tipText}>
              💡 Tip: Make sure the barcode is well-lit and in focus
            </Text>
          </View>
        </View>
      </BarCodeScanner>

      {scanned && (
        <View style={styles.scannedOverlay}>
          <View style={styles.scannedContainer}>
            <Text style={styles.scannedText}>Processing...</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  camera: {
    flex: 1,
  },
  message: {
    flex: 1,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 18,
    color: "white",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    backgroundColor: "#f5f5f5",
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  permissionMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  settingsButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  settingsButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  overlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  overlayTop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 20,
  },
  overlayMiddle: {
    flexDirection: "row",
    height: 200,
  },
  overlayLeft: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  overlayRight: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 20,
  },
  instructionText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  scanningFrame: {
    width: width * 0.7,
    height: 200,
    position: "relative",
    backgroundColor: "transparent",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "#4CAF50",
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanLine: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#4CAF50",
    opacity: 0.8,
  },
  bottomControls: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  controlButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  controlButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  tipText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  scannedOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  scannedContainer: {
    backgroundColor: "white",
    padding: 30,
    borderRadius: 12,
    alignItems: "center",
  },
  scannedText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
});

export default ScanBookScreen;
