import {
  buildConfirmedData,
  isValidVisitDate,
  visitEditsFrom,
  emptyVisitEdits,
} from "../confirmPayload";
import { ExtractedMedicine } from "../../../types";

// A realistic extraction, shaped like the printed prescription in the API's eval
// fixtures. Everything below `medicines` is what the app used to discard.
const EXTRACTED = {
  visit_date: "13/12/2025",
  doctor_name: "Pratik Uttarwar",
  hospital_clinic: "KIMS-KINGSWAY",
  patient_name: "Malti Patle",
  diagnosis: "Left hemiparesis",
  vitals: { bp: "127/71", pulse: 74 },
  follow_up_tests: [{ test_name: "Lipid Profile" }],
  referrals: [{ referred_to_name: "Dr. Patel" }],
  special_instructions: [{ description: "Reduce salt" }],
  next_visit: "13/03/2026",
  medicines: [{ name: "SARTEL H 40" }],
};

const medicine = (name: string): ExtractedMedicine => ({
  name,
  confidence: "high",
  raw_text: null,
});

describe("what gets sent when a prescription is confirmed", () => {
  const edits = visitEditsFrom(EXTRACTED);

  it("carries every field the server reads, not just medicines", () => {
    const payload = buildConfirmedData(EXTRACTED, [ medicine("SARTEL H 40") ], edits);

    // The exact set VisitBuilderService looks for.
    for (const key of [
      "visit_date", "doctor_name", "hospital_clinic", "patient_name", "diagnosis",
      "vitals", "follow_up_tests", "referrals", "special_instructions", "next_visit",
    ]) {
      expect(payload).toHaveProperty(key);
    }
  });

  it("keeps the tests and referrals that were never being saved", () => {
    const payload = buildConfirmedData(EXTRACTED, [], edits);

    expect(payload.follow_up_tests).toEqual([{ test_name: "Lipid Profile" }]);
    expect(payload.referrals).toEqual([{ referred_to_name: "Dr. Patel" }]);
    expect(payload.special_instructions).toEqual([{ description: "Reduce salt" }]);
  });

  it("carries keys it does not know about", () => {
    // The server gains fields over time; a client that forwards only what it
    // recognises starts silently losing them again.
    const payload = buildConfirmedData(
      { ...EXTRACTED, some_future_field: "keep me" },
      [],
      edits
    );

    expect(payload.some_future_field).toBe("keep me");
  });

  it("uses the reviewer's medicine list, not the extracted one", () => {
    const corrected = [ medicine("SARTEL H 40"), medicine("PANTOCID DSR") ];

    const payload = buildConfirmedData(EXTRACTED, corrected, edits);

    expect(payload.medicines).toEqual(corrected);
  });

  it("applies a corrected doctor, hospital and visit date", () => {
    const payload = buildConfirmedData(EXTRACTED, [], {
      doctor_name: "Mukesh Sancheti",
      hospital_clinic: "KIMS",
      visit_date: "01/08/2026",
    });

    expect(payload.doctor_name).toBe("Mukesh Sancheti");
    expect(payload.hospital_clinic).toBe("KIMS");
    expect(payload.visit_date).toBe("01/08/2026");
  });

  it("sends null rather than an empty string for a field left blank", () => {
    // The server treats blank as "not stated" and falls back; an empty string
    // would be handed to a date parser instead.
    const payload = buildConfirmedData(EXTRACTED, [], emptyVisitEdits());

    expect(payload.visit_date).toBeNull();
    expect(payload.doctor_name).toBeNull();
  });

  it("survives an extraction that returned nothing", () => {
    const payload = buildConfirmedData(null, [ medicine("X") ], emptyVisitEdits());

    expect(payload.medicines).toHaveLength(1);
    expect(payload.visit_date).toBeNull();
  });
});

describe("reading the visit fields out of an extraction", () => {
  it("takes the values the prescription stated", () => {
    expect(visitEditsFrom(EXTRACTED)).toEqual({
      doctor_name: "Pratik Uttarwar",
      hospital_clinic: "KIMS-KINGSWAY",
      visit_date: "13/12/2025",
    });
  });

  it("gives empty strings when the prescription said nothing", () => {
    expect(visitEditsFrom({})).toEqual(emptyVisitEdits());
    expect(visitEditsFrom(null)).toEqual(emptyVisitEdits());
  });

  it("ignores a value that is not text", () => {
    expect(visitEditsFrom({ doctor_name: 42 }).doctor_name).toBe("");
  });
});

// The server parses exactly "%d/%m/%Y" and falls back to today on anything else,
// silently — which is the bug this ticket exists to fix.
describe("validating the visit date", () => {
  it("accepts the format the server parses", () => {
    expect(isValidVisitDate("13/12/2025")).toBe(true);
    expect(isValidVisitDate("01/08/2026")).toBe(true);
  });

  it("treats an empty date as fine — the server uses today", () => {
    expect(isValidVisitDate("")).toBe(true);
    expect(isValidVisitDate("   ")).toBe(true);
  });

  it("rejects the American ordering, which would silently mean another day", () => {
    expect(isValidVisitDate("2025-12-13")).toBe(false);
    expect(isValidVisitDate("12-13-2025")).toBe(false);
  });

  it("rejects a day that does not exist", () => {
    // new Date(2025, 1, 31) rolls into March rather than refusing.
    expect(isValidVisitDate("31/02/2025")).toBe(false);
    expect(isValidVisitDate("32/01/2025")).toBe(false);
    expect(isValidVisitDate("01/13/2025")).toBe(false);
  });

  it("rejects a partial date", () => {
    expect(isValidVisitDate("13/12")).toBe(false);
    expect(isValidVisitDate("3/12/2025")).toBe(false);
  });
});
