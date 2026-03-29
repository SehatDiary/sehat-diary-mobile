import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, FONT_SIZES } from "../../constants";

export default function DailyMedicinesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daily Medicines</Text>
      <Text style={styles.subtitle}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.white },
  title: { fontSize: FONT_SIZES.xlarge, fontWeight: "bold", color: COLORS.primary },
  subtitle: { fontSize: FONT_SIZES.medium, color: COLORS.textSecondary, marginTop: 8 },
});
