import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getFamilyMembers,
  getFamilyMember,
  createFamilyMember,
  updateFamilyMember,
  getHealthSessions,
  getHealthSession,
  createHealthSession,
  getPendingActions,
} from "../api/familyMembers";

export const useGetFamilyMembers = () => {
  return useQuery({
    queryKey: ["familyMembers"],
    queryFn: getFamilyMembers,
  });
};

export const useGetFamilyMember = (id: number) => {
  return useQuery({
    queryKey: ["familyMember", id],
    queryFn: () => getFamilyMember(id),
  });
};

export const useCreateFamilyMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFamilyMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familyMembers"] });
    },
  });
};

export const useUpdateFamilyMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...params }: { id: number } & Record<string, unknown>) =>
      updateFamilyMember(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familyMembers"] });
    },
  });
};

export const useGetHealthSession = (memberId: number, sessionId: number) => {
  return useQuery({
    queryKey: ["healthSession", memberId, sessionId],
    queryFn: () => getHealthSession(memberId, sessionId),
  });
};

export const useGetHealthSessions = (memberId: number) => {
  return useQuery({
    queryKey: ["healthSessions", memberId],
    queryFn: () => getHealthSessions(memberId),
  });
};

export const useCreateHealthSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, startedAt }: { memberId: number; startedAt: string }) =>
      createHealthSession(memberId, { started_at: startedAt }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["healthSessions", variables.memberId] });
      queryClient.invalidateQueries({ queryKey: ["familyMember", variables.memberId] });
    },
  });
};

export const useGetPendingActions = () => {
  return useQuery({
    queryKey: ["pendingActions"],
    queryFn: getPendingActions,
  });
};
