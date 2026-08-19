import { Medicine } from "../../types";

// A titration is one medicine whose dose changes partway through a course,
// written on the prescription as two consecutive rows — half a tablet for
// fifteen days, then a full tablet for seventy-five.
//
// The API returns a row per phase and API_CONTRACT.md asks clients to render
// them as one medicine with phases. Counting the rows instead reported more
// medicines than the prescription lists, and printing them as separate items
// showed the drug twice, which reads as the app having duplicated it.

const normalizeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

// Only consecutive rows group. The same drug prescribed twice on one page with
// something in between is two prescriptions, not two phases of one — the same
// rule the server applies when it staggers their start days.
export function groupIntoPhases(medicines: Medicine[]): Medicine[][] {
  const groups: Medicine[][] = [];

  medicines.forEach((med) => {
    const previous = groups[groups.length - 1];

    if (previous && normalizeName(previous[0].name) === normalizeName(med.name)) {
      previous.push(med);
    } else {
      groups.push([med]);
    }
  });

  return groups;
}

// The dose is what carries the phase — "1/2 tablet" against "1 tablet" — so a
// later phase leads with it and drops the dosage the whole course shares.
// Without the dose the two lines are identical and the reader sees a duplicate.
export function phaseParts(
  med: Medicine,
  isLaterPhase: boolean,
  durationLabel: string | null
): string[] {
  const parts = isLaterPhase
    ? [med.dose, med.frequency, durationLabel]
    : [med.dosage, med.dose, med.frequency, durationLabel];

  return parts.filter((part): part is string => Boolean(part));
}
