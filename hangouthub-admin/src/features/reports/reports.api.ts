import { api } from '@/lib/api/client';

export type ReportStatus = 'PENDING' | 'RESOLVED' | 'DISMISSED';

export interface ReportItem {
  id: string;
  reporterId: string;
  targetId: string;
  targetType: string;
  reason: string;
  status: string | null;
  createdAt: string;
  actionTaken?: string | null;
  moderatorNote?: string | null;
  Reporter?: {
    username: string | null;
    displayName: string | null;
  } | null;
}

export async function fetchReports() {
  const { data } = await api.get<ReportItem[]>('/reports/admin');
  return data;
}

export async function updateReportStatus(reportId: string, status: ReportStatus) {
  const { data } = await api.patch(`/reports/${reportId}`, { status });
  return data;
}
