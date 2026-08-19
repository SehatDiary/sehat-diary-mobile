import { scansFrom } from "../OriginalScans";
import { Prescription, SessionLabReport } from "../../../types";

const prescription = (id: number, image_url: string | null): Prescription => ({
  id,
  health_session_id: 1,
  image_key: image_url ? `prescriptions/${id}.jpeg` : null,
  image_url,
  status: "confirmed",
  raw_extraction: {},
  medicines: [],
  created_at: "2026-08-19T00:00:00+05:30",
});

const labReport = (
  id: number,
  overrides: Partial<SessionLabReport> = {}
): SessionLabReport => ({
  id,
  lab_name: "Mahaveer Lab",
  report_date: "2026-08-19",
  analysis_status: "completed",
  has_critical_findings: false,
  image_keys: [],
  image_urls: [],
  pdf_key: null,
  pdf_url: null,
  ...overrides,
});

describe("collecting the originals for a visit", () => {
  it("includes the prescription photograph", () => {
    const scans = scansFrom([ prescription(5, "https://r2/signed-rx") ], []);

    expect(scans).toHaveLength(1);
    expect(scans[0].uri).toBe("https://r2/signed-rx");
    expect(scans[0].isPdf).toBe(false);
  });

  it("skips a prescription whose url could not be signed", () => {
    // presigned_url returns null when signing fails; an <Image> with a null uri
    // renders an empty box that looks like a broken app.
    expect(scansFrom([ prescription(5, null) ], [])).toEqual([]);
  });

  it("includes every page of a multi-page lab report", () => {
    const scans = scansFrom([], [
      labReport(3, { image_urls: [ "https://r2/p1", "https://r2/p2" ] }),
    ]);

    expect(scans).toHaveLength(2);
    expect(scans.map((s) => s.label)).toEqual([
      "Mahaveer Lab 1",
      "Mahaveer Lab 2",
    ]);
  });

  it("does not number a single-page report", () => {
    const scans = scansFrom([], [ labReport(3, { image_urls: [ "https://r2/p1" ] }) ]);

    expect(scans[0].label).toBe("Mahaveer Lab");
  });

  // The case that would otherwise render an empty box: React Native's Image
  // cannot display a PDF, so it has to be marked and opened externally.
  it("marks a PDF report so it is opened rather than rendered", () => {
    const scans = scansFrom([], [ labReport(3, { pdf_url: "https://r2/report.pdf" }) ]);

    expect(scans).toHaveLength(1);
    expect(scans[0].isPdf).toBe(true);
    expect(scans[0].uri).toBe("https://r2/report.pdf");
  });

  it("prefers the PDF when a report somehow has both", () => {
    const scans = scansFrom([], [
      labReport(3, { pdf_url: "https://r2/report.pdf", image_urls: [ "https://r2/p1" ] }),
    ]);

    expect(scans).toHaveLength(1);
    expect(scans[0].isPdf).toBe(true);
  });

  it("puts the prescription before the lab reports", () => {
    // The prescription is what the visit is about; the reports came after it.
    const scans = scansFrom(
      [ prescription(5, "https://r2/rx") ],
      [ labReport(3, { image_urls: [ "https://r2/p1" ] }) ]
    );

    expect(scans.map((s) => s.key)).toEqual([ "prescription-5", "lab-3-0" ]);
  });

  it("gives every scan a distinct key", () => {
    const scans = scansFrom(
      [ prescription(5, "https://r2/a"), prescription(6, "https://r2/b") ],
      [ labReport(3, { image_urls: [ "https://r2/p1", "https://r2/p2" ] }) ]
    );

    expect(new Set(scans.map((s) => s.key)).size).toBe(scans.length);
  });

  it("returns nothing for a visit with no uploads", () => {
    expect(scansFrom([], [])).toEqual([]);
  });
});
