import { mockClient, resetMockClient } from "../../testUtils/mockClient";

jest.mock("../client", () => ({
  __esModule: true,
  default: mockClient,
}));

import { getPendingActions } from "../familyMembers";

beforeEach(resetMockClient);

// Fixture: sehat_diary/docs/API_CONTRACT.md § GET /api/v1/pending_actions
const PENDING_ACTIONS_FIXTURE = {
  pending_tests: [
    {
      id: 4,
      test_name: "HbA1c",
      test_type: "lab",
      urgency: "routine",
      due_by_date: null,
      doctor_name: "Dr. Sharma",
      visit_date: "2026-08-14",
      family_member_id: 2,
      family_member_name: "Maltibai",
      health_session_id: 1,
    },
  ],
  pending_referrals: [
    {
      id: 2,
      referred_to_name: "Dr. Verma",
      referred_to_specialty: "Cardiology",
      reason: "Murmur",
      urgency: "routine",
      doctor_name: "Dr. Sharma",
      visit_date: "2026-08-14",
      family_member_id: 2,
      family_member_name: "Maltibai",
      health_session_id: 1,
    },
  ],
  critical_lab_reports: [],
  upcoming_followups: [
    {
      id: 7,
      doctor_name: "Dr. Sharma",
      next_visit_date: "2026-08-24",
      days_remaining: 10,
      next_visit_instructions: "Bring BP diary",
      family_member_id: 2,
      family_member_name: "Maltibai",
      health_session_id: 1,
    },
  ],
  total_count: 3,
};

describe("pending actions contract", () => {
  it("returns all four buckets and total_count", async () => {
    mockClient.get.mockResolvedValue({ data: PENDING_ACTIONS_FIXTURE });

    const result = await getPendingActions();
    expect(result.total_count).toBe(3);
    expect(result.pending_tests[0].doctor_name).toBe("Dr. Sharma");
    expect(result.pending_tests[0].visit_date).toBe("2026-08-14");
    expect(result.pending_referrals[0].referred_to_specialty).toBe("Cardiology");
    expect(result.pending_referrals[0].reason).toBe("Murmur");
    expect(result.upcoming_followups[0].days_remaining).toBe(10);
    expect(result.upcoming_followups[0].next_visit_instructions).toBe("Bring BP diary");
  });

  it("degrades missing buckets to empty arrays (older backend)", async () => {
    mockClient.get.mockResolvedValue({
      data: { pending_tests: [], pending_referrals: [], critical_lab_reports: [] },
    });

    const result = await getPendingActions();
    expect(result.upcoming_followups).toEqual([]);
    expect(result.total_count).toBe(0);
  });
});
