import client from "./client";
import { AdherenceLog } from "../types";

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
