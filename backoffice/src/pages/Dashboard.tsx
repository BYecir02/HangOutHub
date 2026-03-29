import { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import SectionTitle from '../components/SectionTitle';
import KpiCard from '../components/KpiCard';
import MiniStat from '../components/MiniStat';
import EmptyState from '../components/EmptyState';

interface EventSummary {
  id: string;
}

interface PlaceSummary {
  id: string;
}

interface ReportSummary {
  id: string;
  targetType: string;
  status?: string | null;
}

interface ShareAnalytics {
  totalShares: number;
  topShared: {
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
  }[];
}

export default function Dashboard() {
  const [eventsCount, setEventsCount] = useState(0);
  const [placesCount, setPlacesCount] = useState(0);
  const [reportsCount, setReportsCount] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);
  const [reportsByType, setReportsByType] = useState<Record<string, number>>(
    {},
  );
  const [shareAnalytics, setShareAnalytics] = useState<ShareAnalytics | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const [events, places, reports, shares] = await Promise.all([
          apiGet<EventSummary[]>('/events'),
          apiGet<PlaceSummary[]>('/places'),
          apiGet<ReportSummary[]>('/reports/admin'),
          apiGet<ShareAnalytics>('/posts/admin/analytics/shares'),
        ]);

        if (!isMounted) {
          return;
        }

        setEventsCount(events.length);
        setPlacesCount(places.length);
        setReportsCount(reports.length);
        const pending = reports.filter(
          (report) => (report.status || 'PENDING') === 'PENDING',
        ).length;
        setPendingReports(pending);
        const typeCounts = reports.reduce<Record<string, number>>(
          (acc, report) => {
            const key = report.targetType?.toUpperCase() || 'UNKNOWN';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          },
          {},
        );
        setReportsByType(typeCounts);
        setShareAnalytics(shares);
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
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vue d ensemble"
        title="Tableau de bord"
        subtitle="Suis en direct les donnees clefs de l application."
      />

      <SectionCard>
        <SectionTitle
          label="Indicateurs"
          subtitle="Suivi des evenements, lieux et signalements."
        />
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <KpiCard
            label="Evenements"
            value={loading ? '...' : eventsCount}
            hint="Publies sur la plateforme"
            tone="brand"
          />
          <KpiCard
            label="Lieux"
            value={loading ? '...' : placesCount}
            hint="Repertories dans l application"
            tone="slate"
          />
          <KpiCard
            label="Signalements"
            value={loading ? '...' : reportsCount}
            hint={loading ? '...' : `${pendingReports} en attente`}
            tone="rose"
          />
          <KpiCard
            label="Partages"
            value={loading ? '...' : shareAnalytics?.totalShares ?? 0}
            hint="Total des partages"
            tone="emerald"
          />
        </div>
      </SectionCard>

      <SectionCard className="bg-slate-50 dark:bg-gray-900">
        <SectionTitle label="Signalements par type" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(reportsByType).map(([type, count]) => (
            <MiniStat key={type} label={type} value={loading ? '...' : count} />
          ))}
          {!loading && Object.keys(reportsByType).length === 0 ? (
            <EmptyState title="Aucun signalement." />
          ) : null}
        </div>
      </SectionCard>

      <SectionCard>
        <SectionTitle
          label="Partages"
          subtitle="Les publications les plus partagees."
        />
        <div className="mt-4 space-y-3">
          {(shareAnalytics?.topShared || []).map((post) => {
            const label =
              post.Event?.title ||
              post.Place?.name ||
              post.placeName ||
              post.content?.split('\n')[0] ||
              'Publication';
            const location = [
              post.Place?.City?.name || post.cityName,
              post.Place?.name || post.placeName,
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <div
                key={post.id}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-gray-950"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">
                    {label}
                  </p>
                  {location ? (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {location}
                    </p>
                  ) : null}
                </div>
                <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  {post.shareCount ?? 0} partages
                </div>
              </div>
            );
          })}
          {!loading && (shareAnalytics?.topShared?.length || 0) === 0 ? (
            <EmptyState title="Aucun partage pour le moment." />
          ) : null}
        </div>
      </SectionCard>
    </div>
  );
}

