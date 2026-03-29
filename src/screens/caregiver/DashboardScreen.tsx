import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { COLORS, FONT_SIZES } from "../../constants";
import { useGetFamilyMembers } from "../../hooks/useFamilyMembers";
import { FamilyMember, CaregiverStackParamList } from "../../types";
import i18n from "../../i18n";

type Nav = StackNavigationProp<CaregiverStackParamList, "Dashboard">;

function getAdherenceColor(pct: number) {
  if (pct >= 80) return COLORS.success;
  if (pct >= 50) return COLORS.warning;
  return COLORS.error;
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

export default function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { data: members, isLoading, isError, refetch } = useGetFamilyMembers();

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{i18n.t("dashboard.title")}</Text>
        <Text style={styles.memberCount}>
          {members?.length ?? 0} {i18n.t("dashboard.members")}
        </Text>
      </View>

      {!members || members.length === 0 ? (
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
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <MemberCard member={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLORS.primary} />
          }
        />
      )}

      {members && members.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("AddFamilyMember")}
        >
          <Text style={styles.fabText}>+</Text>
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
    backgroundColor: COLORS.background,
    paddingHorizontal: 32,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
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
});
