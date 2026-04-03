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

export interface DoctorVisit {
  id: number;
  doctor_name: string | null;
  hospital_name: string | null;
  visit_date: string;
  diagnosis: string | null;
  summary_hi: string | null;
  summary_en: string | null;
  patient_name_match: boolean;
  medicines: Medicine[];
  tests: PrescribedTest[];
  referrals: Referral[];
  instructions: VisitInstruction[];
}

export interface PrescribedTest {
  id: number;
  name: string;
  status: "pending" | "completed";
  completed_at: string | null;
}

export interface Referral {
  id: number;
  specialist: string;
  reason: string | null;
  status: "pending" | "visited";
  visited_at: string | null;
}

export interface VisitInstruction {
  id: number;
  category: "exercise" | "diet" | "device" | "general";
  text_hi: string;
  text_en: string | null;
}

export interface ConfirmPrescriptionResult {
  success: boolean;
  medicines_count: number;
  doctor_visit: DoctorVisit;
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
  UploadPrescription: { memberId: number; sessionId: number };
  VisitConfirmed: {
    memberId: number;
    sessionId: number;
    doctorVisit: DoctorVisit;
  };
};
