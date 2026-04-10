import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { COLORS, FONT_SIZES } from "../../constants";
import { useGetHealthSession } from "../../hooks/useFamilyMembers";
import { useGetLabReports } from "../../hooks/useLabReports";
import {
  useMarkTestCompleted,
  useMarkReferralVisited,
} from "../../hooks/usePrescriptions";
import {
  CaregiverStackParamList,
  Prescription,
  Medicine,
  DoctorVisit,
  PrescribedTest,
  Referral,
  VisitInstruction,
  LabReport,
} from "../../types";
import i18n from "../../i18n";

type Nav = StackNavigationProp<CaregiverStackParamList, "SessionDetail">;
type Route = RouteProp<CaregiverStackParamList, "SessionDetail">;

const STATUS_COLORS: Record<string, string> = {
  pending: COLORS.warning,
  extracted: COLORS.primaryLight,
  confirmed: COLORS.success,
  failed: COLORS.error,
};

const INSTRUCTION_ICONS: Record<VisitInstruction["category"], string> = {
  exercise: "\u{1F3C3}",
  diet: "\u{1F957}",
  device: "\u{1F527}",
  general: "\u{1F4CB}",
};

function statusLabel(status: string) {
  const key = `session.${status}` as const;
  return i18n.t(key);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("hi-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function MedicineItem({ medicine }: { medicine: Medicine }) {
  return (
    <View style={styles.medicineCard}>
      <Text style={styles.medicineName}>{medicine.name}</Text>
      {medicine.dosage && (
        <View style={styles.medicineRow}>
          <Text style={styles.medicineLabel}>{i18n.t("session.dosage")}</Text>
          <Text style={styles.medicineValue}>{medicine.dosage}</Text>
        </View>
      )}
      {medicine.frequency && (
        <View style={styles.medicineRow}>
          <Text style={styles.medicineLabel}>{i18n.t("session.frequency")}</Text>
          <Text style={styles.medicineValue}>{medicine.frequency}</Text>
        </View>
      )}
      {medicine.duration_days && (
        <View style={styles.medicineRow}>
          <Text style={styles.medicineLabel}>{i18n.t("session.duration")}</Text>
          <Text style={styles.medicineValue}>
            {medicine.duration_days} {i18n.t("session.days")}
          </Text>
        </View>
      )}
      {medicine.instructions_hi && (
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsLabel}>
            {i18n.t("session.instructions")}
          </Text>
          <Text style={styles.instructionsText}>{medicine.instructions_hi}</Text>
        </View>
      )}
    </View>
  );
}

function PrescriptionSection({ prescription }: { prescription: Prescription }) {
  const statusColor = STATUS_COLORS[prescription.status] ?? COLORS.textSecondary;

  return (
    <View style={styles.prescriptionSection}>
      <View style={styles.prescriptionHeader}>
        <Text style={styles.prescriptionTitle}>
          {i18n.t("session.prescriptions")} #{prescription.id}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{statusLabel(prescription.status)}</Text>
        </View>
      </View>
      <Text style={styles.prescriptionDate}>{formatDate(prescription.created_at)}</Text>

      {prescription.medicines.length > 0 && (
        <View style={styles.medicinesList}>
          <Text style={styles.medicinesTitle}>{i18n.t("session.medicines")}</Text>
          {prescription.medicines.map((med) => (
            <MedicineItem key={med.id} medicine={med} />
          ))}
        </View>
      )}
    </View>
  );
}

function DoctorVisitCard({ visit }: { visit: DoctorVisit }) {
  return (
    <View style={styles.doctorVisitCard}>
      <Text style={styles.sectionHeading}>{i18n.t("session.doctorVisit")}</Text>
      {visit.doctor_name && (
        <View style={styles.visitRow}>
          <Text style={styles.visitLabel}>{i18n.t("session.doctor")}</Text>
          <Text style={styles.visitValue}>{visit.doctor_name}</Text>
        </View>
      )}
      {visit.hospital_name && (
        <View style={styles.visitRow}>
          <Text style={styles.visitLabel}>{i18n.t("session.hospital")}</Text>
          <Text style={styles.visitValue}>{visit.hospital_name}</Text>
        </View>
      )}
      <View style={styles.visitRow}>
        <Text style={styles.visitLabel}>{i18n.t("session.visitDate")}</Text>
        <Text style={styles.visitValue}>{formatDate(visit.visit_date)}</Text>
      </View>
      {visit.diagnosis && (
        <View style={styles.visitRow}>
          <Text style={styles.visitLabel}>{i18n.t("session.diagnosis")}</Text>
          <Text style={styles.visitValue}>{visit.diagnosis}</Text>
        </View>
      )}
    </View>
  );
}

