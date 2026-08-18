import { ExtractedMedicine } from "../../types";

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

export function canConfirm(
  medicines: Pick<
    ExtractedMedicine,
    "confidence" | "frequency" | "dosing_interval" | "name"
  >[],
  reviewedIndexes: number[]
): boolean {
  if (medicines.length === 0) return false;

  return (
    countUnreviewedLowConfidence(medicines, reviewedIndexes) === 0 &&
    countMissingFrequency(medicines) === 0 &&
    countMissingName(medicines) === 0
  );
}
