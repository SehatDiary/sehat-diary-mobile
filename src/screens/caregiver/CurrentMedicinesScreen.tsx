import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { COLORS, FONT_SIZES } from "../../constants";
import { useGetCurrentMedicines } from "../../hooks/useFamilyMembers";
import { CaregiverStackParamList, MedicineDetail } from "../../types";
import { groupBySlot, unscheduled, Slot } from "./currentMedicines";
import { doseInstruction } from "../../i18n/instruction";
import i18n from "../../i18n";

type Nav = StackNavigationProp<CaregiverStackParamList, "CurrentMedicines">;
type Route = RouteProp<CaregiverStackParamList, "CurrentMedicines">;

const SLOT_LABELS: Record<Slot, () => string> = {
  morning: () => i18n.t("medicines.morning"),
  afternoon: () => i18n.t("medicines.afternoon"),
  evening: () => i18n.t("medicines.evening"),
  night: () => i18n.t("medicines.night"),
};

const SLOT_ICONS: Record<Slot, string> = {
  morning: "\u{1F305}",
  afternoon: "\u{2600}\u{FE0F}",
  evening: "\u{1F307}",
  night: "\u{1F319}",
};

function MedicineRow({ medicine }: { medicine: MedicineDetail }) {
  const navigation = useNavigation<Nav>();
  const instruction = doseInstruction(medicine);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={medicine.name}
      onPress={() =>
        navigation.navigate("MedicineDetail", { medicineId: medicine.id })
      }
    >
      <Text style={styles.name}>{medicine.name}</Text>
      {instruction && <Text style={styles.instruction}>{instruction}</Text>}
      <View style={styles.metaRow}>
        {medicine.dosage && <Text style={styles.meta}>{medicine.dosage}</Text>}
        {medicine.quantity_remaining != null && (
          <Text style={styles.meta}>
            {i18n.t("medicines.leftCount", { count: medicine.quantity_remaining })}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function CurrentMedicinesScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { memberId, memberName } = route.params;

  const { data, isLoading, isError, isRefetching, refetch } =
    useGetCurrentMedicines(memberId);

  const medicines = data ?? [];
  const groups = groupBySlot(medicines);
  const withoutSchedule = unscheduled(medicines);

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
          accessibilityRole="button"
          accessibilityLabel={i18n.t("common.back")}
        >
          <Text style={styles.backText}>{"←"}</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>{memberName}</Text>
          <Text style={styles.subtitle}>
            {i18n.t("familyMember.currentMedicines")}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
        }
      >
        {isError && <Text style={styles.error}>{i18n.t("common.error")}</Text>}

        {medicines.length === 0 && !isError && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{"\u{1F48A}"}</Text>
            <Text style={styles.emptyText}>{i18n.t("medicines.noneRunning")}</Text>
          </View>
        )}

        {groups.map((group) => (
          <View key={group.slot} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {SLOT_ICONS[group.slot]} {SLOT_LABELS[group.slot]()}
            </Text>
            {group.medicines.map((medicine) => (
              <MedicineRow key={`${group.slot}-${medicine.id}`} medicine={medicine} />
            ))}
          </View>
        ))}

        {/* A medicine nobody is reminded about is exactly the one worth seeing:
            either as-needed, or waiting on a frequency the app could not read. */}
        {withoutSchedule.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {"ℹ️"} {i18n.t("medicines.noReminderSet")}
            </Text>
            {withoutSchedule.map((medicine) => (
              <MedicineRow key={`unscheduled-${medicine.id}`} medicine={medicine} />
            ))}
          </View>
        )}
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
  backText: { fontSize: 24, color: COLORS.white },
  title: { fontSize: FONT_SIZES.xlarge, fontWeight: "bold", color: COLORS.white },
  subtitle: { fontSize: FONT_SIZES.small, color: COLORS.white, opacity: 0.9 },
  content: { padding: 16, paddingBottom: 32 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  name: { fontSize: FONT_SIZES.large, fontWeight: "600", color: COLORS.text },
  instruction: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
    marginTop: 4,
    lineHeight: 22,
  },
  metaRow: { flexDirection: "row", gap: 12, marginTop: 6 },
  meta: { fontSize: FONT_SIZES.small, color: COLORS.textSecondary },
  empty: { alignItems: "center", paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: FONT_SIZES.medium, color: COLORS.textSecondary },
  error: { fontSize: FONT_SIZES.medium, color: COLORS.error, marginBottom: 12 },
});
