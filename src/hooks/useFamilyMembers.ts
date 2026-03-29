import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getFamilyMembers,
  getFamilyMember,
  createFamilyMember,
  updateFamilyMember,
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
