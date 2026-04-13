import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyCaregivers,
  lookupPhone,
  sendInvite,
  removeConnection,
  getPendingInvites,
  acceptInvite,
  declineInvite,
  getMyPatients,
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

export const useGetPendingInvites = () => {
  return useQuery({
    queryKey: ["pendingInvites"],
    queryFn: getPendingInvites,
  });
};

export const useAcceptInvite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingInvites"] });
      queryClient.invalidateQueries({ queryKey: ["familyMembers"] });
      queryClient.invalidateQueries({ queryKey: ["myPatients"] });
    },
  });
};

export const useDeclineInvite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: declineInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingInvites"] });
    },
  });
};

export const useGetMyPatients = () => {
  return useQuery({
    queryKey: ["myPatients"],
    queryFn: getMyPatients,
  });
};
