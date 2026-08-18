import { mockClient } from "../../testUtils/mockClient";

jest.mock("../../api/client", () => ({ __esModule: true, default: mockClient }));

import { familyMemberKey, familyMembersKey } from "../useFamilyMembers";
import { updateFamilyMember } from "../../api/familyMembers";

describe("updating a family member", () => {
  beforeEach(() => {
    mockClient.patch.mockReset();
  });

  it("sends only the fields it was given", async () => {
    mockClient.patch.mockResolvedValue({ data: { family_member: { id: 1 } } });

    await updateFamilyMember(1, { name: "Maltibai Patle", age: 67 });

    expect(mockClient.patch).toHaveBeenCalledWith("/family_members/1", {
      name: "Maltibai Patle",
      age: 67,
    });
  });

  it("can clear the conditions list", async () => {
    // An empty array has to reach the server. Omitting the key when the list is
    // empty would make removing the last condition impossible.
    mockClient.patch.mockResolvedValue({ data: { family_member: { id: 1 } } });

    await updateFamilyMember(1, { chronic_conditions: [] });

    expect(mockClient.patch).toHaveBeenCalledWith("/family_members/1", {
      chronic_conditions: [],
    });
  });
});

// The detail screen reads familyMemberKey and the dashboard reads
// familyMembersKey. Invalidating only the list left the screen the caregiver was
// looking at showing the values they had just corrected.
describe("keys an update has to invalidate", () => {
  it("addresses both the list and the member being edited", () => {
    expect(JSON.stringify(familyMembersKey())).toBe(JSON.stringify(["familyMembers"]));
    expect(JSON.stringify(familyMemberKey(7))).toBe(JSON.stringify(["familyMember", 7]));
  });
});
