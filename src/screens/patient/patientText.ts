// Hindi-first text selection for the patient surface.
//
// Papa reads Hindi; English is a fallback only when the Hindi text is missing,
// never a default. Kept pure so the rule is unit-tested rather than re-derived
// inline on every screen.
export function hindiFirst(
  hindi: string | null | undefined,
  english: string | null | undefined
): string | null {
  const hi = hindi?.trim();
  if (hi) return hi;

  const en = english?.trim();
  return en || null;
}

// The patient's own record among their family members. A patient normally owns
// exactly one ("self"); if the data is unusual, prefer a self-relation record
// and otherwise fall back to the first one rather than showing nothing.
export function ownRecord<T extends { relation?: string | null }>(
  members: T[]
): T | undefined {
  return members.find((m) => m.relation?.toLowerCase() === "self") ?? members[0];
}
