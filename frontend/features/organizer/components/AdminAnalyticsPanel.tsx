import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import AdminAnalyticsTree, {
  type AdminAnalyticsTreeNode,
} from '@/features/organizer/components/AdminAnalyticsTree';
import ScreenState from '@/shared/ui/ScreenState';
import { useI18n } from '@/shared/hooks/use-i18n';
import { clearAuthState, getApiErrorMessage } from '@/services/api';
import {
  fetchAdminAnalyticsDashboard,
  fetchAdminAnalyticsFlowTree,
  type AdminAnalyticsFlowTreeResponse,
  type AdminAnalyticsDashboardResponse,
  type DashboardBucket,
  type DashboardTrendRange,
  type DashboardTopSharedItem,
} from '@/services/organizer/admin-analytics';

type SummaryCardTone = 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';

function isUnauthorizedError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 401
  );
}

function formatCount(locale: string, value: number) {
  return new Intl.NumberFormat(locale).format(value);
}

function humanizeLabel(label: string) {
  return label
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/(^|\s)\S/g, (match) => match.toUpperCase());
}

function formatContentMixLabel(label: string, t: ReturnType<typeof useI18n>['t']) {
  const normalized = label.toUpperCase();

  if (normalized === 'EVENEMENTS' || normalized === 'ÉVÉNEMENTS' || normalized === 'EVENTS') {
    return t('adminAnalyticsContentEvents');
  }

  if (normalized === 'LIEUX' || normalized === 'PLACES') {
    return t('adminAnalyticsContentPlaces');
  }

  return humanizeLabel(label);
}

function formatOrganizerStatusLabel(
  label: string,
  t: ReturnType<typeof useI18n>['t'],
) {
  const normalized = label.toUpperCase();

  if (normalized === 'APPROVED') {
    return t('adminOrganizerStatusApproved');
  }

  if (normalized === 'REJECTED') {
    return t('adminOrganizerStatusRejected');
  }

  if (normalized === 'SUSPENDED') {
    return t('adminOrganizerStatusSuspended');
  }

  if (normalized === 'PENDING') {
    return t('adminOrganizerStatusPending');
  }

  return humanizeLabel(label);
}

function buildBucketPreview(
  buckets: DashboardBucket[],
  locale: string,
  mapLabel: (label: string) => string,
  limit = 3,
) {
  const formatter = new Intl.NumberFormat(locale);

  return buckets
    .slice(0, limit)
    .map((bucket) => `${mapLabel(bucket.label)} ${formatter.format(bucket.value)}`)
    .join(' · ');
}

function formatTopSharedLabel(item: DashboardTopSharedItem, t: ReturnType<typeof useI18n>['t']) {
  const title =
    item.Place?.name ||
    item.Event?.title ||
    item.content ||
    t('adminAnalyticsTopSharedFallback');

  if (title.length <= 42) {
    return title;
  }

  return `${title.slice(0, 39)}...`;
}

function formatTopSharedHint(
  item: DashboardTopSharedItem,
  locale: string,
  t: ReturnType<typeof useI18n>['t'],
) {
  const parts: string[] = [];

  if (item.shareCount !== null && item.shareCount !== undefined) {
    parts.push(`${formatCount(locale, item.shareCount)} ${t('adminAnalyticsSharesUnit')}`);
  }

  if (item.createdAt) {
    parts.push(
      new Date(item.createdAt).toLocaleDateString(locale, {
        day: '2-digit',
        month: 'short',
      }),
    );
  }

  return parts.join(' · ');
}

