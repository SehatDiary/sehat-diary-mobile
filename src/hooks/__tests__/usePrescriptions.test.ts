import { mockClient } from "../../testUtils/mockClient";

// The hook module pulls in the axios client, which cannot be imported under
// jest-expo (see src/api/__tests__ for the same mock).
jest.mock("../../api/client", () => ({
  __esModule: true,
  default: mockClient,
}));

import { confirmPrescriptionQueryKeys } from "../usePrescriptions";

// These keys must stay in lockstep with the queryKey of every hook that reads
// data a confirm changes. If a screen's key is missing here, that screen keeps
// serving its pre-confirm cache and the saved medicines look lost.
describe("query keys invalidated after a prescription confirm", () => {
  const keys = confirmPrescriptionQueryKeys(1, 6);

  const contains = (expected: unknown[]) =>
    keys.some((key) => JSON.stringify(key) === JSON.stringify(expected));

  it("refreshes the session list that renders prescriptions_count", () => {
    // useGetHealthSessions
    expect(contains(["healthSessions", 1])).toBe(true);
  });

  it("refreshes the session detail holding the new medicines", () => {
    // useGetHealthSession
    expect(contains(["healthSession", 1, 6])).toBe(true);
  });

  it("refreshes both adherence screens the new logs belong to", () => {
    // useGetTodaysMedicines and useGetMemberAdherence
    expect(contains(["todaysMedicines"])).toBe(true);
    expect(contains(["memberAdherence", 1])).toBe(true);
  });

  it("refreshes the member and dashboard views", () => {
    // useGetFamilyMembers, useGetFamilyMember, useGetPendingActions
    expect(contains(["familyMembers"])).toBe(true);
    expect(contains(["familyMember", 1])).toBe(true);
    expect(contains(["pendingActions"])).toBe(true);
  });

  it("scopes member and session keys to the confirmed prescription", () => {
    expect(contains(["healthSessions", 2])).toBe(false);
    expect(contains(["healthSession", 1, 5])).toBe(false);
  });
});
