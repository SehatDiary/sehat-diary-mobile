import { shouldEndSession, rejectionEndsCurrentSession } from "../sessionExpiry";

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
    // A 401 with no url is still an authenticated rejection; the token check
    // below is what keeps it from touching anyone else's session.
    expect(shouldEndSession(401, undefined)).toBe(true);
  });
});

describe("matching a rejection to the session that made it", () => {
  it("ends the session whose token the rejected request carried", () => {
    expect(rejectionEndsCurrentSession("Bearer abc123", "abc123")).toBe(true);
  });

  it("ignores a retry that went out after the session was already cleared", () => {
    expect(rejectionEndsCurrentSession(undefined, null)).toBe(false);
    expect(rejectionEndsCurrentSession("Bearer abc123", null)).toBe(false);
  });

  it("never lets a stale rejection wipe a session signed in since", () => {
    // The in-flight retry carries the old token; the caregiver has already
    // logged back in and holds a new one.
    expect(rejectionEndsCurrentSession("Bearer old-token", "fresh-token")).toBe(false);
  });

  it("ignores a rejection that carried no credentials at all", () => {
    expect(rejectionEndsCurrentSession(undefined, "abc123")).toBe(false);
    expect(rejectionEndsCurrentSession("", "abc123")).toBe(false);
  });
});
