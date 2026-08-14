import { mockClient, resetMockClient } from "../../testUtils/mockClient";

jest.mock("../client", () => ({
  __esModule: true,
  default: mockClient,
}));

import { requestOtp, verifyOtp, getMe } from "../auth";

// Fixtures: sehat_diary/docs/API_CONTRACT.md § Auth
const USER_FIXTURE = {
  id: 1,
  name: "Rahul",
  phone_number: "+919999999999",
  email: null,
  role: "caregiver",
  active: true,
};

beforeEach(resetMockClient);

describe("auth contract", () => {
  it("requestOtp sends role only when provided and returns message/expires_in", async () => {
    mockClient.post.mockResolvedValue({
      data: { message: "OTP sent", expires_in: 600, otp: "123456" },
    });

    const result = await requestOtp("+919999999999");
    expect(mockClient.post).toHaveBeenCalledWith("/auth/request_otp", {
      phone_number: "+919999999999",
    });
    expect(result.message).toBe("OTP sent");

    await requestOtp("+919999999999", "patient");
    expect(mockClient.post).toHaveBeenLastCalledWith("/auth/request_otp", {
      phone_number: "+919999999999",
      role: "patient",
    });
  });

  it("verifyOtp returns the user + token envelope", async () => {
    mockClient.post.mockResolvedValue({
      data: { user: USER_FIXTURE, token: "eyJ.test.token" },
    });

    const result = await verifyOtp("+919999999999", "123456");
    expect(result.token).toBe("eyJ.test.token");
    expect(result.user.role).toBe("caregiver");
    expect(result.user.active).toBe(true);
  });

  it("getMe unwraps the user envelope", async () => {
    mockClient.get.mockResolvedValue({ data: { user: USER_FIXTURE } });

    const user = await getMe();
    expect(user.id).toBe(1);
    expect(user.phone_number).toBe("+919999999999");
  });
});
