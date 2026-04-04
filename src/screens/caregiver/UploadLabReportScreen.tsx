import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { COLORS, FONT_SIZES } from "../../constants";
import { CaregiverStackParamList } from "../../types";
import {
  useUploadLabReport,
  useGetAnalysisStatus,
} from "../../hooks/useLabReports";
import i18n from "../../i18n";

type Nav = StackNavigationProp<CaregiverStackParamList, "UploadLabReport">;
type Route = RouteProp<CaregiverStackParamList, "UploadLabReport">;

type ScreenState = "idle" | "uploading" | "analyzing" | "error";

const MAX_IMAGES = 4;

export default function UploadLabReportScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { memberId, sessionId, prescribedTestId } = route.params;

  const uploadMutation = useUploadLabReport();

  const [screenState, setScreenState] = useState<ScreenState>("idle");
  const [images, setImages] = useState<string[]>([]);
  const [pdfFile, setPdfFile] = useState<string | null>(null);
  const [reportId, setReportId] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  const { data: statusData } = useGetAnalysisStatus(
    reportId,
    screenState === "analyzing"
  );

  useEffect(() => {
    if (!statusData || screenState !== "analyzing") return;

    if (statusData.status === "completed") {
      navigation.replace("LabReportResult", {
        memberId,
        sessionId,
        reportId: reportId!,
      });
    } else if (statusData.status === "failed") {
      setScreenState("error");
    }
  }, [statusData, screenState, navigation, memberId, sessionId, reportId]);

  const pickImage = useCallback(async (useCamera: boolean) => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert(i18n.t("labReport.maxImages"));
      return;
    }

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
          allowsMultipleSelection: true,
          selectionLimit: MAX_IMAGES - images.length,
        });

    if (result.canceled) return;

    const newUris = result.assets.map((a) => a.uri);
    setImages((prev) => [...prev, ...newUris].slice(0, MAX_IMAGES));
    setPdfFile(null);
  }, [images.length]);

  const pickPdf = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    setPdfFile(result.assets[0].uri);
    setImages([]);
  }, []);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAnalyze = () => {
    setScreenState("uploading");
    setUploadProgress({ current: 1, total: images.length || 1 });

    uploadMutation.mutate(
      {
        familyMemberId: memberId,
        healthSessionId: sessionId,
        images,
        pdfFile: pdfFile ?? undefined,
        prescribedTestId,
      },
      {
        onSuccess: (labReport) => {
          setReportId(labReport.id);
          setScreenState("analyzing");
        },
        onError: () => {
          setScreenState("error");
        },
      }
    );
  };

  const resetToIdle = () => {
    setScreenState("idle");
    setImages([]);
    setPdfFile(null);
    setReportId(null);
  };

  const hasContent = images.length > 0 || pdfFile !== null;

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

      {screenState === "idle" && (
        <IdleState
          images={images}
          pdfFile={pdfFile}
          onPickImage={pickImage}
          onPickPdf={pickPdf}
          onRemoveImage={removeImage}
          onAnalyze={handleAnalyze}
          hasContent={hasContent}
        />
      )}
      {screenState === "uploading" && (
        <UploadingState progress={uploadProgress} />
      )}
      {screenState === "analyzing" && <AnalyzingState />}
      {screenState === "error" && <ErrorState onRetry={resetToIdle} />}
    </View>
  );
}

