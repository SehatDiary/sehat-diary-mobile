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

// One factory per query key, used by both the query that reads it and every
// mutation that invalidates it. Repeating the literals in both places looks
// identical right up until an argument is added to one of them, and then a
// mutation silently stops refreshing the screen it was meant to refresh.
export const familyMembersKey = () => ["familyMembers"];
export const familyMemberKey = (id: number) => ["familyMember", id];
export const healthSessionsKey = (memberId: number) => [
  "healthSessions",
  memberId,
];
export const healthSessionKey = (memberId: number, sessionId: number) => [
  "healthSession",
  memberId,
  sessionId,
];
export const pendingActionsKey = () => ["pendingActions"];

export const useGetFamilyMembers = () => {
  return useQuery({
    queryKey: familyMembersKey(),
    queryFn: getFamilyMembers,
  });
};

export const useGetFamilyMember = (id: number) => {
  return useQuery({
    queryKey: familyMemberKey(id),
    queryFn: () => getFamilyMember(id),
  });
};

export const useCreateFamilyMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFamilyMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: familyMembersKey() });
    },
  });
};

export const useUpdateFamilyMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...params }: { id: number } & Record<string, unknown>) =>
      updateFamilyMember(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: familyMembersKey() });
    },
  });
};

export const useGetHealthSession = (memberId: number, sessionId: number) => {
  return useQuery({
    queryKey: healthSessionKey(memberId, sessionId),
    queryFn: () => getHealthSession(memberId, sessionId),
  });
};

export const useGetHealthSessions = (memberId: number) => {
  return useQuery({
    queryKey: healthSessionsKey(memberId),
    queryFn: () => getHealthSessions(memberId),
  });
};

export const useCreateHealthSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, startedAt }: { memberId: number; startedAt: string }) =>
      createHealthSession(memberId, { started_at: startedAt }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: healthSessionsKey(variables.memberId) });
      queryClient.invalidateQueries({ queryKey: familyMemberKey(variables.memberId) });
    },
  });
};

export const useGetPendingActions = () => {
  return useQuery({
    queryKey: pendingActionsKey(),
    queryFn: getPendingActions,
  });
};
