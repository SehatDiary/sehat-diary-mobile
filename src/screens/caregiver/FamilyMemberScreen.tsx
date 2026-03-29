import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { COLORS, FONT_SIZES } from "../../constants";
import {
  useGetFamilyMember,
  useGetHealthSessions,
  useCreateHealthSession,
} from "../../hooks/useFamilyMembers";
import { CaregiverStackParamList, HealthSession } from "../../types";
import i18n from "../../i18n";

type Nav = StackNavigationProp<CaregiverStackParamList, "FamilyMember">;
type Route = RouteProp<CaregiverStackParamList, "FamilyMember">;

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("hi-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function SessionCard({
  session,
  memberId,
}: {
  session: HealthSession;
  memberId: number;
}) {
  const navigation = useNavigation<Nav>();
  const isActive = session.status === "active";

  return (
    <TouchableOpacity
      style={styles.sessionCard}
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate("SessionDetail", {
          memberId,
          sessionId: session.id,
        })
      }
    >
      <View style={styles.sessionHeader}>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: isActive ? COLORS.success : COLORS.textSecondary },
          ]}
        />
        <Text style={styles.sessionStatus}>
          {isActive
            ? i18n.t("familyMember.active")
            : i18n.t("familyMember.completed")}
        </Text>
        <Text style={styles.sessionDate}>
          {i18n.t("familyMember.startedOn")} {formatDate(session.started_at)}
        </Text>
      </View>
      <Text style={styles.prescriptionCount}>
        {session.prescriptions_count} {i18n.t("familyMember.prescriptions")}
      </Text>
    </TouchableOpacity>
  );
}

export default function FamilyMemberScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { memberId } = route.params;

  const { data, isLoading: memberLoading } = useGetFamilyMember(memberId);
  const { data: sessions, isLoading: sessionsLoading } =
    useGetHealthSessions(memberId);
  const createSession = useCreateHealthSession();

  const member = data?.family_member;
  const isLoading = memberLoading || sessionsLoading;

  const handleNewVisit = () => {
    createSession.mutate(
      { memberId, startedAt: new Date().toISOString() },
      {
        onSuccess: (session) => {
          navigation.navigate("SessionDetail", {
            memberId,
            sessionId: session.id,
          });
        },
        onError: () => {
          Alert.alert(i18n.t("common.error"));
        },
      }
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!member) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{i18n.t("common.error")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>{"←"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{member.name}</Text>
      </View>

      {/* Profile Section */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {member.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {i18n.t("familyMember.relation")}
            </Text>
            <Text style={styles.detailValue}>{member.relation}</Text>
          </View>
          {member.age && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                {i18n.t("familyMember.age")}
              </Text>
              <Text style={styles.detailValue}>{member.age}</Text>
            </View>
          )}
          {member.gender && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                {i18n.t("familyMember.gender")}
              </Text>
              <Text style={styles.detailValue}>{member.gender}</Text>
            </View>
          )}
        </View>
      </View>

      {member.chronic_conditions.length > 0 && (
        <View style={styles.conditionsSection}>
          <Text style={styles.sectionLabel}>
            {i18n.t("familyMember.chronicConditions")}
          </Text>
          <View style={styles.conditionsRow}>
            {member.chronic_conditions.map((c, i) => (
              <View key={i} style={styles.conditionChip}>
                <Text style={styles.conditionText}>{c}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Sessions Section */}
      <View style={styles.sessionsHeader}>
        <Text style={styles.sectionTitle}>
          {i18n.t("familyMember.healthSessions")}
        </Text>
        <TouchableOpacity
          style={styles.newVisitButton}
          onPress={handleNewVisit}
          disabled={createSession.isPending}
        >
          <Text style={styles.newVisitText}>
            + {i18n.t("familyMember.newVisit")}
          </Text>
        </TouchableOpacity>
      </View>

      {!sessions || sessions.length === 0 ? (
        <View style={styles.emptySection}>
          <Text style={styles.emptyText}>
            {i18n.t("familyMember.noSessions")}
          </Text>
          <Text style={styles.emptyHint}>
            {i18n.t("familyMember.noSessionsHint")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <SessionCard session={item} memberId={memberId} />
          )}
          contentContainerStyle={styles.sessionsList}
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
  headerTitle: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: "bold",
    color: COLORS.white,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    margin: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: "bold",
    color: COLORS.white,
  },
  profileDetails: {
    flex: 1,
    marginLeft: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: FONT_SIZES.small,
    fontWeight: "600",
    color: COLORS.text,
  },
  conditionsSection: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  conditionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  conditionChip: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  conditionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  sessionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: "bold",
    color: COLORS.text,
  },
  newVisitButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newVisitText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.small,
    fontWeight: "600",
  },
  sessionsList: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sessionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  sessionStatus: {
    fontSize: FONT_SIZES.small,
    fontWeight: "600",
    color: COLORS.text,
    marginRight: 12,
  },
  sessionDate: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
  },
  prescriptionCount: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  emptySection: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
    fontWeight: "600",
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  errorText: {
    fontSize: FONT_SIZES.large,
    color: COLORS.error,
  },
});
