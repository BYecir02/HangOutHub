import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiGet } from '../lib/api';
import Pagination from '../components/Pagination';

interface EventItem {
  id: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime?: string | null;
  entryFee?: number | null;
  cancellationPolicy?: string | null;
  refundPolicy?: string | null;
  Place?: {
    id: string;
    name?: string | null;
  } | null;
}

export default function EventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'past'>(
    'all',
  );
  const [sortOrder, setSortOrder] = useState<
    'date_desc' | 'date_asc' | 'price_desc' | 'price_asc'
  >('date_desc');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = Date.now();

    const filtered = events.filter((event) => {
      if (query && !event.title.toLowerCase().includes(query)) {
        return false;
      }

      if (statusFilter === 'upcoming') {
        return new Date(event.startTime).getTime() >= now;
      }

      if (statusFilter === 'past') {
        return new Date(event.startTime).getTime() < now;
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortOrder === 'date_asc') {
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      }
      if (sortOrder === 'date_desc') {
        return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
      }
      if (sortOrder === 'price_asc') {
        return Number(a.entryFee || 0) - Number(b.entryFee || 0);
      }
      return Number(b.entryFee || 0) - Number(a.entryFee || 0);
    });
  }, [events, search, sortOrder, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, sortOrder, statusFilter]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiGet<EventItem[]>('/events');
        if (isMounted) {
          setEvents(data);
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
  }, []);


  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
              Gestion
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Evenements
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Modifie rapidement les evenements publics.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as 'all' | 'upcoming' | 'past')
              }
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
            >
              <option value="all">Tous</option>
              <option value="upcoming">A venir</option>
              <option value="past">Passe</option>
            </select>
            <select
              value={sortOrder}
              onChange={(event) =>
                setSortOrder(
                  event.target.value as
                    | 'date_desc'
                    | 'date_asc'
                    | 'price_desc'
                    | 'price_asc',
                )
              }
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
            >
              <option value="date_desc">Date recente</option>
              <option value="date_asc">Date ancienne</option>
              <option value="price_desc">Prix descendant</option>
              <option value="price_asc">Prix croissant</option>
            </select>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un evenement..."
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
                  <th className="pb-3">Evenement</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Lieu</th>
                  <th className="pb-3">Prix</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {paged.map((event) => (
                  <tr key={event.id} className="border-t border-slate-100">
                    <td className="py-4 font-semibold">{event.title}</td>
                    <td className="py-4">
                      {new Date(event.startTime).toLocaleString()}
                    </td>
                    <td className="py-4">{event.Place?.name || '-'}</td>
                    <td className="py-4">
                      {event.entryFee ? `${event.entryFee} FCFA` : 'Gratuit'}
                    </td>
                    <td className="py-4 text-right">
                      <button
                        onClick={() => navigate(`/events/${event.id}`)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Modifier
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      Aucun evenement trouve.
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
