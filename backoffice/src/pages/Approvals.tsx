import React, { useEffect, useMemo, useState } from 'react';

import { apiGet, apiPatch } from '../lib/api';
import Pagination from '../components/Pagination';

interface OrganizerItem {
  id: string;
  email?: string | null;
  username?: string | null;
  displayName?: string | null;
  role?: string | null;
  placesCount?: number;
  organizer?: {
    accountType?: string | null;
    companyName?: string | null;
    status?: string | null;
    jobTitle?: string | null;
    createdAt?: string | null;
  } | null;
}

const statusLabels: Record<string, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuve',
  REJECTED: 'Refuse',
  SUSPENDED: 'Suspendu',
};

const statusStyles: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  SUSPENDED: 'bg-slate-200 text-slate-700',
};

function normalizeStatus(value?: string | null) {
  return (value || 'PENDING').toUpperCase();
}

function formatAccountType(value?: string | null) {
  const normalized = (value || '').toUpperCase();
  if (normalized === 'PLACE') {
    return 'Lieu';
  }
  if (normalized === 'NOMAD') {
    return 'Promoteur';
  }
  return 'Indefini';
}

export default function ApprovalsPage() {
  const [items, setItems] = useState<OrganizerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'PLACE' | 'NOMAD'>(
    'all',
  );
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiGet<OrganizerItem[]>('/users/admin/organizers');
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const label =
        item.displayName || item.username || item.email || 'organisateur';
      const company = item.organizer?.companyName || '';
      const status = normalizeStatus(item.organizer?.status);
      const accountType = (item.organizer?.accountType || '').toUpperCase();

      if (query) {
        const haystack = `${label} ${item.email || ''} ${company}`.toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }

      if (statusFilter !== 'all' && status !== statusFilter) {
        return false;
      }

      if (typeFilter !== 'all' && accountType !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [items, search, statusFilter, typeFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const updateStatus = async (userId: string, status: string) => {
    setUpdatingId(userId);
    try {
      await apiPatch(`/users/organizers/${userId}/status`, {
        status,
      });
      setItems((prev) =>
        prev.map((item) =>
          item.id === userId
            ? {
                ...item,
                organizer: {
                  ...item.organizer,
                  status,
                },
              }
            : item,
        ),
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
              Validation
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Organisateurs & lieux
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Approuve, refuse ou suspend les comptes professionnels.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
            >
              <option value="all">Tous les statuts</option>
              <option value="PENDING">En attente</option>
              <option value="APPROVED">Approuve</option>
              <option value="REJECTED">Refuse</option>
              <option value="SUSPENDED">Suspendu</option>
            </select>
            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as 'all' | 'PLACE' | 'NOMAD')
              }
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
            >
              <option value="all">Tous les types</option>
              <option value="PLACE">Lieux</option>
              <option value="NOMAD">Promoteurs</option>
            </select>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un compte..."
              className="w-64 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-soft">
        {loading ? (
          <p className="text-sm text-slate-500">Chargement...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="pb-3">Compte</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Entreprise</th>
                  <th className="pb-3">Statut</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {paged.map((item) => {
                  const status = normalizeStatus(item.organizer?.status);
                  const label =
                    item.displayName || item.username || item.email || 'Compte';
                  const company = item.organizer?.companyName || '-';
                  const typeLabel = formatAccountType(
                    item.organizer?.accountType,
                  );

                  return (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="py-4">
                        <div className="font-semibold">{label}</div>
                        <div className="text-xs text-slate-400">
                          {item.email || 'Sans email'}
                        </div>
                      </td>
                      <td className="py-4 text-sm">{typeLabel}</td>
                      <td className="py-4 text-sm">
                        <div>{company}</div>
                        <div className="text-xs text-slate-400">
                          {item.placesCount
                            ? `${item.placesCount} lieux`
                            : 'Aucun lieu'}
                        </div>
                      </td>
                      <td className="py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            statusStyles[status] || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {statusLabels[status] || status}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            onClick={() => updateStatus(item.id, 'APPROVED')}
                            disabled={updatingId === item.id}
                            className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                          >
                            Approuver
                          </button>
                          <button
                            onClick={() => updateStatus(item.id, 'REJECTED')}
                            disabled={updatingId === item.id}
                            className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                          >
                            Refuser
                          </button>
                          <button
                            onClick={() => updateStatus(item.id, 'SUSPENDED')}
                            disabled={updatingId === item.id}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                          >
                            Suspendre
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      Aucun compte a valider.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            <Pagination
              currentPage={page}
              pageSize={pageSize}
              totalItems={filtered.length}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
