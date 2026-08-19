import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  uploadImage,
  createPrescription,
  confirmPrescription,
  getDoctorVisit,
  getMedicine,
  stopMedicine,
  restartMedicine,
  markTestCompleted,
  markReferralVisited,
} from "../api/prescriptions";
import { ConfirmPrescriptionResult } from "../types";
import {
  familyMembersKey,
  familyMemberKey,
  healthSessionsKey,
  healthSessionKey,
  pendingActionsKey,
} from "./useFamilyMembers";
import {
  todaysMedicinesKey,
  memberAdherenceKey,
  memberAdherenceHistoryKey,
} from "./useAdherence";

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
  familyMembersKey(),
  familyMemberKey(familyMemberId),
  healthSessionsKey(familyMemberId),
  healthSessionKey(familyMemberId, healthSessionId),
  todaysMedicinesKey(),
  memberAdherenceKey(familyMemberId),
  pendingActionsKey(),
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
      /** null when uploading from the family member page — the server creates the visit. */
      healthSessionId: number | null;
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
      // The dashboard counts this item as pending and stays mounted while the
      // caregiver marks it done, so without this it keeps listing work that
      // is already finished.
      queryClient.invalidateQueries({ queryKey: pendingActionsKey() });
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
      // The dashboard counts this item as pending and stays mounted while the
      // caregiver marks it done, so without this it keeps listing work that
      // is already finished.
      queryClient.invalidateQueries({ queryKey: pendingActionsKey() });
    },
  });
};

export const medicineKey = (medicineId: number) => ["medicine", medicineId];

export const useGetMedicine = (medicineId: number) => {
  return useQuery({
    queryKey: medicineKey(medicineId),
    queryFn: () => getMedicine(medicineId),
  });
};

// Stopping and restarting both change what the patient's phone will do, so
// every list that shows a medicine or a dose has to be refreshed — the medicine
// itself, today's doses, the week, and the session it belongs to.
export const medicineMutationKeys = (
  medicineId: number,
  familyMemberId?: number
): unknown[][] => [
  medicineKey(medicineId),
  todaysMedicinesKey(),
  ...(familyMemberId
    ? [ memberAdherenceKey(familyMemberId), memberAdherenceHistoryKey(familyMemberId),
        familyMemberKey(familyMemberId), healthSessionsKey(familyMemberId) ]
    : []),
];

const useMedicineMutation = (
  medicineId: number,
  familyMemberId: number | undefined,
  mutationFn: (id: number) => Promise<unknown>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => mutationFn(medicineId),
    onSuccess: () => {
      for (const queryKey of medicineMutationKeys(medicineId, familyMemberId)) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });
};

export const useStopMedicine = (medicineId: number, familyMemberId?: number) =>
  useMedicineMutation(medicineId, familyMemberId, stopMedicine);

export const useRestartMedicine = (medicineId: number, familyMemberId?: number) =>
  useMedicineMutation(medicineId, familyMemberId, restartMedicine);
