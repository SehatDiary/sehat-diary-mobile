import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  uploadImage,
  createPrescription,
  confirmPrescription,
} from "../api/prescriptions";

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

  return useMutation({
    mutationFn: ({
      familyMemberId,
      healthSessionId,
      prescriptionId,
      confirmedData,
    }: {
      familyMemberId: number;
      healthSessionId: number;
      prescriptionId: number;
      confirmedData: { medicines: Record<string, unknown>[] };
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
