import client from "./client";
import { AuthResponse, User } from "../types";

export const requestOtp = async (
  phone_number: string
): Promise<{ message: string; otp?: string }> => {
  const { data } = await client.post("/auth/request_otp", { phone_number });
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
