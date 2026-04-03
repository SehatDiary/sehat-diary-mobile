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
      const { url } = await uploadImage(uri);
      const result = await createPrescription(
        familyMemberId,
        healthSessionId,
        url
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familyMembers"] });
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
    }) => markTestCompleted(familyMemberId, healthSessionId, testId),
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
    }) => markReferralVisited(familyMemberId, healthSessionId, referralId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["healthSession"] });
      queryClient.invalidateQueries({ queryKey: ["doctorVisit"] });
    },
  });
};
