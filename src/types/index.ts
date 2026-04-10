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

export interface PendingTestAction {
  id: number;
  test_name: string;
  doctor_name: string | null;
  ordered_date: string;
  family_member_id: number;
  family_member_name: string;
  health_session_id: number;
}

export interface PendingReferralAction {
  id: number;
  specialist: string;
  reason: string | null;
  doctor_name: string | null;
  family_member_id: number;
  family_member_name: string;
  health_session_id: number;
}

export interface UpcomingFollowup {
  id: number;
  doctor_name: string | null;
  next_visit_date: string;
  days_remaining: number;
  family_member_id: number;
  family_member_name: string;
  health_session_id: number;
}

export interface CriticalLabReportAction {
  id: number;
  lab_name: string | null;
  report_date: string | null;
  family_member_id: number;
  family_member_name: string;
  health_session_id: number;
}

export interface PendingActionsResponse {
  pending_tests: PendingTestAction[];
  pending_referrals: PendingReferralAction[];
  upcoming_followups: UpcomingFollowup[];
  critical_lab_reports: CriticalLabReportAction[];
  total_count: number;
}

export interface PatientCriticalLabReport {
  id: number;
  lab_name: string | null;
  report_date: string | null;
  hindi_summary: string | null;
  health_session_id: number;
  created_at: string;
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

export interface LabReport {
  id: number;
  health_session_id: number;
  prescribed_test_id: number | null;
  status: "uploading" | "analyzing" | "completed" | "failed";
  image_urls: string[];
  pdf_url: string | null;
  results: Record<string, unknown> | null;
  lab_name: string | null;
  report_type: string | null;
  report_date: string | null;
  has_critical_findings: boolean;
  created_at: string;
}

export interface LabReportAnalysisStatus {
  status: "uploading" | "analyzing" | "completed" | "failed";
  lab_report: LabReport | null;
}

export interface LabReportFinding {
  id: number;
  parameter_name: string;
  hindi_name: string | null;
  value: string;
  unit: string | null;
  normal_range_text: string | null;
  status: "normal" | "borderline" | "high" | "low" | "critical";
  status_color: string;
  note: string | null;
  hindi_note: string | null;
  is_critical: boolean;
  section: string;
}

export interface LabReportResultData {
  id: number;
  lab_name: string | null;
  report_date: string | null;
  patient_name: string | null;
  patient_name_match: boolean;
  analysis_status: "uploading" | "analyzing" | "completed" | "failed";
  has_critical_findings: boolean;
  hindi_summary: string | null;
  english_summary: string | null;
  next_steps: string | null;
  next_steps_hindi: string | null;
  image_urls: string[];
  findings: LabReportFinding[];
  created_at: string;
}

export type CaregiverStackParamList = {
  Dashboard: undefined;
  AddFamilyMember: undefined;
  FamilyMember: { memberId: number };
  SessionDetail: { memberId: number; sessionId: number };
  UploadPrescription: { memberId: number; sessionId: number };
  UploadLabReport: {
    memberId: number;
    sessionId: number;
    prescribedTestId?: number;
  };
  LabReportResult: {
    memberId: number;
    sessionId: number;
    reportId: number;
  };
  VisitConfirmed: {
    memberId: number;
    sessionId: number;
    doctorVisit: DoctorVisit;
  };
  MemberAdherence: {
    memberId: number;
    memberName: string;
    highlightAdherenceLogId?: number;
  };
};
