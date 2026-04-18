import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { COLORS, FONT_SIZES } from "../../constants";
import { useLocaleStore, Locale } from "../../store/localeStore";
import { useAuthStore } from "../../store/authStore";
import { useLogout } from "../../hooks/useAuth";
import i18n from "../../i18n";

type LanguageOption = {
  code: Locale;
  nativeLabel: string;
};

const LANGUAGES: LanguageOption[] = [
  { code: "en", nativeLabel: "English" },
  { code: "hi", nativeLabel: "हिन्दी" },
];

function roleLabelKey(role: string): string {
  switch (role) {
    case "super_admin":
      return "settings.roleSuperAdmin";
    case "caregiver":
      return "settings.roleCaregiver";
    case "patient":
      return "settings.rolePatient";
    case "doctor":
      return "settings.roleDoctor";
    default:
      return "settings.roleCaregiver";
  }
}

export default function SettingsScreen() {
  const navigation = useNavigation();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  const [notifGranted, setNotifGranted] = useState<boolean | null>(null);

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setNotifGranted(status === "granted");
    });
  }, []);

  const handleSignOut = () => {
    Alert.alert(
      i18n.t("settings.signOutConfirmTitle"),
      i18n.t("settings.signOutConfirmMessage"),
      [
        { text: i18n.t("common.cancel"), style: "cancel" },
        {
          text: i18n.t("settings.signOut"),
          style: "destructive",
          onPress: () => logout.mutate(),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>{"←"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t("settings.title")}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {user && (
          <>
            <Text style={styles.sectionLabel}>
              {i18n.t("settings.profile")}
            </Text>
            <View style={styles.card}>
              <ProfileRow
                label={i18n.t("settings.name")}
                value={user.name ?? "—"}
              />
              <ProfileRow
                label={i18n.t("settings.phone")}
                value={user.phone_number}
              />
              <ProfileRow
                label={i18n.t("settings.role")}
                value={i18n.t(roleLabelKey(user.role))}
              />
              <ProfileRow
                label={i18n.t("settings.notifications")}
                value={
                  notifGranted === null
                    ? "—"
                    : notifGranted
                    ? i18n.t("settings.enabled")
                    : i18n.t("settings.disabled")
                }
                isLast
              />
            </View>
          </>
        )}

        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>
          {i18n.t("settings.language")}
        </Text>

        {LANGUAGES.map((lang) => {
          const selected = locale === lang.code;
          return (
            <TouchableOpacity
              key={lang.code}
              style={[styles.option, selected && styles.optionSelected]}
              activeOpacity={0.7}
              onPress={() => setLocale(lang.code)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              <Text
                style={[
                  styles.optionLabel,
                  selected && styles.optionLabelSelected,
                ]}
              >
                {lang.nativeLabel}
              </Text>
              {selected && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          disabled={logout.isPending}
          accessibilityRole="button"
        >
          {logout.isPending ? (
            <ActivityIndicator color={COLORS.error} />
          ) : (
            <Text style={styles.signOutText}>
              {i18n.t("settings.signOut")}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function ProfileRow({
  label,
  value,
  isLast,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.profileRow, !isLast && styles.profileRowBorder]}>
      <Text style={styles.profileLabel}>{label}</Text>
      <Text style={styles.profileValue}>{value}</Text>
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
  body: {
    padding: 16,
    paddingBottom: 48,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionLabelSpaced: {
    marginTop: 24,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 16,
  },
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  profileRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  profileLabel: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.textSecondary,
  },
  profileValue: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "right",
    marginLeft: 12,
  },
  option: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  optionLabel: {
    fontSize: FONT_SIZES.large,
    color: COLORS.text,
  },
  optionLabelSelected: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  checkmark: {
    fontSize: FONT_SIZES.large,
    color: COLORS.primary,
    fontWeight: "bold",
  },
  signOutButton: {
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.error,
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  signOutText: {
    fontSize: FONT_SIZES.large,
    color: COLORS.error,
    fontWeight: "600",
  },
});
