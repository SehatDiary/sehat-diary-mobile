import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useNavigation, useRoute, RouteProp, CommonActions } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import * as ImagePicker from "expo-image-picker";
import { COLORS, FONT_SIZES } from "../../constants";
import {
  useUploadPrescription,
  useConfirmPrescription,
} from "../../hooks/usePrescriptions";
import {
  CaregiverStackParamList,
  DosingInterval,
  ExtractedMedicine,
} from "../../types";
import i18n from "../../i18n";
import {
  canConfirm,
  countMissingFrequency,
  countMissingName,
  countUnreviewedLowConfidence,
  isMeaningfulEdit,
  needsFrequency,
} from "./reviewGate";
import {
  buildConfirmedData,
  emptyVisitEdits,
  isValidVisitDate,
  visitEditsFrom,
  VisitEdits,
} from "./confirmPayload";
import {
  blankMedicine,
  FREQUENCY_OPTIONS,
  INTERVAL_OPTIONS,
  Option,
  TIMING_OPTIONS,
  WEEKDAY_OPTIONS,
} from "./medicineOptions";

type Nav = StackNavigationProp<CaregiverStackParamList, "UploadPrescription">;
type Route = RouteProp<CaregiverStackParamList, "UploadPrescription">;

type ScreenState = "idle" | "processing" | "review" | "error";

