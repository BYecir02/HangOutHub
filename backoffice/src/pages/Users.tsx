import { useEffect, useMemo, useState } from 'react';

import { apiDelete, apiGet, apiPatch } from '../lib/api';
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
  lastLoginAt?: string | null;
  lastActiveAt?: string | null;
  updatedAt?: string | null;
  isSuspended?: boolean | null;
  role?: string | null;
  sessionCount?: number | null;
  organizerStatus?: string | null;
  organizerAccountType?: string | null;
  organizerCompanyName?: string | null;
  bio?: string | null;
}

interface UserDetail extends UserItem {
  bio?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  UserRole?: Array<{
    Role?: {
      name?: string | null;
    } | null;
  }>;
  OrganizerProfile?: {
    accountType?: string | null;
    companyName?: string | null;
    ifuNumber?: string | null;
    payoutInfo?: string | null;
    jobTitle?: string | null;
    instagramUrl?: string | null;
    tiktokUrl?: string | null;
    facebookUrl?: string | null;
    xUrl?: string | null;
    websiteUrl?: string | null;
    status?: string | null;
    createdAt?: string | null;
  } | null;
  OwnedPlaces?: Array<{
    id: string;
    name?: string | null;
    coverUrl?: string | null;
    address?: string | null;
    avgRating?: number | null;
    City?: {
      id: number;
      name: string;
    } | null;
  }>;
  Session?: Array<{
    id: string;
    device?: string | null;
    createdAt?: string | null;
    lastUsedAt?: string | null;
    expiresAt?: string | null;
    revokedAt?: string | null;
  }>;
}

interface AdminSessionItem {
  id: string;
  device?: string | null;
  createdAt?: string | null;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
  isActive?: boolean;
}

