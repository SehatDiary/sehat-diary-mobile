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
import { useQueries, useQuery } from "@tanstack/react-query";
import { COLORS } from "../../constants";
import { PatientStackParamList, DoctorVisit } from "../../types";
import { getFamilyMembers, getHealthSessions, getHealthSession } from "../../api/familyMembers";
import { hindiFirst, ownRecord } from "./patientText";
import i18n from "../../i18n";
import { dateLocale } from "../../i18n/locale";

type Nav = StackNavigationProp<PatientStackParamList, "VisitHistory">;

// A senior reads a short list; loading detail for more than this many sessions
// costs requests without helping.
const MAX_SESSIONS = 10;

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString(dateLocale(), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function VisitRow({
  visit,
  memberId,
  sessionId,
}: {
  visit: DoctorVisit;
  memberId: number;
  sessionId: number;
}) {
  const navigation = useNavigation<Nav>();
  const diagnosis = hindiFirst(visit.summary_hi, visit.diagnosis);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      accessibilityRole="button"
      onPress={() =>
        navigation.navigate("VisitDetail", {
          memberId,
          sessionId,
          doctorVisitId: visit.id,
        })
      }
    >
      <Text style={styles.date}>{formatDate(visit.visit_date)}</Text>
      {visit.doctor_name && (
        <Text style={styles.doctor}>{visit.doctor_name}</Text>
      )}
      {diagnosis && (
        <Text style={styles.diagnosis} numberOfLines={2}>
          {diagnosis}
        </Text>
      )}
      <Text style={styles.openHint}>{i18n.t("visitHistory.open")}</Text>
    </TouchableOpacity>
  );
}

export default function VisitHistoryScreen() {
  const navigation = useNavigation<Nav>();

  const { data: members } = useQuery({
    queryKey: ["familyMembers"],
    queryFn: getFamilyMembers,
  });
  const member = ownRecord(members ?? []);

  const {
    data: sessions,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["healthSessions", member?.id],
    queryFn: () => getHealthSessions(member!.id),
    enabled: member !== undefined,
  });

  const recentSessions = (sessions ?? []).slice(0, MAX_SESSIONS);

  // Session summaries carry no doctor or diagnosis, so pull each visit graph.
  // React Query dedupes and caches these, and the list is short by design.
  const details = useQueries({
    queries: recentSessions.map((session) => ({
      queryKey: ["healthSession", member?.id, session.id],
      queryFn: () => getHealthSession(member!.id, session.id),
      enabled: member !== undefined,
    })),
  });

  const visits = details.flatMap((detail, index) =>
    (detail.data?.doctor_visits ?? []).map((visit) => ({
      visit,
      sessionId: recentSessions[index].id,
    }))
  );

  const isBusy = isLoading || details.some((d) => d.isLoading);

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
        <Text style={styles.title}>{i18n.t("visitHistory.title")}</Text>
      </View>

      {isBusy && visits.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : visits.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🩺</Text>
          <Text style={styles.emptyText}>{i18n.t("visitHistory.empty")}</Text>
        </View>
      ) : (
        <FlatList
          data={visits}
          keyExtractor={(item) => String(item.visit.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <VisitRow
              visit={item.visit}
              memberId={member!.id}
              sessionId={item.sessionId}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={COLORS.primary}
            />
          }
        />
      )}
    </View>
  );
}

// Type sizes on the patient surface stay at or above 18px — the reader is 65+.
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
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyText: {
    fontSize: 20,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 30,
  },
  list: { padding: 16 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 14,
  },
  date: { fontSize: 20, fontWeight: "700", color: COLORS.text },
  doctor: { fontSize: 19, color: COLORS.primary, marginTop: 6 },
  diagnosis: {
    fontSize: 18,
    color: COLORS.text,
    marginTop: 10,
    lineHeight: 28,
  },
  openHint: { fontSize: 18, color: COLORS.primary, marginTop: 14 },
});
