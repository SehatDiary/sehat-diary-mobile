import { useMutation, useQuery } from "@tanstack/react-query";
import {
  uploadLabReport,
  getAnalysisStatus,
  getLabReport,
  getLabReports,
} from "../api/labReports";

export const useUploadLabReport = () => {
  return useMutation({
    mutationFn: async ({
      familyMemberId,
      healthSessionId,
      images,
      pdfFile,
      prescribedTestId,
    }: {
      familyMemberId: number;
      healthSessionId: number;
      images: string[];
      pdfFile?: string;
      prescribedTestId?: number;
    }) => {
      return uploadLabReport(
        familyMemberId,
        healthSessionId,
        images,
        pdfFile,
        prescribedTestId
      );
    },
  });
};

export const useGetAnalysisStatus = (
  reportId: number | null,
  enabled: boolean
) => {
  return useQuery({
    queryKey: ["labReportStatus", reportId],
    queryFn: () => getAnalysisStatus(reportId!),
    enabled: enabled && reportId !== null,
    refetchInterval: 3000,
  });
};

export const useGetLabReport = (
  familyMemberId: number,
  healthSessionId: number,
  reportId: number
) => {
  return useQuery({
    queryKey: ["labReport", familyMemberId, healthSessionId, reportId],
    queryFn: () => getLabReport(familyMemberId, healthSessionId, reportId),
  });
};

export const useGetLabReports = (
  familyMemberId: number,
  healthSessionId: number
) => {
  return useQuery({
    queryKey: ["labReports", familyMemberId, healthSessionId],
    queryFn: () => getLabReports(familyMemberId, healthSessionId),
  });
};
