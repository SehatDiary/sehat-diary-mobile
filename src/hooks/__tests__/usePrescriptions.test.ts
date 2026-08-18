import { mockClient } from "../../testUtils/mockClient";

// The hook module pulls in the axios client, which cannot be imported under
// jest-expo (see src/api/__tests__ for the same mock).
jest.mock("../../api/client", () => ({
  __esModule: true,
  default: mockClient,
}));

import {
  confirmPrescriptionQueryKeys,
  medicineKey,
  medicineMutationKeys,
} from "../usePrescriptions";
import {
  familyMembersKey,
  familyMemberKey,
  healthSessionsKey,
  healthSessionKey,
  pendingActionsKey,
} from "../useFamilyMembers";
import {
  todaysMedicinesKey,
  memberAdherenceKey,
  memberAdherenceHistoryKey,
} from "../useAdherence";

const MEMBER_ID = 1;
const SESSION_ID = 6;

// Asserted against the very factories the reading queries use, so that adding
// an argument to any of those keys fails here instead of silently breaking the
// refetch — which is what left saved medicines invisible in the first place.
describe("query keys invalidated after a prescription confirm", () => {
  const keys = confirmPrescriptionQueryKeys(MEMBER_ID, SESSION_ID);
  const serialised = keys.map((key) => JSON.stringify(key));

  const covers = (key: unknown[]) => serialised.includes(JSON.stringify(key));

  it("refreshes the session list that renders prescriptions_count", () => {
    expect(covers(healthSessionsKey(MEMBER_ID))).toBe(true);
  });

  it("refreshes the session detail holding the new medicines", () => {
    expect(covers(healthSessionKey(MEMBER_ID, SESSION_ID))).toBe(true);
  });

  it("refreshes both adherence screens the new logs belong to", () => {
    expect(covers(todaysMedicinesKey())).toBe(true);
    expect(covers(memberAdherenceKey(MEMBER_ID))).toBe(true);
  });

  it("refreshes the member and dashboard views", () => {
    expect(covers(familyMembersKey())).toBe(true);
    expect(covers(familyMemberKey(MEMBER_ID))).toBe(true);
    expect(covers(pendingActionsKey())).toBe(true);
  });

  it("invalidates each key exactly once", () => {
    expect(new Set(serialised).size).toBe(serialised.length);
    expect(keys).toHaveLength(7);
  });
});

// Stopping or restarting changes what the patient's phone will do, so every
// screen showing that medicine or its doses has to refresh. Asserted against the
// same factories the reading queries use, so adding an argument to one fails
// here rather than silently leaving a stale screen behind.
describe("query keys invalidated after stopping or restarting a medicine", () => {
  const MEDICINE_ID = 12;
  const keys = medicineMutationKeys(MEDICINE_ID, MEMBER_ID);
  const serialised = keys.map((key) => JSON.stringify(key));
  const covers = (key: unknown[]) => serialised.includes(JSON.stringify(key));

  it("refreshes the medicine itself", () => {
    expect(covers(medicineKey(MEDICINE_ID))).toBe(true);
  });

  it("refreshes today's doses, which the stopped medicine leaves", () => {
    expect(covers(todaysMedicinesKey())).toBe(true);
  });

  it("refreshes both caregiver adherence views", () => {
    expect(covers(memberAdherenceKey(MEMBER_ID))).toBe(true);
    expect(covers(memberAdherenceHistoryKey(MEMBER_ID))).toBe(true);
  });

  it("refreshes the session list the medicine appears in", () => {
    expect(covers(healthSessionsKey(MEMBER_ID))).toBe(true);
  });

  it("still refreshes the medicine when the member is unknown", () => {
    // doctor_visit can be absent, and the medicine screen must still update.
    const withoutMember = medicineMutationKeys(MEDICINE_ID).map((k) => JSON.stringify(k));

    expect(withoutMember).toContain(JSON.stringify(medicineKey(MEDICINE_ID)));
    expect(withoutMember).toContain(JSON.stringify(todaysMedicinesKey()));
  });
});
