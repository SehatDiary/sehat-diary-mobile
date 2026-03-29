import { useMutation } from "@tanstack/react-query";
import { requestOtp, verifyOtp, logout as logoutApi } from "../api/auth";
import { useAuthStore } from "../store/authStore";

export const useRequestOtp = () => {
  return useMutation({
    mutationFn: (phone_number: string) => requestOtp(phone_number),
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
    },
  });
};