function IdleState({
  images,
  pdfFile,
  onPickImage,
  onPickPdf,
  onRemoveImage,
  onAnalyze,
  hasContent,
}: {
  images: string[];
  pdfFile: string | null;
  onPickImage: (useCamera: boolean) => void;
  onPickPdf: () => void;
  onRemoveImage: (index: number) => void;
  onAnalyze: () => void;
  hasContent: boolean;
}) {
  return (
    <ScrollView contentContainerStyle={styles.idleContainer}>
      <View style={styles.infoBox}>
        <Text style={styles.infoIcon}>{"\u{2139}\u{FE0F}"}</Text>
        <Text style={styles.infoText}>{i18n.t("labReport.infoMultiPage")}</Text>
      </View>

      <View style={styles.thumbnailGrid}>
        {images.map((uri, index) => (
          <View key={uri} style={styles.thumbnailWrapper}>
            <Image source={{ uri }} style={styles.thumbnail} />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => onRemoveImage(index)}
            >
              <Text style={styles.removeButtonText}>{"\u00D7"}</Text>
            </TouchableOpacity>
          </View>
        ))}
        {pdfFile && (
          <View style={styles.thumbnailWrapper}>
            <View style={styles.pdfThumbnail}>
              <Text style={styles.pdfIcon}>{"\u{1F4C4}"}</Text>
              <Text style={styles.pdfLabel}>PDF</Text>
            </View>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => onRemoveImage(-1)}
            >
              <Text style={styles.removeButtonText}>{"\u00D7"}</Text>
            </TouchableOpacity>
          </View>
        )}
        {!pdfFile &&
          images.length < MAX_IMAGES &&
          Array.from({ length: MAX_IMAGES - images.length }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.emptyThumbnail}>
              <Text style={styles.emptyThumbnailText}>+</Text>
            </View>
          ))}
      </View>

      <TouchableOpacity
        style={styles.pickButton}
        onPress={() => onPickImage(true)}
      >
        <Text style={styles.pickButtonIcon}>{"\u{1F4F7}"}</Text>
        <Text style={styles.pickButtonText}>
          {i18n.t("labReport.takePhoto")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.pickButton, styles.pickButtonOutline]}
        onPress={() => onPickImage(false)}
      >
        <Text style={styles.pickButtonIcon}>{"\u{1F5BC}\u{FE0F}"}</Text>
        <Text style={[styles.pickButtonText, styles.pickButtonTextOutline]}>
          {i18n.t("labReport.chooseGallery")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.pickButton, styles.pickButtonOutline]}
        onPress={onPickPdf}
      >
        <Text style={styles.pickButtonIcon}>{"\u{1F4C4}"}</Text>
        <Text style={[styles.pickButtonText, styles.pickButtonTextOutline]}>
          {i18n.t("labReport.uploadPdf")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.analyzeButton,
          !hasContent && styles.analyzeButtonDisabled,
        ]}
        onPress={onAnalyze}
        disabled={!hasContent}
      >
        <Text style={styles.analyzeButtonText}>
          {i18n.t("labReport.analyzeReport")}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function UploadingState({
  progress,
}: {
  progress: { current: number; total: number };
}) {
  return (
    <View style={styles.centerState}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.stateText}>
        {i18n.t("labReport.uploading", {
          current: progress.current,
          total: progress.total,
        })}
      </Text>
    </View>
  );
}

function AnalyzingState() {
  return (
    <View style={styles.centerState}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.stateText}>{i18n.t("labReport.analyzing")}</Text>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.centerState}>
      <Text style={styles.errorIcon}>{"\u26A0\uFE0F"}</Text>
      <Text style={styles.errorTitle}>{i18n.t("labReport.errorTitle")}</Text>
      <Text style={styles.errorHint}>{i18n.t("labReport.errorHint")}</Text>

      <View style={styles.tipsContainer}>
        <View style={styles.tipRow}>
          <Text style={styles.tipIcon}>{"\u{1F4A1}"}</Text>
          <Text style={styles.tipText}>{i18n.t("labReport.tipLighting")}</Text>
        </View>
        <View style={styles.tipRow}>
          <Text style={styles.tipIcon}>{"\u{1F4F1}"}</Text>
          <Text style={styles.tipText}>{i18n.t("labReport.tipSteady")}</Text>
        </View>
        <View style={styles.tipRow}>
          <Text style={styles.tipIcon}>{"\u{1F441}\u{FE0F}"}</Text>
          <Text style={styles.tipText}>{i18n.t("labReport.tipVisible")}</Text>
        </View>
      </View>

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
    padding: 20,
    paddingBottom: 40,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#FFF8E1",
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.small,
    color: COLORS.text,
    lineHeight: 20,
  },
  thumbnailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
    gap: 10,
  },
  thumbnailWrapper: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: "visible",
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  removeButton: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.error,
    justifyContent: "center",
    alignItems: "center",
  },
  removeButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "bold",
    lineHeight: 16,
  },
  pdfThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  pdfIcon: {
    fontSize: 28,
  },
  pdfLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emptyThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyThumbnailText: {
    fontSize: 24,
    color: COLORS.border,
  },
  pickButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 10,
  },
  pickButtonOutline: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  pickButtonIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  pickButtonText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "600",
    color: COLORS.white,
  },
  pickButtonTextOutline: {
    color: COLORS.primary,
  },
  analyzeButton: {
    backgroundColor: COLORS.success,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  analyzeButtonDisabled: {
    opacity: 0.4,
  },
  analyzeButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.large,
    fontWeight: "bold",
  },

  // Center states (uploading, analyzing, error)
  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  stateText: {
    fontSize: FONT_SIZES.large,
    fontWeight: "600",
    color: COLORS.primary,
    marginTop: 16,
    textAlign: "center",
  },

  // Error
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
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
    marginBottom: 20,
  },
  tipsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    width: "100%",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  tipIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  tipText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
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
