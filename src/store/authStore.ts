import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { User } from "../types";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (user: User, token: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  setAuth: async (user, token) => {
    await SecureStore.setItemAsync("auth_token", token);
    await SecureStore.setItemAsync("user", JSON.stringify(user));
    set({ user, token, isLoading: false });
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync("auth_token");
    await SecureStore.deleteItemAsync("user");
    set({ user: null, token: null, isLoading: false });
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
