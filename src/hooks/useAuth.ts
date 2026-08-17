import { useMutation } from "@tanstack/react-query";
import {
  requestOtp,
  verifyOtp,
  logout as logoutApi,
  SignupRole,
  updateMe,
} from "../api/auth";
import { useAuthStore } from "../store/authStore";
import { clearCachedSession } from "../api/queryClient";

export const useRequestOtp = () => {
  return useMutation({
    mutationFn: ({
      phone_number,
      role,
    }: {
      phone_number: string;
      role?: SignupRole;
    }) => requestOtp(phone_number, role),
  });
};

export const useVerifyOtp = () => {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: ({
      phone_number,
      otp,
    }: {
      phone_number: string;
      otp: string;
    }) => verifyOtp(phone_number, otp),
    onSuccess: async (data) => {
      // Whoever signs in starts with an empty cache, whatever happened to the
      // session before them — a logout that failed mid-flight, an app killed
      // while signed in. None of the query keys carry a user id, so this is
      // the only thing standing between two accounts on one phone.
      clearCachedSession();
      await setAuth(data.user, data.token);
    },
  });
};

export const useLogout = () => {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useMutation({
    mutationFn: logoutApi,
    onSettled: async () => {
      await clearAuth();
      clearCachedSession();
    },
  });
};

export function useUpdateProfile() {
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: updateMe,
    onSuccess: (user) => setUser(user),
  });
}
