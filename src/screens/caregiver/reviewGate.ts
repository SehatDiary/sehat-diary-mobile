import { ExtractedMedicine } from "../../types";
import { parseTiming } from "./medicineTiming";

// The confirmation gate for AI-extracted medicines (CLAUDE.md hard limit:
// "Never auto-save AI extraction — user must always confirm").
//
// Confidence is read off the medicine itself rather than matched against a name
// list: the name is editable on this screen, so a name match cleared its own
// warning the moment the caregiver corrected a misread row.
export function countUnreviewedLowConfidence(
  medicines: Pick<ExtractedMedicine, "confidence">[],
  reviewedIndexes: number[]
): number {
  return medicines.reduce(
    (count, medicine, index) =>
      medicine.confidence === "low" && !reviewedIndexes.includes(index)
        ? count + 1
        : count,
    0
  );
}

// An edit counts as review only when the value actually changed — typing a
// character and undoing it must not clear the warning.
export function isMeaningfulEdit(
  originalName: string | undefined,
  nextName: string
): boolean {
  return (originalName ?? "").trim() !== nextName.trim();
}

// The scheduler places reminders from `frequency`. Where a prescription never
// stated one, the app asks rather than assuming — the server refuses to invent a
// schedule and flags the medicine instead, so a row confirmed with a blank
// frequency simply never reminds anyone. Blocking here is what stops that
// reaching a patient silently.
//
// An as-needed medicine is exempt: "SOS" schedules nothing by design, which is a
// complete instruction rather than a gap in one.
export function needsFrequency(
  medicine: Pick<ExtractedMedicine, "frequency" | "dosing_interval">
): boolean {
  if (medicine.dosing_interval === "as_needed") return false;

  return !(medicine.frequency ?? "").trim();
}

export function countMissingFrequency(
  medicines: Pick<ExtractedMedicine, "frequency" | "dosing_interval">[]
): number {
  return medicines.filter(needsFrequency).length;
}

// A row with no name is not a medicine. Blank rows are added deliberately, so
// this catches one the caregiver started and left.
export function countMissingName(
  medicines: Pick<ExtractedMedicine, "name">[]
): number {
  return medicines.filter((medicine) => !(medicine.name ?? "").trim()).length;
}

// How many doses a day each frequency prescribes. Kept in step with
// FREQUENCY_OPTIONS and the server's DOSES_PER_DAY.
const DOSES_PER_DAY: Record<string, number> = {
  "once daily": 1,
  "twice daily": 2,
  "thrice daily": 3,
  "four times daily": 4,
};

export function slotLimit(
  frequency: string | null | undefined
): number | null {
  return DOSES_PER_DAY[(frequency ?? "").trim()] ?? null;
}

// More times of day than the frequency prescribes doses is a contradiction:
// "once daily" at morning AND night is two doses or one missed instruction,
// and the server would resolve it by silently keeping only the earliest
// slots. Checked against state rather than blocked at the tap, because the
// contradiction also arises the other way round — slots picked first, then
// the frequency lowered.
//
// Fewer slots than doses is fine: "twice daily, morning" is real information,
// and the server tops up from its standard spread.
export function exceedsSlotLimit(
  medicine: Pick<ExtractedMedicine, "frequency" | "timing">
): boolean {
  const limit = slotLimit(medicine.frequency);
  if (limit === null) return false;

  return parseTiming(medicine.timing).slots.length > limit;
}

export function countExceedingSlotLimit(
  medicines: Pick<ExtractedMedicine, "frequency" | "timing">[]
): number {
  return medicines.filter(exceedsSlotLimit).length;
}

type GatedMedicine = Pick<
  ExtractedMedicine,
  "confidence" | "frequency" | "dosing_interval" | "name" | "timing"
>;

// Whether one medicine's wizard step can be left forwards: a name, a
// frequency (unless as-needed), times of day that don't contradict it, and —
// for a low-confidence extraction — the caregiver's explicit word that they
// checked it. Gating Next per step is what lets the final Confirm be an
// actual confirmation rather than the place every earlier omission is
// discovered.
export function medicineStepComplete(
  medicine: GatedMedicine,
  isReviewed: boolean
): boolean {
  if (!(medicine.name ?? "").trim()) return false;
  if (needsFrequency(medicine)) return false;
  if (exceedsSlotLimit(medicine)) return false;

  return medicine.confidence !== "low" || isReviewed;
}

// The summary's gate is the step gate applied to every row — one predicate,
// so Next and Confirm cannot drift apart: whatever lets each step pass lets
// the whole list confirm. The count helpers above exist only to word the
// disabled button.
export function canConfirm(
  medicines: GatedMedicine[],
  reviewedIndexes: number[]
): boolean {
  if (medicines.length === 0) return false;

  return medicines.every((medicine, index) =>
    medicineStepComplete(medicine, reviewedIndexes.includes(index))
  );
}
