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
import { COLORS, FONT_SIZES } from "../../constants";
import {
  useGetFamilyMembers,
  useGetPendingActions,
} from "../../hooks/useFamilyMembers";
import {
  useGetPendingInvites,
  useGetMyPatients,
} from "../../hooks/useCaregivers";
import {
  FamilyMember,
  CaregiverStackParamList,
  PendingTestAction,
  PendingReferralAction,
  UpcomingFollowup,
  CriticalLabReportAction,
} from "../../types";
import i18n from "../../i18n";

type Nav = StackNavigationProp<CaregiverStackParamList, "Dashboard">;

const MAX_PENDING_ITEMS = 5;

function getAdherenceColor(pct: number) {
  if (pct >= 80) return COLORS.success;
  if (pct >= 50) return COLORS.warning;
  return COLORS.error;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("hi-IN", {
    day: "numeric",
    month: "short",
  });
}

function MemberCard({ member }: { member: FamilyMember }) {
  const navigation = useNavigation<Nav>();
  // TODO: replace with real adherence from API when available
  const adherencePct = Math.floor(Math.random() * 40 + 60);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate("FamilyMember", { memberId: member.id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {member.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.memberName}>{member.name}</Text>
          <Text style={styles.memberRelation}>{member.relation}</Text>
        </View>
        <View style={[styles.adherenceBadge, { backgroundColor: getAdherenceColor(adherencePct) }]}>
          <Text style={styles.adherenceText}>{adherencePct}%</Text>
        </View>
      </View>
      {member.chronic_conditions.length > 0 && (
        <View style={styles.conditionsRow}>
          {member.chronic_conditions.slice(0, 3).map((c, i) => (
            <View key={i} style={styles.conditionChip}>
              <Text style={styles.conditionText}>{c}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

function PendingTestCard({ item }: { item: PendingTestAction }) {
  const navigation = useNavigation<Nav>();

  const subtitle = item.doctor_name
    ? i18n.t("dashboard.pendingTest", {
        doctor: item.doctor_name,
        date: formatDate(item.ordered_date),
      })
    : i18n.t("dashboard.pendingTestNoDoc", {
        date: formatDate(item.ordered_date),
      });

  return (
    <TouchableOpacity
      style={styles.actionCard}
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate("SessionDetail", {
          memberId: item.family_member_id,
          sessionId: item.health_session_id,
        })
      }
    >
      <View style={styles.actionIconWrap}>
        <Text style={styles.actionIcon}>{"\u{1F52C}"}</Text>
      </View>
      <View style={styles.actionContent}>
        <Text style={styles.actionName}>{item.test_name}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
        <Text style={styles.actionMember}>{item.family_member_name}</Text>
      </View>
      <View style={styles.orangeBadge}>
        <Text style={styles.orangeBadgeText}>{i18n.t("session.pending")}</Text>
      </View>
    </TouchableOpacity>
  );
}

function PendingReferralCard({ item }: { item: PendingReferralAction }) {
  const navigation = useNavigation<Nav>();

  const subtitle = item.doctor_name
    ? i18n.t("dashboard.pendingReferral", { doctor: item.doctor_name })
    : i18n.t("dashboard.pendingReferralNoDoc");

  return (
    <TouchableOpacity
      style={styles.actionCard}
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate("SessionDetail", {
          memberId: item.family_member_id,
          sessionId: item.health_session_id,
        })
      }
    >
      <View style={styles.actionIconWrap}>
        <Text style={styles.actionIcon}>{"\u{1F468}\u200D\u2695\uFE0F"}</Text>
      </View>
      <View style={styles.actionContent}>
        <Text style={styles.actionName}>
          {i18n.t("dashboard.seeSpecialist", { specialist: item.specialist })}
        </Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
        {item.reason && (
          <Text style={styles.actionDetail}>{item.reason}</Text>
        )}
        <Text style={styles.actionMember}>{item.family_member_name}</Text>
      </View>
      <View style={styles.orangeBadge}>
        <Text style={styles.orangeBadgeText}>{i18n.t("session.pending")}</Text>
      </View>
    </TouchableOpacity>
  );
}

function FollowupCard({ item }: { item: UpcomingFollowup }) {
  const navigation = useNavigation<Nav>();

  const title = item.doctor_name
    ? i18n.t("dashboard.followupWith", { doctor: item.doctor_name })
    : i18n.t("dashboard.followupGeneric");

  return (
    <TouchableOpacity
      style={styles.actionCard}
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate("SessionDetail", {
          memberId: item.family_member_id,
          sessionId: item.health_session_id,
        })
      }
    >
      <View style={styles.actionIconWrap}>
        <Text style={styles.actionIcon}>{"\u{1F4C5}"}</Text>
      </View>
      <View style={styles.actionContent}>
        <Text style={styles.actionName}>{title}</Text>
        <Text style={styles.actionSubtitle}>
          {formatDate(item.next_visit_date)} {"\u2022"}{" "}
          {i18n.t("dashboard.followupIn", { days: item.days_remaining })}
        </Text>
        <Text style={styles.actionMember}>{item.family_member_name}</Text>
      </View>
    </TouchableOpacity>
  );
}

function CriticalLabReportCard({ item }: { item: CriticalLabReportAction }) {
  const navigation = useNavigation<Nav>();

  return (
    <TouchableOpacity
      style={[styles.actionCard, styles.criticalCard]}
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate("LabReportResult", {
          memberId: item.family_member_id,
          sessionId: item.health_session_id,
          reportId: item.id,
        })
      }
    >
      <View style={styles.actionIconWrap}>
        <Text style={styles.actionIcon}>{"\u{1F6A8}"}</Text>
      </View>
      <View style={styles.actionContent}>
        <Text style={styles.actionName}>
          {i18n.t("labReport.criticalReportTitle", {
            lab: item.lab_name ?? i18n.t("labReport.title"),
          })}
        </Text>
        <Text style={styles.actionSubtitle}>
          {i18n.t("labReport.criticalReportSubtitle", {
            member: item.family_member_name,
            date: item.report_date ? formatDate(item.report_date) : "",
          })}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function InviteBanner() {
  const navigation = useNavigation<Nav>();
  const { data: invites } = useGetPendingInvites();
  const count = (invites ?? []).length;

  if (count === 0) return null;

  return (
    <TouchableOpacity
      style={styles.inviteBanner}
      activeOpacity={0.7}
      onPress={() => navigation.navigate("PendingInvites")}
    >
      <Text style={styles.inviteBannerText}>
        {i18n.t("caregivers.pendingInvitesBanner", { count })}
      </Text>
      <Text style={styles.inviteBannerTextHi}>
        {i18n.t("caregivers.pendingInvitesBannerHi", { count })}
      </Text>
    </TouchableOpacity>
  );
}

type PendingItem =
  | { type: "test"; data: PendingTestAction }
  | { type: "referral"; data: PendingReferralAction }
  | { type: "followup"; data: UpcomingFollowup }
  | { type: "criticalLab"; data: CriticalLabReportAction };

function PendingActionsSection() {
  const { data, isLoading } = useGetPendingActions();

  if (isLoading) {
    return (
      <View style={styles.pendingLoading}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  if (!data) return null;

  const items: PendingItem[] = [
    ...(data.critical_lab_reports ?? []).map(
      (c) => ({ type: "criticalLab" as const, data: c })
    ),
    ...(data.pending_tests ?? []).map(
      (t) => ({ type: "test" as const, data: t })
    ),
    ...(data.pending_referrals ?? []).map(
      (r) => ({ type: "referral" as const, data: r })
    ),
    ...(data.upcoming_followups ?? []).map(
      (f) => ({ type: "followup" as const, data: f })
    ),
  ];

  const totalCount = items.length;
  const displayItems = items.slice(0, MAX_PENDING_ITEMS);

  return (
    <View style={styles.pendingSection}>
      <Text style={styles.pendingSectionTitle}>
        {i18n.t("dashboard.pendingActions")}
      </Text>

      {totalCount === 0 ? (
        <View style={styles.allClearContainer}>
          <Text style={styles.allClearIcon}>{"\u2705"}</Text>
          <Text style={styles.allClearText}>
            {i18n.t("dashboard.allClearHi")}
          </Text>
          <Text style={styles.allClearSubtext}>
            {i18n.t("dashboard.allClear")}
          </Text>
        </View>
      ) : (
        <>
          {displayItems.map((item, index) => {
            const key = `${item.type}-${item.data.id}`;
            switch (item.type) {
              case "criticalLab":
                return <CriticalLabReportCard key={key} item={item.data} />;
              case "test":
                return <PendingTestCard key={key} item={item.data} />;
              case "referral":
                return <PendingReferralCard key={key} item={item.data} />;
              case "followup":
                return <FollowupCard key={key} item={item.data} />;
            }
          })}
          {totalCount > MAX_PENDING_ITEMS && (
            <Text style={styles.seeAllText}>
              {i18n.t("dashboard.seeAll", { count: totalCount })}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

export default function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { data: members, isLoading, isError, refetch } = useGetFamilyMembers();
  const { data: myPatients } = useGetMyPatients();

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
          <Text style={styles.retryText}>{i18n.t("common.retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!members || members.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTextColumn}>
            <Text style={styles.title}>{i18n.t("dashboard.title")}</Text>
            <Text style={styles.memberCount}>
              0 {i18n.t("dashboard.members")}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate("Settings")}
            accessibilityLabel={i18n.t("settings.title")}
          >
            <Text style={styles.settingsIcon}>⚙</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>{i18n.t("dashboard.noMembers")}</Text>
          <Text style={styles.emptyHint}>{i18n.t("dashboard.noMembersHint")}</Text>
          <TouchableOpacity
            style={styles.addButtonInline}
            onPress={() => navigation.navigate("AddFamilyMember")}
          >
            <Text style={styles.addButtonInlineText}>{i18n.t("dashboard.addMember")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const patientSections = (myPatients ?? []).map((patient) => ({
    key: `patient-${patient.id}`,
    title: i18n.t("caregivers.patientFamily", { name: patient.patient_name }),
    data: patient.family_members,
  }));

  const sections = [
    { key: "members", title: "", data: members },
    ...patientSections,
  ];

  const totalMembers =
    members.length +
    patientSections.reduce((sum, s) => sum + s.data.length, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTextColumn}>
          <Text style={styles.title}>{i18n.t("dashboard.title")}</Text>
          <Text style={styles.memberCount}>
            {totalMembers} {i18n.t("dashboard.members")}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate("Settings")}
          accessibilityLabel={i18n.t("settings.title")}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={({ item }) => <MemberCard member={item} />}
        renderSectionHeader={({ section }) =>
          section.title ? (
            <Text style={styles.patientFamilyLabel}>{section.title}</Text>
          ) : null
        }
        contentContainerStyle={styles.list}
        ListHeaderComponent={<InviteBanner />}
        ListFooterComponent={<PendingActionsSection />}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLORS.primary} />
        }
      />

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => navigation.navigate("AddFamilyMember")}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
    backgroundColor: COLORS.background,
    paddingHorizontal: 32,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTextColumn: {
    flex: 1,
  },
  settingsButton: {
    padding: 8,
    marginLeft: 12,
  },
  settingsIcon: {
    fontSize: 24,
    color: COLORS.white,
  },
  title: {
    fontSize: FONT_SIZES.title,
    fontWeight: "bold",
    color: COLORS.white,
  },
  memberCount: {
    fontSize: FONT_SIZES.small,
    color: COLORS.white,
    opacity: 0.8,
    marginTop: 4,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: FONT_SIZES.large,
    fontWeight: "bold",
    color: COLORS.white,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: FONT_SIZES.large,
    fontWeight: "600",
    color: COLORS.text,
  },
  memberRelation: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  adherenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  adherenceText: {
    fontSize: FONT_SIZES.small,
    fontWeight: "bold",
    color: COLORS.white,
  },
  conditionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
    gap: 6,
  },
  conditionChip: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  conditionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  loadingText: {
    marginTop: 12,
    fontSize: FONT_SIZES.medium,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: FONT_SIZES.large,
    color: COLORS.error,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.medium,
    fontWeight: "600",
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  addButtonInline: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  addButtonInlineText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.medium,
    fontWeight: "bold",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 28,
    color: COLORS.white,
    lineHeight: 30,
  },

  // Pending actions
  pendingSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  pendingSectionTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 12,
  },
  pendingLoading: {
    paddingVertical: 20,
    alignItems: "center",
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  criticalCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionContent: {
    flex: 1,
  },
  actionName: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "600",
    color: COLORS.text,
  },
  actionSubtitle: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  actionDetail: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    fontStyle: "italic",
    marginTop: 1,
  },
  actionMember: {
    fontSize: 12,
    color: COLORS.primaryLight,
    marginTop: 2,
  },
  orangeBadge: {
    backgroundColor: "#FFF3E0",
    borderWidth: 1,
    borderColor: "#FFB74D",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  orangeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#E65100",
  },
  seeAllText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.primary,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 12,
  },
  allClearContainer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  allClearIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  allClearText: {
    fontSize: FONT_SIZES.large,
    fontWeight: "600",
    color: COLORS.success,
  },
  allClearSubtext: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  inviteBanner: {
    backgroundColor: "#FFF8E1",
    borderWidth: 1,
    borderColor: "#FFB74D",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  inviteBannerText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "600",
    color: "#E65100",
  },
  inviteBannerTextHi: {
    fontSize: FONT_SIZES.small,
    color: "#F57F17",
    marginTop: 2,
  },
  patientFamilyLabel: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "bold",
    color: COLORS.primaryDark,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
});
