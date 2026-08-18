import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { COLORS, FONT_SIZES } from "../../constants";
import {
  useGetMemberAdherence,
  useGetMemberAdherenceHistory,
  useCorrectDose,
} from "../../hooks/useAdherence";
import {
  AdherenceLog,
  CaregiverStackParamList,
  HistoryDay,
  HistoryDose,
} from "../../types";
import { dayTone, isToday, sortedDoses, weekTotals } from "./adherenceWeek";
import { TodayMedicines } from "../../api/adherence";
import i18n from "../../i18n";
import { dateLocale } from "../../i18n/locale";

type Nav = StackNavigationProp<CaregiverStackParamList, "MemberAdherence">;
type Route = RouteProp<CaregiverStackParamList, "MemberAdherence">;

const TIME_SLOTS = ["morning", "afternoon", "evening", "night"] as const;
const SLOT_LABELS: Record<string, () => string> = {
  morning: () => i18n.t("medicines.morning"),
  afternoon: () => i18n.t("medicines.afternoon"),
  evening: () => i18n.t("medicines.evening"),
  night: () => i18n.t("medicines.night"),
};
const SLOT_ICONS: Record<string, string> = {
  morning: "\u{1F305}",
  afternoon: "\u{2600}\u{FE0F}",
  evening: "\u{1F307}",
  night: "\u{1F319}",
};

function buildSections(data: TodayMedicines) {
  return TIME_SLOTS.filter((slot) => data[slot].length > 0).map((slot) => ({
    title: SLOT_LABELS[slot](),
    icon: SLOT_ICONS[slot],
    data: data[slot],
  }));
}

const TONE_COLORS: Record<string, string> = {
  good: COLORS.success,
  partial: "#E9A23B",
  bad: COLORS.error,
  empty: COLORS.cardBorder,
};

function weekdayLabel(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  // Built from the parts rather than parsed from the string: new Date("2026-08-18")
  // is midnight UTC, which is the previous evening in India, and would label
  // every cell with the wrong day.
  return new Date(year, month - 1, day).toLocaleDateString(dateLocale(), {
    weekday: "narrow",
  });
}

