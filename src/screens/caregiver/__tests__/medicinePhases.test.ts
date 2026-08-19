import { groupIntoPhases, phaseParts } from "../medicinePhases";
import { Medicine } from "../../../types";

let nextId = 1;

const medicine = (attrs: Partial<Medicine> = {}): Medicine => ({
  id: nextId++,
  name: "PROTHIADEN 50",
  dosage: "50mg",
  dose: "1 tablet",
  frequency: "0-0-1",
  duration_days: 75,
  instructions_hi: null,
  instructions_en: null,
  start_date: null,
  end_date: null,
  confidence: "high",
  raw_text: null,
  ...attrs,
});

describe("groupIntoPhases", () => {
  // The prescription that prompted this: six drugs, seven rows, and a caregiver
  // reading the seventh as the app having duplicated a medicine.
  it("folds the two rows of a titration into one medicine", () => {
    const groups = groupIntoPhases([
      medicine({ name: "SARTEL H 40" }),
      medicine({ dose: "1/2 tablet", duration_days: 15 }),
      medicine({ dose: "1 tablet", duration_days: 75 }),
      medicine({ name: "PANTOCID DSR" }),
    ]);

    expect(groups.map((group) => group.length)).toEqual([1, 2, 1]);
    expect(groups[1].map((med) => med.dose)).toEqual(["1/2 tablet", "1 tablet"]);
  });

  it("matches on the name regardless of case and punctuation", () => {
    const groups = groupIntoPhases([
      medicine({ name: "PROTHIADEN-50" }),
      medicine({ name: "prothiaden 50" }),
    ]);

    expect(groups).toHaveLength(1);
  });

  // Two courses of one drug separated by another are two prescriptions. The
  // server staggers their start days on the same rule, so merging them here
  // would disagree with the schedule the patient is actually reminded on.
  it("keeps non-consecutive rows of the same drug apart", () => {
    const groups = groupIntoPhases([
      medicine({ name: "PROTHIADEN 50" }),
      medicine({ name: "MINIPRESS XL 5MG" }),
      medicine({ name: "PROTHIADEN 50" }),
    ]);

    expect(groups).toHaveLength(3);
  });

  it("returns nothing for an empty list", () => {
    expect(groupIntoPhases([])).toEqual([]);
  });
});

describe("phaseParts", () => {
  it("leads a later phase with the dose and drops the shared dosage", () => {
    const parts = phaseParts(medicine({ dose: "1 tablet" }), true, "75 days");

    expect(parts).toEqual(["1 tablet", "0-0-1", "75 days"]);
  });

  it("gives the first phase the dosage as well", () => {
    const parts = phaseParts(medicine({ dose: "1/2 tablet" }), false, "15 days");

    expect(parts).toEqual(["50mg", "1/2 tablet", "0-0-1", "15 days"]);
  });

  // Without the dose the phases render identically, which is the bug.
  it("still distinguishes the phases when only the dose differs", () => {
    const first = phaseParts(medicine({ dose: "1/2 tablet" }), false, "15 days");
    const later = phaseParts(medicine({ dose: "1 tablet" }), true, "15 days");

    expect(first.join(" ")).not.toEqual(later.join(" "));
  });

  it("omits fields the prescription did not state", () => {
    const parts = phaseParts(medicine({ dose: null, frequency: null }), false, null);

    expect(parts).toEqual(["50mg"]);
  });
});
