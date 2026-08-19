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
  /** Stable R2 object key. Safe to keep. */
  image_key: string | null;
  /** Presigned, expires in an hour. Never persist this. */
  image_url: string | null;
  status: "pending" | "extracted" | "confirmed" | "failed";
  raw_extraction: Record<string, unknown>;
  medicines: Medicine[];
  created_at: string;
}

// Visit shapes mirror sehat_diary/docs/API_CONTRACT.md (DoctorVisit full).
export interface Medicine {
  id: number;
  name: string;
  dosage: string | null;
  frequency: string | null;
  duration_days: number | null;
  instructions_hi: string | null;
  start_date: string | null;
  end_date: string | null;
  confidence: MedicineConfidence;
  raw_text: string | null;
}

export interface DoctorVisit {
  id: number;
  health_session_id: number;
  doctor_id: number | null;
  prescription_id: number | null;
  visit_date: string;
  visit_type: string;
  chief_complaint: string | null;
  diagnosis: string | null;
  patient_match_status: "matched" | "unmatched" | "skipped" | null;
  doctor_name: string | null;
  hospital_name: string | null;
  created_at: string;
  next_visit_date: string | null;
  next_visit_instructions: string | null;
  special_instructions: string | null;
  summary_en: string | null;
  summary_hi: string | null;
  medicines: Medicine[];
  prescribed_tests: PrescribedTest[];
  referrals: Referral[];
  visit_instructions: VisitInstruction[];
}

export type InstructionType =
  | "diet"
  | "exercise"
  | "lifestyle"
  | "restriction"
  | "monitoring"
  | "device"
  | "general";

export interface PrescribedTest {
  id: number;
  doctor_visit_id: number;
  test_name: string;
  test_type: string;
  body_part: string | null;
  urgency: string;
  instructions: string | null;
  status: "pending" | "booked" | "completed" | "cancelled";
  hindi_name: string | null;
  hindi_instructions: string | null;
  due_by_date: string | null;
  completed_at: string | null;
  lab_report_url: string | null;
  created_at: string;
}

export interface Referral {
  id: number;
  doctor_visit_id: number;
  referred_to_name: string;
  referred_to_specialty: string | null;
  referred_to_hospital: string | null;
  reason: string | null;
  urgency: string;
  status: "pending" | "visited" | "cancelled";
  notes: string | null;
  hindi_explanation: string | null;
  resulting_health_session_id: number | null;
  created_at: string;
}

export interface VisitInstruction {
  id: number;
  doctor_visit_id: number;
  instruction_type: InstructionType;
  description: string;
  hindi_description: string | null;
  frequency: string | null;
  duration: string | null;
  priority: number;
}

// Wire shapes mirror sehat_diary/docs/API_CONTRACT.md (GET /pending_actions).
export interface PendingTestAction {
  id: number;
  test_name: string;
  test_type: string;
  urgency: string;
  due_by_date: string | null;
  doctor_name: string | null;
  visit_date: string | null;
  family_member_id: number;
  family_member_name: string;
  health_session_id: number;
}

export interface PendingReferralAction {
  id: number;
  referred_to_name: string;
  referred_to_specialty: string | null;
  reason: string | null;
  urgency: string;
  doctor_name: string | null;
  visit_date: string | null;
  family_member_id: number;
  family_member_name: string;
  health_session_id: number;
}

