import React, { useEffect, useMemo, useState } from 'react';

import { apiDelete, apiGet } from '../lib/api';
import Pagination from '../components/Pagination';

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
      <div className="rounded-2xl bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
              Gestion
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              Utilisateurs
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Consulte et gere les comptes de la plateforme.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
            >
              <option value="all">Tous les roles</option>
              {availableRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un utilisateur..."
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
                  <th className="pb-3">Utilisateur</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Organisateur</th>
                  <th className="pb-3">Cree le</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
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
                        ? `${user.organizerAccountType || 'PRO'} • ${
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
                      <button
                        onClick={() => handleDelete(user.id)}
                        disabled={deletingId === user.id}
                        className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      Aucun utilisateur trouve.
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
