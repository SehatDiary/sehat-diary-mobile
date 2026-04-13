import * as Notifications from "expo-notifications";
import { Platform, Alert } from "react-native";
import { updateFcmToken } from "../api/auth";
import { markTaken } from "../api/adherence";
import { navigate } from "../navigation/navigationRef";

// Show notifications when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Android notification channel for medicine reminders
if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("medicine-reminders", {
    name: "Medicine Reminders",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    sound: "default",
  });
}

export async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function registerPushToken(): Promise<string | null> {
  const granted = await requestPermissions();
  if (!granted) return null;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "55273078-ebe9-4838-9c31-33c964af5d46",
    });
    const token = tokenData.data;

    // Send token to backend
    await updateFcmToken(token);
    return token;
  } catch (e) {
    console.warn("Failed to get push token:", e);
    return null;
  }
}

export interface MedicineReminderData {
  type: "medicine_reminder";
  adherence_log_id: string;
  medicine_name: string;
  instructions_hi?: string;
  action: "mark_taken";
  action_url: string;
}

function isMedicineReminder(
  data: Record<string, unknown>
): boolean {
  return data.type === "medicine_reminder" && !!data.adherence_log_id;
}

export interface CaregiverAlertData {
  type: "caregiver_alert";
  adherence_log_id: string;
  member_name: string;
  medicine_name: string;
  family_member_id: string;
}

function isCaregiverAlert(data: Record<string, unknown>): boolean {
  return data.type === "caregiver_alert" && !!data.adherence_log_id;
}

export interface CaregiverInviteNotifData {
  type: "caregiver_invite";
  invite_id: string;
  patient_name: string;
}

export interface CaregiverAcceptedNotifData {
  type: "caregiver_accepted";
  caregiver_name: string;
}

export interface CaregiverDeclinedNotifData {
  type: "caregiver_declined";
}

function isCaregiverInviteNotif(data: Record<string, unknown>): boolean {
  return data.type === "caregiver_invite";
}

function isCaregiverAcceptedNotif(data: Record<string, unknown>): boolean {
  return data.type === "caregiver_accepted";
}

function isCaregiverDeclinedNotif(data: Record<string, unknown>): boolean {
  return data.type === "caregiver_declined";
}

export async function presentCaregiverAlert(
  data: CaregiverAlertData
): Promise<void> {
  const identifier = `caregiver-alert-${data.adherence_log_id}`;

  // Dismiss existing notification for same dose
  await Notifications.dismissNotificationAsync(identifier).catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: "\u0926\u0935\u093E\u0908 \u091B\u0942\u091F \u0917\u0908",
      body: `${data.member_name} \u0928\u0947 ${data.medicine_name} \u0928\u0939\u0940\u0902 \u0932\u0940`,
      data: data as unknown as Record<string, unknown>,
      ...(Platform.OS === "android" && {
        channelId: "medicine-reminders",
      }),
    },
    trigger: null,
  });
}

function handleCaregiverAlertTap(data: Record<string, unknown>): void {
  const memberId = parseInt(String(data.family_member_id), 10);
  const memberName = String(data.member_name ?? "");
  const adherenceLogId = parseInt(String(data.adherence_log_id), 10);

  navigate("MemberAdherence", {
    memberId,
    memberName,
    highlightAdherenceLogId: adherenceLogId,
  });
}

export async function handleMarkTaken(adherenceLogId: number): Promise<boolean> {
  try {
    await markTaken(adherenceLogId);
    return true;
  } catch {
    return false;
  }
}

// Dismiss and replace notification for same dose (no stacking)
export async function presentMedicineReminder(
  data: MedicineReminderData
): Promise<void> {
  const identifier = `reminder-${data.adherence_log_id}`;

  // Dismiss existing notification for same dose
  await Notifications.dismissNotificationAsync(identifier).catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: data.medicine_name,
      body: data.instructions_hi ?? "दवाई लेने का समय",
      data: data as unknown as Record<string, unknown>,
      categoryIdentifier: "medicine_reminder",
      ...(Platform.OS === "android" && {
        channelId: "medicine-reminders",
      }),
    },
    trigger: null, // Show immediately
  });
}

// Set up notification action categories (iOS action buttons)
export async function setupNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync("medicine_reminder", [
    {
      identifier: "mark_taken",
      buttonTitle: "मैंने ले ली ✓",
      options: { opensAppToForeground: false },
    },
  ]);
}

export function setupNotificationListeners(
  onMarkTakenSuccess?: () => void,
  onCaregiverInviteEvent?: () => void
): () => void {
  // Handle notification received while app is in foreground
  const receivedSub = Notifications.addNotificationReceivedListener(
    (notification) => {
      const data = notification.request.content.data as Record<string, unknown>;
      if (isMedicineReminder(data)) {
        presentMedicineReminder(data as unknown as MedicineReminderData);
      } else if (isCaregiverAlert(data)) {
        presentCaregiverAlert(data as unknown as CaregiverAlertData);
      } else if (isCaregiverAcceptedNotif(data)) {
        const name = String(data.caregiver_name ?? "");
        Alert.alert("", `${name} accepted your invite!`);
        onCaregiverInviteEvent?.();
      } else if (isCaregiverDeclinedNotif(data)) {
        Alert.alert("", "Invite was declined");
        onCaregiverInviteEvent?.();
      }
      // caregiver_invite foreground: the push notification banner is shown automatically
    }
  );

  // Handle user tapping notification or action button
  const responseSub = Notifications.addNotificationResponseReceivedListener(
    async (response) => {
      const data = response.notification.request.content.data as Record<
        string,
        unknown
      >;

      if (isCaregiverAlert(data)) {
        handleCaregiverAlertTap(data);
        await Notifications.dismissNotificationAsync(
          response.notification.request.identifier
        ).catch(() => {});
        return;
      }

      if (isCaregiverInviteNotif(data)) {
        navigate("PendingInvites", {});
        await Notifications.dismissNotificationAsync(
          response.notification.request.identifier
        ).catch(() => {});
        return;
      }

      if (!isMedicineReminder(data)) return;

      const adherenceLogId = parseInt(String(data.adherence_log_id), 10);
      const actionId = response.actionIdentifier;

      // User tapped the action button OR tapped the notification itself
      if (
        actionId === "mark_taken" ||
        actionId === Notifications.DEFAULT_ACTION_IDENTIFIER
      ) {
        const success = await handleMarkTaken(adherenceLogId);

        if (success) {
          // Dismiss the notification
          await Notifications.dismissNotificationAsync(
            response.notification.request.identifier
          ).catch(() => {});

          onMarkTakenSuccess?.();
        } else {
          Alert.alert("Error", "Could not mark medicine as taken. Try again.");
        }
      }
    }
  );

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}
