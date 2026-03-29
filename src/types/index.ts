export interface User {
  id: number;
  name: string | null;
  phone_number: string;
  email: string | null;
  role: "super_admin" | "caregiver" | "patient" | "doctor";
  active: boolean;
}

export interface FamilyMember {
  id: number;
  name: string;
  relation: string;
  age: number | null;
  gender: string | null;
  chronic_conditions: string[];
  created_at: string;
}

export interface HealthSession {
  id: number;
  family_member_id: number;
  status: "active" | "completed";
  started_at: string;
  ended_at: string | null;
  prescriptions_count: number;
  created_at: string;
}

export interface Prescription {
  id: number;
  health_session_id: number;
  image_url: string;
  status: "pending" | "extracted" | "confirmed" | "failed";
  raw_extraction: Record<string, unknown>;
  medicines: Medicine[];
  created_at: string;
}

export interface Medicine {
  id: number;
  name: string;
  dosage: string | null;
  frequency: string | null;
  duration_days: number | null;
  instructions_hi: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface AdherenceLog {
  id: number;
  medicine_name: string;
  instructions_hi: string | null;
  dosage: string | null;
  frequency: string | null;
  taken_at: string;
  taken: boolean;
  notes: string | null;
}

export interface OtpRequest {
  phone_number: string;
}

export interface OtpVerify {
  phone_number: string;
  otp: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export type CaregiverStackParamList = {
  Dashboard: undefined;
  AddFamilyMember: undefined;
  FamilyMember: { memberId: number };
  SessionDetail: { memberId: number; sessionId: number };
};
