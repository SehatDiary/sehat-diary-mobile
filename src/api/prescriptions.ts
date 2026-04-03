import client from "./client";
import { ConfirmPrescriptionResult, DoctorVisit, PrescribedTest, Referral } from "../types";

export const uploadImage = async (uri: string): Promise<{ url: string }> => {
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

export const createPrescription = async (
  familyMemberId: number,
  healthSessionId: number,
  imageUrl: string
): Promise<{
  prescription_id: number;
  extracted_data: Record<string, unknown>;
  low_confidence_medicines: string[];
  has_warnings: boolean;
}> => {
  const { data } = await client.post(
    `/family_members/${familyMemberId}/health_sessions/${healthSessionId}/prescriptions`,
    { image_url: imageUrl }
  );
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

export const markTestCompleted = async (
  familyMemberId: number,
  healthSessionId: number,
  testId: number
): Promise<PrescribedTest> => {
  const { data } = await client.patch(
    `/family_members/${familyMemberId}/health_sessions/${healthSessionId}/prescribed_tests/${testId}/complete`
  );
  return data.prescribed_test;
};

export const markReferralVisited = async (
  familyMemberId: number,
  healthSessionId: number,
  referralId: number
): Promise<Referral> => {
  const { data } = await client.patch(
    `/family_members/${familyMemberId}/health_sessions/${healthSessionId}/referrals/${referralId}/visited`
  );
  return data.referral;
};
