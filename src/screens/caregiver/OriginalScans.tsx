import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from "react-native";
import { COLORS, FONT_SIZES } from "../../constants";
import { Prescription, SessionLabReport } from "../../types";
import i18n from "../../i18n";

// The originals that were uploaded — the actual photograph of the prescription,
// and any lab report — shown above the extracted data.
//
// Everything the app knows about a visit is a reading of these images, so being
// able to check the source is what makes the rest trustworthy. Until now they
// were stored in R2 and never displayed anywhere.

export interface Scan {
  key: string;
  /** Presigned; expires in an hour, so it is never persisted. */
  uri: string;
  label: string;
  isPdf: boolean;
}

export function scansFrom(
  prescriptions: Prescription[],
  labReports: SessionLabReport[]
): Scan[] {
  const fromPrescriptions: Scan[] = prescriptions
    .filter((p) => !!p.image_url)
    .map((p) => ({
      key: `prescription-${p.id}`,
      uri: p.image_url as string,
      label: i18n.t("session.prescriptionScan"),
      isPdf: false,
    }));

  const fromReports: Scan[] = labReports.flatMap((report): Scan[] => {
    const name = String(report.lab_name || i18n.t("labReport.title"));

    // A report is either pages of images or a single PDF. A PDF cannot be
    // rendered by an image component, so it is marked and opened externally.
    if (report.pdf_url) {
      return [ { key: `lab-${report.id}-pdf`, uri: report.pdf_url, label: name, isPdf: true } ];
    }

    return report.image_urls.map((uri, index) => ({
      key: `lab-${report.id}-${index}`,
      uri,
      label: report.image_urls.length > 1 ? `${name} ${index + 1}` : name,
      isPdf: false,
    }));
  });

  return [...fromPrescriptions, ...fromReports];
}

export default function OriginalScans({
  prescriptions,
  labReports,
}: {
  prescriptions: Prescription[];
  labReports: SessionLabReport[];
}) {
  const scans = scansFrom(prescriptions, labReports);
  const [viewing, setViewing] = useState<Scan | null>(null);

  if (scans.length === 0) return null;

  const open = async (scan: Scan) => {
    if (!scan.isPdf) {
      setViewing(scan);
      return;
    }

    // Handed to whatever the device uses for PDFs. That also gives zoom, which
    // an in-app image view does not.
    try {
      await Linking.openURL(scan.uri);
    } catch {
      Alert.alert(i18n.t("session.couldNotOpenScan"));
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{i18n.t("session.originalScan")}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {scans.map((scan) => (
          <TouchableOpacity
            key={scan.key}
            style={styles.thumbCard}
            onPress={() => open(scan)}
            accessibilityRole="button"
            accessibilityLabel={scan.label}
          >
            {scan.isPdf ? (
              <View style={styles.pdfThumb}>
                <Text style={styles.pdfIcon}>{"\u{1F4C4}"}</Text>
                <Text style={styles.pdfLabel}>PDF</Text>
              </View>
            ) : (
              <Image source={{ uri: scan.uri }} style={styles.thumb} resizeMode="cover" />
            )}
            <Text style={styles.thumbLabel} numberOfLines={1}>
              {scan.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={!!viewing} transparent={false} onRequestClose={() => setViewing(null)}>
        <View style={styles.viewer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setViewing(null)}
            accessibilityRole="button"
            accessibilityLabel={i18n.t("common.close")}
          >
            <Text style={styles.closeText}>{i18n.t("common.close")}</Text>
          </TouchableOpacity>

          {viewing && (
            <Image
              source={{ uri: viewing.uri }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 10,
  },
  thumbCard: {
    marginRight: 12,
    width: 96,
  },
  thumb: {
    width: 96,
    height: 120,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  pdfThumb: {
    width: 96,
    height: 120,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  pdfIcon: { fontSize: 34 },
  pdfLabel: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontWeight: "600",
  },
  thumbLabel: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: "center",
  },
  viewer: {
    flex: 1,
    backgroundColor: "#000",
  },
  closeButton: {
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 20,
    alignSelf: "flex-start",
  },
  closeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.large,
    fontWeight: "600",
  },
  fullImage: {
    flex: 1,
    width: "100%",
  },
});
