import { useQuery } from "@tanstack/react-query";
import { getLabReport } from "../api/labReports";

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