export default function UploadPrescriptionScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { memberId, sessionId } = route.params;

  const uploadPrescription = useUploadPrescription();
  const confirmPrescription = useConfirmPrescription();

  const [screenState, setScreenState] = useState<ScreenState>("idle");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [prescriptionId, setPrescriptionId] = useState<number | null>(null);
  const [medicines, setMedicines] = useState<ExtractedMedicine[]>([]);
  const [reviewedIndexes, setReviewedIndexes] = useState<number[]>([]);
  const [extractedNames, setExtractedNames] = useState<string[]>([]);
  // The whole extraction, kept so it can be sent back. Only `medicines` used to
  // survive confirmation; everything else was discarded.
  const [extractedData, setExtractedData] = useState<Record<string, unknown> | null>(null);
  const [visitEdits, setVisitEdits] = useState<VisitEdits>(emptyVisitEdits());
  const [errorMessage, setErrorMessage] = useState("");

  const pickImage = async (useCamera: boolean) => {
    if (useCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(i18n.t("prescription.permissionRequired"));
        return;
      }
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.8,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.8,
        });

    if (result.canceled) return;

    const uri = result.assets[0].uri;
    setImageUri(uri);
    handleUpload(uri);
  };

  const handleUpload = (uri: string) => {
    setScreenState("processing");
    setErrorMessage("");

    uploadPrescription.mutate(
      { uri, familyMemberId: memberId, healthSessionId: sessionId },
      {
        onSuccess: (data) => {
          setPrescriptionId(data.prescription_id);
          const extracted = (data.extracted_data as { medicines?: ExtractedMedicine[] })
            ?.medicines ?? [];
          setExtractedData(data.extracted_data as Record<string, unknown>);
          setVisitEdits(visitEditsFrom(data.extracted_data as Record<string, unknown>));
          setMedicines(extracted);
          setExtractedNames(extracted.map((m) => m.name));
          setReviewedIndexes([]);
          setScreenState(extracted.length > 0 ? "review" : "error");
          if (extracted.length === 0) {
            setErrorMessage(i18n.t("prescription.noMedicinesFound"));
          }
        },
        onError: () => {
          setScreenState("error");
          setErrorMessage(i18n.t("prescription.extractionFailed"));
        },
      }
    );
  };

  const updateMedicineField = (
    index: number,
    patch: Partial<ExtractedMedicine>
  ) => {
    setMedicines((prev) =>
      prev.map((m, i) => (i === index ? { ...m, ...patch } : m))
    );

    // Correcting a row counts as reviewing it — but only a real correction to
    // the name, not a keystroke that gets undone. Editing a schedule field is
    // also a review: the caregiver has plainly looked at the row.
    if (patch.name !== undefined) {
      if (isMeaningfulEdit(extractedNames[index], patch.name)) {
        markReviewed(index);
      }
      return;
    }

    markReviewed(index);
  };

  const addMedicine = () => {
    setMedicines((prev) => [...prev, blankMedicine()]);
    // extractedNames is indexed alongside medicines, so it has to grow too or a
    // later removal would shift the two out of step.
    setExtractedNames((prev) => [...prev, ""]);
  };

  const removeMedicine = (index: number) => {
    const medicine = medicines[index];

    Alert.alert(
      i18n.t("prescription.removeMedicineTitle"),
      i18n.t("prescription.removeMedicineMessage", {
        medicine: medicine?.name || i18n.t("prescription.medicineName"),
      }),
      [
        { text: i18n.t("common.cancel"), style: "cancel" },
        {
          text: i18n.t("prescription.removeMedicine"),
          style: "destructive",
          onPress: () => {
            setMedicines((prev) => prev.filter((_, i) => i !== index));
            // Review marks are positional, so they have to shift with the rows
            // or a later row inherits an earlier one's clearance.
            setReviewedIndexes((prev) =>
              prev
                .filter((reviewed) => reviewed !== index)
                .map((reviewed) => (reviewed > index ? reviewed - 1 : reviewed))
            );
            setExtractedNames((prev) => prev.filter((_, i) => i !== index));
          },
        },
      ]
    );
  };

  const markReviewed = (index: number) => {
    setReviewedIndexes((prev) =>
      prev.includes(index) ? prev : [...prev, index]
    );
  };

  const unreviewedLowCount = countUnreviewedLowConfidence(
    medicines,
    reviewedIndexes
  );

  const handleConfirm = () => {
    if (!prescriptionId) return;

    confirmPrescription.mutate(
      {
        familyMemberId: memberId,
        healthSessionId: sessionId,
        prescriptionId,
        confirmedData: buildConfirmedData(extractedData, medicines, visitEdits) as {
          medicines: Record<string, unknown>[];
        },
      },
      {
        onSuccess: (result) => {
          // The name printed on the prescription did not match the family member
          // this is being filed against. Everything here — the medicines, the
          // reminders — belongs to whoever's session you are in, so a mismatch
          // is worth a look before it becomes someone's schedule.
          if (result.unmatched_warning) {
            Alert.alert(
              i18n.t("prescription.patientMismatchTitle"),
              i18n.t("prescription.patientMismatchMessage"),
              [ { text: i18n.t("common.close"), onPress: () => goToConfirmation(result.doctor_visit_id) } ]
            );
            return;
          }

          goToConfirmation(result.doctor_visit_id);
        },
        onError: () => Alert.alert(i18n.t("common.error")),
      }
    );
  };

  const goToConfirmation = (doctorVisitId: number) => {
    navigation.dispatch(
      CommonActions.reset({
        index: 2,
        routes: [
          { name: "Dashboard" },
          { name: "SessionDetail", params: { memberId, sessionId } },
          { name: "VisitConfirmed", params: { memberId, sessionId, doctorVisitId } },
        ],
      })
    );
  };

  const resetToIdle = () => {
    setScreenState("idle");
    setImageUri(null);
    setPrescriptionId(null);
    setMedicines([]);
    setExtractedNames([]);
    setExtractedData(null);
    setVisitEdits(emptyVisitEdits());
    setReviewedIndexes([]);
    setErrorMessage("");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{"←"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t("prescription.title")}</Text>
      </View>

      {screenState === "idle" && <IdleState onPickImage={pickImage} />}
      {screenState === "processing" && <ProcessingState imageUri={imageUri} />}
      {screenState === "review" && (
        <ReviewState
          medicines={medicines}
          reviewedIndexes={reviewedIndexes}
          unreviewedLowCount={unreviewedLowCount}
          visitEdits={visitEdits}
          onUpdateVisit={(patch) => setVisitEdits((prev) => ({ ...prev, ...patch }))}
          onUpdateField={updateMedicineField}
          onAdd={addMedicine}
          onRemove={removeMedicine}
          onMarkReviewed={markReviewed}
          onConfirm={handleConfirm}
          isConfirming={confirmPrescription.isPending}
        />
      )}
      {screenState === "error" && (
        <ErrorState message={errorMessage} onRetry={resetToIdle} />
      )}
    </View>
  );
}

