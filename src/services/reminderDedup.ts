// Pure de-duplication logic for stacked reminders, kept free of expo-notifications
// imports so it can be unit-tested without the native module's side effects.

export interface PresentedReminder {
  identifier: string;
  type: string;
  adherenceLogId: string;
}

// Expo's push API exposes no collapse key, so repeat reminders for the same dose
// (up to 4 per MedicineReminderJob) can stack in the tray while the app is
// backgrounded. Given the tray contents, return the older copies to dismiss.
// Keyed on type as well as dose: a caregiver alert and a medicine reminder can
// share an adherence_log_id, and one must never dismiss the other.
export function findStaleReminderIdentifiers(
  presented: PresentedReminder[],
  type: string,
  adherenceLogId: string,
  keepIdentifier: string
): string[] {
  return presented
    .filter(
      (n) =>
        n.type === type &&
        n.adherenceLogId === adherenceLogId &&
        n.identifier !== keepIdentifier
    )
    .map((n) => n.identifier);
}
