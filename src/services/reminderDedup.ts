// Pure de-duplication logic for stacked reminders, kept free of expo-notifications
// imports so it can be unit-tested without the native module's side effects.

export interface PresentedReminder {
  identifier: string;
  adherenceLogId: string;
}

// Expo's push API exposes no collapse key, so repeat reminders for the same dose
// (up to 4 per MedicineReminderJob) can stack in the tray while the app is
// backgrounded. Given the tray contents, return the older copies to dismiss.
export function findStaleReminderIdentifiers(
  presented: PresentedReminder[],
  adherenceLogId: string,
  keepIdentifier: string
): string[] {
  return presented
    .filter(
      (n) => n.adherenceLogId === adherenceLogId && n.identifier !== keepIdentifier
    )
    .map((n) => n.identifier);
}
