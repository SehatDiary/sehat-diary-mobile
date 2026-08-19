import client from "./client";
import {
  ConfirmPrescriptionResult,
  DoctorVisit,
  ExtractionResult,
  MedicineDetail,
  PrescribedTest,
  Referral,
} from "../types";

// The R2 bucket is private: `key` is the durable reference to send back when
// creating a prescription, `url` is a presigned link (1 hour) for previewing
// the upload. Never persist or re-send `url` — the signature expires.
export const uploadImage = async (
  uri: string
): Promise<{ key: string; url: string }> => {
  const formData = new FormData();
  const filename = uri.split("/").pop() || "photo.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image/jpeg";

  formData.append("image", {
    uri,
    name: filename,
    type,
  } as unknown as Blob);

  const { data } = await client.post("/uploads/prescription_image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

/**
 * Two entry points, deliberately.
 *
 * With a session id, the prescription is added to that visit. Without one, the
 * server creates the visit and the prescription together in a transaction — so
 * abandoning an upload leaves nothing behind, which is what "New visit"
 * creating an empty session used to do.
 */
export const createPrescription = async (
  familyMemberId: number,
  healthSessionId: number | null,
  imageKey: string
): Promise<ExtractionResult> => {
  const path =
    healthSessionId == null
      ? `/family_members/${familyMemberId}/prescriptions`
      : `/family_members/${familyMemberId}/health_sessions/${healthSessionId}/prescriptions`;

  const { data } = await client.post(path, { image_key: imageKey });
  return data;
};

export const confirmPrescription = async (
  familyMemberId: number,
  healthSessionId: number,
  prescriptionId: number,
  confirmedData: { medicines: Record<string, unknown>[] }
): Promise<ConfirmPrescriptionResult> => {
  const { data } = await client.post(
    `/family_members/${familyMemberId}/health_sessions/${healthSessionId}/prescriptions/${prescriptionId}/confirm`,
    { confirmed_data: confirmedData }
  );
  return data;
};

export const getDoctorVisit = async (
  familyMemberId: number,
  healthSessionId: number,
  doctorVisitId: number
): Promise<DoctorVisit> => {
  const { data } = await client.get(
    `/family_members/${familyMemberId}/health_sessions/${healthSessionId}/doctor_visits/${doctorVisitId}`
  );
  return data.doctor_visit;
};

export const getMedicine = async (
  medicineId: number
): Promise<MedicineDetail> => {
  const { data } = await client.get(`/prescribed_medicines/${medicineId}`);
  return data.prescribed_medicine;
};

export const stopMedicine = async (
  medicineId: number,
  reason?: string
): Promise<MedicineDetail> => {
  const { data } = await client.patch(
    `/prescribed_medicines/${medicineId}/deactivate`,
    reason ? { reason } : {}
  );
  return data.prescribed_medicine;
};

export const restartMedicine = async (
  medicineId: number
): Promise<MedicineDetail> => {
  const { data } = await client.patch(
    `/prescribed_medicines/${medicineId}/reactivate`
  );
  return data.prescribed_medicine;
};

export const markTestCompleted = async (
  testId: number
): Promise<PrescribedTest> => {
  const { data } = await client.patch(
    `/prescribed_tests/${testId}/mark_completed`
  );
  return data.prescribed_test;
};

export const markReferralVisited = async (
  referralId: number
): Promise<Referral> => {
  const { data } = await client.patch(
    `/referrals/${referralId}/mark_visited`
  );
  return data.referral;
};
