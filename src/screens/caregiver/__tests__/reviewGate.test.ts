import {
  canConfirm,
  countUnreviewedLowConfidence,
  exceedsSlotLimit,
  isMeaningfulEdit,
  medicineStepComplete,
  needsFrequency,
  slotLimit,
} from "../reviewGate";

// Confirmable by default, so each test varies only the thing it is about.
const med = (
  confidence: "high" | "medium" | "low",
  overrides: Record<string, unknown> = {}
) => ({
  confidence,
  name: "Amlodipine",
  frequency: "once daily",
  dosing_interval: "daily" as const,
  ...overrides,
});

describe("low-confidence review gate", () => {
  it("blocks confirmation while a low-confidence row is unreviewed", () => {
    const medicines = [med("high"), med("low"), med("medium")];

    expect(countUnreviewedLowConfidence(medicines, [])).toBe(1);
    expect(canConfirm(medicines, [])).toBe(false);
  });

  it("allows confirmation once every low row is reviewed", () => {
    const medicines = [med("low"), med("low")];

    expect(canConfirm(medicines, [0])).toBe(false);
    expect(canConfirm(medicines, [0, 1])).toBe(true);
  });

  it("never blocks on medium or high rows", () => {
    const medicines = [med("high"), med("medium"), med("high")];

    expect(countUnreviewedLowConfidence(medicines, [])).toBe(0);
    expect(canConfirm(medicines, [])).toBe(true);
  });

  it("counts by row, so duplicate names are gated independently", () => {
    // Two rows can carry the same medicine name; reviewing one must not
    // silently clear the other.
    const medicines = [med("low"), med("low")];

    expect(countUnreviewedLowConfidence(medicines, [1])).toBe(1);
  });

  it("blocks confirmation when every row has been deleted", () => {
    // Rows can now be removed, and confirming nothing is not a thing to do —
    // the server rejects an empty medicines list anyway.
    expect(canConfirm([], [])).toBe(false);
  });
});

describe("a schedule the app can actually place", () => {
  it("blocks a row whose frequency was never stated", () => {
    // The server refuses to invent a schedule and flags the medicine instead,
    // so a row confirmed blank here reminds nobody, silently.
    expect(canConfirm([med("high", { frequency: null })], [])).toBe(false);
  });

  it("treats whitespace as missing", () => {
    expect(needsFrequency({ frequency: "   ", dosing_interval: "daily" })).toBe(true);
  });

  it("exempts an as-needed medicine", () => {
    // "SOS" schedules nothing by design — a complete instruction, not a gap.
    const medicines = [med("high", { frequency: null, dosing_interval: "as_needed" })];

    expect(canConfirm(medicines, [])).toBe(true);
  });

  it("blocks a row left without a name", () => {
    const medicines = [med("high"), med("high", { name: "  " })];

    expect(canConfirm(medicines, [])).toBe(false);
  });

  it("allows a fully specified row", () => {
    expect(canConfirm([med("high")], [])).toBe(true);
  });
});

