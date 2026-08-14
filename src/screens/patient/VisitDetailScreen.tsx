import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useQuery } from "@tanstack/react-query";
import { COLORS } from "../../constants";
import { PatientStackParamList } from "../../types";
import { getHealthSession } from "../../api/familyMembers";
import { hindiFirst } from "./patientText";
import i18n from "../../i18n";
import { dateLocale } from "../../i18n/locale";

type Nav = StackNavigationProp<PatientStackParamList, "VisitDetail">;
type Route = RouteProp<PatientStackParamList, "VisitDetail">;

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString(dateLocale(), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function VisitDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { memberId, sessionId, doctorVisitId } = route.params;

  const { data, isLoading } = useQuery({
    queryKey: ["healthSession", memberId, sessionId],
    queryFn: () => getHealthSession(memberId, sessionId),
  });

  const visit = data?.doctor_visits.find((v) => v.id === doctorVisitId);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!visit) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>{i18n.t("visitHistory.notFound")}</Text>
      </View>
    );
  }

  const summary = hindiFirst(visit.summary_hi, visit.summary_en);
  // The API carries no Hindi diagnosis field — the Hindi rendering of the
  // condition lives inside summary_hi above.
  const diagnosis = visit.diagnosis;

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
        <Text style={styles.title}>{i18n.t("visitHistory.detailTitle")}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.date}>{formatDate(visit.visit_date)}</Text>
        {visit.doctor_name && (
          <Text style={styles.doctor}>{visit.doctor_name}</Text>
        )}
        {visit.hospital_name && (
          <Text style={styles.hospital}>{visit.hospital_name}</Text>
        )}

        {summary && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>
              {i18n.t("visitHistory.whatDoctorSaid")}
            </Text>
            <Text style={styles.summaryText}>{summary}</Text>
          </View>
        )}

        {diagnosis && (
          <View style={styles.block}>
            <Text style={styles.blockLabel}>
              {i18n.t("visitHistory.diagnosis")}
            </Text>
            <Text style={styles.blockText}>{diagnosis}</Text>
          </View>
        )}

        {visit.medicines.length > 0 && (
          <View style={styles.block}>
            <Text style={styles.blockLabel}>
              {i18n.t("visitHistory.medicines")}
            </Text>
            {visit.medicines.map((medicine) => (
              <TouchableOpacity
                key={medicine.id}
                style={styles.medicineRow}
                activeOpacity={0.7}
                accessibilityRole="button"
                onPress={() =>
                  navigation.navigate("MedicineDetail", {
                    name: medicine.name,
                    dosage: medicine.dosage,
                    frequency: medicine.frequency,
                    instructionsHi: medicine.instructions_hi,
                    durationDays: medicine.duration_days,
                    rawText: medicine.raw_text ?? null,
                  })
                }
              >
                <Text style={styles.medicineName}>{medicine.name}</Text>
                {medicine.instructions_hi && (
                  <Text style={styles.medicineHint}>
                    {medicine.instructions_hi}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {visit.next_visit_date && (
          <View style={styles.nextVisitCard}>
            <Text style={styles.blockLabel}>
              {i18n.t("visitHistory.nextVisit")}
            </Text>
            <Text style={styles.nextVisitDate}>
              {formatDate(visit.next_visit_date)}
            </Text>
            {visit.next_visit_instructions && (
              <Text style={styles.blockText}>
                {visit.next_visit_instructions}
              </Text>
            )}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: COLORS.background,
  },
  emptyText: { fontSize: 20, color: COLORS.textSecondary, textAlign: "center" },
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
  date: { fontSize: 22, fontWeight: "700", color: COLORS.text },
  doctor: { fontSize: 20, color: COLORS.primary, marginTop: 6 },
  hospital: { fontSize: 18, color: COLORS.textSecondary, marginTop: 4 },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.primary,
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
  },
  summaryLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  // The visit summary is the single thing Papa opens this screen to read.
  summaryText: { fontSize: 22, color: COLORS.text, lineHeight: 34 },
  block: { marginTop: 22 },
  blockLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  blockText: { fontSize: 19, color: COLORS.text, lineHeight: 29 },
  medicineRow: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
  },
  medicineName: { fontSize: 20, fontWeight: "600", color: COLORS.text },
  medicineHint: { fontSize: 18, color: COLORS.textSecondary, marginTop: 6 },
  nextVisitCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginTop: 22,
  },
  nextVisitDate: { fontSize: 21, fontWeight: "700", color: COLORS.primary },
  closeButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 32,
  },
  closeButtonText: { fontSize: 20, fontWeight: "700", color: COLORS.white },
});
