import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiGet, apiPatch } from '../lib/api';
import Pagination from '../components/Pagination';
import PageHeader from '../components/PageHeader';
import FilterBar from '../components/FilterBar';
import SectionCard from '../components/SectionCard';
import SectionTitle from '../components/SectionTitle';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import SelectField from '../components/SelectField';
import SearchInput from '../components/SearchInput';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import TableRowActions from '../components/TableRowActions';

interface ReportItem {
  id: string;
  targetId: string;
  targetType: string;
  reason: string;
  status?: string | null;
  actionTaken?: string | null;
  createdAt?: string | null;
  User?: {
    id: string;
    email?: string | null;
    username?: string | null;
    displayName?: string | null;
  };
}

function normalizeStatus(value?: string | null) {
  return (value || 'PENDING').toUpperCase();
}

function shortenId(value: string, head = 6, tail = 4) {
  if (!value || value.length <= head + tail + 1) {
    return value;
  }
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | string>('all');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiGet<ReportItem[]>('/reports/admin');
      setReports(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const types = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((report) => set.add(report.targetType?.toUpperCase()));
    return Array.from(set).filter(Boolean).sort();
  }, [reports]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reports.filter((report) => {
      const status = normalizeStatus(report.status);
      const type = report.targetType?.toUpperCase();

      if (statusFilter !== 'all' && status !== statusFilter) {
        return false;
      }
      if (typeFilter !== 'all' && type !== typeFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      const reporter = `${report.User?.displayName || ''} ${
        report.User?.username || ''
      } ${report.User?.email || ''}`.toLowerCase();
      const haystack = `${report.targetId} ${report.reason} ${reporter}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [reports, search, statusFilter, typeFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await apiPatch(`/reports/${id}`, { status });
      setReports((prev) =>
        prev.map((report) =>
          report.id === id ? { ...report, status } : report,
        ),
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const applyAction = async (
    id: string,
    action: string,
    note?: string,
  ) => {
    setUpdatingId(id);
    try {
      await apiPatch(`/reports/${id}/action`, { action, note });
      setReports((prev) =>
        prev.map((report) =>
          report.id === id
            ? { ...report, status: 'RESOLVED', actionTaken: action }
            : report,
        ),
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAction = (report: ReportItem, action: string) => {
    const needsNote = ['REQUEST_CHANGES', 'WARN_USER'].includes(action);
    const note = needsNote
      ? window.prompt('Ajouter une note (optionnel) ?')
      : undefined;
    void applyAction(report.id, action, note || undefined);
  };

  const resolveTargetPath = (report: ReportItem) => {
    const type = report.targetType?.toUpperCase();
    if (type === 'EVENT') {
      return `/events/${report.targetId}`;
    }
    if (type === 'PLACE') {
      return `/places/${report.targetId}`;
    }
    if (type === 'POST') {
      return `/posts/${report.targetId}`;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Moderation"
        title="Signalements"
        subtitle="Traite les signalements envoyes par la communaute."
        actions={
          <FilterBar>
            <SelectField
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              options={[
                { label: 'Tous les statuts', value: 'all' },
                { label: 'En attente', value: 'PENDING' },
                { label: 'Traite', value: 'RESOLVED' },
                { label: 'Rejete', value: 'REJECTED' },
              ]}
            />
            <SelectField
              value={typeFilter}
              onChange={(value) => setTypeFilter(value)}
              options={[
                { label: 'Tous les types', value: 'all' },
                ...types.map((type) => ({ label: type, value: type })),
              ]}
            />
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Rechercher..."
            />
          </FilterBar>
        }
      />

      <SectionCard>
        <SectionTitle label="Signalements" subtitle="Liste des signalements." />
        {loading ? (
          <LoadingState />
        ) : (
          <>
            <DataTable
              columns={[
                { label: 'Type' },
                { label: 'Cible' },
                { label: 'Raison' },
                { label: 'Reporter' },
                { label: 'Statut' },
                { label: 'Actions', className: 'text-right' },
              ]}
            >
              <tbody className="text-slate-700">
                {paged.map((report) => {
                  const status = normalizeStatus(report.status);
                  const targetPath = resolveTargetPath(report);
                  return (
                    <tr key={report.id} className="border-t border-slate-100">
                      <td className="py-4 font-semibold">
                        {report.targetType?.toUpperCase()}
                      </td>
                      <td className="py-4 text-xs text-slate-500">
                        <span
                          title={report.targetId}
                          className="inline-block max-w-[180px] truncate font-mono"
                        >
                          {shortenId(report.targetId)}
                        </span>
                      </td>
                      <td className="py-4 max-w-xs text-sm text-slate-600">
                        {report.reason}
                      </td>
                      <td className="py-4 text-xs text-slate-500">
                        {report.User?.displayName ||
                          report.User?.username ||
                          report.User?.email ||
                          '-'}
                      </td>
                      <td className="py-4">
                        <StatusBadge status={status} />
                      </td>
                      <td className="py-4 text-right">
                        <TableRowActions>
                          {targetPath ? (
                            <button
                              onClick={() => navigate(targetPath)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              Voir la cible
                            </button>
                          ) : null}
                          {report.targetType?.toUpperCase() === 'POST' ||
                          report.targetType?.toUpperCase() === 'COMMENT' ||
                          report.targetType?.toUpperCase() === 'REVIEW' ? (
                            <>
                              <button
                                onClick={() =>
                                  handleAction(report, 'DELETE_CONTENT')
                                }
                                disabled={updatingId === report.id}
                                className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                              >
                                Supprimer
                              </button>
                              <button
                                onClick={() =>
                                  handleAction(report, 'WARN_USER')
                                }
                                disabled={updatingId === report.id}
                                className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                              >
                                Avertir
                              </button>
                            </>
                          ) : report.targetType?.toUpperCase() === 'USER' ? (
                            <>
                              <button
                                onClick={() =>
                                  handleAction(report, 'SUSPEND_USER')
                                }
                                disabled={updatingId === report.id}
                                className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                              >
                                Suspendre
                              </button>
                              <button
                                onClick={() =>
                                  handleAction(report, 'WARN_USER')
                                }
                                disabled={updatingId === report.id}
                                className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                              >
                                Avertir
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() =>
                                  handleAction(report, 'REQUEST_CHANGES')
                                }
                                disabled={updatingId === report.id}
                                className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                              >
                                Demander correction
                              </button>
                              <button
                                onClick={() =>
                                  handleAction(report, 'WARN_USER')
                                }
                                disabled={updatingId === report.id}
                                className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                              >
                                Avertir
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => updateStatus(report.id, 'REJECTED')}
                            disabled={updatingId === report.id}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                          >
                            Rejeter
                          </button>
                        </TableRowActions>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState title="Aucun signalement." />
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </DataTable>
            <Pagination
              currentPage={page}
              pageSize={pageSize}
              totalItems={filtered.length}
              onPageChange={setPage}
            />
          </>
        )}
      </SectionCard>
    </div>
  );
}

