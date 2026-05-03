import api from '../api';

export type DashboardTrendRange = 'week' | 'month' | 'quarter' | 'custom';

export interface DashboardTrendWindow {
  range: DashboardTrendRange;
  label: string;
  start: string;
  end: string;
  granularity: 'day' | 'week';
  points: number;
}

export interface DashboardTrendPoint {
  label: string;
  users: number;
  events: number;
  places: number;
  reports: number;
  shares: number;
}

export interface DashboardComparisonMetric {
  current: number;
  previous: number;
  delta: number;
  deltaPercent: number | null;
  trend: 'up' | 'down' | 'flat';
  label: string;
}

export interface DashboardAlertItem {
  severity: 'high' | 'medium' | 'low';
  title: string;
  subtitle: string;
  href?: string | null;
}

export interface DashboardBucket {
  label: string;
  value: number;
}

export interface DashboardTopSharedItem {
  id: string;
  content?: string | null;
  shareCount?: number | null;
  placeName?: string | null;
  cityName?: string | null;
  createdAt?: string | null;
  User?: {
    id: string;
    username?: string | null;
    displayName?: string | null;
  } | null;
  Place?: {
    id: string;
    name?: string | null;
    City?: {
      name?: string | null;
    } | null;
  } | null;
  Event?: {
    id: string;
    title?: string | null;
  } | null;
}

export interface DashboardSummary {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalEvents: number;
  totalPlaces: number;
  totalReports: number;
  totalShares: number;
  pendingReports: number;
  pendingOrganizerProfiles: number;
}

export interface DashboardRecentReport {
  id: string;
  targetType: string;
  reason: string;
  status: string | null;
  createdAt: string;
  reporter: {
    id: string;
    username?: string | null;
    displayName?: string | null;
    email?: string | null;
  };
}

export interface DashboardRecentEvent {
  id: string;
  title: string;
  createdAt: string;
  startTime: string;
  endTime: string | null;
  placeName: string | null;
  cityName: string | null;
}

export interface DashboardRecentUser {
  id: string;
  username: string;
  displayName: string | null;
  email: string | null;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
  isSuspended: boolean;
  organizerStatus: string | null;
}

export interface DashboardModerationItem {
  id: string;
  kind: 'REPORT' | 'ORGANIZER';
  title: string;
  subtitle: string;
  status: string;
  createdAt: string;
  href: string;
}

export interface AdminAnalyticsDashboardResponse {
  window: DashboardTrendWindow;
  summary: DashboardSummary;
  comparisons: {
    users: DashboardComparisonMetric;
    events: DashboardComparisonMetric;
    places: DashboardComparisonMetric;
    reports: DashboardComparisonMetric;
    shares: DashboardComparisonMetric;
  };
  alerts: DashboardAlertItem[];
  trends: {
    selected: DashboardTrendPoint[];
  };
  distributions: {
    reportsByType: DashboardBucket[];
    userRoles: DashboardBucket[];
    contentMix: DashboardBucket[];
    organizerStatuses: DashboardBucket[];
  };
  recent: {
    reports: DashboardRecentReport[];
    events: DashboardRecentEvent[];
    users: DashboardRecentUser[];
    moderationQueue: DashboardModerationItem[];
  };
  topShared: DashboardTopSharedItem[];
}

export interface AdminAnalyticsFlowTreeSummary {
  totalEvents: number;
  uniqueSessions: number;
  uniqueUsers: number;
  screenViews: number;
  actionEvents: number;
}

export interface AdminAnalyticsFlowTreeNode {
  id: string;
  label: string;
  value?: number | string;
  hint?: string;
  children?: AdminAnalyticsFlowTreeNode[];
}

export interface AdminAnalyticsFlowTreeResponse {
  window: DashboardTrendWindow;
  summary: AdminAnalyticsFlowTreeSummary;
  tree: AdminAnalyticsFlowTreeNode;
  topScreens: DashboardBucket[];
  topActions: DashboardBucket[];
}

export async function fetchAdminAnalyticsDashboard(
  input: Partial<Pick<DashboardTrendWindow, 'range'>> & {
    from?: string;
    to?: string;
  } = {},
) {
  const response = await api.get<AdminAnalyticsDashboardResponse>(
    '/admin/analytics/dashboard',
    {
      params: input,
    },
  );

  return response.data;
}

export async function fetchAdminAnalyticsFlowTree(
  input: Partial<Pick<DashboardTrendWindow, 'range'>> & {
    from?: string;
    to?: string;
  } = {},
) {
  const response = await api.get<AdminAnalyticsFlowTreeResponse>(
    '/admin/analytics/flow-tree',
    {
      params: input,
    },
  );

  return response.data;
}
