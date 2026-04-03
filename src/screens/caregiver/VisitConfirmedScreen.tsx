import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { COLORS, FONT_SIZES } from "../../constants";
import {
  CaregiverStackParamList,
  DoctorVisit,
  VisitInstruction,
} from "../../types";
import i18n from "../../i18n";

type Nav = StackNavigationProp<CaregiverStackParamList, "VisitConfirmed">;
type Route = RouteProp<CaregiverStackParamList, "VisitConfirmed">;

const INSTRUCTION_ICONS: Record<VisitInstruction["category"], string> = {
  exercise: "\u{1F3C3}",
  diet: "\u{1F957}",
  device: "\u{1F527}",
  general: "\u{1F4CB}",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("hi-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function VisitConfirmedScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { memberId, sessionId, doctorVisit } = route.params;

  const handleDone = () => {
    navigation.navigate("SessionDetail", { memberId, sessionId });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>{"\u2705"}</Text>
        <Text style={styles.headerTitle}>{i18n.t("visit.saved")}</Text>
        {doctorVisit.doctor_name && (
          <Text style={styles.headerSubtitle}>
            {doctorVisit.doctor_name}
            {doctorVisit.visit_date ? ` \u2022 ${formatDate(doctorVisit.visit_date)}` : ""}
          </Text>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!doctorVisit.patient_name_match && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningIcon}>{"\u26A0\uFE0F"}</Text>
            <Text style={styles.warningText}>
              {i18n.t("visit.nameMismatch")}
            </Text>
          </View>
        )}

        {doctorVisit.summary_hi && (
          <View style={styles.summaryCardHi}>
            <Text style={styles.summaryLabelHi}>
              {i18n.t("visit.summaryHi")}
            </Text>
            <Text style={styles.summaryTextHi}>{doctorVisit.summary_hi}</Text>
          </View>
        )}

        {doctorVisit.summary_en && (
          <View style={styles.summaryCardEn}>
            <Text style={styles.summaryLabelEn}>
              {i18n.t("visit.summaryEn")}
            </Text>
            <Text style={styles.summaryTextEn}>{doctorVisit.summary_en}</Text>
          </View>
        )}

        <MedicinesSection medicines={doctorVisit.medicines} />
        <TestsSection tests={doctorVisit.tests} />
        <ReferralsSection referrals={doctorVisit.referrals} />
        <InstructionsSection instructions={doctorVisit.instructions} />
      </ScrollView>

      <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
        <Text style={styles.doneButtonText}>{i18n.t("visit.done")}</Text>
      </TouchableOpacity>
    </View>
  );
}

function MedicinesSection({ medicines }: { medicines: DoctorVisit["medicines"] }) {
  if (medicines.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{"\u{1F48A}"}</Text>
        <Text style={styles.sectionTitle}>
          {i18n.t("visit.medicinesCount", { count: medicines.length })}
        </Text>
      </View>
      {medicines.map((med) => (
        <View key={med.id} style={styles.compactItem}>
          <Text style={styles.compactName}>{med.name}</Text>
          <Text style={styles.compactDetail}>
            {[med.dosage, med.frequency, med.duration_days ? `${med.duration_days} ${i18n.t("session.days")}` : null]
              .filter(Boolean)
              .join(" \u2022 ")}
          </Text>
        </View>
      ))}
    </View>
  );
}

function TestsSection({ tests }: { tests: DoctorVisit["tests"] }) {
  if (tests.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{"\u{1F9EA}"}</Text>
        <Text style={styles.sectionTitle}>{i18n.t("visit.testsOrdered")}</Text>
      </View>
      {tests.map((test) => (
        <View key={test.id} style={styles.compactItem}>
          <View style={styles.testRow}>
            <View style={[styles.statusDot, { backgroundColor: COLORS.warning }]} />
            <Text style={styles.compactName}>{test.name}</Text>
          </View>
          <Text style={styles.pendingLabel}>{i18n.t("visit.pendingStatus")}</Text>
        </View>
      ))}
    </View>
  );
}

function ReferralsSection({ referrals }: { referrals: DoctorVisit["referrals"] }) {
  if (referrals.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{"\u{1F3E5}"}</Text>
        <Text style={styles.sectionTitle}>{i18n.t("visit.referrals")}</Text>
      </View>
      {referrals.map((ref) => (
        <View key={ref.id} style={styles.compactItem}>
          <Text style={styles.compactName}>{ref.specialist}</Text>
          {ref.reason && (
            <Text style={styles.compactDetail}>{ref.reason}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

function InstructionsSection({
  instructions,
}: {
  instructions: DoctorVisit["instructions"];
}) {
  if (instructions.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{"\u{1F4DD}"}</Text>
        <Text style={styles.sectionTitle}>{i18n.t("visit.instructions")}</Text>
      </View>
      {instructions.map((inst) => (
        <View key={inst.id} style={styles.instructionItem}>
          <Text style={styles.instructionIcon}>
            {INSTRUCTION_ICONS[inst.category]}
          </Text>
          <View style={styles.instructionContent}>
            <Text style={styles.instructionCategory}>
              {i18n.t(`visit.${inst.category}`)}
            </Text>
            <Text style={styles.instructionText}>{inst.text_hi}</Text>
            {inst.text_en && (
              <Text style={styles.instructionTextEn}>{inst.text_en}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  headerIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: FONT_SIZES.title,
    fontWeight: "bold",
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 4,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },

  // Warning banner
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3CD",
    borderWidth: 1,
    borderColor: "#FFCA2C",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  warningText: {
    flex: 1,
    fontSize: FONT_SIZES.small,
    color: "#664D03",
    lineHeight: 20,
  },

  // Hindi summary (prominent)
  summaryCardHi: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  summaryLabelHi: {
    fontSize: FONT_SIZES.small,
    color: COLORS.primary,
    fontWeight: "600",
    marginBottom: 8,
  },
  summaryTextHi: {
    fontSize: FONT_SIZES.large,
    color: COLORS.text,
    lineHeight: 28,
  },

  // English summary
  summaryCardEn: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  summaryLabelEn: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  summaryTextEn: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
    lineHeight: 24,
  },

  // Sections
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "bold",
    color: COLORS.text,
  },
  compactItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  compactName: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "600",
    color: COLORS.primaryDark,
  },
  compactDetail: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Tests
  testRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  pendingLabel: {
    fontSize: FONT_SIZES.small,
    color: COLORS.warning,
    marginTop: 2,
    marginLeft: 16,
  },

  // Instructions
  instructionItem: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  instructionIcon: {
    fontSize: 20,
    marginRight: 10,
    marginTop: 2,
  },
  instructionContent: {
    flex: 1,
  },
  instructionCategory: {
    fontSize: FONT_SIZES.small,
    fontWeight: "600",
    color: COLORS.primary,
    marginBottom: 2,
  },
  instructionText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
    lineHeight: 22,
  },
  instructionTextEn: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Done button
  doneButton: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    marginBottom: 32,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  doneButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.large,
    fontWeight: "bold",
  },
});
