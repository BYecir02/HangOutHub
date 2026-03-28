import api, { storage } from '@/services/api';

const USER_INFO_KEY = 'userInfo';

export interface StoredUserSession {
  id?: string;
  username?: string;
  displayName?: string | null;
  role?: string;
  hasPlace?: boolean;
  organizerStatus?: string;
}

type UserSessionLike = {
  id?: string | null;
  username?: string | null;
  displayName?: string | null;
  role?: string | null;
  hasPlace?: boolean | null;
  organizerStatus?: string | null;
  OrganizerProfile?: {
    status?: string | null;
  } | null;
};

function normalizeUserSession(input: UserSessionLike): StoredUserSession {
  const organizerStatus =
    input.organizerStatus || input.OrganizerProfile?.status || undefined;

  return {
    id: input.id || undefined,
    username: input.username || undefined,
    displayName: input.displayName || null,
    role: input.role || undefined,
    // Preserve unknown state to avoid false redirects for PLACE_OWNER on cold start.
    hasPlace: input.hasPlace ?? undefined,
    organizerStatus,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toUserSessionLike(value: unknown): UserSessionLike | null {
  if (!isObject(value)) {
    return null;
  }

  return value as UserSessionLike;
}

export async function getStoredUserSession(): Promise<StoredUserSession | null> {
  const raw = await storage.getItem(USER_INFO_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const asSession = toUserSessionLike(parsed);

    if (!asSession) {
      return null;
    }

    return normalizeUserSession(asSession);
  } catch {
    return null;
  }
}

export async function setStoredUserSession(
  user: UserSessionLike,
): Promise<StoredUserSession> {
  const normalized = normalizeUserSession(user);
  await storage.setItem(USER_INFO_KEY, JSON.stringify(normalized));
  return normalized;
}

export async function patchStoredUserSession(
  patch: Partial<StoredUserSession>,
): Promise<StoredUserSession | null> {
  const current = await getStoredUserSession();

  if (!current) {
    return null;
  }

  const merged: StoredUserSession = {
    ...current,
    ...patch,
  };

  await storage.setItem(USER_INFO_KEY, JSON.stringify(merged));
  return merged;
}

export async function clearStoredUserSession(): Promise<void> {
  await storage.removeItem(USER_INFO_KEY);
}

export async function syncStoredUserSessionFromApi(): Promise<StoredUserSession | null> {
  try {
    const response = await api.get<UserSessionLike>('/users/me');
    return setStoredUserSession(response.data);
  } catch {
    return null;
  }
}

export async function resolveStoredUserSession(): Promise<StoredUserSession | null> {
  const synced = await syncStoredUserSessionFromApi();

  if (synced) {
    return synced;
  }

  return getStoredUserSession();
}
