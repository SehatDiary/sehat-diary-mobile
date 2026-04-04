import client from "./client";
import { LabReport, LabReportAnalysisStatus } from "../types";

export const uploadLabReport = async (
  familyMemberId: number,
  healthSessionId: number,
  images: string[],
  pdfFile?: string,
  prescribedTestId?: number
): Promise<LabReport> => {
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

  const { data } = await client.post(
    `/family_members/${familyMemberId}/health_sessions/${healthSessionId}/lab_reports`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data.lab_report;
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
): Promise<LabReport> => {
  const { data } = await client.get(
    `/family_members/${familyMemberId}/health_sessions/${healthSessionId}/lab_reports/${reportId}`
  );
  return data.lab_report;
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
