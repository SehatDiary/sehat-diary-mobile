import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { COLORS, FONT_SIZES } from "../../constants";
import { CaregiverStackParamList, LabReportFinding } from "../../types";
import { useGetLabReport } from "../../hooks/useLabReports";
import i18n from "../../i18n";

type Nav = StackNavigationProp<CaregiverStackParamList, "LabReportResult">;
type Route = RouteProp<CaregiverStackParamList, "LabReportResult">;

const STATUS_PILL_COLORS: Record<string, string> = {
  normal: COLORS.success,
  borderline: COLORS.warning,
  high: "#E67E22",
  low: "#E67E22",
  critical: COLORS.error,
};

const STATUS_ICONS: Record<string, string> = {
  normal: "\u2705",
  borderline: "\u{1F7E1}",
  high: "\u{1F534}",
  low: "\u{1F534}",
  critical: "\u{1F6A8}",
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("hi-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function LabReportResultScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { memberId, sessionId, reportId } = route.params;

  const { data: report, isLoading } = useGetLabReport(
    memberId,
    sessionId,
    reportId
  );

  const [summaryLang, setSummaryLang] = useState<"hi" | "en">("hi");
  const [showNormal, setShowNormal] = useState(false);
  const [expandedFindingId, setExpandedFindingId] = useState<number | null>(
    null
  );

  const groupedFindings = useMemo(() => {
    if (!report?.findings) return {};
    const groups: Record<string, LabReportFinding[]> = {};
    for (const f of report.findings) {
      const section = f.section || "Other";
      if (!groups[section]) groups[section] = [];
      groups[section].push(f);
    }
    return groups;
  }, [report?.findings]);

  const abnormalFindings = useMemo(() => {
    if (!report?.findings) return [];
    return report.findings.filter((f) => f.status !== "normal");
  }, [report?.findings]);

  const normalFindings = useMemo(() => {
    if (!report?.findings) return [];
    return report.findings.filter((f) => f.status === "normal");
  }, [report?.findings]);

  const criticalFindings = useMemo(() => {
    if (!report?.findings) return [];
    return report.findings.filter((f) => f.is_critical);
  }, [report?.findings]);

  const handleShare = useCallback(async () => {
    if (!report) return;

    let shareText = `${i18n.t("labReport.title")}\n`;
    if (report.lab_name) shareText += `${report.lab_name}\n`;
    if (report.report_date) shareText += `${formatDate(report.report_date)}\n`;
    shareText += "\n";

    if (report.english_summary) {
      shareText += `${report.english_summary}\n\n`;
    }

    if (abnormalFindings.length > 0) {
      shareText += "Abnormal Results:\n";
      for (const f of abnormalFindings) {
        shareText += `- ${f.parameter_name}: ${f.value} ${f.unit || ""} (${f.normal_range_text || ""})\n`;
      }
      shareText += "\n";
    }

    if (report.next_steps) {
      shareText += `Next Steps:\n${report.next_steps}\n`;
    }

    try {
      await Share.share({ message: shareText });
    } catch {
      Alert.alert(i18n.t("common.error"));
    }
  }, [report, abnormalFindings]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!report) {
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
        <Text style={styles.headerTitle}>{i18n.t("labReport.title")}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Header info */}
        <View style={styles.reportHeader}>
          <View style={styles.reportHeaderTop}>
            <View style={styles.reportHeaderInfo}>
              {report.lab_name && (
                <Text style={styles.labName}>{report.lab_name}</Text>
              )}
              {report.report_date && (
                <Text style={styles.reportDate}>
                  {formatDate(report.report_date)}
                </Text>
              )}
              {report.patient_name && (
                <Text style={styles.patientName}>{report.patient_name}</Text>
              )}
            </View>
            <View style={styles.completeBadge}>
              <Text style={styles.completeBadgeText}>
                {"\u2705"} {i18n.t("labReport.analysisComplete")}
              </Text>
            </View>
          </View>

          {report.patient_name_match === false && (
            <View style={styles.nameMismatchBox}>
              <Text style={styles.nameMismatchIcon}>{"\u26A0\uFE0F"}</Text>
              <Text style={styles.nameMismatchText}>
                {i18n.t("labReport.nameMismatch")}
              </Text>
            </View>
          )}
        </View>

        {/* Critical Alert */}
        {report.has_critical_findings && criticalFindings.length > 0 && (
          <View style={styles.criticalCard}>
            <View style={styles.criticalHeader}>
              <Text style={styles.criticalIcon}>{"\u26A0\uFE0F"}</Text>
              <Text style={styles.criticalTitle}>
                {i18n.t("labReport.actionRequired")}
              </Text>
            </View>
            {criticalFindings.map((f) => (
              <Text key={f.id} style={styles.criticalItem}>
                {"\u2022"} {f.parameter_name}: {f.value} {f.unit || ""}{" "}
                {f.normal_range_text ? `(${f.normal_range_text})` : ""}
              </Text>
            ))}
            <Text style={styles.criticalHint}>
              {i18n.t("labReport.criticalHint")}
            </Text>
          </View>
        )}

        {/* Summary */}
        {(report.hindi_summary || report.english_summary) && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.sectionTitle}>
                {i18n.t("labReport.summaryTitle")}
              </Text>
              <View style={styles.langToggle}>
                <TouchableOpacity
                  style={[
                    styles.langButton,
                    summaryLang === "en" && styles.langButtonActive,
                  ]}
                  onPress={() => setSummaryLang("en")}
                >
                  <Text
                    style={[
                      styles.langButtonText,
                      summaryLang === "en" && styles.langButtonTextActive,
                    ]}
                  >
                    {i18n.t("labReport.english")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.langButton,
                    summaryLang === "hi" && styles.langButtonActive,
                  ]}
                  onPress={() => setSummaryLang("hi")}
                >
                  <Text
                    style={[
                      styles.langButtonText,
                      summaryLang === "hi" && styles.langButtonTextActive,
                    ]}
                  >
                    {i18n.t("labReport.hindi")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.summaryText}>
              {summaryLang === "hi"
                ? report.hindi_summary
                : report.english_summary}
            </Text>
          </View>
        )}

        {/* Findings Table */}
        {Object.keys(groupedFindings).length > 0 && (
          <View style={styles.findingsCard}>
            <Text style={styles.sectionTitle}>
              {i18n.t("labReport.findingsTitle")}
            </Text>

            {/* Abnormal findings always shown */}
            {Object.entries(groupedFindings).map(([section, findings]) => {
              const abnormalInSection = findings.filter(
                (f) => f.status !== "normal"
              );
              if (abnormalInSection.length === 0) return null;
              return (
                <View key={section}>
                  <Text style={styles.sectionGroupTitle}>{section}</Text>
                  {abnormalInSection.map((f) => (
                    <FindingRow
                      key={f.id}
                      finding={f}
                      expanded={expandedFindingId === f.id}
                      onPress={() =>
                        setExpandedFindingId(
                          expandedFindingId === f.id ? null : f.id
                        )
                      }
                    />
                  ))}
                </View>
              );
            })}

            {/* Normal findings toggle */}
            {normalFindings.length > 0 && (
              <>
                <TouchableOpacity
                  style={styles.showNormalButton}
                  onPress={() => setShowNormal(!showNormal)}
                >
                  <Text style={styles.showNormalText}>
                    {showNormal
                      ? i18n.t("labReport.hideNormal")
                      : i18n.t("labReport.showNormal")}{" "}
                    ({normalFindings.length})
                  </Text>
                </TouchableOpacity>

                {showNormal &&
                  Object.entries(groupedFindings).map(
                    ([section, findings]) => {
                      const normalInSection = findings.filter(
                        (f) => f.status === "normal"
                      );
                      if (normalInSection.length === 0) return null;
                      return (
                        <View key={`normal-${section}`}>
                          <Text style={styles.sectionGroupTitle}>
                            {section}
                          </Text>
                          {normalInSection.map((f) => (
                            <FindingRow
                              key={f.id}
                              finding={f}
                              expanded={expandedFindingId === f.id}
                              onPress={() =>
                                setExpandedFindingId(
                                  expandedFindingId === f.id ? null : f.id
                                )
                              }
                            />
                          ))}
                        </View>
                      );
                    }
                  )}
              </>
            )}
          </View>
        )}

        {/* Next Steps */}
        {(report.next_steps_hindi || report.next_steps) && (
          <View style={styles.nextStepsCard}>
            <Text style={styles.sectionTitle}>
              {i18n.t("labReport.nextStepsHi")} / {i18n.t("labReport.nextSteps")}
            </Text>
            {report.next_steps_hindi && (
              <Text style={styles.nextStepsHindi}>
                {report.next_steps_hindi}
              </Text>
            )}
            {report.next_steps && (
              <Text style={styles.nextStepsEnglish}>{report.next_steps}</Text>
            )}
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShare}
            >
              <Text style={styles.shareButtonIcon}>{"\u{1F4E4}"}</Text>
              <Text style={styles.shareButtonText}>
                {i18n.t("labReport.shareWithDoctor")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerIcon}>{"\u{2139}\u{FE0F}"}</Text>
          <View style={styles.disclaimerTextContainer}>
            <Text style={styles.disclaimerTextHi}>
              {i18n.t("labReport.disclaimerHi")}
            </Text>
            <Text style={styles.disclaimerTextEn}>
              {i18n.t("labReport.disclaimer")}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function FindingRow({
  finding,
  expanded,
  onPress,
}: {
  finding: LabReportFinding;
  expanded: boolean;
  onPress: () => void;
}) {
  const pillColor = STATUS_PILL_COLORS[finding.status] || COLORS.textSecondary;
  const statusIcon = STATUS_ICONS[finding.status] || "";
  const statusLabel =
    i18n.t(`labReport.${finding.status}` as "labReport.normal") || finding.status;

  return (
    <TouchableOpacity
      style={[
        styles.findingRow,
        finding.is_critical && styles.findingRowCritical,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.findingMain}>
        <View style={styles.findingLeft}>
          <Text style={styles.findingName}>{finding.parameter_name}</Text>
          {finding.hindi_name && (
            <Text style={styles.findingHindiName}>{finding.hindi_name}</Text>
          )}
        </View>
        <View style={styles.findingRight}>
          <Text
            style={[
              styles.findingValue,
              finding.status !== "normal" && { color: pillColor },
            ]}
          >
            {finding.value} {finding.unit || ""}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: pillColor }]}>
            <Text style={styles.statusPillText}>
              {statusIcon} {statusLabel}
            </Text>
          </View>
        </View>
      </View>
      {finding.normal_range_text && (
        <Text style={styles.findingRange}>
          {i18n.t("labReport.range")}: {finding.normal_range_text}
        </Text>
      )}
      {expanded && (finding.hindi_note || finding.note) && (
        <View style={styles.findingExpanded}>
          {finding.hindi_note && (
            <Text style={styles.findingNoteHi}>{finding.hindi_note}</Text>
          )}
          {finding.note && (
            <Text style={styles.findingNoteEn}>{finding.note}</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
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
  errorText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.error,
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
    padding: 16,
    paddingBottom: 40,
  },

  // Report header
  reportHeader: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  reportHeaderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  reportHeaderInfo: {
    flex: 1,
  },
  labName: {
    fontSize: FONT_SIZES.large,
    fontWeight: "bold",
    color: COLORS.text,
  },
  reportDate: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  patientName: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
    marginTop: 4,
  },
  completeBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.white,
  },
  nameMismatchBox: {
    flexDirection: "row",
    backgroundColor: "#FFF8E1",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  nameMismatchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  nameMismatchText: {
    flex: 1,
    fontSize: FONT_SIZES.small,
    color: COLORS.text,
  },

  // Critical alert
  criticalCard: {
    backgroundColor: "#FDE8E8",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  criticalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  criticalIcon: {
    fontSize: 22,
    marginRight: 8,
  },
  criticalTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: "bold",
    color: COLORS.error,
  },
  criticalItem: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
    marginBottom: 4,
    lineHeight: 22,
  },
  criticalHint: {
    fontSize: FONT_SIZES.small,
    color: COLORS.error,
    fontWeight: "600",
    marginTop: 8,
  },

  // Summary
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: "bold",
    color: COLORS.text,
  },
  langToggle: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  langButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  langButtonActive: {
    backgroundColor: COLORS.primary,
  },
  langButtonText: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  langButtonTextActive: {
    color: COLORS.white,
  },
  summaryText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
    lineHeight: 24,
  },

  // Findings
  findingsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sectionGroupTitle: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "600",
    color: COLORS.primaryDark,
    marginTop: 10,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  findingRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  findingRowCritical: {
    backgroundColor: "#FFF5F5",
    marginHorizontal: -4,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  findingMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  findingLeft: {
    flex: 1,
    marginRight: 8,
  },
  findingName: {
    fontSize: FONT_SIZES.small,
    fontWeight: "600",
    color: COLORS.text,
  },
  findingHindiName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  findingRight: {
    alignItems: "flex-end",
  },
  findingValue: {
    fontSize: FONT_SIZES.small,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 3,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.white,
  },
  findingRange: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  findingExpanded: {
    marginTop: 8,
    backgroundColor: COLORS.background,
    borderRadius: 6,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  findingNoteHi: {
    fontSize: FONT_SIZES.small,
    color: COLORS.text,
    lineHeight: 20,
  },
  findingNoteEn: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  showNormalButton: {
    alignItems: "center",
    paddingVertical: 10,
    marginTop: 6,
  },
  showNormalText: {
    fontSize: FONT_SIZES.small,
    color: COLORS.primary,
    fontWeight: "600",
  },

  // Next steps
  nextStepsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  nextStepsHindi: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
    lineHeight: 24,
    marginTop: 10,
  },
  nextStepsEnglish: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginTop: 8,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 14,
  },
  shareButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  shareButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.medium,
    fontWeight: "600",
  },

  // Disclaimer
  disclaimerCard: {
    flexDirection: "row",
    backgroundColor: "#F0F4FF",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  disclaimerIcon: {
    fontSize: 18,
    marginRight: 10,
    marginTop: 2,
  },
  disclaimerTextContainer: {
    flex: 1,
  },
  disclaimerTextHi: {
    fontSize: FONT_SIZES.small,
    color: COLORS.text,
    lineHeight: 20,
  },
  disclaimerTextEn: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
});