function SummaryCard({
  label,
  value,
  hint,
  icon,
  tone,
  locale,
}: {
  label: string;
  value: number;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: SummaryCardTone;
  locale: string;
}) {
  const styles = {
    blue: {
      container: 'bg-[#4c669f]/10 dark:bg-[#4c669f]/20',
      value: 'text-[#4c669f] dark:text-[#9bb4e6]',
      icon: '#4c669f',
    },
    emerald: {
      container: 'bg-emerald-100 dark:bg-emerald-900/30',
      value: 'text-emerald-700 dark:text-emerald-300',
      icon: '#059669',
    },
    amber: {
      container: 'bg-amber-100 dark:bg-amber-900/30',
      value: 'text-amber-700 dark:text-amber-300',
      icon: '#d97706',
    },
    rose: {
      container: 'bg-rose-100 dark:bg-rose-900/30',
      value: 'text-rose-700 dark:text-rose-300',
      icon: '#e11d48',
    },
    violet: {
      container: 'bg-violet-100 dark:bg-violet-900/30',
      value: 'text-violet-700 dark:text-violet-300',
      icon: '#7c3aed',
    },
  }[tone];

  return (
    <View
      className="mb-3 rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      style={{ width: '48%' }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-xs uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
            {label}
          </Text>
          <Text className={`mt-2 text-2xl font-bold ${styles.value}`}>
            {formatCount(locale, value)}
          </Text>
        </View>
        <View className={`h-11 w-11 items-center justify-center rounded-2xl ${styles.container}`}>
          <Ionicons name={icon} size={18} color={styles.icon} />
        </View>
      </View>
      <Text className="mt-3 text-xs leading-5 text-gray-500 dark:text-gray-400">
        {hint}
      </Text>
    </View>
  );
}