function WeekStrip({
  days,
  selectedDate,
  onSelect,
}: {
  days: HistoryDay[];
  selectedDate: string;
  onSelect: (date: string) => void;
}) {
  const totals = weekTotals(days);
  const today = new Date();

  return (
    <View style={styles.weekSection}>
      <View style={styles.weekHeader}>
        <Text style={styles.weekTitle}>{i18n.t("medicines.thisWeek")}</Text>
        <Text style={styles.weekSummary}>
          {totals.percentTaken === null
            ? i18n.t("medicines.noDosesScheduled")
            : i18n.t("medicines.weekSummary", {
                taken: totals.taken,
                scheduled: totals.scheduled,
              })}
        </Text>
      </View>

      <View style={styles.weekRow}>
        {days.map((day) => {
          const selected = day.date === selectedDate;

          return (
            <TouchableOpacity
              key={day.date}
              style={[styles.dayCell, selected && styles.dayCellSelected]}
              onPress={() => onSelect(day.date)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${day.date}: ${day.taken}/${day.scheduled}`}
            >
              <Text style={styles.dayLetter}>{weekdayLabel(day.date)}</Text>
              <View
                style={[
                  styles.dayDot,
                  { backgroundColor: TONE_COLORS[dayTone(day)] },
                ]}
              />
              <Text style={styles.dayCount}>
                {day.scheduled === 0 ? "–" : `${day.taken}/${day.scheduled}`}
              </Text>
              {isToday(day, today) && <View style={styles.todayMarker} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function HistoryDoseCard({
  dose,
  onCorrect,
  isCorrecting,
}: {
  dose: HistoryDose;
  onCorrect: (dose: HistoryDose) => void;
  isCorrecting: boolean;
}) {
  const time = new Date(dose.scheduled_at).toLocaleTimeString(dateLocale(), {
    hour: "2-digit",
    minute: "2-digit",
  });

  const STATUS_LABELS: Record<HistoryDose["status"], string> = {
    taken: i18n.t("medicines.taken"),
    missed: i18n.t("medicines.missed"),
    snoozed: i18n.t("medicines.snoozed"),
    pending: i18n.t("medicines.pending"),
  };

  return (
    <View
      style={[
        styles.card,
        dose.status === "taken" && styles.cardTaken,
        dose.status === "missed" && styles.cardMissed,
      ]}
    >
      <View style={styles.cardContent}>
        <Text style={styles.medicineName}>{dose.medicine_name}</Text>
        {dose.instructions_hi && (
          <Text style={styles.instructions}>{dose.instructions_hi}</Text>
        )}
        <Text style={styles.dosage}>
          {time}
          {dose.dosage ? ` • ${dose.dosage}` : ""}
        </Text>
        {dose.marked_late && (
          <Text style={styles.acknowledgedText}>
            {i18n.t("medicines.markedLate")}
          </Text>
        )}
        {dose.notes && (
          <Text style={styles.reminderCountText}>{dose.notes}</Text>
        )}
      </View>

      {dose.correctable ? (
        <TouchableOpacity
          style={styles.correctButton}
          onPress={() => onCorrect(dose)}
          disabled={isCorrecting}
          accessibilityRole="button"
          accessibilityLabel={i18n.t("medicines.correctAction")}
        >
          <Text style={styles.correctButtonText}>
            {i18n.t("medicines.correctAction")}
          </Text>
        </TouchableOpacity>
      ) : (
        <View
          style={
            dose.status === "taken" ? styles.takenBadge : styles.missedBadge
          }
        >
          <Text
            style={
              dose.status === "taken" ? styles.takenText : styles.missedText
            }
          >
            {STATUS_LABELS[dose.status]}
          </Text>
        </View>
      )}
    </View>
  );
}

function MedicineCard({
  log,
  isHighlighted,
}: {
  log: AdherenceLog;
  isHighlighted: boolean;
}) {
  const isMissed = !log.taken;

  return (
    <View
      style={[
        styles.card,
        log.taken && styles.cardTaken,
        isMissed && styles.cardMissed,
        isHighlighted && styles.cardHighlighted,
      ]}
    >
      <View style={styles.cardContent}>
        <Text style={styles.medicineName}>{log.medicine_name}</Text>
        {log.instructions_hi && (
          <Text style={styles.instructions}>{log.instructions_hi}</Text>
        )}
        {log.dosage && <Text style={styles.dosage}>{log.dosage}</Text>}
        {log.taken && log.acknowledged_at && (
          <Text style={styles.acknowledgedText}>
            {i18n.t("medicines.confirmedViaNotification")} {"\u2022"}{" "}
            {new Date(log.acknowledged_at).toLocaleTimeString(dateLocale(), {
              hour: "2-digit",
              minute: "2-digit",
            })}
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
        <View style={styles.missedBadge}>
          <Text style={styles.missedText}>
            {i18n.t("medicines.missed")}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function MemberAdherenceScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { memberId, memberName, highlightAdherenceLogId } = route.params;

  const { data, isLoading, isError, isRefetching, refetch } =
    useGetMemberAdherence(memberId);
  const { data: history, refetch: refetchHistory } =
    useGetMemberAdherenceHistory(memberId);
  const correctDose = useCorrectDose(memberId);

  const days = history?.days ?? [];
  const latestDate = days.length > 0 ? days[days.length - 1].date : null;
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const selectedDate = pickedDate ?? latestDate;
  const selectedDay = days.find((day) => day.date === selectedDate);

  // Today keeps the existing morning/afternoon/evening/night grouping, which is
  // how a caregiver reads the current day. Past days have no live slots to act
  // on, so they render as a flat list ordered by what went wrong first.
  const showingToday = selectedDate !== null && selectedDate === latestDate;

  const confirmCorrection = (dose: HistoryDose) => {
    Alert.alert(
      i18n.t("medicines.correctTitle"),
      i18n.t("medicines.correctMessage", {
        medicine: dose.medicine_name,
        date: selectedDate ?? "",
      }),
      [
        { text: i18n.t("common.cancel"), style: "cancel" },
        {
          text: i18n.t("medicines.correctAction"),
          onPress: () =>
            correctDose.mutate(dose.id, {
              onError: () => Alert.alert(i18n.t("medicines.correctFailed")),
            }),
        },
      ]
    );
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
  const isEmpty = sections.length === 0;

  const weekStrip =
    days.length > 0 && selectedDate ? (
      <WeekStrip
        days={days}
        selectedDate={selectedDate}
        onSelect={setPickedDate}
      />
    ) : null;

  const refreshAll = () => {
    refetch();
    refetchHistory();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>{"\u2190"}</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{memberName}</Text>
          <Text style={styles.subtitle}>{i18n.t("medicines.title")}</Text>
        </View>
      </View>

      {!showingToday && selectedDay ? (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refreshAll}
              tintColor={COLORS.primary}
            />
          }
        >
          {weekStrip}

          {selectedDay.doses.length === 0 ? (
            <View style={styles.emptyDay}>
              <Text style={styles.emptyText}>
                {i18n.t("medicines.noDosesThatDay")}
              </Text>
            </View>
          ) : (
            sortedDoses(selectedDay.doses).map((dose) => (
              <HistoryDoseCard
                key={dose.id}
                dose={dose}
                onCorrect={confirmCorrection}
                isCorrecting={correctDose.isPending}
              />
            ))
          )}
        </ScrollView>
      ) : isEmpty ? (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refreshAll}
              tintColor={COLORS.primary}
            />
          }
        >
          {weekStrip}
          <View style={styles.emptyDay}>
            <Text style={styles.emptyIcon}>{"\u{1F48A}"}</Text>
            <Text style={styles.emptyText}>
              {i18n.t("medicines.noMedicines")}
            </Text>
          </View>
        </ScrollView>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={weekStrip}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>{section.icon}</Text>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <MedicineCard
              log={item}
              isHighlighted={item.id === highlightAdherenceLogId}
            />
          )}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refreshAll}
              tintColor={COLORS.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  weekSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  weekHeader: {
    marginBottom: 12,
  },
  weekTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: "700",
    color: COLORS.text,
  },
  weekSummary: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  dayCellSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
  },
  dayLetter: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  dayDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dayCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  todayMarker: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    marginTop: 4,
  },
  emptyDay: {
    alignItems: "center",
    paddingVertical: 32,
  },
  correctButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
  },
  correctButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.small,
    fontWeight: "600",
  },
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
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  backText: {
    fontSize: 24,
    color: COLORS.white,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: "bold",
    color: COLORS.white,
  },
  subtitle: {
    fontSize: FONT_SIZES.small,
    color: COLORS.white,
    opacity: 0.8,
    marginTop: 2,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
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
  },
  cardTaken: {
    opacity: 0.6,
    backgroundColor: "#F0FFF4",
  },
  cardMissed: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  cardHighlighted: {
    backgroundColor: "#FFF5F5",
    borderColor: COLORS.error,
    borderWidth: 2,
  },
  cardContent: {
    flex: 1,
    marginRight: 12,
  },
  medicineName: {
    fontSize: FONT_SIZES.large,
    fontWeight: "bold",
    color: COLORS.text,
  },
  instructions: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.primaryDark,
    marginTop: 4,
    lineHeight: 22,
  },
  dosage: {
    fontSize: FONT_SIZES.medium,
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
  takenBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  takenText: {
    color: COLORS.success,
    fontSize: FONT_SIZES.medium,
    fontWeight: "bold",
  },
  missedBadge: {
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  missedText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.medium,
    fontWeight: "bold",
  },
  loadingText: {
    marginTop: 12,
    fontSize: FONT_SIZES.medium,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: FONT_SIZES.large,
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
    fontSize: FONT_SIZES.medium,
    fontWeight: "600",
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
  },
});
