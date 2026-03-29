import client from "./client";
import { FamilyMember, HealthSession } from "../types";

export const getFamilyMembers = async (): Promise<FamilyMember[]> => {
  const { data } = await client.get("/family_members");
  return data.family_members;
};

export const getFamilyMember = async (
  id: number
): Promise<{ family_member: FamilyMember; health_sessions: HealthSession[] }> => {
  const { data } = await client.get(`/family_members/${id}`);
  return data;
};

export const createFamilyMember = async (params: {
  name: string;
  relation: string;
  age?: number;
  gender?: string;
  chronic_conditions?: string[];
}): Promise<FamilyMember> => {
  const { data } = await client.post("/family_members", params);
  return data.family_member;
};

export const updateFamilyMember = async (
  id: number,
  params: Partial<FamilyMember>
): Promise<FamilyMember> => {
  const { data } = await client.patch(`/family_members/${id}`, params);
  return data.family_member;
};

export const getHealthSessions = async (
  familyMemberId: number
): Promise<HealthSession[]> => {
  const { data } = await client.get(
    `/family_members/${familyMemberId}/health_sessions`
  );
  return data.health_sessions;
};

export const createHealthSession = async (
  familyMemberId: number,
  params: { started_at: string }
): Promise<HealthSession> => {
  const { data } = await client.post(
    `/family_members/${familyMemberId}/health_sessions`,
    params
  );
  return data.health_session;
};
