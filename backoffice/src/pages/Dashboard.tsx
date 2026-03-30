import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import DonutChart from '../components/analytics/DonutChart';
import TrendChart from '../components/analytics/TrendChart';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import SectionTitle from '../components/SectionTitle';
import { apiGet } from '../lib/api';

type TrendRange = 'week' | 'month' | 'quarter' | 'custom';

type TrendGranularity = 'day' | 'week';

interface DashboardTrendPoint {
  label: string;
  users: number;
  events: number;
  places: number;
  reports: number;
  shares: number;
  [key: string]: string | number;
}

interface DashboardBucket {
  label: string;
  value: number;
}

interface DashboardTopSharedItem {
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

interface DashboardRecentReport {
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

interface DashboardRecentEvent {
  id: string;
  title: string;
  createdAt: string;
  startTime: string;
  endTime: string | null;
  placeName: string | null;
  cityName: string | null;
}

interface DashboardRecentUser {
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

interface DashboardModerationItem {
  id: string;
  kind: 'REPORT' | 'ORGANIZER';
  title: string;
  subtitle: string;
  status: string;
  createdAt: string;
  href: string;
}

interface DashboardComparisonMetric {
  current: number;
  previous: number;
  delta: number;
  deltaPercent: number | null;
  trend: 'up' | 'down' | 'flat';
  label: string;
}

interface DashboardAlertItem {
  severity: 'high' | 'medium' | 'low';
  title: string;
  subtitle: string;
  href?: string | null;
}

interface DashboardWindow {
  range: TrendRange;
  label: string;
  start: string;
  end: string;
  granularity: TrendGranularity;
  points: number;
}

interface DashboardAnalyticsResponse {
  window: DashboardWindow;
  summary: {
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    totalEvents: number;
    totalPlaces: number;
    totalReports: number;
    totalShares: number;
    pendingReports: number;
    pendingOrganizerProfiles: number;
  };
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

const TREND_SERIES = [
  { key: 'users', label: 'Utilisateurs', color: '#2563eb' },
  { key: 'events', label: 'Evenements', color: '#f97316' },
  { key: 'places', label: 'Lieux', color: '#14b8a6' },
  { key: 'reports', label: 'Signalements', color: '#ec4899' },
  { key: 'shares', label: 'Partages', color: '#8b5cf6' },
];

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDefaultCustomRange() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 29);
  return {
    from: toDateInputValue(start),
    to: toDateInputValue(today),
  };
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDateShort(value?: string | null) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatCount(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value);
}

function formatCsvValue(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).replace(/"/g, '""');
}

function formatDownloadDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function StatusBadge({
  label,
  tone = 'slate',
}: {
  label: string;
  tone?: 'slate' | 'rose' | 'emerald' | 'amber' | 'brand';
}) {
  const toneClasses: Record<string, string> = {
    slate:
      'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200 border-slate-200 dark:border-slate-700',
    rose:
      'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200 border-rose-200 dark:border-rose-500/20',
    emerald:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200 border-emerald-200 dark:border-emerald-500/20',
    amber:
      'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200 border-amber-200 dark:border-amber-500/20',
    brand:
      'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200 border-brand-200 dark:border-brand-500/20',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}

function KPITrend({
  metric,
}: {
  metric: DashboardComparisonMetric;
}) {
  const trendStyles =
    metric.trend === 'up'
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
      : metric.trend === 'down'
        ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200'
        : 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300';
  const arrow = metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '→';
  const deltaText =
    metric.deltaPercent === null
      ? `${metric.delta >= 0 ? '+' : ''}${formatCount(metric.delta)} vs période précédente`
      : `${metric.delta >= 0 ? '+' : ''}${formatCount(metric.delta)} (${metric.deltaPercent > 0 ? '+' : ''}${metric.deltaPercent}%)`;

  return (
    <div className="mt-4 flex items-center gap-2 text-xs font-semibold">
      <span className={`inline-flex rounded-full px-2 py-1 ${trendStyles}`}>
        {arrow}
      </span>
      <span className="text-slate-500 dark:text-slate-400">{metric.label}</span>
      <span className="text-slate-700 dark:text-slate-200">{deltaText}</span>
    </div>
  );
}

function DashboardKpiCard({
  label,
  value,
  hint,
  tone = 'slate',
  metric,
  href,
}: {
  label: string;
  value: string | number;
  hint: string;
  tone?: 'brand' | 'slate' | 'rose' | 'emerald';
  metric: DashboardComparisonMetric;
  href?: string;
}) {
  const toneStyles: Record<string, string> = {
    brand:
      'bg-gradient-to-br from-brand-50 via-white to-brand-100/40 dark:from-brand-950/30 dark:via-slate-950 dark:to-brand-950/20',
    slate:
      'bg-gradient-to-br from-slate-50 via-white to-slate-100/50 dark:from-slate-900/70 dark:via-slate-950 dark:to-slate-900/30',
    rose:
      'bg-gradient-to-br from-rose-50 via-white to-rose-100/40 dark:from-rose-950/30 dark:via-slate-950 dark:to-rose-950/20',
    emerald:
      'bg-gradient-to-br from-emerald-50 via-white to-emerald-100/40 dark:from-emerald-950/30 dark:via-slate-950 dark:to-emerald-950/20',
  };

  const content = (
    <div
      className={`group rounded-2xl border border-slate-100 p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 ${toneStyles[tone]}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-4xl font-bold text-slate-900 dark:text-slate-100">
        {value}
      </p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{hint}</p>
      <KPITrend metric={metric} />
    </div>
  );

  if (!href) {
    return content;
  }

  if (href.startsWith('#')) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    );
  }

  return (
    <Link to={href} className="block">
      {content}
    </Link>
  );
}

function ActionButton({
  onClick,
  label,
  disabled,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
    >
      {label}
    </button>
  );
}

function AlertCard({
  item,
}: {
  item: DashboardAlertItem;
}) {
  const toneStyles: Record<DashboardAlertItem['severity'], string> = {
    high: 'border-rose-200 bg-rose-50/70 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200',
    medium:
      'border-amber-200 bg-amber-50/70 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200',
    low: 'border-slate-200 bg-slate-50/70 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
  };

  const content = (
    <div className={`rounded-2xl border p-4 ${toneStyles[item.severity]}`}>
      <p className="text-sm font-semibold">{item.title}</p>
      <p className="mt-1 text-xs opacity-80">{item.subtitle}</p>
    </div>
  );

  if (!item.href) {
    return content;
  }

  return (
    <Link to={item.href} className="block">
      {content}
    </Link>
  );
}

function RecentList({
  title,
  subtitle,
  children,
  empty,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-gray-950">
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {subtitle}
        </p>
      </div>
      {empty ? (
        <div className="mt-4">
          <EmptyState title="Aucune donnee." />
        </div>
      ) : (
        <div className="mt-4 space-y-3">{children}</div>
      )}
    </div>
  );
}

function RecentRow({
  title,
  subtitle,
  meta,
  badge,
  href,
}: {
  title: string;
  subtitle: string;
  meta: string;
  badge?: ReactNode;
  href?: string;
}) {
  const content = (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-brand-200 hover:bg-brand-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/5">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-100">
          {title}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {subtitle}
        </p>
        <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
          {meta}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {badge}
        {href ? <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">Voir</span> : null}
      </div>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link to={href} className="block">
      {content}
    </Link>
  );
}

function buildDashboardCsv(analytics: DashboardAnalyticsResponse | null) {
  if (!analytics) {
    return '';
  }

  const rows: string[][] = [];
  const push = (...cells: unknown[]) => {
    rows.push(cells.map((cell) => `"${formatCsvValue(cell)}"`));
  };

  push('Section', 'Subsection', 'Label', 'Value 1', 'Value 2', 'Value 3', 'Value 4', 'Value 5', 'Meta');
  push('summary', 'global', 'Utilisateurs', analytics.summary.totalUsers, '', '', '', '', `Actifs: ${analytics.summary.activeUsers} / Suspendus: ${analytics.summary.suspendedUsers}`);
  push('summary', 'global', 'Evenements', analytics.summary.totalEvents);
  push('summary', 'global', 'Lieux', analytics.summary.totalPlaces);
  push('summary', 'global', 'Signalements', analytics.summary.totalReports, '', '', '', '', `En attente: ${analytics.summary.pendingReports}`);
  push('summary', 'global', 'Partages', analytics.summary.totalShares);
  push('summary', 'global', 'Organizers en attente', analytics.summary.pendingOrganizerProfiles);

  push(
    'comparison',
    'users',
    analytics.comparisons.users.label,
    analytics.comparisons.users.current,
    analytics.comparisons.users.previous,
    analytics.comparisons.users.delta,
    analytics.comparisons.users.deltaPercent ?? '',
    analytics.comparisons.users.trend,
  );
  push(
    'comparison',
    'events',
    analytics.comparisons.events.label,
    analytics.comparisons.events.current,
    analytics.comparisons.events.previous,
    analytics.comparisons.events.delta,
    analytics.comparisons.events.deltaPercent ?? '',
    analytics.comparisons.events.trend,
  );
  push(
    'comparison',
    'places',
    analytics.comparisons.places.label,
    analytics.comparisons.places.current,
    analytics.comparisons.places.previous,
    analytics.comparisons.places.delta,
    analytics.comparisons.places.deltaPercent ?? '',
    analytics.comparisons.places.trend,
  );
  push(
    'comparison',
    'reports',
    analytics.comparisons.reports.label,
    analytics.comparisons.reports.current,
    analytics.comparisons.reports.previous,
    analytics.comparisons.reports.delta,
    analytics.comparisons.reports.deltaPercent ?? '',
    analytics.comparisons.reports.trend,
  );
  push(
    'comparison',
    'shares',
    analytics.comparisons.shares.label,
    analytics.comparisons.shares.current,
    analytics.comparisons.shares.previous,
    analytics.comparisons.shares.delta,
    analytics.comparisons.shares.deltaPercent ?? '',
    analytics.comparisons.shares.trend,
  );

  analytics.alerts.forEach((alert) => {
    push('alerts', alert.severity, alert.title, alert.subtitle, alert.href || '');
  });

  analytics.trends.selected.forEach((point) => {
    push('trends', analytics.window.range, point.label, point.users, point.events, point.places, point.reports, point.shares);
  });

  analytics.distributions.reportsByType.forEach((item) => {
    push('distribution', 'reportsByType', item.label, item.value);
  });
  analytics.distributions.userRoles.forEach((item) => {
    push('distribution', 'userRoles', item.label, item.value);
  });
  analytics.distributions.contentMix.forEach((item) => {
    push('distribution', 'contentMix', item.label, item.value);
  });
  analytics.distributions.organizerStatuses.forEach((item) => {
    push('distribution', 'organizerStatuses', item.label, item.value);
  });

  analytics.recent.reports.forEach((report) => {
    push(
      'recent',
      'reports',
      `${report.targetType.toUpperCase()} - ${report.reason}`,
      report.status || 'PENDING',
      '',
      '',
      '',
      '',
      `Par ${report.reporter.displayName || report.reporter.username || report.reporter.email || report.reporter.id} - ${report.createdAt}`,
    );
  });

  analytics.recent.events.forEach((event) => {
    push(
      'recent',
      'events',
      event.title,
      event.placeName || '',
      event.cityName || '',
      event.createdAt,
      event.startTime,
      event.endTime || '',
    );
  });

  analytics.recent.users.forEach((user) => {
    push(
      'recent',
      'users',
      user.displayName || user.username,
      user.email || '',
      user.role,
      user.isSuspended ? 'SUSPENDED' : 'ACTIVE',
      user.createdAt,
      user.lastLoginAt || '',
      user.organizerStatus || '',
    );
  });

  analytics.recent.moderationQueue.forEach((item) => {
    push('recent', 'moderationQueue', item.title, item.kind, item.status, item.createdAt, item.subtitle, item.href);
  });

  analytics.topShared.forEach((post) => {
    const label =
      post.Event?.title ||
      post.Place?.name ||
      post.placeName ||
      post.content?.split('\n')[0] ||
      'Publication';
    push('topShared', 'posts', label, post.shareCount ?? 0, post.cityName || post.Place?.City?.name || '', post.createdAt || '');
  });

  return rows.map((row) => row.join(',')).join('\n');
}

function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8;') {
  const blob = new Blob([`\uFEFF${content}`], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function Dashboard() {
  const [analytics, setAnalytics] = useState<DashboardAnalyticsResponse | null>(null);
  const [trendRange, setTrendRange] = useState<TrendRange>('month');
  const [customDraft, setCustomDraft] = useState(getDefaultCustomRange);
  const [appliedCustom, setAppliedCustom] = useState(getDefaultCustomRange);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set('range', trendRange);

    if (trendRange === 'custom') {
      params.set('from', appliedCustom.from);
      params.set('to', appliedCustom.to);
    }

    const query = params.toString();
    return query ? `?${query}` : '';
  }, [appliedCustom.from, appliedCustom.to, trendRange]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await apiGet<DashboardAnalyticsResponse>(
          `/admin/analytics/dashboard${requestParams}`,
        );

        if (isMounted) {
          setAnalytics(data);
        }
      } catch (loadError) {
        if (isMounted) {
          setError('Impossible de charger les donnees du dashboard.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [requestParams]);

  const summary = analytics?.summary;
  const comparisons = analytics?.comparisons;
  const alerts = analytics?.alerts || [];
  const trendData = analytics?.trends.selected || [];
  const hasTrendData = trendData.length > 0;
  const exportDisabled = loading || !analytics;
  const customValid = customDraft.from.length > 0 && customDraft.to.length > 0;
  const windowLabel = analytics?.window.label || (trendRange === 'week' ? '7 derniers jours' : trendRange === 'quarter' ? '12 dernieres semaines' : '30 derniers jours');

  const handleExportCsv = () => {
    if (!analytics) {
      return;
    }

    const filename = `dashboard-analytics-${formatDownloadDate(new Date())}.csv`;
    downloadTextFile(filename, buildDashboardCsv(analytics));
  };

  const applyCustomRange = () => {
    if (!customValid) {
      return;
    }

    setAppliedCustom(customDraft);
    setTrendRange('custom');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vue d ensemble"
        title="Tableau de bord"
        subtitle="Suis les chiffres clefs, les tendances et l activite recente de l application."
        actions={
          <>
            <ActionButton onClick={handleExportCsv} label="Exporter CSV" disabled={exportDisabled} />
          </>
        }
      />

      {error ? (
        <SectionCard>
          <EmptyState title="Dashboard indisponible." subtitle={error} />
        </SectionCard>
      ) : null}

      <SectionCard>
        <SectionTitle
          label="Indicateurs"
          subtitle="Vue rapide des volumes principaux sur la plateforme."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <DashboardKpiCard
            label="Utilisateurs"
            value={loading ? '...' : (summary?.totalUsers ?? 0)}
            hint={
              loading
                ? 'Chargement...'
                : `${formatCount(summary?.activeUsers ?? 0)} actifs / ${formatCount(summary?.suspendedUsers ?? 0)} suspendus`
            }
            tone="brand"
            metric={comparisons?.users || { current: 0, previous: 0, delta: 0, deltaPercent: null, trend: 'flat', label: 'Nouveaux utilisateurs' }}
            href="/users"
          />
          <DashboardKpiCard
            label="Evenements"
            value={loading ? '...' : (summary?.totalEvents ?? 0)}
            hint={loading ? 'Chargement...' : 'Evenements en base'}
            tone="emerald"
            metric={comparisons?.events || { current: 0, previous: 0, delta: 0, deltaPercent: null, trend: 'flat', label: 'Nouveaux evenements' }}
            href="/events"
          />
          <DashboardKpiCard
            label="Lieux"
            value={loading ? '...' : (summary?.totalPlaces ?? 0)}
            hint={loading ? 'Chargement...' : 'Lieux repertories'}
            tone="slate"
            metric={comparisons?.places || { current: 0, previous: 0, delta: 0, deltaPercent: null, trend: 'flat', label: 'Nouveaux lieux' }}
            href="/places"
          />
          <DashboardKpiCard
            label="Signalements"
            value={loading ? '...' : (summary?.totalReports ?? 0)}
            hint={
              loading
                ? 'Chargement...'
                : `${formatCount(summary?.pendingReports ?? 0)} en attente`
            }
            tone="rose"
            metric={comparisons?.reports || { current: 0, previous: 0, delta: 0, deltaPercent: null, trend: 'flat', label: 'Nouveaux signalements' }}
            href="/reports"
          />
          <DashboardKpiCard
            label="Partages"
            value={loading ? '...' : (summary?.totalShares ?? 0)}
            hint={loading ? 'Chargement...' : 'Partages historises'}
            tone="emerald"
            metric={comparisons?.shares || { current: 0, previous: 0, delta: 0, deltaPercent: null, trend: 'flat', label: 'Nouveaux partages' }}
            href="#partages"
          />
        </div>
      </SectionCard>

      <SectionCard>
        <SectionTitle
          label="A surveiller aujourd'hui"
          subtitle="Trois points maximum pour garder un oeil sur le fonctionnement."
        />
        {loading ? (
          <div className="mt-4">
            <LoadingState label="Analyse des alertes..." />
          </div>
        ) : alerts.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {alerts.map((item) => (
              <AlertCard key={`${item.severity}-${item.title}`} item={item} />
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState
              title="Rien de critique a signaler."
              subtitle="La situation est stable sur la periode selectionnee."
            />
          </div>
        )}
      </SectionCard>

      <SectionCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionTitle
            label="Tendances"
            subtitle={`Courbe globale sur ${windowLabel}.`}
          />
          <div className="flex flex-col gap-3 lg:items-end">
            <div className="inline-flex flex-wrap rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900">
              {([
                { key: 'week', label: 'Semaine' },
                { key: 'month', label: 'Mois' },
                { key: 'quarter', label: '3 mois' },
                { key: 'custom', label: 'Custom' },
              ] as const).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTrendRange(item.key)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    trendRange === item.key
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {trendRange === 'custom' ? (
              <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Du
                  <input
                    type="date"
                    value={customDraft.from}
                    onChange={(event) => setCustomDraft((current) => ({ ...current, from: event.target.value }))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-brand-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Au
                  <input
                    type="date"
                    value={customDraft.to}
                    onChange={(event) => setCustomDraft((current) => ({ ...current, to: event.target.value }))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-brand-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </label>
                <button
                  type="button"
                  onClick={applyCustomRange}
                  disabled={!customValid}
                  className="rounded-full border border-brand-300 bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Appliquer
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="mt-4">
            <LoadingState label="Chargement des tendances..." />
          </div>
        ) : hasTrendData ? (
          <div className="mt-2">
            <TrendChart
              title={`Vue sur ${windowLabel}`}
              subtitle="Utilisateurs, evenements, lieux, signalements et partages."
              data={trendData}
              series={TREND_SERIES}
            />
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState
              title="Aucune tendance disponible."
              subtitle="Les donnees apparaissent des que des activites sont enregistrees."
            />
          </div>
        )}
      </SectionCard>

      <SectionCard>
        <SectionTitle
          label="Repartition"
          subtitle="Lecture rapide des principaux equilibres de la plateforme."
        />
        {loading ? (
          <div className="mt-4">
            <LoadingState label="Chargement des repartitions..." />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <DonutChart
              title="Signalements par type"
              subtitle="Les categories les plus remontees par la moderation."
              items={
                analytics?.distributions.reportsByType.map((item) => ({
                  label: item.label,
                  value: item.value,
                  color:
                    item.label === 'USER'
                      ? '#ec4899'
                      : item.label === 'POST'
                        ? '#8b5cf6'
                        : item.label === 'COMMENT'
                          ? '#f97316'
                          : '#14b8a6',
                })) || []
              }
            />
            <DonutChart
              title="Roles utilisateurs"
              subtitle="Repartition des comptes dans le backoffice."
              items={
                analytics?.distributions.userRoles.map((item) => ({
                  label: item.label,
                  value: item.value,
                  color:
                    item.label === 'ADMIN'
                      ? '#2563eb'
                      : item.label === 'ORGANIZER'
                        ? '#8b5cf6'
                        : item.label === 'PLACE_OWNER'
                          ? '#14b8a6'
                          : '#f97316',
                })) || []
              }
            />
            <DonutChart
              title="Statut des organisateurs"
              subtitle="Etat des dossiers pro et des profils marchands."
              items={
                analytics?.distributions.organizerStatuses.map((item) => ({
                  label: item.label,
                  value: item.value,
                  color:
                    item.label === 'APPROVED'
                      ? '#10b981'
                      : item.label === 'REJECTED'
                        ? '#ef4444'
                        : item.label === 'SUSPENDED'
                          ? '#f59e0b'
                          : '#8b5cf6',
                })) || []
              }
            />
          </div>
        )}
      </SectionCard>

      <SectionCard>
        <SectionTitle
          label="Activite recente"
          subtitle="Ce qui vient de se passer sur la plateforme."
        />

        {loading ? (
          <div className="mt-4">
            <LoadingState label="Chargement de l activite recente..." />
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            <div className="grid gap-4 xl:grid-cols-3">
              <RecentList
                title="Derniers signalements"
                subtitle="Les derniers contenus remontes a la moderation."
                empty={(analytics?.recent.reports.length || 0) === 0}
              >
                {analytics?.recent.reports.map((report) => (
                  <RecentRow
                    key={report.id}
                    title={`${report.targetType.toUpperCase()} - ${report.reason}`}
                    subtitle={`Par ${report.reporter.displayName || report.reporter.username || report.reporter.email || report.reporter.id}`}
                    meta={formatDateTime(report.createdAt)}
                    badge={
                      <StatusBadge
                        label={report.status || 'PENDING'}
                        tone={(report.status || 'PENDING').toUpperCase() === 'RESOLVED' ? 'emerald' : 'amber'}
                      />
                    }
                    href="/reports"
                  />
                ))}
              </RecentList>

              <RecentList
                title="Derniers evenements"
                subtitle="Evenements recemment crees ou modifies."
                empty={(analytics?.recent.events.length || 0) === 0}
              >
                {analytics?.recent.events.map((event) => (
                  <RecentRow
                    key={event.id}
                    title={event.title}
                    subtitle={[event.cityName, event.placeName].filter(Boolean).join(' - ') || 'Sans lieu rattache'}
                    meta={`Cree le ${formatDateShort(event.createdAt)} - Debut ${formatDateTime(event.startTime)}`}
                    badge={<StatusBadge label="Evenement" tone="brand" />}
                    href={`/events/${event.id}`}
                  />
                ))}
              </RecentList>

              <RecentList
                title="Derniers comptes"
                subtitle="Comptes ouverts ou modifies recemment."
                empty={(analytics?.recent.users.length || 0) === 0}
              >
                {analytics?.recent.users.map((user) => (
                  <RecentRow
                    key={user.id}
                    title={user.displayName || user.username}
                    subtitle={user.email || 'Pas d email renseigne'}
                    meta={`Cree le ${formatDateShort(user.createdAt)} - Derniere activite ${formatDateTime(user.lastLoginAt)}`}
                    badge={
                      <StatusBadge
                        label={user.role}
                        tone={
                          user.isSuspended
                            ? 'rose'
                            : user.role === 'ADMIN'
                              ? 'brand'
                              : user.role === 'ORGANIZER'
                                ? 'emerald'
                                : 'slate'
                        }
                      />
                    }
                    href="/users"
                  />
                ))}
              </RecentList>
            </div>
          </div>
        )}
      </SectionCard>

      <section id="partages">
        <SectionCard>
          <SectionTitle
            label="Partages"
            subtitle="Les publications les plus partagees en ce moment."
          />
          {loading ? (
            <div className="mt-4">
              <LoadingState label="Chargement des partages..." />
            </div>
          ) : (analytics?.topShared?.length || 0) > 0 ? (
            <div className="mt-4 space-y-3">
              {(analytics?.topShared || []).map((post) => {
                const label =
                  post.Event?.title ||
                  post.Place?.name ||
                  post.placeName ||
                  post.content?.split('\n')[0] ||
                  'Publication';
                const location = [post.Place?.City?.name || post.cityName, post.Place?.name || post.placeName]
                  .filter(Boolean)
                  .join(' - ');

                return (
                  <Link
                    key={post.id}
                    to={`/posts/${post.id}`}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3 transition hover:border-brand-200 hover:bg-brand-50/40 dark:border-slate-800 dark:bg-gray-950 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-100">
                        {label}
                      </p>
                      {location ? (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {location}
                        </p>
                      ) : null}
                    </div>
                    <div className="ml-4 shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                      {formatCount(post.shareCount ?? 0)} partages
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </SectionCard>
      </section>
    </div>
  );
}
