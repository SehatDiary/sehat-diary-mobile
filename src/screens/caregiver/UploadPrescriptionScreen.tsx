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
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { COLORS, FONT_SIZES } from "../../constants";
import {
  useUploadPrescription,
  useConfirmPrescription,
} from "../../hooks/usePrescriptions";
import { CaregiverStackParamList } from "../../types";
import i18n from "../../i18n";

type Route = RouteProp<CaregiverStackParamList, "UploadPrescription">;

type ScreenState = "idle" | "processing" | "review" | "error";

interface ExtractedMedicine {
  name: string;
  dosage: string | null;
  frequency: string | null;
  duration_days: number | null;
  instructions_hi: string | null;
}

export default function UploadPrescriptionScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { memberId, sessionId } = route.params;

  const uploadPrescription = useUploadPrescription();
  const confirmPrescription = useConfirmPrescription();

  const [screenState, setScreenState] = useState<ScreenState>("idle");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [prescriptionId, setPrescriptionId] = useState<number | null>(null);
  const [medicines, setMedicines] = useState<ExtractedMedicine[]>([]);
  const [lowConfidence, setLowConfidence] = useState<string[]>([]);
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
          setMedicines(extracted);
          setLowConfidence(data.low_confidence_medicines ?? []);
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

  const updateMedicineName = (index: number, name: string) => {
    setMedicines((prev) =>
      prev.map((m, i) => (i === index ? { ...m, name } : m))
    );
  };

  const handleConfirm = () => {
    if (!prescriptionId) return;

    confirmPrescription.mutate(
      {
        familyMemberId: memberId,
        healthSessionId: sessionId,
        prescriptionId,
        confirmedData: { medicines: medicines as unknown as Record<string, unknown>[] },
      },
      {
        onSuccess: () => navigation.goBack(),
        onError: () => Alert.alert(i18n.t("common.error")),
      }
    );
  };

  const resetToIdle = () => {
    setScreenState("idle");
    setImageUri(null);
    setPrescriptionId(null);
    setMedicines([]);
    setLowConfidence([]);
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
          lowConfidence={lowConfidence}
          onUpdateName={updateMedicineName}
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

function ReviewState({
  medicines,
  lowConfidence,
  onUpdateName,
  onConfirm,
  isConfirming,
}: {
  medicines: ExtractedMedicine[];
  lowConfidence: string[];
  onUpdateName: (index: number, name: string) => void;
  onConfirm: () => void;
  isConfirming: boolean;
}) {
  return (
    <View style={styles.reviewContainer}>
      <Text style={styles.reviewTitle}>
        {i18n.t("prescription.reviewTitle")}
      </Text>
      <Text style={styles.reviewHint}>
        {i18n.t("prescription.reviewHint")}
      </Text>

      <ScrollView
        style={styles.medicinesList}
        contentContainerStyle={styles.medicinesContent}
        keyboardShouldPersistTaps="handled"
      >
        {medicines.map((med, index) => {
          const isLow = lowConfidence.includes(med.name);
          return (
            <View
              key={index}
              style={[styles.medicineCard, isLow && styles.medicineCardLow]}
            >
              {isLow && (
                <View style={styles.lowBadge}>
                  <Text style={styles.lowBadgeText}>
                    ⚠ {i18n.t("prescription.lowConfidence")}
                  </Text>
                </View>
              )}
              <Text style={styles.fieldLabel}>
                {i18n.t("prescription.medicineName")}
              </Text>
              <TextInput
                style={[styles.nameInput, isLow && styles.nameInputLow]}
                value={med.name}
                onChangeText={(text) => onUpdateName(index, text)}
              />
              {med.dosage && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {i18n.t("session.dosage")}
                  </Text>
                  <Text style={styles.detailValue}>{med.dosage}</Text>
                </View>
              )}
              {med.frequency && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {i18n.t("session.frequency")}
                  </Text>
                  <Text style={styles.detailValue}>{med.frequency}</Text>
                </View>
              )}
              {med.duration_days && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {i18n.t("session.duration")}
                  </Text>
                  <Text style={styles.detailValue}>
                    {med.duration_days} {i18n.t("session.days")}
                  </Text>
                </View>
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
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        style={[styles.confirmButton, isConfirming && styles.confirmButtonDisabled]}
        onPress={onConfirm}
        disabled={isConfirming}
      >
        <Text style={styles.confirmText}>
          {isConfirming
            ? i18n.t("prescription.confirming")
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
    backgroundColor: COLORS.warning,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 8,
  },
  lowBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
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
