import { mockClient } from "../../testUtils/mockClient";

jest.mock("../client", () => ({ __esModule: true, default: mockClient }));

import { getMemberAdherenceHistory } from "../adherence";
import { AdherenceHistory } from "../../types";

// Shape pinned against sehat_diary/docs/API_CONTRACT.md. The screen reads a
// fixed seven days and derived per-dose status, so a server change to either
// would break it silently without this.
const RESPONSE: AdherenceHistory = {
  days: [
    {
      date: "2026-08-12",
      scheduled: 0,
      taken: 0,
      missed: 0,
      doses: [],
    },
    {
      date: "2026-08-18",
      scheduled: 2,
      taken: 1,
      missed: 1,
      doses: [
        {
          id: 31,
          prescribed_medicine_id: 12,
          medicine_name: "Amlodipine",
          dosage: "5mg",
          instructions_hi: "खाने के बाद लें",
          instructions_en: "Take after food",
          scheduled_at: "2026-08-18T08:00:00+05:30",
          status: "missed",
          recorded_status: "pending",
          marked_late: false,
          acknowledged_at: null,
          reminder_count: 2,
          notes: null,
          correctable: true,
        },
      ],
    },
  ],
};

describe("fetching a member's adherence history", () => {
  beforeEach(() => {
    mockClient.get.mockReset();
  });

  it("calls the member-scoped history path", async () => {
    mockClient.get.mockResolvedValue({ data: RESPONSE });

    await getMemberAdherenceHistory(7);

    expect(mockClient.get).toHaveBeenCalledWith(
      "/family_members/7/adherence/history"
    );
  });

  it("returns the days untouched", async () => {
    mockClient.get.mockResolvedValue({ data: RESPONSE });

    const history = await getMemberAdherenceHistory(7);

    expect(history.days).toHaveLength(2);
    expect(history.days[0].doses).toEqual([]);
  });

  it("keeps derived status separate from what the row stores", async () => {
    // The screen shows `status`; `recorded_status` exists so the derivation is
    // visible rather than looking like the server rewrote the record.
    mockClient.get.mockResolvedValue({ data: RESPONSE });

    const dose = (await getMemberAdherenceHistory(7)).days[1].doses[0];

    expect(dose.status).toBe("missed");
    expect(dose.recorded_status).toBe("pending");
    expect(dose.correctable).toBe(true);
  });
});
