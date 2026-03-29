import { useEffect, useMemo, useState } from 'react';

import { apiGet, apiPatch } from '../lib/api';
import Pagination from '../components/Pagination';
import PageHeader from '../components/PageHeader';
import FilterBar from '../components/FilterBar';
import SectionCard from '../components/SectionCard';
import SectionTitle from '../components/SectionTitle';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import ActionButtons from '../components/ActionButtons';
import SelectField from '../components/SelectField';
import SearchInput from '../components/SearchInput';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';

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
      <PageHeader
        eyebrow="Validation"
        title="Organisateurs & lieux"
        subtitle="Approuve, refuse ou suspend les comptes professionnels."
        actions={
          <FilterBar>
            <SelectField
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              options={[
                { label: 'Tous les statuts', value: 'all' },
                { label: 'En attente', value: 'PENDING' },
                { label: 'Approuve', value: 'APPROVED' },
                { label: 'Refuse', value: 'REJECTED' },
                { label: 'Suspendu', value: 'SUSPENDED' },
              ]}
            />
            <SelectField
              value={typeFilter}
              onChange={(value) => setTypeFilter(value as 'all' | 'PLACE' | 'NOMAD')}
              options={[
                { label: 'Tous les types', value: 'all' },
                { label: 'Lieux', value: 'PLACE' },
                { label: 'Promoteurs', value: 'NOMAD' },
              ]}
            />
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Rechercher un compte..."
            />
          </FilterBar>
        }
      />

      <SectionCard>
        <SectionTitle label="Validations" subtitle="Demandes a traiter." />
        {loading ? (
          <LoadingState />
        ) : (
          <>
            <DataTable
              columns={[
                { label: 'Compte' },
                { label: 'Type' },
                { label: 'Entreprise' },
                { label: 'Statut' },
                { label: 'Action', className: 'text-right' },
              ]}
            >
              <tbody className="text-slate-700">
                {paged.map((item) => {
                  const status = normalizeStatus(item.organizer?.status);
                  const label =
                    item.displayName || item.username || item.email || 'Compte';
                  const company = item.organizer?.companyName || '-';
                  const accountType = (item.organizer?.accountType || '').toUpperCase();
                  const typeLabel = formatAccountType(item.organizer?.accountType);
                  const placesLabel =
                    accountType === 'PLACE'
                      ? item.placesCount
                        ? `${item.placesCount} lieux revendiques`
                        : 'Aucun lieu revendique'
                      : 'N/A';

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
                          {placesLabel}
                        </div>
                      </td>
                      <td className="py-4">
                        <StatusBadge status={status} />
                      </td>
                      <td className="py-4">
                        <ActionButtons
                          onApprove={() => updateStatus(item.id, 'APPROVED')}
                          onReject={() => updateStatus(item.id, 'REJECTED')}
                          onSuspend={() => updateStatus(item.id, 'SUSPENDED')}
                          disabled={updatingId === item.id}
                        />
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState title="Aucun compte a valider." />
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

