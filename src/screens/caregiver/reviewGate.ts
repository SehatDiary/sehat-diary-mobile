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

export function canConfirm(
  medicines: Pick<ExtractedMedicine, "confidence">[],
  reviewedIndexes: number[]
): boolean {
  return countUnreviewedLowConfidence(medicines, reviewedIndexes) === 0;
}
