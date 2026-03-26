import React, { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';

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
    <div>
      <div className="rounded-2xl bg-white p-8 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
          Vue d ensemble
        </p>
        <h2 className="mt-3 text-3xl font-bold text-slate-900">
          Tableau de bord
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Suis en direct les donnees clefs de l application.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-brand-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-400">
              Evenements
            </p>
            <p className="mt-3 text-4xl font-bold text-brand-700">
              {loading ? '...' : eventsCount}
            </p>
            <p className="mt-2 text-sm text-brand-500">
              Publies sur la plateforme
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Lieux
            </p>
            <p className="mt-3 text-4xl font-bold text-slate-700">
              {loading ? '...' : placesCount}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Repertories dans l application
            </p>
          </div>
          <div className="rounded-2xl bg-rose-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-400">
              Signalements
            </p>
            <p className="mt-3 text-4xl font-bold text-rose-700">
              {loading ? '...' : reportsCount}
            </p>
            <p className="mt-2 text-sm text-rose-500">
              {loading ? '...' : `${pendingReports} en attente`}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-slate-50 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Signalements par type
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(reportsByType).map(([type, count]) => (
              <div
                key={type}
                className="rounded-xl border border-slate-100 bg-white px-4 py-3"
              >
                <p className="text-xs font-semibold uppercase text-slate-400">
                  {type}
                </p>
                <p className="mt-2 text-xl font-bold text-slate-700">
                  {loading ? '...' : count}
                </p>
              </div>
            ))}
            {!loading && Object.keys(reportsByType).length === 0 ? (
              <p className="text-sm text-slate-400">Aucun signalement.</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
