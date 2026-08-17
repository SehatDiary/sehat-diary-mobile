// Which 401s mean "your session is over" and which are just a failed login.
//
// The OTP endpoints answer 401 for a wrong or expired code, and a caregiver
// mistyping six digits has no session to end — treating that as an expiry
// would reset state underneath the screen they are still using.
const LOGIN_PATHS = ["/auth/request_otp", "/auth/verify_otp"];

export const shouldEndSession = (
  status: number | undefined,
  url: string | undefined
): boolean => {
  if (status !== 401) return false;

  return !LOGIN_PATHS.some((path) => (url ?? "").includes(path));
};

// Whether the request that was rejected belongs to the session still held.
//
// React Query retries three times with backoff and does not cancel those
// retries when the screens unmount, so a rejected session produces a small
// burst of 401s — and after the first clear they go out with no token at all.
// If one of them lands after the caregiver has signed back in, clearing again
// would throw away the session they just created. A rejection can only end
// the session it was actually sent with.
export const rejectionEndsCurrentSession = (
  authorizationHeader: unknown,
  currentToken: string | null
): boolean => {
  if (!currentToken) return false;

  return authorizationHeader === `Bearer ${currentToken}`;
};
