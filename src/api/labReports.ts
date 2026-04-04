import client from "./client";
import { LabReportResult } from "../types";

export const getLabReport = async (
  familyMemberId: number,
  healthSessionId: number,
  reportId: number
): Promise<LabReportResult> => {
  const { data } = await client.get(
    `/family_members/${familyMemberId}/health_sessions/${healthSessionId}/lab_reports/${reportId}`
  );
  return data.lab_report;
};
