import {
  canConfirm,
  countMissingFrequency,
  countMissingName,
  countUnreviewedLowConfidence,
  isMeaningfulEdit,
  needsFrequency,
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
    const medicines = [med("high", { frequency: null })];

    expect(countMissingFrequency(medicines)).toBe(1);
    expect(canConfirm(medicines, [])).toBe(false);
  });

  it("treats whitespace as missing", () => {
    expect(needsFrequency({ frequency: "   ", dosing_interval: "daily" })).toBe(true);
  });

  it("exempts an as-needed medicine", () => {
    // "SOS" schedules nothing by design — a complete instruction, not a gap.
    const medicines = [med("high", { frequency: null, dosing_interval: "as_needed" })];

    expect(countMissingFrequency(medicines)).toBe(0);
    expect(canConfirm(medicines, [])).toBe(true);
  });

  it("blocks a row left without a name", () => {
    const medicines = [med("high"), med("high", { name: "  " })];

    expect(countMissingName(medicines)).toBe(1);
    expect(canConfirm(medicines, [])).toBe(false);
  });

  it("allows a fully specified row", () => {
    expect(canConfirm([med("high")], [])).toBe(true);
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
