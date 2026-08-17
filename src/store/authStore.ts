import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { User } from "../types";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (user: User, token: string) => Promise<void>;
  setUser: (user: User) => Promise<void>;
  clearAuth: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  setUser: async (user) => {
    await SecureStore.setItemAsync("user", JSON.stringify(user));
    set({ user });
  },
  setAuth: async (user, token) => {
    await SecureStore.setItemAsync("auth_token", token);
    await SecureStore.setItemAsync("user", JSON.stringify(user));
    set({ user, token, isLoading: false });
  },

  clearAuth: async () => {
    // State first, and the keychain deletes can never take the caller down
    // with them. Awaiting them ahead of set() meant an unavailable keychain
    // left user and token in memory — the app still rendering a signed-in
    // stack over a dead session, which is the bug this guards — and the
    // rejection reached the 401 interceptor, masking the original error.
    set({ user: null, token: null, isLoading: false });

    try {
      await SecureStore.deleteItemAsync("auth_token");
      await SecureStore.deleteItemAsync("user");
    } catch {
      // The session is already gone in memory; a key left behind is refused
      // by the API and cleared on the next attempt.
    }
  },

  setLoading: (isLoading) => set({ isLoading }),

  loadFromStorage: async () => {
    try {
      const token = await SecureStore.getItemAsync("auth_token");
      const userStr = await SecureStore.getItemAsync("user");
      if (token && userStr) {
        const user = JSON.parse(userStr) as User;
        set({ user, token, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
