import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  uploadImage,
  createPrescription,
  confirmPrescription,
  getDoctorVisit,
  markTestCompleted,
  markReferralVisited,
} from "../api/prescriptions";
import { ConfirmPrescriptionResult } from "../types";

// Confirming a prescription writes far more than the members list: it creates
// the doctor visit, its medicines and a month or more of adherence logs. Every
// cached screen that reads any of that has to refetch, or the caregiver taps
// "save" and lands back on a pre-scan snapshot — the session card still
// reading "0 prescriptions", the new session missing entirely. React
// Navigation keeps those screens mounted, so nothing remounts to refetch on
// its own.
export const confirmPrescriptionQueryKeys = (
  familyMemberId: number,
  healthSessionId: number
): unknown[][] => [
  ["familyMembers"],
  ["familyMember", familyMemberId],
  ["healthSessions", familyMemberId],
  ["healthSession", familyMemberId, healthSessionId],
  ["todaysMedicines"],
  ["memberAdherence", familyMemberId],
  ["pendingActions"],
];

export const useUploadPrescription = () => {
  return useMutation({
    mutationFn: async ({
      uri,
      familyMemberId,
      healthSessionId,
    }: {
      uri: string;
      familyMemberId: number;
      healthSessionId: number;
    }) => {
      const { key } = await uploadImage(uri);
      const result = await createPrescription(
        familyMemberId,
        healthSessionId,
        key
      );
      return result;
    },
  });
};

export const useConfirmPrescription = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ConfirmPrescriptionResult,
    Error,
    {
      familyMemberId: number;
      healthSessionId: number;
      prescriptionId: number;
      confirmedData: { medicines: Record<string, unknown>[] };
    }
  >({
    mutationFn: ({
      familyMemberId,
      healthSessionId,
      prescriptionId,
      confirmedData,
    }) =>
      confirmPrescription(
        familyMemberId,
        healthSessionId,
        prescriptionId,
        confirmedData
      ),
    onSuccess: (_data, { familyMemberId, healthSessionId }) => {
      for (const queryKey of confirmPrescriptionQueryKeys(
        familyMemberId,
        healthSessionId
      )) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });
};

export const useGetDoctorVisit = (
  memberId: number,
  sessionId: number,
  doctorVisitId: number
) => {
  return useQuery({
    queryKey: ["doctorVisit", memberId, sessionId, doctorVisitId],
    queryFn: () => getDoctorVisit(memberId, sessionId, doctorVisitId),
  });
};

export const useMarkTestCompleted = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      familyMemberId,
      healthSessionId,
      testId,
    }: {
      familyMemberId: number;
      healthSessionId: number;
      testId: number;
    }) => markTestCompleted(testId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["healthSession"] });
      queryClient.invalidateQueries({ queryKey: ["doctorVisit"] });
    },
  });
};

export const useMarkReferralVisited = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      familyMemberId,
      healthSessionId,
      referralId,
    }: {
      familyMemberId: number;
      healthSessionId: number;
      referralId: number;
    }) => markReferralVisited(referralId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["healthSession"] });
      queryClient.invalidateQueries({ queryKey: ["doctorVisit"] });
    },
  });
};
