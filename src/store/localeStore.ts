import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import i18n from "../i18n";

export type Locale = "en" | "hi";

const STORAGE_KEY = "app_locale";

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  loadLocale: () => Promise<void>;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: i18n.locale as Locale,

  setLocale: async (locale) => {
    await SecureStore.setItemAsync(STORAGE_KEY, locale);
    i18n.locale = locale;
    set({ locale });
  },

  loadLocale: async () => {
    try {
      const stored = (await SecureStore.getItemAsync(STORAGE_KEY)) as
        | Locale
        | null;
      if (stored === "en" || stored === "hi") {
        i18n.locale = stored;
        set({ locale: stored });
      }
    } catch {
      // keep device-detected default from i18n/index.ts
    }
  },
}));
