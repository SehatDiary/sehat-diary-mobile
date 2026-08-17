import { shouldEndSession } from "../sessionExpiry";

describe("deciding when a 401 ends the session", () => {
  it("ends the session when the API rejects an authenticated request", () => {
    expect(shouldEndSession(401, "/family_members")).toBe(true);
    expect(shouldEndSession(401, "/adherence/today")).toBe(true);
    expect(shouldEndSession(401, "/auth/update_fcm_token")).toBe(true);
  });

  it("leaves a mistyped OTP alone — there is no session to end", () => {
    expect(shouldEndSession(401, "/auth/verify_otp")).toBe(false);
    expect(shouldEndSession(401, "/auth/request_otp")).toBe(false);
  });

  it("ignores every other status", () => {
    expect(shouldEndSession(200, "/family_members")).toBe(false);
    expect(shouldEndSession(403, "/family_members")).toBe(false);
    expect(shouldEndSession(404, "/family_members")).toBe(false);
    expect(shouldEndSession(429, "/auth/request_otp")).toBe(false);
    expect(shouldEndSession(500, "/family_members")).toBe(false);
  });

  it("survives a request that never got a status or a url", () => {
    expect(shouldEndSession(undefined, "/family_members")).toBe(false);
    expect(shouldEndSession(401, undefined)).toBe(true);
  });
});
