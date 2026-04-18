import { I18n } from "i18n-js";
import en from "./en";
import hi from "./hi";

function detectDeviceLocale(): "en" | "hi" {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return locale.toLowerCase().startsWith("hi") ? "hi" : "en";
  } catch {
    return "hi";
  }
}

const i18n = new I18n({ en, hi });
i18n.defaultLocale = "en";
i18n.locale = detectDeviceLocale();
i18n.enableFallback = true;

export default i18n;
