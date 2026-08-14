import { mockClient, resetMockClient } from "../../testUtils/mockClient";

jest.mock("../client", () => ({
  __esModule: true,
  default: mockClient,
}));

import {
  uploadLabReport,
  getAnalysisStatus,
  getLabReport,
  getLabReports,
} from "../labReports";

// Fixtures: sehat_diary/docs/API_CONTRACT.md § Lab reports
const FINDING_FIXTURE = {
  id: 21,
  section: "Complete Blood Count",
  parameter_name: "HAEMOGLOBIN",
  hindi_name: "हीमोग्लोबिन (खून की मात्रा)",
  value: "10.1",
  unit: "gm%",
  normal_range_text: "F - 11.0 - 16.0",
  status: "low",
  status_color: "#E67E22",
  note: "Below normal.",
  hindi_note: "कम है।",
  is_critical: false,
};

beforeEach(resetMockClient);

describe("lab reports contract", () => {
  it("uploadLabReport adapts the FLAT create response (lab_report_id, no lab_report key)", async () => {
    mockClient.post.mockResolvedValue({
      data: {
        lab_report_id: 9,
        images_uploaded: 2,
        status: "pending",
        message: "Report uploaded. Analysis starting...",
        message_hindi: "रिपोर्ट अपलोड हो गई। जाँच शुरू हो रही है...",
      },
    });

    const result = await uploadLabReport(1, 2, ["file:///a.jpg", "file:///b.jpg"]);
    expect(result.id).toBe(9);
    expect(result.images_uploaded).toBe(2);
    expect(result.status).toBe("pending");
  });

  it("getAnalysisStatus returns the flat status payload with the real enum", async () => {
    mockClient.get.mockResolvedValue({
      data: {
        lab_report_id: 9,
        status: "processing",
        message: "Analyzing report...",
        message_hindi: "रिपोर्ट जाँची जा रही है...",
      },
    });

    const status = await getAnalysisStatus(9);
    expect(status.lab_report_id).toBe(9);
    expect(status.status).toBe("processing");
  });

  it("getLabReport flattens top-level findings/critical_findings/summaries siblings", async () => {
    mockClient.get.mockResolvedValue({
      data: {
        lab_report: {
          id: 9,
          lab_name: "City Lab",
          patient_name_on_report: "MRS. JYOTI BAGHEL",
          patient_match_status: "matched",
          report_date: "2026-08-10",
          report_type: "blood_test",
          image_urls: ["https://img/1.jpg"],
          pdf_url: null,
          analysis_status: "completed",
          has_critical_findings: true,
        },
        findings: [FINDING_FIXTURE],
        critical_findings: [],
        summaries: {
          hindi: "रिपोर्ट ठीक है।",
          english: "Report looks fine.",
          next_steps: "See your doctor.",
          next_steps_hindi: "डॉक्टर से मिलें।",
        },
        has_critical: true,
      },
    });

    const report = await getLabReport(1, 2, 9);
    expect(report.id).toBe(9);
    expect(report.patient_name_on_report).toBe("MRS. JYOTI BAGHEL");
    expect(report.patient_match_status).toBe("matched");
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].section).toBe("Complete Blood Count");
    expect(report.hindi_summary).toBe("रिपोर्ट ठीक है।");
    expect(report.english_summary).toBe("Report looks fine.");
    expect(report.next_steps_hindi).toBe("डॉक्टर से मिलें।");
    expect(report.analysis_status).toBe("completed");
  });

  it("getLabReports returns lab_report_summary items with analysis_status", async () => {
    mockClient.get.mockResolvedValue({
      data: {
        lab_reports: [
          {
            id: 9,
            lab_name: "City Lab",
            report_date: "2026-08-10",
            report_type: "blood_test",
            analysis_status: "pending",
            has_critical_findings: false,
            findings_count: 0,
            abnormal_count: 0,
            image_count: 2,
          },
        ],
      },
    });

    const reports = await getLabReports(1, 2);
    expect(reports).toHaveLength(1);
    expect(reports[0].analysis_status).toBe("pending");
    expect(reports[0].findings_count).toBe(0);
  });
});
