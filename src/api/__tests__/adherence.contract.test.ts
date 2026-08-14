import { mockClient, resetMockClient } from "../../testUtils/mockClient";

jest.mock("../client", () => ({
  __esModule: true,
  default: mockClient,
}));

import {
  getTodaysMedicines,
  markTaken,
  getCriticalLabReports,
} from "../adherence";

// Fixtures: sehat_diary/docs/API_CONTRACT.md § Adherence
const ADHERENCE_LOG_FIXTURE = {
  id: 31,
  medicine_name: "Amlodipine",
  instructions_hi: "खाने के बाद लें",
  dosage: "5mg",
  frequency: "once daily",
  taken_at: "2026-08-14T08:00:00.000Z",
  taken: false,
  acknowledged_at: null,
  reminder_count: 2,
  notes: null,
};

beforeEach(resetMockClient);

describe("adherence contract", () => {
  it("getTodaysMedicines returns the bare grouped object (no envelope key)", async () => {
    mockClient.get.mockResolvedValue({
      data: {
        morning: [ADHERENCE_LOG_FIXTURE],
        afternoon: [],
        evening: [],
        night: [],
      },
    });

    const result = await getTodaysMedicines();
    expect(result.morning).toHaveLength(1);
    expect(result.morning[0].medicine_name).toBe("Amlodipine");
    expect(result.morning[0].reminder_count).toBe(2);
    expect(result.night).toEqual([]);
  });

  it("markTaken unwraps the adherence_log envelope", async () => {
    mockClient.patch.mockResolvedValue({
      data: {
        adherence_log: {
          ...ADHERENCE_LOG_FIXTURE,
          taken: true,
          acknowledged_at: "2026-08-14T08:05:00.000Z",
        },
      },
    });

    const log = await markTaken(31);
    expect(mockClient.patch).toHaveBeenCalledWith("/adherence/31/mark_taken");
    expect(log.taken).toBe(true);
    expect(log.acknowledged_at).toBe("2026-08-14T08:05:00.000Z");
  });

  it("getCriticalLabReports unwraps critical_lab_reports and degrades to [] on error", async () => {
    mockClient.get.mockResolvedValue({
      data: {
        critical_lab_reports: [
          {
            id: 9,
            lab_name: "City Lab",
            report_date: "2026-08-10",
            hindi_summary: "रिपोर्ट में ध्यान देने वाली बात है।",
            health_session_id: 1,
            created_at: "2026-08-10T10:00:00.000Z",
          },
        ],
      },
    });
    expect(await getCriticalLabReports()).toHaveLength(1);

    mockClient.get.mockRejectedValue(new Error("network"));
    expect(await getCriticalLabReports()).toEqual([]);
  });
});
