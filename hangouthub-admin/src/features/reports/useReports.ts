import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getApiErrorMessage } from '@/lib/api/errors';
import { useToast } from '@/lib/toast/useToast';
import {
  fetchReports,
  updateReportStatus,
  type ReportStatus,
} from './reports.api';

export const reportsKey = ['reports'] as const;

export function useReports() {
  return useQuery({
    queryKey: reportsKey,
    queryFn: fetchReports,
  });
}

export function useUpdateReportStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (vars: { reportId: string; status: ReportStatus }) =>
      updateReportStatus(vars.reportId, vars.status),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: reportsKey });
      toast({
        title:
          vars.status === 'RESOLVED' ? 'Signalement résolu' : 'Signalement classé',
        variant: 'success',
      });
    },
    onError: (error) => toast({ title: getApiErrorMessage(error), variant: 'error' }),
  });
}
