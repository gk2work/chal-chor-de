import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from "react-native";
import { useAuth } from "../../context/AuthContext";

const PaymentMethodScreen = ({ route, navigation }) => {
  const { tripId, amount, description } = route.params;
  const { user } = useAuth();

  const [paymentMethods, setPaymentMethods] = useState([
    {
      id: "1",
      type: "card",
      name: "Visa ending in 4242",
      last4: "4242",
      brand: "visa",
      isDefault: true,
    },
    {
      id: "2",
      type: "card",
      name: "Mastercard ending in 8888",
      last4: "8888",
      brand: "mastercard",
      isDefault: false,
    },
  ]);

  const [selectedMethod, setSelectedMethod] = useState("1");
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCard, setNewCard] = useState({
    number: "",
    expiry: "",
    cvv: "",
    name: "",
  });
  const [saveCard, setSaveCard] = useState(true);
  const [processing, setProcessing] = useState(false);

  const handlePayment = async () => {
    if (!selectedMethod) {
      Alert.alert("Error", "Please select a payment method");
      return;
    }

    Alert.alert("Confirm Payment", `Pay $${amount.toFixed(2)} for this trip?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Pay Now",
        onPress: processPayment,
      },
    ]);
  };

  const processPayment = async () => {
    try {
      setProcessing(true);

      // Mock payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // In a real app, this would call the payment API
      Alert.alert(
        "Payment Successful",
        `Your payment of $${amount.toFixed(2)} has been processed successfully.`,
        [
          {
            text: "OK",
            onPress: () => navigation.navigate("TransactionHistory"),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Payment Failed",
        "There was an error processing your payment. Please try again."
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleAddCard = () => {
    if (!newCard.number || !newCard.expiry || !newCard.cvv || !newCard.name) {
      Alert.alert("Error", "Please fill in all card details");
      return;
    }

    // Mock card validation
    if (newCard.number.length < 16) {
      Alert.alert("Error", "Please enter a valid card number");
      return;
    }

    const cardId = Date.now().toString();
    const newPaymentMethod = {
      id: cardId,
      type: "card",
      name: `${newCard.name} ending in ${newCard.number.slice(-4)}`,
      last4: newCard.number.slice(-4),
      brand: "visa", // Mock brand detection
      isDefault: paymentMethods.length === 0,
    };

    setPaymentMethods((prev) => [...prev, newPaymentMethod]);
    setSelectedMethod(cardId);
    setShowAddCard(false);
    setNewCard({ number: "", expiry: "", cvv: "", name: "" });

    Alert.alert("Success", "Payment method added successfully");
  };

  const handleDeleteCard = (cardId) => {
    Alert.alert(
      "Delete Payment Method",
      "Are you sure you want to delete this payment method?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setPaymentMethods((prev) =>
              prev.filter((method) => method.id !== cardId)
            );
            if (selectedMethod === cardId) {
              setSelectedMethod(paymentMethods[0]?.id || "");
            }
          },
        },
      ]
    );
  };

  const formatCardNumber = (text) => {
    // Remove all non-digit characters
    const cleaned = text.replace(/\D/g, "");
    // Add spaces every 4 digits
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, "$1 ");
    return formatted.slice(0, 19); // Limit to 16 digits + 3 spaces
  };

  const formatExpiry = (text) => {
    // Remove all non-digit characters
    const cleaned = text.replace(/\D/g, "");
    // Add slash after 2 digits
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + "/" + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const getCardIcon = (brand) => {
    switch (brand) {
      case "visa":
        return "💳";
      case "mastercard":
        return "💳";
      case "amex":
        return "💳";
      default:
        return "💳";
    }
  };

  const renderPaymentMethod = (method) => (
    <TouchableOpacity
      key={method.id}
      style={[
        styles.paymentMethodCard,
        selectedMethod === method.id && styles.selectedPaymentMethod,
      ]}
      onPress={() => setSelectedMethod(method.id)}
    >
      <View style={styles.paymentMethodInfo}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>{getCardIcon(method.brand)}</Text>
          <Text style={styles.cardName}>{method.name}</Text>
          {method.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardDetails}>
          {method.brand.toUpperCase()} •••• {method.last4}
        </Text>
      </View>
      <View style={styles.paymentMethodActions}>
        <View
          style={[
            styles.radioButton,
            selectedMethod === method.id && styles.radioButtonSelected,
          ]}
        >
          {selectedMethod === method.id && (
            <View style={styles.radioButtonInner} />
          )}
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteCard(method.id)}
        >
          <Text style={styles.deleteButtonText}>×</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Payment Summary */}
      <View style={styles.paymentSummary}>
        <Text style={styles.summaryTitle}>Payment Summary</Text>
        <Text style={styles.summaryDescription}>{description}</Text>
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Amount to Pay</Text>
          <Text style={styles.amountValue}>${amount.toFixed(2)}</Text>
        </View>
      </View>

      {/* Payment Methods */}
      <View style={styles.paymentMethodsSection}>
        <Text style={styles.sectionTitle}>Payment Methods</Text>

        {paymentMethods.map(renderPaymentMethod)}

        {/* Add New Card Button */}
        <TouchableOpacity
          style={styles.addCardButton}
          onPress={() => setShowAddCard(!showAddCard)}
        >
          <Text style={styles.addCardButtonText}>
            {showAddCard ? "− Cancel" : "+ Add New Card"}
          </Text>
        </TouchableOpacity>

        {/* Add New Card Form */}
        {showAddCard && (
          <View style={styles.addCardForm}>
            <Text style={styles.formTitle}>Add New Card</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Card Number</Text>
              <TextInput
                style={styles.input}
                value={newCard.number}
                onChangeText={(text) =>
                  setNewCard((prev) => ({
                    ...prev,
                    number: text.replace(/\D/g, "").slice(0, 16),
                  }))
                }
                placeholder="1234 5678 9012 3456"
                keyboardType="numeric"
                maxLength={16}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Expiry Date</Text>
                <TextInput
                  style={styles.input}
                  value={formatExpiry(newCard.expiry)}
                  onChangeText={(text) =>
                    setNewCard((prev) => ({
                      ...prev,
                      expiry: text.replace(/\D/g, "").slice(0, 4),
                    }))
                  }
                  placeholder="MM/YY"
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>CVV</Text>
                <TextInput
                  style={styles.input}
                  value={newCard.cvv}
                  onChangeText={(text) =>
                    setNewCard((prev) => ({
                      ...prev,
                      cvv: text.replace(/\D/g, "").slice(0, 4),
                    }))
                  }
                  placeholder="123"
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Cardholder Name</Text>
              <TextInput
                style={styles.input}
                value={newCard.name}
                onChangeText={(text) =>
                  setNewCard((prev) => ({ ...prev, name: text }))
                }
                placeholder="John Doe"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.saveCardContainer}>
              <Text style={styles.saveCardLabel}>
                Save this card for future payments
              </Text>
              <Switch
                value={saveCard}
                onValueChange={setSaveCard}
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={saveCard ? "#2196F3" : "#f4f3f4"}
              />
            </View>

            <TouchableOpacity
              style={styles.addCardSubmitButton}
              onPress={handleAddCard}
            >
              <Text style={styles.addCardSubmitButtonText}>Add Card</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Security Notice */}
      <View style={styles.securityNotice}>
        <Text style={styles.securityTitle}>🔒 Secure Payment</Text>
        <Text style={styles.securityText}>
          Your payment information is encrypted and secure. We never store your
          full card details.
        </Text>
      </View>

      {/* Pay Button */}
      <View style={styles.payButtonContainer}>
        <TouchableOpacity
          style={[styles.payButton, processing && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={processing || !selectedMethod}
        >
          <Text style={styles.payButtonText}>
            {processing ? "Processing..." : `Pay $${amount.toFixed(2)}`}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  paymentSummary: {
    backgroundColor: "white",
    padding: 20,
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  summaryDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  amountContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  amountLabel: {
    fontSize: 16,
    color: "#333",
  },
  amountValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2196F3",
  },
  paymentMethodsSection: {
    backgroundColor: "white",
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  paymentMethodCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    marginBottom: 12,
  },
  selectedPaymentMethod: {
    borderColor: "#2196F3",
    backgroundColor: "#f3f8ff",
  },
  paymentMethodInfo: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  cardIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  defaultBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
  },
  cardDetails: {
    fontSize: 14,
    color: "#666",
  },
  paymentMethodActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  radioButtonSelected: {
    borderColor: "#2196F3",
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2196F3",
  },
  deleteButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f44336",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  addCardButton: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#2196F3",
    borderRadius: 8,
    alignItems: "center",
    borderStyle: "dashed",
  },
  addCardButtonText: {
    color: "#2196F3",
    fontSize: 16,
    fontWeight: "600",
  },
  addCardForm: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "white",
  },
  saveCardContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  saveCardLabel: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  addCardSubmitButton: {
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  addCardSubmitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  securityNotice: {
    backgroundColor: "white",
    padding: 20,
    marginBottom: 10,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  securityText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  payButtonContainer: {
    padding: 20,
  },
  payButton: {
    backgroundColor: "#4CAF50",
    padding: 18,
    borderRadius: 8,
    alignItems: "center",
  },
  payButtonDisabled: {
    backgroundColor: "#ccc",
  },
  payButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default PaymentMethodScreen;