function PendingActionsSection({
  tests,
  referrals,
  memberId,
  sessionId,
}: {
  tests: PrescribedTest[];
  referrals: Referral[];
  memberId: number;
  sessionId: number;
}) {
  const navigation = useNavigation<Nav>();
  const markTest = useMarkTestCompleted();
  const markReferral = useMarkReferralVisited();

  const pendingTests = tests.filter((t) => t.status === "pending");
  const pendingReferrals = referrals.filter((r) => r.status === "pending");

  if (pendingTests.length === 0 && pendingReferrals.length === 0) return null;

  const handleMarkTest = (testId: number) => {
    markTest.mutate(
      { familyMemberId: memberId, healthSessionId: sessionId, testId },
      { onError: () => Alert.alert(i18n.t("common.error")) }
    );
  };

  const handleMarkReferral = (referralId: number) => {
    markReferral.mutate(
      { familyMemberId: memberId, healthSessionId: sessionId, referralId },
      { onError: () => Alert.alert(i18n.t("common.error")) }
    );
  };

  return (
    <View style={styles.actionsSection}>
      <Text style={styles.sectionHeading}>{i18n.t("session.pendingActions")}</Text>

      {pendingTests.length > 0 && (
        <>
          <Text style={styles.subHeading}>{i18n.t("session.testsOrdered")}</Text>
          {pendingTests.map((test) => (
            <View key={test.id} style={styles.actionItem}>
              <View style={styles.actionInfo}>
                <View style={[styles.statusDot, { backgroundColor: COLORS.warning }]} />
                <Text style={styles.actionName}>{test.name}</Text>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.uploadLabButton}
                  onPress={() =>
                    navigation.navigate("UploadLabReport", {
                      memberId,
                      sessionId,
                      prescribedTestId: test.id,
                    })
                  }
                >
                  <Text style={styles.uploadLabButtonText}>
                    {"\u{1F9EA}"} {i18n.t("labReport.uploadLabReport")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleMarkTest(test.id)}
                  disabled={markTest.isPending}
                >
                  <Text style={styles.actionButtonText}>
                    {i18n.t("session.markDone")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}

      {pendingReferrals.length > 0 && (
        <>
          <Text style={styles.subHeading}>{i18n.t("session.referrals")}</Text>
          {pendingReferrals.map((ref) => (
            <View key={ref.id} style={styles.actionItem}>
              <View style={styles.actionInfo}>
                <View style={[styles.statusDot, { backgroundColor: COLORS.warning }]} />
                <View style={styles.actionTextGroup}>
                  <Text style={styles.actionName}>{ref.specialist}</Text>
                  {ref.reason && (
                    <Text style={styles.actionDetail}>{ref.reason}</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleMarkReferral(ref.id)}
                disabled={markReferral.isPending}
              >
                <Text style={styles.actionButtonText}>
                  {i18n.t("session.markVisited")}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      {/* Show completed tests */}
      {tests.filter((t) => t.status === "completed").map((test) => (
        <View key={test.id} style={[styles.actionItem, { opacity: 0.6 }]}>
          <View style={styles.actionInfo}>
            <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
            <Text style={styles.actionName}>{test.name}</Text>
          </View>
          <Text style={styles.completedLabel}>{i18n.t("session.completed")}</Text>
        </View>
      ))}

      {/* Show visited referrals */}
      {referrals.filter((r) => r.status === "visited").map((ref) => (
        <View key={ref.id} style={[styles.actionItem, { opacity: 0.6 }]}>
          <View style={styles.actionInfo}>
            <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
            <Text style={styles.actionName}>{ref.specialist}</Text>
          </View>
          <Text style={styles.completedLabel}>{i18n.t("session.visited")}</Text>
        </View>
      ))}
    </View>
  );
}

function DoctorAdviceSection({
  instructions,
}: {
  instructions: VisitInstruction[];
}) {
  if (instructions.length === 0) return null;

  return (
    <View style={styles.adviceSection}>
      <Text style={styles.sectionHeading}>{i18n.t("session.doctorAdvice")}</Text>
      {instructions.map((inst) => (
        <View key={inst.id} style={styles.adviceItem}>
          <Text style={styles.adviceIcon}>
            {INSTRUCTION_ICONS[inst.category]}
          </Text>
          <View style={styles.adviceContent}>
            <Text style={styles.adviceText}>{inst.text_hi}</Text>
            {inst.text_en && (
              <Text style={styles.adviceTextEn}>{inst.text_en}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

function PulsingBadge({ label }: { label: string }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.statusBadge, { backgroundColor: COLORS.warning, opacity }]}
    >
      <Text style={styles.statusText}>{label}</Text>
    </Animated.View>
  );
}

const LAB_REPORT_STATUS_COLORS: Record<LabReport["status"], string> = {
  uploading: COLORS.warning,
  analyzing: COLORS.warning,
  completed: COLORS.success,
  failed: COLORS.error,
};

function LabReportCard({
  report,
  memberId,
  sessionId,
}: {
  report: LabReport;
  memberId: number;
  sessionId: number;
}) {
  const navigation = useNavigation<Nav>();
  const isAnalyzing =
    report.status === "analyzing" || report.status === "uploading";

  const statusLabel =
    isAnalyzing
      ? i18n.t("labReport.analyzingStatus")
      : report.status === "completed"
        ? i18n.t("labReport.readyStatus")
        : i18n.t("labReport.failedStatus");

  return (
    <TouchableOpacity
      style={styles.labReportCard}
      activeOpacity={0.7}
      disabled={report.status !== "completed"}
      onPress={() =>
        navigation.navigate("LabReportResult", {
          memberId,
          sessionId,
          reportId: report.id,
        })
      }
    >
      <View style={styles.labReportRow}>
        <Text style={styles.labReportIcon}>{"\u{1F52C}"}</Text>
        <View style={styles.labReportInfo}>
          <Text style={styles.labReportName}>
            {report.lab_name ?? i18n.t("labReport.title")}
          </Text>
          {report.report_date && (
            <Text style={styles.labReportDate}>
              {formatDate(report.report_date)}
            </Text>
          )}
          <Text style={styles.labReportType}>
            {report.report_type ?? i18n.t("labReport.reportType")}
          </Text>
        </View>
        {isAnalyzing ? (
          <PulsingBadge label={statusLabel} />
        ) : (
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: LAB_REPORT_STATUS_COLORS[report.status] },
            ]}
          >
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        )}
      </View>
      {report.has_critical_findings && report.status === "completed" && (
        <View style={styles.criticalRow}>
          <View style={styles.criticalDot} />
          <Text style={styles.criticalText}>
            {i18n.t("labReport.criticalFindings")}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function LabReportsSection({
  memberId,
  sessionId,
  isActive,
}: {
  memberId: number;
  sessionId: number;
  isActive: boolean;
}) {
  const navigation = useNavigation<Nav>();
  const { data: labReports } = useGetLabReports(memberId, sessionId);

  const hasAnalyzing = labReports?.some(
    (r) => r.status === "analyzing" || r.status === "uploading"
  );

  // Auto-refresh when reports are analyzing — the hook uses refetchInterval
  // We re-fetch via a separate hook call with a 5s interval when needed
  useGetLabReports(
    memberId,
    sessionId,
    hasAnalyzing ? 5000 : undefined
  );

  if (!labReports || labReports.length === 0) {
    if (!isActive) return null;
    return (
      <View style={styles.labReportsSection}>
        <Text style={styles.sectionHeading}>
          {i18n.t("labReport.labReports")}
        </Text>
        <TouchableOpacity
          style={styles.addLabReportButton}
          onPress={() =>
            navigation.navigate("UploadLabReport", { memberId, sessionId })
          }
        >
          <Text style={styles.addLabReportText}>
            {"\u{1F52C}"} {i18n.t("labReport.addLabReport")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.labReportsSection}>
      <Text style={styles.sectionHeading}>
        {i18n.t("labReport.labReports")}
      </Text>
      {labReports.map((report) => (
        <LabReportCard
          key={report.id}
          report={report}
          memberId={memberId}
          sessionId={sessionId}
        />
      ))}
      {isActive && (
        <TouchableOpacity
          style={styles.addLabReportButton}
          onPress={() =>
            navigation.navigate("UploadLabReport", { memberId, sessionId })
          }
        >
          <Text style={styles.addLabReportText}>
            {"\u{1F52C}"} {i18n.t("labReport.addLabReport")}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function SessionDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { memberId, sessionId } = route.params;

  const { data, isLoading } = useGetHealthSession(memberId, sessionId);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const session = data?.health_session;
  const prescriptions = data?.prescriptions ?? [];
  const doctorVisits = data?.doctor_visits ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{"←"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t("session.title")}</Text>
      </View>

      {session && (
        <View style={styles.sessionInfo}>
          <View style={styles.sessionInfoRow}>
            <Text style={styles.sessionInfoLabel}>{i18n.t("session.status")}</Text>
            <Text
              style={[
                styles.sessionInfoValue,
                {
                  color:
                    session.status === "active"
                      ? COLORS.success
                      : COLORS.textSecondary,
                },
              ]}
            >
              {session.status === "active"
                ? i18n.t("familyMember.active")
                : i18n.t("familyMember.completed")}
            </Text>
          </View>
          <View style={styles.sessionInfoRow}>
            <Text style={styles.sessionInfoLabel}>
              {i18n.t("familyMember.startedOn")}
            </Text>
            <Text style={styles.sessionInfoValue}>
              {formatDate(session.started_at)}
            </Text>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {doctorVisits.map((visit) => (
          <React.Fragment key={visit.id}>
            <DoctorVisitCard visit={visit} />
            <PendingActionsSection
              tests={visit.tests}
              referrals={visit.referrals}
              memberId={memberId}
              sessionId={sessionId}
            />
            <DoctorAdviceSection instructions={visit.instructions} />
          </React.Fragment>
        ))}

        {prescriptions.length === 0 && doctorVisits.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptyText}>
              {i18n.t("session.noPrescriptions")}
            </Text>
          </View>
        ) : (
          prescriptions.map((p) => (
            <PrescriptionSection key={p.id} prescription={p} />
          ))
        )}

        <LabReportsSection
          memberId={memberId}
          sessionId={sessionId}
          isActive={session?.status === "active"}
        />
      </ScrollView>

      {session?.status === "active" && (
        <TouchableOpacity
          style={styles.uploadFab}
          activeOpacity={0.8}
          onPress={() =>
            navigation.navigate("UploadPrescription", { memberId, sessionId })
          }
        >
          <Text style={styles.uploadFabText}>{"\u{1F4CB}"} +</Text>
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
  sessionInfo: {
    backgroundColor: COLORS.white,
    margin: 16,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sessionInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sessionInfoLabel: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
  },
  sessionInfoValue: {
    fontSize: FONT_SIZES.small,
    fontWeight: "600",
    color: COLORS.text,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  // Doctor visit card
  doctorVisitCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sectionHeading: {
    fontSize: FONT_SIZES.large,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 10,
  },
  visitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  visitLabel: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
  },
  visitValue: {
    fontSize: FONT_SIZES.small,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
    textAlign: "right",
  },

  // Pending actions
  actionsSection: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  subHeading: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 8,
  },
  actionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  actionInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  actionTextGroup: {
    flex: 1,
  },
  actionName: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "600",
    color: COLORS.text,
  },
  actionDetail: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 6,
    marginLeft: 10,
  },
  uploadLabButton: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  uploadLabButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.small,
    fontWeight: "600",
  },
  completedLabel: {
    fontSize: FONT_SIZES.small,
    color: COLORS.success,
    fontWeight: "600",
  },

  // Doctor advice
  adviceSection: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  adviceItem: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  adviceIcon: {
    fontSize: 20,
    marginRight: 10,
    marginTop: 2,
  },
  adviceContent: {
    flex: 1,
  },
  adviceText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
    lineHeight: 22,
  },
  adviceTextEn: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Prescriptions
  prescriptionSection: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  prescriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  prescriptionTitle: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "bold",
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.white,
  },
  prescriptionDate: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  medicinesList: {
    marginTop: 12,
  },
  medicinesTitle: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  medicineCard: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  medicineName: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "bold",
    color: COLORS.primaryDark,
    marginBottom: 6,
  },
  medicineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  medicineLabel: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
  },
  medicineValue: {
    fontSize: FONT_SIZES.small,
    color: COLORS.text,
  },
  instructionsBox: {
    marginTop: 8,
    backgroundColor: COLORS.white,
    borderRadius: 6,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  instructionsLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
    lineHeight: 24,
  },
  // Lab reports section
  labReportsSection: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  labReportCard: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  labReportRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  labReportIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  labReportInfo: {
    flex: 1,
  },
  labReportName: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "bold",
    color: COLORS.primaryDark,
  },
  labReportDate: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  labReportType: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  criticalRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  criticalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
    marginRight: 6,
  },
  criticalText: {
    fontSize: FONT_SIZES.small,
    color: COLORS.error,
    fontWeight: "600",
  },
  addLabReportButton: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  addLabReportText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.medium,
    fontWeight: "600",
  },

  emptySection: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.textSecondary,
  },
  uploadFab: {
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
  uploadFabText: {
    fontSize: 20,
    color: COLORS.white,
  },
});