function formatRole(role?: string | null) {
  if (!role) {
    return 'USER';
  }
  return role.toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getDeviceType(device?: string | null) {
  const raw = (device || '').toLowerCase();
  if (!raw) {
    return 'Appareil';
  }
  if (raw.includes('ipad') || raw.includes('tablet')) {
    return 'Tablette';
  }
  if (raw.includes('iphone') || raw.includes('android') || raw.includes('mobile')) {
    return 'Telephone';
  }
  return 'Ordinateur';
}

function formatDeviceLabel(device?: string | null) {
  const raw = (device || '').trim();
  if (!raw) {
    return 'Appareil inconnu';
  }

  const browserMatchers: Array<[RegExp, string]> = [
    [/edg\//i, 'Edge'],
    [/firefox\//i, 'Firefox'],
    [/(chrome|crios)\//i, 'Chrome'],
    [/safari\//i, 'Safari'],
    [/opera|opr\//i, 'Opera'],
  ];

  const platformMatchers: Array<[RegExp, string]> = [
    [/iphone|ipad|ios/i, 'iPhone'],
    [/android/i, 'Android'],
    [/windows/i, 'Windows'],
    [/mac os|macintosh/i, 'Mac'],
    [/linux/i, 'Linux'],
  ];

  const browser =
    browserMatchers.find(([pattern]) => pattern.test(raw))?.[1] || 'Navigateur';
  const platform =
    platformMatchers.find(([pattern]) => pattern.test(raw))?.[1] || 'Appareil';

  return `${browser} sur ${platform}`;
}

const DEVICE_BADGE_STYLES: Record<string, string> = {
  Ordinateur: 'bg-sky-100 text-sky-700',
  Telephone: 'bg-emerald-100 text-emerald-700',
  Tablette: 'bg-violet-100 text-violet-700',
  Appareil: 'bg-slate-100 text-slate-600',
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | string>('all');
  const [page, setPage] = useState(1);
  const [listBusyUserId, setListBusyUserId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailBusy, setDetailBusy] = useState<string | null>(null);
  const [detailUser, setDetailUser] = useState<UserDetail | null>(null);
  const [detailSessions, setDetailSessions] = useState<AdminSessionItem[]>([]);
  const [detailError, setDetailError] = useState('');
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

  const loadDetail = async (userId: string) => {
    setDetailLoading(true);
    setDetailError('');
    try {
      const [user, sessions] = await Promise.all([
        apiGet<UserDetail>(`/users/${userId}`),
        apiGet<AdminSessionItem[]>(`/users/admin/${userId}/sessions`),
      ]);
      setDetailUser(user);
      setDetailSessions(sessions);
    } catch {
      setDetailError('Impossible de charger le detail utilisateur.');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!selectedUserId) {
      setDetailUser(null);
      setDetailSessions([]);
      setDetailError('');
      return;
    }

    void loadDetail(selectedUserId);
  }, [selectedUserId]);

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

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [filtered.length, page, pageSize]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const updateUserInList = (userId: string, updater: (user: UserItem) => UserItem) => {
    setUsers((current) => current.map((user) => (user.id === userId ? updater(user) : user)));
  };

  const handleOpenDetails = (userId: string) => {
    setSelectedUserId(userId);
  };

  const handleCloseDetails = () => {
    setSelectedUserId(null);
  };

  const handleToggleSuspended = async (user: UserItem) => {
    const nextState = !user.isSuspended;
    const confirmed = window.confirm(
      nextState
        ? `Suspendre le compte de ${user.displayName || user.username || user.email || 'cet utilisateur'} ?`
        : `Reactivier le compte de ${user.displayName || user.username || user.email || 'cet utilisateur'} ?`,
    );
    if (!confirmed) {
      return;
    }

    setListBusyUserId(user.id);
    try {
      const updated = await apiPatch<UserItem>(`/users/${user.id}`, {
        isSuspended: nextState,
      });
      updateUserInList(user.id, (current) => ({
        ...current,
        isSuspended: updated.isSuspended ?? nextState,
      }));
      if (selectedUserId === user.id) {
        setDetailUser((current) =>
          current
            ? {
                ...current,
                isSuspended: updated.isSuspended ?? nextState,
              }
            : current,
        );
      }
    } finally {
      setListBusyUserId(null);
    }
  };

  const handleDelete = async (user: UserItem) => {
    const confirmed = window.confirm(
      `Supprimer le compte de ${user.displayName || user.username || user.email || 'cet utilisateur'} ? Cette action est definitive.`,
    );
    if (!confirmed) {
      return;
    }

    setDetailBusy(user.id);
    try {
      await apiDelete(`/users/${user.id}`);
      setUsers((prev) => prev.filter((item) => item.id !== user.id));
      if (selectedUserId === user.id) {
        handleCloseDetails();
      }
    } finally {
      setDetailBusy(null);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!selectedUserId) {
      return;
    }

    setDetailBusy(sessionId);
    try {
      await apiDelete(`/users/admin/${selectedUserId}/sessions/${sessionId}`);
      await loadDetail(selectedUserId);
    } finally {
      setDetailBusy(null);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!selectedUserId) {
      return;
    }

    const confirmed = window.confirm(
      'Revoquer toutes les sessions de cet utilisateur ?',
    );
    if (!confirmed) {
      return;
    }

    setDetailBusy('all-sessions');
    try {
      await apiDelete(`/users/admin/${selectedUserId}/sessions`);
      await loadDetail(selectedUserId);
    } finally {
      setDetailBusy(null);
    }
  };

  const selectedSummary = detailUser || users.find((user) => user.id === selectedUserId) || null;

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
        <SectionTitle subtitle="Liste des comptes." />
        {loading ? (
          <LoadingState />
        ) : (
          <>
            <DataTable
              columns={[
                { label: 'Utilisateur' },
                { label: 'Role' },
                { label: 'Statut' },
                { label: 'Sessions' },
                { label: 'Derniere activite' },
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
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          user.isSuspended
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {user.isSuspended ? 'Suspendu' : 'Actif'}
                      </span>
                    </td>
                    <td className="py-4 text-sm">{user.sessionCount || 0}</td>
                    <td className="py-4 text-xs text-slate-500">
                      {formatDate(user.lastActiveAt || user.lastLoginAt)}
                    </td>
                    <td className="py-4 text-sm">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-4 text-right">
                      <TableRowActions>
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(user.id)}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleToggleSuspended(user)}
                          disabled={listBusyUserId === user.id}
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-60 ${
                            user.isSuspended
                              ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                              : 'border-amber-200 text-amber-700 hover:bg-amber-50'
                          }`}
                        >
                          {listBusyUserId === user.id
                            ? 'Action...'
                            : user.isSuspended
                              ? 'Reactivier'
                              : 'Suspendre'}
                        </button>
                      </TableRowActions>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
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

      {selectedSummary ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-[1px]">
          <div className="flex h-full w-full max-w-3xl flex-col overflow-hidden bg-slate-50 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Utilisateur
                </p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">
                  {selectedSummary.displayName || selectedSummary.username || 'Profil'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedSummary.email || selectedSummary.phoneNumber || 'Sans contact'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseDetails}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={() => void handleToggleSuspended(selectedSummary)}
                  disabled={listBusyUserId === selectedSummary.id}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
                    selectedSummary.isSuspended
                      ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                      : 'border-amber-200 text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  {selectedSummary.isSuspended ? 'Reactivier' : 'Suspendre'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(selectedSummary)}
                  disabled={detailBusy === selectedSummary.id}
                  className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                >
                  Supprimer
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {detailLoading ? (
                <LoadingState />
              ) : (
                <div className="space-y-6">
                  {detailError ? (
                    <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
                      {detailError}
                    </div>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-2">
                    <SectionCard>
                      <SectionTitle subtitle="Informations du compte." />
                      <div className="mt-4 space-y-3 text-sm text-slate-600">
                        <p>
                          <span className="font-semibold text-slate-800">Role:</span>{' '}
                          {formatRole(selectedSummary.role)}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Statut:</span>{' '}
                          {selectedSummary.isSuspended ? 'Suspendu' : 'Actif'}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Cree le:</span>{' '}
                          {formatDate(selectedSummary.createdAt)}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Derniere activite:</span>{' '}
                          {formatDate(selectedSummary.lastActiveAt || selectedSummary.lastLoginAt)}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Sessions actives:</span>{' '}
                          {selectedSummary.sessionCount || 0}
                        </p>
                      </div>
                    </SectionCard>

                    <SectionCard>
                      <SectionTitle subtitle="Infos contact." />
                      <div className="mt-4 space-y-3 text-sm text-slate-600">
                        <p>
                          <span className="font-semibold text-slate-800">Pseudo:</span>{' '}
                          {selectedSummary.username || '-'}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Email:</span>{' '}
                          {selectedSummary.email || '-'}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Telephone:</span>{' '}
                          {selectedSummary.phoneNumber || '-'}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Mise a jour:</span>{' '}
                          {formatDate(selectedSummary.updatedAt)}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Bio:</span>{' '}
                          {selectedSummary.bio || '-'}
                        </p>
                      </div>
                    </SectionCard>
                  </div>

                  {detailUser?.OrganizerProfile ? (
                    <SectionCard>
                      <SectionTitle subtitle="Profil organisateur." />
                      <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm text-slate-600">
                        <p>
                          <span className="font-semibold text-slate-800">Type:</span>{' '}
                          {detailUser.OrganizerProfile.accountType || '-'}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Societe:</span>{' '}
                          {detailUser.OrganizerProfile.companyName || '-'}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Statut:</span>{' '}
                          {detailUser.OrganizerProfile.status || '-'}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Job:</span>{' '}
                          {detailUser.OrganizerProfile.jobTitle || '-'}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">IFU:</span>{' '}
                          {detailUser.OrganizerProfile.ifuNumber || '-'}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Paiement:</span>{' '}
                          {detailUser.OrganizerProfile.payoutInfo || '-'}
                        </p>
                      </div>
                    </SectionCard>
                  ) : null}

                  {detailUser?.OwnedPlaces?.length ? (
                    <SectionCard>
                      <SectionTitle subtitle="Lieux lies au compte." />
                      <div className="mt-4 grid gap-3">
                        {detailUser.OwnedPlaces.map((place) => (
                          <div
                            key={place.id}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-800">{place.name}</p>
                                <p className="text-xs text-slate-500">
                                  {place.City?.name || 'Ville inconnue'}
                                </p>
                              </div>
                              <div className="text-right text-xs text-slate-500">
                                {place.avgRating ? `${place.avgRating.toFixed(1)} / 5` : '-'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  ) : null}

                  <SectionCard>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <SectionTitle subtitle="Sessions actives et recentes." />
                      <button
                        type="button"
                        onClick={handleRevokeAllSessions}
                        disabled={detailBusy === 'all-sessions'}
                        className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                      >
                        {detailBusy === 'all-sessions'
                          ? 'Revoquer...'
                          : 'Revoquer toutes les sessions'}
                      </button>
                    </div>
                    <div className="mt-4 space-y-3">
                      {detailSessions.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          Aucune session trouvee pour cet utilisateur.
                        </p>
                      ) : (
                        detailSessions.map((session) => {
                          const type = getDeviceType(session.device);
                          return (
                            <div
                              key={session.id}
                              className="rounded-xl border border-slate-200 bg-white p-4"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                        DEVICE_BADGE_STYLES[type]
                                      }`}
                                    >
                                      {type}
                                    </span>
                                    <span className="text-sm font-semibold text-slate-800">
                                      {formatDeviceLabel(session.device)}
                                    </span>
                                  </div>
                                  <div className="grid gap-1 text-xs text-slate-500">
                                    <p>Ouverte le {formatDate(session.createdAt)}</p>
                                    <p>Derniere activite {formatDate(session.lastUsedAt)}</p>
                                    <p>Expire le {formatDate(session.expiresAt)}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                      session.isActive
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {session.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => void handleRevokeSession(session.id)}
                                    disabled={detailBusy === session.id}
                                    className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                                  >
                                    {detailBusy === session.id
                                      ? 'Revoquation...'
                                      : 'Deconnecter'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </SectionCard>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
