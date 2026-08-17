import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { API_BASE } from "../constants";
import { useAuthStore } from "../store/authStore";
import { shouldEndSession, rejectionEndsCurrentSession } from "./sessionExpiry";
import { clearCachedSession } from "./queryClient";

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const endsSession =
      shouldEndSession(error.response?.status, error.config?.url) &&
      rejectionEndsCurrentSession(
        error.config?.headers?.Authorization,
        useAuthStore.getState().token
      );

    if (endsSession) {
      // Clear through the store, not SecureStore directly. Deleting the keys
      // alone left user and token sitting in memory, so RootNavigator kept
      // rendering the caregiver stack over a session the API had already
      // rejected — an error screen with no way back to login short of force
      // quitting the app. clearAuth wipes both, and the navigator swaps to
      // the login stack on the next render.
      await useAuthStore.getState().clearAuth();
      clearCachedSession();
    }
    return Promise.reject(error);
  }
);

export default client;
