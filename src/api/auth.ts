import client from "./client";
import { AuthResponse, User } from "../types";

export type SignupRole = "caregiver" | "patient";

export const requestOtp = async (
  phone_number: string,
  role?: SignupRole
): Promise<{ message: string; otp?: string }> => {
  const body: Record<string, string> = { phone_number };
  if (role) body.role = role;
  const { data } = await client.post("/auth/request_otp", body);
  return data;
};

export const verifyOtp = async (
  phone_number: string,
  otp: string
): Promise<AuthResponse> => {
  const { data } = await client.post("/auth/verify_otp", {
    phone_number,
    otp,
  });
  return data;
};

export const logout = async (): Promise<void> => {
  await client.delete("/auth/logout");
};

export const getMe = async (): Promise<User> => {
  const { data } = await client.get("/auth/me");
  return data.user;
};

export const updateFcmToken = async (fcm_token: string): Promise<void> => {
  await client.post("/auth/update_fcm_token", { fcm_token });
};
