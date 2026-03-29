import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTodaysMedicines,
  markTaken,
  markSnoozed,
  TodayMedicines,
} from "../api/adherence";

export const useGetTodaysMedicines = () => {
  return useQuery({
    queryKey: ["todaysMedicines"],
    queryFn: getTodaysMedicines,
  });
};

export const useMarkTaken = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markTaken,
    onMutate: async (adherenceLogId) => {
      await queryClient.cancelQueries({ queryKey: ["todaysMedicines"] });
      const previous = queryClient.getQueryData<TodayMedicines>(["todaysMedicines"]);

      if (previous) {
        const updated = { ...previous };
        for (const slot of ["morning", "afternoon", "evening", "night"] as const) {
          updated[slot] = updated[slot].map((log) =>
            log.id === adherenceLogId ? { ...log, taken: true } : log
          );
        }
        queryClient.setQueryData(["todaysMedicines"], updated);
      }

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["todaysMedicines"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["todaysMedicines"] });
    },
  });
};

export const useMarkSnoozed = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markSnoozed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todaysMedicines"] });
    },
  });
};
