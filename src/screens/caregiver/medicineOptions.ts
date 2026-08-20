import { DosingInterval } from "../../types";
import { FoodRelation, TimeSlot } from "./medicineTiming";

// Predefined values for every field the reminder scheduler reads.
//
// Free text would be a trap here. The server matches English words to work out
// when to remind, so a caregiver typing "subah shaam" or "सुबह शाम" into a
// frequency box would see their edit saved and silently ignored. These lists are
// the canonical strings the scheduler understands; the labels are translated,
// the values are not.
//
// Keep in step with ReminderSchedulerService: DOSES_PER_DAY for frequency,
// SLOT_WORDS for timing, and the dosing_interval enum on PrescribedMedicine.

export interface Option<T extends string | number> {
  value: T;
  labelKey: string;
}

export const FREQUENCY_OPTIONS: Option<string>[] = [
  { value: "once daily", labelKey: "prescription.freqOnce" },
  { value: "twice daily", labelKey: "prescription.freqTwice" },
  { value: "thrice daily", labelKey: "prescription.freqThrice" },
  { value: "four times daily", labelKey: "prescription.freqFour" },
];

// Slot words place the dose; food relations do not, and the server treats them
// that way too — "after food" says when to eat around a dose, not what hour it
// falls at. They used to share one single-select row, which made "morning and
// night, after food" — the commonest instruction on an Indian prescription —
// impossible to record. Slots are multi-select; the food relation is its own
// either-or row.
export const TIME_OF_DAY_OPTIONS: Option<TimeSlot>[] = [
  { value: "morning", labelKey: "prescription.timingMorning" },
  { value: "afternoon", labelKey: "prescription.timingAfternoon" },
  { value: "evening", labelKey: "prescription.timingEvening" },
  { value: "night", labelKey: "prescription.timingNight" },
];

export const FOOD_OPTIONS: Option<FoodRelation>[] = [
  { value: "before food", labelKey: "prescription.timingBeforeFood" },
  { value: "after food", labelKey: "prescription.timingAfterFood" },
];

export const INTERVAL_OPTIONS: Option<DosingInterval>[] = [
  { value: "daily", labelKey: "prescription.intervalDaily" },
  { value: "weekly", labelKey: "prescription.intervalWeekly" },
  { value: "alternate_day", labelKey: "prescription.intervalAlternate" },
  { value: "as_needed", labelKey: "prescription.intervalAsNeeded" },
];

// 0 = Sunday, matching Ruby's Date#wday and the server's dosing_weekday.
export const WEEKDAY_OPTIONS: Option<number>[] = [
  { value: 0, labelKey: "prescription.sunday" },
  { value: 1, labelKey: "prescription.monday" },
  { value: 2, labelKey: "prescription.tuesday" },
  { value: 3, labelKey: "prescription.wednesday" },
  { value: 4, labelKey: "prescription.thursday" },
  { value: 5, labelKey: "prescription.friday" },
  { value: 6, labelKey: "prescription.saturday" },
];

/**
 * A blank medicine for the caregiver to fill in, for a row the AI missed
 * entirely. confidence is "low" so it goes through the same review gate as an
 * uncertain extraction — a hand-typed row has had no verification at all.
 */
export const blankMedicine = () => ({
  name: "",
  confidence: "low" as const,
  raw_text: null,
  strength: null,
  dose: null,
  frequency: null,
  timing: null,
  duration_days: null,
  dosing_interval: "daily" as DosingInterval,
  dosing_weekday: null,
});
