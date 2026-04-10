import client from "./client";
import { FamilyMember, HealthSession, Prescription, DoctorVisit, PendingActionsResponse } from "../types";

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

export const getHealthSession = async (
  familyMemberId: number,
  sessionId: number
): Promise<{
  health_session: HealthSession;
  prescriptions: Prescription[];
  doctor_visits: DoctorVisit[];
}> => {
  const { data } = await client.get(
    `/family_members/${familyMemberId}/health_sessions/${sessionId}`
  );
  return { ...data, doctor_visits: data.doctor_visits ?? [] };
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

export const getPendingActions = async (): Promise<PendingActionsResponse> => {
  const { data } = await client.get("/pending_actions");
  return {
    pending_tests: data.pending_tests ?? [],
    pending_referrals: data.pending_referrals ?? [],
    upcoming_followups: data.upcoming_followups ?? [],
    critical_lab_reports: data.critical_lab_reports ?? [],
    total_count: data.total_count ?? 0,
  };
};
