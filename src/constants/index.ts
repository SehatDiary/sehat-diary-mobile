import Constants from "expo-constants";
import { Platform } from "react-native";

export const COLORS = {
  primary: "#2D6A4F",
  primaryLight: "#40916C",
  primaryDark: "#1B4332",
  white: "#FFFFFF",
  background: "#F8F9FA",
  text: "#212529",
  textSecondary: "#6C757D",
  border: "#DEE2E6",
  error: "#DC3545",
  warning: "#FFC107",
  success: "#28A745",
  cardBorder: "#E9ECEF",
};

export const FONT_SIZES = {
  small: 14,
  medium: 16,
  large: 18,
  xlarge: 22,
  title: 28,
};

const PRODUCTION_API_BASE =
  "https://sehatdiary-production.up.railway.app/api/v1";

// 10.0.2.2 is the Android emulator's alias for the host machine; a physical
// device needs your LAN IP via EXPO_PUBLIC_API_BASE (see DEV_SETUP.md).
const DEV_FALLBACK_API_BASE = Platform.select({
  android: "http://10.0.2.2:3000/api/v1",
  default: "http://localhost:3000/api/v1",
});

const configuredApiBase = Constants.expoConfig?.extra?.apiBase as
  | string
  | undefined
  | null;

export const API_BASE = __DEV__
  ? configuredApiBase || DEV_FALLBACK_API_BASE
  : PRODUCTION_API_BASE;
