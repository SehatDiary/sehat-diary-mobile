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
