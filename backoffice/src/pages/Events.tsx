import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiGet } from '../lib/api';
import Pagination from '../components/Pagination';
import PageHeader from '../components/PageHeader';
import FilterBar from '../components/FilterBar';
import Card from '../components/Card';
import DataTable from '../components/DataTable';
import SelectField from '../components/SelectField';
import SearchInput from '../components/SearchInput';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import TableRowActions from '../components/TableRowActions';

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
      <PageHeader
        eyebrow="Gestion"
        title="Evenements"
        subtitle="Modifie rapidement les evenements publics."
        actions={
          <FilterBar>
            <SelectField
              value={statusFilter}
              onChange={(value) =>
                setStatusFilter(value as 'all' | 'upcoming' | 'past')
              }
              options={[
                { label: 'Tous', value: 'all' },
                { label: 'A venir', value: 'upcoming' },
                { label: 'Passe', value: 'past' },
              ]}
            />
            <SelectField
              value={sortOrder}
              onChange={(value) =>
                setSortOrder(
                  value as 'date_desc' | 'date_asc' | 'price_desc' | 'price_asc',
                )
              }
              options={[
                { label: 'Date recente', value: 'date_desc' },
                { label: 'Date ancienne', value: 'date_asc' },
                { label: 'Prix descendant', value: 'price_desc' },
                { label: 'Prix croissant', value: 'price_asc' },
              ]}
            />
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Rechercher un evenement..."
            />
          </FilterBar>
        }
      />

      <Card>
        {loading ? (
          <LoadingState />
        ) : (
          <>
            <DataTable
              columns={[
                { label: 'Evenement' },
                { label: 'Date' },
                { label: 'Lieu' },
                { label: 'Prix' },
                { label: 'Action', className: 'text-right' },
              ]}
            >
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
                      <TableRowActions>
                        <button
                          onClick={() => navigate(`/events/${event.id}`)}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Modifier
                        </button>
                      </TableRowActions>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState title="Aucun evenement trouve." />
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
      </Card>

    </div>
  );
}
