import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRequestOtp } from "../../hooks/useAuth";
import { COLORS, FONT_SIZES } from "../../constants";
import i18n from "../../i18n";

export default function RequestOtpScreen({ navigation }: { navigation: any }) {
  const [phone, setPhone] = useState("");
  const requestOtp = useRequestOtp();

  const handleSendOtp = () => {
    if (phone.length !== 10) {
      Alert.alert("Error", "Please enter a valid 10-digit phone number");
      return;
    }

    const fullPhone = `+91${phone}`;
    requestOtp.mutate(fullPhone, {
      onSuccess: () => {
        navigation.navigate("VerifyOtp", { phone_number: fullPhone });
      },
      onError: () => {
        Alert.alert("Error", "Failed to send OTP. Please try again.");
      },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sehat Diary</Text>
        <Text style={styles.tagline}>{i18n.t("auth.tagline")}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>{i18n.t("auth.enterPhone")}</Text>
        <View style={styles.phoneRow}>
          <Text style={styles.prefix}>+91</Text>
          <TextInput
            style={styles.input}
            placeholder="9876543210"
            keyboardType="phone-pad"
            maxLength={10}
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, phone.length !== 10 && styles.buttonDisabled]}
          onPress={handleSendOtp}
          disabled={requestOtp.isPending || phone.length !== 10}
        >
          {requestOtp.isPending ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.buttonText}>{i18n.t("auth.sendOtp")}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  title: {
    fontSize: FONT_SIZES.title,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  tagline: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: FONT_SIZES.large,
    color: COLORS.text,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  prefix: {
    fontSize: FONT_SIZES.large,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZES.large,
    color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.large,
    fontWeight: "600",
  },
});
