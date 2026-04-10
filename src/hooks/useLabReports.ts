import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export const useAutoRefreshLabReports = (
  familyMemberId: number,
  healthSessionId: number,
  enabled: boolean
) => {
  const queryClient = useQueryClient();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (enabled) {
      intervalRef.current = setInterval(() => {
        queryClient.invalidateQueries({
          queryKey: ["labReports", familyMemberId, healthSessionId],
        });
      }, 5000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, familyMemberId, healthSessionId, queryClient]);
};
