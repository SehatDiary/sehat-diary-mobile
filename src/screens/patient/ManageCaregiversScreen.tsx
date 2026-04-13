import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import { COLORS, FONT_SIZES } from "../../constants";
import { CaregiverConnection } from "../../types";
import {
  useGetMyCaregivers,
  useLookupPhone,
  useSendInvite,
  useRemoveConnection,
} from "../../hooks/useCaregivers";
import i18n from "../../i18n";

type SheetStep = "phone" | "found" | "not_found" | "already_connected" | "sent";

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function StatusBadge({ status }: { status: "accepted" | "pending" }) {
  const isActive = status === "accepted";
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: isActive ? "#E8F5E9" : "#FFF8E1" },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          { color: isActive ? COLORS.success : "#F57F17" },
        ]}
      >
        {isActive
          ? i18n.t("caregivers.statusActive")
          : i18n.t("caregivers.statusPending")}
      </Text>
    </View>
  );
}

function CaregiverCard({
  connection,
  onRemove,
}: {
  connection: CaregiverConnection;
  onRemove: (c: CaregiverConnection) => void;
}) {
  const [menuVisible, setMenuVisible] = useState(false);
  const isPending = connection.status === "pending";
  const displayName = connection.caregiver_name || connection.caregiver_phone_masked;

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(connection.caregiver_name || "?")[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardName}>{displayName}</Text>
          <Text style={styles.cardPhone}>
            {connection.caregiver_phone_masked}
          </Text>
          <StatusBadge status={connection.status} />
          {isPending && (
            <View style={styles.pendingInfo}>
              <Text style={styles.waitingText}>
                {i18n.t("caregivers.waitingAcceptance")}
              </Text>
              {connection.expires_at && (
                <Text style={styles.expiryText}>
                  {i18n.t("caregivers.expiresIn", {
                    days: daysUntil(connection.expires_at),
                  })}
                </Text>
              )}
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          activeOpacity={0.6}
          onPress={() => setMenuVisible(true)}
        >
          <Text style={styles.menuDots}>&#8942;</Text>
        </TouchableOpacity>
      </View>

      {menuVisible && (
        <Modal transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
          <TouchableOpacity
            style={styles.menuOverlay}
            activeOpacity={1}
            onPress={() => setMenuVisible(false)}
          >
            <View style={styles.menuPopup}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  onRemove(connection);
                }}
              >
                <Text style={styles.menuItemText}>
                  {isPending
                    ? i18n.t("caregivers.cancelInviteMenu")
                    : i18n.t("caregivers.removeCaregiverMenu")}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

function AddCaregiverSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState<SheetStep>("phone");
  const [phone, setPhone] = useState("");
  const lookupMutation = useLookupPhone();
  const inviteMutation = useSendInvite();

  const resetAndClose = () => {
    setStep("phone");
    setPhone("");
    lookupMutation.reset();
    inviteMutation.reset();
    onClose();
  };

  const handleSearch = () => {
    const fullPhone = phone.startsWith("+91") ? phone : `+91${phone}`;
    lookupMutation.mutate(fullPhone, {
      onSuccess: (result) => {
        if (result.already_connected) {
          setStep("already_connected");
        } else if (result.found) {
          setStep("found");
        } else {
          setStep("not_found");
        }
      },
    });
  };

  const handleSendInvite = () => {
    const fullPhone = phone.startsWith("+91") ? phone : `+91${phone}`;
    inviteMutation.mutate(fullPhone, {
      onSuccess: () => {
        setStep("sent");
      },
    });
  };

  const handleShareApp = () => {
    const message = "Sehat Diary install karo: https://sehatdiary.app";
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
    Linking.openURL(whatsappUrl).catch(() => {
      Linking.openURL(
        `sms:?body=${encodeURIComponent(message)}`
      );
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={resetAndClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.sheetOverlay}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={resetAndClose}
        />
        <View style={styles.sheetContainer}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>
            {i18n.t("caregivers.addCaregiverTitle")}
          </Text>

          {step === "phone" && (
            <View>
              <View style={styles.phoneRow}>
                <View style={styles.prefixBox}>
                  <Text style={styles.prefixText}>+91</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder={i18n.t("caregivers.enterPhone")}
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  phone.length < 10 && styles.buttonDisabled,
                ]}
                activeOpacity={0.7}
                disabled={phone.length < 10 || lookupMutation.isPending}
                onPress={handleSearch}
              >
                {lookupMutation.isPending ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {i18n.t("caregivers.search")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {step === "found" && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultIcon}>&#10003;</Text>
              <Text style={styles.resultText}>
                {i18n.t("caregivers.personFound")}
              </Text>
              <Text style={styles.resultTextHi}>
                {i18n.t("caregivers.personFoundHi")}
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.7}
                disabled={inviteMutation.isPending}
                onPress={handleSendInvite}
              >
                {inviteMutation.isPending ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {i18n.t("caregivers.sendInvite")}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={resetAndClose}>
                <Text style={styles.cancelLink}>
                  {i18n.t("common.cancel")}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {step === "not_found" && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultIconGray}>?</Text>
              <Text style={styles.resultText}>
                {i18n.t("caregivers.personNotFound")}
              </Text>
              <Text style={styles.resultTextHi}>
                {i18n.t("caregivers.personNotFoundHi")}
              </Text>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: COLORS.success }]}
                activeOpacity={0.7}
                onPress={handleShareApp}
              >
                <Text style={styles.primaryButtonText}>
                  {i18n.t("caregivers.shareAppLink")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={resetAndClose}>
                <Text style={styles.cancelLink}>
                  {i18n.t("common.cancel")}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {step === "already_connected" && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultIconGray}>i</Text>
              <Text style={styles.resultText}>
                {i18n.t("caregivers.alreadyConnected")}
              </Text>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: COLORS.textSecondary }]}
                activeOpacity={0.7}
                onPress={resetAndClose}
              >
                <Text style={styles.primaryButtonText}>
                  {i18n.t("caregivers.done")}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {step === "sent" && (
            <View style={styles.resultContainer}>
              <Text style={styles.successIcon}>&#10003;</Text>
              <Text style={styles.resultText}>
                {i18n.t("caregivers.inviteSent")}
              </Text>
              <Text style={styles.resultTextHi}>
                {i18n.t("caregivers.inviteSentHi")}
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.7}
                onPress={resetAndClose}
              >
                <Text style={styles.primaryButtonText}>
                  {i18n.t("caregivers.done")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function ManageCaregiversScreen() {
  const { data, isLoading, isError, refetch } = useGetMyCaregivers();
  const removeMutation = useRemoveConnection();
  const [sheetVisible, setSheetVisible] = useState(false);

  const handleRemove = (connection: CaregiverConnection) => {
    const isPending = connection.status === "pending";
    const title = isPending
      ? i18n.t("caregivers.cancelInviteConfirmTitle")
      : i18n.t("caregivers.removeConfirmTitle");
    const message = isPending
      ? i18n.t("caregivers.cancelInviteConfirmMessage")
      : `${i18n.t("caregivers.removeConfirmMessage", {
          name: connection.caregiver_name || connection.caregiver_phone_masked,
        })}\n\n${i18n.t("caregivers.removeConfirmMessageHi", {
          name: connection.caregiver_name || connection.caregiver_phone_masked,
        })}`;

    Alert.alert(title, message, [
      { text: i18n.t("common.cancel"), style: "cancel" },
      {
        text: i18n.t("common.confirm"),
        style: "destructive",
        onPress: () => removeMutation.mutate(connection.id),
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>{i18n.t("common.loading")}</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{i18n.t("common.error")}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>{i18n.t("common.retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const caregivers = data || [];
  const accepted = caregivers.filter((c) => c.status === "accepted");
  const pending = caregivers.filter((c) => c.status === "pending");
  const isEmpty = caregivers.length === 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{i18n.t("caregivers.title")}</Text>
        <Text style={styles.titleHi}>{i18n.t("caregivers.titleHi")}</Text>
      </View>

      {isEmpty ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>👨‍👩‍👧</Text>
          <Text style={styles.emptyText}>
            {i18n.t("caregivers.emptyTitle")}
          </Text>
          <Text style={styles.emptyTextHi}>
            {i18n.t("caregivers.emptyTitleHi")}
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            activeOpacity={0.7}
            onPress={() => setSheetVisible(true)}
          >
            <Text style={styles.emptyButtonText}>
              {i18n.t("caregivers.addCaregiver")}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={[
            ...(accepted.length > 0
              ? [{ type: "header" as const, label: i18n.t("caregivers.currentCaregivers") }]
              : []),
            ...accepted.map((c) => ({ type: "item" as const, connection: c })),
            ...(pending.length > 0
              ? [{ type: "header" as const, label: i18n.t("caregivers.pendingInvites") }]
              : []),
            ...pending.map((c) => ({ type: "item" as const, connection: c })),
          ]}
          keyExtractor={(item, index) =>
            item.type === "header" ? `h-${index}` : `c-${item.connection!.id}`
          }
          renderItem={({ item }) => {
            if (item.type === "header") {
              return (
                <Text style={styles.sectionHeader}>{item.label}</Text>
              );
            }
            return (
              <CaregiverCard
                connection={item.connection!}
                onRemove={handleRemove}
              />
            );
          }}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refetch}
              tintColor={COLORS.primary}
            />
          }
        />
      )}

      {/* FAB */}
      {!isEmpty && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => setSheetVisible(true)}
        >
          <Text style={styles.fabText}>+ {i18n.t("caregivers.addCaregiver")}</Text>
        </TouchableOpacity>
      )}

      <AddCaregiverSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      />
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
    paddingHorizontal: 32,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: FONT_SIZES.title,
    fontWeight: "bold",
    color: COLORS.white,
  },
  titleHi: {
    fontSize: FONT_SIZES.large,
    color: COLORS.white,
    opacity: 0.85,
    marginTop: 2,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionHeader: {
    fontSize: FONT_SIZES.large,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: "bold",
    color: COLORS.white,
  },
  cardContent: {
    flex: 1,
  },
  cardName: {
    fontSize: FONT_SIZES.large,
    fontWeight: "bold",
    color: COLORS.text,
  },
  cardPhone: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  pendingInfo: {
    marginTop: 4,
  },
  waitingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
  expiryText: {
    fontSize: 13,
    color: "#F57F17",
    marginTop: 2,
  },
  menuButton: {
    padding: 8,
  },
  menuDots: {
    fontSize: 24,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  menuOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  menuPopup: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingVertical: 8,
    minWidth: 200,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  menuItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  menuItemText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.error,
    fontWeight: "500",
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: FONT_SIZES.large,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
    lineHeight: 26,
  },
  emptyTextHi: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 24,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.large,
    fontWeight: "bold",
  },
  // FAB
  fab: {
    position: "absolute",
    bottom: 32,
    right: 20,
    left: 20,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  fabText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.large,
    fontWeight: "bold",
  },
  // Bottom sheet
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheetContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 20,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  prefixBox: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  prefixText: {
    fontSize: FONT_SIZES.large,
    color: COLORS.text,
    fontWeight: "600",
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: FONT_SIZES.large,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.large,
    fontWeight: "bold",
  },
  // Result steps
  resultContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  resultIcon: {
    fontSize: 48,
    color: COLORS.success,
    marginBottom: 12,
  },
  resultIconGray: {
    fontSize: 48,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  successIcon: {
    fontSize: 56,
    color: COLORS.success,
    marginBottom: 12,
  },
  resultText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 4,
  },
  resultTextHi: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
  },
  cancelLink: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  // Common
  loadingText: {
    marginTop: 12,
    fontSize: FONT_SIZES.large,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: FONT_SIZES.xlarge,
    color: COLORS.error,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.large,
    fontWeight: "600",
  },
});
