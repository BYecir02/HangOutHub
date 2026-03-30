import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import SectionTitle from '../components/SectionTitle';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import { apiDelete, apiGet } from '../lib/api';
import { clearSession, getSession } from '../lib/auth';

interface SessionItem {
  id: string;
  device: string;
  createdAt?: string | null;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
  isCurrent: boolean;
  isActive: boolean;
}

type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown';

const DEVICE_BADGE_STYLES: Record<
  DeviceType,
  { label: string; className: string }
> = {
  desktop: {
    label: 'Ordinateur',
    className: 'bg-slate-900/5 text-slate-700 border-slate-200',
  },
  mobile: {
    label: 'Téléphone',
    className: 'bg-brand-500/10 text-brand-700 border-brand-200',
  },
  tablet: {
    label: 'Tablette',
    className: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  },
  unknown: {
    label: 'Appareil',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const session = getSession();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const activeSessions = useMemo(
    () => sessions.filter((entry) => entry.isActive),
    [sessions],
  );

  const formatDate = (value?: string | null) => {
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
  };

  const formatDevice = (value: string) => {
    const raw = value.trim();
    if (!raw) {
      return 'Appareil inconnu';
    }

    const browser =
      raw.includes('Edg/') || raw.includes('Edge/')
        ? 'Edge'
        : raw.includes('Firefox/')
          ? 'Firefox'
          : raw.includes('Chrome/')
            ? 'Chrome'
            : raw.includes('Safari/')
              ? 'Safari'
              : raw.includes('Opera/') || raw.includes('OPR/')
                ? 'Opera'
                : 'Navigateur';

    const platform =
      raw.includes('iPhone') || raw.includes('iPad')
        ? 'iPhone'
        : raw.includes('Android')
          ? 'Android'
          : raw.includes('Windows')
            ? 'Windows'
            : raw.includes('Mac OS X') || raw.includes('Macintosh')
              ? 'Mac'
              : raw.includes('Linux')
                ? 'Linux'
                : '';

    const parts = [browser, platform].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(' sur ');
    }

    return raw.length > 70 ? `${raw.slice(0, 67)}...` : raw;
  };

  const getDeviceType = (value: string): DeviceType => {
    const raw = value.toLowerCase();

    if (
      raw.includes('iphone') ||
      raw.includes('android') ||
      raw.includes('mobile') ||
      raw.includes('ipad;') ||
      raw.includes('ipod')
    ) {
      return raw.includes('ipad') ? 'tablet' : 'mobile';
    }

    if (raw.includes('ipad') || raw.includes('tablet')) {
      return 'tablet';
    }

    if (
      raw.includes('windows') ||
      raw.includes('mac') ||
      raw.includes('linux') ||
      raw.includes('chrome') ||
      raw.includes('firefox') ||
      raw.includes('safari') ||
      raw.includes('edge') ||
      raw.includes('opera')
    ) {
      return 'desktop';
    }

    return 'unknown';
  };

  const loadSessions = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet<SessionItem[]>('/auth/sessions');
      setSessions(data);
    } catch {
      setError('Impossible de charger les sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSessions();
  }, []);

  const handleRevokeSession = async (entry: SessionItem) => {
    const confirmed = window.confirm(
      entry.isCurrent
        ? 'Déconnecter cet appareil maintenant ?'
        : 'Déconnecter cet appareil à distance ?',
    );
    if (!confirmed) {
      return;
    }

    setActionId(entry.id);
    setError('');
    try {
      await apiDelete(`/auth/sessions/${entry.id}`);
      if (entry.isCurrent) {
        clearSession();
        navigate('/login');
        return;
      }

      await loadSessions();
    } catch {
      setError('Impossible de révoquer cette session.');
    } finally {
      setActionId(null);
    }
  };

  const handleRevokeOthers = async () => {
    const confirmed = window.confirm(
      'Déconnecter tous les autres appareils connectés ?',
    );
    if (!confirmed) {
      return;
    }

    setSavingAll(true);
    setError('');
    try {
      await apiDelete('/auth/sessions/others');
      await loadSessions();
    } catch {
      setError('Impossible de révoquer les autres sessions.');
    } finally {
      setSavingAll(false);
    }
  };

  const currentSessionCount = activeSessions.length;
  const currentSession = activeSessions.find((item) => item.isCurrent);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Compte"
        title="Parametres"
        subtitle="Gere ta session et les appareils connectes au backoffice."
        actions={
          <button
            onClick={handleRevokeOthers}
            disabled={savingAll || currentSessionCount <= 1}
            className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
          >
            {savingAll ? 'Révocation...' : 'Déconnecter les autres'}
          </button>
        }
      />

      <SectionCard>
        <SectionTitle label="Compte" subtitle="Informations de connexion." />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Email
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-800">
              {session?.user?.email || 'admin'}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Appareils actifs
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-800">
              {currentSessionCount}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Session courante
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-800">
              {currentSession
                ? formatDevice(currentSession.device)
                : 'Appareil courant'}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <SectionTitle
          label="Sessions actives"
          subtitle="Les appareils actuellement connectes a ton compte."
        />
        <div className="mt-4">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          ) : activeSessions.length === 0 ? (
            <EmptyState title="Aucune session active." />
          ) : (
            <div className="grid gap-3">
              {activeSessions.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">
                          {formatDevice(entry.device)}
                        </h3>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${DEVICE_BADGE_STYLES[getDeviceType(entry.device)].className}`}
                        >
                          {DEVICE_BADGE_STYLES[getDeviceType(entry.device)].label}
                        </span>
                        {entry.isCurrent ? (
                          <span className="rounded-full bg-brand-500/10 px-2.5 py-1 text-[11px] font-semibold text-brand-600">
                            Session courante
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        Ouverte le {formatDate(entry.createdAt)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Derniere activite {formatDate(entry.lastUsedAt)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Expire le {formatDate(entry.expiresAt)}
                      </p>
                    </div>

                    <button
                      onClick={() => void handleRevokeSession(entry)}
                      disabled={actionId === entry.id}
                      className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                    >
                      {actionId === entry.id
                        ? 'Déconnexion...'
                        : entry.isCurrent
                          ? 'Déconnecter cet appareil'
                          : 'Déconnecter'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
