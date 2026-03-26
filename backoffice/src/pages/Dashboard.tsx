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

export default function Dashboard() {
  const [eventsCount, setEventsCount] = useState(0);
  const [placesCount, setPlacesCount] = useState(0);
  const [reportsCount, setReportsCount] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);
  const [reportsByType, setReportsByType] = useState<Record<string, number>>(
    {},
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const [events, places, reports] = await Promise.all([
          apiGet<EventSummary[]>('/events'),
          apiGet<PlaceSummary[]>('/places'),
          apiGet<ReportSummary[]>('/reports/admin'),
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
        <div className="mt-6 grid gap-4 md:grid-cols-3">
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
    </div>
  );
}