describe("slot-count validation", () => {
  it("maps each canonical frequency to its dose count", () => {
    expect(slotLimit("once daily")).toBe(1);
    expect(slotLimit("thrice daily")).toBe(3);
    expect(slotLimit(null)).toBeNull();
  });

  it("reads frequency the way the server does, not by exact string", () => {
    // frequency is a free extraction string: the server downcases and
    // word-matches, so the gate must too — an exact-match gate would skip
    // exactly the rows the server still truncates.
    expect(slotLimit("Once daily")).toBe(1);
    expect(slotLimit("twice a day")).toBe(2);
    expect(slotLimit("once daily (night only)")).toBe(1);
    expect(slotLimit("2 times daily")).toBe(2);
    expect(slotLimit("every morning")).toBeNull();
  });

  it("counts the doses in a grid frequency", () => {
    // "1-0-1" is the Indian prescription's morning-afternoon-night grid:
    // a dose per non-zero position.
    expect(slotLimit("1-0-1")).toBe(2);
    expect(slotLimit("0-0-1")).toBe(1);
    expect(slotLimit("1-1-1")).toBe(3);
    expect(slotLimit("0-0-0")).toBeNull();
  });

  it("flags more times of day than the frequency prescribes", () => {
    expect(
      exceedsSlotLimit({ frequency: "once daily", timing: "morning, night" })
    ).toBe(true);
  });

  it("allows exactly as many, or fewer", () => {
    // Fewer is real information, not a gap: the server tops up from its
    // standard spread.
    expect(
      exceedsSlotLimit({ frequency: "twice daily", timing: "morning, night" })
    ).toBe(false);
    expect(
      exceedsSlotLimit({ frequency: "twice daily", timing: "morning" })
    ).toBe(false);
    expect(exceedsSlotLimit({ frequency: "twice daily", timing: null })).toBe(
      false
    );
  });

  it("does not count the food relation as a time of day", () => {
    expect(
      exceedsSlotLimit({
        frequency: "once daily",
        timing: "morning, after food",
      })
    ).toBe(false);
  });

  it("reads a Hindi timing the same way", () => {
    expect(
      exceedsSlotLimit({ frequency: "once daily", timing: "सुबह और रात" })
    ).toBe(true);
  });

  it("has no limit when the frequency is absent or unreadable", () => {
    expect(exceedsSlotLimit({ frequency: null, timing: "morning, night" })).toBe(
      false
    );
    expect(
      exceedsSlotLimit({ frequency: "every morning", timing: "morning, night" })
    ).toBe(false);
  });

  it("exempts an as-needed medicine", () => {
    // The server schedules nothing for SOS, so a leftover frequency against
    // leftover timing slots is not a contradiction anyone will be reminded
    // by — blocking would force deleting real prescription guidance.
    expect(
      exceedsSlotLimit({
        frequency: "once daily",
        timing: "morning, night",
        dosing_interval: "as_needed",
      })
    ).toBe(false);
  });

  it("blocks the step and the confirm alike", () => {
    const contradicted = med("high", {
      frequency: "once daily",
      timing: "morning, night",
    });

    expect(medicineStepComplete(contradicted, false)).toBe(false);
    expect(canConfirm([contradicted], [])).toBe(false);
    expect(canConfirm([contradicted, med("high")], [])).toBe(false);
  });
});

describe("wizard step gate", () => {
  it("lets a complete high-confidence row move on", () => {
    expect(medicineStepComplete(med("high"), false)).toBe(true);
  });

  it("holds a row without a name", () => {
    expect(medicineStepComplete(med("high", { name: " " }), false)).toBe(false);
  });

  it("holds a row without a frequency, unless as-needed", () => {
    expect(medicineStepComplete(med("high", { frequency: null }), false)).toBe(
      false
    );
    expect(
      medicineStepComplete(
        med("high", { frequency: null, dosing_interval: "as_needed" }),
        false
      )
    ).toBe(true);
  });

  it("holds a low-confidence row until the caregiver has checked it", () => {
    expect(medicineStepComplete(med("low"), false)).toBe(false);
    expect(medicineStepComplete(med("low"), true)).toBe(true);
  });

  it("does not ask medium rows for an explicit check", () => {
    expect(medicineStepComplete(med("medium"), false)).toBe(true);
  });
});

describe("edit-counts-as-review", () => {
  it("counts a genuine correction", () => {
    expect(isMeaningfulEdit("Metfornin", "Metformin")).toBe(true);
  });

  it("ignores an edit that ends up back at the extracted value", () => {
    expect(isMeaningfulEdit("Metformin", "Metformin")).toBe(false);
    expect(isMeaningfulEdit("Metformin", "  Metformin  ")).toBe(false);
  });

  it("treats clearing the field as an edit", () => {
    expect(isMeaningfulEdit("Metformin", "")).toBe(true);
  });
});
