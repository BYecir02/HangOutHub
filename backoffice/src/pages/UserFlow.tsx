import { useEffect, useMemo, useState } from 'react';

import EmptyState from '../components/EmptyState';
import FlowDiagram from '../components/analytics/FlowDiagram';
import LoadingState from '../components/LoadingState';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import { apiGet } from '../lib/api';

type TrendRange = 'week' | 'month' | 'quarter' | 'custom';

interface DashboardWindow {
  range: TrendRange;
  label: string;
  start: string;
  end: string;
  granularity: 'day' | 'week';
  points: number;
}

interface DashboardBucket {
  label: string;
  value: number;
}

interface FlowTreeNode {
  id: string;
  label: string;
  value?: number | string;
  hint?: string;
  children?: FlowTreeNode[];
}

interface FlowTreeSummary {
  totalEvents: number;
  uniqueSessions: number;
  uniqueUsers: number;
  screenViews: number;
  actionEvents: number;
}

interface FlowTreeResponse {
  window: DashboardWindow;
  summary: FlowTreeSummary;
  tree: FlowTreeNode;
  topScreens: DashboardBucket[];
  topActions: DashboardBucket[];
}

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

export default function UserFlow() {
  const [flowTree, setFlowTree] = useState<FlowTreeResponse | null>(null);
  const [trendRange, setTrendRange] = useState<TrendRange>('month');
  const [customDraft, setCustomDraft] = useState(getDefaultCustomRange);
  const [appliedCustom, setAppliedCustom] = useState(getDefaultCustomRange);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

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

    const loadFlowTree = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await apiGet<FlowTreeResponse>(`/admin/analytics/flow-tree${requestParams}`);

        if (isMounted) {
          setFlowTree(data);
          setLastUpdatedAt(Date.now());
        }
      } catch (loadError) {
        if (isMounted) {
          setError('Impossible de charger le diagramme de parcours.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadFlowTree();

    return () => {
      isMounted = false;
    };
  }, [requestParams, reloadTick]);

  const windowLabel = flowTree?.window.label || '30 derniers jours';
  const customValid = customDraft.from.length > 0 && customDraft.to.length > 0;
  const lastUpdatedLabel = lastUpdatedAt
    ? new Intl.DateTimeFormat('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(lastUpdatedAt))
    : 'Jamais';

  const applyCustomRange = () => {
    if (!customValid) {
      return;
    }

    setAppliedCustom(customDraft);
    setTrendRange('custom');
  };

  const handleRefresh = () => {
    setReloadTick((current) => current + 1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analytics"
        title="Parcours utilisateur"
        subtitle="Un vrai diagramme React Flow pour lire le comportement du frontend mobile en arbre."
        actions={
          <>
            <ActionButton onClick={handleRefresh} label="Rafraichir" disabled={loading} />
          </>
        }
      />

      <SectionCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Fenetre temporelle
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Choisis la periode du flow que tu veux analyser.
            </p>
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              Mise a jour manuelle via le bouton Rafraichir. Derniere synchro: {lastUpdatedLabel}
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <div className="inline-flex flex-wrap rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900">
              {([
                { key: 'week', label: '7 jours' },
                { key: 'month', label: '30 jours' },
                { key: 'quarter', label: '12 semaines' },
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
                    onChange={(event) =>
                      setCustomDraft((current) => ({ ...current, from: event.target.value }))
                    }
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-brand-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Au
                  <input
                    type="date"
                    value={customDraft.to}
                    onChange={(event) =>
                      setCustomDraft((current) => ({ ...current, to: event.target.value }))
                    }
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
      </SectionCard>

      {error ? (
        <SectionCard>
          <EmptyState title="Parcours indisponible." subtitle={error} />
        </SectionCard>
      ) : null}

      {loading ? (
        <SectionCard>
          <LoadingState label="Chargement du diagramme..." />
        </SectionCard>
      ) : flowTree ? (
        <FlowDiagram
          windowLabel={windowLabel}
          summary={flowTree.summary}
          tree={flowTree.tree}
          topScreens={flowTree.topScreens}
          topActions={flowTree.topActions}
        />
      ) : (
        <SectionCard>
          <EmptyState
            title="Aucune donnee de parcours."
            subtitle="Le diagramme se remplit des qu un utilisateur navigue dans le frontend."
          />
        </SectionCard>
      )}

      <SectionCard>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Lecture rapide
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Le root represente les sessions, les branches suivent les ecrans, et les branches Actions regroupent les interactions par ecran.
            </p>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Derniere periode affichee: {windowLabel}
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
