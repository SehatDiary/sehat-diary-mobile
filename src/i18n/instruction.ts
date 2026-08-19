import i18n from "./index";

// Which language a dose instruction is shown in.
//
// The instruction is server data, not a UI string — "half a tablet after dinner
// for fifteen days" is generated with the prescription. It arrives in both
// languages, but a medicine may carry only one: anything scanned before the
// English half existed has Hindi alone, and extraction returns null for a field
// it could not produce.
//
// So this falls back rather than showing an empty line. A caregiver reading
// English is better served by the Hindi instruction than by nothing at all.

export interface Instructed {
  instructions_hi?: string | null;
  instructions_en?: string | null;
}

export function doseInstruction(medicine: Instructed): string | null {
  const hindi = medicine.instructions_hi?.trim();
  const english = medicine.instructions_en?.trim();

  const [preferred, fallback] =
    i18n.locale === "hi" ? [hindi, english] : [english, hindi];

  return preferred || fallback || null;
}
