import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { COLORS, FONT_SIZES } from "../../constants";
import { MedicineDetail, PatientStackParamList } from "../../types";
import {
  useGetMedicine,
  useStopMedicine,
  useRestartMedicine,
} from "../../hooks/usePrescriptions";
import i18n from "../../i18n";
import { doseInstruction } from "../../i18n/instruction";

type Nav = StackNavigationProp<PatientStackParamList, "MedicineDetail">;
type Route = RouteProp<PatientStackParamList, "MedicineDetail">;

// Reference text in the reader's own language where we have it, falling back to
// English rather than to nothing: a caregiver reading English should still see
// something, and so should a patient whose translation has not been generated.
function referenceText(medicine: MedicineDetail) {
  const reference = medicine.drug_reference;
  if (!reference) return null;

  const translated = i18n.locale === "hi" ? reference.hindi : null;

  return {
    description: translated?.description ?? reference.description,
    usage: translated?.usage ?? reference.usage,
    side_effects: translated?.side_effects ?? reference.side_effects,
  };
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

// Collapsed behind the medicine name: a caregiver scanning a list does not need
// it, and someone who wants to know will tap.
function DrugInformation({ medicine }: { medicine: MedicineDetail }) {
  const [open, setOpen] = useState(false);
  const text = referenceText(medicine);

  if (medicine.drug_reference_status === "pending") {
    return (
      <View style={styles.referencePending}>
        <ActivityIndicator size="small" color={COLORS.textSecondary} />
        <Text style={styles.referencePendingText}>
          {i18n.t("medicineDetail.lookingUp")}
        </Text>
      </View>
    );
  }

  // "unavailable" renders nothing at all. An empty section would suggest the app
  // is broken, when the brand simply was not recognised.
  if (!text) return null;

  return (
    <View style={styles.referenceCard}>
      <TouchableOpacity
        onPress={() => setOpen((wasOpen) => !wasOpen)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={i18n.t("medicineDetail.aboutThisMedicine")}
      >
        <Text style={styles.referenceToggle}>
          {open ? "▾" : "▸"} {i18n.t("medicineDetail.aboutThisMedicine")}
        </Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.referenceBody}>
          {text.description && (
            <Text style={styles.referenceText}>{text.description}</Text>
          )}
          {text.usage && (
            <>
              <Text style={styles.referenceHeading}>
                {i18n.t("medicineDetail.usedFor")}
              </Text>
              <Text style={styles.referenceText}>{text.usage}</Text>
            </>
          )}
          {text.side_effects && (
            <>
              <Text style={styles.referenceHeading}>
                {i18n.t("medicineDetail.sideEffects")}
              </Text>
              <Text style={styles.referenceText}>{text.side_effects}</Text>
            </>
          )}

          {/* Always shown with the content, never dismissable. */}
          <Text style={styles.disclaimer}>
            {i18n.t("medicineDetail.disclaimer")}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function MedicineDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { medicineId } = route.params;

  const { data: medicine, isLoading, isError, refetch } = useGetMedicine(medicineId);
  const familyMemberId = medicine?.doctor_visit?.family_member_id;
  const stopMedicine = useStopMedicine(medicineId, familyMemberId);
  const restartMedicine = useRestartMedicine(medicineId, familyMemberId);

  const confirmStop = () => {
    if (!medicine) return;

    Alert.alert(
      i18n.t("medicineDetail.stopTitle"),
      i18n.t("medicineDetail.stopMessage", { medicine: medicine.name }),
      [
        { text: i18n.t("common.cancel"), style: "cancel" },
        {
          text: i18n.t("medicineDetail.stopAction"),
          style: "destructive",
          onPress: () =>
            stopMedicine.mutate(undefined, {
              onError: () => Alert.alert(i18n.t("medicineDetail.stopFailed")),
            }),
        },
      ]
    );
  };

  const confirmRestart = () => {
    if (!medicine) return;

    Alert.alert(
      i18n.t("medicineDetail.restartTitle"),
      i18n.t("medicineDetail.restartMessage", { medicine: medicine.name }),
      [
        { text: i18n.t("common.cancel"), style: "cancel" },
        {
          text: i18n.t("medicineDetail.restartAction"),
          onPress: () =>
            restartMedicine.mutate(undefined, {
              onError: () => Alert.alert(i18n.t("medicineDetail.stopFailed")),
            }),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (isError || !medicine) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{i18n.t("common.error")}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>{i18n.t("common.retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const summary = medicine.adherence_summary;
  const isBusy = stopMedicine.isPending || restartMedicine.isPending;

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
        <Text style={styles.title}>{i18n.t("medicineDetail.title")}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.name}>{medicine.name}</Text>

        {!medicine.is_active && (
          <View style={styles.stoppedBanner}>
            <Text style={styles.stoppedText}>
              {i18n.t("medicineDetail.stopped")}
            </Text>
          </View>
        )}

        {doseInstruction(medicine) && (
          <View style={styles.explanationCard}>
            <Text style={styles.explanationText}>{doseInstruction(medicine)}</Text>
          </View>
        )}

        <DrugInformation medicine={medicine} />

        {medicine.dosage && (
          <Row label={i18n.t("medicineDetail.dose")} value={medicine.dosage} />
        )}
        {medicine.frequency && (
          <Row label={i18n.t("medicineDetail.howOften")} value={medicine.frequency} />
        )}
        {medicine.reminder_times.length > 0 && (
          <Row
            label={i18n.t("medicineDetail.remindsAt")}
            value={medicine.reminder_times.join(", ")}
          />
        )}
        {medicine.duration_days != null && (
          <Row
            label={i18n.t("medicineDetail.howLong")}
            value={i18n.t("medicineDetail.days", { count: medicine.duration_days })}
          />
        )}
        {medicine.quantity_prescribed != null && (
          <Row
            label={i18n.t("medicineDetail.quantity")}
            value={String(medicine.quantity_prescribed)}
          />
        )}

        {summary.scheduled > 0 && (
          <Row
            label={i18n.t("medicineDetail.lastWeek")}
            value={i18n.t("medicineDetail.takenOf", {
              taken: summary.taken,
              scheduled: summary.scheduled,
            })}
          />
        )}

        {medicine.raw_text && (
          <View style={styles.rawCard}>
            <Text style={styles.rawLabel}>{i18n.t("medicineDetail.asWritten")}</Text>
            <Text style={styles.rawValue}>{medicine.raw_text}</Text>
            <Text style={styles.rawHint}>{i18n.t("medicineDetail.checkHint")}</Text>
          </View>
        )}

        {/* Both roles get this control. A stop is reversible, and a restart
            resumes from the next dose rather than replaying missed ones. */}
        <TouchableOpacity
          style={[styles.lifecycleButton, medicine.is_active && styles.stopButton]}
          onPress={medicine.is_active ? confirmStop : confirmRestart}
          disabled={isBusy}
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.lifecycleButtonText,
              medicine.is_active && styles.stopButtonText,
            ]}
          >
            {medicine.is_active
              ? i18n.t("medicineDetail.stopAction")
              : i18n.t("medicineDetail.restartAction")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.closeButton}
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
        >
          <Text style={styles.closeButtonText}>{i18n.t("common.close")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: { marginRight: 12, padding: 4 },
  backText: { fontSize: 28, color: COLORS.white },
  title: { fontSize: FONT_SIZES.xlarge, fontWeight: "bold", color: COLORS.white },
  content: { padding: 20, paddingBottom: 40 },
  name: {
    fontSize: FONT_SIZES.title,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 12,
  },
  stoppedBanner: {
    backgroundColor: COLORS.error,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  stoppedText: { color: COLORS.white, fontSize: FONT_SIZES.large, fontWeight: "600" },
  explanationCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  explanationText: { fontSize: FONT_SIZES.large, color: COLORS.text, lineHeight: 28 },
  referenceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  referenceToggle: {
    fontSize: FONT_SIZES.large,
    fontWeight: "600",
    color: COLORS.primary,
  },
  referenceBody: { marginTop: 12 },
  referenceHeading: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 4,
  },
  referenceText: { fontSize: FONT_SIZES.large, color: COLORS.text, lineHeight: 26 },
  disclaimer: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.textSecondary,
    marginTop: 16,
    fontStyle: "italic",
    lineHeight: 22,
  },
  referencePending: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingVertical: 8,
  },
  referencePendingText: { fontSize: FONT_SIZES.medium, color: COLORS.textSecondary },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  rowLabel: { fontSize: FONT_SIZES.large, color: COLORS.textSecondary },
  rowValue: {
    fontSize: FONT_SIZES.large,
    fontWeight: "600",
    color: COLORS.text,
    flexShrink: 1,
    textAlign: "right",
  },
  rawCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  rawLabel: { fontSize: FONT_SIZES.medium, color: COLORS.textSecondary },
  rawValue: { fontSize: FONT_SIZES.large, color: COLORS.text, marginTop: 4 },
  rawHint: { fontSize: FONT_SIZES.medium, color: COLORS.textSecondary, marginTop: 8 },
  lifecycleButton: {
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  lifecycleButtonText: {
    fontSize: FONT_SIZES.large,
    fontWeight: "600",
    color: COLORS.primary,
  },
  stopButton: { borderColor: COLORS.error },
  stopButtonText: { color: COLORS.error },
  closeButton: {
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: FONT_SIZES.large,
    fontWeight: "600",
    color: COLORS.white,
  },
  errorText: { fontSize: FONT_SIZES.large, color: COLORS.error, marginBottom: 16 },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  retryButtonText: { color: COLORS.white, fontSize: FONT_SIZES.medium, fontWeight: "600" },
});
