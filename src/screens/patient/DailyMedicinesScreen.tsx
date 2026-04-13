import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Svg, { Circle } from "react-native-svg";
import { COLORS } from "../../constants";
import {
  useGetTodaysMedicines,
  useMarkTaken,
  useGetCriticalLabReports,
} from "../../hooks/useAdherence";
import { AdherenceLog, PatientCriticalLabReport, PatientStackParamList } from "../../types";
import { TodayMedicines } from "../../api/adherence";
import i18n from "../../i18n";

type Nav = StackNavigationProp<PatientStackParamList, "DailyMedicines">;

const TIME_SLOTS = ["morning", "afternoon", "evening", "night"] as const;
const SLOT_LABELS: Record<string, () => string> = {
  morning: () => i18n.t("medicines.morning"),
  afternoon: () => i18n.t("medicines.afternoon"),
  evening: () => i18n.t("medicines.evening"),
  night: () => i18n.t("medicines.night"),
};
const SLOT_ICONS: Record<string, string> = {
  morning: "🌅",
  afternoon: "☀️",
  evening: "🌇",
  night: "🌙",
};

function buildSections(data: TodayMedicines) {
  return TIME_SLOTS
    .filter((slot) => data[slot].length > 0)
    .map((slot) => ({
      title: SLOT_LABELS[slot](),
      icon: SLOT_ICONS[slot],
      data: data[slot],
    }));
}

function getProgress(data: TodayMedicines) {
  let total = 0;
  let taken = 0;
  for (const slot of TIME_SLOTS) {
    for (const log of data[slot]) {
      total++;
      if (log.taken) taken++;
    }
  }
  return { total, taken, pct: total > 0 ? Math.round((taken / total) * 100) : 0 };
}

