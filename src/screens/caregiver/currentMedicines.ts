import { MedicineDetail } from "../../types";

// Grouping the medicine list by time of day.
//
// A caregiver reading "what is Papa on" thinks in terms of the day: what he
// takes in the morning, what he takes at night. A flat alphabetical list makes
// them reconstruct that from a frequency column.
//
// The server sends the hours a medicine actually reminds at, read off its
// schedule — so this groups by what the phone will really do rather than
// re-deriving it from the frequency text and risking a different answer.

export type Slot = "morning" | "afternoon" | "evening" | "night";

export const SLOTS: Slot[] = ["morning", "afternoon", "evening", "night"];

export interface SlotGroup {
  slot: Slot;
  medicines: MedicineDetail[];
}

// Matches the server's standard slots: 08:00, 13:00, 17:00, 21:00.
export function slotForHour(hour: number): Slot {
  if (hour >= 5 && hour <= 11) return "morning";
  if (hour >= 12 && hour <= 15) return "afternoon";
  if (hour >= 16 && hour <= 19) return "evening";

  return "night";
}

function slotsFor(medicine: MedicineDetail): Slot[] {
  const slots = medicine.reminder_times
    .map((time) => Number(time.split(":")[0]))
    .filter((hour) => !Number.isNaN(hour))
    .map(slotForHour);

  return [...new Set(slots)];
}

/**
 * Medicines grouped by when they are taken. A twice-daily medicine appears in
 * two groups — that is the point: it tells the caregiver when, rather than
 * making them read it off a frequency string.
 *
 * Empty groups are dropped, so a member who takes nothing in the afternoon does
 * not get an empty heading.
 */
export function groupBySlot(medicines: MedicineDetail[]): SlotGroup[] {
  return SLOTS.map((slot) => ({
    slot,
    medicines: medicines.filter((medicine) => slotsFor(medicine).includes(slot)),
  })).filter((group) => group.medicines.length > 0);
}

/**
 * Medicines with no reminder time at all — an as-needed medicine, or one whose
 * frequency could not be read and is waiting on someone to supply it.
 *
 * Listed separately rather than dropped: a medicine nobody is reminded about is
 * exactly the one a caregiver needs to see.
 */
export function unscheduled(medicines: MedicineDetail[]): MedicineDetail[] {
  return medicines.filter((medicine) => slotsFor(medicine).length === 0);
}
