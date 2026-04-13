import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyCaregivers,
  lookupPhone,
  sendInvite,
  removeConnection,
} from "../api/caregivers";

export const useGetMyCaregivers = () => {
  return useQuery({
    queryKey: ["myCaregivers"],
    queryFn: getMyCaregivers,
  });
};

export const useLookupPhone = () => {
  return useMutation({
    mutationFn: lookupPhone,
  });
};

export const useSendInvite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myCaregivers"] });
    },
  });
};

export const useRemoveConnection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeConnection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myCaregivers"] });
    },
  });
};
