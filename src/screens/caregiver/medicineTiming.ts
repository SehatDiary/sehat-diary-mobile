// The `timing` field is one string on the wire, but it answers two different
// questions: which slots of the day the dose falls in (morning, night, …) and
// how it relates to food (before or after). A medicine taken morning AND night,
// after food, needs all three recorded — the old single-select chip row could
// hold exactly one of them.
//
// The server already reads it this way: ReminderSchedulerService scans the
// structured fields for every slot word they contain and ignores food relations
// when placing doses. So "morning, night, after food" schedules 8am and 9pm and
// keeps the food instruction — no server change needed, only this composition.

export type TimeSlot = "morning" | "afternoon" | "evening" | "night";
export type FoodRelation = "before food" | "after food";

/** Chronological, matching the server's SLOT_WORDS order. */
export const TIME_SLOTS: TimeSlot[] = [
  "morning",
  "afternoon",
  "evening",
  "night",
];

// Synonyms mirror the server's SLOT_WORDS: extraction writes "bedtime" or
// "after breakfast" as readily as the canonical words, and the chips should
// light up for whatever it wrote.
const SLOT_MATCHERS: [TimeSlot, RegExp][] = [
  ["morning", /\b(?:morning|breakfast)\b/],
  ["afternoon", /\b(?:noon|afternoon|lunch)\b/],
  ["evening", /\bevening\b/],
  ["night", /\b(?:night|dinner|bedtime|sleep)\b/],
];

// "meal" alongside "food" because extraction writes "After Meal" for the 0-0-1
// grid shorthand on Indian prescriptions.
const FOOD_MATCHERS: [FoodRelation, RegExp][] = [
  ["before food", /\bbefore\s+(?:food|meals?|eating)\b/],
  ["after food", /\bafter\s+(?:food|meals?|eating)\b/],
];

export interface ParsedTiming {
  slots: TimeSlot[];
  food: FoodRelation | null;
}

export function parseTiming(timing: string | null | undefined): ParsedTiming {
  const text = (timing ?? "").toLowerCase();

  return {
    slots: SLOT_MATCHERS.filter(([, pattern]) => pattern.test(text)).map(
      ([slot]) => slot
    ),
    food: FOOD_MATCHERS.find(([, pattern]) => pattern.test(text))?.[0] ?? null,
  };
}

/**
 * The canonical string form: slots in day order, food relation last, comma
 * separated. Word boundaries are all the server needs, so this stays readable
 * as English too. Nothing selected is null, not "" — the server treats absent
 * as "the prescription did not say".
 */
export function composeTiming(
  slots: TimeSlot[],
  food: FoodRelation | null
): string | null {
  const ordered = TIME_SLOTS.filter((slot) => slots.includes(slot));
  const parts: string[] = [...ordered, ...(food ? [food] : [])];

  return parts.length > 0 ? parts.join(", ") : null;
}

/** Timing with one slot toggled — multi-select, unlike the food relation. */
export function toggleSlot(
  timing: string | null | undefined,
  slot: TimeSlot
): string | null {
  const { slots, food } = parseTiming(timing);
  const next = slots.includes(slot)
    ? slots.filter((existing) => existing !== slot)
    : [...slots, slot];

  return composeTiming(next, food);
}

/**
 * Timing with the food relation set, or cleared when the selected one is
 * tapped again — a prescription often says nothing about food, and that must
 * stay expressible.
 */
export function toggleFood(
  timing: string | null | undefined,
  food: FoodRelation
): string | null {
  const parsed = parseTiming(timing);

  return composeTiming(parsed.slots, parsed.food === food ? null : food);
}
