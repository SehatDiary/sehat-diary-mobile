import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { COLORS } from "../../constants";
import { PatientStackParamList } from "../../types";
import i18n from "../../i18n";

type Nav = StackNavigationProp<PatientStackParamList, "MedicineDetail">;
type Route = RouteProp<PatientStackParamList, "MedicineDetail">;

export default function MedicineDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { name, dosage, frequency, instructionsHi, durationDays, rawText } =
    route.params;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={i18n.t("common.back")}
        >
          <Text style={styles.backText}>{"←"}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{i18n.t("medicineDetail.title")}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.name}>{name}</Text>

        {instructionsHi && (
          <View style={styles.explanationCard}>
            <Text style={styles.explanationText}>{instructionsHi}</Text>
          </View>
        )}

        {dosage && (
          <Row label={i18n.t("medicineDetail.dose")} value={dosage} />
        )}
        {frequency && (
          <Row label={i18n.t("medicineDetail.howOften")} value={frequency} />
        )}
        {durationDays != null && (
          <Row
            label={i18n.t("medicineDetail.howLong")}
            value={i18n.t("medicineDetail.days", { count: durationDays })}
          />
        )}

        {rawText && (
          <View style={styles.rawCard}>
            <Text style={styles.rawLabel}>
              {i18n.t("medicineDetail.asWritten")}
            </Text>
            <Text style={styles.rawValue}>{rawText}</Text>
            <Text style={styles.rawHint}>
              {i18n.t("medicineDetail.checkHint")}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.closeButton}
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
        >
          <Text style={styles.closeButtonText}>{i18n.t("common.close")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
  },
  backButton: { padding: 8, marginRight: 8 },
  backText: { fontSize: 28, color: COLORS.primary },
  title: { fontSize: 26, fontWeight: "700", color: COLORS.text },
  content: { padding: 20, paddingBottom: 48 },
  name: { fontSize: 28, fontWeight: "700", color: COLORS.text },
  explanationCard: {
    backgroundColor: COLORS.white,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.primary,
    borderRadius: 12,
    padding: 20,
    marginTop: 18,
  },
  explanationText: { fontSize: 22, color: COLORS.text, lineHeight: 34 },
  row: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 18,
    marginTop: 14,
  },
  rowLabel: { fontSize: 18, color: COLORS.textSecondary },
  rowValue: {
    fontSize: 21,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 6,
  },
  rawCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginTop: 22,
  },
  rawLabel: { fontSize: 18, color: COLORS.textSecondary },
  rawValue: {
    fontSize: 20,
    color: COLORS.text,
    fontStyle: "italic",
    marginTop: 8,
  },
  rawHint: { fontSize: 18, color: COLORS.textSecondary, marginTop: 12, lineHeight: 28 },
  closeButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 32,
  },
  closeButtonText: { fontSize: 20, fontWeight: "700", color: COLORS.white },
});
