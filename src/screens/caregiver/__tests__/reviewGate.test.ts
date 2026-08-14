import { canConfirm, countUnreviewedLowConfidence } from "../reviewGate";

const med = (confidence: "high" | "medium" | "low") => ({ confidence });

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

  it("allows confirmation for an empty extraction", () => {
    expect(canConfirm([], [])).toBe(true);
  });
});
