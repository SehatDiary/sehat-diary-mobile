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
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { COLORS, FONT_SIZES } from "../../constants";
import { useGetMemberAdherence } from "../../hooks/useAdherence";
import { AdherenceLog, CaregiverStackParamList } from "../../types";
import { TodayMedicines } from "../../api/adherence";
import i18n from "../../i18n";

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
            {new Date(log.acknowledged_at).toLocaleTimeString("hi-IN", {
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

  const { data, isLoading, isError, refetch } =
    useGetMemberAdherence(memberId);

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

      {isEmpty ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>{"\u{1F48A}"}</Text>
          <Text style={styles.emptyText}>
            {i18n.t("medicines.noMedicines")}
          </Text>
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
            <MedicineCard
              log={item}
              isHighlighted={item.id === highlightAdherenceLogId}
            />
          )}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refetch}
              tintColor={COLORS.primary}
            />
          }
        />
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
