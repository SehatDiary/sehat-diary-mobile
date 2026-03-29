import { I18n } from "i18n-js";
import en from "./en";
import hi from "./hi";

const i18n = new I18n({ en, hi });
i18n.defaultLocale = "hi";
i18n.locale = "hi";
i18n.enableFallback = true;

export default i18n;
