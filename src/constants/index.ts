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

export const API_BASE = __DEV__
  ? "http://192.168.188.55:3000/api/v1"
  : "https://sehatdiary-production.up.railway.app/api/v1";
