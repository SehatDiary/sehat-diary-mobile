import { findStaleReminderIdentifiers } from "../reminderDedup";

describe("reminder de-duplication", () => {
  const presented = [
    { identifier: "expo-1", type: "medicine_reminder", adherenceLogId: "31" },
    { identifier: "expo-2", type: "medicine_reminder", adherenceLogId: "31" },
    { identifier: "expo-3", type: "medicine_reminder", adherenceLogId: "99" },
    { identifier: "expo-4", type: "caregiver_alert", adherenceLogId: "31" },
  ];

  it("returns older copies of the same dose, keeping the newest", () => {
    expect(findStaleReminderIdentifiers(presented, "medicine_reminder", "31", "expo-2")).toEqual([
      "expo-1",
    ]);
  });

  it("never touches notifications for a different dose", () => {
    const stale = findStaleReminderIdentifiers(presented, "medicine_reminder", "31", "expo-2");
    expect(stale).not.toContain("expo-3");
  });

  it("never dismisses a caregiver alert sharing the dose id", () => {
    const stale = findStaleReminderIdentifiers(presented, "medicine_reminder", "31", "expo-2");
    expect(stale).not.toContain("expo-4");
  });

  it("returns nothing when the dose has no earlier copy", () => {
    expect(findStaleReminderIdentifiers(presented, "medicine_reminder", "99", "expo-3")).toEqual([]);
  });

  it("returns nothing for an empty tray", () => {
    expect(findStaleReminderIdentifiers([], "medicine_reminder", "31", "expo-1")).toEqual([]);
  });
});
