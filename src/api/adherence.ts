import client from "./client";
import { AdherenceLog, PatientCriticalLabReport } from "../types";

export interface TodayMedicines {
  morning: AdherenceLog[];
  afternoon: AdherenceLog[];
  evening: AdherenceLog[];
  night: AdherenceLog[];
}

export const getTodaysMedicines = async (): Promise<TodayMedicines> => {
  const { data } = await client.get("/adherence/today");
  return data;
};

export const markTaken = async (
  adherenceLogId: number
): Promise<AdherenceLog> => {
  const { data } = await client.patch(
    `/adherence/${adherenceLogId}/mark_taken`
  );
  return data.adherence_log;
};

export const markSnoozed = async (
  adherenceLogId: number
): Promise<AdherenceLog> => {
  const { data } = await client.patch(`/adherence/${adherenceLogId}/snooze`);
  return data.adherence_log;
};

export const getMemberAdherence = async (
  familyMemberId: number
): Promise<TodayMedicines> => {
  const { data } = await client.get(
    `/family_members/${familyMemberId}/adherence/today`
  );
  return data;
};

export const getCriticalLabReports = async (): Promise<
  PatientCriticalLabReport[]
> => {
  try {
    const { data } = await client.get("/adherence/critical_lab_reports");
    return data.critical_lab_reports;
  } catch {
    // Endpoint may not exist yet — return empty gracefully
    return [];
  }
};
