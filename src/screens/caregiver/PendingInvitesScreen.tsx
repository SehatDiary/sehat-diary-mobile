import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { COLORS, FONT_SIZES } from "../../constants";
import { CaregiverInvite, CaregiverStackParamList } from "../../types";
import {
  useGetPendingInvites,
  useAcceptInvite,
  useDeclineInvite,
} from "../../hooks/useCaregivers";
import i18n from "../../i18n";

type Nav = StackNavigationProp<CaregiverStackParamList, "PendingInvites">;

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function InviteCard({
  invite,
  onAccept,
  onDecline,
  isAccepting: acceptingId,
}: {
  invite: CaregiverInvite;
  onAccept: (id: number) => void;
  onDecline: (invite: CaregiverInvite) => void;
  isAccepting: number | null;
}) {
  const days = daysUntil(invite.expires_at);
  const isExpired = days === 0 && new Date(invite.expires_at) < new Date();
  const isUrgent = days < 2 && !isExpired;
  const isThisAccepting = acceptingId === invite.id;

  return (
    <View style={[styles.card, isExpired && styles.cardExpired]}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {invite.patient_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.inviteText}>
            {i18n.t("caregivers.invitedBy", { name: invite.patient_name })}
          </Text>
          <Text style={styles.inviteTextHi}>
            {i18n.t("caregivers.invitedByHi", { name: invite.patient_name })}
          </Text>
          {isExpired ? (
            <View style={styles.expiredBadge}>
              <Text style={styles.expiredText}>
                {i18n.t("caregivers.expired")}
              </Text>
            </View>
          ) : (
            <Text
              style={[styles.expiryText, isUrgent && styles.expiryUrgent]}
            >
              {i18n.t("caregivers.expiresIn", { days })}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.whatItMeansBox}>
        <Text style={styles.whatItMeansText}>
          {i18n.t("caregivers.whatItMeans")}
        </Text>
        <Text style={styles.whatItMeansTextHi}>
          {i18n.t("caregivers.whatItMeansHi")}
        </Text>
      </View>

      {!isExpired && (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.acceptButton}
            activeOpacity={0.7}
            disabled={isThisAccepting}
            onPress={() => onAccept(invite.id)}
          >
            {isThisAccepting ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.acceptButtonText}>
                {i18n.t("caregivers.accept")} {"\u2713"}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.declineButton}
            activeOpacity={0.7}
            disabled={isThisAccepting}
            onPress={() => onDecline(invite)}
          >
            <Text style={styles.declineButtonText}>
              {i18n.t("caregivers.decline")} {"\u2717"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function PendingInvitesScreen() {
  const navigation = useNavigation<Nav>();
  const { data, isLoading, isError, refetch } = useGetPendingInvites();
  const acceptMutation = useAcceptInvite();
  const declineMutation = useDeclineInvite();
  const [acceptingId, setAcceptingId] = React.useState<number | null>(null);

  const handleAccept = (id: number) => {
    setAcceptingId(id);
    acceptMutation.mutate(id, {
      onSuccess: () => {
        setAcceptingId(null);
        navigation.navigate("Dashboard");
      },
      onError: () => {
        setAcceptingId(null);
      },
    });
  };

  const handleDecline = (invite: CaregiverInvite) => {
    Alert.alert(
      i18n.t("caregivers.declineConfirmTitle"),
      i18n.t("caregivers.declineConfirmMessage", {
        name: invite.patient_name,
      }),
      [
        { text: i18n.t("common.cancel"), style: "cancel" },
        {
          text: i18n.t("caregivers.decline"),
          style: "destructive",
          onPress: () => declineMutation.mutate(invite.id),
        },
      ]
    );
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

  const invites = data || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>{"<"}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{i18n.t("caregivers.invitesTitle")}</Text>
      </View>

      {invites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>{"\u2709\uFE0F"}</Text>
          <Text style={styles.emptyText}>
            {i18n.t("caregivers.noInvites")}
          </Text>
          <Text style={styles.emptyTextHi}>
            {i18n.t("caregivers.noInvitesHi")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={invites}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <InviteCard
              invite={item}
              onAccept={handleAccept}
              onDecline={handleDecline}
              isAccepting={acceptingId}
            />
          )}
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
    fontWeight: "bold",
  },
  title: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: "bold",
    color: COLORS.white,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardExpired: {
    opacity: 0.6,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
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
  inviteText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "600",
    color: COLORS.text,
    lineHeight: 22,
  },
  inviteTextHi: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginTop: 2,
  },
  expiryText: {
    fontSize: 13,
    color: "#F57F17",
    marginTop: 6,
  },
  expiryUrgent: {
    color: COLORS.error,
    fontWeight: "600",
  },
  expiredBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
  },
  expiredText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.error,
  },
  whatItMeansBox: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  whatItMeansText: {
    fontSize: FONT_SIZES.small,
    color: COLORS.text,
    lineHeight: 20,
  },
  whatItMeansTextHi: {
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
  buttonRow: {
    marginTop: 14,
    gap: 10,
  },
  acceptButton: {
    backgroundColor: COLORS.success,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  acceptButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.large,
    fontWeight: "bold",
  },
  declineButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  declineButtonText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.medium,
    fontWeight: "600",
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: FONT_SIZES.large,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
  },
  emptyTextHi: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 4,
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
