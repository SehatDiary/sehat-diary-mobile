import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { COLORS, FONT_SIZES } from "../../constants";
import { useGetHealthSession } from "../../hooks/useFamilyMembers";
import { CaregiverStackParamList, Prescription, Medicine } from "../../types";
import i18n from "../../i18n";

type Nav = StackNavigationProp<CaregiverStackParamList, "SessionDetail">;
type Route = RouteProp<CaregiverStackParamList, "SessionDetail">;

const STATUS_COLORS: Record<string, string> = {
  pending: COLORS.warning,
  extracted: COLORS.primaryLight,
  confirmed: COLORS.success,
  failed: COLORS.error,
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
        {prescriptions.length === 0 ? (
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
      </ScrollView>

      {session?.status === "active" && (
        <TouchableOpacity
          style={styles.uploadFab}
          activeOpacity={0.8}
          onPress={() =>
            navigation.navigate("UploadPrescription", { memberId, sessionId })
          }
        >
          <Text style={styles.uploadFabText}>📋 +</Text>
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