export interface UpcomingFollowup {
  id: number; // doctor_visit id
  doctor_name: string | null;
  next_visit_date: string;
  days_remaining: number;
  next_visit_instructions: string | null;
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

// Mirrors what the server actually returns. This previously declared a
// `doctor_visit` object the API has never sent, so `if (result.doctor_visit)`
// was permanently false and the confirmation screen was unreachable.
export interface ConfirmPrescriptionResult {
  success: boolean;
  doctor_visit_id: number;
  medicines_count: number;
  tests_count: number;
  referrals_count: number;
  instructions_count: number;
  patient_matched: boolean;
  /** Set when the name on the prescription does not match the family member. */
  unmatched_warning: string | null;
}

export interface AdherenceLog {
  id: number;
  medicine_name: string;
  instructions_hi: string | null;
  dosage: string | null;
  frequency: string | null;
  prescribed_medicine_id: number;
  taken_at: string;
  taken: boolean;
  notes: string | null;
  acknowledged_at: string | null;
  reminder_count: number;
}

export type DoseStatus = "pending" | "taken" | "missed" | "snoozed";

export type DrugReferenceStatus = "pending" | "ready" | "unavailable";

/** sehat_diary/docs/API_CONTRACT.md — GET /prescribed_medicines/:id */
export interface DrugReferenceText {
  description: string | null;
  usage: string | null;
  side_effects: string | null;
}

export interface DrugReferenceContent extends DrugReferenceText {
  drug_class: string | null;
  generic_composition: { name: string; strength: string | null }[];
  hindi: DrugReferenceText | null;
  source: string;
}

export interface MedicineDetail {
  id: number;
  name: string;
  dosage: string | null;
  strength: string | null;
  dose: string | null;
  form: string | null;
  frequency: string | null;
  timing: string | null;
  duration_days: number | null;
  quantity_prescribed: number | null;
  instructions_hi: string | null;
  raw_text: string | null;
  confidence: MedicineConfidence;
  needs_schedule_input: boolean;
  dosing_interval: DosingInterval;
  dosing_weekday: number | null;
  is_active: boolean;
  stopped_at: string | null;
  stopped_reason: string | null;
  start_date: string | null;
  end_date: string | null;
  /** Hours it actually reminds at, read off the schedule rather than re-derived. */
  reminder_times: string[];
  adherence_summary: {
    window_days: number;
    scheduled: number;
    taken: number;
    missed: number;
  };
  /** Tells "still fetching" apart from "nothing to show". */
  drug_reference_status: DrugReferenceStatus;
  drug_reference: DrugReferenceContent | null;
  doctor_visit: {
    id: number;
    visit_date: string | null;
    doctor_name: string | null;
    health_session_id: number;
    family_member_id: number;
  } | null;
}

/** One dose in the 7-day history — sehat_diary/docs/API_CONTRACT.md. */
export interface HistoryDose {
  id: number;
  medicine_name: string;
  dosage: string | null;
  instructions_hi: string | null;
  prescribed_medicine_id: number;
  scheduled_at: string;
  /**
   * Derived by the server. A dose left pending past its grace period reads as
   * missed, because the job that would have written that may never have run.
   */
  status: DoseStatus;
  /** What the row actually stores, before that derivation. */
  recorded_status: DoseStatus;
  marked_late: boolean;
  acknowledged_at: string | null;
  reminder_count: number;
  notes: string | null;
  /** Still open, and inside the window the caregiver can correct. */
  correctable: boolean;
}

export interface HistoryDay {
  date: string;
  scheduled: number;
  taken: number;
  missed: number;
  doses: HistoryDose[];
}

export interface AdherenceHistory {
  /** Always 7, oldest first, today last. Days with no doses are included. */
  days: HistoryDay[];
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

// Wire shapes below mirror sehat_diary/docs/API_CONTRACT.md (Lab reports).
export type LabAnalysisStatus = "pending" | "processing" | "completed" | "failed";

// Items of GET .../lab_reports (lab_report_summary)
export interface LabReport {
  id: number;
  lab_name: string | null;
  report_date: string | null;
  report_type: string | null;
  analysis_status: LabAnalysisStatus;
  has_critical_findings: boolean;
  findings_count: number;
  abnormal_count: number;
  image_count: number;
}

// Adapted from the flat create response ({ lab_report_id, ... })
/** A lab report as it appears on the session response. */
export interface SessionLabReport {
  id: number;
  lab_name: string | null;
  report_date: string | null;
  analysis_status: LabAnalysisStatus;
  has_critical_findings: boolean;
  image_keys: string[];
  image_urls: string[];
  pdf_key: string | null;
  /** Set instead of image_urls when the report was uploaded as a PDF. */
  pdf_url: string | null;
}

export interface LabReportUploadResult {
  id: number;
  /** The visit this went into — created by the server when none was given. */
  health_session_id: number;
  images_uploaded: number;
  status: LabAnalysisStatus;
  message: string;
  message_hindi: string;
}

export interface LabReportAnalysisStatus {
  lab_report_id: number;
  status: LabAnalysisStatus;
  findings_count?: number;
  abnormal_count?: number;
  critical_count?: number;
  has_critical?: boolean;
  error?: string;
  message?: string;
  message_hindi?: string;
}

export interface LabReportFinding {
  id: number;
  section: string | null;
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
}

// Flattened by the getLabReport adapter from the show payload, where
// findings/critical_findings/summaries are TOP-LEVEL siblings of lab_report.
export interface LabReportResultData {
  id: number;
  lab_name: string | null;
  patient_name_on_report: string | null;
  patient_match_status: "matched" | "unmatched" | "skipped" | null;
  report_date: string | null;
  report_type: string | null;
  // *_key values are stable R2 object keys; *_url values are presigned and
  // expire after an hour, so never cache or persist them.
  image_keys: string[];
  image_urls: string[];
  pdf_key: string | null;
  pdf_url: string | null;
  analysis_status: LabAnalysisStatus;
  has_critical_findings: boolean;
  findings: LabReportFinding[];
  critical_findings: LabReportFinding[];
  hindi_summary: string | null;
  english_summary: string | null;
  next_steps: string | null;
  next_steps_hindi: string | null;
}

// Wire shapes mirror sehat_diary/docs/API_CONTRACT.md (Caregiver connections).
export interface CaregiverConnection {
  id: number;
  name: string | null;
  phone_number: string | null; // masked, e.g. +91*****88
  status: "accepted" | "pending";
  invited_at: string;
  responded_at: string | null;
  expires_at: string | null; // non-null only while pending; may be in the past
  permission_level: string;
}

export interface PhoneLookupResult {
  registered: boolean;
  already_connected?: boolean;
  invite_pending?: boolean;
  can_invite?: boolean;
  message?: string;
  message_hindi?: string;
}

export interface SendInviteResult {
  success: boolean;
  connection_id: number;
  expires_at: string;
}

export type PatientStackParamList = {
  DailyMedicines: undefined;
  ManageCaregivers: undefined;
  Settings: undefined;
  VisitHistory: undefined;
  VisitDetail: {
    memberId: number;
    sessionId: number;
    doctorVisitId: number;
  };
  // Addressed by id and fetched. It used to carry its whole content, which meant
  // it could only ever show what the calling list already held.
  MedicineDetail: { medicineId: number };
};

export interface CaregiverInvite {
  id: number;
  patient_name: string;
  invited_at: string;
  expires_at: string;
  expires_in_hours: number;
}

export interface PatientFamilyMember {
  id: number;
  name: string;
  relation: string;
}

export interface MyPatient {
  id: number; // connection id, NOT user id
  name: string;
  phone_number: string | null; // masked
  status: string;
  responded_at: string | null;
  family_members: PatientFamilyMember[];
}

export type CaregiverStackParamList = {
  PendingInvites: undefined;
  Dashboard: undefined;
  /** memberId present = editing an existing member; absent = adding one. */
  AddFamilyMember: { memberId?: number } | undefined;
  FamilyMember: { memberId: number };
  SessionDetail: { memberId: number; sessionId: number };
  // sessionId null = start a new visit; the server creates it on upload.
  UploadPrescription: { memberId: number; sessionId: number | null };
  UploadLabReport: {
    memberId: number;
    sessionId: number | null;
    prescribedTestId?: number;
  };
  LabReportResult: {
    memberId: number;
    sessionId: number;
    reportId: number;
  };
  // Addressed by id and fetched. It used to expect a whole DoctorVisit object
  // that the confirm response has never contained, so this screen was
  // unreachable and every confirmation fell through to goBack().
  VisitConfirmed: {
    memberId: number;
    sessionId: number;
    doctorVisitId: number;
  };
  MedicineDetail: { medicineId: number };
  MemberAdherence: {
    memberId: number;
    memberName: string;
    highlightAdherenceLogId?: number;
  };
  Settings: undefined;
};

// Extraction response — sehat_diary/docs/API_CONTRACT.md (POST .../prescriptions).
export type MedicineConfidence = "high" | "medium" | "low";

export type DosingInterval = "daily" | "weekly" | "alternate_day" | "as_needed";

export interface ExtractedMedicine {
  name: string;
  // Always present and valid: the server normalises an absent or unreadable
  // level to "low" so an unknown extraction is reviewed, never waved through.
  confidence: MedicineConfidence;
  raw_text: string | null; // as written on the prescription
  strength?: string | null;
  form?: string | null;
  dose?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  timing?: string | null;
  duration?: string | null;
  duration_days?: number | null;
  instructions_hi?: string | null;
  hindi_explanation?: string | null;
  english_explanation?: string | null;
  /** How often across days, as opposed to how many times within one. */
  dosing_interval?: DosingInterval | null;
  /** 0-6, 0 = Sunday. Only meaningful when dosing_interval is "weekly". */
  dosing_weekday?: number | null;
}

export interface ExtractionResult {
  prescription_id: number;
  /** The visit this went into — created by the server when none was given. */
  health_session_id: number;
  extracted_data: { medicines?: ExtractedMedicine[] } & Record<string, unknown>;
  confidence_counts: Record<MedicineConfidence, number>;
  /** @deprecated lossy — read extracted_data.medicines[].confidence instead */
  low_confidence_medicines: string[];
  has_warnings: boolean;
}
