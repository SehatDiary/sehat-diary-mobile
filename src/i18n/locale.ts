import i18n from "./index";

// Dates and times follow the language the user chose in Settings. Screens used
// to hardcode "hi-IN", so an English-speaking caregiver still saw Devanagari
// numerals and month names.
export function dateLocale(): string {
  return i18n.locale === "hi" ? "hi-IN" : "en-IN";
}
