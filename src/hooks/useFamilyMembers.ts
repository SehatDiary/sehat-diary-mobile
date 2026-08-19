import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  todaysMedicinesKey,
  memberAdherenceKey,
  memberAdherenceHistoryKey,
} from "./useAdherence";
import {
  getFamilyMembers,
  getFamilyMember,
  createFamilyMember,
  updateFamilyMember,
  getHealthSessions,
  getHealthSession,
  createHealthSession,
  getPendingActions,
  getCurrentMedicines,
  deleteHealthSession,
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
export const currentMedicinesKey = (memberId: number) => [
  "currentMedicines",
  memberId,
];

export const useGetFamilyMembers = () => {
  return useQuery({
    queryKey: familyMembersKey(),
    queryFn: getFamilyMembers,
  });
};

export const useGetFamilyMember = (
  id: number,
  options: { enabled?: boolean } = {}
) => {
  return useQuery({
    queryKey: familyMemberKey(id),
    queryFn: () => getFamilyMember(id),
    enabled: options.enabled ?? true,
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
    onSuccess: (_data, { id }) => {
      // The detail screen reads familyMemberKey, so invalidating only the list
      // left the screen the caregiver was looking at showing the old values.
      queryClient.invalidateQueries({ queryKey: familyMembersKey() });
      queryClient.invalidateQueries({ queryKey: familyMemberKey(id) });
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

export const useGetCurrentMedicines = (memberId: number) => {
  return useQuery({
    queryKey: currentMedicinesKey(memberId),
    queryFn: () => getCurrentMedicines(memberId),
  });
};

// Deleting a visit stops its medicines, so every list that shows a medicine or a
// dose is now wrong until it refetches — not just the session list.
export const useDeleteHealthSession = (memberId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: number) => deleteHealthSession(memberId, sessionId),
    onSuccess: () => {
      for (const queryKey of [
        healthSessionsKey(memberId),
        familyMemberKey(memberId),
        currentMedicinesKey(memberId),
        memberAdherenceKey(memberId),
        memberAdherenceHistoryKey(memberId),
        todaysMedicinesKey(),
        pendingActionsKey(),
      ]) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });
};
