import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { COLORS, FONT_SIZES } from "../../constants";
import { CaregiverStackParamList } from "../../types";
import { useGetLabReport } from "../../hooks/useLabReports";
import i18n from "../../i18n";

type Nav = StackNavigationProp<CaregiverStackParamList, "LabReportResult">;
type Route = RouteProp<CaregiverStackParamList, "LabReportResult">;

export default function LabReportResultScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { memberId, sessionId, reportId } = route.params;

  const { data: report, isLoading } = useGetLabReport(
    memberId,
    sessionId,
    reportId
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
        <Text style={styles.headerTitle}>{i18n.t("labReport.title")}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.successCard}>
          <Text style={styles.successIcon}>{"\u2705"}</Text>
          <Text style={styles.successText}>
            {report?.status === "completed"
              ? i18n.t("labReport.analyzeReport")
              : report?.status}
          </Text>
        </View>
      </ScrollView>
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
  content: {
    padding: 20,
  },
  successCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  successText: {
    fontSize: FONT_SIZES.large,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
  },
});
