import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useVerifyOtp, useRequestOtp } from "../../hooks/useAuth";
import { COLORS, FONT_SIZES } from "../../constants";
import i18n from "../../i18n";

export default function VerifyOtpScreen({ route }: { route: any }) {
  const { phone_number, dev_otp } = route.params;
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(30);
  const [error, setError] = useState("");
  const verifyOtp = useVerifyOtp();
  const resendOtp = useRequestOtp();

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const maskedPhone = phone_number.replace(
    /(\+91)(\d{7})(\d{3})/,
    "$1 ******* $3"
  );

  const handleVerify = () => {
    setError("");
    verifyOtp.mutate(
      { phone_number, otp },
      {
        onError: () => {
          setError(i18n.t("auth.invalidOtp"));
          setOtp("");
        },
      }
    );
  };

  const handleResend = () => {
    setCountdown(30);
    resendOtp.mutate(phone_number);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{i18n.t("auth.enterOtp")}</Text>
      <Text style={styles.phone}>{maskedPhone}</Text>

      <TextInput
        style={[styles.otpInput, error ? styles.otpError : null]}
        placeholder="000000"
        keyboardType="number-pad"
        maxLength={6}
        value={otp}
        onChangeText={(text) => {
          setOtp(text);
          setError("");
        }}
        autoFocus
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {__DEV__ && dev_otp && (
        <Text style={styles.devHint}>DEV OTP: {dev_otp}</Text>
      )}

      <TouchableOpacity
        style={[styles.button, otp.length !== 6 && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={verifyOtp.isPending || otp.length !== 6}
      >
        {verifyOtp.isPending ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.buttonText}>{i18n.t("auth.verify")}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleResend}
        disabled={countdown > 0}
        style={styles.resendRow}
      >
        <Text
          style={[styles.resendText, countdown > 0 && styles.resendDisabled]}
        >
          {countdown > 0
            ? `${i18n.t("auth.resendOtp")} (${countdown}s)`
            : i18n.t("auth.resendOtp")}
        </Text>
      </TouchableOpacity>
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
  heading: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
  },
  phone: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 32,
  },
  otpInput: {
    fontSize: 32,
    textAlign: "center",
    letterSpacing: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    height: 64,
    marginBottom: 8,
  },
  otpError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    textAlign: "center",
    fontSize: FONT_SIZES.medium,
    marginBottom: 8,
  },
  devHint: {
    color: COLORS.textSecondary,
    textAlign: "center",
    fontSize: 12,
    marginBottom: 16,
  },
  button: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.large,
    fontWeight: "600",
  },
  resendRow: {
    alignItems: "center",
    marginTop: 24,
  },
  resendText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.primary,
  },
  resendDisabled: {
    color: COLORS.textSecondary,
  },
});
