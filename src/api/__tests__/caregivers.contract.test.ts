import { mockClient, resetMockClient } from "../../testUtils/mockClient";

jest.mock("../client", () => ({
  __esModule: true,
  default: mockClient,
}));

import {
  getMyCaregivers,
  lookupPhone,
  sendInvite,
  getPendingInvites,
  getMyPatients,
} from "../caregivers";

beforeEach(resetMockClient);

// Fixtures: sehat_diary/docs/API_CONTRACT.md § Caregiver connections
describe("caregiver connections contract", () => {
  it("getMyCaregivers unwraps the caregivers envelope with expires_at", async () => {
    mockClient.get.mockResolvedValue({
      data: {
        caregivers: [
          {
            id: 3,
            name: "Rahul",
            phone_number: "+91*****88",
            status: "pending",
            invited_at: "2026-08-14T08:00:00.000Z",
            responded_at: null,
            expires_at: "2026-08-21T08:00:00.000Z",
            permission_level: "view_only",
          },
        ],
      },
    });

    const caregivers = await getMyCaregivers();
    expect(caregivers).toHaveLength(1);
    expect(caregivers[0].name).toBe("Rahul");
    expect(caregivers[0].phone_number).toBe("+91*****88");
    expect(caregivers[0].expires_at).toBe("2026-08-21T08:00:00.000Z");
  });

  it("lookupPhone returns the registered-based discriminated shapes", async () => {
    mockClient.post.mockResolvedValue({
      data: { registered: true, can_invite: true, message: "…", message_hindi: "…" },
    });
    const canInvite = await lookupPhone("+919999999999");
    expect(canInvite.registered).toBe(true);
    expect(canInvite.can_invite).toBe(true);

    mockClient.post.mockResolvedValue({
      data: { registered: true, invite_pending: true, message: "…", message_hindi: "…" },
    });
    const pending = await lookupPhone("+919999999999");
    expect(pending.invite_pending).toBe(true);

    mockClient.post.mockResolvedValue({
      data: { registered: false, message: "…", message_hindi: "…" },
    });
    const notRegistered = await lookupPhone("+919999999999");
    expect(notRegistered.registered).toBe(false);
  });

  it("sendInvite returns the flat success payload (no caregiver_connection key)", async () => {
    mockClient.post.mockResolvedValue({
      data: {
        success: true,
        connection_id: 3,
        expires_at: "2026-08-21T08:00:00.000Z",
        message: "Invite sent!",
        message_hindi: "Invite भेज दी!",
      },
    });

    const result = await sendInvite("+919999999999");
    expect(result.success).toBe(true);
    expect(result.connection_id).toBe(3);
  });

  it("getPendingInvites unwraps the pending_invites envelope", async () => {
    mockClient.get.mockResolvedValue({
      data: {
        pending_invites: [
          {
            id: 3,
            patient_name: "Papa",
            invited_at: "2026-08-14T08:00:00.000Z",
            expires_at: "2026-08-21T08:00:00.000Z",
            expires_in_hours: 167,
          },
        ],
      },
    });

    const invites = await getPendingInvites();
    expect(invites).toHaveLength(1);
    expect(invites[0].patient_name).toBe("Papa");
    expect(invites[0].expires_in_hours).toBe(167);
  });

  it("getMyPatients returns name + family_members per the contract", async () => {
    mockClient.get.mockResolvedValue({
      data: {
        patients: [
          {
            id: 3,
            name: "Papa",
            phone_number: "+91*****99",
            status: "accepted",
            responded_at: "2026-08-14T09:00:00.000Z",
            family_members: [{ id: 7, name: "Papa Self", relation: "self" }],
          },
        ],
      },
    });

    const patients = await getMyPatients();
    expect(patients[0].name).toBe("Papa");
    expect(patients[0].family_members).toHaveLength(1);
    expect(patients[0].family_members[0].relation).toBe("self");
  });
});
