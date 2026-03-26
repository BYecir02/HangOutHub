import { useEffect, useMemo, useState } from 'react';

import { apiDelete, apiGet } from '../lib/api';
import Pagination from '../components/Pagination';
import PageHeader from '../components/PageHeader';
import FilterBar from '../components/FilterBar';
import SectionCard from '../components/SectionCard';
import SectionTitle from '../components/SectionTitle';
import DataTable from '../components/DataTable';
import SelectField from '../components/SelectField';
import SearchInput from '../components/SearchInput';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import TableRowActions from '../components/TableRowActions';

interface UserItem {
  id: string;
  email?: string | null;
  username?: string | null;
  displayName?: string | null;
  phoneNumber?: string | null;
  createdAt?: string | null;
  role?: string | null;
  organizerStatus?: string | null;
  organizerAccountType?: string | null;
  organizerCompanyName?: string | null;
}

function formatRole(role?: string | null) {
  if (!role) return 'USER';
  return role.toUpperCase();
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiGet<UserItem[]>('/users/admin');
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const availableRoles = useMemo(() => {
    const roles = new Set<string>();
    users.forEach((user) => roles.add(formatRole(user.role)));
    return Array.from(roles).sort();
  }, [users]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const role = formatRole(user.role);
      if (roleFilter !== 'all' && role !== roleFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = `${user.displayName || ''} ${user.username || ''} ${
        user.email || ''
      } ${user.phoneNumber || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [users, search, roleFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const handleDelete = async (userId: string) => {
    if (!confirm('Supprimer ce compte ? Cette action est definitive.')) {
      return;
    }
    setDeletingId(userId);
    try {
      await apiDelete(`/users/${userId}`);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gestion"
        title="Utilisateurs"
        subtitle="Consulte et gere les comptes de la plateforme."
        actions={
          <FilterBar>
            <SelectField
              value={roleFilter}
              onChange={(value) => setRoleFilter(value)}
              options={[
                { label: 'Tous les roles', value: 'all' },
                ...availableRoles.map((role) => ({ label: role, value: role })),
              ]}
            />
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Rechercher un utilisateur..."
            />
          </FilterBar>
        }
      />

      <SectionCard>
        <SectionTitle label="Utilisateurs" subtitle="Liste des comptes." />
        {loading ? (
          <LoadingState />
        ) : (
          <>
            <DataTable
              columns={[
                { label: 'Utilisateur' },
                { label: 'Role' },
                { label: 'Organisateur' },
                { label: 'Cree le' },
                { label: 'Actions', className: 'text-right' },
              ]}
            >
              <tbody className="text-slate-700">
                {paged.map((user) => (
                  <tr key={user.id} className="border-t border-slate-100">
                    <td className="py-4">
                      <div className="font-semibold">
                        {user.displayName || user.username || 'Utilisateur'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {user.email || user.phoneNumber || 'Sans contact'}
                      </div>
                    </td>
                    <td className="py-4 text-sm">{formatRole(user.role)}</td>
                    <td className="py-4 text-sm">
                      {user.organizerStatus
                        ? `${user.organizerAccountType || 'PRO'} - ${
                            user.organizerStatus
                          }`
                        : 'Non'}
                      {user.organizerCompanyName ? (
                        <div className="text-xs text-slate-400">
                          {user.organizerCompanyName}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-4 text-sm">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="py-4 text-right">
                      <TableRowActions>
                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={deletingId === user.id}
                          className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                        >
                          Supprimer
                        </button>
                      </TableRowActions>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState title="Aucun utilisateur trouve." />
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

