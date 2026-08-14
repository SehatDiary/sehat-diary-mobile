import { hindiFirst, ownRecord } from "../patientText";

describe("hindiFirst", () => {
  it("prefers Hindi whenever it is present", () => {
    expect(hindiFirst("बीपी की दवा", "BP medicine")).toBe("बीपी की दवा");
  });

  it("falls back to English only when Hindi is missing or blank", () => {
    expect(hindiFirst(null, "BP medicine")).toBe("BP medicine");
    expect(hindiFirst("   ", "BP medicine")).toBe("BP medicine");
  });

  it("returns null when neither language has text", () => {
    expect(hindiFirst(null, null)).toBeNull();
    expect(hindiFirst("", "   ")).toBeNull();
  });
});

describe("ownRecord", () => {
  it("picks the self record regardless of position", () => {
    const members = [
      { id: 1, relation: "mother" },
      { id: 2, relation: "Self" },
    ];
    expect(ownRecord(members)?.id).toBe(2);
  });

  it("falls back to the first record when none is marked self", () => {
    const members = [{ id: 5, relation: "father" }, { id: 6, relation: null }];
    expect(ownRecord(members)?.id).toBe(5);
  });

  it("returns undefined for no records", () => {
    expect(ownRecord([])).toBeUndefined();
  });
});