function ProgressRing({ pct }: { pct: number }) {
  const size = 100;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (pct / 100) * circumference;
  const color = pct >= 80 ? COLORS.success : pct >= 50 ? COLORS.warning : COLORS.error;

  return (
    <View style={styles.ringContainer}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={COLORS.cardBorder}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={progress}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text style={styles.ringText}>{pct}%</Text>
    </View>
  );
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("hi-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MedicineCard({
  log,
  onMarkTaken,
}: {
  log: AdherenceLog;
  onMarkTaken: (id: number) => void;
}) {
  return (
    <View style={[styles.card, log.taken && styles.cardTaken]}>
      <View style={styles.cardContent}>
        <Text style={styles.medicineName}>{log.medicine_name}</Text>
        {log.instructions_hi && (
          <Text style={styles.instructions}>{log.instructions_hi}</Text>
        )}
        {log.dosage && (
          <Text style={styles.dosage}>{log.dosage}</Text>
        )}
        {log.taken && log.acknowledged_at && (
          <Text style={styles.acknowledgedText}>
            {i18n.t("medicines.confirmedViaNotification")} {"\u2022"}{" "}
            {formatTime(log.acknowledged_at)}
          </Text>
        )}
        {!log.taken && (log.reminder_count ?? 0) > 0 && (
          <Text style={styles.reminderCountText}>
            {i18n.t("medicines.reminderSent", { count: log.reminder_count })}
          </Text>
        )}
      </View>
      {log.taken ? (
        <View style={styles.takenBadge}>
          <Text style={styles.takenText}>{i18n.t("medicines.taken")}</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.takeButton}
          activeOpacity={0.7}
          onPress={() => onMarkTaken(log.id)}
        >
          <Text style={styles.takeButtonText}>{i18n.t("medicines.taken")}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function CriticalLabAlertCard({
  report,
}: {
  report: PatientCriticalLabReport;
}) {
  const [showSummary, setShowSummary] = React.useState(false);

  return (
    <TouchableOpacity
      style={styles.criticalLabCard}
      activeOpacity={0.7}
      onPress={() => setShowSummary(!showSummary)}
    >
      <Text style={styles.criticalLabTitle}>
        {i18n.t("labReport.patientCriticalTitle")}
      </Text>
      <Text style={styles.criticalLabSubtitle}>
        {i18n.t("labReport.patientCriticalSubtitle")}
      </Text>
      {showSummary && report.hindi_summary && (
        <View style={styles.hindiSummaryBox}>
          <Text style={styles.hindiSummaryText}>{report.hindi_summary}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function DailyMedicinesScreen() {
  const navigation = useNavigation<Nav>();
  const { data, isLoading, isError, refetch } = useGetTodaysMedicines();
  const markTaken = useMarkTaken();
  const { data: criticalReports } = useGetCriticalLabReports();

  const handleMarkTaken = (id: number) => {
    markTaken.mutate(id);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>{i18n.t("common.loading")}</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{i18n.t("common.error")}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>{i18n.t("common.retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sections = data ? buildSections(data) : [];
  const progress = data ? getProgress(data) : { total: 0, taken: 0, pct: 0 };
  const isEmpty = progress.total === 0;

  // Filter to recent reports (< 7 days) with critical findings
  const recentCriticalReports = (criticalReports ?? []).filter((r) => {
    const created = new Date(r.created_at).getTime();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return created >= sevenDaysAgo;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{i18n.t("medicines.title")}</Text>
          {!isEmpty && (
            <Text style={styles.subtitle}>
              {progress.taken}/{progress.total}
            </Text>
          )}
        </View>
        <View style={styles.headerRight}>
          {!isEmpty && <ProgressRing pct={progress.pct} />}
          <TouchableOpacity
            style={styles.caregiversLink}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("ManageCaregivers")}
          >
            <Text style={styles.caregiversLinkText}>
              {i18n.t("caregivers.myCaregivers")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {isEmpty ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>💊</Text>
          <Text style={styles.emptyText}>{i18n.t("medicines.noMedicines")}</Text>
          {recentCriticalReports.map((r) => (
            <CriticalLabAlertCard key={r.id} report={r} />
          ))}
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id.toString()}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>{section.icon}</Text>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <MedicineCard log={item} onMarkTaken={handleMarkTaken} />
          )}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          ListFooterComponent={
            recentCriticalReports.length > 0 ? (
              <View style={styles.criticalLabSection}>
                {recentCriticalReports.map((r) => (
                  <CriticalLabAlertCard key={r.id} report={r} />
                ))}
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refetch}
              tintColor={COLORS.primary}
            />
          }
        />
      )}

      {/* Alert Family Button */}
      {!isEmpty && (
        <TouchableOpacity style={styles.alertButton} activeOpacity={0.8}>
          <Text style={styles.alertButtonText}>
            {i18n.t("reminders.alertFamily")}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: "center",
  },
  caregiversLink: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
  },
  caregiversLinkText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.white,
  },
  subtitle: {
    fontSize: 20,
    color: COLORS.white,
    opacity: 0.8,
    marginTop: 4,
  },
  ringContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  ringText: {
    position: "absolute",
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.white,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  sectionIcon: {
    fontSize: 22,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    minHeight: 80,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  cardTaken: {
    opacity: 0.6,
    backgroundColor: "#F0FFF4",
  },
  cardContent: {
    flex: 1,
    marginRight: 12,
  },
  medicineName: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
  },
  instructions: {
    fontSize: 18,
    color: COLORS.primaryDark,
    marginTop: 4,
    lineHeight: 26,
  },
  dosage: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  acknowledgedText: {
    fontSize: 13,
    color: COLORS.success,
    marginTop: 4,
  },
  reminderCountText: {
    fontSize: 13,
    color: COLORS.warning,
    marginTop: 4,
  },
  takeButton: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 80,
    minHeight: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  takeButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  takenBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  takenText: {
    color: COLORS.success,
    fontSize: 18,
    fontWeight: "bold",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: 20,
    color: COLORS.error,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "600",
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
  },
  criticalLabSection: {
    marginTop: 16,
  },
  criticalLabCard: {
    backgroundColor: "#FFF3E0",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    marginHorizontal: 0,
    borderWidth: 1,
    borderColor: "#FFB74D",
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
    marginTop: 12,
  },
  criticalLabTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
    lineHeight: 28,
  },
  criticalLabSubtitle: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 26,
  },
  hindiSummaryBox: {
    marginTop: 12,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  hindiSummaryText: {
    fontSize: 18,
    color: COLORS.text,
    lineHeight: 28,
  },
  alertButton: {
    position: "absolute",
    bottom: 32,
    left: 20,
    right: 20,
    backgroundColor: COLORS.warning,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  alertButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
  },
});
