import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTodaysMedicines,
  getMemberAdherence,
  markTaken,
  markSnoozed,
  getCriticalLabReports,
  TodayMedicines,
} from "../api/adherence";

// See useFamilyMembers.ts for why keys are factories, not inline literals.
export const todaysMedicinesKey = () => ["todaysMedicines"];
export const memberAdherenceKey = (familyMemberId: number) => [
  "memberAdherence",
  familyMemberId,
];

export const useGetTodaysMedicines = () => {
  return useQuery({
    queryKey: todaysMedicinesKey(),
    queryFn: getTodaysMedicines,
  });
};

export const useMarkTaken = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markTaken,
    onMutate: async (adherenceLogId) => {
      await queryClient.cancelQueries({ queryKey: todaysMedicinesKey() });
      const previous = queryClient.getQueryData<TodayMedicines>(todaysMedicinesKey());

      if (previous) {
        const updated = { ...previous };
        for (const slot of ["morning", "afternoon", "evening", "night"] as const) {
          updated[slot] = updated[slot].map((log) =>
            log.id === adherenceLogId ? { ...log, taken: true } : log
          );
        }
        queryClient.setQueryData(todaysMedicinesKey(), updated);
      }

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(todaysMedicinesKey(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: todaysMedicinesKey() });
    },
  });
};

export const useMarkSnoozed = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markSnoozed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todaysMedicinesKey() });
    },
  });
};

export const useGetMemberAdherence = (familyMemberId: number) => {
  return useQuery({
    queryKey: memberAdherenceKey(familyMemberId),
    queryFn: () => getMemberAdherence(familyMemberId),
  });
};

export const useGetCriticalLabReports = () => {
  return useQuery({
    queryKey: ["criticalLabReports"],
    queryFn: getCriticalLabReports,
    retry: 1,
  });
};
