import client from "./client";
import {
  LabReport,
  LabReportAnalysisStatus,
  LabReportResultData,
  LabReportUploadResult,
} from "../types";

/** healthSessionId null starts a new visit; the server creates it with the report. */
export const uploadLabReport = async (
  familyMemberId: number,
  healthSessionId: number | null,
  images: string[],
  pdfFile?: string,
  prescribedTestId?: number
): Promise<LabReportUploadResult> => {
  const formData = new FormData();

  images.forEach((uri, index) => {
    const filename = uri.split("/").pop() || `report_${index}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";

    formData.append("images[]", {
      uri,
      name: filename,
      type,
    } as unknown as Blob);
  });

  if (pdfFile) {
    const filename = pdfFile.split("/").pop() || "report.pdf";
    formData.append("pdf", {
      uri: pdfFile,
      name: filename,
      type: "application/pdf",
    } as unknown as Blob);
  }

  if (prescribedTestId) {
    formData.append("prescribed_test_id", String(prescribedTestId));
  }

  const path =
    healthSessionId == null
      ? `/family_members/${familyMemberId}/lab_reports`
      : `/family_members/${familyMemberId}/health_sessions/${healthSessionId}/lab_reports`;

  const { data } = await client.post(path, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  // Contract: create returns a FLAT payload — { lab_report_id, images_uploaded, status, ... }
  return {
    id: data.lab_report_id,
    health_session_id: data.health_session_id,
    images_uploaded: data.images_uploaded,
    status: data.status,
    message: data.message,
    message_hindi: data.message_hindi,
  };
};

export const getAnalysisStatus = async (
  reportId: number
): Promise<LabReportAnalysisStatus> => {
  const { data } = await client.get(
    `/lab_reports/${reportId}/analysis_status`
  );
  return data;
};

export const getLabReport = async (
  familyMemberId: number,
  healthSessionId: number,
  reportId: number
): Promise<LabReportResultData> => {
  const { data } = await client.get(
    `/family_members/${familyMemberId}/health_sessions/${healthSessionId}/lab_reports/${reportId}`
  );
  // Contract: findings, critical_findings and summaries are TOP-LEVEL
  // siblings of lab_report — flatten them into one result object.
  return {
    ...data.lab_report,
    findings: data.findings ?? [],
    critical_findings: data.critical_findings ?? [],
    hindi_summary: data.summaries?.hindi ?? null,
    english_summary: data.summaries?.english ?? null,
    next_steps: data.summaries?.next_steps ?? null,
    next_steps_hindi: data.summaries?.next_steps_hindi ?? null,
  };
};

export const getLabReports = async (
  familyMemberId: number,
  healthSessionId: number
): Promise<LabReport[]> => {
  const { data } = await client.get(
    `/family_members/${familyMemberId}/health_sessions/${healthSessionId}/lab_reports`
  );
  return data.lab_reports;
};
