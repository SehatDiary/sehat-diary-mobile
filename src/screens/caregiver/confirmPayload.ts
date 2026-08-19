import { ExtractedMedicine } from "../../types";

// Building what gets sent when a prescription is confirmed.
//
// The server reads thirteen top-level keys and the app used to send one, so the
// doctor, the visit date, the tests, the referrals and the instructions were all
// extracted and then thrown away. This assembles the whole thing, with the
// reviewer's corrections layered on top.
//
// Kept out of the component because it is the part that can be got wrong
// silently: a dropped key here loses data with nothing on screen to show for it.

/** Visit-level fields the reviewer can correct before saving. */
export interface VisitEdits {
  doctor_name: string;
  hospital_clinic: string;
  /** DD/MM/YYYY — the only format the server parses. */
  visit_date: string;
}

export const emptyVisitEdits = (): VisitEdits => ({
  doctor_name: "",
  hospital_clinic: "",
  visit_date: "",
});

export function visitEditsFrom(
  extracted: Record<string, unknown> | null | undefined
): VisitEdits {
  const text = (key: string) => {
    const value = extracted?.[key];
    return typeof value === "string" ? value : "";
  };

  return {
    doctor_name: text("doctor_name"),
    hospital_clinic: text("hospital_clinic"),
    visit_date: text("visit_date"),
  };
}

// The server parses exactly "%d/%m/%Y" and falls back to today on anything else,
// silently. A visit date that quietly becomes today is the bug this ticket
// exists to fix, so a malformed one is caught here rather than discovered later.
const DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export function isValidVisitDate(value: string): boolean {
  if (!value.trim()) return true; // absent is fine; the server uses today

  const match = value.trim().match(DATE_PATTERN);
  if (!match) return false;

  const [, day, month, year] = match.map(Number);
  if (month < 1 || month > 12 || day < 1) return false;

  // Rejects 31/02, which Date would roll forward into March rather than refuse.
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * The full confirm payload: everything extracted, with the reviewer's medicine
 * list and visit corrections applied.
 *
 * Unknown keys are carried through untouched. The server gains fields over time
 * and a client that only forwards what it recognises starts losing them again.
 */
export function buildConfirmedData(
  extracted: Record<string, unknown> | null | undefined,
  medicines: ExtractedMedicine[],
  visit: VisitEdits
): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...(extracted ?? {}) };

  payload.medicines = medicines;

  // An empty edit means "the prescription did not say", which the server should
  // see as absent rather than as an empty string it will try to parse.
  payload.doctor_name = visit.doctor_name.trim() || null;
  payload.hospital_clinic = visit.hospital_clinic.trim() || null;
  payload.visit_date = visit.visit_date.trim() || null;

  return payload;
}