function IdleState({
  onPickImage,
}: {
  onPickImage: (useCamera: boolean) => void;
}) {
  return (
    <View style={styles.idleContainer}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>📋</Text>
      </View>
      <Text style={styles.idleTitle}>{i18n.t("prescription.title")}</Text>

      <TouchableOpacity
        style={styles.pickButton}
        onPress={() => onPickImage(true)}
      >
        <Text style={styles.pickButtonIcon}>📷</Text>
        <Text style={styles.pickButtonText}>
          {i18n.t("prescription.takePhoto")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.pickButton, styles.pickButtonOutline]}
        onPress={() => onPickImage(false)}
      >
        <Text style={styles.pickButtonIcon}>🖼️</Text>
        <Text style={[styles.pickButtonText, styles.pickButtonTextOutline]}>
          {i18n.t("prescription.chooseGallery")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ProcessingState({ imageUri }: { imageUri: string | null }) {
  return (
    <View style={styles.processingContainer}>
      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.previewImage} />
      )}
      <View style={styles.scanOverlay}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.scanningText}>
          {i18n.t("prescription.scanning")}
        </Text>
        <Text style={styles.extractingText}>
          {i18n.t("prescription.extracting")}
        </Text>
      </View>
    </View>
  );
}

// Chips rather than a native picker: the options are few, all of them fit on
// screen, and a caregiver correcting a misread dose should see every choice at
// once instead of opening a wheel to discover them.
function OptionRow<T extends string | number>({
  label,
  options,
  selected,
  onSelect,
  required,
}: {
  label: string;
  options: Option<T>[];
  selected: T | null | undefined;
  onSelect: (value: T) => void;
  required?: boolean;
}) {
  return (
    <View style={styles.optionBlock}>
      <Text style={[styles.fieldLabel, required && styles.fieldLabelRequired]}>
        {label}
        {required ? " *" : ""}
      </Text>
      <View style={styles.optionRow}>
        {options.map((option) => {
          const isSelected = option.value === selected;

          return (
            <TouchableOpacity
              key={String(option.value)}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => onSelect(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {i18n.t(option.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function ReviewState({
  medicines,
  reviewedIndexes,
  unreviewedLowCount,
  visitEdits,
  onUpdateVisit,
  onUpdateField,
  onMarkReviewed,
  onAdd,
  onRemove,
  onConfirm,
  isConfirming,
}: {
  medicines: ExtractedMedicine[];
  reviewedIndexes: number[];
  unreviewedLowCount: number;
  visitEdits: VisitEdits;
  onUpdateVisit: (patch: Partial<VisitEdits>) => void;
  onUpdateField: (index: number, patch: Partial<ExtractedMedicine>) => void;
  onMarkReviewed: (index: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onConfirm: () => void;
  isConfirming: boolean;
}) {
  // A row missing a name or a frequency cannot be saved. The scheduler places
  // reminders from frequency, and the server refuses to invent one — so a row
  // confirmed blank would sit in the medicine list reminding nobody.
  const incompleteCount =
    countMissingFrequency(medicines) + countMissingName(medicines);
  // A date the server cannot parse falls back to today without saying so, which
  // is the failure this screen now exists to prevent.
  const dateIsValid = isValidVisitDate(visitEdits.visit_date);
  const confirmable = canConfirm(medicines, reviewedIndexes) && dateIsValid;

  return (
    <View style={styles.reviewContainer}>
      <Text style={styles.reviewTitle}>
        {i18n.t("prescription.reviewTitle")}
      </Text>
      <Text style={styles.reviewHint}>
        {i18n.t("prescription.reviewHint")}
      </Text>

      {/* The visit itself. These were extracted and then thrown away at confirm,
          so the doctor was never recorded and every visit date became today. */}
      <View style={styles.visitCard}>
        <Text style={styles.fieldLabel}>{i18n.t("prescription.doctorName")}</Text>
        <TextInput
          style={styles.nameInput}
          value={visitEdits.doctor_name}
          onChangeText={(doctor_name) => onUpdateVisit({ doctor_name })}
          placeholder={i18n.t("prescription.notOnPrescription")}
        />

        <Text style={styles.fieldLabel}>{i18n.t("prescription.hospitalClinic")}</Text>
        <TextInput
          style={styles.nameInput}
          value={visitEdits.hospital_clinic}
          onChangeText={(hospital_clinic) => onUpdateVisit({ hospital_clinic })}
          placeholder={i18n.t("prescription.notOnPrescription")}
        />

        <Text style={styles.fieldLabel}>{i18n.t("prescription.visitDate")}</Text>
        <TextInput
          style={[styles.nameInput, !dateIsValid && styles.nameInputLow]}
          value={visitEdits.visit_date}
          onChangeText={(visit_date) => onUpdateVisit({ visit_date })}
          placeholder="DD/MM/YYYY"
        />
        {!dateIsValid && (
          <Text style={styles.dateError}>{i18n.t("prescription.visitDateInvalid")}</Text>
        )}
      </View>

      <ScrollView
        style={styles.medicinesList}
        contentContainerStyle={styles.medicinesContent}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
      >
        {medicines.map((med, index) => {
          const isLow = med.confidence === "low";
          const isMedium = med.confidence === "medium";
          const isReviewed = reviewedIndexes.includes(index);
          return (
            <View
              key={index}
              style={[
                styles.medicineCard,
                isMedium && styles.medicineCardMedium,
                isLow && styles.medicineCardLow,
              ]}
            >
              {isLow && (
                <View style={styles.lowBadge}>
                  <Text style={styles.lowBadgeText}>
                    ⚠ {i18n.t("prescription.attentionNeeded")}
                  </Text>
                </View>
              )}
              {isMedium && (
                <View style={styles.mediumBadge}>
                  <Text style={styles.mediumBadgeText}>
                    {i18n.t("prescription.pleaseCheck")}
                  </Text>
                </View>
              )}
              {/* Shown on every row, not only uncertain ones: this is the text
                  the caregiver is checking the fields against. */}
              {med.raw_text && (
                <View style={styles.rawTextBox}>
                  <Text style={styles.rawTextLabel}>
                    {i18n.t("prescription.asWritten")}
                  </Text>
                  <Text style={styles.rawTextValue}>{med.raw_text}</Text>
                </View>
              )}
              <Text style={styles.fieldLabel}>
                {i18n.t("prescription.medicineName")} *
              </Text>
              <TextInput
                style={[styles.nameInput, isLow && styles.nameInputLow]}
                value={med.name}
                onChangeText={(text) => onUpdateField(index, { name: text })}
                placeholder={i18n.t("prescription.nameRequired")}
              />

              <View style={styles.inlineFields}>
                <View style={styles.inlineField}>
                  <Text style={styles.fieldLabel}>
                    {i18n.t("prescription.strength")}
                  </Text>
                  <TextInput
                    style={styles.smallInput}
                    value={med.strength ?? ""}
                    onChangeText={(text) =>
                      onUpdateField(index, { strength: text })
                    }
                  />
                </View>
                <View style={styles.inlineField}>
                  <Text style={styles.fieldLabel}>
                    {i18n.t("prescription.dose")}
                  </Text>
                  <TextInput
                    style={styles.smallInput}
                    value={med.dose ?? ""}
                    onChangeText={(text) => onUpdateField(index, { dose: text })}
                  />
                </View>
                <View style={styles.inlineField}>
                  <Text style={styles.fieldLabel}>
                    {i18n.t("prescription.durationDays")}
                  </Text>
                  <TextInput
                    style={styles.smallInput}
                    value={med.duration_days ? String(med.duration_days) : ""}
                    onChangeText={(text) =>
                      onUpdateField(index, {
                        duration_days: text.replace(/\D/g, "")
                          ? Number(text.replace(/\D/g, ""))
                          : null,
                      })
                    }
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              {/* Every field below is one the reminder scheduler reads, so all of
                  them are predefined values rather than free text: a typed word
                  the server does not recognise would save, display, and quietly
                  never remind anyone. */}
              <OptionRow
                label={i18n.t("prescription.howOften")}
                options={FREQUENCY_OPTIONS}
                selected={med.frequency}
                onSelect={(frequency) => onUpdateField(index, { frequency })}
                required={needsFrequency(med)}
              />

              <OptionRow
                label={i18n.t("prescription.whenToTake")}
                options={TIMING_OPTIONS}
                selected={med.timing}
                onSelect={(timing) => onUpdateField(index, { timing })}
              />

              <OptionRow
                label={i18n.t("prescription.intervalDaily")}
                options={INTERVAL_OPTIONS}
                selected={med.dosing_interval ?? "daily"}
                onSelect={(dosing_interval) =>
                  onUpdateField(index, {
                    dosing_interval: dosing_interval as DosingInterval,
                    // A weekday only means anything for a weekly dose; leaving a
                    // stale one behind would send the server a contradiction.
                    dosing_weekday:
                      dosing_interval === "weekly" ? med.dosing_weekday ?? 0 : null,
                  })
                }
              />

              {med.dosing_interval === "weekly" && (
                <OptionRow
                  label={i18n.t("prescription.whichDay")}
                  options={WEEKDAY_OPTIONS}
                  selected={med.dosing_weekday ?? 0}
                  onSelect={(dosing_weekday) =>
                    onUpdateField(index, { dosing_weekday })
                  }
                />
              )}

              {med.instructions_hi && (
                <View style={styles.instructionsBox}>
                  <Text style={styles.instructionsLabel}>
                    {i18n.t("session.instructions")}
                  </Text>
                  <Text style={styles.instructionsText}>
                    {med.instructions_hi}
                  </Text>
                </View>
              )}

              <View style={styles.cardActions}>
                {isLow && (
                  <TouchableOpacity
                    style={[
                      styles.reviewedButton,
                      isReviewed && styles.reviewedButtonDone,
                    ]}
                    onPress={() => onMarkReviewed(index)}
                    disabled={isReviewed}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.reviewedButtonText,
                        isReviewed && styles.reviewedButtonTextDone,
                      ]}
                    >
                      {isReviewed
                        ? `✓ ${i18n.t("prescription.reviewed")}`
                        : i18n.t("prescription.markReviewed")}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => onRemove(index)}
                  accessibilityRole="button"
                  accessibilityLabel={i18n.t("prescription.removeMedicine")}
                >
                  <Text style={styles.removeButtonText}>
                    {i18n.t("prescription.removeMedicine")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <TouchableOpacity
          style={styles.addMedicineButton}
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel={i18n.t("prescription.addMedicine")}
        >
          <Text style={styles.addMedicineText}>
            {i18n.t("prescription.addMedicine")}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.confirmButton,
          (isConfirming || !confirmable) && styles.confirmButtonDisabled,
        ]}
        onPress={onConfirm}
        disabled={isConfirming || !confirmable}
      >
        <Text style={styles.confirmText}>
          {isConfirming
            ? i18n.t("prescription.confirming")
            : unreviewedLowCount > 0
              ? i18n.t("prescription.unreviewedCount", {
                  count: unreviewedLowCount,
                })
              : incompleteCount > 0
                ? i18n.t("prescription.fixBeforeSaving", { count: incompleteCount })
                : i18n.t("prescription.confirmMedicines")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      <Text style={styles.errorHint}>{i18n.t("prescription.tryAgain")}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryText}>{i18n.t("common.retry")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  visitCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  dateError: {
    color: COLORS.error,
    fontSize: FONT_SIZES.small,
    marginTop: 6,
  },
  optionBlock: {
    marginTop: 12,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
  },
  chipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  chipText: {
    fontSize: FONT_SIZES.small,
    color: COLORS.text,
  },
  chipTextSelected: {
    color: COLORS.white,
    fontWeight: "600",
  },
  fieldLabelRequired: {
    color: COLORS.error,
    fontWeight: "700",
  },
  inlineFields: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  inlineField: {
    flex: 1,
  },
  smallInput: {
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: FONT_SIZES.small,
    color: COLORS.text,
    backgroundColor: COLORS.white,
    marginTop: 6,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    gap: 8,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  removeButtonText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.small,
    fontWeight: "600",
  },
  addMedicineButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.primary,
    alignItems: "center",
  },
  addMedicineText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.medium,
    fontWeight: "600",
  },
  container: {
    flex: 1,
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

  // Idle
  idleContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
  },
  iconText: {
    fontSize: 36,
  },
  idleTitle: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 32,
  },
  pickButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: "100%",
    marginBottom: 12,
  },
  pickButtonOutline: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  pickButtonIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  pickButtonText: {
    fontSize: FONT_SIZES.large,
    fontWeight: "600",
    color: COLORS.white,
  },
  pickButtonTextOutline: {
    color: COLORS.primary,
  },

  // Processing
  processingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: 200,
    height: 260,
    borderRadius: 12,
    marginBottom: 24,
  },
  scanOverlay: {
    alignItems: "center",
  },
  scanningText: {
    fontSize: FONT_SIZES.large,
    fontWeight: "600",
    color: COLORS.primary,
    marginTop: 16,
  },
  extractingText: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  // Review
  reviewContainer: {
    flex: 1,
    paddingTop: 16,
  },
  reviewTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: "bold",
    color: COLORS.text,
    paddingHorizontal: 16,
  },
  reviewHint: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
  },
  medicinesList: {
    flex: 1,
  },
  medicinesContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  medicineCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  medicineCardLow: {
    borderColor: COLORS.warning,
    borderWidth: 2,
  },
  lowBadge: {
    backgroundColor: COLORS.error,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 8,
  },
  lowBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.white,
  },
  medicineCardMedium: {
    borderColor: COLORS.warning,
    borderWidth: 1,
  },
  mediumBadge: {
    backgroundColor: COLORS.warning,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 8,
  },
  mediumBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },
  rawTextBox: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  rawTextLabel: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  rawTextValue: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
    fontStyle: "italic",
  },
  reviewedButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  reviewedButtonDone: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.background,
  },
  reviewedButtonText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "600",
    color: COLORS.primary,
  },
  reviewedButtonTextDone: {
    color: COLORS.success,
  },
  fieldLabel: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  nameInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: FONT_SIZES.medium,
    fontWeight: "600",
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  nameInputLow: {
    borderColor: COLORS.warning,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  detailLabel: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: FONT_SIZES.small,
    color: COLORS.text,
  },
  instructionsBox: {
    marginTop: 8,
    backgroundColor: COLORS.background,
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
  confirmButton: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    marginBottom: 32,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.large,
    fontWeight: "bold",
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: FONT_SIZES.large,
    fontWeight: "600",
    color: COLORS.error,
    textAlign: "center",
    marginBottom: 8,
  },
  errorHint: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.medium,
    fontWeight: "600",
  },
});
