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
import { doseInstruction } from "../../i18n/instruction";
import {
  canConfirm,
  countMissingFrequency,
  countMissingName,
  countUnreviewedLowConfidence,
  isMeaningfulEdit,
  medicineStepComplete,
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
  FOOD_OPTIONS,
  FREQUENCY_OPTIONS,
  INTERVAL_OPTIONS,
  Option,
  TIME_OF_DAY_OPTIONS,
  WEEKDAY_OPTIONS,
} from "./medicineOptions";
import { parseTiming, TimeSlot, toggleFood, toggleSlot } from "./medicineTiming";

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
  // The visit this ended up in. When the upload starts from the family member
  // page there is no session yet, and the server creates one — everything after
  // the upload has to use the id it returns rather than the route param.
  const [resolvedSessionId, setResolvedSessionId] = useState<number | null>(sessionId);
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
          setResolvedSessionId(data.health_session_id ?? sessionId);
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
    if (!prescriptionId || resolvedSessionId == null) return;

    confirmPrescription.mutate(
      {
        familyMemberId: memberId,
        healthSessionId: resolvedSessionId,
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
    // resolvedSessionId, not the route param: an upload started from the family
    // member page had no session until the server made one.
    const visitSessionId = resolvedSessionId as number;

    navigation.dispatch(
      CommonActions.reset({
        index: 2,
        routes: [
          { name: "Dashboard" },
          { name: "SessionDetail", params: { memberId, sessionId: visitSessionId } },
          { name: "VisitConfirmed", params: { memberId, sessionId: visitSessionId, doctorVisitId } },
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

// Checkbox semantics where OptionRow is radio: a twice-daily medicine is taken
// morning AND night, and a row that can hold one answer cannot record that.
function MultiOptionRow<T extends string | number>({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: Option<T>[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <View style={styles.optionBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map((option) => {
          const isSelected = selected.includes(option.value);

          return (
            <TouchableOpacity
              key={String(option.value)}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => onToggle(option.value)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {isSelected ? "✓ " : ""}
                {i18n.t(option.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// The label an option list gives a stored value, for the summary step.
function optionLabel<T extends string | number>(
  options: Option<T>[],
  value: T | null | undefined
): string | null {
  const option = options.find((candidate) => candidate.value === value);
  return option ? i18n.t(option.labelKey) : null;
}

function timingSummary(timing: string | null | undefined): string | null {
  const { slots, food } = parseTiming(timing);
  const parts = [
    ...slots.map((slot) => optionLabel(TIME_OF_DAY_OPTIONS, slot)),
    ...(food ? [optionLabel(FOOD_OPTIONS, food)] : []),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : null;
}

// One step at a time: the visit, then each medicine on its own page, then a
// summary that confirms. The old layout pinned the visit card above a scrolling
// medicine list, so no medicine was ever visible whole — and this screen is
// where doses and frequencies get checked, which is exactly where a half-seen
// card causes a wrong medicine schedule. Back and Next move freely once a step
// is complete, and the summary jumps back to any step to fix it.
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
  const [stepIndex, setStepIndex] = useState(0);

  // Steps: visit details, one per medicine, then the summary. Clamped rather
  // than tracked on removal: deleting the last medicine from its own step
  // would otherwise leave the index pointing past the end.
  const totalSteps = medicines.length + 2;
  const step = Math.min(stepIndex, totalSteps - 1);
  const isVisitStep = step === 0;
  const isSummaryStep = step === totalSteps - 1;
  const medicineIndex = step - 1;

  // A row missing a name or a frequency cannot be saved. The scheduler places
  // reminders from frequency, and the server refuses to invent one — so a row
  // confirmed blank would sit in the medicine list reminding nobody.
  const incompleteCount =
    countMissingFrequency(medicines) + countMissingName(medicines);
  // A date the server cannot parse falls back to today without saying so, which
  // is the failure this screen now exists to prevent.
  const dateIsValid = isValidVisitDate(visitEdits.visit_date);
  const confirmable = canConfirm(medicines, reviewedIndexes) && dateIsValid;

  // Forwards is gated per step so the caregiver settles each page before the
  // next, and the summary's Confirm is a confirmation rather than the place
  // every earlier omission surfaces. Backwards is always free.
  let nextEnabled = true;
  let nextHint: string | null = null;
  if (isVisitStep) {
    nextEnabled = dateIsValid;
    if (!nextEnabled) nextHint = i18n.t("prescription.visitDateInvalid");
  } else if (!isSummaryStep) {
    const medicine = medicines[medicineIndex];
    const isReviewed = reviewedIndexes.includes(medicineIndex);
    nextEnabled = medicineStepComplete(medicine, isReviewed);
    if (!nextEnabled) {
      const onlyUnreviewed =
        medicine.confidence === "low" &&
        !isReviewed &&
        (medicine.name ?? "").trim() !== "" &&
        !needsFrequency(medicine);
      nextHint = i18n.t(
        onlyUnreviewed
          ? "prescription.checkBeforeNext"
          : "prescription.stepIncomplete"
      );
    }
  }

  const stepTitle = isVisitStep
    ? i18n.t("prescription.visitDetails")
    : isSummaryStep
      ? i18n.t("prescription.confirmStep")
      : i18n.t("prescription.medicineStep", {
          current: medicineIndex + 1,
          total: medicines.length,
        });

  return (
    <View style={styles.reviewContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepCount}>
          {i18n.t("prescription.stepOf", { current: step + 1, total: totalSteps })}
        </Text>
        <Text style={styles.reviewTitle}>{stepTitle}</Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${((step + 1) / totalSteps) * 100}%` },
            ]}
          />
        </View>
      </View>

      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={styles.stepContent}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
      >
        {isVisitStep && (
          <VisitStep
            visitEdits={visitEdits}
            dateIsValid={dateIsValid}
            onUpdateVisit={onUpdateVisit}
          />
        )}

        {!isVisitStep && !isSummaryStep && (
          <MedicineStep
            medicine={medicines[medicineIndex]}
            index={medicineIndex}
            isReviewed={reviewedIndexes.includes(medicineIndex)}
            onUpdateField={onUpdateField}
            onMarkReviewed={onMarkReviewed}
            onRemove={onRemove}
          />
        )}

        {isSummaryStep && (
          <SummaryStep
            medicines={medicines}
            reviewedIndexes={reviewedIndexes}
            visitEdits={visitEdits}
            onJumpToStep={setStepIndex}
            onAdd={() => {
              // The new medicine's step: it lands at the end of the list, one
              // step before this summary.
              onAdd();
              setStepIndex(medicines.length + 1);
            }}
          />
        )}
      </ScrollView>

      {nextHint && <Text style={styles.navHint}>{nextHint}</Text>}

      <View style={styles.stepNav}>
        {step > 0 && (
          <TouchableOpacity
            style={styles.backStepButton}
            onPress={() => setStepIndex(step - 1)}
            accessibilityRole="button"
          >
            <Text style={styles.backStepText}>{i18n.t("common.back")}</Text>
          </TouchableOpacity>
        )}

        {!isSummaryStep ? (
          <TouchableOpacity
            style={[styles.nextButton, !nextEnabled && styles.confirmButtonDisabled]}
            onPress={() => setStepIndex(step + 1)}
            disabled={!nextEnabled}
            accessibilityRole="button"
          >
            <Text style={styles.confirmText}>{i18n.t("common.next")}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.nextButton,
              (isConfirming || !confirmable) && styles.confirmButtonDisabled,
            ]}
            onPress={onConfirm}
            disabled={isConfirming || !confirmable}
            accessibilityRole="button"
          >
            <Text style={styles.confirmText}>
              {isConfirming
                ? i18n.t("prescription.confirming")
                : unreviewedLowCount > 0
                  ? i18n.t("prescription.unreviewedCount", {
                      count: unreviewedLowCount,
                    })
                  : incompleteCount > 0
                    ? i18n.t("prescription.fixBeforeSaving", {
                        count: incompleteCount,
                      })
                    : i18n.t("prescription.confirmMedicines")}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// The visit itself. These were extracted and then thrown away at confirm, so
// the doctor was never recorded and every visit date became today.
function VisitStep({
  visitEdits,
  dateIsValid,
  onUpdateVisit,
}: {
  visitEdits: VisitEdits;
  dateIsValid: boolean;
  onUpdateVisit: (patch: Partial<VisitEdits>) => void;
}) {
  return (
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
  );
}

function MedicineStep({
  medicine: med,
  index,
  isReviewed,
  onUpdateField,
  onMarkReviewed,
  onRemove,
}: {
  medicine: ExtractedMedicine;
  index: number;
  isReviewed: boolean;
  onUpdateField: (index: number, patch: Partial<ExtractedMedicine>) => void;
  onMarkReviewed: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  const isLow = med.confidence === "low";
  const isMedium = med.confidence === "medium";
  const timing = parseTiming(med.timing);

  return (
    <View
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
      {/* Shown on every row, not only uncertain ones: this is the text the
          caregiver is checking the fields against. */}
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
            onChangeText={(text) => onUpdateField(index, { strength: text })}
          />
        </View>
        <View style={styles.inlineField}>
          <Text style={styles.fieldLabel}>{i18n.t("prescription.dose")}</Text>
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

      {/* Every field below is one the reminder scheduler reads, so all of them
          are predefined values rather than free text: a typed word the server
          does not recognise would save, display, and quietly never remind
          anyone. */}
      <OptionRow
        label={i18n.t("prescription.howOften")}
        options={FREQUENCY_OPTIONS}
        selected={med.frequency}
        onSelect={(frequency) => onUpdateField(index, { frequency })}
        required={needsFrequency(med)}
      />

      {/* Two questions, two rows. Times of day multi-select — a twice-daily
          medicine is morning AND night — while the food relation is a separate
          either-or, so "morning, night, after food" is finally sayable. */}
      <MultiOptionRow
        label={i18n.t("prescription.whenToTake")}
        options={TIME_OF_DAY_OPTIONS}
        selected={timing.slots}
        onToggle={(slot: TimeSlot) =>
          onUpdateField(index, { timing: toggleSlot(med.timing, slot) })
        }
      />

      <OptionRow
        label={i18n.t("prescription.foodRelation")}
        options={FOOD_OPTIONS}
        selected={timing.food}
        onSelect={(food) =>
          onUpdateField(index, { timing: toggleFood(med.timing, food) })
        }
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
          onSelect={(dosing_weekday) => onUpdateField(index, { dosing_weekday })}
        />
      )}

      {doseInstruction(med) && (
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsLabel}>
            {i18n.t("session.instructions")}
          </Text>
          <Text style={styles.instructionsText}>{doseInstruction(med)}</Text>
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
}

// The last look before saving: every medicine in one glance, each row a way
// back to its step. Rows that would block confirmation are flagged here too,
// so the disabled Confirm always has a visible reason above it.
function SummaryStep({
  medicines,
  reviewedIndexes,
  visitEdits,
  onJumpToStep,
  onAdd,
}: {
  medicines: ExtractedMedicine[];
  reviewedIndexes: number[];
  visitEdits: VisitEdits;
  onJumpToStep: (step: number) => void;
  onAdd: () => void;
}) {
  return (
    <View>
      <Text style={styles.reviewHintSummary}>
        {i18n.t("prescription.summaryHint")}
      </Text>

      <TouchableOpacity
        style={styles.summaryRow}
        onPress={() => onJumpToStep(0)}
        accessibilityRole="button"
      >
        <View style={styles.summaryRowBody}>
          <Text style={styles.summaryName}>
            {visitEdits.doctor_name.trim() ||
              i18n.t("prescription.notOnPrescription")}
          </Text>
          <Text style={styles.summaryDetail}>
            {[visitEdits.hospital_clinic.trim(), visitEdits.visit_date.trim()]
              .filter(Boolean)
              .join(" · ") || i18n.t("prescription.visitDetails")}
          </Text>
        </View>
        <Text style={styles.summaryChevron}>›</Text>
      </TouchableOpacity>

      {medicines.map((med, index) => {
        const complete = medicineStepComplete(
          med,
          reviewedIndexes.includes(index)
        );
        const details = [
          optionLabel(FREQUENCY_OPTIONS, med.frequency),
          timingSummary(med.timing),
        ].filter(Boolean);

        return (
          <TouchableOpacity
            key={index}
            style={[styles.summaryRow, !complete && styles.summaryRowWarn]}
            onPress={() => onJumpToStep(index + 1)}
            accessibilityRole="button"
          >
            <View style={styles.summaryRowBody}>
              <Text style={styles.summaryName}>
                {med.name.trim() || i18n.t("prescription.nameRequired")}
              </Text>
              <Text style={styles.summaryDetail}>
                {details.join(" · ") || i18n.t("prescription.notSet")}
              </Text>
            </View>
            <Text style={styles.summaryChevron}>
              {complete ? "›" : "⚠"}
            </Text>
          </TouchableOpacity>
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
  stepHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  stepCount: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  reviewTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: "bold",
    color: COLORS.text,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.cardBorder,
    marginTop: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  stepScroll: {
    flex: 1,
  },
  stepContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  reviewHintSummary: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  summaryRowWarn: {
    borderColor: COLORS.warning,
    borderWidth: 2,
  },
  summaryRowBody: {
    flex: 1,
  },
  summaryName: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "600",
    color: COLORS.text,
  },
  summaryDetail: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  summaryChevron: {
    fontSize: FONT_SIZES.large,
    color: COLORS.textSecondary,
    marginLeft: 10,
  },
  navHint: {
    fontSize: FONT_SIZES.small,
    color: COLORS.error,
    textAlign: "center",
    marginHorizontal: 16,
    marginBottom: 6,
  },
  stepNav: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 32,
  },
  backStepButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  backStepText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.large,
    fontWeight: "bold",
  },
  nextButton: {
    flex: 2,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
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
