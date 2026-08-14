import { findStaleReminderIdentifiers } from "../reminderDedup";

describe("reminder de-duplication", () => {
  const presented = [
    { identifier: "expo-1", adherenceLogId: "31" },
    { identifier: "expo-2", adherenceLogId: "31" },
    { identifier: "expo-3", adherenceLogId: "99" },
  ];

  it("returns older copies of the same dose, keeping the newest", () => {
    expect(findStaleReminderIdentifiers(presented, "31", "expo-2")).toEqual([
      "expo-1",
    ]);
  });

  it("never touches notifications for a different dose", () => {
    const stale = findStaleReminderIdentifiers(presented, "31", "expo-2");
    expect(stale).not.toContain("expo-3");
  });

  it("returns nothing when the dose has no earlier copy", () => {
    expect(findStaleReminderIdentifiers(presented, "99", "expo-3")).toEqual([]);
  });

  it("returns nothing for an empty tray", () => {
    expect(findStaleReminderIdentifiers([], "31", "expo-1")).toEqual([]);
  });
});