export default function AdminAnalyticsPanel() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [range, setRange] = useState<DashboardTrendRange>('month');
  const [dashboard, setDashboard] = useState<AdminAnalyticsDashboardResponse | null>(null);
  const [flowTree, setFlowTree] = useState<AdminAnalyticsFlowTreeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flowError, setFlowError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const loadDashboard = useCallback(
    async (nextRange: DashboardTrendRange) => {
      const initialLoad = !hasLoadedRef.current;

      if (initialLoad) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError(null);
      setFlowError(null);

      try {
        const [dashboardResult, flowResult] = await Promise.allSettled([
          fetchAdminAnalyticsDashboard({ range: nextRange }),
          fetchAdminAnalyticsFlowTree({ range: nextRange }),
        ]);

        if (dashboardResult.status === 'fulfilled') {
          setDashboard(dashboardResult.value);
        } else {
          const dashboardError = dashboardResult.reason;

          if (isUnauthorizedError(dashboardError)) {
            await clearAuthState();
            router.replace('/');
            return;
          }

          if (initialLoad) {
            setDashboard(null);
            setError(getApiErrorMessage(dashboardError, t('adminAnalyticsLoadFailed')));
          } else if (__DEV__) {
            console.warn('[AdminAnalyticsPanel] dashboard refresh failed', dashboardError);
          }
        }

        if (flowResult.status === 'fulfilled') {
          setFlowTree(flowResult.value);
        } else {
          const flowErrorValue = flowResult.reason;

          if (isUnauthorizedError(flowErrorValue)) {
            await clearAuthState();
            router.replace('/');
            return;
          }

          setFlowTree(null);
          setFlowError(getApiErrorMessage(flowErrorValue, t('adminAnalyticsLoadFailed')));
        }
        hasLoadedRef.current = true;
      } catch (error) {
        if (isUnauthorizedError(error)) {
          await clearAuthState();
          router.replace('/');
          return;
        }

        if (initialLoad) {
          setDashboard(null);
          setFlowTree(null);
          setError(getApiErrorMessage(error, t('adminAnalyticsLoadFailed')));
        } else if (__DEV__) {
          console.warn('[AdminAnalyticsPanel] refresh failed', error);
        }
      } finally {
        if (initialLoad) {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [router, t],
  );

  useEffect(() => {
    void loadDashboard(range);
  }, [loadDashboard, range]);

  const summaryCards = useMemo(() => {
    if (!dashboard) {
      return [];
    }

    const organizerPreview = buildBucketPreview(
      dashboard.distributions.organizerStatuses,
      locale,
      (label) => formatOrganizerStatusLabel(label, t),
    );

    const rolePreview = buildBucketPreview(
      dashboard.distributions.userRoles,
      locale,
      humanizeLabel,
    );

    const reportTypePreview = buildBucketPreview(
      dashboard.distributions.reportsByType,
      locale,
      humanizeLabel,
    );

    const topSharedPreview =
      dashboard.topShared
        .slice(0, 3)
        .map((item) => formatTopSharedLabel(item, t))
        .join(' · ') || t('adminAnalyticsBranchEmpty');

    return [
      {
        id: 'users',
        label: t('adminAnalyticsMetricUsers'),
        value: dashboard.summary.totalUsers,
        hint: t('adminAnalyticsSummaryUsersHint', {
          active: dashboard.summary.activeUsers,
          suspended: dashboard.summary.suspendedUsers,
        }),
        icon: 'people-outline' as const,
        tone: 'blue' as const,
      },
      {
        id: 'events',
        label: t('adminAnalyticsMetricEvents'),
        value: dashboard.summary.totalEvents,
        hint: t('adminAnalyticsSummaryNewHint', {
          count: dashboard.comparisons.events.current,
        }),
        icon: 'calendar-outline' as const,
        tone: 'emerald' as const,
      },
      {
        id: 'places',
        label: t('adminAnalyticsMetricPlaces'),
        value: dashboard.summary.totalPlaces,
        hint: t('adminAnalyticsSummaryNewHint', {
          count: dashboard.comparisons.places.current,
        }),
        icon: 'location-outline' as const,
        tone: 'violet' as const,
      },
      {
        id: 'reports',
        label: t('adminAnalyticsMetricReports'),
        value: dashboard.summary.totalReports,
        hint: t('adminAnalyticsSummaryPendingHint', {
          count: dashboard.summary.pendingReports,
        }),
        icon: 'warning-outline' as const,
        tone: 'amber' as const,
      },
      {
        id: 'shares',
        label: t('adminAnalyticsMetricShares'),
        value: dashboard.summary.totalShares,
        hint: t('adminAnalyticsSummarySharesHint', {
          items: topSharedPreview,
        }),
        icon: 'share-social-outline' as const,
        tone: 'rose' as const,
      },
      {
        id: 'pro',
        label: t('adminAnalyticsMetricPro'),
        value: dashboard.summary.pendingOrganizerProfiles,
        hint: t('adminAnalyticsSummaryProHint', {
          items: organizerPreview || rolePreview || reportTypePreview || t('adminAnalyticsBranchEmpty'),
        }),
        icon: 'briefcase-outline' as const,
        tone: 'blue' as const,
      },
    ];
  }, [dashboard, locale, t]);

  const flowSummaryCards = useMemo(() => {
    if (!flowTree) {
      return [];
    }

    return [
      {
        id: 'flow-sessions',
        label: t('adminFlowMetricSessions'),
        value: flowTree.summary.uniqueSessions,
        hint: t('adminFlowSummarySessionsHint', {
          count: flowTree.summary.totalEvents,
        }),
        icon: 'time-outline' as const,
        tone: 'blue' as const,
      },
      {
        id: 'flow-users',
        label: t('adminFlowMetricUsers'),
        value: flowTree.summary.uniqueUsers,
        hint: t('adminFlowSummaryUsersHint', {
          count: flowTree.summary.uniqueUsers,
        }),
        icon: 'people-outline' as const,
        tone: 'emerald' as const,
      },
      {
        id: 'flow-screens',
        label: t('adminFlowMetricScreenViews'),
        value: flowTree.summary.screenViews,
        hint: t('adminFlowSummaryScreensHint', {
          count: flowTree.summary.screenViews,
        }),
        icon: 'phone-portrait-outline' as const,
        tone: 'violet' as const,
      },
      {
        id: 'flow-actions',
        label: t('adminFlowMetricActions'),
        value: flowTree.summary.actionEvents,
        hint: t('adminFlowSummaryActionsHint', {
          count: flowTree.summary.actionEvents,
        }),
        icon: 'flash-outline' as const,
        tone: 'amber' as const,
      },
    ];
  }, [flowTree, t]);

  const flowTreeRoot = useMemo<AdminAnalyticsTreeNode | null>(() => {
    if (!flowTree) {
      return null;
    }

    return {
      ...(flowTree.tree as AdminAnalyticsTreeNode),
      label: t('adminAnalyticsTreeTitle'),
      hint: `${flowTree.summary.uniqueUsers} ${t('adminFlowMetricUsers')} · ${
        flowTree.summary.screenViews
      } ${t('adminFlowMetricScreenViews')} · ${flowTree.summary.actionEvents} ${t(
        'adminFlowMetricActions',
      )}`,
    };
  }, [flowTree, t]);

  const treeRoot = useMemo<AdminAnalyticsTreeNode | null>(() => {
    if (!dashboard) {
      return null;
    }

    const roleNodes: AdminAnalyticsTreeNode[] = dashboard.distributions.userRoles.map(
      (bucket) => ({
        id: `role-${bucket.label}`,
        label: humanizeLabel(bucket.label),
        value: bucket.value,
        tone: 'slate',
        icon: 'person-outline',
      }),
    );

    const reportTypeNodes: AdminAnalyticsTreeNode[] = dashboard.distributions.reportsByType.map(
      (bucket) => ({
        id: `report-${bucket.label}`,
        label: humanizeLabel(bucket.label),
        value: bucket.value,
        tone: 'amber',
        icon: 'alert-circle-outline',
      }),
    );

    const contentMixNodes: AdminAnalyticsTreeNode[] = dashboard.distributions.contentMix.map(
      (bucket) => ({
        id: `content-${bucket.label}`,
        label: formatContentMixLabel(bucket.label, t),
        value: bucket.value,
        tone: bucket.label.toUpperCase().includes('EVENT') ? 'emerald' : 'violet',
        icon: bucket.label.toUpperCase().includes('EVENT') ? 'calendar-outline' : 'location-outline',
      }),
    );

    const organizerStatusNodes: AdminAnalyticsTreeNode[] =
      dashboard.distributions.organizerStatuses.map((bucket) => ({
        id: `status-${bucket.label}`,
        label: formatOrganizerStatusLabel(bucket.label, t),
        value: bucket.value,
        tone: bucket.label.toUpperCase() === 'APPROVED' ? 'emerald' : bucket.label.toUpperCase() === 'REJECTED' ? 'rose' : bucket.label.toUpperCase() === 'SUSPENDED' ? 'amber' : 'amber',
        icon:
          bucket.label.toUpperCase() === 'APPROVED'
            ? 'checkmark-circle-outline'
            : bucket.label.toUpperCase() === 'REJECTED'
              ? 'close-circle-outline'
              : bucket.label.toUpperCase() === 'SUSPENDED'
                ? 'pause-circle-outline'
                : 'time-outline',
      }));

    const topSharedNodes: AdminAnalyticsTreeNode[] = dashboard.topShared
      .slice(0, 4)
      .map((item, index) => ({
        id: `shared-${item.id}`,
        label: formatTopSharedLabel(item, t),
        value: item.shareCount || 0,
        hint: formatTopSharedHint(item, locale, t),
        tone: 'violet',
        icon: 'share-social-outline',
      }));

    const summaryContent = dashboard.summary.totalEvents + dashboard.summary.totalPlaces;

    return {
      id: 'root',
      label: t('adminAnalyticsTreeTitle'),
      value: dashboard.window.label,
      hint: t('adminAnalyticsTreeNote'),
      tone: 'violet',
      icon: 'analytics-outline',
      children: [
        {
          id: 'community',
          label: t('adminAnalyticsBranchCommunity'),
          value: dashboard.summary.totalUsers,
          hint: t('adminAnalyticsBranchCommunityHint', {
            active: dashboard.summary.activeUsers,
            suspended: dashboard.summary.suspendedUsers,
            newUsers: dashboard.comparisons.users.current,
          }),
          tone: 'blue',
          icon: 'people-outline',
          children: [
            {
              id: 'community-active',
              label: t('adminAnalyticsMetricActiveUsers'),
              value: dashboard.summary.activeUsers,
              tone: 'emerald',
              icon: 'checkmark-circle-outline',
            },
            {
              id: 'community-suspended',
              label: t('adminAnalyticsMetricSuspendedUsers'),
              value: dashboard.summary.suspendedUsers,
              tone: 'rose',
              icon: 'close-circle-outline',
            },
            {
              id: 'community-new',
              label: t('adminAnalyticsMetricNewUsers'),
              value: dashboard.comparisons.users.current,
              tone: 'amber',
              icon: 'person-add-outline',
            },
            {
              id: 'community-roles',
              label: t('adminAnalyticsBranchRoles'),
              value: dashboard.distributions.userRoles.length,
              tone: 'slate',
              icon: 'layers-outline',
              children: roleNodes,
            },
          ],
        },
        {
          id: 'content',
          label: t('adminAnalyticsBranchContent'),
          value: summaryContent,
          hint: t('adminAnalyticsBranchContentHint', {
            events: dashboard.summary.totalEvents,
            places: dashboard.summary.totalPlaces,
          }),
          tone: 'emerald',
          icon: 'compass-outline',
          children: [
            {
              id: 'content-events',
              label: t('adminAnalyticsMetricEvents'),
              value: dashboard.summary.totalEvents,
              tone: 'emerald',
              icon: 'calendar-outline',
            },
            {
              id: 'content-places',
              label: t('adminAnalyticsMetricPlaces'),
              value: dashboard.summary.totalPlaces,
              tone: 'violet',
              icon: 'location-outline',
            },
            {
              id: 'content-mix',
              label: t('adminAnalyticsBranchContentMix'),
              value: dashboard.distributions.contentMix.length,
              tone: 'slate',
              icon: 'git-branch-outline',
              children: contentMixNodes,
            },
          ],
        },
        {
          id: 'moderation',
          label: t('adminAnalyticsBranchModeration'),
          value: dashboard.summary.totalReports,
          hint: t('adminAnalyticsBranchModerationHint', {
            pending: dashboard.summary.pendingReports,
          }),
          tone: 'amber',
          icon: 'warning-outline',
          children: [
            {
              id: 'moderation-pending',
              label: t('adminAnalyticsMetricPendingReports'),
              value: dashboard.summary.pendingReports,
              tone: 'rose',
              icon: 'time-outline',
            },
            {
              id: 'moderation-recent',
              label: t('adminAnalyticsMetricRecentReports'),
              value: dashboard.recent.reports.length,
              tone: 'amber',
              icon: 'document-text-outline',
            },
            {
              id: 'moderation-types',
              label: t('adminAnalyticsBranchReportsByType'),
              value: dashboard.distributions.reportsByType.length,
              tone: 'slate',
              icon: 'pie-chart-outline',
              children: reportTypeNodes,
            },
          ],
        },
        {
          id: 'pro',
          label: t('adminAnalyticsBranchPro'),
          value: dashboard.summary.pendingOrganizerProfiles,
          hint: t('adminAnalyticsBranchProHint', {
            pending: dashboard.summary.pendingOrganizerProfiles,
          }),
          tone: 'blue',
          icon: 'briefcase-outline',
          children: [
            {
              id: 'pro-pending',
              label: t('adminAnalyticsMetricPendingOrganizerProfiles'),
              value: dashboard.summary.pendingOrganizerProfiles,
              tone: 'amber',
              icon: 'time-outline',
            },
            {
              id: 'pro-statuses',
              label: t('adminAnalyticsBranchStatuses'),
              value: dashboard.distributions.organizerStatuses.length,
              tone: 'slate',
              icon: 'stats-chart-outline',
              children: organizerStatusNodes,
            },
          ],
        },
        {
          id: 'sharing',
          label: t('adminAnalyticsBranchSharing'),
          value: dashboard.summary.totalShares,
          hint: t('adminAnalyticsBranchSharingHint', {
            top: topSharedNodes.length,
          }),
          tone: 'violet',
          icon: 'share-social-outline',
          children:
            topSharedNodes.length > 0
              ? topSharedNodes
              : [
                  {
                    id: 'sharing-empty',
                    label: t('adminAnalyticsBranchTopSharedEmpty'),
                    value: 0,
                    tone: 'slate',
                    icon: 'share-outline',
                  },
                ],
        },
      ],
    };
  }, [dashboard, locale, t]);

  if (loading && !dashboard && !error) {
    return (
      <ScreenState
        mode="loading"
        title={t('adminAnalyticsLoading')}
        containerClassName="px-0 pt-4"
      />
    );
  }

  if (error && !dashboard) {
    return (
      <ScreenState
        mode="error"
        title={error}
        actionLabel={t('commonRetry')}
        onAction={() => {
          void loadDashboard(range);
        }}
        containerClassName="px-0 pt-4"
      />
    );
  }

  if (!dashboard || !treeRoot) {
    return null;
  }

  return (
    <View className="mt-5">
      <View className="rounded-[32px] bg-white p-5 shadow-sm dark:bg-gray-900">
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              {t('adminAnalyticsTitle')}
            </Text>
            <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('adminAnalyticsSubtitle')}
            </Text>
            <View className="mt-3 self-start rounded-full bg-[#4c669f]/10 px-3 py-1.5">
              <Text className="text-xs font-semibold text-[#4c669f]">
                {dashboard.window.label}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => {
              void loadDashboard(range);
            }}
            disabled={refreshing}
            className="rounded-full bg-gray-100 px-4 py-3 dark:bg-gray-800"
            style={{ opacity: refreshing ? 0.7 : 1 }}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#4c669f" />
            ) : (
              <View className="flex-row items-center gap-2">
                <Ionicons name="refresh-outline" size={16} color="#4c669f" />
                <Text className="text-sm font-semibold text-[#4c669f]">
                  {t('adminAnalyticsRefresh')}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View className="mt-4 flex-row gap-2">
          {([
            { id: 'week', label: t('adminAnalyticsRangeWeek') },
            { id: 'month', label: t('adminAnalyticsRangeMonth') },
            { id: 'quarter', label: t('adminAnalyticsRangeQuarter') },
          ] as const).map((option) => {
            const selected = range === option.id;

            return (
              <TouchableOpacity
                key={option.id}
                onPress={() => setRange(option.id)}
                className={`flex-1 rounded-full px-3 py-3 ${
                  selected ? 'bg-[#4c669f]' : 'bg-gray-100 dark:bg-gray-800'
                }`}
              >
                <Text
                  className={`text-center text-xs font-semibold ${
                    selected ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View className="mt-5 flex-row flex-wrap justify-between">
          {summaryCards.map((card) => (
            <SummaryCard
              key={card.id}
              label={card.label}
              value={card.value}
              hint={card.hint}
              icon={card.icon}
              tone={card.tone}
              locale={locale}
            />
          ))}
        </View>
      </View>

      <View className="mt-5 rounded-[32px] bg-white p-5 shadow-sm dark:bg-gray-900">
        <Text className="text-xs uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
          {t('adminAnalyticsWindowLabel')}
        </Text>
        <Text className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
          {t('adminAnalyticsTreeTitle')}
        </Text>
        <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t('adminAnalyticsTreeSubtitle')}
        </Text>

        <View className="mt-4 flex-row flex-wrap justify-between">
          {flowSummaryCards.map((card) => (
            <SummaryCard
              key={card.id}
              label={card.label}
              value={card.value}
              hint={card.hint}
              icon={card.icon}
              tone={card.tone}
              locale={locale}
            />
          ))}
        </View>

        <View className="mt-4 rounded-[26px] bg-gray-50 p-4 dark:bg-gray-950/70">
          {flowError ? (
            <ScreenState
              mode="error"
              title={flowError}
              actionLabel={t('commonRetry')}
              onAction={() => {
                void loadDashboard(range);
              }}
              containerClassName="px-0 py-4"
            />
          ) : flowTree?.summary.totalEvents === 0 ? (
            <ScreenState
              mode="empty"
              title={t('adminAnalyticsBranchEmpty')}
              description={t('adminAnalyticsTreeNote')}
              containerClassName="px-0 py-4"
            />
          ) : flowTreeRoot ? (
            <AdminAnalyticsTree root={flowTreeRoot} locale={locale} />
          ) : (
            <ScreenState
              mode="loading"
              title={t('adminAnalyticsLoading')}
              containerClassName="px-0 py-4"
            />
          )}
        </View>

        <Text className="mt-4 text-xs leading-5 text-gray-400 dark:text-gray-500">
          {t('adminAnalyticsTreeNote')}
        </Text>
      </View>
    </View>
  );
}
